"""Final-build Chromium pressure check for controlled population fixtures."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


OUT = Path(__file__).resolve().parent
REPO = OUT.parents[3]
URL = os.environ.get("PLW_WORLD_URL", "http://127.0.0.1:5192/")
ORIGIN = f"{urlsplit(URL).scheme}://{urlsplit(URL).netloc}"
KEY = "oakvale-v1"
PRODUCER = "deep-qa-world-browser"
WRITER = REPO / "scripts" / "recorded_reports.py"
RUN_ID = f"browser-population-{int(time.time())}"
RESULT = {
    "schemaVersion": 1,
    "runId": RUN_ID,
    "startedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "url": URL,
    "browser": {},
    "productionBuild": {},
    "checkpoints": [],
    "errors": [],
}


def publish(name: str, content: str | dict) -> None:
    body = content if isinstance(content, str) else json.dumps(content, ensure_ascii=False, indent=2) + "\n"
    completed = subprocess.run(
        ["python3", "-B", str(WRITER), "publish", str(OUT / name), "--producer", PRODUCER],
        cwd=REPO,
        input=body,
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode:
        raise RuntimeError(f"write_recorded failed for {name}: {completed.stderr or completed.returncode}")


def checkpoint(name: str, data: dict) -> None:
    RESULT["checkpoints"].append({"name": name, "recordedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), **data})
    publish("browser-population-results.json", RESULT)


def saved_state(page) -> dict:
    raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    if raw is None:
        raise AssertionError("localStorage save key is missing")
    return json.loads(raw)


def state_counts(state: dict) -> dict:
    alive_npcs = sum(1 for npc in state["npcs"] if npc["isAlive"])
    alive_characters = sum(1 for character in state["characters"] if character["isAlive"])
    return {
        "population": alive_npcs + alive_characters,
        "npcRows": len(state["npcs"]),
        "characterRows": len(state["characters"]),
        "activeCharacterId": state["activeCharacterId"],
        "activeCharacterAlive": next(c for c in state["characters"] if c["id"] == state["activeCharacterId"])["isAlive"],
        "worldTime": state["worldTime"],
        "capacity": state["settlement"]["capacity"],
        "stage": state["settlement"]["stage"],
        "pendingRecords": len(state.get("playJournal", {}).get("pending", [])),
        "historyLength": len(state["history"]),
        "eventSequence": state["eventSequence"],
    }


def browser_metrics(page) -> dict:
    return page.evaluate(
        """() => {
          const raw = localStorage.getItem('oakvale-v1') || '';
          const saved = raw ? JSON.parse(raw) : {};
          const memory = performance.memory;
          const alertText = [...document.querySelectorAll('[role=alert]')].map(x => x.innerText.trim()).filter(Boolean);
          return {
            worldTime: saved.worldTime ?? null,
            population: (saved.npcs || []).filter(n => n.isAlive).length + (saved.characters || []).filter(c => c.isAlive).length,
            npcRows: saved.npcs?.length ?? null,
            localStorageBytes: new TextEncoder().encode(raw).length,
            jsHeapUsedBytes: memory?.usedJSHeapSize ?? null,
            jsHeapTotalBytes: memory?.totalJSHeapSize ?? null,
            domNodeCount: document.getElementsByTagName('*').length,
            residentButtonCount: document.querySelectorAll('.people-list button').length,
            mapTileButtonCount: document.querySelectorAll('.overview-map button[data-position]').length,
            pendingRecords: saved.playJournal?.pending?.length ?? null,
            alertText,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
          };
        }"""
    )


def idb_record_count(page) -> int:
    return page.evaluate(
        """async () => {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('oakvale-play-journal', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error('IndexedDB open blocked'));
          });
          try {
            return await new Promise((resolve, reject) => {
              const tx = db.transaction('records', 'readonly');
              const request = tx.objectStore('records').count();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
              tx.onabort = () => reject(tx.error || new Error('IndexedDB count aborted'));
            });
          } finally { db.close(); }
        }"""
    )


def listen(page, errors: list[str], console_errors: list[str]) -> None:
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)


def assert_no_save_error(page) -> list[str]:
    warnings = [text.strip() for text in page.locator('[role="alert"]').all_text_contents() if text.strip()]
    bad = [text for text in warnings if "存檔失敗" in text or "原始存檔已保留" in text or "待補寫" in text or "尚未追加成功" in text]
    if bad:
        raise AssertionError(f"save/journal warning shown: {bad}")
    return warnings


def load_page(browser, fixture_raw: str, errors: list[str], console_errors: list[str], viewport=(1440, 1000)):
    context = browser.new_context(
        viewport={"width": viewport[0], "height": viewport[1]},
        accept_downloads=True,
        storage_state={
            "cookies": [],
            "origins": [{"origin": ORIGIN, "localStorage": [{"name": KEY, "value": fixture_raw}]}],
        },
    )
    page = context.new_page()
    page.set_default_timeout(15000)
    listen(page, errors, console_errors)
    response = page.goto(URL, wait_until="networkidle", timeout=30000)
    if response is None or response.status != 200:
        raise AssertionError(f"production page returned {response.status if response else 'no response'}")
    RESULT["productionBuild"]["servedStatus"] = response.status
    if page.locator(".successor-list").count():
        page.locator(".window-world-status").get_by_role("button", name="暫停時間", exact=True).click()
    else:
        page.get_by_role("button", name="暫停", exact=True).click()
    page.wait_for_timeout(250)
    return context, page


def run_overcapacity(browser, fixtures: dict) -> None:
    raw = (OUT / fixtures["file"]).read_text(encoding="utf-8")
    expected = json.loads(raw)
    errors: list[str] = []
    console_errors: list[str] = []
    context, page = load_page(browser, raw, errors, console_errors)
    try:
        assert_no_save_error(page)
        loaded = saved_state(page)
        counts = state_counts(loaded)
        assert counts["population"] == 1001 and counts["npcRows"] == 1000, counts
        assert loaded["settlement"]["capacity"] == 40, loaded["settlement"]
        assert loaded["activeCharacterId"] == expected["activeCharacterId"]
        assert page.locator(".save-warning").count() == 0
        checkpoint("overcapacity-loaded", {
            "fixture": fixtures["file"],
            "fixtureBytes": fixtures["bytes"],
            "fixtureSha256": fixtures["sha256"],
            "loaded": counts,
            "browser": browser_metrics(page),
            "indexedDbRecords": idb_record_count(page),
            "pageErrors": errors.copy(),
        })

        # Prime the modal's resume control to restore ×20 while a native modal dialog is open.
        page.get_by_role("button", name="×20", exact=True).click()
        page.get_by_role("button", name="暫停", exact=True).click()
        page.keyboard.press("m")
        page.get_by_role("button", name="居民", exact=True).click()
        resident_buttons = page.locator(".people-list button").count()
        assert resident_buttons == 1000, f"expected 1000 resident rows, rendered {resident_buttons}"
        people_metrics = browser_metrics(page)
        checkpoint("overcapacity-residents-modal", {
            "residentButtons": resident_buttons,
            "browser": people_metrics,
            "pageErrors": errors.copy(),
        })

        page.keyboard.press("Escape")
        page.keyboard.press("m")
        map_tiles = page.locator(".overview-map button[data-position]").count()
        assert map_tiles == 384, f"expected 384 map tiles, rendered {map_tiles}"
        map_metrics_before = browser_metrics(page)
        start_state = saved_state(page)
        start_world_time = start_state["worldTime"]
        page.evaluate(
            """() => {
              window.__populationPressureSamples = [];
              if (window.__populationPressureTimer) clearInterval(window.__populationPressureTimer);
              window.__populationPressureTimer = setInterval(() => {
                const raw = localStorage.getItem('oakvale-v1') || '';
                const state = raw ? JSON.parse(raw) : {};
                const memory = performance.memory;
                window.__populationPressureSamples.push({
                  at: Date.now(), worldTime: state.worldTime ?? null,
                  population: (state.npcs || []).filter(n => n.isAlive).length + (state.characters || []).filter(c => c.isAlive).length,
                  npcRows: state.npcs?.length ?? null,
                  localStorageBytes: new TextEncoder().encode(raw).length,
                  jsHeapUsedBytes: memory?.usedJSHeapSize ?? null,
                  domNodeCount: document.getElementsByTagName('*').length,
                  pendingRecords: state.playJournal?.pending?.length ?? null,
                });
              }, 1000);
            }"""
        )
        page.locator(".window-world-status").get_by_role("button", name="繼續時間", exact=True).click()
        started = time.monotonic()
        page.wait_for_timeout(30000)
        wall_seconds = time.monotonic() - started
        page.locator(".window-world-status").get_by_role("button", name="暫停時間", exact=True).click()
        page.wait_for_timeout(1500)
        samples = page.evaluate("window.__populationPressureSamples || []")
        end_metrics = browser_metrics(page)
        end_state = saved_state(page)
        assert wall_seconds >= 29, f"×20 interval was only {wall_seconds:.3f} seconds"
        assert end_state["worldTime"] > start_world_time, "×20 UI clock did not advance game time"
        assert end_state["npcs"] and len(end_state["npcs"]) == 1000, "high population rows changed unexpectedly"
        assert end_metrics["alertText"] == [], end_metrics["alertText"]
        assert errors == [], errors
        checkpoint("overcapacity-map-x20-30s", {
            "mapTiles": map_tiles,
            "wallSeconds": round(wall_seconds, 3),
            "gameMinutesAdvanced": end_state["worldTime"] - start_world_time,
            "expectedGameMinutesAtX20": round(wall_seconds * 40),
            "browserBefore": map_metrics_before,
            "browserAfter": end_metrics,
            "samples": samples,
            "indexedDbRecords": idb_record_count(page),
            "pageErrors": errors.copy(),
            "consoleErrors": console_errors.copy(),
        })

        page.keyboard.press("Escape")
        before_save = saved_state(page)
        page.locator(".save-button").click()
        saved_after_manual = saved_state(page)
        assert saved_after_manual["worldTime"] == before_save["worldTime"]
        assert saved_after_manual["npcs"] == before_save["npcs"]
        page.reload(wait_until="networkidle", timeout=30000)
        page.get_by_role("button", name="暫停", exact=True).click()
        reloaded = saved_state(page)
        reloaded_counts = state_counts(reloaded)
        assert reloaded_counts["population"] == 1001 and reloaded_counts["npcRows"] == 1000, reloaded_counts
        assert reloaded["worldTime"] == saved_after_manual["worldTime"]
        assert reloaded["eventSequence"] == saved_after_manual["eventSequence"]
        assert reloaded["activeCharacterId"] == saved_after_manual["activeCharacterId"]
        assert_no_save_error(page)
        assert page.locator(".save-warning").count() == 0
        page.keyboard.press("m")
        page.get_by_role("button", name="居民", exact=True).click()
        assert page.locator(".people-list button").count() == 1000
        page.keyboard.press("Escape")
        checkpoint("overcapacity-manual-save-reload", {
            "beforeSave": state_counts(before_save),
            "afterManualSave": state_counts(saved_after_manual),
            "afterReload": reloaded_counts,
            "browser": browser_metrics(page),
            "indexedDbRecords": idb_record_count(page),
            "pageErrors": errors.copy(),
        })

        page.locator(".menu-trigger").click()
        with page.expect_download(timeout=30000) as download_info:
            page.locator(".pixel-menu").get_by_role("button", name=re.compile("匯出遊玩紀錄")).click()
        download = download_info.value
        export_path = OUT / "population-export.json"
        download.save_as(export_path)
        export_raw = export_path.read_text(encoding="utf-8")
        exported = json.loads(export_raw)
        export_counts = state_counts(exported["checkpoint"])
        assert exported["archiveAvailable"] is True, exported
        assert export_counts["population"] == 1001 and export_counts["npcRows"] == 1000, export_counts
        assert export_counts["worldTime"] == reloaded["worldTime"]
        assert len(exported["records"]) > 0, "journal export contains no IndexedDB records"
        record_ids = [row["id"] for row in exported["records"]]
        assert len(record_ids) == len(set(record_ids)), "journal export contains duplicate record ids"
        publish("population-export.json", export_raw)
        checkpoint("overcapacity-export", {
            "downloadName": download.suggested_filename,
            "exportBytes": len(export_raw.encode("utf-8")),
            "exportSha256": hashlib.sha256(export_raw.encode("utf-8")).hexdigest(),
            "archiveAvailable": exported["archiveAvailable"],
            "exportedRecordCount": len(exported["records"]),
            "exportedPendingCount": len(exported["pending"]),
            "checkpoint": export_counts,
            "pageErrors": errors.copy(),
        })
        assert errors == [], errors
    finally:
        context.close()


def run_zero_population(browser, fixtures: dict) -> None:
    raw = (OUT / fixtures["file"]).read_text(encoding="utf-8")
    expected = json.loads(raw)
    errors: list[str] = []
    console_errors: list[str] = []
    context, page = load_page(browser, raw, errors, console_errors, viewport=(390, 844))
    try:
        initial = saved_state(page)
        initial_counts = state_counts(initial)
        assert initial_counts["population"] == 0 and initial_counts["activeCharacterAlive"] is False, initial_counts
        assert page.locator(".successor-list button").count() == 1
        wait_button = page.get_by_role("button", name="等待新居民抵達 · 15 日", exact=True)
        assert wait_button.count() == 1
        checkpoint("zero-population-no-heir", {
            "fixture": fixtures["file"],
            "fixtureSha256": fixtures["sha256"],
            "state": initial_counts,
            "waitButton": wait_button.inner_text(),
            "pageErrors": errors.copy(),
        })

        before_wait_time = initial["worldTime"]
        wait_button.click()
        page.wait_for_function(
            """() => {
              const state = JSON.parse(localStorage.getItem('oakvale-v1'));
              return state.worldTime >= 15 * 1440 && state.npcs.some(n => n.isAlive && n.age >= 15);
            }""",
            timeout=30000,
        )
        after_wait = saved_state(page)
        eligible = [npc for npc in after_wait["npcs"] if npc["isAlive"] and npc["age"] >= 15]
        assert eligible, "15-day public UI wait did not produce a legal adult successor"
        checkpoint("zero-population-ui-wait-15-days", {
            "beforeWorldTime": before_wait_time,
            "afterWorldTime": after_wait["worldTime"],
            "gameMinutesAdvanced": after_wait["worldTime"] - before_wait_time,
            "population": state_counts(after_wait)["population"],
            "eligibleHeirs": len(eligible),
            "candidateId": eligible[0]["id"],
            "pageErrors": errors.copy(),
        })

        chosen = eligible[0]
        candidate_button = page.locator(".successor-list button").filter(has_text=chosen["name"]).first
        candidate_button.click()
        page.wait_for_function(
            "candidateId => JSON.parse(localStorage.getItem('oakvale-v1')).activeCharacterId === candidateId",
            arg=chosen["id"],
            timeout=10000,
        )
        page.locator(".save-button").click()
        after_heir = saved_state(page)
        counts = state_counts(after_heir)
        ids = [row["id"] for row in after_heir["characters"] + after_heir["npcs"]]
        assert counts["activeCharacterId"] == chosen["id"] and counts["activeCharacterAlive"] is True, counts
        assert len(ids) == len(set(ids)), "duplicate NPC/character ID after browser succession"
        assert not any(npc["id"] == chosen["id"] for npc in after_heir["npcs"]), "heir remains duplicated in NPC table"
        assert any(c["id"] == chosen["id"] for c in after_heir["characters"]), "heir is missing from characters table"
        assert_no_save_error(page)
        page.reload(wait_until="networkidle", timeout=30000)
        page.get_by_role("button", name="暫停", exact=True).click()
        after_reload = saved_state(page)
        assert state_counts(after_reload)["activeCharacterId"] == chosen["id"]
        assert not any(npc["id"] == chosen["id"] for npc in after_reload["npcs"])
        assert len([c for c in after_reload["characters"] if c["id"] == chosen["id"]]) == 1
        assert_no_save_error(page)
        assert errors == [], errors
        checkpoint("zero-population-ui-successor-save-reload", {
            "selectedId": chosen["id"],
            "selectedName": chosen["name"],
            "afterSelection": counts,
            "afterReload": state_counts(after_reload),
            "indexedDbRecords": idb_record_count(page),
            "pageErrors": errors.copy(),
            "consoleErrors": console_errors.copy(),
        })
    finally:
        context.close()


def main() -> None:
    fixtures = json.loads((OUT / "browser-fixtures.json").read_text(encoding="utf-8"))
    overcapacity = next(row for row in fixtures["fixtures"] if row["file"] == "population-overcapacity-save.json")
    zero = next(row for row in fixtures["fixtures"] if row["file"] == "population-zero-save.json")
    index = (OUT.parents[3] / "dist" / "index.html").read_bytes()
    app_asset = re.search(rb'/assets/(index-[^" ]+\.js)', index)
    if app_asset is None:
        raise AssertionError("production index.html has no built JS asset")
    asset_name = app_asset.group(1).decode()
    asset_path = OUT.parents[3] / "dist" / "assets" / asset_name
    asset_bytes = asset_path.read_bytes()
    RESULT["productionBuild"] = {
        "indexHtmlSha256": hashlib.sha256(index).hexdigest(),
        "appAsset": asset_name,
        "appAssetSha256": hashlib.sha256(asset_bytes).hexdigest(),
        "assetBytes": len(asset_bytes),
        "servedStatus": None,
    }
    RESULT["fixtures"] = {"sourceCommit": fixtures["sourceCommit"], "sourceHashes": fixtures["sourceHashes"], "overcapacity": overcapacity, "zeroPopulation": zero}
    publish("browser-population-results.json", RESULT)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        RESULT["browser"] = {"engine": "Chromium", "version": browser.version, "headless": True, "viewportOvercapacity": [1440, 1000], "viewportZeroPopulation": [390, 844]}
        try:
            run_overcapacity(browser, overcapacity)
        except Exception as error:  # Keep a recorded checkpoint and continue the independent zero-population case.
            RESULT["errors"].append({"case": "overcapacity-browser", "error": repr(error)})
            checkpoint("overcapacity-browser-error", {"error": repr(error)})
        try:
            run_zero_population(browser, zero)
        except Exception as error:
            RESULT["errors"].append({"case": "zero-population-browser", "error": repr(error)})
            checkpoint("zero-population-browser-error", {"error": repr(error)})
        finally:
            browser.close()

    RESULT["finishedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    RESULT["status"] = "passed" if not RESULT["errors"] else "failed"
    publish("browser-population-results.json", RESULT)
    print(json.dumps(RESULT, ensure_ascii=False, indent=2))
    if RESULT["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
