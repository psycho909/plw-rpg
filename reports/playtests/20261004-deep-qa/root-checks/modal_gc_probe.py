"""Separate short controlled GC probe; never touches the main soak process."""
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

result = {"status": "running", "startedAt": datetime.now(timezone.utc).isoformat(), "url": "http://127.0.0.1:5192/",
          "method": "Separate disposable Chromium context, repeated native modal UI; forced GC only in this supplemental probe, never in 2-hour soak.",
          "sourceManifest": "../baseline/final-manifest.json", "samples": [], "pageErrors": []}


def sample(page, cdp, label):
    evidence = {"label": label, "at": datetime.now(timezone.utc).isoformat(), "heap": cdp.send("Runtime.getHeapUsage"),
                "cdpDom": cdp.send("Memory.getDOMCounters"),
                "connectedElements": page.evaluate("document.getElementsByTagName('*').length")}
    result["samples"].append(evidence)
    write_recorded(OUT / "modal-gc-probe.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="root-modal-gc-probe")


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    page.on("pageerror", lambda error: result["pageErrors"].append(str(error)))
    page.goto(result["url"], wait_until="networkidle")
    page.get_by_role("button", name="暫停", exact=True).click()
    cdp = context.new_cdp_session(page)
    cdp.send("HeapProfiler.collectGarbage")
    sample(page, cdp, "initial forced-GC baseline")
    for cycle in range(1, 61):
        page.keyboard.press(["m", "i", "l", "c"][cycle % 4])
        page.locator("dialog[open]").wait_for(state="visible")
        page.keyboard.press("Escape")
        page.locator("dialog").wait_for(state="detached")
        if cycle % 10 == 0:
            sample(page, cdp, f"{cycle} open/close cycles without GC")
    sample(page, cdp, "before final forced GC")
    cdp.send("HeapProfiler.collectGarbage")
    sample(page, cdp, "after final forced GC")
    assert not result["pageErrors"]
    result.update(status="completed_observation", finishedAt=datetime.now(timezone.utc).isoformat(),
                  limitation="This short controlled probe can distinguish reclaimable detached objects from objects retained through forced GC. It does not establish that the natural 2-hour curve has no leak.")
    write_recorded(OUT / "modal-gc-probe.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="root-modal-gc-probe")
    context.close()
    browser.close()
