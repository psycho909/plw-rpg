"""Focused regression tests for C pilot runner failure preservation."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

from playwright.sync_api import sync_playwright


SCRIPT = Path(__file__).with_name("phase05_c_normal_pilot.py")
SPEC = importlib.util.spec_from_file_location("phase05_c_normal_pilot", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
pilot = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pilot)


class BrowserCleanupFailurePreservationTests(unittest.TestCase):
    def test_inner_error_survives_all_cleanup_errors_and_failed_result_is_published(self):
        class Resource:
            def __init__(self, name: str):
                self.name = name
                self.closed = False

            def close(self):
                self.closed = True
                if self.name == "browser":
                    raise RuntimeError("Event loop is closed")

        class Playwright:
            stopped = False

            def stop(self):
                self.stopped = True
                raise RuntimeError("Playwright shutdown failed")

        context = Resource("context")
        browser = Resource("browser")
        playwright = Playwright()
        original = AssertionError("save action failed")
        result = {"status": "FAILED", "error": f"{type(original).__name__}: {original}",
                  "sourceBefore": {"sourceFingerprint": "source-fingerprint"},
                  "startUTC": "2026-10-07T00:00:00+00:00"}

        cleanup_error = pilot.close_playwright_resources(
            context, browser, playwright, result, primary_error=original)
        self.assertIsNone(cleanup_error)
        self.assertTrue(context.closed)
        self.assertTrue(browser.closed)
        self.assertTrue(playwright.stopped)
        self.assertEqual(result["error"], "AssertionError: save action failed")
        self.assertEqual(result["browserCleanupErrors"], [
            "RuntimeError: Event loop is closed",
            "RuntimeError: Playwright shutdown failed",
        ])

        published = []
        with patch.object(pilot, "provenance", return_value={"sourceFingerprint": "source-fingerprint"}), \
             patch.object(pilot, "record", side_effect=lambda path, payload: published.append((path, payload))), \
             patch("builtins.print"):
            exit_code = pilot.finalize_result(result, Path("run"))

        self.assertEqual(exit_code, 1)
        self.assertEqual(result["status"], "FAILED")
        self.assertTrue(result["sourceStableDuringRun"])
        self.assertEqual(result["sourceAfter"]["sourceFingerprint"], "source-fingerprint")
        self.assertEqual(len(published), 1)
        self.assertEqual(published[0][0], Path("run") / "pilot-result.json")
        self.assertEqual(published[0][1]["error"], "AssertionError: save action failed")


class LegalNavigationPathTests(unittest.TestCase):
    def test_route_includes_start_and_ends_at_a_legal_adjacent_target(self):
        legal_tiles = {(0, 0), (1, 0), (2, 0), (2, 1), (2, 2)}
        tiles = {position: {"walkable": True} for position in legal_tiles}
        start = (0, 0)
        targets = [(2, 1)]

        path = pilot.shortest_path(tiles, start, targets)

        self.assertEqual(path[0], start)
        self.assertIn(path[-1], targets)
        self.assertEqual(len(path) - 1, 3)
        self.assertTrue(all(position in legal_tiles for position in path))
        self.assertTrue(all(abs(left[0] - right[0]) + abs(left[1] - right[1]) == 1
                            for left, right in zip(path, path[1:])))


@unittest.skipUnless(Path("/usr/bin/chromium").is_file()
                     and (pilot.ROOT / "dist/index.html").is_file(),
                     "requires the repository Chromium and frozen production build")
class FreshContextGuardBrowserTests(unittest.TestCase):
    def test_guard_observes_empty_context_before_the_app_saves_its_native_opening_baseline(self):
        with tempfile.TemporaryDirectory(prefix="phase5-c-guard-") as temp_dir:
            run_dir = Path(temp_dir)
            port = pilot.allocate_port()
            url = f"http://127.0.0.1:{port}"
            server, server_log = pilot.new_server(port, run_dir)
            playwright = None
            browser = None
            context = None
            page_errors = []
            console_errors = []
            result = {}
            try:
                deadline = time.monotonic() + 10
                last_error = None
                while time.monotonic() < deadline:
                    if server.poll() is not None:
                        self.fail(f"owned test server exited with {server.returncode}")
                    try:
                        assets = pilot.verify_http_assets(url)
                        break
                    except Exception as error:
                        last_error = error
                        time.sleep(.05)
                else:
                    self.fail(f"owned test server did not become ready: {last_error}")
                self.assertEqual(assets["favicon"], {"path": "/favicon.ico", "status": 204, "bytes": 0})

                playwright = sync_playwright().start()
                browser = playwright.chromium.launch(
                    executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
                context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
                page = context.new_page()
                pilot.attach_error_capture(page)
                page.on("pageerror", lambda error: page_errors.append(str(error)))
                page.on("console", lambda message: console_errors.append(message.text)
                        if message.type == "error" else None)
                page.goto(url, wait_until="domcontentloaded")

                observation = page.evaluate("window.__qaPreAppSaveObservation || null")
                self.assertIsNotNone(
                    observation,
                    "the pre-app init script must capture the isolated context before application scripts run")
                self.assertEqual(observation["documentReadyState"], "loading")
                self.assertFalse(observation["savePresent"], "the new browser context must be empty before app startup")

                start_button = page.get_by_role("button", name="起身", exact=True)
                pilot.expect(start_button).to_be_enabled(timeout=15000)
                opening_state = json.loads(page.evaluate("localStorage.getItem('oakvale-v1')"))
                self.assertEqual(pilot.validate_native_opening_baseline(opening_state, opening_seen=False), {
                    "openingSeen": False, "worldTime": 480, "eventSequence": 1, "gold": 45,
                    "stamina": 84, "wood": 0, "stone": 0, "instanceCount": 0,
                })
                qa_result = {"checkpoints": [], "uiLatencyMs": []}
                qa_pilot = pilot.Pilot(page, run_dir, qa_result)
                qa_pilot.action(start_button, "start a normal fresh life for route smoke")
                page.wait_for_selector(".world-map", timeout=15000)
                pause = page.get_by_role("button", name="暫停", exact=True)
                if pause.get_attribute("aria-pressed") != "true":
                    qa_pilot.action(pause, "pause before the legal navigation route")
                qa_pilot.route_to_near_store()
                routed_state = qa_pilot.state()
                routed_actor = pilot.Pilot.actor(routed_state)
                store = next(tile for tile in routed_state["tiles"] if tile.get("building") == "store")
                self.assertLessEqual(abs(routed_actor["position"]["x"] - store["x"])
                                     + abs(routed_actor["position"]["y"] - store["y"]), 1)
                inventory_trigger = page.get_by_role("button", name="物品 I", exact=True)
                qa_pilot.action(inventory_trigger, "open the real inventory dialog before saving")
                inventory_dialog = page.locator("dialog.pixel-window")
                pilot.expect(inventory_dialog).to_be_visible()
                qa_pilot.action(
                    inventory_dialog.get_by_role("button", name="關閉視窗", exact=True),
                    "close the real inventory dialog through its visible close control")
                pilot.expect(inventory_dialog).to_be_hidden()
                save_button = page.locator(".save-button")
                pilot.expect(save_button).to_be_visible()
                qa_pilot.action(save_button, "save through the visible game control after closing inventory")
                self.assertEqual(page_errors, [])
                self.assertEqual(console_errors, [])
            finally:
                primary_error = sys.exc_info()[1]
                cleanup_error = pilot.close_playwright_resources(
                    context, browser, playwright, result, primary_error=primary_error)
                if cleanup_error is not None:
                    self.fail(str(cleanup_error))
                server_cleanup_error = pilot.close_owned_server(
                    server, server_log, result, primary_error=primary_error)
                if server_cleanup_error is not None:
                    self.fail(str(server_cleanup_error))


if __name__ == "__main__":
    unittest.main()
