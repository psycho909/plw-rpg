"""Persistence integrity fuzz for the immutable 694c6d7 localhost build."""
from __future__ import annotations

import copy
import hashlib
import json
import re
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from scripts.recorded_reports import write_recorded

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
sys.path.insert(0, str(HERE.parent))
from ui_helpers import ORIGIN, URL, new_page  # noqa: E402

BASELINE = "694c6d76df67e3d3dd4da5aa98feba8581ecc2ba"
SAVE_KEY = "oakvale-v1"
FREEZE_LIVE_LOOP = """(() => {
  const original = window.setInterval;
  window.setInterval = function(callback, delay, ...args) {
    if (delay === 100) return original.call(window, () => {}, delay, ...args);
    return original.call(window, callback, delay, ...args);
  };
})();"""
RESULT_PATH = HERE / "results.json"
SCREENSHOT_DIR = HERE / "artifacts"
SCREENSHOT_DIR.mkdir(exist_ok=True)

RUN: dict = {
    "suite": "comprehensive-playtest-persistence",
    "baseline_commit": BASELINE,
    "url": URL,
    "started_at_utc": datetime.now(timezone.utc).isoformat(),
    "cases": [],
    "page_errors": [],
    "limitations": [
        "Browser checks use disposable Chromium contexts and generated save fixtures only.",
        "No real player profile or production origin is accessed.",
    ],
}


def stamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def persist_results() -> None:
    RUN["finished_at_utc"] = stamp()
    RUN["elapsed_seconds"] = round(time.monotonic() - START_MONO, 3)
    write_recorded(RESULT_PATH, json.dumps(RUN, ensure_ascii=False, indent=2) + "\n", producer="persistence")


def add_case(name: str, status: str, evidence: dict | None = None, error: str | None = None) -> None:
    case = {"name": name, "status": status, "finished_at_utc": stamp()}
    if evidence is not None:
        case["evidence"] = evidence
    if error is not None:
        case["error"] = error
    RUN["cases"].append(case)
    persist_results()


def norm_state(raw: str | dict) -> dict:
    obj = json.loads(raw) if isinstance(raw, str) else copy.deepcopy(raw)
    obj.pop("lastSavedAt", None)
    return obj


def stored_raw(page) -> str:
    return page.evaluate("() => localStorage.getItem('oakvale-v1')")


def raw_for(state: dict, last_saved_at: int | None = None) -> str:
    obj = copy.deepcopy(state)
    obj["lastSavedAt"] = int(time.time() * 1000) if last_saved_at is None else int(last_saved_at)
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def open_seeded(browser, raw: str, *, init_script: str | None = None, pause: bool = True):
    storage_state = {
        "cookies": [],
        "origins": [{"origin": ORIGIN, "localStorage": [{"name": SAVE_KEY, "value": raw}]}],
    }
    context = browser.new_context(storage_state=storage_state, viewport={"width": 1440, "height": 1000})
    if init_script:
        context.add_init_script(init_script)
    page = context.new_page()
    page.on("pageerror", lambda error: RUN["page_errors"].append({"message": str(error), "url": page.url}))
    page.goto(URL, wait_until="networkidle")
    if pause and page.locator("dialog[open]").count() == 0:
        page.get_by_role("button", name="暫停", exact=True).click()
    return context, page


def make_fixture(base: dict, kind: str) -> dict:
    s = copy.deepcopy(base)
    c = next(x for x in s["characters"] if x["id"] == s["activeCharacterId"])
    if kind in {"crop", "fractional_crop", "duplicate_crop"}:
        c["position"] = {"x": 16, "y": 10}
        c["currentRegion"] = "farmland"
        if kind == "crop":
            s["crops"] = [{"id": 101, "plantedAt": s["worldTime"], "growthDuration": 2880,
                           "matureAt": s["worldTime"] + 2880, "status": "growing"}]
        elif kind == "fractional_crop":
            s["crops"] = [{"id": 101, "plantedAt": s["worldTime"], "growthDuration": 2880,
                           "matureAt": s["worldTime"] + 0.5, "status": "growing"}]
        else:
            s["crops"] = [
                {"id": 101, "plantedAt": s["worldTime"] - 2880, "growthDuration": 2880,
                 "matureAt": s["worldTime"], "status": "mature"},
                {"id": 101, "plantedAt": s["worldTime"] - 2880, "growthDuration": 2880,
                 "matureAt": s["worldTime"], "status": "mature"},
            ]
        s["preparedPlots"] = 0
    elif kind == "combat":
        c["status"] = "combat"
        s["combat"] = {"monsterId": "slime", "hp": 18, "maxHp": 18, "attack": 5,
                       "defense": 0, "exp": 15, "gold": 8, "elite": False, "dungeon": False}
    elif kind == "dungeon":
        s["dungeon"].update({"discovered": True, "threat": 1, "progress": 0, "runs": 0,
                             "stage": 1, "inDungeon": True})
    elif kind == "party":
        npc = next(n for n in s["npcs"] if n["isAlive"])
        npc["position"] = copy.deepcopy(c["position"])
        npc["currentActivity"] = "travel"
        s["party"] = [{"npcId": npc["id"], "hireCost": 20, "dailyWage": 4,
                       "contractEnd": s["worldTime"] + 4320, "archetype": "fighter"}]
    elif kind == "dead":
        c.update({"isAlive": False, "hp": 0, "status": "dead", "deathYear": 1, "deathCause": "controlled fixture"})
        s["combat"] = None
        s["dungeon"]["inDungeon"] = False
        s["party"] = []
    return s


def check_baseline() -> dict:
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, check=True, text=True, capture_output=True).stdout.strip()
    baseline_path = REPO / "reports/playtests/20261003-comprehensive/artifacts/baseline.json"
    manifest = json.loads(baseline_path.read_text(encoding="utf-8"))
    selected = ["src/services/saveService.ts", "src/stores/gameStore.ts", "src/engine/simulation.ts", "src/App.vue"]
    hashes = {}
    for rel in selected:
        digest = hashlib.sha256((REPO / rel).read_bytes()).hexdigest()
        hashes[rel] = {"current": digest, "manifest": manifest["source_sha256"][rel],
                       "match": digest == manifest["source_sha256"][rel]}
    if head != BASELINE or manifest["baseline_commit"] != BASELINE:
        raise RuntimeError(f"baseline mismatch: head={head}, hashes={hashes}")
    RUN["baseline_verification"] = {
        "head": head,
        "source_hashes_at_run": hashes,
        "manifest_url": manifest["url"],
        "runtime_source": "fixed localhost production build at 127.0.0.1:5180; checks do not import current source modules",
        "working_tree_source_drift_does_not_change_runtime_target": True,
    }
    return RUN["baseline_verification"]


def test_normal_roundtrip(browser) -> dict:
    context, page = new_page(browser)
    try:
        page.locator(".save-button").click()
        before_raw = stored_raw(page)
        before = norm_state(before_raw)
        page.reload(wait_until="networkidle")
        if page.locator("dialog[open]").count() == 0:
            page.get_by_role("button", name="暫停", exact=True).click()
        after = norm_state(stored_raw(page))
        if before != after:
            raise AssertionError("normal save/reload changed serialized game state")
        return {"exact_state_equal_excluding_lastSavedAt": True,
                "serialized_bytes": len(before_raw.encode()), "offline_prompt": page.locator(".offline-prompt").count()}
    finally:
        context.close()


def test_next_npc_collision(browser, base: dict) -> dict:
    s = copy.deepcopy(base)
    s["worldTime"] = 15 * 1440 - 2
    s["nextNpcId"] = 1  # Existing initial resident npc-1 makes the next immigration collide.
    fixture_raw = raw_for(s)
    context, page = open_seeded(browser, fixture_raw, pause=False)
    try:
        accepted = page.locator(".save-warning").count() == 0
        page.wait_for_timeout(1400)
        clock = page.locator(".world-clock").inner_text()
        page.locator(".save-button").click()
        after_tick_raw = stored_raw(page)
        after_tick = json.loads(after_tick_raw)
        ids = [n["id"] for n in after_tick["npcs"]]
        duplicates = sorted({id_ for id_ in ids if ids.count(id_) > 1})
        duplicate_count = len(ids) - len(set(ids))
        page.screenshot(path=str(SCREENSHOT_DIR / "next-npc-duplicate-before-reload.png"), full_page=True)
        page.reload(wait_until="networkidle")
        rejected_on_reload = page.locator(".save-warning").count() == 1
        warning = page.locator(".save-warning").inner_text() if rejected_on_reload else ""
        raw_after_reload_before_attempt = stored_raw(page)
        page.locator(".save-button").click()
        after_rejected_save = stored_raw(page)
        page.screenshot(path=str(SCREENSHOT_DIR / "next-npc-save-blocked.png"), full_page=True)
        if not (accepted and duplicate_count >= 1 and rejected_on_reload
                and norm_state(after_rejected_save) == norm_state(raw_after_reload_before_attempt)):
            raise AssertionError({"accepted": accepted, "duplicates": duplicates, "duplicate_count": duplicate_count,
                                  "rejected_on_reload": rejected_on_reload, "warning": warning})
        return {"classification": "confirmed_integrity_bug", "accepted_fixture": accepted,
                "trigger": "worldTime advanced 2 minutes across day 15 with nextNpcId=1",
                "clock_after_trigger": clock, "duplicate_ids": duplicates, "duplicate_count": duplicate_count,
                "duplicate_resident_count": len(ids), "save_then_reload_rejected": rejected_on_reload,
                "reload_warning": warning,
                "raw_unchanged_after_rejected_save_excluding_lastSavedAt": norm_state(after_rejected_save) == norm_state(raw_after_reload_before_attempt),
                "save_raw_sha256": hashlib.sha256(after_tick_raw.encode()).hexdigest(),
                "fixture_raw_sha256": hashlib.sha256(fixture_raw.encode()).hexdigest(),
                "reload_raw_sha256_before_rejected_attempt": hashlib.sha256(raw_after_reload_before_attempt.encode()).hexdigest()}
    finally:
        context.close()


def test_duplicate_crop_loss(browser, base: dict) -> dict:
    s = make_fixture(base, "duplicate_crop")
    context, page = open_seeded(browser, raw_for(s))
    try:
        if page.locator(".save-warning").count():
            raise AssertionError("duplicate crop fixture rejected before play")
        before = json.loads(stored_raw(page))
        food_before = before["characters"][0]["inventory"]["food"]
        expect_name = "農田"
        page.locator(".context-action").click()
        page.get_by_role("heading", name=expect_name, exact=True).wait_for()
        page.screenshot(path=str(SCREENSHOT_DIR / "duplicate-crops-before-harvest.png"), full_page=True)
        page.locator("dialog[open]").get_by_role("button", name="收割 · 體力 4／15 分", exact=True).click()
        page.screenshot(path=str(SCREENSHOT_DIR / "duplicate-crops-after-one-harvest.png"), full_page=True)
        page.keyboard.press("Escape")
        page.locator(".save-button").click()
        after = json.loads(stored_raw(page))
        food_after = next(c for c in after["characters"] if c["id"] == after["activeCharacterId"])["inventory"]["food"]
        crops_after = after["crops"]
        if len(before["crops"]) != 2 or len(crops_after) != 0 or food_after != food_before + 5:
            raise AssertionError({"before_crop_count": len(before["crops"]), "after_crop_count": len(crops_after),
                                  "food_before": food_before, "food_after": food_after})
        return {"classification": "confirmed_resource_loss", "fixture": "two mature crops share id=101",
                "accepted_by_load": True, "harvests_recorded": 1, "crops_before": 2, "crops_after": 0,
                "food_yield": food_after - food_before, "one_crop_worth_of_yield_lost": True}
    finally:
        context.close()


def test_fixtures_roundtrip(browser, base: dict, kind: str) -> dict:
    s = make_fixture(base, kind)
    seeded = raw_for(s, int(time.time() * 1000) + 60_000)
    context, page = open_seeded(browser, seeded, init_script=FREEZE_LIVE_LOOP)
    try:
        warning = page.locator(".save-warning").count()
        if warning:
            raise AssertionError(f"valid controlled {kind} fixture rejected")
        if kind == "combat":
            page.get_by_role("heading", name=re.compile("史萊姆")).wait_for()
        elif kind == "dungeon":
            page.locator(".dungeon-scene").wait_for()
        elif kind == "dead":
            page.get_by_role("heading", name="旅程結束，世界繼續").wait_for()
        elif kind == "party":
            page.locator(".party-strip").wait_for()
        elif kind == "crop":
            page.locator(".world-clock").wait_for()
        page.reload(wait_until="networkidle")
        if page.locator("dialog[open]").count() == 0:
            page.get_by_role("button", name="暫停", exact=True).click()
        loaded_raw = stored_raw(page)
        if norm_state(loaded_raw) != norm_state(seeded):
            raise AssertionError(f"{kind} state changed across pagehide/reload")
        return {"controlled_fixture": True, "state_exact_excluding_lastSavedAt": True,
                "dialog_after_reload": page.locator("dialog[open]").count(), "pagehide_save_preserved_fixture": True}
    finally:
        context.close()


def test_fractional_crop_continues(browser, base: dict) -> dict:
    s = make_fixture(base, "fractional_crop")
    context, page = open_seeded(browser, raw_for(s, int(time.time() * 1000) + 60_000))
    try:
        if page.locator(".save-warning").count():
            raise AssertionError("fractional matureAt fixture was rejected")
        page.get_by_role("button", name="×1", exact=True).click()
        page.wait_for_timeout(1200)
        page.get_by_role("button", name="暫停", exact=True).click()
        page.locator(".save-button").click()
        saved = json.loads(stored_raw(page))
        active = next(c for c in saved["characters"] if c["id"] == saved["activeCharacterId"])
        if not (saved["worldTime"] > s["worldTime"] and isinstance(saved["worldTime"], int)
                and saved["crops"][0]["status"] == "mature"):
            raise AssertionError({"worldTime": saved["worldTime"], "crop": saved["crops"][0]})
        page.reload(wait_until="networkidle")
        if page.locator("dialog[open]").count() == 0:
            page.get_by_role("button", name="暫停", exact=True).click()
        after = json.loads(stored_raw(page))
        if page.locator(".save-warning").count() or after["crops"][0]["status"] != "mature":
            raise AssertionError("post-maturity save was not accepted on reload")
        return {"controlled_fixture": True, "fractional_matureAt_accepted": True,
                "worldTime_after_simulation": saved["worldTime"], "worldTime_is_integer": True,
                "crop_status_after_simulation": saved["crops"][0]["status"],
                "active_food": active["inventory"]["food"], "reloaded_without_save_warning": True,
                "no_fractional_clock_or_continuation_failure": True}
    finally:
        context.close()


def test_rejected_raws_preserved(browser, base: dict) -> dict:
    cases: list[tuple[str, str]] = [("invalid_json", "{")]
    for name in ["unsupported_version", "missing_field", "fractional_prepared_plots", "duplicate_person_id",
                 "missing_active_id", "invalid_position", "invalid_dungeon_stage", "combat_dungeon_mismatch",
                 "invalid_saved_timestamp"]:
        s = copy.deepcopy(base)
        if name == "unsupported_version":
            s["saveVersion"] = 99
        elif name == "missing_field":
            del s["npcs"]
        elif name == "fractional_prepared_plots":
            s["preparedPlots"] = 0.5
        elif name == "duplicate_person_id":
            s["npcs"][0]["id"] = s["characters"][0]["id"]
        elif name == "missing_active_id":
            s["activeCharacterId"] = "missing-character"
        elif name == "invalid_position":
            s["characters"][0]["position"]["x"] = 24
        elif name == "invalid_dungeon_stage":
            s["dungeon"].update({"stage": 3, "inDungeon": True})
        elif name == "combat_dungeon_mismatch":
            s["combat"] = {"monsterId": "slime", "hp": 18, "maxHp": 18, "attack": 5,
                            "defense": 0, "exp": 15, "gold": 8, "elite": False, "dungeon": True}
        raw = raw_for(s)
        if name == "invalid_saved_timestamp":
            payload = json.loads(raw)
            payload["lastSavedAt"] = "not-a-time"
            raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        cases.append((name, raw))
    evidence = []
    for name, raw in cases:
        context, page = open_seeded(browser, raw)
        try:
            warning = page.locator(".save-warning")
            if warning.count() != 1:
                raise AssertionError(f"{name} was accepted; save warning absent")
            before = stored_raw(page)
            page.locator(".save-button").click()
            page.evaluate("() => window.dispatchEvent(new PageTransitionEvent('pagehide'))")
            after = stored_raw(page)
            if before != raw or after != raw:
                raise AssertionError(f"{name} raw changed during load/save/pagehide")
            evidence.append({"case": name, "rejected": True, "raw_preserved_byte_for_byte": True,
                             "raw_bytes": len(raw.encode("utf-8")),
                             "raw_sha256": hashlib.sha256(raw.encode()).hexdigest()})
        finally:
            context.close()
    return {"rejected_count": len(evidence), "cases": evidence}


def test_large_record_policy(browser, base: dict) -> dict:
    s = copy.deepcopy(base)
    s["characters"][0]["name"] = "L" * (256 * 1024)
    raw = raw_for(s)
    context, page = open_seeded(browser, raw)
    try:
        if page.locator(".save-warning").count():
            raise AssertionError("256 KiB name record unexpectedly rejected")
        page.locator(".save-button").click()
        saved = stored_raw(page)
        return {"raw_bytes": len(raw.encode()), "large_record_accepted": True,
                "manual_save_succeeded": saved is not None and len(saved.encode()) > 250_000,
                "save_warning": page.locator(".save-warning").count(),
                "policy_note": "The validator has no general raw-record byte-size limit; this sub-MiB record loads and saves."}
    finally:
        context.close()


def context_raw(context) -> str | None:
    state = context.storage_state()
    for origin in state.get("origins", []):
        if origin.get("origin") == ORIGIN:
            for item in origin.get("localStorage", []):
                if item.get("name") == SAVE_KEY:
                    return item.get("value")
    return None


def test_storage_failures(browser, base: dict) -> dict:
    fixed_now = 1791000000000
    date_script = f"(() => {{ Date.now = () => {fixed_now}; }})();"
    set_failure_script = """(() => {
      const original = Storage.prototype.setItem;
      window.__failOakvaleWrites = true;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'oakvale-v1' && window.__failOakvaleWrites)
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    })();"""
    set_script = date_script + "\n" + set_failure_script
    valid_raw = raw_for(base, fixed_now)
    context, page = open_seeded(browser, valid_raw, init_script=set_script)
    try:
        page.locator(".save-button").click()
        save_error_visible = "存檔失敗" in page.locator(".save-warning").inner_text()
        unchanged_after_manual = stored_raw(page) == valid_raw
        page.wait_for_timeout(10_300)  # Cross the real 10 s autosave interval while quota writes keep failing.
        unchanged_after_autosave = stored_raw(page) == valid_raw
        page.evaluate("() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }")
        unchanged_after_visibility = stored_raw(page) == valid_raw
        page.evaluate("() => window.dispatchEvent(new PageTransitionEvent('pagehide'))")
        unchanged_after_pagehide = stored_raw(page) == valid_raw
        page.evaluate("() => { window.__failOakvaleWrites = false; }")
        page.locator(".save-warning").get_by_role("button", name="重試存檔", exact=True).click()
        recovered = page.locator(".save-warning").count() == 0
        recovered_raw = stored_raw(page)
        if not (save_error_visible and unchanged_after_manual and unchanged_after_autosave
                and unchanged_after_visibility and unchanged_after_pagehide and recovered):
            raise AssertionError({"visible": save_error_visible, "manual": unchanged_after_manual,
                                  "autosave": unchanged_after_autosave, "visibility": unchanged_after_visibility,
                                  "pagehide": unchanged_after_pagehide, "recovered": recovered})
        set_item_evidence = {"quota_error_visible": save_error_visible,
                             "raw_preserved_after_manual_autosave_visibility_pagehide": True,
                             "recovered_on_same_page": recovered,
                             "recovered_record_bytes": len(recovered_raw.encode()),
                             "recovery_raw_sha256": hashlib.sha256(recovered_raw.encode()).hexdigest()}
    finally:
        context.close()

    failures = {
        "getItem_throw": "(() => { const original=Storage.prototype.getItem; Storage.prototype.getItem=function(key) { if (key==='oakvale-v1') throw new DOMException('blocked','SecurityError'); return original.call(this,key); }; })();",
        "storage_unavailable": "(() => { Object.defineProperty(window,'localStorage',{configurable:true,get(){ throw new DOMException('blocked','SecurityError'); }}); })();",
    }
    other = []
    for name, failure in failures.items():
        context, page = open_seeded(browser, valid_raw, init_script=date_script + "\n" + failure)
        try:
            if page.locator(".save-warning").count() != 1:
                raise AssertionError(f"{name} did not raise a persistent protection warning")
            page.locator(".save-button").click()
            page.evaluate("() => window.dispatchEvent(new PageTransitionEvent('pagehide'))")
            persisted = context_raw(context)
            if persisted != valid_raw:
                raise AssertionError(f"{name} overwrote the original localStorage value")
            other.append({"case": name, "protected": True, "raw_preserved_byte_for_byte": True})
        finally:
            context.close()
    return {"quota_setItem": set_item_evidence, "getItem_and_unavailable": other}


def test_offline_cases(browser, base: dict) -> dict:
    now_ms = 1791000000000
    now_script = f"(() => {{ Date.now = () => {now_ms}; }})();\n" + FREEZE_LIVE_LOOP
    vectors = [
        ("zero", 0, 0),
        ("negative_elapsed", -1000, 0),
        ("future_timestamp", -24 * 3600000, 0),
        ("one_second", 1000, 2),
        ("eight_hours", 8 * 3600000, 57600),
        ("above_eight_hours", 30 * 3600000, 57600),
    ]
    evidence = []
    for name, elapsed_ms, expected_minutes in vectors:
        raw = raw_for(base, now_ms - elapsed_ms)
        context, page = open_seeded(browser, raw, init_script=now_script)
        try:
            if page.locator(".save-warning").count():
                raise AssertionError(f"{name} valid base record rejected")
            page.locator(".save-button").click()
            saved_raw = stored_raw(page)
            saved = json.loads(saved_raw)
            delta = saved["worldTime"] - base["worldTime"]
            if delta != expected_minutes:
                raise AssertionError(f"{name}: expected {expected_minutes} game minutes, saw {delta}")
            prompt = page.locator(".offline-prompt").count()
            page.reload(wait_until="networkidle")
            if page.locator("dialog[open]").count() == 0:
                page.get_by_role("button", name="暫停", exact=True).click()
            reread_raw = stored_raw(page)
            reread = json.loads(reread_raw)
            second_delta = reread["worldTime"] - saved["worldTime"]
            if second_delta != 0:
                raise AssertionError(f"{name}: reload applied offline time twice ({second_delta})")
            evidence.append({"case": name, "elapsed_ms": elapsed_ms, "expected_and_observed_game_minutes": delta,
                             "offline_prompt_visible_before_save": bool(prompt),
                             "second_reload_double_count_minutes": second_delta,
                             "state_after_manual_save_and_reload_equal": norm_state(saved) == norm_state(reread)})
        finally:
            context.close()
    return {"vectors": evidence, "all_capped_and_single_counted": True}


def main() -> None:
    global START_MONO
    START_MONO = time.monotonic()
    check_baseline()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
        try:
            context, page = new_page(browser)
            try:
                page.locator(".save-button").click()
                base = norm_state(stored_raw(page))
            finally:
                context.close()
            for name, fn in [
                ("normal_ui_save_reload", lambda: test_normal_roundtrip(browser)),
                ("accepted_nextNpcId_collision_bricks_reload", lambda: test_next_npc_collision(browser, base)),
                ("accepted_duplicate_crop_id_loses_crop", lambda: test_duplicate_crop_loss(browser, base)),
            ]:
                try:
                    evidence = fn()
                    status = evidence.get("classification", "passed")
                    add_case(name, status, evidence)
                except Exception as e:
                    add_case(name, "failed_to_reproduce", {"traceback": traceback.format_exc()}, str(e))
            for kind in ["crop", "combat", "dungeon", "party", "dead"]:
                try:
                    add_case(f"fixture_roundtrip_{kind}", "passed", test_fixtures_roundtrip(browser, base, kind))
                except Exception as e:
                    add_case(f"fixture_roundtrip_{kind}", "failed", {"traceback": traceback.format_exc()}, str(e))
            checks = [
                ("fractional_crop_continuation", lambda: test_fractional_crop_continues(browser, base)),
                ("rejected_raws_preserved", lambda: test_rejected_raws_preserved(browser, base)),
                ("large_record_policy", lambda: test_large_record_policy(browser, base)),
                ("storage_failure_autosave_visibility_pagehide_recovery", lambda: test_storage_failures(browser, base)),
                ("offline_elapsed_vectors_and_single_count", lambda: test_offline_cases(browser, base)),
            ]
            for name, fn in checks:
                try:
                    evidence = fn()
                    status = evidence.get("classification", "passed")
                    add_case(name, status, evidence)
                except Exception as e:
                    add_case(name, "failed", {"traceback": traceback.format_exc()}, str(e))
        finally:
            browser.close()
    RUN["page_errors"] = RUN.get("page_errors", [])
    persist_results()


if __name__ == "__main__":
    main()
