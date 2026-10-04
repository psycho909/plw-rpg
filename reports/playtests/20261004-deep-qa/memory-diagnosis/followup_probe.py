"""Follow-up controls for selector-correlated DOM retention; isolated browsers only."""
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
DRIVER = Path(importlib.metadata.distribution("playwright").locate_file("playwright/driver/package"))
DATA = {
    "status": "running", "startedAt": datetime.now(timezone.utc).isoformat(),
    "url": URL, "sourceLabel": MANIFEST["sourceLabel"],
    "sourceHashes": MANIFEST["sourceHashes"], "expectedBuildHashes": MANIFEST["buildHashes"],
    "pythonPlaywrightVersion": importlib.metadata.version("playwright"),
    "driverVersion": json.loads((DRIVER / "package.json").read_text())["version"],
    "driverCoreBundleSha256": hashlib.sha256((DRIVER / "lib/coreBundle.js").read_bytes()).hexdigest(),
    "harnessSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    "method": {
        "browser": "New disposable Chromium process; fresh context per case; never connect to or collect from main soak.",
        "app": "Immutable final production build; ordinary keyboard m/Escape; UI pause; no game-state fixtures or source edits.",
        "singleVariable": "Every cycle uses 15 ms after opening and closing plus boolean-only document checks. Conditions add exactly named Playwright selector calls; no user ElementHandle is created.",
        "evaluateReturns": "Only undefined, boolean, integer, or serialized counter objects; never return DOM nodes or retain them on window.",
        "gc": "200 ms settle, two CDP HeapProfiler.collectGarbage calls separated by 100 ms; only this disposable browser.",
        "snapshots": "Native dialog cases only, after final GC sample; raw V8 snapshot text published with write_recorded. Taking a snapshot can itself collect garbage; these are diagnostic cases, not soak results."
    },
    "cases": [], "pageErrors": [], "limitations": [
        "Short controlled diagnostic, not QA-01 two-hour completion or a general no-leak claim.",
        "Paused map controls measure mount/unmount retention; native cases exclude Vue and the game.",
        "An expected red control is reported as reproduced retention; no product change is made."
    ]
}

def publish():
    write_recorded(OUT / "followup-probe.json", json.dumps(DATA, ensure_ascii=False, indent=2) + "\n", producer="astra-memory-finish")

def collect(page, cdp):
    page.wait_for_timeout(200)
    for _ in range(2):
        cdp.send("HeapProfiler.collectGarbage")
        page.wait_for_timeout(100)

def sample(page, cdp, label):
    return {"label": label, "at": datetime.now(timezone.utc).isoformat(),
            "heap": cdp.send("Runtime.getHeapUsage"), "dom": cdp.send("Memory.getDOMCounters"),
            "connectedElements": page.evaluate("document.getElementsByTagName('*').length"),
            "openDialogs": page.evaluate("document.querySelectorAll('dialog[open]').length")}

def snapshot(cdp, name):
    chunks = []
    def add(params):
        chunks.append(params["chunk"])
    cdp.on("HeapProfiler.addHeapSnapshotChunk", add)
    try:
        cdp.send("HeapProfiler.takeHeapSnapshot", {"reportProgress": False})
    finally:
        cdp.remove_listener("HeapProfiler.addHeapSnapshotChunk", add)
    body = "".join(chunks)
    entry = write_recorded(OUT / name, body, producer="astra-memory-finish-raw-heap")
    return {"path": name, "sha256": entry["sha256"], "bytes": entry["bytes"], "nodeCount": json.loads(body)["snapshot"]["node_count"]}

def run():
    DATA["actualBuildHashes"] = {p: hashlib.sha256(urlopen(URL + p).read()).hexdigest() for p in MANIFEST["buildHashes"]}
    assert DATA["actualBuildHashes"] == MANIFEST["buildHashes"], "Served build differs from fixed manifest"
    DATA["observedSourceHashes"] = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in MANIFEST["sourceHashes"]}
    assert DATA["observedSourceHashes"] == MANIFEST["sourceHashes"], "Source changed from manifest"
    configs = [
        {"name": "map-keyboard-no-selectors", "kind": "app", "cycles": 40, "selector": "none"},
        {"name": "map-keyboard-both-waits", "kind": "app", "cycles": 40, "selector": "both-waits"},
        {"name": "native-dialog-no-selectors", "kind": "native", "cycles": 20, "selector": "none", "snapshot": True},
        {"name": "native-dialog-visible-wait", "kind": "native", "cycles": 20, "selector": "visible-wait", "snapshot": True},
        {"name": "native-dialog-detached-wait", "kind": "native", "cycles": 20, "selector": "detached-wait"},
        {"name": "native-dialog-is-visible", "kind": "native", "cycles": 20, "selector": "is-visible"},
    ]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        DATA["browserVersion"] = browser.version
        publish()
        for config in configs:
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            page = context.new_page()
            page.on("pageerror", lambda error: DATA["pageErrors"].append(str(error)))
            page.goto(URL if config["kind"] == "app" else "about:blank", wait_until="networkidle")
            if config["kind"] == "app":
                page.evaluate("() => { document.querySelector('.speed-controls button').click(); }")
                assert page.evaluate("document.querySelector('.speed-controls button').getAttribute('aria-pressed') === 'true'")
            cdp = context.new_cdp_session(page)
            collect(page, cdp)
            case = {**config, "checkedOpenCycles": 0, "checkedClosedCycles": 0, "samples": [sample(page, cdp, "baseline after forced GC")]}
            DATA["cases"].append(case)
            publish()
            for i in range(config["cycles"]):
                if config["kind"] == "app":
                    page.keyboard.press("m")
                else:
                    page.evaluate("""i => {
                        const d = document.createElement('dialog');
                        d.id = 'memory-probe-dialog-' + i;
                        d.innerHTML = '<button>Close</button><p>Native diagnostic lifecycle</p>';
                        d.addEventListener('cancel', event => { event.preventDefault(); d.remove(); });
                        document.body.append(d);
                        d.showModal();
                    }""", i)
                page.wait_for_timeout(15)
                assert page.evaluate("document.querySelectorAll('dialog[open]').length === 1"), "Dialog failed to open"
                case["checkedOpenCycles"] += 1
                if config["selector"] in ("both-waits", "visible-wait"):
                    page.locator("dialog[open]").wait_for(state="visible")
                elif config["selector"] == "is-visible":
                    assert page.locator("dialog[open]").is_visible()
                if config["kind"] == "app":
                    page.keyboard.press("Escape")
                else:
                    page.evaluate("() => { document.querySelector('dialog').remove(); }")
                page.wait_for_timeout(15)
                assert page.evaluate("document.querySelectorAll('dialog').length === 0"), "Dialog failed to detach"
                case["checkedClosedCycles"] += 1
                if config["selector"] in ("both-waits", "detached-wait"):
                    page.locator("dialog").wait_for(state="detached")
                if (i + 1) % 20 == 0:
                    case["samples"].append(sample(page, cdp, f"{i+1} cycles before forced GC"))
                    publish()
                    collect(page, cdp)
                    case["samples"].append(sample(page, cdp, f"{i+1} cycles after forced GC"))
                    publish()
            base, final = case["samples"][0], case["samples"][-1]
            case["deltasAfterGC"] = {key: final["dom"][key] - base["dom"][key] for key in base["dom"]}
            case["heapUsedDeltaAfterGC"] = final["heap"]["usedSize"] - base["heap"]["usedSize"]
            if config.get("snapshot"):
                case["heapSnapshot"] = snapshot(cdp, config["name"] + ".heapsnapshot")
                case["samples"].append(sample(page, cdp, "after heap snapshot (diagnostic only)"))
            case["status"] = "completed_observation"
            publish()
            context.close()
        browser.close()
    assert not DATA["pageErrors"], DATA["pageErrors"]
    DATA.update(status="completed_observation", finishedAt=datetime.now(timezone.utc).isoformat())
    publish()

try:
    run()
except BaseException as error:
    DATA.update(status="failed", error=f"{type(error).__name__}: {error}", traceback=traceback.format_exc(), finishedAt=datetime.now(timezone.utc).isoformat())
    publish()
    raise
print(json.dumps({"status": DATA["status"], "cases": [{"name": c["name"], "delta": c.get("deltasAfterGC"), "heapDelta": c.get("heapUsedDeltaAfterGC")} for c in DATA["cases"]]}, ensure_ascii=False))
