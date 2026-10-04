"""Isolated disposable-browser modal retention controls; never attaches to soak."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import time
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[3]
sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded
URL="http://127.0.0.1:5192/"
MANIFEST=json.loads((OUT.parent/"baseline/final-manifest.json").read_text())
DATA={"status":"running","startedAt":datetime.now(timezone.utc).isoformat(),"url":URL,
      "sourceLabel":MANIFEST["sourceLabel"],"sourceHashes":MANIFEST["sourceHashes"],"buildHashes":MANIFEST["buildHashes"],
      "harnessSha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),"method":"Fresh browser context per case, paused app. Controlled UI/runtime probes and forced GC restricted to this newly launched disposable browser. No source, localStorage game-state fixture, or main soak edits.",
      "cases":[],"pageErrors":[]}

def publish():
    write_recorded(OUT/"probe.json",json.dumps(DATA,ensure_ascii=False,indent=2)+"\n",producer="astra-memory-probe")

def sample(page,cdp,label):
    return {"label":label,"at":datetime.now(timezone.utc).isoformat(),"heap":cdp.send("Runtime.getHeapUsage"),
            "dom":cdp.send("Memory.getDOMCounters"),"connectedElements":page.evaluate("document.getElementsByTagName('*').length")}

def collect(page,cdp):
    page.wait_for_timeout(200)
    for _ in range(2):
        cdp.send("HeapProfiler.collectGarbage")
        page.wait_for_timeout(100)

def native_cycles(page,mode,n):
    page.evaluate("""async ({mode,n}) => {
      for(let i=0;i<n;i++) {
        const d=document.createElement('dialog');
        d.innerHTML='<button>Close</button><p>Native lifecycle control</p>';
        d.addEventListener('cancel',event=>{event.preventDefault(); d.remove()});
        document.body.append(d); d.showModal();
        if(mode==='close-remove') d.close();
        d.remove();
        await new Promise(resolve=>requestAnimationFrame(resolve));
      }
    }""",{"mode":mode,"n":n})

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path="/usr/bin/chromium",headless=True,args=["--no-sandbox"])
    DATA["browserVersion"]=browser.version
    actual={p:hashlib.sha256(urlopen(URL+p).read()).hexdigest() for p in MANIFEST["buildHashes"]}
    assert actual==MANIFEST["buildHashes"]
    DATA["actualBuildHashes"]=actual; publish()
    configurations=[
      {"name":"map-keyboard-selectors","kind":"app","key":"m","selectors":True},
      {"name":"inventory-keyboard-selectors","kind":"app","key":"i","selectors":True},
      {"name":"inventory-keyboard-no-selectors","kind":"app","key":"i","selectors":False},
      {"name":"inventory-native-dispatch-click","kind":"app","key":"i","selectors":False,"nativeInput":True},
      {"name":"inventory-explicit-close-before-ui-removal","kind":"app","key":"i","selectors":False,"nativeInput":True,"closeFirst":True},
      {"name":"native-dialog-remove-open","kind":"native","mode":"remove-open"},
      {"name":"native-dialog-close-remove","kind":"native","mode":"close-remove"},
    ]
    for config in configurations:
        context=browser.new_context(viewport={"width":1440,"height":1000})
        page=context.new_page()
        page.on("pageerror",lambda error:DATA["pageErrors"].append(str(error)))
        if config["kind"]=="app":
            page.goto(URL,wait_until="networkidle")
            page.evaluate("document.querySelector('.speed-controls button').click()")
        else:
            page.goto("about:blank")
        cdp=context.new_cdp_session(page)
        collect(page,cdp)
        case={**config,"samples":[sample(page,cdp,"baseline after forced GC")]}
        DATA["cases"].append(case);publish()
        for block in range(2):
            for _ in range(20):
                if config["kind"]=="native":
                    native_cycles(page,config["mode"],1)
                elif config.get("nativeInput"):
                    page.evaluate("key=>window.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}))",config["key"])
                    page.wait_for_timeout(15)
                    page.evaluate("""closeFirst=>{
                      const d=document.querySelector('dialog');
                      if(!d?.open) throw new Error('Dialog did not open');
                      if(closeFirst) d.close();
                      d.querySelector('.window-close').click();
                    }""",bool(config.get("closeFirst")))
                    page.wait_for_timeout(15)
                else:
                    page.keyboard.press(config["key"])
                    if config["selectors"]: page.locator("dialog[open]").wait_for(state="visible")
                    else: page.wait_for_timeout(15)
                    page.keyboard.press("Escape")
                    if config["selectors"]: page.locator("dialog").wait_for(state="detached")
                    else: page.wait_for_timeout(15)
            case["samples"].append(sample(page,cdp,f"{(block+1)*20} cycles before forced GC"));publish()
            collect(page,cdp)
            case["samples"].append(sample(page,cdp,f"{(block+1)*20} cycles after forced GC"));publish()
        context.close()
    DATA.update(status="completed_observation",finishedAt=datetime.now(timezone.utc).isoformat())
    publish()
    browser.close()
print(json.dumps({"status":DATA["status"],"cases":[{"name":c["name"],"baseline":c["samples"][0]["dom"],"final":c["samples"][-1]["dom"],"heapBefore":c["samples"][0]["heap"]["usedSize"],"heapAfter":c["samples"][-1]["heap"]["usedSize"]} for c in DATA["cases"]]},indent=2))
