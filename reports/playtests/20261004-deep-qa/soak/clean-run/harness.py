"""Two real hours on pinned build, without selector pollers or forced GC."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import time
from urllib.request import urlopen
import psutil
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

URL = "http://127.0.0.1:5193/"
TARGET = 7200
manifest = json.loads((OUT.parents[1] / "baseline/final-manifest.json").read_text())
data = {"status": "starting", "url": URL, "targetSeconds": TARGET, "sourceLabel": manifest["sourceLabel"],
        "sourceHashes": manifest["sourceHashes"], "buildHashes": manifest["buildHashes"],
        "harnessSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "method": "Fresh real Chromium profile, normal keyboard/native UI handlers and x20 game clock. No state/timer injection, no selector pollers/element handles, no forced GC.",
        "observations": [], "pageErrors": [], "consoleErrors": [], "httpFailures": [], "uiLatencies": [],
        "limitations": ["Headless Linux Chromium; RSS process-tree sum can count shared pages repeatedly.",
                        "UI latency includes Playwright transport and two animation frames.",
                        "Storage estimates are browser estimates; IndexedDB count only during profiling."]}
mono = None


def utc():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def publish(name="checkpoints.json"):
    data["elapsedSeconds"] = round(time.monotonic() - mono, 3) if mono else 0
    write_recorded(OUT / name, json.dumps(data, ensure_ascii=False, indent=2) + "\n", producer="root-clean-soak")


def fingerprint():
    return {name: hashlib.sha256(urlopen(URL + name, timeout=10).read()).hexdigest() for name in manifest["buildHashes"]}


def paint(page):
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))))")


def button(page, selector, text=None):
    page.evaluate("""({selector,text}) => {
      const buttons=[...document.querySelectorAll(selector)];
      const el=text ? buttons.find(b=>b.textContent.trim()===text) : buttons[0];
      if(!el || el.disabled) throw new Error('UI button unavailable: '+selector+' '+text);
      el.click();
    }""", {"selector": selector, "text": text})


def snapshot(page):
    return page.evaluate("""async () => {
      const raw=localStorage.getItem('oakvale-v1'), state=JSON.parse(raw);
      const c=state.characters.find(c=>c.id===state.activeCharacterId);
      const dbData=await new Promise((resolve,reject)=>{
        const q=indexedDB.open('oakvale-play-journal',1);
        q.onerror=()=>reject(q.error);
        q.onsuccess=()=>{
          const db=q.result, tx=db.transaction('records','readonly'), store=tx.objectStore('records');
          const count=store.count(), first=store.openCursor(); let firstRecord=null;
          first.onsuccess=()=>{const r=first.result?.value;if(r)firstRecord={id:r.id,kind:r.kind,from:r.from,to:r.to}};
          tx.oncomplete=()=>{db.close();resolve({count:count.result,firstRecord})};
          tx.onabort=()=>{db.close();reject(tx.error)};
        }
      });
      const estimate=await navigator.storage.estimate();
      return {worldTime:state.worldTime,eventSequence:state.eventSequence,worldId:state.playJournal.worldId,
        pending:state.playJournal.pending.length,checkpointBytesUtf8:new TextEncoder().encode(raw).length,
        archiveCount:dbData.count,firstRecord:dbData.firstRecord,storageUsage:estimate.usage,storageQuota:estimate.quota,
        speed:[...document.querySelectorAll('.speed-controls button')].find(b=>b.getAttribute('aria-pressed')==='true')?.textContent.trim(),
        alive:c.isAlive,position:c.position,connectedElements:document.getElementsByTagName('*').length,
        warning:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent.trim()).join(' '),
        dialog:document.querySelector('dialog[open] h2')?.textContent.trim()||null,longTasks:{...window.__qaLongTasks}};
    }""")


def rss(profile):
    roots=[]
    for proc in psutil.process_iter(["cmdline"]):
        try:
            if f"--user-data-dir={profile}" in (proc.info["cmdline"] or []): roots.append(proc)
        except (psutil.Error,OSError): pass
    if not roots: return {"available": False}
    processes={p.pid:p for p in [roots[0],*roots[0].children(recursive=True)]}
    total=0
    for proc in processes.values():
        try: total+=proc.memory_info().rss
        except (psutil.Error,OSError): pass
    return {"available":True,"bytes":total,"processes":len(processes),"rootPid":roots[0].pid}


profile=tempfile.mkdtemp(prefix="plw-qa-clean-soak-")
try:
    data["fingerprintStart"]=fingerprint()
    assert data["fingerprintStart"]==manifest["buildHashes"]
    with sync_playwright() as p:
        context=p.chromium.launch_persistent_context(profile,executable_path="/usr/bin/chromium",headless=True,
                viewport={"width":1440,"height":1000},accept_downloads=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        page=context.pages[0]
        page.on("pageerror",lambda e:data["pageErrors"].append(str(e)) if len(data["pageErrors"])<100 else None)
        page.on("console",lambda e:data["consoleErrors"].append({"text":e.text,"location":e.location}) if e.type=="error" and len(data["consoleErrors"])<100 else None)
        page.on("response",lambda r:data["httpFailures"].append({"url":r.url,"status":r.status}) if r.status>=400 and len(data["httpFailures"])<100 else None)
        page.add_init_script("""(() => {window.__qaLongTasks={count:0,totalMs:0,maxMs:0,error:null};
          try{new PerformanceObserver(list=>{for(const e of list.getEntries()){const s=window.__qaLongTasks;s.count++;s.totalMs+=e.duration;s.maxMs=Math.max(s.maxMs,e.duration)}}).observe({type:'longtask',buffered:true})}
          catch(e){window.__qaLongTasks.error=String(e)}})();""")
        page.goto(URL,wait_until="networkidle")
        button(page,".speed-controls button","×20")
        mono=time.monotonic()
        data.update(status="running",startedAtUtc=utc(),browserVersion=context.browser.version if context.browser else "Chromium system")
        cdp=context.new_cdp_session(page)
        data["initialGameState"]=snapshot(page)
        page.screenshot(path=str(OUT/"start.png"))
        publish()
        n=0
        while time.monotonic()-mono<TARGET:
            target=mono+(n+1)*60
            while time.monotonic()<target: time.sleep(min(1,max(.01,target-time.monotonic())))
            n+=1
            action={"key":["c","i","l","m","Escape"][(n-1)%5]}
            if page.evaluate("!!document.querySelector('dialog[open]')"):
                raise RuntimeError("Unexpected mandatory modal before planned input")
            begin=time.monotonic();page.keyboard.press(action["key"]);paint(page)
            assert page.evaluate("!!document.querySelector('dialog[open]')")
            data["uiLatencies"].append({"kind":"open","ms":round((time.monotonic()-begin)*1000,3)})
            begin=time.monotonic();page.keyboard.press("Escape");paint(page)
            assert not page.evaluate("!!document.querySelector('dialog[open]')")
            data["uiLatencies"].append({"kind":"close","ms":round((time.monotonic()-begin)*1000,3)})
            if n%10==0:
                direction=["right","down","left","up"][(n//10-1)%4]
                begin=time.monotonic();button(page,f'.direction-pad .{direction}');paint(page)
                data["uiLatencies"].append({"kind":"move","ms":round((time.monotonic()-begin)*1000,3)})
                action["direction"]=direction
            button(page,".save-button")
            current=snapshot(page)
            previous=data["observations"][-1]["browser"] if data["observations"] else data["initialGameState"]
            assert current["worldTime"]>previous["worldTime"] and current["speed"]=="×20" and not current["warning"]
            observation={"checkpoint":n,"at":utc(),"elapsedSeconds":round(time.monotonic()-mono,3),"action":action,
                         "browser":current,"heap":cdp.send("Runtime.getHeapUsage"),"dom":cdp.send("Memory.getDOMCounters"),
                         "rss":rss(profile),"hostLoad":os.getloadavg()}
            data["observations"].append(observation)
            publish()
            if n==60: page.screenshot(path=str(OUT/"hour-1.png"))
            print(json.dumps({"checkpoint":n,"elapsed":observation["elapsedSeconds"],"worldTime":current["worldTime"],"archive":current["archiveCount"]}),flush=True)
        data["endedAtUtc"]=utc()
        data["fingerprintEnd"]=fingerprint()
        assert data["fingerprintEnd"]==data["fingerprintStart"]
        # Stop the clock through its UI before the one full archive export, making its cut explicit.
        button(page,".speed-controls button","暫停");paint(page)
        button(page,".save-button");page.wait_for_timeout(500)
        data["endSnapshot"]=snapshot(page)
        button(page,".menu-trigger");paint(page)
        with page.expect_download(timeout=120000) as download:
            page.evaluate("() => {const b=[...document.querySelectorAll('.pixel-menu button')].find(b=>b.textContent.includes('匯出遊玩紀錄'));if(!b)throw new Error('Export button missing');b.click()}")
        download.value.save_as(str(OUT/"oakvale-play-records.json"))
        raw=(OUT/"oakvale-play-records.json").read_text()
        write_recorded(OUT/"oakvale-play-records.json",raw,producer="root-clean-soak-export")
        data["exportSha256"]=hashlib.sha256(raw.encode()).hexdigest()
        data["status"]="completed"
        assert time.monotonic()-mono>=TARGET and not data["pageErrors"]
        publish("results.json");publish()
        context.close()
except BaseException as error:
    data.update(status="failed",endedAtUtc=utc(),failure=f"{type(error).__name__}: {error}")
    publish("results.json");publish()
    raise
