"""Verify the corrected action policy against the real Chromium UI."""
from __future__ import annotations

from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[5]
PHASE = ROOT / "reports/v2/20261008-content-expansion/phase-07"
sys.path.insert(0, str(PHASE))
from qa_browser_runner import action_button_label, choose_visible_action, classify_button  # noqa: E402
from qa_browser_support import provenance  # noqa: E402


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *args):
        pass


def main() -> int:
    start = datetime.now(timezone.utc)
    evidence = {
        "schema": "phase7-region-filter-browser-smoke-v1",
        "status": "RUNNING",
        "startedAtUTC": start.isoformat(),
        "head": provenance(ROOT, PHASE / "qa-browser-preparation/phase7-build-status.json", [])["head"],
        "sourceFingerprint": provenance(ROOT, PHASE / "qa-browser-preparation/phase7-build-status.json", [])["sourceFingerprint"],
        "distFingerprint": provenance(ROOT, PHASE / "qa-browser-preparation/phase7-build-status.json", [])["distFingerprint"],
        "browserErrors": [],
        "httpErrors": [],
        "checks": [],
    }
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT / "dist")))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium")
            try:
                context = browser.new_context(viewport={"width": 1280, "height": 900})
                page = context.new_page()
                page.on("pageerror", lambda error: evidence["browserErrors"].append({"type": "pageerror", "text": str(error)}))
                page.on("console", lambda message: evidence["browserErrors"].append({"type": "console", "text": message.text}) if message.type == "error" else None)
                page.on("response", lambda response: evidence["httpErrors"].append({"url": response.url, "status": response.status}) if response.status >= 400 else None)
                # The static build has no favicon asset; serve an empty response so this
                # environment-only optional request does not pollute application errors.
                page.route("**/favicon.ico", lambda route: route.fulfill(status=204, body=""))
                response = page.goto(f"http://127.0.0.1:{server.server_port}/", wait_until="networkidle", timeout=30000)
                assert response and response.status == 200, f"app response: {response.status if response else None}"
                evidence["checks"].append({"name": "production-build-loaded", "status": "PASS", "evidence": {"status": response.status}})
                page.get_by_role("button", name="起身", exact=True).click()
                page.get_by_role("button", name="選單", exact=False).click()
                page.get_by_role("button", name="地方消息與委託", exact=True).click()
                evidence["checks"].append({"name": "normal-opening-and-menu-navigation", "status": "PASS"})
                region_filter = page.get_by_role("button", name="區域", exact=True)
                assert region_filter.count() == 1, f"region filter count: {region_filter.count()}"
                region_filter.click()
                assert region_filter.get_attribute("aria-pressed") == "true", "region filter did not become selected"
                evidence["checks"].append({"name": "actual-region-filter-visible-enabled-selected", "status": "PASS", "evidence": {
                    "label": region_filter.inner_text(), "visible": region_filter.is_visible(),
                    "enabled": region_filter.is_enabled(), "ariaPressed": region_filter.get_attribute("aria-pressed")}})
                classification = classify_button(region_filter)
                selected, category, reason = choose_visible_action(page, 1, {})
                selected_label = action_button_label(selected) if selected is not None else None
                assert classification is None, f"region filter classified as {classification}"
                assert selected_label != "區域", f"runner selected filter control: {selected_label}"
                evidence["checks"].append({"name": "actual-region-filter-not-exploration-action", "status": "PASS", "evidence": {
                    "classification": classification, "nextPolicyCategory": category,
                    "nextSelectedLabel": selected_label, "policyReason": reason}})
                assert not evidence["browserErrors"], evidence["browserErrors"]
                assert not evidence["httpErrors"], evidence["httpErrors"]
                evidence["checks"].append({"name": "browser-and-http-errors-empty", "status": "PASS", "evidence": {"browserErrors": [], "httpErrors": []}})
                evidence["status"] = "PASS"
                context.close()
            finally:
                browser.close()
    except Exception as error:
        evidence["status"] = "FAIL"
        evidence["error"] = f"{type(error).__name__}: {error}"
        raise
    finally:
        server.shutdown()
        server.server_close()
        evidence["endedAtUTC"] = datetime.now(timezone.utc).isoformat()
        evidence["durationSeconds"] = (datetime.now(timezone.utc) - start).total_seconds()
        (Path(__file__).parent / "browser-smoke.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
