"""Test the observed DevTools-console retaining root, only in disposable contexts."""
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import sys
import traceback
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded
URL = "http://127.0.0.1:5193/"
MANIFEST = json.loads((OUT.parent / "baseline/final-manifest.json").read_text())
DATA = {"status": "running", "startedAt": datetime.now(timezone.utc).isoformat(), "url": URL,
        "sourceLabel": MANIFEST["sourceLabel"], "buildHashes": MANIFEST["buildHashes"],
        "harnessSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "pythonPlaywrightVersion": importlib.metadata.version("playwright"), "cases": [],
        "method": "New browser, fresh contexts; Runtime.enable for scalar console/exception event metadata in every case; UI pause; four checked open/remove cycles. Collect twice, snapshot, then discard console entries and collect twice. All GC/snapshots/console interventions affect only this disposable browser; never main soak or game source.",
        "limitation": "A short inspector-retention diagnosis; does not verify real-time soak or exclude other memory growth."}

def publish():
    write_recorded(OUT / "retainer-probe.json", json.dumps(DATA, ensure_ascii=False, indent=2) + "\n", producer="astra-memory-finish-retainer")

def collect(page, cdp):
    page.wait_for_timeout(200)
    for _ in range(2):
        cdp.send("HeapProfiler.collectGarbage")
        page.wait_for_timeout(100)

def sample(page, cdp, label):
    return {"label": label, "at": datetime.now(timezone.utc).isoformat(), "dom": cdp.send("Memory.getDOMCounters"),
            "heap": cdp.send("Runtime.getHeapUsage"), "connectedElements": page.evaluate("document.getElementsByTagName('*').length")}

def snapshot(cdp, file):
    chunks = []
    def add(event): chunks.append(event["chunk"])
    cdp.on("HeapProfiler.addHeapSnapshotChunk", add)
    try: cdp.send("HeapProfiler.takeHeapSnapshot", {"reportProgress": False})
    finally: cdp.remove_listener("HeapProfiler.addHeapSnapshotChunk", add)
    entry = write_recorded(OUT / file, "".join(chunks), producer="astra-memory-finish-raw-heap")
    return {"path": file, "sha256": entry["sha256"], "bytes": entry["bytes"]}

def remote_summary(arg):
    return {key: arg[key] for key in ("type", "subtype", "className", "description", "value") if key in arg and isinstance(arg[key], (str, bool, int, float, type(None)))}

def run():
    DATA["actualBuildHashes"] = {p: hashlib.sha256(urlopen(URL + p).read()).hexdigest() for p in MANIFEST["buildHashes"]}
    assert DATA["actualBuildHashes"] == DATA["buildHashes"]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        DATA["browserVersion"] = browser.version
        for kind, selectors in [("native", False), ("native", True), ("map", True)]:
            case = {"kind": kind, "visibleSelectorWait": selectors, "cycles": 4, "consoleEvents": [], "exceptionEvents": [], "samples": []}
            DATA["cases"].append(case)
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            page = context.new_page()
            cdp = context.new_cdp_session(page)
            def console_event(event):
                case["consoleEvents"].append({"type": event["type"], "args": [remote_summary(a) for a in event.get("args", [])], "stackTrace": event.get("stackTrace")})
            def exception_event(event):
                detail = event["exceptionDetails"]
                case["exceptionEvents"].append({"text": detail.get("text"), "exception": remote_summary(detail.get("exception", {})), "stackTrace": detail.get("stackTrace")})
            cdp.on("Runtime.consoleAPICalled", console_event)
            cdp.on("Runtime.exceptionThrown", exception_event)
            cdp.send("Runtime.enable")
            page.goto(URL if kind == "map" else "about:blank", wait_until="networkidle")
            if kind == "map":
                page.evaluate("() => { document.querySelector('.speed-controls button').click(); }")
            collect(page, cdp)
            case["samples"].append(sample(page, cdp, "baseline after forced GC"))
            publish()
            for i in range(case["cycles"]):
                if kind == "map": page.keyboard.press("m")
                else:
                    page.evaluate("""i => {
                        const d = document.createElement('dialog'); d.id = 'retainer-probe-dialog-' + i;
                        d.innerHTML = '<button>Close</button><p>Native control</p>';
                        d.addEventListener('cancel', e => { e.preventDefault(); d.remove(); });
                        document.body.append(d); d.showModal();
                    }""", i)
                page.wait_for_timeout(15)
                assert page.evaluate("document.querySelectorAll('dialog[open]').length === 1")
                if selectors: page.locator("dialog[open]").wait_for(state="visible")
                if kind == "map": page.keyboard.press("Escape")
                else: page.evaluate("() => { document.querySelector('dialog').remove(); }")
                page.wait_for_timeout(15)
                assert page.evaluate("document.querySelectorAll('dialog').length === 0")
            collect(page, cdp)
            case["samples"].append(sample(page, cdp, "four cycles after forced GC"))
            publish()
            if selectors:
                case["beforeSnapshot"] = snapshot(cdp, kind + "-retainer-before.heapsnapshot")
                case["samples"].append(sample(page, cdp, "after snapshot before console discard"))
                publish()
            case["consoleDiscardResult"] = cdp.send("Runtime.discardConsoleEntries")
            collect(page, cdp)
            case["samples"].append(sample(page, cdp, "after Runtime.discardConsoleEntries and forced GC"))
            if selectors:
                case["afterSnapshot"] = snapshot(cdp, kind + "-retainer-after.heapsnapshot")
            case["status"] = "completed_observation"
            publish()
            context.close()
        browser.close()
    DATA.update(status="completed_observation", finishedAt=datetime.now(timezone.utc).isoformat())
    publish()

try: run()
except BaseException as error:
    DATA.update(status="failed", error=f"{type(error).__name__}: {error}", traceback=traceback.format_exc())
    publish()
    raise
print(json.dumps({"status": DATA["status"], "cases": [{"kind": c["kind"], "selector": c["visibleSelectorWait"], "dom": [s["dom"] for s in c["samples"]], "consoleEvents": len(c["consoleEvents"]), "exceptionEvents": len(c["exceptionEvents"])} for c in DATA["cases"]]}))
