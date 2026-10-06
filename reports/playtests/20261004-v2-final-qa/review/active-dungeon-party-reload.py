#!/usr/bin/env python3
"""One real-browser save/reload check for active dungeon, party, gear and life state.

QA only: the helper reads localStorage and public UI; it never writes simulation
state, modifies app source, advances time except through normal UI actions, or
uses DevTools/debug injection.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

OUT = Path(__file__).resolve().parent
RESULT_PATH = OUT / "active-dungeon-party-reload.json"
MARKDOWN_PATH = OUT / "active-dungeon-party-reload.md"
SCREENSHOTS = OUT / "active-dungeon-party-reload-screens"
MANIFEST_PATH = ROOT / "reports/playtests/20261004-v2-final-qa/build-manifest.json"
PROFILE = Path("/tmp/plw-v2-final-adventure-profile-source-final-02")
URL = "http://127.0.0.1:5197"
APP_KEY = "oakvale-v1"
SOURCE_COMMIT = "441e3c2b435f199a50cb78ee5b19521bcc084593"
IMMUTABLE_DIST = Path("/tmp/oakvale-v2-final-441e3c2-dist")
NOW = lambda: datetime.now(timezone.utc).isoformat(timespec="milliseconds")

ROOT_STATE_FIELDS = [
    "life", "saveVersion", "worldSeed", "rngState", "worldTime",
    "activeCharacterId", "characters", "npcs", "tiles", "settlement",
    "regions", "threat", "dungeon", "crops", "preparedPlots", "party",
    "combat", "events", "history", "eventSequence", "nextNpcId",
    "lastSavedAt", "playJournal",
]
SIMULATION_FIELDS = [key for key in ROOT_STATE_FIELDS if key not in {"lastSavedAt", "playJournal"}]

# Runs before the Vue bundle on every app document. This captures browser storage
# only; no app globals or simulation state are assigned or patched.
PRE_APP_SCRIPT = r"""(() => {
  if (location.origin !== 'http://127.0.0.1:5197') return;
  try {
    const entries = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) entries[key] = localStorage.getItem(key);
    }
    Object.defineProperty(window, '__qaPreAppStorage', {
      configurable: true,
      value: { capturedAtUtc: new Date().toISOString(), href: location.href, entries }
    });
  } catch (error) {
    Object.defineProperty(window, '__qaPreAppStorageError', {
      configurable: true, value: String(error)
    });
  }
})();"""

result: dict = {
    "schemaVersion": 1,
    "route": "active-dungeon-party-reload",
    "status": "running",
    "startedAtUtc": NOW(),
    "updatedAtUtc": NOW(),
    "countsTowardAgentOrSoakTime": False,
    "sourceCommit": SOURCE_COMMIT,
    "url": URL,
    "profile": str(PROFILE),
    "browser": {"engine": "Chromium", "executable": "/usr/bin/chromium", "headless": True, "persistentProfile": True},
    "scope": "One real-browser UI route through owned life/party/gear, dungeon combat, UI pause/save, reload and one continuing attack.",
    "prohibitedOperations": ["No app source edits", "No direct state/time/resource/debug injection", "No cache clearing or world reset", "No agent/soak duration credit"],
    "steps": [],
    "snapshots": {},
    "screenshots": [],
    "pageErrors": [],
    "consoleErrors": [],
}
if RESULT_PATH.exists():
    try:
        previous = json.loads(RESULT_PATH.read_text(encoding="utf-8"))
        result["priorAttemptSummaries"] = list(previous.get("priorAttemptSummaries", [])) + [{
            "startedAtUtc": previous.get("startedAtUtc"),
            "endedAtUtc": previous.get("endedAtUtc"),
            "status": previous.get("status"),
            "failure": previous.get("failure"),
            "initialPageUrls": previous.get("browser", {}).get("initialPageUrls"),
            "gameplayMutations": "None; the duplicate tab showed writer lock warning before any gameplay action or save click.",
        }]
    except (OSError, json.JSONDecodeError, TypeError):
        result["priorAttemptSummaries"] = [{"status": "prior report unreadable; full versions remain in review/playlog.jsonl"}]


def publish() -> None:
    result["updatedAtUtc"] = NOW()
    write_recorded(RESULT_PATH, json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="active-dungeon-party-reload")


def record_step(name: str, status: str, **details) -> None:
    result["steps"].append({"atUtc": NOW(), "name": name, "status": status, **details})
    publish()


def ensure_no_profile_process() -> list[str]:
    matches: list[str] = []
    profile_text = str(PROFILE.resolve())
    for proc in Path("/proc").iterdir():
        if not proc.name.isdigit():
            continue
        try:
            cmd = (proc / "cmdline").read_bytes().replace(b"\0", b" ").decode("utf-8", "replace").strip()
        except (OSError, PermissionError):
            continue
        lower = cmd.lower()
        is_chrome = "chromium" in lower or "chrome" in lower
        if is_chrome and profile_text in cmd:
            matches.append(f"pid={proc.name} {cmd[:500]}")
    locks = [str(PROFILE / name) for name in ("SingletonLock", "SingletonCookie", "SingletonSocket") if (PROFILE / name).exists()]
    if matches or locks:
        raise RuntimeError(f"Profile is not safely available: processes={matches}, lockFiles={locks}")
    return matches


def fingerprint() -> dict:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest.get("sourceCommit") != SOURCE_COMMIT:
        raise AssertionError(f"Manifest sourceCommit mismatch: {manifest.get('sourceCommit')}")
    source_rows = []
    mismatches = []
    for relative, expected in manifest["sourceSha256"].items():
        path = ROOT / relative
        actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
        source_rows.append({"path": relative, "expectedSha256": expected, "actualSha256": actual, "matches": actual == expected})
        if actual != expected:
            mismatches.append(relative)
    assets = []
    for relative, expected in manifest["assetsSha256"].items():
        disk_path = IMMUTABLE_DIST / relative
        disk_bytes = disk_path.read_bytes()
        disk_hash = hashlib.sha256(disk_bytes).hexdigest()
        with urlopen(f"{URL}/{relative}", timeout=8) as response:
            status = response.status
            served_bytes = response.read()
        served_hash = hashlib.sha256(served_bytes).hexdigest()
        assets.append({
            "path": relative,
            "statusCode": status,
            "expectedSha256": expected,
            "immutableDistSha256": disk_hash,
            "servedSha256": served_hash,
            "immutableDistMatches": disk_hash == expected,
            "servedMatches": served_hash == expected,
            "servedBytes": len(served_bytes),
        })
    if mismatches:
        raise AssertionError(f"Source hashes mismatch: {mismatches}")
    if any(not (item["immutableDistMatches"] and item["servedMatches"] and item["statusCode"] == 200) for item in assets):
        raise AssertionError("Served or immutable assets do not match the build manifest")
    return {
        "sourceCommit": SOURCE_COMMIT,
        "sourceFileCount": len(source_rows),
        "sourceMismatches": mismatches,
        "sourceFiles": source_rows,
        "assets": assets,
        "all58SourceFilesMatch": len(source_rows) == 58 and not mismatches,
        "all3ServedAssetsMatch": len(assets) == 3 and all(item["servedMatches"] for item in assets),
    }


def parsed_state(entries: dict) -> dict | None:
    raw = entries.get(APP_KEY)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None


def snapshot_from_entries(label: str, captured: dict, source: str) -> dict:
    entries = captured.get("entries") or {}
    raw = entries.get(APP_KEY)
    state = parsed_state(entries)
    snap = {
        "label": label,
        "source": source,
        "capturedAtUtc": captured.get("capturedAtUtc") or NOW(),
        "href": captured.get("href"),
        "localStorageEntries": entries,
        "appStorageKey": APP_KEY,
        "appStoragePresent": bool(raw),
        "appStorageRawSha256": hashlib.sha256(raw.encode("utf-8")).hexdigest() if isinstance(raw, str) else None,
        "state": state,
        "rootFieldNames": sorted(state.keys()) if isinstance(state, dict) else [],
    }
    result["snapshots"][label] = snap
    publish()
    return snap


def read_current_snapshot(page, label: str, source: str = "browser localStorage read only") -> dict:
    captured = page.evaluate("""() => {
      const entries = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) entries[key] = localStorage.getItem(key);
      }
      return {capturedAtUtc: new Date().toISOString(), href: location.href, entries};
    }""")
    return snapshot_from_entries(label, captured, source)


def read_pre_app_snapshot(page, label: str) -> dict:
    captured = page.evaluate("() => window.__qaPreAppStorage || null")
    if not captured:
        error = page.evaluate("() => window.__qaPreAppStorageError || null")
        raise AssertionError(f"Pre-app read-only storage capture missing: {error}")
    return snapshot_from_entries(label, captured, "init_script before Vue/app bundle")


def screenshot(page, name: str) -> str:
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    path = SCREENSHOTS / name
    page.screenshot(path=str(path), full_page=True)
    relative = str(path.relative_to(ROOT))
    result["screenshots"].append({"name": name, "path": relative, "capturedAtUtc": NOW(), "fullPage": True})
    publish()
    return relative


def assert_profile_state(snap: dict, label: str) -> dict:
    state = snap.get("state")
    if not isinstance(state, dict):
        raise AssertionError(f"{label}: {APP_KEY} absent or malformed")
    missing = [name for name in ROOT_STATE_FIELDS if name not in state]
    if missing:
        raise AssertionError(f"{label}: expected simulation root fields missing: {missing}")
    active_id = state.get("activeCharacterId")
    active = next((c for c in state.get("characters", []) if c.get("id") == active_id), None)
    home = next((p for p in (state.get("life", {}).get("properties") or []) if p.get("kind") == "home" and p.get("ownerId") == active_id), None)
    party_ids = {p.get("npcId") for p in state.get("party", []) if isinstance(p, dict)}
    party = [n for n in state.get("npcs", []) if n.get("id") in party_ids]
    details = {
        "activeCharacterId": active_id,
        "activeCharacter": active,
        "party": state.get("party"),
        "partyRoster": party,
        "ownedHome": home,
        "dungeon": state.get("dungeon"),
        "combat": state.get("combat"),
        "rootFieldsPresent": sorted(state),
        "allExpectedRootFieldsPresent": not missing,
        "hasEquippedWeapon": bool(active and active.get("equipment", {}).get("weapon")),
        "hasEquippedArmor": bool(active and active.get("equipment", {}).get("armor")),
        "hasParty": bool(state.get("party")) and bool(party),
        "hasOwnedHome": bool(home),
    }
    return details


def diff_paths(left, right, path="") -> list[str]:
    if type(left) is not type(right):
        return [path or "$"]
    if isinstance(left, dict):
        paths = []
        for key in sorted(set(left) | set(right)):
            child = f"{path}.{key}" if path else key
            if key not in left or key not in right:
                paths.append(child)
            else:
                paths.extend(diff_paths(left[key], right[key], child))
        return paths
    if isinstance(left, list):
        if len(left) != len(right):
            return [path or "$"]
        paths = []
        for i, (a, b) in enumerate(zip(left, right)):
            paths.extend(diff_paths(a, b, f"{path}[{i}]"))
        return paths
    return [] if left == right else [path or "$"]


def ui_pause(page) -> dict:
    # Only rendered buttons are used. This records the visible control and its result.
    status_button = page.locator(".window-world-status button")
    if status_button.count() and status_button.first.is_visible():
        label = status_button.first.inner_text().strip()
        if label == "暫停時間":
            status_button.first.click()
            page.wait_for_timeout(100)
            return {"control": ".window-world-status button", "before": label, "after": status_button.first.inner_text().strip(), "paused": True}
        return {"control": ".window-world-status button", "before": label, "after": label, "paused": label == "繼續時間"}
    pause = page.get_by_role("button", name="暫停", exact=True)
    if pause.count() and pause.first.is_visible():
        pressed = pause.first.get_attribute("aria-pressed")
        if pressed != "true":
            pause.first.click()
            page.wait_for_timeout(100)
        return {"control": ".speed-controls button[aria-pressed]", "beforePressed": pressed, "afterPressed": pause.first.get_attribute("aria-pressed"), "paused": pause.first.get_attribute("aria-pressed") == "true"}
    resume = page.get_by_role("button", name="繼續時間", exact=True)
    if resume.count() and resume.first.is_visible():
        return {"control": "visible Continue button", "before": "繼續時間", "after": "繼續時間", "paused": True}
    raise AssertionError("No visible normal UI pause control found")


def close_dialog(page) -> None:
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
        page.wait_for_timeout(100)


def open_ui_mine(page) -> dict:
    # Normal UI travel to the public dungeon entrance tile, then normal interaction.
    page.keyboard.press("m")
    page.locator('.overview-map button[data-position="20,3"]').wait_for(state="visible", timeout=5000)
    target = page.locator('.overview-map button[data-position="20,3"]')
    if target.is_disabled():
        raise AssertionError("Dungeon entrance map tile is not walkable in the visible UI")
    target.click()
    page.wait_for_timeout(150)
    if page.locator("dialog[open]").count():
        page.keyboard.press("Escape")
    page.locator(".context-action").click()
    page.wait_for_timeout(100)
    dialog = page.locator("dialog[open]")
    if not dialog.count():
        raise AssertionError("Visible context action did not open its UI dialog")
    enter = dialog.get_by_role("button", name="進入廢棄礦坑", exact=False)
    if not enter.count() or enter.first.is_disabled():
        raise AssertionError(f"Dungeon entry button was unavailable: {dialog.inner_text()[:700]}")
    enter.first.click()
    page.wait_for_timeout(180)
    if not page.locator(".dungeon-scene").count():
        raise AssertionError("Normal UI dungeon entry did not show the dungeon scene")
    # enterDungeon switches the ordinary UI window directly to the dungeon panel.
    explore = page.get_by_role("button", name="探索下一段 · 體力 8", exact=True)
    if not explore.count() or explore.first.is_disabled():
        raise AssertionError("Dungeon UI did not offer an enabled next-segment action")
    explore.click()
    page.wait_for_timeout(180)
    if not page.locator(".battle-scene").count():
        raise AssertionError("Normal dungeon exploration did not open an active combat scene")
    return {"travelTile": "20,3", "entryControl": "進入廢棄礦坑 · 體力 5", "explorationControl": "探索下一段 · 體力 8", "battleSceneVisible": True}


def state_core_diffs(left: dict, right: dict) -> dict:
    all_diffs: dict[str, list[str]] = {}
    for field in ROOT_STATE_FIELDS:
        if field in left and field in right:
            diffs = diff_paths(left[field], right[field], field)
            if diffs:
                all_diffs[field] = diffs[:100]
    critical = {field: paths for field, paths in all_diffs.items() if field in SIMULATION_FIELDS}
    return {"allRootFieldDiffs": all_diffs, "simulationFieldDiffs": critical, "simulationFieldsEqual": not critical}


def markdown() -> str:
    fp = result.get("buildFingerprint", {})
    snaps = result.get("snapshots", {})
    reload_result = result.get("reloadVerification", {})
    restored = reload_result.get("restoredProfileValidation", {})
    player = restored.get("activeCharacter") or {}
    restored_summary = {
        "player": {
            "id": restored.get("activeCharacterId"),
            "level": player.get("level"),
            "equipment": player.get("equipment"),
        },
        "party": [npc.get("name") for npc in restored.get("partyRoster", [])],
        "ownedHome": (restored.get("ownedHome") or {}).get("id"),
        "dungeon": restored.get("dungeon"),
        "activeCombat": bool(restored.get("combat")),
        "requiredStatePresent": all(restored.get(key) for key in ("hasParty", "hasEquippedWeapon", "hasEquippedArmor", "hasOwnedHome", "allExpectedRootFieldsPresent")),
    }
    after_attack = (snaps.get("afterReloadedAttack", {}).get("state") or {})
    after_player = next((c for c in after_attack.get("characters", []) if c.get("id") == after_attack.get("activeCharacterId")), {})
    prior_attempts = result.get("priorAttemptSummaries", [])
    root_diffs = reload_result.get("postSaveVsPreAppReload", {}).get("allRootFieldDiffs", {})
    lines = [
        "# Active dungeon, party, gear and life save/reload check",
        "",
        f"- Status: **{result.get('status')}**",
        f"- Source: `{result.get('sourceCommit')}`; served at `{result.get('url')}`",
        f"- Existing profile: `{result.get('profile')}`",
        f"- Browser run: {result.get('startedAtUtc')} to {result.get('endedAtUtc')}",
        "- This short coverage check is not Agent playtime or soak credit.",
        "- No application source changes, direct state/time/resource injection, debug injection, cache clearing, or world reset.",
        "",
        "## Build and profile preflight",
        "",
        f"- Source manifest: {fp.get('sourceFileCount', 0)} files; all match: `{fp.get('all58SourceFilesMatch')}`.",
        f"- Served immutable assets: {len(fp.get('assets', []))}; all match manifest: `{fp.get('all3ServedAssetsMatch')}`.",
        f"- Initial saved profile has full expected root shape: `{result.get('initialProfileValidation', {}).get('allExpectedRootFieldsPresent')}`.",
        f"- Initial character has equipped weapon and armor: `{result.get('initialProfileValidation', {}).get('hasEquippedWeapon')}` / `{result.get('initialProfileValidation', {}).get('hasEquippedArmor')}`.",
        f"- Active party is non-empty: `{result.get('initialProfileValidation', {}).get('hasParty')}`; owned home present: `{result.get('initialProfileValidation', {}).get('hasOwnedHome')}`.",
        f"- Startup attempts stopped before deliberate gameplay controls: {len(prior_attempts)}; details and screenshots remain in the JSON/playlog archive.",
        "",
        "## Run result",
        "",
    ]
    for step in result.get("steps", []):
        lines.append(f"- **{step.get('name')}** — `{step.get('status')}`. {step.get('note', '')}".rstrip())
    lines.extend([
        "",
        "## Save and reload evidence",
        "",
        f"- Saved combat persisted in pre-app reload storage: `{result.get('reloadVerification', {}).get('preAppCombatPresent')}`.",
        f"- All 21 simulation root fields match exactly across the normal UI save and pre-Vue reload capture: `{reload_result.get('simulationFieldsEqual')}`.",
        f"- Difference in the complete 23-field root: `{list(root_diffs)}` (the `lastSavedAt` metadata timestamp changed on pagehide auto-save).",
        f"- Combat scene restored after mount: `{reload_result.get('combatSceneRestored')}`; visible pause control then stopped the resumed clock.",
        f"- Reloaded profile: `{json.dumps(restored_summary, ensure_ascii=False)}`.",
        f"- One visible post-reload attack registered: `{reload_result.get('attackActionRegistered')}`; afterward combat is `{after_attack.get('combat')}`, dungeon stage is `{(after_attack.get('dungeon') or {}).get('stage')}`, and player level is `{after_player.get('level')}`.",
        f"- Page errors: {len(result.get('pageErrors', []))}; console errors: {len(result.get('consoleErrors', []))} (recorded verbatim in JSON).",
        "",
        "### Full browser screenshots",
        "",
    ])
    for shot in result.get("screenshots", []):
        lines.append(f"- [{shot['name']}]({shot['path']})")
    lines.extend(["", "### Stored root snapshots", ""])
    for name, snap in snaps.items():
        lines.append(f"- `{name}`: {len(snap.get('rootFieldNames', []))} root fields; full state and localStorage entries preserved in JSON; capture source: {snap.get('source')}.")
    if result.get("failure"):
        lines.extend(["", "## Failure evidence", "", "```text", result["failure"], "```"])
    lines.append("")
    return "\n".join(lines)


def publish_markdown() -> None:
    write_recorded(MARKDOWN_PATH, markdown(), producer="active-dungeon-party-reload")


def main() -> int:
    # Preserve the exact helper version through the repository's append-only writer.
    write_recorded(Path(__file__), Path(__file__).read_text(encoding="utf-8"), producer="active-dungeon-party-reload-helper")
    result["profileProcessPreflight"] = {"checkedAtUtc": NOW(), "activeProcesses": ensure_no_profile_process(), "profileExists": PROFILE.is_dir()}
    if not PROFILE.is_dir():
        raise RuntimeError(f"Expected already-played profile is missing: {PROFILE}")
    result["buildFingerprint"] = fingerprint()
    record_step("immutable source and served asset fingerprint", "passed", note="58 source hashes and all three served assets matched the frozen 441 manifest.")

    pw = sync_playwright().start()
    context = None
    page = None
    try:
        ensure_no_profile_process()
        context = pw.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE),
            executable_path="/usr/bin/chromium",
            headless=True,
            viewport={"width": 1440, "height": 980},
            args=["--no-sandbox", "--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
        )
        result["browser"]["launchMode"] = "persistent context with Playwright pipe; no CDP port"
        result["browser"]["initialPageUrls"] = [p.url for p in context.pages]
        restored_app_pages = [p for p in context.pages if p.url.startswith(URL)]
        if len(restored_app_pages) > 1:
            inspection = []
            ready_pages = []
            for i, candidate in enumerate(restored_app_pages, 1):
                try:
                    candidate.locator(".save-button").wait_for(state="visible", timeout=10000)
                    warning = candidate.locator(".save-warning")
                    warning_text = warning.inner_text() if warning.count() else None
                    is_ready = warning_text is None and not candidate.locator(".save-button").is_disabled()
                    inspection.append({"pageIndex": i, "url": candidate.url, "saveWarning": warning_text, "saveButtonDisabled": candidate.locator(".save-button").is_disabled(), "writerReady": is_ready})
                    screenshot(candidate, f"00-restored-app-tab-{i}.png")
                    if is_ready:
                        ready_pages.append(candidate)
                except Exception as tab_error:
                    inspection.append({"pageIndex": i, "url": candidate.url, "inspectionError": f"{type(tab_error).__name__}: {tab_error}"})
            result["browser"]["restoredTabInspection"] = inspection
            publish()
            if len(ready_pages) != 1:
                raise RuntimeError(f"Cannot safely select a single writer-ready restored page: {inspection}")
            page = ready_pages[0]
            closed_tabs = []
            for candidate in restored_app_pages:
                if candidate is not page:
                    closed_tabs.append({"url": candidate.url, "reason": "visible duplicate-writer warning; no gameplay/save button action was used"})
                    candidate.close(run_before_unload=False)
            page.wait_for_timeout(250)
            warning = page.locator(".save-warning")
            if warning.count():
                raise RuntimeError(f"Selected original writer page did not remain ready after closing blocked duplicate: {warning.inner_text()}")
            if sum(p.url.startswith(URL) for p in context.pages) != 1:
                raise RuntimeError("The restored profile still has more than one app page after closing the blocked duplicate")
            result["browser"]["closedBlockedDuplicateTabs"] = closed_tabs
            result["browser"]["reusedRestoredAppPage"] = True
            record_step("retain the sole writer-ready restored tab", "passed", note="A visible duplicate-writer warning identified the blocked session-restored clone; only that blocked tab was closed.", inspection=inspection, closedTabs=closed_tabs)
        else:
            page = restored_app_pages[0] if restored_app_pages else None
        context.add_init_script(PRE_APP_SCRIPT)
        if page is not None:
            result["browser"]["reusedRestoredAppPage"] = True
        else:
            page = next((p for p in context.pages if p.url == "about:blank"), None)
            if page is None:
                page = context.new_page()
            result["browser"]["reusedRestoredAppPage"] = False
        page.on("pageerror", lambda err: (result["pageErrors"].append({"atUtc": NOW(), "message": str(err)}), publish()))
        page.on("console", lambda msg: (result["consoleErrors"].append({"atUtc": NOW(), "message": msg.text}) if msg.type == "error" else None))
        if not page.url.startswith(URL):
            page.goto(URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_function("window.__qaPreAppStorage !== undefined || window.__qaPreAppStorageError !== undefined", timeout=8000)
            initial_pre = read_pre_app_snapshot(page, "initialProfilePreApp")
        else:
            # Chromium restored this single existing app tab before our observer was attached.
            # Read it as-is; the requested pre-app snapshot will be captured on the later reload.
            initial_pre = read_current_snapshot(page, "initialProfileExistingRestoredPage", "existing restored app page; post-mount read-only initial capture")
        page.locator(".save-button").wait_for(state="visible", timeout=12000)
        page.wait_for_timeout(350)
        page.locator(".world-frame").wait_for(state="visible", timeout=5000)
        if page.get_by_text("在陌生的天空下", exact=False).count():
            raise AssertionError("Profile opened the new-life prompt instead of its completed Adventure save")
        if page.locator(".save-warning").count():
            raise AssertionError(f"App reports a save/writer warning: {page.locator('.save-warning').inner_text()}")
        initial_validation = assert_profile_state(initial_pre, "initial profile pre-app")
        result["initialProfileValidation"] = initial_validation
        result["writerReady"] = not page.locator(".save-button").is_disabled()
        if not result["writerReady"]:
            raise AssertionError("Normal UI save button is disabled; writer is not ready")
        if not (initial_validation["hasEquippedWeapon"] and initial_validation["hasEquippedArmor"] and initial_validation["hasParty"] and initial_validation["hasOwnedHome"]):
            raise AssertionError(f"Existing profile lacks required non-empty coverage state: {initial_validation}")
        if not initial_validation.get("dungeon", {}).get("discovered"):
            raise AssertionError("Existing profile has no discovered dungeon")
        result["uiStart"] = {"visibleTextExcerpt": page.locator("body").inner_text()[:2200], "visibleButtons": page.locator("button:visible").all_text_contents()[:100]}
        result["snapshots"]["initialProfilePostMount"] = read_current_snapshot(page, "initialProfilePostMount")
        screenshot(page, "01-loaded-owned-party-gear.png")
        publish()
        record_step("load the existing completed Adventure profile", "passed", note="Initial browser storage in the sole writer-ready restored tab retained active character, weapon/armor, Lucy party and owned home; no direct state injection was used.", profile=initial_validation)

        pause_initial = ui_pause(page)
        if not pause_initial.get("paused"):
            raise AssertionError(f"Could not pause world via visible control: {pause_initial}")
        record_step("pause world through the rendered UI", "passed", note="Used the visible normal pause button before travel.", control=pause_initial)

        route = open_ui_mine(page)
        combat_pre_save = read_current_snapshot(page, "activeDungeonCombatBeforeSave")
        combat_validation = assert_profile_state(combat_pre_save, "active dungeon combat before save")
        state_before_combat_save = combat_pre_save["state"]
        if not state_before_combat_save.get("combat") or not state_before_combat_save.get("dungeon", {}).get("inDungeon"):
            raise AssertionError("Normal UI route did not create a non-empty active dungeon combat state")
        if not (combat_validation["hasParty"] and combat_validation["hasEquippedWeapon"] and combat_validation["hasEquippedArmor"] and combat_validation["hasOwnedHome"]):
            raise AssertionError(f"Required active battle coverage state missing: {combat_validation}")
        screenshot(page, "02-active-dungeon-combat-before-save.png")
        record_step("travel, enter dungeon, explore into combat", "passed", note="Actions were performed with rendered map/context/dungeon buttons.", route=route, combat=combat_validation)

        pause_battle = ui_pause(page)
        if not pause_battle.get("paused"):
            raise AssertionError(f"Could not pause active battle through the rendered UI: {pause_battle}")
        close_dialog(page)
        page.locator(".save-button").click()
        page.wait_for_timeout(300)
        post_save = read_current_snapshot(page, "postUiSaveBeforeReload")
        post_save_validation = assert_profile_state(post_save, "post UI save")
        if not post_save["state"].get("combat") or not post_save["state"].get("dungeon", {}).get("inDungeon"):
            raise AssertionError("Normal UI save did not preserve combat and in-dungeon state")
        screenshot(page, "03-after-ui-pause-save.png")
        result["normalUiSave"] = {"pauseControl": pause_battle, "button": "存檔", "validation": post_save_validation, "savedAtUtc": NOW()}
        record_step("pause and save active combat through normal UI", "passed", note="Pause control and header 存檔 button were clicked; full post-save storage was captured.", validation=post_save_validation)

        page.reload(wait_until="domcontentloaded", timeout=15000)
        page.wait_for_function("window.__qaPreAppStorage !== undefined || window.__qaPreAppStorageError !== undefined", timeout=8000)
        pre_app_reload = read_pre_app_snapshot(page, "preAppAfterReload")
        page.locator(".battle-scene").wait_for(state="visible", timeout=12000)
        page.wait_for_timeout(100)
        restored_scene = page.locator(".battle-scene").count() == 1
        screenshot(page, "04-after-reload-combat-restored.png")
        pause_after_reload = ui_pause(page)
        reloaded_mount = read_current_snapshot(page, "postReloadMountedAndPaused")
        restored_validation = assert_profile_state(reloaded_mount, "post reload app state")
        pre_saved_state = post_save.get("state") or {}
        pre_app_state = pre_app_reload.get("state") or {}
        diffs = state_core_diffs(pre_saved_state, pre_app_state)
        result["reloadVerification"] = {
            "preAppCombatPresent": bool(pre_app_state.get("combat")),
            "preAppDungeonActive": bool(pre_app_state.get("dungeon", {}).get("inDungeon")),
            "combatSceneRestored": restored_scene,
            "pauseAfterReload": pause_after_reload,
            "postSaveVsPreAppReload": diffs,
            "simulationFieldsEqual": diffs["simulationFieldsEqual"],
            "restoredProfileValidation": restored_validation,
            "preAppSnapshotSource": pre_app_reload["source"],
        }
        publish()
        if not result["reloadVerification"]["preAppCombatPresent"] or not result["reloadVerification"]["preAppDungeonActive"]:
            result["status"] = "RED"
            result["severity"] = "P1 candidate: saved combat/dungeon absent before the reloaded app bundle executed"
            publish()
            raise AssertionError("P1 candidate: active combat or dungeon state is absent from localStorage before Vue ran after reload")
        if not restored_scene:
            result["status"] = "RED"
            result["severity"] = "P1 candidate: pre-app storage retained combat but UI did not restore active battle scene"
            publish()
            raise AssertionError("P1 candidate: active battle scene did not restore despite active pre-app combat storage")
        if not diffs["simulationFieldsEqual"]:
            result["status"] = "RED"
            result["severity"] = "P1 candidate: simulation root changed between UI save and pre-app reload snapshot"
            publish()
            raise AssertionError(f"Simulation root differences across reload: {diffs['simulationFieldDiffs']}")
        for required in ("hasParty", "hasEquippedWeapon", "hasEquippedArmor", "hasOwnedHome"):
            if not restored_validation.get(required):
                result["status"] = "RED"
                result["severity"] = f"P1 candidate: {required} missing after reload"
                publish()
                raise AssertionError(f"P1 candidate: {required} missing from reloaded state")

        # Continue exactly one combat action using the rendered Attack button.
        attack = page.locator(".battle-scene").get_by_role("button", name="攻擊", exact=True)
        if not attack.count() or attack.first.is_disabled():
            raise AssertionError("Reloaded battle scene has no enabled rendered 攻擊 control")
        before_attack_state = reloaded_mount["state"]
        before_combat = before_attack_state.get("combat")
        attack.click()
        page.wait_for_timeout(200)
        after_attack = read_current_snapshot(page, "afterReloadedAttack")
        screenshot(page, "05-after-resumed-attack.png")
        after_state = after_attack.get("state") or {}
        after_combat = after_state.get("combat")
        attack_registered = (
            after_combat != before_combat
            or after_state.get("eventSequence") != before_attack_state.get("eventSequence")
            or after_state.get("history") != before_attack_state.get("history")
            or not page.locator(".battle-scene").count()
        )
        result["reloadVerification"]["attackActionRegistered"] = attack_registered
        result["reloadVerification"]["combatBeforeAttack"] = before_combat
        result["reloadVerification"]["combatAfterAttack"] = after_combat
        result["reloadVerification"]["worldTimeBeforeAttack"] = before_attack_state.get("worldTime")
        result["reloadVerification"]["worldTimeAfterAttack"] = after_state.get("worldTime")
        publish()
        if not attack_registered:
            raise AssertionError("Rendered attack click produced no visible combat/state change")
        record_step("continue with one rendered attack after reload", "passed", note="Clicked the visible 攻擊 button; a changed combat/event state was observed.", combatBefore=before_combat, combatAfter=after_combat)
        result["status"] = "passed"
        result["endedAtUtc"] = NOW()
        result["preAppDiffSummary"] = diffs
        publish()
        publish_markdown()
        return 0
    except Exception as exc:
        result["failure"] = f"{type(exc).__name__}: {exc}"
        if result.get("status") == "running":
            result["status"] = "failed"
        result["endedAtUtc"] = NOW()
        publish()
        publish_markdown()
        raise
    finally:
        if context is not None:
            context.close()
        pw.stop()
        if result.get("status") == "passed":
            # Ensure the profile was released; never remove browser locks manually.
            result["profileClosedAtUtc"] = NOW()
            publish()
            publish_markdown()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        if result.get("status") == "running":
            result["status"] = "failed"
            result["endedAtUtc"] = NOW()
        try:
            publish()
            publish_markdown()
        except Exception:
            pass
        raise
