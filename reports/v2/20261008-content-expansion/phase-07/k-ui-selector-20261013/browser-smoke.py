#!/usr/bin/env python3
"""Controlled, isolated Chromium selector/accessibility smoke for Phase 7-I."""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
import sys

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[5]
PHASE = ROOT / "reports/v2/20261008-content-expansion/phase-07"
ARTIFACTS = PHASE / "k-ui-selector-20261013"
FIXTURES = ARTIFACTS / "fixtures"
RUNS = ARTIFACTS / "runs"
BUILD_PATH = PHASE / "qa-browser-preparation/phase7-build-status.json"
RELEASE_PATH = PHASE / "qa-browser-preparation/phase7-browser-release.json"
SUPPORT = PHASE / "qa_browser_support.py"
LAUNCHER = PHASE / "qa_browser_launcher.py"
DRIVER = PHASE / "qa_browser_runner.py"
INVENTORY_TRIGGER_NAME = re.compile(r"^物品(?:\s|$)")
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(PHASE))

from qa_browser_support import now_utc, provenance, sha_file, validate_build, verify_http_dist
from scripts.recorded_reports import write_recorded


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def make_server():
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT / "dist"), **kwargs)

        def do_GET(self):
            if self.path.split("?", 1)[0] == "/favicon.ico":
                self.send_response(204)
                self.end_headers()
            else:
                super().do_GET()

        def do_HEAD(self):
            if self.path.split("?", 1)[0] == "/favicon.ico":
                self.send_response(204)
                self.end_headers()
            else:
                super().do_HEAD()

        def log_message(self, *_args):
            return

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{server.server_port}"


def close_playwright_resources(browser, playwright, status):
    """Close Chromium before stopping its Playwright event loop.

    Cleanup exceptions are evidence, not replacements for selector check results.
    """
    if browser is not None:
        try:
            browser.close()
        except Exception as exc:
            status.setdefault("cleanupErrors", []).append(
                f"browser.close: {type(exc).__name__}: {exc}")
    if playwright is not None:
        try:
            playwright.stop()
        except Exception as exc:
            status.setdefault("cleanupErrors", []).append(
                f"playwright.stop: {type(exc).__name__}: {exc}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", default=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    args = parser.parse_args()
    run_dir = RUNS / args.run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    (run_dir / "screenshots").mkdir()

    status: dict[str, Any] = {
        "schema": "phase7-controlled-ui-selector-smoke-v1",
        "runId": args.run_id,
        "status": "PREFLIGHT",
        "startedAtUTC": now_utc(),
        "browserErrors": [],
        "unhandledRejections": [],
        "checks": [],
        "limitations": [
            "Controlled save fixtures are serializer-validated and loaded only into isolated contexts.",
            "This smoke is not natural reachability evidence, an Agent Exploratory session, or human play.",
            "Native Safari and physical-device testing are excluded.",
        ],
    }
    server = None
    browser = None
    playwright = None
    code = 1
    try:
        release = load_json(RELEASE_PATH)
        build = validate_build(ROOT, BUILD_PATH)
        before = provenance(ROOT, BUILD_PATH, [LAUNCHER, DRIVER, SUPPORT])
        status.update({"head": before["head"], "sourceFingerprint": before["sourceFingerprint"],
                       "buildStatusSha256": before["buildStatusSha256"], "distFingerprint": before["distFingerprint"],
                       "releaseSha256": sha_file(RELEASE_PATH), "build": build,
                       "python": os.sys.version.split()[0]})
        expected_release = {"head": before["head"], "sourceFingerprint": before["sourceFingerprint"],
                            "buildStatusSha256": before["buildStatusSha256"], "distFingerprint": before["distFingerprint"]}
        mismatches = {key: {"release": release.get(key), "current": value}
                      for key, value in expected_release.items() if release.get(key) != value}
        if release.get("status") != "RELEASED" or mismatches:
            raise RuntimeError(f"Frozen build/release mismatch: status={release.get('status')} mismatches={mismatches}")

        server, url = make_server()
        served = verify_http_dist(ROOT, url, build)
        status["url"] = url
        status["servedAssets"] = served
        status["status"] = "RUNNING"
        failures: list[dict[str, Any]] = []
        playwright = sync_playwright().start()
        try:
            browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
            status["browser"] = {"name": "Chromium", "version": browser.version, "headless": True}

            def check(name: str, passed: bool, evidence: Any = None, message: str | None = None):
                row = {"name": name, "status": "PASS" if passed else "FAIL", "evidence": evidence}
                if message:
                    row["message"] = message
                status["checks"].append(row)
                if not passed:
                    failures.append(row)

            def new_page(fixture: str, viewport=(1280, 900)):
                context = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]}, reduced_motion="reduce")
                page = context.new_page()
                page.on("pageerror", lambda error: status["browserErrors"].append({"kind": "pageerror", "detail": str(error), "atUTC": now_utc()}))
                page.on("console", lambda message: status["browserErrors"].append({"kind": "console.error", "detail": message.text, "atUTC": now_utc()}) if message.type == "error" else None)
                page.on("requestfailed", lambda request: status["browserErrors"].append({"kind": "requestfailed", "detail": {"url": request.url, "error": request.failure}, "atUTC": now_utc()}))
                page.expose_binding("__recordUiUnhandled", lambda _source, reason: status["unhandledRejections"].append({"detail": str(reason), "atUTC": now_utc()}))
                raw = load_json(FIXTURES / f"{fixture}.json")["raw"]
                encoded = base64.b64encode(raw.encode()).decode()
                page.add_init_script(f"localStorage.setItem('oakvale-v1', atob('{encoded}'))")
                page.add_init_script("addEventListener('unhandledrejection', e => { window.__recordUiUnhandled(String(e.reason)); })")
                page.goto(url + "/", wait_until="domcontentloaded", timeout=30000)
                expect(page.locator(".game-shell")).to_be_visible(timeout=15000)
                page.wait_for_function("() => JSON.parse(localStorage.getItem('oakvale-v1') || '{}').saveVersion === 8", timeout=15000)
                return context, page

            def close_dialog(page):
                close = page.locator("dialog[open] button.window-close")
                if close.count():
                    close.first.click()
                    expect(page.locator("dialog[open]")).to_have_count(0, timeout=5000)

            def open_place(page):
                page.locator(".context-prompt .context-action").click()
                expect(page.locator("dialog.pixel-window[open]")).to_have_count(1, timeout=5000)

            def is_visible(locator) -> bool:
                try:
                    return locator.count() > 0 and locator.first.is_visible()
                except Exception:
                    return False

            # Inventory: active-idle clock, open/close focus restoration, search/filter/page/sale clamp.
            context, page = new_page("inventory-gear")
            try:
                trigger = page.get_by_role("button", name=INVENTORY_TRIGGER_NAME).last
                before_time = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).worldTime")
                trigger.click()
                dialog = page.locator("dialog.pixel-window[open]")
                expect(dialog).to_be_visible()
                page.wait_for_function("before => JSON.parse(localStorage.getItem('oakvale-v1')).worldTime > before", arg=before_time, timeout=7000)
                after_time = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).worldTime")
                check("inventory-window-world-clock-continues", after_time > before_time,
                      {"before": before_time, "after": after_time, "deltaMinutes": after_time - before_time})
                close_dialog(page)
                check("inventory-trigger-focus-restored", page.evaluate("() => document.activeElement?.textContent?.includes('物品') === true"),
                      page.evaluate("() => ({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim()})"))
                page.get_by_role("button", name="暫停", exact=True).click()
                page.keyboard.press("i")
                dialog = page.locator("dialog.pixel-window[open]")
                expect(dialog).to_be_visible()
                page.get_by_role("button", name="獵獲裝備", exact=True).click()
                total_text = page.locator('[data-content-result-count="gear"]').inner_text()
                visible_items = page.locator("[data-instance-id]").count()
                check("gear-more-than-20-paged", visible_items == 20 and "21 件" in total_text,
                      {"visiblePageInstances": visible_items, "resultCount": total_text})

                gear_tab = page.get_by_role("button", name="獵獲裝備", exact=True)
                gear_tab.focus()
                for _ in range(32):
                    page.keyboard.press("Tab")
                    if page.evaluate("() => document.activeElement?.matches('input[data-content-search=gear]')"):
                        break
                search_keyboard_reached = page.evaluate("() => document.activeElement?.matches('input[data-content-search=gear]') === true")
                check("gear-search-reachable-by-keyboard-tab", search_keyboard_reached,
                      page.evaluate("() => ({activeTag:document.activeElement?.tagName,activeText:document.activeElement?.textContent?.trim(),activeLabel:document.activeElement?.getAttribute('aria-label')})"),
                      None if search_keyboard_reached else "Tab traversal skips the visible search input inside PixelWindow.")

                search = page.locator('input[data-content-search="gear"]')
                search.fill("短劍")
                check("gear-search-found", page.locator('[data-content-empty="no-results"]').count() == 0 and page.locator("[data-instance-id]").count() > 0,
                      {"visibleInstances": page.locator("[data-instance-id]").count(), "resultCount": page.locator('[data-content-result-count="gear"]').inner_text()})
                search.fill("完全沒有的裝備")
                check("gear-search-no-match", is_visible(page.locator('[data-content-empty="no-results"]')),
                      page.locator('[data-content-empty="no-results"]').inner_text() if page.locator('[data-content-empty="no-results"]').count() else None)
                page.locator("[data-content-search-clear]").click()
                check("gear-search-clear-returns-focus", page.evaluate("() => document.activeElement?.matches('input[data-content-search=gear]') === true"),
                      page.evaluate("() => ({activeTag:document.activeElement?.tagName,id:document.activeElement?.id})"))

                page.locator(".gear-pagination").get_by_role("button", name="下一頁", exact=True).click()
                page.get_by_role("button", name="防具", exact=True).click()
                page_label = page.locator(".gear-pagination").inner_text()
                check("gear-filter-resets-and-clamps-page", "第 1／1 頁" in page_label and page.locator("[data-instance-id]").count() == 1,
                      {"page": page_label, "items": page.locator("[data-instance-id]").count()})
                page.get_by_role("button", name="全部", exact=True).click()
                page.locator(".gear-pagination").get_by_role("button", name="下一頁", exact=True).click()
                page.locator("[data-instance-id]").click()
                page.get_by_role("button", name=__import__("re").compile(r"^出售 \d+ 金$")).click()
                page.get_by_role("button", name="確認出售這件裝備", exact=True).click()
                clamped = page.locator(".gear-pagination").inner_text()
                check("gear-ownership-change-page-clamp", "第 1／1 頁" in clamped and page.locator("[data-instance-id]").count() == 20,
                      {"page": clamped, "instances": page.locator("[data-instance-id]").count(),
                       "savedInstances": len(page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).reward.instances"))})
                page.set_viewport_size({"width": 360, "height": 740})
                await_body = page.locator(".window-body")
                layout = page.evaluate("() => ({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyClient:document.querySelector('.window-body').clientHeight,bodyScroll:document.querySelector('.window-body').scrollHeight,bodyOverflow:getComputedStyle(document.querySelector('.window-body')).overflowY})")
                check("narrow-window-reflow-and-scroll", layout["documentWidth"] <= 360 and layout["bodyScroll"] > layout["bodyClient"] and layout["bodyOverflow"] in ("auto", "scroll"), layout)
                page.screenshot(path=str(run_dir / "screenshots/inventory-gear-360.png"), full_page=True)
            except Exception as exc:
                check("inventory-selector-flow", False, None, f"{type(exc).__name__}: {exc}")
                try:
                    page.screenshot(path=str(run_dir / "screenshots/inventory-error.png"), full_page=True)
                except Exception:
                    pass
            finally:
                context.close()

            # Material knowledge: known, blocked and undiscovered information remain distinct.
            context, page = new_page("inventory-material-sources", viewport=(360, 740))
            try:
                page.keyboard.press("i")
                page.get_by_role("button", name="素材與收成", exact=True).click()
                known_sources = page.locator('[data-content-source="wolfFang"]')
                blocked_sources = page.locator('[data-content-source="wolfFang"][data-content-source-state="ineligible"]')
                hidden_source = page.locator('[data-content-source="fog_undead_bone"][data-content-source-state="undiscovered"]')
                check("material-multiple-sources-with-eligibility", known_sources.count() >= 2 and blocked_sources.count() >= 1,
                      {"wolfFangSourceCount": known_sources.count(), "ineligibleCount": blocked_sources.count(),
                       "labels": known_sources.all_inner_texts()})
                check("material-unknown-region-is-not-disclosed", hidden_source.count() == 1 and "尚未探索的區域" in hidden_source.inner_text()
                      and "迷霧山谷" not in hidden_source.inner_text(), hidden_source.inner_text() if hidden_source.count() else None)
                search = page.locator('input[data-content-search="material"]')
                search.fill("狼牙")
                check("material-search-found", page.locator('[data-material-group]').count() == 1,
                      {"entry": page.locator('[data-material-group]').first.inner_text()[:500] if page.locator('[data-material-group]').count() else None})
                search.fill("不存在的素材名稱")
                check("material-search-no-match", is_visible(page.locator('[data-content-empty="no-results"]')))
                page.locator("[data-content-search-clear]").click()
                check("material-clear-returns-focus", page.evaluate("() => document.activeElement?.matches('input[data-content-search=material]') === true"))
                layout = page.evaluate("() => ({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyClient:document.querySelector('.window-body').clientHeight,bodyScroll:document.querySelector('.window-body').scrollHeight,bodyOverflow:getComputedStyle(document.querySelector('.window-body')).overflowY})")
                check("material-360px-reflow", layout["documentWidth"] <= 360, layout)
                page.screenshot(path=str(run_dir / "screenshots/material-knowledge-360.png"), full_page=True)
            except Exception as exc:
                check("material-knowledge-flow", False, None, f"{type(exc).__name__}: {exc}")
            finally:
                context.close()

            # Recipe search, exact canonical rejection copy, satisfied craft action and save-visible output.
            for fixture, label in (("recipe-missing", "missing"), ("recipe-satisfied", "satisfied")):
                context, page = new_page(fixture)
                try:
                    open_place(page)
                    starter_spear = page.locator('[data-craft-recipe="starterSpear"]')
                    expect(starter_spear, "starterSpear recipe button must render exactly once").to_have_count(1, timeout=10000)
                    search = page.locator('input[data-content-search="recipe"]')
                    search.fill("木石長矛")
                    selected_recipe = page.locator("[data-craft-recipe]")
                    check(f"recipe-search-found-{label}", selected_recipe.count() == 1
                          and selected_recipe.get_attribute("data-craft-recipe") == "starterSpear",
                          {"recipeId": selected_recipe.get_attribute("data-craft-recipe") if selected_recipe.count() else None,
                           "labels": selected_recipe.all_inner_texts()})
                    search.fill("完全不存在配方")
                    check(f"recipe-search-no-match-{label}", is_visible(page.locator('[data-content-empty="no-results"]')))
                    page.locator("[data-content-search-clear]").click()
                    check(f"recipe-search-clear-focus-{label}", page.evaluate("() => document.activeElement?.matches('input[data-content-search=recipe]') === true"))
                    warning = page.locator(".crafting-workbench .inline-warning[role=status]")
                    submit = page.locator("[data-craft-submit]")
                    expectation = load_json(FIXTURES / f"{fixture}-expectation.json")
                    if label == "missing":
                        check("recipe-missing-input-exact-rejection", warning.count() == 1 and warning.inner_text() == expectation["message"] and submit.is_disabled(),
                              {"expected": expectation["message"], "actual": warning.inner_text() if warning.count() else None, "disabled": submit.is_disabled()})
                    else:
                        check("recipe-satisfied-input-accepted", warning.count() == 0 and submit.is_enabled(),
                              {"warningCount": warning.count(), "enabled": submit.is_enabled()})
                        submit.click()
                        check("recipe-craft-result-visible", is_visible(page.locator("[data-craft-result]")),
                              page.locator("[data-craft-result]").inner_text() if page.locator("[data-craft-result]").count() else None)
                    page.set_viewport_size({"width": 360, "height": 740})
                    layout = page.evaluate("() => ({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyClient:document.querySelector('.window-body').clientHeight,bodyScroll:document.querySelector('.window-body').scrollHeight,bodyOverflow:getComputedStyle(document.querySelector('.window-body')).overflowY})")
                    check(f"recipe-long-label-360px-{label}", layout["documentWidth"] <= 360 and layout["bodyScroll"] > layout["bodyClient"] and layout["bodyOverflow"] in ("auto", "scroll"), layout)
                    page.screenshot(path=str(run_dir / f"screenshots/recipe-{label}-360.png"), full_page=True)
                except Exception as exc:
                    check(f"recipe-flow-{label}", False, None, f"{type(exc).__name__}: {exc}")
                    try:
                        page.screenshot(path=str(run_dir / f"screenshots/recipe-{label}-error.png"), full_page=True)
                    except Exception:
                        pass
                finally:
                    context.close()

            # Farm: all canonical spring status reasons and a complete visible crop lifecycle under x20.
            context, page = new_page("farm-spring-ready")
            try:
                open_place(page)
                expect(page.locator('[data-crop-choice="spring_pea"]')).to_be_visible()
                season_count = page.locator('[data-crop-state="season"]').count()
                check("crop-available-and-season-reasons", page.locator('[data-crop-choice][data-crop-state="available"]').count() >= 2
                      and season_count >= 1, {"available": page.locator('[data-crop-choice][data-crop-state="available"]').count(),
                                             "seasonUnavailable": season_count,
                                             "copy": page.locator('[data-crop-state="season"]').all_inner_texts()})
                page.locator('[data-crop-choice="spring_pea"]').click()
                page.get_by_role("button", name=__import__("re").compile(r"^播種豌豆")).click()
                planted = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).crops.map(c => ({cropId:c.cropId,status:c.status,matureAt:c.matureAt}))")
                check("crop-planted-through-visible-action", any(crop["cropId"] == "spring_pea" for crop in planted), planted)
                close_dialog(page)
                page.get_by_role("button", name="×20", exact=True).click()
                page.locator(".context-prompt .context-action").click()
                expect(page.locator("dialog[open]")).to_be_visible()
                page.wait_for_function("() => {const save=JSON.parse(localStorage.getItem('oakvale-v1')||'{}');return save.crops?.some(c=>c.cropId==='spring_pea'&&c.status==='mature')}", timeout=120000)
                mature = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).crops.map(c => ({cropId:c.cropId,status:c.status,matureAt:c.matureAt,worldTime:JSON.parse(localStorage.getItem('oakvale-v1')).worldTime}))")
                check("crop-matures-through-x20-world-runtime", any(crop["cropId"] == "spring_pea" and crop["status"] == "mature" for crop in mature), mature)
                harvest = page.get_by_role("button", name=__import__("re").compile(r"^收割"))
                check("crop-harvest-available", harvest.is_enabled(), harvest.get_attribute("disabled"))
                harvest.click()
                save = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
                crop_stack = save.get("reward", {}).get("materials", {}).get(save["activeCharacterId"], {}).get("spring_pea_good", 0)
                check("crop-good-owned-after-ui-harvest", crop_stack >= 1, {"cropGoodStack": crop_stack, "remainingCrops": save["crops"]})
                page.screenshot(path=str(run_dir / "screenshots/farm-harvest.png"), full_page=True)
            except Exception as exc:
                check("farm-spring-lifecycle", False, None, f"{type(exc).__name__}: {exc}")
                try:
                    page.screenshot(path=str(run_dir / "screenshots/farm-error.png"), full_page=True)
                except Exception:
                    pass
            finally:
                context.close()

            for fixture, expected_state in (("farm-capacity", "capacity"), ("farm-region-guidance", "region")):
                context, page = new_page(fixture, viewport=(360, 740))
                try:
                    open_place(page)
                    locator = page.locator(f'[data-crop-state="{expected_state}"]')
                    check(f"crop-{expected_state}-guidance", locator.count() >= 1,
                          locator.all_inner_texts())
                    layout = page.evaluate("() => ({width:innerWidth,documentWidth:document.documentElement.scrollWidth})")
                    check(f"crop-{expected_state}-360px", layout["documentWidth"] <= 360, layout)
                    page.screenshot(path=str(run_dir / f"screenshots/farm-{expected_state}-360.png"), full_page=True)
                except Exception as exc:
                    check(f"crop-{expected_state}-flow", False, None, f"{type(exc).__name__}: {exc}")
                finally:
                    context.close()

            # Current-region monsters/ranks and separate canonical Boss cue.
            context, page = new_page("forest-content-list")
            try:
                open_place(page)
                rows = page.locator("[data-content-monster]")
                total = rows.count()
                page.get_by_role("button", name="首領", exact=True).click()
                boss_rows = page.locator('[data-content-monster][data-content-rank="boss"]')
                check("monster-list-current-region-and-boss-rank", total == 28 and boss_rows.count() >= 1 and rows.count() == boss_rows.count(),
                      {"currentRegion": "forest", "initialRows": total, "bossRowsAfterRankFilter": boss_rows.count(),
                       "bossLabels": boss_rows.all_inner_texts()})
                search = page.locator('input[data-content-search="monster"]')
                search.fill("完全不存在的蹤跡")
                check("monster-search-no-match", is_visible(page.locator('[data-content-empty="no-results"]')))
                page.locator("[data-content-search-clear]").click()
                check("monster-search-clear-focus", page.evaluate("() => document.activeElement?.matches('input[data-content-search=monster]') === true"))
                page.screenshot(path=str(run_dir / "screenshots/monster-rank-forest.png"), full_page=True)
            except Exception as exc:
                check("monster-current-region-flow", False, None, f"{type(exc).__name__}: {exc}")
            finally:
                context.close()

            context, page = new_page("boss-cue")
            try:
                expect(page.locator("dialog[open]")).to_be_visible()
                cue = page.locator("[data-content-boss-warning]")
                check("boss-rank-and-live-turn-cue", is_visible(cue) and "戰帥" in cue.inner_text(),
                      {"visibleCue": cue.inner_text() if cue.count() else None,
                       "bossHeading": page.locator(".battle-scene h3").inner_text() if page.locator(".battle-scene h3").count() else None,
                       "fixture": load_json(FIXTURES / "boss-cue-expectation.json")})
                page.keyboard.press("Tab")
                trapped = page.evaluate("() => !!document.activeElement?.closest('dialog[open]')")
                check("dialog-focus-stays-in-window", trapped,
                      page.evaluate("() => ({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim()})"))
                page.screenshot(path=str(run_dir / "screenshots/boss-turn-cue.png"), full_page=True)
            except Exception as exc:
                check("boss-cue-flow", False, None, f"{type(exc).__name__}: {exc}")
            finally:
                context.close()

            check("page-unhandled-rejections-empty", not status["unhandledRejections"], status["unhandledRejections"])
            status["completedAtUTC"] = now_utc()
            status["status"] = "PASS" if not failures and not status["browserErrors"] and not status["unhandledRejections"] else "FAIL"
            status["failedCheckCount"] = len(failures)
            status["passedCheckCount"] = sum(row["status"] == "PASS" for row in status["checks"])
        finally:
            close_playwright_resources(browser, playwright, status)
            browser = None
            playwright = None
        code = 0 if status["status"] == "PASS" else 1
    except Exception as exc:
        status["status"] = "FAILED_PREFLIGHT_OR_RUNNER"
        status["error"] = f"{type(exc).__name__}: {exc}"
        status["completedAtUTC"] = now_utc()
    finally:
        if status.get("cleanupErrors") and status.get("status") == "PASS":
            status["status"] = "FAIL"
            code = 1
        if server is not None:
            try:
                server.shutdown()
            except Exception as exc:
                status.setdefault("cleanupErrors", []).append(
                    f"server.shutdown: {type(exc).__name__}: {exc}")
            try:
                server.server_close()
            except Exception as exc:
                status.setdefault("cleanupErrors", []).append(
                    f"server.server_close: {type(exc).__name__}: {exc}")
        status["completedAtUTC"] = status.get("completedAtUTC", now_utc())
        try:
            after = provenance(ROOT, BUILD_PATH, [LAUNCHER, DRIVER, SUPPORT])
            status["sourceStableDuringRun"] = status.get("head") == after["head"] and status.get("sourceFingerprint") == after["sourceFingerprint"] and status.get("distFingerprint") == after["distFingerprint"]
            status["sourceAfter"] = {"head": after["head"], "sourceFingerprint": after["sourceFingerprint"],
                                      "distFingerprint": after["distFingerprint"]}
            if not status["sourceStableDuringRun"]:
                status["status"] = "FAILED_PROVENANCE_CHANGED"
                code = 1
        except Exception as exc:
            status["provenanceError"] = str(exc)
            status["status"] = "FAILED_PROVENANCE_CHECK"
            code = 1
        status["exitCode"] = code
        body = json.dumps(status, ensure_ascii=False, indent=2) + "\n"
        write_recorded(run_dir / "status.json", body, producer="g6-luna-low-phase7-ui-selector-smoke")
        print(body, flush=True)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
