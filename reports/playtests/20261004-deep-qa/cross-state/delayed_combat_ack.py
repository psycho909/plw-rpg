#!/usr/bin/env python3
"""Focused real-browser follow-up for combat actions during delayed journal ACK."""
from __future__ import annotations

import copy
import json
import os
import sys
import time
import traceback
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUN_DIR = HERE / "production-738bc00-o1-resume"
os.environ.setdefault("CROSS_STATE_OUTPUT", str(RUN_DIR))
os.environ.setdefault("CROSS_STATE_URL", "http://127.0.0.1:5193/")
os.environ.setdefault("CROSS_STATE_MANIFEST", str(HERE.parents[0] / "baseline" / "final-manifest.json"))
os.environ.setdefault("CROSS_STATE_MANIFEST_COMMIT", "738bc0010c549fa3fb2420437d171f5aa2a043a0")
os.environ.setdefault("CROSS_STATE_SOURCE_LABEL", "738bc00 + O1 verified patch; exact final-manifest source hashes")

import harness as qa  # noqa: E402
from playwright.sync_api import Browser, Page, sync_playwright  # noqa: E402

ACK_DELAY_MS = 2500


def mark(page: Page, name: str, **details: object) -> dict:
    return {"event": name, "atUtc": qa.utc_now(), "browserPerformanceMs": round(page.evaluate("performance.now()"), 3), **details}


def game_projection(state: dict, include_journal: bool = False) -> dict:
    value = copy.deepcopy(state)
    value.pop("lastSavedAt", None)
    if not include_journal:
        value.pop("playJournal", None)
    return value


def public_attack(page: Page) -> None:
    button = page.locator("dialog[open]").get_by_role("button", name="攻擊", exact=True)
    if button.is_disabled():
        raise AssertionError("The rendered public Attack button is disabled")
    button.click()


def initialize_empty_archive(page: Page) -> None:
    page.evaluate("""async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('oakvale-play-journal', 1);
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore('records', { keyPath: 'ordinal', autoIncrement: true });
          store.createIndex('id', 'id', { unique: true });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return true;
    }""")


def run_case(browser: Browser, seed_state: dict) -> dict:
    fixture_state = copy.deepcopy(seed_state)
    character = qa.active(fixture_state)
    character["status"] = "combat"
    fixture_state["combat"] = {
        "monsterId": "wolf", "hp": 30, "maxHp": 30, "attack": 8, "defense": 1,
        "exp": 25, "gold": 12, "elite": False, "dungeon": False,
    }
    fixture_state["dungeon"]["inDungeon"] = False
    fixture = {
        "kind": "valid-save-controlled-combat",
        "changedFields": ["activeCharacter.status", "combat", "lastSavedAt"],
        "combat": "Configured wolf encounter payload; matching active character status; no dungeon combat.",
        "source": "normal UI save generated in this run; only the listed fields changed for controlled entry into combat",
        "purpose": "exercise the rendered Attack action while a real IndexedDB readwrite transaction is natively complete but its application oncomplete callback is delayed",
    }
    qa.RUN["method"]["fixtures"].append(fixture)
    fixture_raw = qa.raw_from_state(fixture_state)
    fixture_raw_file = qa.store_raw("delayed-attack-controlled-combat-fixture", fixture_raw)
    context, page = qa.make_context_page(browser, fixture_raw, init_script=qa.idb_instrumentation(ACK_DELAY_MS))
    timeline: list[dict] = []
    try:
        if page.locator(".save-warning").count():
            raise AssertionError({"loadWarning": page.locator(".save-warning").inner_text()})
        page.locator("dialog[open] .battle-scene").wait_for()
        initialize_empty_archive(page)
        page.keyboard.press("Escape")
        page.wait_for_function("() => document.querySelectorAll('dialog[open]').length === 0")
        qa.click_speed(page, 20)
        qa.click_speed(page, 0)
        speed_buttons = page.locator(".speed-controls button")
        if speed_buttons.nth(3).get_attribute("aria-pressed") != "false" or speed_buttons.nth(0).get_attribute("aria-pressed") != "true":
            raise AssertionError("Could not set the public world-speed control to paused ×20")
        page.locator(".context-action").click()
        page.locator("dialog[open] .battle-scene").wait_for()
        if page.locator("dialog[open] .window-world-status button").get_attribute("aria-pressed") != "true":
            raise AssertionError("Controlled combat did not enter the race window paused")
        qa.wait_pending_empty(page, 12000)
        empty_rows, empty_pending = qa.ids_and_pending(page)
        if empty_pending:
            raise AssertionError({"pendingAfterX20SetupSettled": empty_pending})
        archive_ids_before_attack = [row["id"] for row in empty_rows]
        if len(archive_ids_before_attack) != len(set(archive_ids_before_attack)):
            raise AssertionError({"duplicateArchiveIdsBeforeAttack": archive_ids_before_attack})
        state_before_attack = json.loads(qa.raw_storage(page))
        if state_before_attack["combat"] != fixture_state["combat"]:
            raise AssertionError({"combatChangedDuringSpeedSetup": state_before_attack["combat"]})
        page.evaluate("window.__qaIdbTrace.splice(0, window.__qaIdbTrace.length)")
        settled_raw_file = qa.store_raw("delayed-attack-settled-before-public-action", qa.raw_storage(page))
        fixture_screenshot = qa.take_screenshot(page, "delayed-attack-combat-paused-x20")
        timeline.append(mark(page, "valid-combat-fixture-loaded-paused-at-x20", worldTime=state_before_attack["worldTime"], combat=state_before_attack["combat"],
                             preExistingArchiveCount=len(empty_rows)))
        qa.checkpoint("delayed-attack-controlled-combat-fixture", {
            "fixture": fixture, "fixtureRaw": fixture_raw_file, "settledBeforeAttackRaw": settled_raw_file,
            "worldTime": state_before_attack["worldTime"], "initialArchiveCount": len(empty_rows),
            "initialArchiveIds": archive_ids_before_attack, "initialPendingCount": 0, "speed": 20,
            "pausedBeforeRace": True, "combatModalVisible": True, "screenshot": fixture_screenshot, "timeline": timeline[-1],
        })

        public_attack(page)
        page.wait_for_function("""([key, hp]) => {
          const raw = localStorage.getItem(key); if (!raw) return false;
          const state = JSON.parse(raw);
          return state.combat?.hp < hp && (state.playJournal?.pending ?? []).some(row => row.kind === 'action');
        }""", arg=[qa.SAVE_KEY, fixture_state["combat"]["hp"]], timeout=6000)
        attack_raw, attack_state = qa.save_state(page)
        attack_records = attack_state["playJournal"]["pending"]
        if len(attack_records) != 1 or attack_records[0]["kind"] != "action":
            raise AssertionError({"pendingAfterFirstAttack": attack_records})
        first_id = attack_records[0]["id"]
        attack_raw_file = qa.store_raw("delayed-attack-after-public-attack-before-native-complete", attack_raw)
        timeline.append(mark(page, "first-public-attack-recorded", recordId=first_id, worldTime=attack_state["worldTime"], combatHp=attack_state["combat"]["hp"]))
        qa.checkpoint("delayed-attack-first-public-action", {
            "control": "Rendered modal button 攻擊", "combatHpBefore": fixture_state["combat"]["hp"],
            "combatHpAfter": attack_state["combat"]["hp"], "pendingKinds": [row["kind"] for row in attack_records],
            "pendingIds": [row["id"] for row in attack_records], "raw": attack_raw_file, "timeline": timeline[-1],
        })

        page.wait_for_function("""() => (window.__qaIdbTrace ?? []).some(row =>
          row.event === 'oncomplete' && row.mode === 'readwrite')""", timeout=6000)
        native_seen = time.monotonic()
        trace = page.evaluate("window.__qaIdbTrace ?? []")
        readwrite_completions = [row for row in trace if row.get("event") == "oncomplete" and row.get("mode") == "readwrite"]
        if len(readwrite_completions) != 1 or readwrite_completions[0].get("delayMs") != ACK_DELAY_MS:
            raise AssertionError({"unexpectedFirstReadwriteCompletion": readwrite_completions, "trace": trace})
        native_rows, native_pending = qa.ids_and_pending(page)
        native_counts = Counter(row["id"] for row in native_rows)
        if native_counts[first_id] != 1 or not set(archive_ids_before_attack).issubset(native_counts) or first_id not in {row["id"] for row in native_pending}:
            raise AssertionError({"firstCommitNotVisibleWithPendingAck": {"archiveCounts": dict(native_counts), "pending": native_pending}, "trace": trace})
        if readwrite_completions[0].get("applicationHandlerAt"):
            raise AssertionError({"applicationAcknowledgementArrivedBeforeRaceActions": readwrite_completions[0], "trace": trace})
        native_raw, native_state = qa.save_state(page)
        native_raw_file = qa.store_raw("delayed-attack-native-commit-pending-ack", native_raw)
        timeline.append(mark(page, "native-indexeddb-commit-observed-application-ack-pending", recordId=first_id,
                             archiveRecordCount=len(native_rows), pendingIds=[row["id"] for row in native_pending],
                             nativeHandlerAt=readwrite_completions[0]["nativeHandlerAt"], delayMs=ACK_DELAY_MS))
        native_screenshot = qa.take_screenshot(page, "delayed-attack-native-commit-pending-ack")
        qa.checkpoint("delayed-attack-native-commit-before-ack", {
            "nativeTransactionCompleted": True, "applicationOncompleteCallbackDelivered": False,
            "ackDelayMs": ACK_DELAY_MS, "archiveContainsFirstActionExactlyOnce": True,
            "firstActionStillPendingInLatestCheckpoint": True, "archiveCount": len(native_rows),
            "pendingIds": [row["id"] for row in native_pending], "trace": trace,
            "raw": native_raw_file, "screenshot": native_screenshot, "timeline": timeline[-1],
        })

        public_attack(page)
        page.wait_for_function("""key => {
          const raw = localStorage.getItem(key); if (!raw) return false;
          return (JSON.parse(raw).playJournal?.pending ?? []).filter(row => row.kind === 'action').length >= 2;
        }""", arg=qa.SAVE_KEY, timeout=4000)
        second_attack_raw, second_attack_state = qa.save_state(page)
        second_action_ids = [row["id"] for row in second_attack_state["playJournal"]["pending"] if row["kind"] == "action"]
        if first_id not in second_action_ids or len(second_action_ids) < 2:
            raise AssertionError({"secondPublicActionNotPendingDuringAck": second_attack_state["playJournal"]["pending"]})
        timeline.append(mark(page, "second-public-attack-added-while-first-ack-pending", actionIds=second_action_ids,
                             worldTime=second_attack_state["worldTime"], firstAckTrace=page.evaluate("window.__qaIdbTrace ?? []")))

        resume = page.locator("dialog[open] .window-world-status button")
        if resume.get_attribute("aria-pressed") != "true":
            raise AssertionError("The ×20 combat clock was not paused at delayed-ACK start")
        resume.click()
        page.wait_for_function("""([key, start]) => {
          const raw = localStorage.getItem(key); return !!raw && JSON.parse(raw).worldTime > start;
        }""", arg=[qa.SAVE_KEY, second_attack_state["worldTime"]], timeout=1500)
        after_time_raw, after_time_state = qa.save_state(page)
        time_records = [row for row in after_time_state["playJournal"]["pending"] if row["kind"] == "time"]
        if not time_records or first_id not in {row["id"] for row in after_time_state["playJournal"]["pending"]}:
            raise AssertionError({"timeDidNotAccumulateDuringDelayedAck": after_time_state["playJournal"]["pending"]})
        timeline.append(mark(page, "real-x20-world-time-added-pending-records-during-ack", speed=20,
                             worldTimeBefore=second_attack_state["worldTime"], worldTimeAfter=after_time_state["worldTime"],
                             timeRecordIds=[row["id"] for row in time_records]))

        public_attack(page)
        page.wait_for_timeout(40)
        latest_before_ack, latest_state = qa.save_state(page)
        action_records = [row for row in latest_state["playJournal"]["pending"] if row["kind"] == "action"]
        time_records = [row for row in latest_state["playJournal"]["pending"] if row["kind"] == "time"]
        if len(action_records) < 3 or not time_records:
            raise AssertionError({"requiredActionsAndTimeNotPending": latest_state["playJournal"]["pending"]})
        pause = page.locator("dialog[open] .window-world-status button")
        if pause.get_attribute("aria-pressed") != "false":
            raise AssertionError("The ×20 clock did not resume during the delayed-ACK window")
        pause.click()
        latest_before_ack, latest_state = qa.save_state(page)
        latest_ids = [row["id"] for row in latest_state["playJournal"]["pending"]]
        if len(latest_ids) != len(set(latest_ids)):
            raise AssertionError({"duplicatePendingIdsBeforeAck": latest_ids})
        if time.monotonic() - native_seen >= ACK_DELAY_MS / 1000:
            raise AssertionError("The action/time window exceeded the delayed ACK before its final checkpoint was captured")
        final_trace_before_ack = page.evaluate("window.__qaIdbTrace ?? []")
        first_trace = next(row for row in final_trace_before_ack if row.get("event") == "oncomplete" and row.get("mode") == "readwrite")
        if first_trace.get("applicationHandlerAt"):
            raise AssertionError({"firstAckArrivedBeforeLatestCheckpoint": first_trace, "trace": final_trace_before_ack})
        latest_raw_file = qa.store_raw("delayed-attack-time-and-actions-pending-before-ack", latest_before_ack)
        pending_kinds = Counter(row["kind"] for row in latest_state["playJournal"]["pending"])
        timeline.append(mark(page, "time-and-follow-up-attacks-pending-before-application-ack", pendingKinds=dict(pending_kinds),
                             pendingIds=latest_ids, worldTime=latest_state["worldTime"], combat=latest_state["combat"],
                             firstNativeCompleteAt=first_trace["nativeHandlerAt"], ackStillPending=True))
        queued_screenshot = qa.take_screenshot(page, "delayed-attack-time-and-actions-pending-before-ack")
        qa.checkpoint("delayed-attack-x20-time-and-follow-up-actions-before-ack", {
            "speed": 20, "realTimerAdvancedWhileAckDelayed": True, "worldTimeBefore": second_attack_state["worldTime"],
            "worldTimeAfter": latest_state["worldTime"], "publicAttackActionCount": pending_kinds["action"],
            "timeRecordCount": pending_kinds["time"], "pendingKinds": dict(pending_kinds), "pendingIds": latest_ids,
            "ackStillPending": True, "firstCommitArchiveCount": len(native_rows), "traceBeforeAck": final_trace_before_ack,
            "raw": latest_raw_file, "screenshot": queued_screenshot, "timeline": timeline[-1],
        })

        page.wait_for_function("""() => (window.__qaIdbTrace ?? []).some(row =>
          row.event === 'oncomplete' && row.mode === 'readwrite' && row.applicationHandlerAt)""", timeout=6000)
        page.wait_for_function("""key => {
          const raw = localStorage.getItem(key); return !!raw && (JSON.parse(raw).playJournal?.pending ?? []).length === 0;
        }""", arg=qa.SAVE_KEY, timeout=12000)
        final_raw, final_state = qa.save_state(page)
        final_rows, final_pending = qa.ids_and_pending(page)
        final_ids = [row["id"] for row in final_rows]
        counts = Counter(final_ids)
        expected_ids = set(latest_ids)
        expected_archive_ids = set(archive_ids_before_attack) | expected_ids
        trace = page.evaluate("window.__qaIdbTrace ?? []")
        completions = [row for row in trace if row.get("event") == "oncomplete" and row.get("mode") == "readwrite"]
        ack_windows = [row for row in completions if row.get("applicationHandlerAt")]
        added_once = set(counts) == expected_archive_ids and all(counts[row_id] == 1 for row_id in expected_archive_ids)
        no_rollback = game_projection(final_state) == game_projection(latest_state)
        if final_pending or not added_once or not no_rollback:
            raise AssertionError({"pending": final_pending, "expectedIds": sorted(expected_ids), "archiveCounts": dict(counts),
                                  "archiveIds": final_ids, "noRollback": no_rollback,
                                  "latestWorldTime": latest_state["worldTime"], "finalWorldTime": final_state["worldTime"],
                                  "trace": trace})
        if len(completions) < 2 or len(ack_windows) != len(completions):
            raise AssertionError({"expectedTwoDelayedApplicationCallbacks": completions, "trace": trace})
        final_raw_file = qa.store_raw("delayed-attack-after-all-acks", final_raw)
        timeline.append(mark(page, "delayed-ack-drained-all-pending-records", archivedIds=final_ids,
                             pendingCount=len(final_pending), transactionCompletions=len(completions),
                             noStateRollback=no_rollback, worldTime=final_state["worldTime"]))
        qa.checkpoint("delayed-attack-all-ids-archived-once-latest-state-retained", {
            "expectedRecordIds": sorted(expected_archive_ids), "newPendingRecordIds": sorted(expected_ids),
            "archiveIds": final_ids, "recordCountsById": dict(counts),
            "eachPendingIdArchivedExactlyOnce": added_once, "pendingAfterAck": len(final_pending),
            "latestGameStateRetainedAfterAck": no_rollback, "worldTimeLatestBeforeAck": latest_state["worldTime"],
            "worldTimeAfterAck": final_state["worldTime"], "transactionTrace": trace,
            "rawLatestBeforeAck": latest_raw_file, "rawAfterAck": final_raw_file, "timeline": timeline[-1],
        })

        raw_before_reload = final_raw
        state_before_reload = copy.deepcopy(final_state)
        screenshot_before_reload = qa.take_screenshot(page, "delayed-attack-before-reload")
        page.reload(wait_until="networkidle")
        page.locator("dialog[open] .battle-scene").wait_for()
        qa.wait_pending_empty(page, 12000)
        reload_raw, reload_state = qa.save_state(page)
        reload_rows, reload_pending = qa.ids_and_pending(page)
        reload_exact = game_projection(reload_state, include_journal=True) == game_projection(state_before_reload, include_journal=True)
        archive_unchanged = reload_rows == final_rows
        if not reload_exact or reload_pending or not archive_unchanged:
            raise AssertionError({"reloadExact": reload_exact, "pendingAfterReload": reload_pending,
                                  "archiveUnchanged": archive_unchanged,
                                  "worldTimeBefore": state_before_reload["worldTime"], "worldTimeAfter": reload_state["worldTime"],
                                  "combatBefore": state_before_reload["combat"], "combatAfter": reload_state["combat"]})
        reload_raw_file = qa.store_raw("delayed-attack-after-reload", reload_raw)
        screenshot_after_reload = qa.take_screenshot(page, "delayed-attack-after-reload")
        timeline.append(mark(page, "reload-restored-exact-game-and-journal-state", worldTime=reload_state["worldTime"],
                             combat=reload_state["combat"], archiveCount=len(reload_rows), pendingCount=len(reload_pending)))
        qa.checkpoint("delayed-attack-exact-reload-roundtrip", {
            "gameAndJournalExactAfterReload": reload_exact, "archiveRowsIdenticalAfterReload": archive_unchanged,
            "pendingAfterReload": len(reload_pending), "worldTimeBeforeReload": state_before_reload["worldTime"],
            "worldTimeAfterReload": reload_state["worldTime"], "combatBeforeReload": state_before_reload["combat"],
            "combatAfterReload": reload_state["combat"], "archiveCount": len(reload_rows),
            "rawBeforeReload": qa.store_raw("delayed-attack-before-reload", raw_before_reload),
            "rawAfterReload": reload_raw_file, "screenshotBeforeReload": screenshot_before_reload,
            "screenshotAfterReload": screenshot_after_reload, "timeline": timeline[-1],
        })
        return {
            "fixture": fixture, "fixtureRaw": fixture_raw_file, "ackDelayMs": ACK_DELAY_MS,
            "nativeCommitObservedBeforeCallback": True, "followupPublicAttackCount": max(0, pending_kinds["action"] - 1),
            "publicAttackRecordCount": pending_kinds["action"], "timeRecordCount": pending_kinds["time"],
            "worldTimeBeforeRace": fixture_state["worldTime"], "worldTimeAfterRace": final_state["worldTime"],
            "preExistingArchiveIds": archive_ids_before_attack, "recordIds": sorted(expected_ids),
            "archiveIds": final_ids, "eachIdExactlyOnce": added_once,
            "pendingAfterAcks": len(final_pending), "latestStateNeverRolledBack": no_rollback,
            "delayedWriteTransactions": len(completions), "allCallbacksDelivered": len(ack_windows) == len(completions),
            "exactReloadRoundtrip": reload_exact, "archiveUnchangedAfterReload": archive_unchanged,
            "reloadArchiveCount": len(reload_rows), "pageErrors": list(qa.RUN["pageErrors"]),
            "consoleErrors": list(qa.RUN["consoleErrors"]), "transactionTrace": trace, "timeline": timeline,
        }
    finally:
        context.close()


def main() -> int:
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = Path(os.environ["CROSS_STATE_MANIFEST"])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("sourceCommit") != qa.BASELINE_COMMIT:
        qa.add_case("preflight", "blocked", error={"manifestCommit": manifest.get("sourceCommit"), "expectedCommit": qa.BASELINE_COMMIT})
        return 2
    qa.RUN["suite"] = "20261004-deep-qa-cross-state-delayed-combat-follow-up"
    qa.RUN["focus"] = "Actual public combat attack inside delayed IndexedDB oncomplete ACK window, with ×20 timer and exact reload roundtrip."
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        try:
            seed_raw, baseline = qa.case_01_baseline(browser, manifest)
            mismatches = [name for name, row in baseline["baseline"]["checkoutSourceHashes"].items() if not row["match"]]
            if mismatches:
                raise AssertionError({"sourceHashMismatches": mismatches})
            qa.add_case("fixed-production-assets-and-exact-source-hashes", "passed", baseline)
            seed_state = json.loads(seed_raw)
            result = run_case(browser, seed_state)
            qa.add_case("delayed-ack-public-combat-attack-time-and-reload", "passed", result)
        except Exception as error:
            qa.add_case("delayed-ack-public-combat-attack-time-and-reload", "failed",
                        error="".join(traceback.format_exception(type(error), error, error.__traceback__)))
        finally:
            browser.close()
    qa.RUN["finishedAtUtc"] = qa.utc_now()
    qa.RUN["summary"] = {
        "caseCount": len(qa.RUN["cases"]), "failedCases": [row["name"] for row in qa.RUN["cases"] if row["status"] != "passed"],
        "checkpointCount": len(qa.RUN["checkpoints"]), "pageErrorCount": len(qa.RUN["pageErrors"]),
        "consoleErrorCount": len(qa.RUN["consoleErrors"]),
    }
    qa.publish()
    return 1 if qa.RUN["summary"]["failedCases"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
