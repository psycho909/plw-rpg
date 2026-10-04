"""Probe O1 on the pinned browser build; injected quota, real UI/timers."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import time
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

URL = "http://127.0.0.1:5191/"
RESULT = {"status": "running", "url": URL, "startedAt": datetime.now(timezone.utc).isoformat(),
          "method": "Controlled Storage.setItem quota failure; no state/timer injection. Normal UI actions and real timers.",
          "sourceCommit": "738bc0010c549fa3fb2420437d171f5aa2a043a0", "steps": [], "pageErrors": []}


def record(name, evidence):
    RESULT["steps"].append({"name": name, "at": datetime.now(timezone.utc).isoformat(), **evidence})
    write_recorded(OUT / "quota-resume.json", json.dumps(RESULT, ensure_ascii=False, indent=2) + "\n", producer="root-quota-resume")


def raw(page):
    return page.evaluate("localStorage.getItem('oakvale-v1')")


def export(page):
    if page.locator("dialog").count():
        page.keyboard.press("Escape")
    page.locator(".menu-trigger").click()
    with page.expect_download() as download:
        page.locator(".pixel-menu").get_by_role("button", name="匯出遊玩紀錄").click()
    data = json.loads(Path(download.value.path()).read_text())
    page.keyboard.press("Escape")
    return data


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    page.on("pageerror", lambda error: RESULT["pageErrors"].append(str(error)))
    page.goto(URL, wait_until="networkidle")
    page.get_by_role("group", name="世界時間速度").get_by_role("button", name="暫停", exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")
    baseline = raw(page)
    baseline_time = json.loads(baseline)["worldTime"]
    manifest = json.loads((OUT.parent / "baseline/manifest.json").read_text())
    actual_hashes = {name: hashlib.sha256(urlopen(URL + name).read()).hexdigest() for name in manifest["buildHashes"]}
    assert actual_hashes == manifest["buildHashes"]
    record("baseline", {"worldTime": baseline_time, "browser": browser.version, "actualBuildHashes": actual_hashes})
    page.evaluate("""() => {
      window.originalQuotaSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, ...args) {
        if (key === 'oakvale-v1') throw new DOMException('controlled persistent quota', 'QuotaExceededError');
        return window.originalQuotaSetItem.call(this, key, ...args);
      };
    }""")
    page.get_by_role("button", name="往右", exact=True).click()
    assert raw(page) == baseline
    assert page.get_by_role("button", name="暫停", exact=True).get_attribute("aria-pressed") == "true"
    first = export(page)
    first_time = first["checkpoint"]["worldTime"]
    record("first failed save pauses", {"worldTimeInMemory": first_time, "diskUnchanged": True,
           "pending": len(first["pending"]), "warning": page.locator("[role=alert]").inner_text()})
    page.get_by_role("button", name="×20", exact=True).click()
    page.wait_for_timeout(700)
    continued = export(page)
    continued_time = continued["checkpoint"]["worldTime"]
    assert raw(page) == baseline
    record("real x20 resume during quota", {"worldTimeInMemory": continued_time, "deltaFromFirstFailure": continued_time - first_time,
           "diskUnchanged": True, "pending": len(continued["pending"]), "pausedAgain": page.get_by_role("button", name="暫停", exact=True).get_attribute("aria-pressed") == "true"})
    page.locator(".menu-trigger").click()
    page.locator(".pixel-menu").get_by_role("button", name="旅人筆記", exact=True).click()
    page.get_by_role("button", name="度過一季", exact=True).click()
    waited = export(page)
    waited_time = waited["checkpoint"]["worldTime"]
    assert raw(page) == baseline
    record("normal season wait during quota", {"worldTimeInMemory": waited_time, "deltaFromX20": waited_time - continued_time,
           "diskUnchanged": True, "pending": len(waited["pending"])})
    pending_ids = [entry["id"] for entry in waited["pending"]]
    page.evaluate("() => { Storage.prototype.setItem = window.originalQuotaSetItem; }")
    page.locator(".save-button").click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length === 0")
    recovered = export(page)
    assert recovered["checkpoint"]["worldTime"] == waited_time
    assert all(sum(row["id"] == identifier for row in recovered["records"]) == 1 for identifier in pending_ids)
    assert not RESULT["pageErrors"]
    record("manual save recovery", {"worldTime": waited_time, "allPendingCommittedOnce": True, "pending": len(recovered["pending"]), "warningCleared": page.locator("[role=alert]").count() == 0})
    RESULT.update(status="completed_observation", finishedAt=datetime.now(timezone.utc).isoformat(),
                  finding="O1 confirmed: x20 resume and season wait can accumulate progress while checkpoint storage keeps failing. Old disk survives; successful retry retains memory progress and commits pending once. Requires recovery-policy diagnosis, not proof of silent corruption.")
    record("disposition", {"awaitingPolicyDiagnosis": True})
    context.close()
    browser.close()
