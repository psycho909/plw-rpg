"""Separate controlled profile of full-state clone actions with engine-emitted 20k history.

This helper is independent of the frozen J stress/agent runner. It creates isolated fixture
saves through current engine emit/serialize APIs, measures public actions in fresh Chromium
contexts, and keeps the engine-profile fallback distinct from browser evidence.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from typing import Any

from playwright.sync_api import sync_playwright

from j_browser_support import append_jsonl, file_map, now_utc, provenance, sha_file, validate_build


ROOT = next(candidate for candidate in Path(__file__).resolve().parents if (candidate / "package.json").is_file() and (candidate / "src").is_dir())
PHASE = Path(__file__).resolve().parent
BUILD = Path(os.environ.get("PLW_BUILD_STATUS", PHASE / "j-build-status.json"))
PROFILE_COUNT = int(os.environ.get("PLW_J_HISTORY_PROFILE_COUNT", "20000"))
OUT = PHASE / ("j-history-profile" if PROFILE_COUNT == 20000 else f"j-history-profile-dry-{PROFILE_COUNT}")
INPUT_FIXTURE = PHASE / "j-fixture-preparation.json"
PRODUCER = "g6-luna-med-phase6-j-history-profile"


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def fixture_generator(temp_root: Path) -> dict[str, Any]:
    shutil.copytree(ROOT / "src", temp_root / "src")
    for name in ("package.json", "package-lock.json", "vite.config.ts", "tsconfig.json", "index.html"):
        shutil.copy2(ROOT / name, temp_root / name)
    (temp_root / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
    shutil.copy2(INPUT_FIXTURE, temp_root / "preparation.json")
    script = temp_root / ".j-history-profile.mjs"
    script.write_text(r'''import fs from 'node:fs'; import {resolve} from 'node:path'; import {createHash} from 'node:crypto'; import {createServer} from 'vite';
const root=process.cwd(); const server=await createServer({configFile:resolve(root,'vite.config.ts'),root,server:{middlewareMode:true},appType:'custom'});
try {
 const {emit}=await server.ssrLoadModule('/src/engine/events.ts');
 const {CONFIG}=await server.ssrLoadModule('/src/data/config.ts');
 const {movePlayer,player,simulate}=await server.ssrLoadModule('/src/engine/simulation.ts');
 const {startRegionalCampRaid}=await server.ssrLoadModule('/src/engine/actions.ts');
 const {deserialize,serialize}=await server.ssrLoadModule('/src/services/saveService.ts');
 const raw=fs.readFileSync(resolve(root,'preparation.json'),'utf8'); const initial=deserialize(raw).state;
 initial.life.openingSeen=true; const actor=player(initial); actor.position={x:5,y:4}; actor.currentRegion='forest';
 const activeStart=structuredClone(initial); let transitions=0;
 while(activeStart.regionalCrisis.phase==='preparation' && transitions++<200) { const old=activeStart.worldTime; simulate(activeStart,CONFIG.minutesPerDay); if(activeStart.worldTime===old) throw new Error('Canonical world clock did not reach active crisis phase') }
 if(activeStart.regionalCrisis.phase!=='active') throw new Error(`Expected canonical active phase, got ${activeStart.regionalCrisis.phase}`)
 const fSensitive=structuredClone(activeStart); const noF=structuredClone(activeStart);
 simulate(noF,Math.max(0,noF.regionalCrisis.phaseEndsAt-noF.worldTime-1000));
 simulate(fSensitive,Math.max(0,fSensitive.regionalCrisis.phaseEndsAt-fSensitive.worldTime-5));
 if(noF.regionalCrisis.phase!=='active'||fSensitive.regionalCrisis.phase!=='active'||fSensitive.regionalCrisis.phaseEndsAt-fSensitive.worldTime!==5) throw new Error('Canonical simulation did not create valid active-phase boundary profiles')
 const startingRng=activeStart.rngState; const historySource=structuredClone(activeStart);
 for(let i=0;historySource.history.length<__PROFILE_COUNT__;i++) emit(historySource,'qa.history-profile','world',`受控重大歷史紀錄 ${String(i+1).padStart(5,'0')}`,true);
 const sharedHistory=structuredClone(historySource.history); const sharedEvents=structuredClone(historySource.events); const sharedSequence=historySource.eventSequence;
 for(const state of [noF,fSensitive]) { state.history=structuredClone(sharedHistory); state.events=structuredClone(sharedEvents); state.eventSequence=sharedSequence; state.rngState=startingRng; }
 if(noF.history.length!==__PROFILE_COUNT__ || fSensitive.history.length!==__PROFILE_COUNT__ || noF.history.some(x=>x.tier!=='major') || fSensitive.history.some(x=>x.tier!=='major')) throw new Error('History fixture count/tier differs from requested canonical engine-emitted major events');
 if(JSON.stringify(noF.history)!==JSON.stringify(fSensitive.history)) throw new Error('F/no-F profiles do not share the exact engine-emitted history clone')
 const historyDigest=JSON.stringify(noF.history); const baseSave=serialize(noF,20001);
 const baseline=deserialize(baseSave).state; const baselineBefore={worldTime:baseline.worldTime,phase:baseline.regionalCrisis.phase,rngState:baseline.rngState,historyCount:baseline.history.length};
 const fSave=serialize(fSensitive,20002);
 function measure(name,state,action){const before=process.memoryUsage();const started=performance.now();let result;try{result=action(state)}catch(error){result={error:`${error?.name||'Error'}: ${error?.message||error}`}}const elapsed=performance.now()-started;const after=process.memoryUsage();return {name,elapsedMs:elapsed,result,historyCount:state.history.length,historySha256:requireHash(JSON.stringify(state.history)),rngBefore:startingRng,rngAfter:state.rngState,heapUsedBeforeBytes:before.heapUsed,heapUsedAfterBytes:after.heapUsed,heapDeltaBytes:after.heapUsed-before.heapUsed}}
 function requireHash(value){return createHash('sha256').update(value).digest('hex')}
 const noFAction=measure('public movePlayer no-F boundary baseline',baseline,s=>movePlayer(s,1,0));
 const fState=deserialize(fSave).state; const f=measure('public movePlayer at F-sensitive active boundary',fState,s=>movePlayer(s,1,0));
 const campState=deserialize(baseSave).state; const camp=measure('public startRegionalCampRaid clone preflight',campState,s=>startRegionalCampRaid(s,s.regionalCrisis.id));
 if(JSON.stringify(baseline.history)!==historyDigest) throw new Error('No-F base history differs from engine-emitted exact fixture');
 const fixture={base:{raw:baseSave},fSensitive:{raw:fSave},count:baseline.history.length,expectedCount:__PROFILE_COUNT__,historySha256:requireHash(historyDigest),saveBytes:Buffer.byteLength(baseSave),startingRng,baselineBefore,
   controlledDifference:{field:'regionalCrisis.phase/phaseStartedAt/phaseEndsAt only',fSensitivePhase:'active',boundaryMinutesAhead:5},
   engineActions:[noFAction,f,camp],method:'Controlled history generated with the current engine emit() API until the exact requested major-event bound; active crisis states reached with canonical simulate; saved and reloaded through current serializer; public movePlayer and startRegionalCampRaid measured on exact clones. The no-F and F-sensitive states share the exact same engine-emitted major history; F boundary timing is separately labeled controlled and is not normal-play evidence.'};
 process.stdout.write(JSON.stringify(fixture));
} finally {await server.close()}
'''.replace("__PROFILE_COUNT__", str(PROFILE_COUNT)), encoding="utf-8")
    run = subprocess.run(["node", str(script)], cwd=temp_root, text=True, capture_output=True)
    if run.returncode:
        raise RuntimeError(f"Engine history fixture generation failed ({run.returncode}): {run.stderr[-3000:]}")
    rows = [line for line in run.stdout.splitlines() if line.lstrip().startswith("{")]
    if not rows:
        raise RuntimeError("Engine fixture generator returned no JSON record")
    return json.loads(rows[-1])


def server_code() -> str:
    return r'''import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
class H(SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.split('?',1)[0]=='/favicon.ico': self.send_response(204); self.end_headers()
  else: super().do_GET()
 def do_HEAD(self):
  if self.path.split('?',1)[0]=='/favicon.ico': self.send_response(204); self.end_headers()
  else: super().do_HEAD()
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),partial(H,directory=sys.argv[2])).serve_forever()
'''


def profile_browser(fixtures: dict[str, Any], url: str) -> dict[str, Any]:
    result: dict[str, Any] = {"status": "IN_PROGRESS", "scenarios": [], "pageErrors": [], "consoleErrors": [], "requestFailures": [], "httpFailures": []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        try:
            for name, raw in (("noF", fixtures["base"]["raw"]), ("fSensitive", fixtures["fSensitive"]["raw"]), ("camp", fixtures["base"]["raw"])):
                context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
                page = context.new_page()
                page.add_init_script("""(() => {window.__jWrites=[];window.__jStorageErrors=[];window.__jRejects=[];
                  const old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){const t=performance.now();try{return old.call(this,k,v)}catch(e){window.__jStorageErrors.push(String(e));throw e}finally{if(k==='oakvale-v1')window.__jWrites.push(performance.now()-t)}};
                  addEventListener('unhandledrejection',e=>window.__jRejects.push(String(e.reason)));
                  if(!localStorage.getItem('oakvale-v1')){const value=JSON.parse(__fixture);localStorage.setItem('oakvale-v1',JSON.stringify({...value,playJournal:{version:1,worldId:'j-history-controlled',pending:[]}}));}
                })();""".replace("__fixture", json.dumps(raw, ensure_ascii=False)))
                page.on("pageerror", lambda error: result["pageErrors"].append(str(error)))
                page.on("console", lambda msg: result["consoleErrors"].append(msg.text) if msg.type == "error" else None)
                page.on("requestfailed", lambda request: result["requestFailures"].append({"url": request.url, "error": request.failure}))
                page.on("response", lambda response: result["httpFailures"].append({"url": response.url, "status": response.status}) if response.status >= 400 else None)
                started = time.perf_counter()
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    page.locator(".world-map").wait_for(timeout=30000)
                    boot_ms = round((time.perf_counter() - started) * 1000, 2)
                    cdp = context.new_cdp_session(page)
                    profile = {}
                    for command in ("Performance.enable", "Memory.getDOMCounters", "Runtime.getHeapUsage", "Performance.getMetrics"):
                        try: profile[command] = cdp.send(command)
                        except Exception as exc: profile.setdefault("limitations", []).append({"command": command, "error": str(exc)})
                    page.evaluate("window.__jWrites=[];window.__jStorageErrors=[];window.__jRejects=[]")
                    action_started = time.perf_counter()
                    if name == "camp":
                        page.locator(".world-map").press("Enter")
                        action = page.locator("[data-camp-raid]")
                        action.wait_for(state="visible", timeout=10000); action.click()
                    else:
                        action = page.get_by_role("button", name="往左")
                        action.click()
                    action_ms = round((time.perf_counter() - action_started) * 1000, 2)
                    telemetry = page.evaluate("""() => {const s=JSON.parse(localStorage.getItem('oakvale-v1')||'{}');return {
                      storageBytes:new TextEncoder().encode(localStorage.getItem('oakvale-v1')||'').length,historyCount:s.history?.length,
                      journalPending:s.playJournal?.pending?.length,worldTime:s.worldTime,crisisPhase:s.regionalCrisis?.phase,
                      writes:window.__jWrites,storageErrors:window.__jStorageErrors,unhandledRejections:window.__jRejects,
                      visibleText:(document.querySelector('.world-map')?.innerText||'').slice(0,800)}; }""")
                    result["scenarios"].append({"label": name, "status": "PASS_UI_ACTION", "bootMs": boot_ms, "actionMs": action_ms,
                        "telemetry": telemetry, "cdp": profile, "exactHistoryCountExpected": fixtures["count"], "controlledFixture": True})
                except BaseException as exc:
                    result["scenarios"].append({"label": name, "status": "FAIL_BROWSER_FIXTURE_OR_ACTION", "error": f"{type(exc).__name__}: {exc}",
                        "storageBytes": page.evaluate("new TextEncoder().encode(localStorage.getItem('oakvale-v1')||'').length") if page.url else None,
                        "pageErrors": list(result["pageErrors"]), "consoleErrors": list(result["consoleErrors"])})
                    if name == "camp": raise
                finally:
                    context.close()
        finally:
            browser.close()
    result["status"] = "PASS" if all(row["status"].startswith("PASS") for row in result["scenarios"]) else "PARTIAL_BROWSER_FAILURE"
    return result


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    before = provenance(ROOT, BUILD, [])
    build = validate_build(ROOT, BUILD)
    output = OUT / "j-history-profile.json"
    journal = OUT / "j-history-profile.jsonl"
    status: dict[str, Any] = {"status": "IN_PROGRESS", "createdAtUTC": now_utc(), "head": before["head"],
        "sourceFingerprint": before["sourceFingerprint"], "distFingerprint": before["distFingerprint"],
        "buildStatusSha256": before["buildStatusSha256"], "runnerSha256": sha_file(Path(__file__)),
        "engineFixtureInputSha256": sha_file(INPUT_FIXTURE), "chromiumPath": "/usr/bin/chromium"}
    append_jsonl(journal, {"event": "start", **status})
    try:
        with tempfile.TemporaryDirectory(prefix="plw-j-20k-history-") as td:
            generated = fixture_generator(Path(td))
            status["engineFixture"] = {key: value for key, value in generated.items() if key not in ("base", "fSensitive")}
            for name, value in (("noF", generated["engineActions"][0]), ("fSensitive", generated["engineActions"][1]), ("camp", generated["engineActions"][2])):
                append_jsonl(journal, {"event": "engine-action", "label": name, **value})
            for name, fixture in (("base", generated["base"]), ("fSensitive", generated["fSensitive"])):
                path = OUT / f"{name}-20k-save.json"
                path.write_text(fixture["raw"], encoding="utf-8")
                status.setdefault("fixtureFiles", {})[path.name] = {"bytes": path.stat().st_size, "sha256": sha_file(path)}
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0)); port = int(sock.getsockname()[1])
            server_log = (OUT / "server.log").open("ab")
            server = subprocess.Popen([sys.executable, "-c", server_code(), str(port), str((ROOT / "dist").resolve())], cwd=ROOT,
                stdout=server_log, stderr=subprocess.STDOUT)
            try:
                deadline = time.monotonic() + 15
                from j_browser_support import verify_http_dist
                url = f"http://127.0.0.1:{port}"
                while True:
                    try:
                        served = verify_http_dist(ROOT, url, build); break
                    except Exception:
                        if time.monotonic() >= deadline: raise
                        time.sleep(.2)
                status["servedAssets"] = served
                status["browserProfile"] = profile_browser(generated, url)
            finally:
                server.terminate()
                try: status["serverExitCode"] = server.wait(timeout=5)
                except subprocess.TimeoutExpired: server.kill(); status["serverExitCode"] = server.wait(timeout=5)
                server_log.close()
        after = provenance(ROOT, BUILD, [])
        status["sourceStableDuringRun"] = before == after
        status["sourceAfter"] = after
        if not status["sourceStableDuringRun"]: status["status"] = "FAILED_PROVENANCE_CHANGED"
        elif status.get("browserProfile", {}).get("status") == "PASS": status["status"] = "PASS"
        else: status["status"] = "PASS_ENGINE_PROFILE_BROWSER_FAILURE"
    except BaseException as exc:
        status["status"] = "FAILED"; status["error"] = f"{type(exc).__name__}: {exc}"
    status["endedAtUTC"] = now_utc()
    append_jsonl(journal, {"event": "finish", "status": status["status"], "endedAtUTC": status["endedAtUTC"],
        "sourceStableDuringRun": status.get("sourceStableDuringRun"), "error": status.get("error")})
    output.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": status["status"], "output": str(output), "sourceStableDuringRun": status.get("sourceStableDuringRun"),
        "error": status.get("error"), "fixture": status.get("engineFixture"), "browserStatus": status.get("browserProfile", {}).get("status")}, ensure_ascii=False, indent=2))
    return 0 if status["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
