#!/usr/bin/env python3
"""Offline Phase 6-J browser acceptance validator.

Reads finalized runner/launcher JSON and durable JSONL only. It never starts a
browser or changes run artifacts. Example:

  python j_browser_acceptance_validator.py \
    --stress ../j-browser-runs/<stress-run> \
    --agent ../j-browser-runs/<agent-run>
"""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
from typing import Any

PHASE = Path(__file__).resolve().parents[1]
ROOT = PHASE.parents[3]
HELPERS = (
    "reports/v2/20261008-regional-crisis/phase-06/j_browser_launcher.py",
    "reports/v2/20261008-regional-crisis/phase-06/j_browser_runner.py",
    "reports/v2/20261008-regional-crisis/phase-06/j_browser_support.py",
    "reports/v2/20261008-regional-crisis/phase-06/j_fixture_generator.py",
)
REQUIRED_CONTROLS = (
    "CONTROLLED_WARNING_UI_FIXTURE",
    "CONTROLLED_UI_FIXTURE",
    "CONTROLLED_FOREST_CAMP_RAID",
    "CONTROLLED_FOREST_CHIEF",
    "CONTROLLED_UI_FIXTURE_KNOWN_AFTERMATH",
    "LEGACY_UNKNOWN_FIXTURE",
)
CRISIS_ACTIONS = {
    "contribute_food", "contribute_gold", "contribute_equipment",
    "start_visible_goblin_camp_raid", "challenge_visible_goblin_chief",
    "combat_potion", "combat_defend", "combat_attack",
}
PHASE_ORDER = ("warning", "preparation", "active", "aftermath")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.strip():
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{number}: invalid JSONL: {exc}") from exc
    return rows


def finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def push(checks: list[dict[str, Any]], name: str, passed: bool, detail: Any = None) -> None:
    checks.append({"name": name, "passed": bool(passed), "detail": detail})


def ordered_phases(rows: list[dict[str, Any]]) -> tuple[bool, list[str], dict[str, Any]]:
    eligible = [r for r in rows if r.get("normalFresh") is True and r.get("controlledFixture") is False]
    observed = [r.get("phase") for r in eligible]
    start = next((i for i, phase in enumerate(observed) if phase == "warning"), None)
    end = next((i for i in range((start or 0) + 1, len(observed)) if observed[i] == "aftermath"), None) if start is not None else None
    if start is None or end is None:
        return False, observed, {"reason": "warning_or_aftermath_missing", "strictCrisisIdObserved": False}
    arc_rows = eligible[start:end + 1]
    arc_phases = [row.get("phase") for row in arc_rows]
    allowed = {"warning", "preparation", "active", "resolution", "aftermath"}
    order = {"warning": 0, "preparation": 1, "active": 2, "resolution": 3, "aftermath": 4}
    monotonic_phases = all(p in order for p in arc_phases) and all(order[a] <= order[b] for a, b in zip(arc_phases, arc_phases[1:]))
    times = [row.get("worldTime") for row in arc_rows]
    monotonic_world_time = all(finite_number(t) for t in times) and all(a <= b for a, b in zip(times, times[1:]))
    ids = []
    first_world_time, last_world_time = arc_rows[0].get("worldTime"), arc_rows[-1].get("worldTime")
    for row in arc_rows:
        direct = row.get("crisisId", row.get("regionalCrisisId"))
        if direct:
            ids.append(str(direct))
        for event in row.get("crisisEvents", []) or []:
            event_id = event.get("crisisId", event.get("regionalCrisisId")) if isinstance(event, dict) else None
            event_at = event.get("at") if isinstance(event, dict) else None
            if event_id and finite_number(event_at) and finite_number(first_world_time) and finite_number(last_world_time) and first_world_time <= event_at <= last_world_time:
                ids.append(str(event_id))
    required_phases_present = all(phase in arc_phases for phase in PHASE_ORDER)
    phase_ids: dict[str, set[str]] = {}
    for row in arc_rows:
        direct = row.get("crisisId", row.get("regionalCrisisId"))
        if direct:
            phase_ids.setdefault(str(row.get("phase")), set()).add(str(direct))
        for event in row.get("crisisEvents", []) or []:
            if not isinstance(event, dict):
                continue
            event_id = event.get("crisisId", event.get("regionalCrisisId"))
            event_at = event.get("at")
            if event_id and finite_number(event_at) and finite_number(first_world_time) and finite_number(last_world_time) and first_world_time <= event_at <= last_world_time:
                phase_ids.setdefault(str(row.get("phase")), set()).add(str(event_id))
    strict_id = all(len(phase_ids.get(phase, set())) == 1 for phase in PHASE_ORDER) and len({next(iter(phase_ids[p])) for p in PHASE_ORDER}) == 1
    # The frozen trace schema omits crisis.id. If no ID is directly recorded,
    # accept only a continuous, monotonic canonical phase chain, and disclose
    # that continuity is inferred from the single-instance state machine.
    inferred_continuity = not any(phase_ids.values()) and required_phases_present and monotonic_phases and monotonic_world_time
    valid = required_phases_present and monotonic_phases and monotonic_world_time and (strict_id or inferred_continuity)
    return valid, observed, {"arcPhases": arc_phases, "worldTimeMonotonic": monotonic_world_time,
                             "strictCrisisIdObserved": strict_id, "crisisIds": sorted(set(ids)),
                             "continuityBasis": "same_recorded_crisis_id" if strict_id else "inferred_uninterrupted_canonical_phase_chain",
                             "limitation": None if strict_id else "frozen runner trace omits regionalCrisis.id; identity is inferred, not directly verified"}


def inspect_run(run_dir: Path, expected_mode: str, minimum_seconds: int) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    run_dir = run_dir.resolve()
    result_path = run_dir / "j-browser-result.json"
    launcher_path = run_dir / "launcher-status.json"
    result = read_json(result_path)
    launcher = read_json(launcher_path)
    operations = read_jsonl(run_dir / "operations.jsonl")
    checkpoints = read_jsonl(run_dir / "checkpoints.jsonl")
    trace = read_jsonl(run_dir / "normal-phase-trace.jsonl")

    push(checks, "mode_matches_requested_lane", result.get("mode") == expected_mode,
         {"expected": expected_mode, "actual": result.get("mode")})
    push(checks, "launcher_completed", launcher.get("status") == "COMPLETE" and launcher.get("launcherExitCode") == 0 and launcher.get("runnerExitCode") == 0,
         {"status": launcher.get("status"), "launcherExitCode": launcher.get("launcherExitCode"), "runnerExitCode": launcher.get("runnerExitCode")})
    normal_seconds = result.get("normalDurationSeconds", result.get("normalDurationRequirement", {}).get("actualSeconds"))
    push(checks, "normal_elapsed_excludes_controlled_time_and_meets_minimum", finite_number(normal_seconds) and normal_seconds >= minimum_seconds,
         {"normalDurationSeconds": normal_seconds, "requiredSeconds": minimum_seconds, "totalDurationSeconds": result.get("durationSeconds")})

    before, after = result.get("sourceBefore", {}), result.get("sourceAfter", {})
    launch_before, launch_after = launcher.get("sourceBefore", {}), launcher.get("sourceAfter", {})
    provenance_stable = result.get("sourceStableDuringRun") is True and before == after and launcher.get("sourceStableDuringRun") is True and launch_before == launch_after
    push(checks, "runner_and_launcher_provenance_stable", provenance_stable,
         {"runnerStable": result.get("sourceStableDuringRun"), "launcherStable": launcher.get("sourceStableDuringRun"), "head": before.get("head")})
    helper_hashes = before.get("qaFilesSha256", {})
    same_helper_hashes = all(helper_hashes.get(path) and launch_before.get("qaFilesSha256", {}).get(path) == helper_hashes[path] for path in HELPERS)
    current_helper_hashes = {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in HELPERS if (ROOT / path).is_file()}
    helpers_current = all(current_helper_hashes.get(path) == helper_hashes.get(path) for path in HELPERS)
    push(checks, "all_used_helper_hashes_agree_and_match_frozen_files", same_helper_hashes and helpers_current,
         {"recorded": {p: helper_hashes.get(p) for p in HELPERS}, "current": current_helper_hashes})

    normal_start = result.get("normalStartUTC")
    normal_end = None
    if normal_start and finite_number(normal_seconds):
        normal_end = utc(normal_start).timestamp() + normal_seconds
    scheduled = [row for row in checkpoints if row.get("reason") != "final-normal"]
    checkpoint_times = []
    try:
        checkpoint_times = [utc(row["atUTC"]).timestamp() for row in scheduled]
    except (KeyError, TypeError, ValueError):
        checkpoint_times = []
    rel_times = [t - utc(normal_start).timestamp() for t in checkpoint_times] if normal_start else []
    intervals = [b - a for a, b in zip(rel_times, rel_times[1:])]
    minimum_checkpoint_count = max(1, math.floor(minimum_seconds / 60) - 1)
    cadence_ok = bool(rel_times) and rel_times[0] <= 10 and (not intervals or max(intervals) <= 75)
    coverage_delta = normal_end - checkpoint_times[-1] if normal_end is not None and checkpoint_times else None
    coverage_ok = bool(rel_times) and coverage_delta is not None and 0 <= coverage_delta <= 75
    metric_rows_ok = True
    metric_problems = []
    for i, row in enumerate(scheduled):
        cdp = row.get("cdp", {})
        dom = cdp.get("Memory.getDOMCounters", {})
        heap = cdp.get("Runtime.getHeapUsage", {})
        perf = cdp.get("Performance.getMetrics", {}).get("metrics", [])
        perf_values = {m.get("name"): m.get("value") for m in perf if isinstance(m, dict)}
        browser = row.get("browser", {})
        save = browser.get("save", {})
        latency = row.get("saveLatency", {})
        idb = browser.get("indexedDB")
        row_ok = (
            all(finite_number(dom.get(k)) for k in ("documents", "nodes", "jsEventListeners"))
            and finite_number(heap.get("usedSize"))
            and finite_number(perf_values.get("JSEventListeners"))
            and finite_number(perf_values.get("JSHeapUsedSize"))
            and isinstance(browser.get("localStorageBytes"), int)
            and all(isinstance(save.get(k), int) for k in ("worldTime", "historyCount", "eventCount", "journalPending"))
            and isinstance(idb, list)
            and isinstance(latency.get("writes"), list) and bool(latency.get("writes"))
            and all(finite_number(x.get("elapsedMs")) and finite_number(x.get("bytes")) for x in latency["writes"])
            and not latency.get("storageErrors") and not latency.get("unhandledRejections")
            and all(row.get(k) == 0 for k in ("pageErrors", "consoleErrors", "requestFailures", "httpFailures"))
        )
        if not row_ok:
            metric_problems.append({"checkpoint": i, "atUTC": row.get("atUTC")})
        metric_rows_ok = metric_rows_ok and row_ok
    push(checks, "60_second_checkpoint_count_and_cadence", len(scheduled) >= minimum_checkpoint_count and cadence_ok and coverage_ok,
         {"count": len(scheduled), "minimum": minimum_checkpoint_count, "firstElapsed": rel_times[0] if rel_times else None,
          "maxInterval": max(intervals) if intervals else None, "lastBeforeNormalEnd": normal_end - checkpoint_times[-1] if coverage_ok else None})
    push(checks, "each_checkpoint_has_real_cdp_storage_journal_latency_and_error_samples", metric_rows_ok,
         {"invalidCheckpointRows": metric_problems})
    final_checkpoints = [row for row in checkpoints if row.get("reason") == "final-normal"]
    push(checks, "final_normal_checkpoint_present", bool(final_checkpoints), {"count": len(final_checkpoints)})

    controlled = result.get("lanes", {})
    controlled_ok = all(controlled.get(name, {}).get("status", "").startswith("PASS") and controlled[name].get("normalFreshEquivalent") is False for name in REQUIRED_CONTROLS)
    push(checks, "all_controlled_lanes_pass_and_are_separate", controlled_ok,
         {name: controlled.get(name, {}).get("status") for name in REQUIRED_CONTROLS})

    error_counts = {key: len(result.get(key, [])) for key in ("pageErrors", "consoleErrors", "requestFailures", "httpFailures")}
    final_latency = result.get("saveLatencySamples", {})
    no_errors = not result.get("browserErrors") and all(v == 0 for v in error_counts.values()) and not final_latency.get("storageErrors") and not final_latency.get("unhandledRejections") and not result.get("snapshotErrors")
    push(checks, "no_browser_storage_unhandled_or_snapshot_errors", no_errors,
         {"counts": error_counts, "storageErrors": len(final_latency.get("storageErrors", [])), "unhandledRejections": len(final_latency.get("unhandledRejections", [])), "snapshotErrors": result.get("snapshotErrors", [])})

    policy_rows = [row for row in operations if row.get("lane") in ("AGENT_CRISIS", "STRESS_AGENT")]
    missing_policy_context = [
        {"turn": row.get("turn"), "missing": [key for key in ("visibleWorld", "reason")
                                               if not isinstance(row.get(key), str) or not row[key].strip()]}
        for row in policy_rows
        if any(not isinstance(row.get(key), str) or not row[key].strip()
               for key in ("visibleWorld", "reason"))
    ]
    recorded_choices = result.get("agentChoiceCount")
    push(checks, "every_policy_turn_records_visible_world_and_reason", bool(policy_rows)
         and not missing_policy_context and len(policy_rows) == recorded_choices,
         {"policyRows": len(policy_rows), "runnerChoiceCount": recorded_choices,
          "missingVisibleWorldOrReason": missing_policy_context})

    normal_lane = controlled.get("NORMAL_FRESH", {})
    fresh_rows = [row for row in trace if row.get("normalFresh") is True]
    no_fixture_injection = (normal_lane.get("stateInjected") is False and normal_lane.get("debugTimeOrStateInjection") is False
                            and all(row.get("controlledFixture") is False for row in fresh_rows)
                            and bool(operations) and operations[0].get("label") == "click visible opening action 起身")
    push(checks, "normal_lane_started_fresh_without_fixture_or_state_injection", no_fixture_injection,
         {"stateInjected": normal_lane.get("stateInjected"), "debugTimeOrStateInjection": normal_lane.get("debugTimeOrStateInjection"),
          "normalTraceRows": len(fresh_rows), "allTraceRowsMarkedFresh": bool(fresh_rows)})
    reload_rows = [row for row in operations if row.get("lane") == "NORMAL_FRESH" and str(row.get("label", "")).startswith("periodic-save-reload-")]
    reloads_ok = all(row.get("invariantMismatches") == {} and isinstance(row.get("worldTime"), int)
                     and isinstance(row.get("savedBytes"), int) and row.get("savedBytes", 0) > 0
                     and isinstance(row.get("journalPending"), int) for row in reload_rows)
    required_reloads = max(2, math.floor((normal_seconds or 0) / 300) - 1)
    push(checks, "multiple_normal_visible_save_reload_rows_preserve_saved_world", len(reload_rows) >= required_reloads and reloads_ok,
         {"count": len(reload_rows), "required": required_reloads, "allHaveEmptyMismatchAndSavedStateCounts": reloads_ok})

    arc_continuity, phases, continuity_detail = ordered_phases(trace)
    action_rows = [row for row in operations if row.get("lane") in ("AGENT_CRISIS", "STRESS_AGENT") and row.get("choice") in CRISIS_ACTIONS and row.get("observedCrisisPhase") in ("warning", "preparation", "active") and row.get("stateInjected") is False]
    action_turns = {row.get("turn") for row in action_rows}
    trace_action_ties = any(row.get("policyTurn") in action_turns and row.get("phase") in ("warning", "preparation", "active") for row in trace)
    outcome_after_active = any(row.get("phase") in ("active", "aftermath") and row.get("outcome") and row.get("resolutionSummary") for row in trace)
    aftermath_rows = [row for row in operations if row.get("lane") == "NORMAL_FRESH" and row.get("label") == "normal-arc-aftermath-save-reload"]
    aftermath_reload = any(row.get("crisisPhase") in ("aftermath", "cooldown") and row.get("invariantMismatches") == {} and finite_number(row.get("latencyMs")) for row in aftermath_rows)
    complete_arc = arc_continuity and bool(action_rows) and trace_action_ties and outcome_after_active and aftermath_reload

    result_status = result.get("status")
    return {"runId": result.get("runId"), "mode": expected_mode, "runDirectory": str(run_dir), "normalSeconds": normal_seconds,
            "runnerStatusLabel": result_status, "checkpoints": len(scheduled), "normalArcComplete": complete_arc,
            "normalArcEvidence": {**continuity_detail, "crisisUiActionCount": len(action_rows), "actionMatchedTraceTurn": trace_action_ties,
                                  "outcomeAndSummaryObserved": outcome_after_active, "aftermathSaveReload": aftermath_reload},
            "checks": checks,
            "passed": all(item["passed"] for item in checks)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stress", required=True, type=Path, help="final stress run directory")
    parser.add_argument("--agent", required=True, type=Path, help="final agent-crisis run directory")
    args = parser.parse_args()
    runs = [inspect_run(args.stress, "stress", 1200), inspect_run(args.agent, "agent-crisis", 1800)]
    distinct = args.stress.resolve() != args.agent.resolve() and runs[0].get("runId") != runs[1].get("runId")
    same_build = False
    if all(Path(run["runDirectory"]).exists() for run in runs):
        r0 = read_json(Path(runs[0]["runDirectory"]) / "j-browser-result.json")
        r1 = read_json(Path(runs[1]["runDirectory"]) / "j-browser-result.json")
        p0, p1 = r0.get("sourceBefore", {}), r1.get("sourceBefore", {})
        same_build = (p0.get("head") == p1.get("head") and p0.get("sourceFingerprint") == p1.get("sourceFingerprint")
                      and p0.get("distSha256") == p1.get("distSha256") and p0.get("buildStatusSha256") == p1.get("buildStatusSha256")
                      and p0.get("qaFilesSha256") == p1.get("qaFilesSha256"))
    at_least_one_arc = any(run["normalArcComplete"] for run in runs)
    overall = distinct and same_build and at_least_one_arc and all(run["passed"] for run in runs)
    seeds = []
    for run in runs:
        result = read_json(Path(run["runDirectory"]) / "j-browser-result.json")
        seed = result.get("normalWorldSeed")
        seeds.append(seed)
    seed_disclosed = all(seed is not None for seed in seeds)
    report = {"status": "PASS" if overall else "FAIL_OR_INCOMPLETE", "overallAcceptance": {
        "distinctRuns": distinct, "sameFrozenHeadAndDist": same_build,
        "atLeastOneNormalFreshCompleteArcAcrossRuns": at_least_one_arc,
        "worldSeedsDisclosed": seed_disclosed, "worldSeeds": seeds}, "runs": runs,
        "authorityNote": "Raw runner status labels are recorded but acceptance is derived independently from run evidence. Trace lacks explicit crisis.id; continuity is accepted only from an uninterrupted, monotonic canonical phase chain and labeled inferred."}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if overall else 1


if __name__ == "__main__":
    raise SystemExit(main())
