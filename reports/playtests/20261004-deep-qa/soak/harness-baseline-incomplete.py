#!/usr/bin/env python3
"""Real-time Chromium soak. No game clock, timers, or application state are injected."""
from __future__ import annotations

import hashlib, json, os, re, sys, tempfile, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from scripts.recorded_reports import write_recorded

URL = "http://127.0.0.1:5191/"
BASELINE = "738bc0010c549fa3fb2420437d171f5aa2a043a0"
BUILD = Path("/tmp/plw-rpg-qa-20261004-738bc00")
TARGET_SECONDS = 7200
OUT = Path(__file__).resolve().parent
CAP = 500

def utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")

def fingerprint() -> dict:
    """Hash index and the JS/CSS assets actually served by the fixed loopback URL."""
    with urlopen(URL, timeout=8) as response:
        html = response.read()
    paths = sorted(set(re.findall(rb"(?:src|href)=\"([^\"]+\.(?:js|css))\"", html)))
    assets = {"/": hashlib.sha256(html).hexdigest()}
    for raw in paths:
        path = raw.decode("ascii")
        with urlopen(URL.rstrip("/") + path, timeout=12) as response:
            body = response.read()
            assets[path] = hashlib.sha256(body).hexdigest()
    return {"assets": assets, "asset_count": len(assets)}

def capped_add(target: list, value: dict, counters: dict, name: str) -> None:
    counters[name] = counters.get(name, 0) + 1
    if len(target) < CAP:
        target.append(value)

def rss_for(profile: str) -> dict:
    try:
        import psutil
        procs = []
        for proc in psutil.process_iter(["pid", "cmdline", "memory_info"]):
            try:
                cmd = " ".join(proc.info["cmdline"] or [])
                if profile in cmd:
                    procs.append(proc)
            except (psutil.Error, OSError):
                pass
        return {"rss_bytes": sum(p.info["memory_info"].rss for p in procs), "process_count": len(procs), "available": True}
    except Exception as exc:
        return {"rss_bytes": None, "process_count": None, "available": False, "reason": f"{type(exc).__name__}: {exc}"}

def browser_storage(page) -> dict:
    return page.evaluate("""async () => {
      const keyBytes = (k, v) => new TextEncoder().encode(k + v).length;
      let saved = null, parseError = null, localStorageBytes = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '', v = localStorage.getItem(k) || '';
          localStorageBytes += keyBytes(k, v);
          if (k === 'oakvale-v1') saved = JSON.parse(v);
        }
      } catch (e) { parseError = String(e); }
      let idbCount = null, idbError = null;
      try {
        idbCount = await new Promise((resolve, reject) => {
          const req = indexedDB.open('oakvale-play-journal', 1);
          req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('records')) { db.close(); resolve(0); return; }
            const tx = db.transaction('records', 'readonly');
            const count = tx.objectStore('records').count();
            count.onsuccess = () => resolve(count.result);
            count.onerror = () => reject(count.error || new Error('IndexedDB count failed'));
            tx.oncomplete = () => db.close();
            tx.onabort = () => { db.close(); reject(tx.error || new Error('IndexedDB count aborted')); };
          };
        });
      } catch (e) { idbError = String(e); }
      let estimate = null, estimateError = null;
      try { estimate = await navigator.storage.estimate(); } catch (e) { estimateError = String(e); }
      const speed = [...document.querySelectorAll('.speed-controls button')]
        .find(b => b.getAttribute('aria-pressed') === 'true')?.innerText?.trim() ?? null;
      return {
        worldTime: saved?.worldTime ?? null,
        pendingRecords: Array.isArray(saved?.playJournal?.pending) ? saved.playJournal.pending.length : null,
        worldId: saved?.playJournal?.worldId ?? null,
        saveVersion: saved?.saveVersion ?? null,
        lastSavedAt: saved?.lastSavedAt ?? null,
        localStorageBytes,
        indexedDbRecordCount: idbCount,
        indexedDbError: idbError,
        storageEstimate: estimate ? { usage: estimate.usage ?? null, quota: estimate.quota ?? null,
          usageDetails: estimate.usageDetails ?? null } : null,
        storageEstimateError: estimateError,
        storageParseError: parseError,
        visibleClock: document.querySelector('.world-clock')?.innerText?.replace(/\\s+/g, ' ').trim() ?? null,
        selectedSpeed: speed,
        alive: saved?.characters?.find(c => c.id === saved.activeCharacterId)?.isAlive ?? null,
        saveError: [...document.querySelectorAll('.save-warning,[role="alert"],.inline-warning')]
          .map(e => e.innerText.trim()).filter(Boolean).join(' | ') || null,
        domNodes: document.getElementsByTagName('*').length,
        activeDialog: document.querySelector('dialog[open] h2')?.innerText?.trim() ?? null,
      };
    }""")

def percentile(values: list[float], q: float):
    if not values: return None
    xs = sorted(values)
    return round(xs[min(len(xs)-1, max(0, int((len(xs)-1)*q)))], 2)

def main() -> None:
    data = {
        "baselineCommit": BASELINE, "buildPath": str(BUILD), "url": URL,
        "targetElapsedSeconds": TARGET_SECONDS, "status": "starting",
        "startedAtUtc": None, "targetEndUtc": None, "endedAtUtc": None,
        "elapsedSeconds": None, "fingerprintStart": None, "fingerprintEnd": None,
        "observations": [], "uiLatenciesMs": [], "pageErrors": [], "consoleErrors": [],
        "resourceFailures": [], "droppedDiagnostics": {}, "interruptions": [],
        "limitations": ["Single disposable Chromium profile and local build; no forced GC.",
                        "Per-checkpoint IndexedDB uses count() only. Final UI export reads the archive once."]
    }
    mono_start = None
    def elapsed(): return round(time.monotonic() - mono_start, 3) if mono_start else None
    def persist(path=OUT / "checkpoints.json"):
        data["elapsedSeconds"] = elapsed()
        write_recorded(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n", producer="soak")
    def emit_snapshot_jsonl(item):
        with (OUT / "raw_profiles.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")

    profile = tempfile.mkdtemp(prefix="plw-rpg-qa-20261004-soak-profile-")
    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=profile, executable_path="/usr/bin/chromium", headless=True,
                viewport={"width": 1440, "height": 1000}, accept_downloads=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--enable-precise-memory-info"])
            page = context.pages[0] if context.pages else context.new_page()
            page.set_default_timeout(4000)
            counters = data["droppedDiagnostics"]
            page.on("pageerror", lambda err: capped_add(data["pageErrors"], {"atUtc": utc(), "elapsed": elapsed(), "text": str(err)}, counters, "pageErrors"))
            page.on("console", lambda msg: capped_add(data["consoleErrors"], {"atUtc": utc(), "elapsed": elapsed(), "text": msg.text,
                "url": (msg.location or {}).get("url")}, counters, "consoleErrors") if msg.type == "error" else None)
            page.on("requestfailed", lambda req: capped_add(data["resourceFailures"], {"atUtc": utc(), "elapsed": elapsed(), "url": req.url,
                "failure": req.failure}, counters, "resourceFailures"))
            page.on("response", lambda resp: capped_add(data["resourceFailures"], {"atUtc": utc(), "elapsed": elapsed(), "url": resp.url,
                "status": resp.status}, counters, "resourceFailures") if resp.status >= 400 else None)
            cdp = None
            try: cdp = context.new_cdp_session(page)
            except Exception as exc: data["cdpSetupError"] = f"{type(exc).__name__}: {exc}"
            try:
                page.goto(URL, wait_until="networkidle", timeout=20000)
                page.locator(".world-clock").wait_for(state="visible", timeout=10000)
                # launch_persistent_context has a new empty profile: this is a real new world.
                page.get_by_role("button", name="×20", exact=True).click()
                if page.get_by_role("button", name="×20", exact=True).get_attribute("aria-pressed") != "true":
                    raise RuntimeError("UI did not select ×20")
                data["fingerprintStart"] = fingerprint()
                started_wall = datetime.now(timezone.utc)
                mono_start = time.monotonic()
                data.update({"status": "running", "startedAtUtc": started_wall.isoformat(timespec="milliseconds"),
                             "targetEndUtc": (started_wall + timedelta(seconds=TARGET_SECONDS)).isoformat(timespec="milliseconds"),
                             "startMonotonic": mono_start, "chromiumProfile": profile})
                page.screenshot(path=str(OUT / "start.png"), full_page=True)
                persist()
                print(json.dumps({"event":"SOAK_START", "pid":os.getpid(), "startedAtUtc":data["startedAtUtc"],
                    "targetEndUtc":data["targetEndUtc"], "targetElapsedSeconds":TARGET_SECONDS,
                    "url":URL, "baseline":BASELINE, "profile":profile}, ensure_ascii=False), flush=True)
                routes = ["c", "i", "l", "m", "Escape", "c", "m", "i", "l", "Escape"]
                arrows = ["往右", "往下", "往左", "往上"]
                last_world_time = None
                next_checkpoint = mono_start + 60
                n = 0
                while time.monotonic() < mono_start + TARGET_SECONDS:
                    while time.monotonic() < next_checkpoint:
                        time.sleep(min(1.0, max(0.05, next_checkpoint-time.monotonic())))
                    n += 1
                    action = {"route": routes[(n-1) % len(routes)], "opened": False, "closed": False, "errors": []}
                    try:
                        dialog = page.locator("dialog[open]")
                        title = dialog.locator("h2").inner_text(timeout=700) if dialog.count() else ""
                        # Handle naturally occurring mandatory states through their normal UI.
                        if "旅程結束" in title:
                            candidates = dialog.locator(".successor-list button")
                            if candidates.count(): candidates.first.click(); action["inheritance"] = "selected first eligible resident via UI"
                            else:
                                dialog.get_by_role("button", name=re.compile("等待新居民抵達")).click()
                                action["inheritance"] = "used documented wait-for-resident UI"
                            action["opened"] = True
                        elif "戰鬥" in title:
                            attack = dialog.get_by_role("button", name="攻擊", exact=True)
                            for _ in range(8):
                                if not attack.is_visible(): break
                                attack.click(timeout=1500)
                                if not page.locator("dialog[open]").count(): break
                            action["combat"] = "resolved with attack buttons via UI"
                        elif "礦坑" in title:
                            leave = dialog.get_by_role("button", name="離開礦坑", exact=True)
                            if leave.count(): leave.click(timeout=1500); action["dungeon"] = "left via UI"
                        else:
                            if dialog.count():
                                t0=time.monotonic(); page.keyboard.press("Escape"); dialog.wait_for(state="detached",timeout=2500)
                                action["closed"] = True; data["uiLatenciesMs"].append({"kind":"closeModal","ms":round((time.monotonic()-t0)*1000,1)})
                            key = action["route"]
                            if key == "Escape":
                                page.locator(".menu-trigger").click(timeout=2500)
                            else:
                                page.keyboard.press(key)
                            opened = page.locator("dialog[open]")
                            if opened.count():
                                t0=time.monotonic(); opened.wait_for(state="visible",timeout=2000)
                                action["opened"] = True
                                data["uiLatenciesMs"].append({"kind":"openModal","ms":round((time.monotonic()-t0)*1000,1)})
                                t0=time.monotonic(); page.keyboard.press("Escape"); opened.wait_for(state="detached",timeout=2500)
                                action["closed"] = True
                                data["uiLatenciesMs"].append({"kind":"closeModal","ms":round((time.monotonic()-t0)*1000,1)})
                        if n % 10 == 0 and not page.locator("dialog[open]").count():
                            before = page.locator(".world-caption").inner_text()
                            t0=time.monotonic(); page.get_by_role("button",name=arrows[(n//10-1)%4],exact=True).click(timeout=2500)
                            try:
                                page.wait_for_function("before => document.querySelector('.world-caption')?.innerText !== before",arg=before,timeout=1000)
                                action["moved"] = True
                            except Exception: action["moved"] = False
                            data["uiLatenciesMs"].append({"kind":"move","ms":round((time.monotonic()-t0)*1000,1)})
                        if n % 5 == 0 and not page.locator("dialog[open]").count():
                            t0=time.monotonic(); page.locator(".save-button").click(timeout=2500)
                            data["uiLatenciesMs"].append({"kind":"manualSave","ms":round((time.monotonic()-t0)*1000,1)})
                        selected = page.get_by_role("button", name="×20", exact=True)
                        if selected.get_attribute("aria-pressed") != "true" and not page.locator(".save-warning").count():
                            selected.click(timeout=2500); action["speedRestoredViaUI"] = True
                    except Exception as exc:
                        action["errors"].append(f"{type(exc).__name__}: {exc}")
                        data["interruptions"].append({"atUtc":utc(),"elapsed":elapsed(),"kind":"ui_action","error":action["errors"][-1]})
                        try:
                            if page.locator("dialog[open]").count(): page.keyboard.press("Escape")
                        except Exception: pass
                    sample = {"checkpoint":n,"scheduledElapsedSeconds":n*60,"sampledAtUtc":utc(),"elapsedSeconds":elapsed(),"action":action}
                    try:
                        # Manual save persists through the ordinary UI and captures current world time.
                        if n % 5 != 0 and not page.locator("dialog[open]").count(): page.locator(".save-button").click(timeout=2500)
                        sample["browser"] = browser_storage(page)
                        sample["rss"] = rss_for(profile)
                        if cdp:
                            try: sample["cdpHeap"] = cdp.send("Runtime.getHeapUsage")
                            except Exception as exc: sample["cdpHeapError"] = f"{type(exc).__name__}: {exc}"
                            try: sample["cdpDom"] = cdp.send("Memory.getDOMCounters")
                            except Exception as exc: sample["cdpDomError"] = f"{type(exc).__name__}: {exc}"
                    except Exception as exc:
                        sample["sampleError"] = f"{type(exc).__name__}: {exc}"
                    live_time = (sample.get("browser") or {}).get("worldTime")
                    sample["worldTimeAdvanced"] = None if last_world_time is None or live_time is None else live_time > last_world_time
                    if live_time is not None: last_world_time = live_time
                    sample["pageErrorCount"] = data["droppedDiagnostics"].get("pageErrors", 0)
                    sample["consoleErrorCount"] = data["droppedDiagnostics"].get("consoleErrors", 0)
                    sample["resourceFailureCount"] = data["droppedDiagnostics"].get("resourceFailures", 0)
                    data["observations"].append(sample)
                    # Keep the harness profile bounded at checkpoint granularity.
                    data["uiLatenciesMs"] = data["uiLatenciesMs"][-1200:]
                    emit_snapshot_jsonl(sample)
                    persist()
                    print(json.dumps({"event":"CHECKPOINT","n":n,"elapsed":sample.get("elapsedSeconds"),
                        "worldTime":live_time,"clock":(sample.get("browser") or {}).get("visibleClock"),
                        "heap":sample.get("cdpHeap"),"dom":sample.get("cdpDom"),
                        "idbCount":(sample.get("browser") or {}).get("indexedDbRecordCount"),
                        "speed":(sample.get("browser") or {}).get("selectedSpeed"),"saveError":(sample.get("browser") or {}).get("saveError")},ensure_ascii=False),flush=True)
                    if n == 60: page.screenshot(path=str(OUT / "hour-1.png"), full_page=True)
                    next_checkpoint = mono_start + (n+1)*60

                # End only after monotonic time reaches the exact 2-hour floor.
                data["endedAtUtc"] = utc(); data["elapsedSeconds"] = elapsed()
                data["fingerprintEnd"] = fingerprint()
                if not page.locator("dialog[open]").count():
                    page.locator(".menu-trigger").click(timeout=3000)
                    with page.expect_download(timeout=60000) as download_info:
                        page.get_by_role("button", name="匯出遊玩紀錄", exact=True).click(timeout=3000)
                    download_info.value.save_as(str(OUT / "oakvale-play-records.json"))
                    exported=json.loads((OUT / "oakvale-play-records.json").read_text(encoding="utf-8"))
                    records=exported.get("records",[]); pending=exported.get("pending",[])
                    ids=[r.get("id") for r in records if isinstance(r,dict)]
                    ordinals=[r.get("ordinal") for r in records if isinstance(r,dict)]
                    data["exportValidation"]={"archiveAvailable":exported.get("archiveAvailable"),"recordCount":len(records),
                        "uniqueIdCount":len(set(ids)),"ordinalCount":len(ordinals),"ordinalsStrictlyIncreasing":all(a<b for a,b in zip(ordinals,ordinals[1:])),
                        "firstOrdinal":ordinals[0] if ordinals else None,"lastOrdinal":ordinals[-1] if ordinals else None,
                        "pendingCount":len(pending),"pendingUniqueIdCount":len({r.get("id") for r in pending if isinstance(r,dict)}),
                        "checkpointWorldId":(exported.get("checkpoint",{}).get("playJournal",{}) or {}).get("worldId"),
                        "fileBytes":(OUT/"oakvale-play-records.json").stat().st_size}
                else: data["exportValidation"]={"error":"modal remained open at end; export not attempted"}
                data["status"]="completed" if (data["elapsedSeconds"] or 0)>=TARGET_SECONDS else "incomplete"
                data["uiLatencySummaryMs"]={kind:{"count":len([x["ms"] for x in data["uiLatenciesMs"] if x["kind"]==kind]),
                    "p50":percentile([x["ms"] for x in data["uiLatenciesMs"] if x["kind"]==kind],.50),
                    "p95":percentile([x["ms"] for x in data["uiLatenciesMs"] if x["kind"]==kind],.95)}
                    for kind in sorted({x["kind"] for x in data["uiLatenciesMs"]})}
                persist(OUT / "results.json")
                persist()
                print(json.dumps({"event":"SOAK_END","status":data["status"],"elapsed":data["elapsedSeconds"],
                    "endedAtUtc":data["endedAtUtc"],"exportValidation":data.get("exportValidation")},ensure_ascii=False),flush=True)
            except BaseException as exc:
                data.update({"status":"failed","endedAtUtc":utc(),"failure":f"{type(exc).__name__}: {exc}"})
                persist(OUT / "results.json"); persist()
                raise
            finally:
                context.close()
    finally:
        # Retain the disposable profile only while the test is active; its export is the evidence artifact.
        try:
            import shutil
            shutil.rmtree(profile, ignore_errors=True)
        except Exception: pass

if __name__ == "__main__":
    main()
