"""Compare delayed GC and real-clock activity in a separate browser profile."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

manifest = json.loads((OUT.parent / "baseline/final-manifest.json").read_text())
data = {"status": "running", "startedAt": datetime.now(timezone.utc).isoformat(), "url": "http://127.0.0.1:5192/",
        "sourceLabel": manifest["sourceLabel"], "sourceHashes": manifest["sourceHashes"], "buildHashes": manifest["buildHashes"],
        "harnessSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "method": "Separate Chromium profile; normal UI open/close cycles, actual x20 timer; explicit delayed GC only in this supplemental probe.",
        "samples": [], "pageErrors": []}


def save():
    write_recorded(OUT / "modal-gc-followup.json", json.dumps(data, ensure_ascii=False, indent=2) + "\n", producer="root-modal-gc-followup")


def sample(page, cdp, label):
    data["samples"].append({"label": label, "at": datetime.now(timezone.utc).isoformat(),
                            "heap": cdp.send("Runtime.getHeapUsage"), "cdpDom": cdp.send("Memory.getDOMCounters"),
                            "connectedElements": page.evaluate("document.getElementsByTagName('*').length"),
                            "worldTime": page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).worldTime")})
    save()


def cycles(page, count):
    for n in range(count):
        page.keyboard.press(["m", "i", "l", "c"][n % 4])
        page.locator("dialog[open]").wait_for(state="visible")
        page.keyboard.press("Escape")
        page.locator("dialog").wait_for(state="detached")


def collect(page, cdp):
    page.wait_for_timeout(1000)
    for _ in range(3):
        cdp.send("HeapProfiler.collectGarbage")
        page.wait_for_timeout(300)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    page.on("pageerror", lambda error: data["pageErrors"].append(str(error)))
    page.goto(data["url"], wait_until="networkidle")
    page.get_by_role("button", name="暫停", exact=True).click()
    cdp = context.new_cdp_session(page)
    collect(page, cdp)
    sample(page, cdp, "initial paused baseline after delayed triple GC")
    cycles(page, 60)
    sample(page, cdp, "60 paused modal cycles, before explicit GC")
    collect(page, cdp)
    sample(page, cdp, "paused 60 cycles after delayed triple GC")
    page.get_by_role("button", name="×20", exact=True).click()
    page.wait_for_timeout(3000)
    collect(page, cdp)
    sample(page, cdp, "same profile after real clock resume and delayed triple GC")
    cycles(page, 60)
    sample(page, cdp, "60 additional active x20 modal cycles, before explicit GC")
    collect(page, cdp)
    sample(page, cdp, "active 120 total cycles after delayed triple GC")
    data.update(status="completed_observation", finishedAt=datetime.now(timezone.utc).isoformat())
    assert not data["pageErrors"]
    save()
    context.close()
    browser.close()
