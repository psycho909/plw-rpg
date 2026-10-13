"""Focused preparation-only contract tests; no Playwright/browser/network usage."""
from __future__ import annotations

import json
import importlib.util
import signal
import subprocess
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
PHASE = HERE.parent
sys.path.insert(0, str(PHASE))

import qa_browser_runner  # noqa: E402
from qa_browser_runner import (MODE_DEFAULT_DURATION_SECONDS, MODE_DURATION_BOUNDS, action_made_progress,
                              choose_visible_action, classify_button, drain_browser_events, indexeddb_summary,
                              indexeddb_record_projection_js, project_indexeddb_summary, record_action, write_runner_heartbeat,
                              is_safe_dialog_close_name, normal_save_reload, observable_action_state_key, safe_close_dialog,
                              close_runner_resources, update_stalled_controls, validate_run_directory,
                              wait_for_world_time_advance, checkpoint)  # noqa: E402
from qa_browser_support import (core_save_differences, reload_due, reload_payload_proof,
                                validate_controlled_fixture_case)  # noqa: E402
from qa_browser_launcher import (MODE_DURATION_BOUNDS as LAUNCHER_MODE_DURATION_BOUNDS,
                                MODE_DEFAULT_DURATION_SECONDS as LAUNCHER_MODE_DEFAULT_DURATION_SECONDS,
                                monitor_runner_process, terminate_runner_process_tree)  # noqa: E402


class BrowserContracts(unittest.TestCase):
    def test_checkpoint_serializes_browser_state_summary(self):
        state = {"worldTime": 480, "activeCharacterId": "p", "characters": [{"id": "p", "gold": 4}],
            "npcs": [{"isAlive": True, "gold": 0}], "settlement": {"name": "Oak", "stage": "camp",
                "capacity": 5, "food": 2, "prosperity": 1, "safety": 3, "infrastructure": 0, "growth": 0, "buildings": []},
            "threat": {"threatLevel": 1, "monsterPopulation": 2, "growthRate": 0, "warningLevel": 0,
                "bossAlive": False, "bossProgress": 0, "campLevel": 0}, "regionalCrisis": {"phase": "calm"},
            "events": [], "history": [], "playJournal": {"pending": []}}
        class Page:
            url = "http://example.invalid"
            def evaluate(self, script):
                return "{}" if "localStorage.getItem" in script else {"width": 800, "height": 600, "scrollWidth": 800}
            def locator(self, selector):
                class Dialogs:
                    def all_inner_texts(self): return []
                return Dialogs()
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(qa_browser_runner, "read_save", side_effect=[state, {"events": None, "history": [], "npcs": None}]), \
             patch.object(qa_browser_runner, "visible_text", return_value=""), \
             patch.object(qa_browser_runner, "indexeddb_summary", return_value={}), \
             patch.object(qa_browser_runner, "drain_browser_events", return_value={}):
            status = {"startedMonotonic": 1, "profilingLimitationsTail": [], "errorCounts": {},
                "browserEventCounts": {}, "checkpointCount": 0, "checkpointTail": []}
            checkpoint(Page(), None, Path(tmp), status, "contract")
            checkpoint(Page(), None, Path(tmp), status, "missing-fields-contract")
            rows = [json.loads(line) for line in (Path(tmp) / "checkpoints.jsonl").read_text().splitlines()]
        row = rows[0]
        self.assertEqual(row["browserState"]["npcPopulation"]["liveRegistryTotal"], 1)
        self.assertEqual(row["browserState"]["npcPopulation"]["historicalDeaths"], 0)
        self.assertEqual(row["browserState"]["economy"]["activeCharacterGold"], 4)
        self.assertEqual(row["browserState"]["threat"]["monsterPopulation"], 2)
        self.assertIsNone(rows[1]["save"]["eventCount"])
        self.assertIsNone(rows[1]["browserState"]["npcPopulation"]["registryAlive"])

    def test_browser_state_summary_projects_v2_population_economy_threat_and_history(self):
        summarize = getattr(qa_browser_runner, "browser_state_summary", None)
        self.assertTrue(callable(summarize), "checkpoint browser-state telemetry contract is not implemented")
        save = {
            "activeCharacterId": "player-1",
            "characters": [{"id": "player-1", "gold": 55}, {"id": "heir", "gold": 15}],
            "npcs": [{"isAlive": True, "gold": 0}, {"isAlive": False, "gold": 0}, {"isAlive": True, "gold": 0}],
            "settlement": {"name": "Oakvale", "stage": "village", "capacity": 20,
                "food": 91, "prosperity": 13, "safety": 80, "infrastructure": 5,
                "growth": 2, "buildings": ["house", "farm"]},
            "threat": {"threatLevel": 3, "monsterPopulation": 42, "growthRate": 1.2,
                "bossProgress": 77, "campLevel": 2, "bossAlive": True, "warningLevel": 1},
            "regionalCrisis": {"phase": "active"},
            "events": [{}, {}, {}, {}], "history": [{"type": "npc.died", "category": "npc"},
                {"type": "npc.died", "category": "player"}, {}, {}, {}],
            "playJournal": {"pending": [{}, {}]},
        }
        summary = summarize(save, local_storage_bytes=999)
        self.assertEqual(summary["npcPopulation"]["liveRegistryTotal"], 3)
        self.assertEqual(summary["npcPopulation"]["registryAlive"], 2)
        self.assertEqual(summary["npcPopulation"]["registryDead"], 1)
        self.assertEqual(summary["npcPopulation"]["historicalDeaths"], 1)
        self.assertEqual(summary["npcPopulation"]["historicalDeathBasis"], "retained_history_npc.died_events")
        self.assertFalse(summary["npcPopulation"]["historyAtCap"])
        self.assertTrue(summary["npcPopulation"]["historicalDeathsMayBeIncomplete"])
        self.assertEqual(summary["settlement"]["stage"], "village")
        self.assertEqual(summary["settlement"]["buildingCount"], 2)
        self.assertEqual(summary["economy"]["activeCharacterGold"], 55)
        self.assertEqual(summary["economy"]["allCharacterGold"], 70)
        self.assertEqual(summary["economy"]["npcGold"], 0)
        self.assertEqual(summary["economy"]["totalGold"], 70)
        self.assertEqual(summary["threat"]["level"], 3)
        self.assertEqual(summary["threat"]["monsterPopulation"], 42)
        self.assertEqual(summary["boss"]["alive"], True)
        self.assertEqual(summary["boss"]["progress"], 77)
        self.assertEqual(summary["boss"]["regionalCrisisPhase"], "active")
        self.assertEqual((summary["eventCount"], summary["historyCount"], summary["journalPendingCount"], summary["saveBytes"]), (4, 5, 2, 999))
        self.assertEqual(summary["status"], "supported")

    def test_browser_state_summary_marks_missing_schema_fields_unsupported_and_null(self):
        summarize = getattr(qa_browser_runner, "browser_state_summary", None)
        self.assertTrue(callable(summarize), "checkpoint browser-state telemetry contract is not implemented")
        summary = summarize({"npcs": [{"id": "npc-1"}], "characters": [], "settlement": {},
            "threat": {}, "events": None, "history": None}, local_storage_bytes=None)
        self.assertEqual(summary["status"], "partial")
        self.assertEqual(summary["npcPopulation"]["liveRegistryTotal"], 1)
        self.assertIsNone(summary["npcPopulation"]["registryAlive"])
        self.assertIsNone(summary["npcPopulation"]["historicalDeaths"])
        self.assertIsNone(summary["settlement"]["stage"])
        self.assertEqual(summary["settlement"]["status"], "unsupported")
        self.assertIsNone(summary["economy"]["npcGold"])
        self.assertIsNone(summary["threat"]["level"])
        self.assertEqual(summary["threat"]["status"], "unsupported")
        self.assertIsNone(summary["boss"]["alive"])
        self.assertIsNone(summary["eventCount"])
        self.assertIsNone(summary["historyCount"])
        self.assertIsNone(summary["journalPendingCount"])
        self.assertIsNone(summary["saveBytes"])
        self.assertTrue(summary["unsupportedFields"])

    def test_npc_death_history_excludes_player_events_and_marks_history_cap(self):
        history = [{"type": "npc.died", "category": "npc"}, {"type": "npc.died", "category": "player"}]
        summary = qa_browser_runner.browser_state_summary({"npcs": [{"isAlive": True}], "history": history})
        population = summary["npcPopulation"]
        self.assertEqual(population["registryAlive"], 1)
        self.assertEqual(population["registryDead"], 0)
        self.assertEqual(population["historicalDeaths"], 1)
        self.assertEqual(population["historicalDeathBasis"], "retained_history_npc.died_events")
        self.assertFalse(population["historyAtCap"])
        self.assertTrue(population["historicalDeathsMayBeIncomplete"])

        capped = qa_browser_runner.browser_state_summary({"npcs": [], "history": [None] * 20000})["npcPopulation"]
        self.assertTrue(capped["historyAtCap"])
        self.assertTrue(capped["historicalDeathsMayBeIncomplete"])

    def test_unrecognized_blocked_modal_stops_after_three_persisted_identical_turns(self):
        record = getattr(qa_browser_runner, "record_unrecognized_blocked_modal_turn", None)
        self.assertTrue(callable(record), "identical blocked-modal fail-fast contract is not implemented")
        status = {}
        recorded = []
        writer = lambda row: recorded.append(dict(row))
        for turn in (1, 2):
            count = record(status, "same-modal-key", {"turn": turn}, writer)
            self.assertEqual(count, turn)
        with self.assertRaisesRegex(RuntimeError, "BlockedModalFailFast: 3 consecutive identical turns"):
            record(status, "same-modal-key", {"turn": 3}, writer)
        self.assertEqual(len(recorded), 3)
        self.assertIn("blockedModalFailureReason", recorded[-1])
        self.assertEqual(status["blockedModalStreak"], 3)

        self.assertEqual(record(status, None, {"turn": 4}, writer), 0)
        self.assertEqual(record(status, "new-modal-key", {"turn": 5}, writer), 1)

    def test_blocked_modal_fail_fast_only_tracks_unrecognized_open_dialogs(self):
        class Button:
            def __init__(self, label):
                self.label = label

            def get_attribute(self, name):
                return self.label if name == "aria-label" else None

            def inner_text(self, timeout=None):
                return self.label

            def is_visible(self):
                return True

            def is_enabled(self):
                return True

        class Locator:
            def __init__(self, items=()):
                self.items = list(items)
                self.last = self.items[-1] if self.items else None

            def count(self):
                return len(self.items)

            def nth(self, index):
                return self.items[index]

        class Dialog:
            def __init__(self, labels):
                self.buttons = Locator([Button(label) for label in labels])

            def get_by_role(self, _role):
                return self.buttons

            def inner_text(self, timeout=None):
                return "Unrecognized modal"

        class Page:
            def __init__(self, labels):
                self.dialog = Dialog(labels) if labels is not None else None

            def locator(self, _selector):
                return Locator([self.dialog] if self.dialog is not None else [])

        fingerprint = qa_browser_runner.unrecognized_blocked_modal_fingerprint
        self.assertIsNone(fingerprint(Page(None), "observe_blocked"))
        self.assertIsNone(fingerprint(Page(("旅人筆記",)), "observe_blocked"))
        self.assertIsNotNone(fingerprint(Page(("unrecognized action",)), "observe_blocked"))

    def test_action_chooser_excludes_destructive_world_reset_and_confirmation(self):
        class Button:
            def __init__(self, label):
                self.label = label

            def get_attribute(self, name):
                return self.label if name == "aria-label" else None

            def inner_text(self, timeout=None):
                return self.label

            def is_visible(self):
                return True

            def is_enabled(self):
                return True

        class Locator:
            def __init__(self, items=()):
                self.items = list(items)
                self.last = self.items[-1] if self.items else None

            def count(self):
                return len(self.items)

            def nth(self, index):
                return self.items[index]

            def all(self):
                return self.items

        class Dialog:
            def __init__(self, labels):
                self.buttons = Locator([Button(label) for label in labels])

            def get_by_role(self, _role):
                return self.buttons

        class Page:
            def __init__(self, labels):
                self.dialog = Dialog(labels)

            def locator(self, _selector):
                return Locator([self.dialog])

            def get_by_role(self, _role):
                return self.dialog.buttons

        destructive_labels = ("重建世界", "覆蓋存檔並重建世界", "Rebuild world", "Overwrite save and rebuild world")
        for label in destructive_labels:
            self.assertIsNone(classify_button(Button(label)), label)

        selected, category, _ = choose_visible_action(Page(destructive_labels), 1, {})
        self.assertIsNone(selected)
        self.assertEqual(category, "observe_blocked")

        selected, category, _ = choose_visible_action(Page(("旅人筆記", *destructive_labels)), 1, {})
        self.assertEqual(selected.label, "旅人筆記")
        self.assertEqual(category, "navigate")

    def test_short_content_agent_lane_completes_ui_reload_without_fixture_injection(self):
        complete = getattr(qa_browser_runner, "ensure_final_normal_reload", None)
        self.assertTrue(callable(complete), "short lane final UI reload contract is not implemented")
        page = object()
        status = {"normalReloadCount": 0}
        with patch.object(qa_browser_runner, "normal_save_reload", side_effect=lambda _page, _dir, state, _reason: state.update(normalReloadCount=1)) as save_reload, \
                patch.object(qa_browser_runner, "snapshot") as take_snapshot, \
                patch.object(qa_browser_runner, "controlled_fixture_smoke") as fixture:
            completed = complete(page, HERE, status, "content-agent", 60, 60, 7, lambda *_: None)
        self.assertTrue(completed)
        save_reload.assert_called_once_with(page, HERE, status, "short-content-agent-smoke-final-save-reload")
        take_snapshot.assert_called_once()
        fixture.assert_not_called()
        self.assertEqual(status["normalReloadCount"], 1)

    def test_final_reload_fallback_does_not_replace_long_lane_schedule_or_regression_fixture(self):
        complete = getattr(qa_browser_runner, "ensure_final_normal_reload", None)
        self.assertTrue(callable(complete), "short lane final UI reload contract is not implemented")
        with patch.object(qa_browser_runner, "normal_save_reload") as save_reload:
            self.assertFalse(complete(object(), HERE, {"normalReloadCount": 1}, "content-agent", 60, 60, 2, lambda *_: None))
            self.assertFalse(complete(object(), HERE, {"normalReloadCount": 0}, "content-agent", 3600, 299, 2, lambda *_: None))
            self.assertFalse(complete(object(), HERE, {"normalReloadCount": 0}, "regression", 60, 60, 2, lambda *_: None))
        save_reload.assert_not_called()

    def test_menu_dialog_rotates_choices_by_surface_and_records_each_use(self):
        class Button:
            def __init__(self, label):
                self.label = label

            def get_attribute(self, name):
                return self.label if name == "aria-label" else None

            def inner_text(self, timeout=None):
                return self.label

            def is_visible(self):
                return True

            def is_enabled(self):
                return True

        class Locator:
            def __init__(self, items=()):
                self.items = list(items)
                self.last = self.items[-1] if self.items else None

            def count(self):
                return len(self.items)

            def nth(self, index):
                return self.items[index]

            def all(self):
                return self.items

        class Dialog:
            def __init__(self):
                self.buttons = Locator([Button(label) for label in
                    ("這一生", "住所與產業", "角色", "物品", "日誌", "地圖與世界", "世界歷史", "旅人筆記", "地方消息與委託")])

            def get_by_role(self, _role):
                return self.buttons

            def locator(self, _selector):
                return Locator()

        class Page:
            def __init__(self):
                self.dialog = Dialog()

            def locator(self, _selector):
                return Locator([self.dialog])

            def get_by_role(self, _role):
                return self.dialog.buttons

        page = Page()
        status = {"actionCount": 0, "actionTail": [], "actionCategoryCounts": {}}
        selected_labels = []
        for _ in range(9):
            surface_uses = status.get("dialogActionUseCounts", {}).get("menu-surface", {})
            button, category, _ = choose_visible_action(page, len(selected_labels) + 1, {},
                dialog_label_uses=surface_uses)
            self.assertIsNotNone(button)
            label = button.inner_text()
            selected_labels.append(label)
            with tempfile.TemporaryDirectory(dir=HERE) as temporary:
                record_action(status, Path(temporary),
                    {"choice": category, "buttonText": label, "dialogSurfaceKey": "menu-surface"})
        self.assertEqual(len(set(selected_labels)), 9)
        self.assertEqual(selected_labels.count("地方消息與委託"), 1)
        self.assertEqual(status["dialogActionUseCounts"]["menu-surface"]["旅人筆記"], 1)

    def test_dialog_usage_counters_remain_bounded(self):
        status = {"actionCount": 0, "actionTail": [], "actionCategoryCounts": {}}
        with tempfile.TemporaryDirectory(dir=HERE) as temporary:
            run_dir = Path(temporary)
            for index in range(14):
                record_action(status, run_dir, {"choice": "navigate", "buttonText": f"menu-{index}",
                    "dialogSurfaceKey": f"surface-{index}"})
            for index in range(26):
                record_action(status, run_dir, {"choice": "navigate", "buttonText": f"destination-{index}",
                    "dialogSurfaceKey": "bounded-surface"})
        self.assertLessEqual(len(status["dialogActionUseCounts"]), 12)
        self.assertLessEqual(len(status["dialogActionUseCounts"]["bounded-surface"]), 24)

    def test_indexeddb_estimate_is_per_store_bounded_and_labeled(self):
        projected = project_indexeddb_summary({
            "supported": True,
            "databases": [{"name": "save", "stores": {
                "events": {"count": 100, "sampledRecords": 4, "sampleLimit": 64,
                    "serializedSampleBytes": 800, "serializedSampleCount": 4, "serializationErrors": 0},
                "empty": {"count": 0, "sampledRecords": 0, "sampleLimit": 64,
                    "serializedSampleBytes": 0, "serializedSampleCount": 0, "serializationErrors": 0},
            }}],
        })
        events = projected["databases"][0]["stores"]["events"]
        self.assertEqual(events["estimatedTotalSerializedRecordBytes"], 20000)
        self.assertLessEqual(events["sampledRecords"], events["sampleLimit"])
        self.assertIn("UTF-8 JSON", events["estimationMethod"])
        self.assertEqual(projected["databases"][0]["counts"], {"events": 100, "empty": 0})

    def test_indexeddb_truncated_sample_suppresses_store_total_estimate(self):
        projected = project_indexeddb_summary({"supported": True, "databases": [{"name": "save", "stores": {
            "events": {"count": 20, "sampledRecords": 4, "sampleLimit": 64,
                "serializedSampleBytes": 800, "serializedSampleCount": 4,
                "truncatedSampleRecords": 1, "serializationErrors": 0},
        }}]})
        row = projected["databases"][0]["stores"]["events"]
        self.assertIsNone(row["estimatedTotalSerializedRecordBytes"])
        self.assertEqual(row["estimateSuppressedReason"], "sample contains truncated records")

    def test_indexeddb_record_projection_bounds_value_before_stringify(self):
        class Page:
            def evaluate(self, script):
                self.script = script
                return {"supported": True, "databases": []}

        page = Page()
        indexeddb_summary(page)
        self.assertIn("projectIndexedDBRecord", page.script)
        self.assertIn("MAX_RECORD_PROJECTION_NODES", page.script)
        self.assertIn("MAX_RECORD_PROJECTION_DEPTH", page.script)
        self.assertIn("MAX_RECORD_PROJECTION_TEXT", page.script)
        self.assertIn("MAX_RECORD_PROJECTION_TEXT_BUDGET", page.script)
        self.assertIn("JSON.stringify(projection.value)", page.script)
        self.assertNotIn("JSON.stringify({key:cursor.key,value:cursor.value})", page.script)
        self.assertIn("truncatedSampleRecords:0", page.script)

        js = indexeddb_record_projection_js() + "\nconst input={large:'x'.repeat(5000),...Object.fromEntries(Array.from({length:100},(_,i)=>['p'+i,'y'.repeat(1000)]))};const result=projectIndexedDBRecord('key',input);console.log(JSON.stringify({...result,serializedLength:JSON.stringify(result.value).length}));"
        result = subprocess.run(["node", "-e", js], check=True, capture_output=True, text=True)
        projection = json.loads(result.stdout)
        self.assertTrue(projection["truncated"])
        self.assertLessEqual(projection["nodes"], 256)
        self.assertLessEqual(projection["textCharacters"], 4096)
        self.assertLessEqual(len(projection["value"]["value"]["large"]), 1036)
        self.assertLess(projection["serializedLength"], 12000)
        self.assertIn("__truncated__", projection["value"]["value"])

    def test_indexeddb_projection_does_not_expand_bigint_before_truncation(self):
        js = indexeddb_record_projection_js() + """
            let bigintToStringCalls=0;
            const original=BigInt.prototype.toString;
            BigInt.prototype.toString=function(...args){bigintToStringCalls++;return original.apply(this,args);};
            const result=projectIndexedDBRecord('key',1n<<1000000n);
            BigInt.prototype.toString=original;
            console.log(JSON.stringify({bigintToStringCalls,truncated:result.truncated,value:result.value.value}));
        """
        result = subprocess.run(["node", "-e", js], check=True, capture_output=True, text=True)
        projection = json.loads(result.stdout)
        self.assertEqual(projection["bigintToStringCalls"], 0)
        self.assertTrue(projection["truncated"])
        self.assertEqual(projection["value"], "[BigInt omitted]")

    def test_indexeddb_checkpoint_reads_a_bounded_sample_without_mutation(self):
        class Page:
            def evaluate(self, script):
                self.script = script
                return {"supported": True, "databases": [{"name": "save", "stores": {
                    "events": {"count": 5, "sampledRecords": 5, "sampleLimit": 64,
                        "serializedSampleBytes": 500, "serializedSampleCount": 5, "serializationErrors": 0},
                }}]}

        page = Page()
        result = indexeddb_summary(page)
        self.assertIn("db.transaction(storeName,'readonly')", page.script)
        self.assertIn("store.openCursor()", page.script)
        self.assertIn("sampleLimit:64", page.script)
        self.assertIn("allInfos.slice(0,8)", page.script)
        self.assertIn("allStoreNames.slice(0,32)", page.script)
        self.assertIn("req.onupgradeneeded=()=>req.transaction.abort()", page.script)
        self.assertNotRegex(page.script, r"\bstore\.(put|add|delete|clear)\(")
        self.assertIn("UTF-8 JSON bounded-projection", result["estimateMethod"])
        self.assertEqual(result["databaseScanLimit"], 8)
        self.assertEqual(result["storeScanLimitPerDatabase"], 32)
        self.assertEqual(result["omittedDatabaseCount"], 0)
        self.assertEqual(result["databases"][0]["stores"]["events"]["estimatedTotalSerializedRecordBytes"], 500)

    def test_duration_contract_allows_two_hour_stress_and_one_hour_content_agent(self):
        self.assertEqual(MODE_DURATION_BOUNDS["stress"], (1200, 7200))
        self.assertEqual(MODE_DURATION_BOUNDS["content-agent"], (60, 3600))
        self.assertEqual(MODE_DEFAULT_DURATION_SECONDS["content-agent"], 3600)
        self.assertEqual(LAUNCHER_MODE_DURATION_BOUNDS, MODE_DURATION_BOUNDS)
        self.assertEqual(LAUNCHER_MODE_DEFAULT_DURATION_SECONDS["content-agent"], 3600)

    def test_launcher_watchdog_terminates_runner_on_stale_heartbeat_with_stage(self):
        class Runner:
            pid = 9012

            def poll(self):
                return None

        with tempfile.TemporaryDirectory() as temporary:
            heartbeat_path = Path(temporary) / "runner-heartbeat.json"
            heartbeat_path.write_text(json.dumps({
                "schema": "phase7-runner-heartbeat-v1", "heartbeatMonotonic": 30,
                "heartbeatUTC": "2026-10-13T12:00:00Z", "turn": 44, "stage": "click_visible_control",
            }))
            runner = Runner()
            termination = {"runnerExitCode": -15, "terminationSignal": "SIGTERM", "reapTimedOut": False}
            with patch("qa_browser_launcher.terminate_runner_process_tree", return_value=termination) as stop:
                result = monitor_runner_process(runner, heartbeat_path, timeout_seconds=120,
                    poll_interval=1, clock=lambda: 200, sleeper=lambda _seconds: None)
        self.assertTrue(result["timedOut"])
        self.assertEqual(result["status"], "STALE_HEARTBEAT_TIMEOUT")
        self.assertEqual(result["heartbeatAgeSeconds"], 170)
        self.assertEqual(result["lastHeartbeat"]["stage"], "click_visible_control")
        self.assertEqual(result["lastHeartbeat"]["turn"], 44)
        stop.assert_called_once_with(runner)

    def test_runner_heartbeat_records_turn_stage_and_timestamp(self):
        with tempfile.TemporaryDirectory() as temporary:
            heartbeat = write_runner_heartbeat(Path(temporary), 44, "click_visible_control")
            persisted = json.loads((Path(temporary) / "runner-heartbeat.json").read_text())
        self.assertEqual(persisted, heartbeat)
        self.assertEqual(persisted["schema"], "phase7-runner-heartbeat-v1")
        self.assertEqual(persisted["turn"], 44)
        self.assertEqual(persisted["stage"], "click_visible_control")
        self.assertIn("heartbeatUTC", persisted)
        self.assertIsInstance(persisted["heartbeatMonotonic"], (int, float))

    def test_watchdog_termination_targets_runner_process_group_and_reaps_child(self):
        class Runner:
            pid = 9012
            returncode = None

            def poll(self):
                return None

            def wait(self, timeout=None):
                self.wait_timeout = timeout
                self.returncode = -signal.SIGTERM
                return self.returncode

            def terminate(self):
                raise AssertionError("POSIX runner process group should be terminated as a unit")

        runner = Runner()
        with patch("qa_browser_launcher.os.killpg") as kill_group:
            result = terminate_runner_process_tree(runner, grace_seconds=7)
        kill_group.assert_called_once_with(runner.pid, signal.SIGTERM)
        self.assertEqual(runner.wait_timeout, 7)
        self.assertEqual(result["runnerExitCode"], -signal.SIGTERM)
        self.assertEqual(result["terminationSignal"], "SIGTERM")
        self.assertFalse(result["reapTimedOut"])

    def test_launcher_supervises_runner_and_starts_it_in_a_separate_process_group(self):
        launcher_source = (PHASE / "qa_browser_launcher.py").read_text(encoding="utf-8")
        self.assertIn('monitor_runner_process(runner, run_dir / "runner-heartbeat.json")', launcher_source)
        self.assertIn('start_new_session=(os.name == "posix")', launcher_source)
        self.assertNotIn("code = runner.wait()", launcher_source)

    def test_region_filter_tab_is_not_treated_as_an_exploration_action(self):
        class Button:
            label = "區域"

            def get_attribute(self, name):
                return self.label if name == "aria-label" else None

            def inner_text(self, timeout=None):
                return self.label

            def is_visible(self):
                return True

            def is_enabled(self):
                return True

        class Locator:
            def __init__(self, items=()):
                self.items = list(items)

            def count(self):
                return len(self.items)

            def nth(self, index):
                return self.items[index]

        class Page:
            def locator(self, _selector):
                return Locator()

            def get_by_role(self, _role):
                return Locator([Button()])

        selected, category, _ = choose_visible_action(Page(), 1, {})
        self.assertIsNone(selected)
        self.assertEqual(category, "observe")

    def test_region_destination_action_labels_remain_exploration_actions(self):
        class Button:
            def __init__(self, label):
                self.label = label

            def get_attribute(self, name):
                return self.label if name == "aria-label" else None

            def inner_text(self, timeout=None):
                return self.label

            def is_visible(self):
                return True

            def is_enabled(self):
                return True

        for label in ("探索區域", "前往區域"):
            with self.subTest(label=label):
                self.assertEqual(classify_button(Button(label)), "explore")

    def test_selector_smoke_browser_cleanup_cannot_mask_result(self):
        selector_path = PHASE / "k-ui-selector-20261013/browser-smoke.py"
        spec = importlib.util.spec_from_file_location("phase7_selector_smoke", selector_path)
        selector = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(selector)
        self.assertTrue(hasattr(selector, "close_playwright_resources"),
                        "selector smoke must expose cleanup that cannot escape before status publication")

        class Browser:
            def close(self):
                events.append("browser.close")
                raise RuntimeError("Event loop is closed! Is Playwright already stopped?")

        class Playwright:
            def stop(self):
                events.append("playwright.stop")

        events = []
        status = {"status": "FAIL", "error": "AssertionError: selector check failed"}
        selector.close_playwright_resources(Browser(), Playwright(), status)
        self.assertEqual(events, ["browser.close", "playwright.stop"])
        self.assertEqual(status["status"], "FAIL")
        self.assertEqual(status["error"], "AssertionError: selector check failed")
        self.assertEqual(len(status["cleanupErrors"]), 1)
        self.assertIn("Event loop is closed", status["cleanupErrors"][0])

    def test_selector_inventory_trigger_accepts_shortcut_in_accessible_name(self):
        selector_path = PHASE / "k-ui-selector-20261013/browser-smoke.py"
        spec = importlib.util.spec_from_file_location("phase7_selector_smoke_name", selector_path)
        selector = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(selector)
        self.assertRegex("物品 I", selector.INVENTORY_TRIGGER_NAME)
        self.assertNotRegex("物品箱", selector.INVENTORY_TRIGGER_NAME)

    def test_normal_reload_restores_the_speed_selected_before_the_reload(self):
        class Button:
            def __init__(self, page, name):
                self.page = page
                self.name = name

            def get_attribute(self, name):
                if name != "aria-pressed":
                    return None
                if self.name == "暫停":
                    return str(self.page.speed == 0).lower()
                return str(self.page.speed == int(self.name.removeprefix("×"))).lower()

            def click(self):
                self.page.speed = 0 if self.name == "暫停" else int(self.name.removeprefix("×"))

        class Locator:
            def __init__(self, selector):
                self.selector = selector

            def count(self):
                return 0 if self.selector == "dialog.pixel-window[open]" else 1

        class Page:
            def __init__(self, speed):
                self.speed = speed

            def locator(self, selector):
                return Locator(selector)

            def get_by_role(self, _role, *, name=None, exact=True):
                return Button(self, name or _role)

            def reload(self, **_kwargs):
                # The game starts at ×1 after loading an existing save.
                self.speed = 1

            def evaluate(self, _expression):
                return '{"worldSeed":909,"worldTime":480}'

        class Expectation:
            def __getattr__(self, _name):
                return lambda *_args, **_kwargs: self

        save = {"worldSeed": 909, "worldTime": 480}
        for speed in (0, 1, 5, 20):
            with self.subTest(speed=speed), tempfile.TemporaryDirectory() as temporary:
                page = Page(speed)
                with patch("qa_browser_runner.expect", return_value=Expectation()), \
                     patch("qa_browser_runner.visible_save", return_value=save), \
                     patch("qa_browser_runner.read_save", return_value=save), \
                     patch("qa_browser_runner.core_save_payload", return_value=save), \
                     patch("qa_browser_runner.preserve_reload_baseline", return_value=(
                         '{"worldSeed":909,"worldTime":480}', Path(temporary) / "baseline.json")), \
                     patch("qa_browser_runner.reload_payload_proof", return_value={
                         "accepted": True, "storageRetained": True, "storageRetentionDifferences": {},
                         "runtimeSavedMatchesBaseline": True, "runtimeReloadDifferences": {}}):
                    row = normal_save_reload(page, Path(temporary), {"normalReloadCount": 0}, "contract-speed-restore")

            self.assertEqual(page.speed, speed)
            self.assertEqual(row["worldSpeedBeforeReload"], speed)
            self.assertEqual(row["worldSpeedAfterReload"], 1)
            self.assertEqual(row["worldSpeedRestored"], speed)

    def test_runner_closes_browser_before_playwright_and_preserves_check_failure(self):
        events = []

        class Resource:
            def __init__(self, name, error=None):
                self.name, self.error = name, error

            def close(self):
                events.append(self.name + ".close")
                if self.error:
                    raise RuntimeError(self.error)

            def detach(self):
                events.append(self.name + ".close")

        class Playwright:
            def stop(self):
                events.append("playwright.stop")

        status = {"status": "FAILED", "error": "AssertionError: original check failure"}
        close_runner_resources(
            Resource("cdp"), Resource("context"), Resource("browser", "Event loop is closed"),
            Playwright(), status)
        self.assertEqual(events, ["cdp.close", "context.close", "browser.close", "playwright.stop"])
        self.assertEqual(status["error"], "AssertionError: original check failure")
        self.assertEqual(status["cleanupErrors"], ["browser.close: RuntimeError: Event loop is closed"])

    def test_exhausted_modal_controls_try_safe_close_before_reporting_blocked(self):
        class Button:
            def get_attribute(self, name):
                return "區域" if name == "aria-label" else None

            def inner_text(self, timeout=None):
                return "區域"

            def is_visible(self):
                return True

            def is_enabled(self):
                return True

        class Locator:
            def __init__(self, items=()):
                self.items = list(items)
                self.last = self.items[-1] if self.items else None

            def count(self):
                return len(self.items)

            def nth(self, index):
                return self.items[index]

            def all(self):
                return self.items

        class Dialog:
            def get_by_role(self, _role):
                return Locator([Button()])

        class Page:
            def locator(self, _selector):
                return Locator([Dialog()])

        page = Page()
        with patch("qa_browser_runner.safe_close_dialog", return_value="關閉視窗") as close:
            selected, category, _ = choose_visible_action(page, 1, {}, excluded_labels={"區域"})
        self.assertIsNone(selected)
        self.assertEqual(category, "close_dialog")
        close.assert_called_once_with(page)

    def test_safe_modal_close_still_rejects_ambiguous_notice_close(self):
        class Button:
            clicked = False

            def get_attribute(self, name):
                return "關閉訊息" if name == "aria-label" else None

            def inner_text(self, timeout=None):
                return "關閉訊息"

            def is_visible(self):
                return True

            def is_enabled(self):
                return True

            def click(self):
                self.clicked = True

        class Locator:
            def __init__(self, items=()):
                self.items = list(items)
                self.last = self.items[-1] if self.items else None

            def count(self):
                return len(self.items)

            def all(self):
                return self.items

        class Dialog:
            def get_by_role(self, _role):
                return Locator([button])

        class Page:
            def locator(self, _selector):
                return Locator([Dialog()])

        button = Button()
        self.assertFalse(safe_close_dialog(Page()))
        self.assertFalse(button.clicked)

    def test_clock_only_background_movement_is_not_control_progress(self):
        before = observable_action_state_key("/", ["World"], [], {"worldTime": 2020, "hp": 100})
        after = observable_action_state_key("/", ["World"], [], {"worldTime": 2060, "hp": 100})
        self.assertEqual(before, after)
        self.assertFalse(action_made_progress(before, after, "explore", 2020, 2060))
        self.assertTrue(action_made_progress(before, after, "advance", 2020, 2060))

    def test_action_state_ignores_ambient_ticks_but_tracks_controls_and_player_state(self):
        base = {"activeCharacterId": "p1", "characters": [{"id": "p1", "position": {"x": 2, "y": 3},
            "currentRegion": "village", "inventory": {"potion": 1}, "equipment": {"weapon": None},
            "hp": 100, "stamina": 80, "gold": 20}], "rngState": 12, "worldTime": 200,
            "history": [], "events": [], "npcs": [{"id": "n1", "position": {"x": 4, "y": 5}}]}
        ambient = json.loads(json.dumps(base))
        ambient.update({"rngState": 999, "worldTime": 260, "history": [{"id": 1}],
                        "events": [{"id": 2}], "npcs": [{"id": "n1", "position": {"x": 8, "y": 7}}]})
        surface = ["遊戲地圖"]
        controls = ["區域:explore:enabled", "查看:observe:enabled"]
        first = observable_action_state_key("/world", surface, [], base, controls)
        ticked = observable_action_state_key("/world", surface, [], ambient, controls)
        self.assertEqual(first, ticked)
        self.assertFalse(action_made_progress(first, ticked, "explore", 200, 260))
        moved_player = json.loads(json.dumps(ambient))
        moved_player["characters"][0]["inventory"]["potion"] = 2
        changed_player = observable_action_state_key("/world", surface, [], moved_player, controls)
        self.assertNotEqual(first, changed_player)
        self.assertTrue(action_made_progress(first, changed_player, "explore", 200, 260))
        changed_controls = observable_action_state_key("/world", surface, [], ambient, controls + ["製作:craft:enabled"])
        self.assertNotEqual(first, changed_controls)
        changed_surface = observable_action_state_key("/journal", ["旅人筆記"], [], ambient, controls)
        self.assertNotEqual(first, changed_surface)

    def test_action_chooser_skips_a_control_stalled_in_the_current_ui_state(self):
        class Button:
            def __init__(self, label):
                self.label = label

            def get_attribute(self, name):
                return self.label if name == "aria-label" else None

            def inner_text(self, timeout=None):
                return self.label

            def is_visible(self):
                return True

            def is_enabled(self):
                return True

        class Locator:
            def __init__(self, items=()):
                self.items = list(items)

            def count(self):
                return len(self.items)

            def nth(self, index):
                return self.items[index]

        class Page:
            def __init__(self):
                self.buttons = Locator([Button("探索區域"), Button("查看")])

            def locator(self, _selector):
                return Locator()

            def get_by_role(self, _role):
                return self.buttons

        page = Page()
        status = {}
        state_a = observable_action_state_key("/", "same screen", [], {"worldTime": 2020})
        excluded = update_stalled_controls(status, state_a, "探索區域", progress=False)
        selected, category, _ = choose_visible_action(page, 1, {}, excluded_labels=excluded)
        self.assertEqual((selected.label, category), ("查看", "observe"))
        self.assertEqual(status["noProgressActionCount"], 1)
        self.assertEqual(status["noProgressControls"], ["探索區域"])
        excluded = update_stalled_controls(status, state_a, "查看", progress=False)
        selected, category, _ = choose_visible_action(page, 2, {}, excluded_labels=excluded)
        self.assertIsNone(selected)
        self.assertEqual(category, "observe_blocked")
        state_b = observable_action_state_key("/", "changed screen", [], {"worldTime": 2020})
        excluded = update_stalled_controls(status, state_b)
        self.assertEqual(excluded, set())
        selected, category, _ = choose_visible_action(page, 3, {}, excluded_labels=excluded)
        self.assertEqual((selected.label, category), ("探索區域", "explore"))
        self.assertEqual(status["noProgressControls"], [])

    def test_dialog_close_control_matching_does_not_consume_status_notice_close(self):
        self.assertTrue(is_safe_dialog_close_name("關閉視窗"))
        self.assertTrue(is_safe_dialog_close_name("返回"))
        self.assertFalse(is_safe_dialog_close_name("關閉訊息"))
        self.assertFalse(is_safe_dialog_close_name("儲存世界"))

    def test_wait_for_world_time_advance_passes_playwright_argument_by_keyword(self):
        class FakePage:
            def wait_for_function(self, expression, *, arg=None, timeout=None):
                self.call = (expression, arg, timeout)

        page = FakePage()
        wait_for_world_time_advance(page, 480, timeout=9000)
        self.assertEqual(page.call[1:], (480, 9000))
        self.assertIn("worldTime", page.call[0])

    def test_runner_accepts_only_launcher_owned_files_in_shared_run_directory(self):
        with tempfile.TemporaryDirectory(dir=HERE) as temporary:
            run_dir = Path(temporary)
            validate_run_directory(run_dir)
            (run_dir / "server.log").write_text("")
            (run_dir / "launcher-status.json").write_text("{}")
            (run_dir / "runner.stdout.log").write_text("")
            (run_dir / "runner.stderr.log").write_text("")
            validate_run_directory(run_dir)
            (run_dir / "previous-result.json").write_text("{}")
            with self.assertRaisesRegex(RuntimeError, "unexpected files"):
                validate_run_directory(run_dir)

    def test_default_regression_requires_and_schedules_normal_reload(self):
        self.assertEqual(MODE_DURATION_BOUNDS["regression"][0], 60)
        self.assertTrue(reload_due("regression", 0, False, 300))
        self.assertFalse(reload_due("regression", 59, True, 300))
        self.assertTrue(reload_due("regression", 300, True, 300))
        self.assertFalse(reload_due("stress", 299, False, 300))
        self.assertTrue(reload_due("stress", 300, False, 300))

    def test_core_reload_comparison_excludes_only_timestamp_and_journal(self):
        before = {"worldSeed": 12, "rngState": 34, "worldTime": 56,
                  "characters": [{"inventory": {"ore": 3}, "equipment": {"weapon": "pike"}}],
                  "npcs": [{"id": "npc-1"}], "crops": [{"cropId": "wheat"}],
                  "threat": {"bossAlive": True, "bossForms": ["elder"]},
                  "reward": {"collection": ["fang"]}, "regionalCrisis": {"phase": "warning"},
                  "history": [{"id": 8}], "lastSavedAt": 100,
                  "playJournal": {"pending": [{"id": "a"}]}}
        after = json.loads(json.dumps(before))
        after["lastSavedAt"] = 200
        after["playJournal"] = {"pending": []}
        self.assertEqual(core_save_differences(before, after), {})
        after["worldTime"] += 1
        self.assertEqual(set(core_save_differences(before, after)), {"worldTime"})

    def test_reload_rejects_changed_runtime_even_when_local_storage_is_unchanged(self):
        before = {"worldSeed": 12, "rngState": 34, "worldTime": 56,
                  "npcs": [{"id": "npc-1", "mood": "calm"}]}
        persisted_at_load = json.loads(json.dumps(before))
        runtime_after_visible_save = json.loads(json.dumps(before))
        runtime_after_visible_save["worldTime"] += 7
        runtime_after_visible_save["npcs"][0]["mood"] = "hostile"
        proof = reload_payload_proof(before, persisted_at_load, runtime_after_visible_save)
        self.assertTrue(proof["storageRetained"])
        self.assertFalse(proof["runtimeSavedMatchesBaseline"])
        self.assertEqual(set(proof["runtimeReloadDifferences"]), {"npcs", "worldTime"})
        self.assertFalse(proof["accepted"])

    def test_reload_accepts_runtime_core_match_with_only_documented_metadata_changes(self):
        before = {"worldSeed": 12, "worldTime": 56, "lastSavedAt": 100,
                  "playJournal": {"pending": [{"id": "a"}]}}
        loaded = json.loads(json.dumps(before))
        runtime = json.loads(json.dumps(before))
        loaded["lastSavedAt"] = 150
        runtime["lastSavedAt"] = 200
        runtime["playJournal"] = {"pending": []}
        proof = reload_payload_proof(before, loaded, runtime)
        self.assertTrue(proof["storageRetained"])
        self.assertTrue(proof["runtimeSavedMatchesBaseline"])
        self.assertTrue(proof["accepted"])

    def test_controlled_fixture_requires_expected_target_operation_and_reload_labels(self):
        valid = {"name": "family-boss", "storageState": "boss.json", "sha256": "abc",
                 "expectedVisible": ["巨獸族首領"],
                 "operations": [{"buttonLabel": "挑戰巨獸", "expectedVisibleAfter": "回合制戰鬥"}],
                 "expectedAfterReload": ["回合制戰鬥", "巨獸族首領"]}
        self.assertEqual(validate_controlled_fixture_case(valid)["expectedVisible"], ["巨獸族首領"])
        for field in ("expectedVisible", "operations", "expectedAfterReload"):
            invalid = dict(valid)
            invalid[field] = []
            with self.subTest(field=field), self.assertRaises(ValueError):
                validate_controlled_fixture_case(invalid)

    def test_browser_events_are_written_once_and_status_is_counter_plus_bounded_tail(self):
        class FakePage:
            def evaluate(self, _script):
                return {"writes": [{"elapsedMs": 1.5, "bytes": 12}],
                        "storageErrors": [], "unhandledRejections": [],
                        "longTasks": [{"duration": index + 51} for index in range(20)]}

        status = {"browserEventCounts": {}, "browserEventTails": {}}
        with tempfile.TemporaryDirectory(dir=HERE) as temporary:
            summary = drain_browser_events(FakePage(), Path(temporary), status)
            raw = [json.loads(line) for line in (Path(temporary) / "browser-events.jsonl").read_text().splitlines()]
        self.assertEqual(len(raw), 21)
        self.assertEqual(status["browserEventCounts"], {"saveWrites": 1, "longTasks": 20})
        self.assertEqual(len(status["browserEventTails"]["longTasks"]), 12)
        self.assertEqual(summary["saveWriteLatencyMs"], {"samples": 1, "max": 1.5, "mean": 1.5})


if __name__ == "__main__":
    unittest.main()
