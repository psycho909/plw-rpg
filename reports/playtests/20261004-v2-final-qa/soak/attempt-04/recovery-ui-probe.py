#!/usr/bin/env python3
"""Supplemental fresh-profile UI save/export probe for attempt-04 diagnosis.

This does not restore or replace attempt-04's deleted Chromium profile. It uses
one new isolated profile and writes a separate, explicitly labeled artifact.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:5195/"
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded  # noqa: E402


def page_rows(context):
    return [{"url": page.url, "title": page.title()} for page in context.pages]


def app_pages(context):
    return [page for page in context.pages if page.url.startswith(URL)]


def game_identity(page):
    return page.evaluate("""() => {
      const state = JSON.parse(localStorage.getItem('oakvale-v1') || 'null');
      return state ? {
        worldId: state.playJournal?.worldId ?? null,
        worldTime: state.worldTime ?? null,
        activeCharacterId: state.activeCharacterId ?? null,
      } : null;
    }""")


def main() -> None:
    profile = Path(tempfile.mkdtemp(prefix="plw-rpg-attempt04-ui-probe-"))
    report = {
        "evidenceKind": "supplemental fresh-profile normal-UI save/export probe",
        "originalAttempt04Profile": "/tmp/plw-rpg-qa-20261004-soak-profile-fay6q2ya",
        "originalAttempt04ProfileExists": Path(
            "/tmp/plw-rpg-qa-20261004-soak-profile-fay6q2ya"
        ).exists(),
        "url": URL,
        "freshProfilePath": str(profile),
        "pageAuditBeforeNavigation": [],
        "pageAuditAfterNavigation": [],
        "pageAuditBeforeExport": [],
        "onlyOneAppPageBeforeInteractions": False,
        "openingUiCompleted": False,
        "savedViaUi": False,
        "exportButtonVisible": False,
        "downloadCompleted": False,
    }
    export_path = OUT / "recovery-ui-probe-retry2-export.json"
    try:
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(
                user_data_dir=str(profile),
                executable_path="/usr/bin/chromium",
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
                viewport={"width": 1366, "height": 900},
            )
            try:
                before = page_rows(context)
                report["pageAuditBeforeNavigation"] = before
                if len(context.pages) != 1 or context.pages[0].url not in (
                    "about:blank",
                    "chrome://newtab/",
                ):
                    raise RuntimeError(
                        f"refusing navigation: expected one fresh blank tab, got {before}"
                    )
                page = context.pages[0]
                page.goto(URL, wait_until="domcontentloaded", timeout=15000)
                page.locator(".game-shell").wait_for(state="visible", timeout=10000)
                after_navigation = page_rows(context)
                report["pageAuditAfterNavigation"] = after_navigation
                report["onlyOneAppPageBeforeInteractions"] = (
                    len(context.pages) == 1
                    and len(app_pages(context)) == 1
                    and context.pages[0] is page
                )
                if not report["onlyOneAppPageBeforeInteractions"]:
                    raise RuntimeError(
                        "refusing game actions: context does not contain exactly one app page"
                    )

                opening = page.get_by_role("button", name="起身", exact=True)
                if opening.count() and opening.first.is_visible():
                    opening.first.click(timeout=3000)
                    page.locator("dialog[open]").wait_for(state="detached", timeout=5000)
                report["openingUiCompleted"] = True

                pause = page.locator(".speed-controls").get_by_role(
                    "button", name="暫停", exact=True
                )
                if pause.get_attribute("aria-pressed") != "true":
                    pause.click(timeout=3000)
                before_save = game_identity(page)
                page.locator(".save-button").click(timeout=3000)
                page.evaluate(
                    "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
                )
                if page.locator(".save-warning").count():
                    raise RuntimeError("normal UI save displayed a save warning")
                after_save = game_identity(page)
                report["savedViaUi"] = after_save is not None
                report["gameBeforeUiSave"] = before_save
                report["gameAfterUiSave"] = after_save

                page.locator(".menu-trigger").click(timeout=3000)
                menu = page.locator(".pixel-menu")
                menu.wait_for(state="visible", timeout=5000)
                exact_button = menu.get_by_role(
                    "button", name="匯出遊玩紀錄", exact=True
                )
                report["visibleMenuButtonTexts"] = menu.locator("button").all_inner_texts()
                report["exactButtonMatchCount"] = exact_button.count()
                prefix_button = menu.get_by_role(
                    "button", name=re.compile(r"^匯出遊玩紀錄")
                )
                report["prefixRegexButtonMatchCount"] = prefix_button.count()
                button = menu.locator("button").filter(has_text="匯出遊玩紀錄")
                report["parentButtonTextMatchCount"] = button.count()
                report["pageAuditBeforeExport"] = page_rows(context)
                button.wait_for(state="visible", timeout=5000)
                report["exportButtonVisible"] = button.is_visible()
                report["pageAuditBeforeExport"] = page_rows(context)
                if len(context.pages) != 1 or len(app_pages(context)) != 1:
                    raise RuntimeError(
                        "refusing export: context no longer contains exactly one app page"
                    )
                menu.screenshot(path=str(OUT / "recovery-ui-probe-menu.png"))
                with page.expect_download(timeout=15000) as download_info:
                    button.click(timeout=5000)
                download = download_info.value
                download.save_as(str(export_path))
                data = json.loads(export_path.read_text(encoding="utf-8"))
                raw = export_path.read_bytes()
                records = [x for x in data.get("records", []) if isinstance(x, dict)]
                pending = [x for x in data.get("pending", []) if isinstance(x, dict)]
                report.update(
                    {
                        "downloadCompleted": True,
                        "downloadSuggestedFilename": download.suggested_filename,
                        "downloadBytes": len(raw),
                        "downloadSha256": hashlib.sha256(raw).hexdigest(),
                        "archiveAvailable": data.get("archiveAvailable"),
                        "exportedAt": data.get("exportedAt"),
                        "recordCount": len(records),
                        "pendingCount": len(pending),
                        "exportWorldId": (data.get("checkpoint") or {})
                        .get("playJournal", {})
                        .get("worldId"),
                        "gameAtExport": game_identity(page),
                        "pageAuditAfterExport": page_rows(context),
                        "separateFromOriginalSoak": True,
                    }
                )
            finally:
                context.close()
    except Exception as exc:
        report["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        import shutil

        shutil.rmtree(profile, ignore_errors=True)

    body = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    write_recorded(OUT / "recovery-ui-probe-retry2.json", body, producer="soak-recovery")
    if report.get("downloadCompleted") and export_path.exists():
        write_recorded(
            export_path,
            export_path.read_text(encoding="utf-8"),
            producer="soak-recovery",
        )
    print(body, end="")
    if not report.get("downloadCompleted"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
