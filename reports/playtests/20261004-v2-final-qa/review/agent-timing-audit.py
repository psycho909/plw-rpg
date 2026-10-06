"""Conservatively account for directly observed Agent Exploratory Playtest time."""
import json
from datetime import datetime
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

QA = Path(__file__).resolve().parent.parent
SOURCE = json.loads((QA / "build-manifest.json").read_text(encoding="utf-8"))["sourceCommit"]
ROUTES = {
    "life": "life-final/results.json",
    "adventure": "adventure-final/run-01/results.json",
    "hybrid": "hybrid-final/results.json",
}
ADVENTURE_CORE = QA / "adventure-final/run-01/final-core-readonly.json"
HYBRID_SEGMENTS = [
    "hybrid-final/resumed-segment-02/results.json",
    "hybrid-final/resumed-segment-03/results.json",
    "hybrid-final/resumed-segment-04/attempt-02/results.json",
]
HYBRID_MINIMUM_SECONDS = 3600.0
HYBRID_SEGMENT04_TARGET_SECONDS = 3000.0
# Coordinator review directed this estimated reserve for unrecorded external
# CDP/debug work in segment 1. It is deliberately labelled estimated, not timed.
HYBRID_SEGMENT1_ESTIMATED_DEBUG_RESERVE_SECONDS = 600.0


def dt(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def merge_intervals(intervals):
    merged = []
    for left, right in sorted(intervals):
        if right <= left:
            raise ValueError(f"invalid exclusion interval: {left!s} .. {right!s}")
        if merged and left <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(right, merged[-1][1]))
        else:
            merged.append((left, right))
    return merged


def interval_seconds(intervals):
    return sum((right - left).total_seconds() for left, right in intervals)


def largest_timestamp_gap(rows):
    stamped = sorted((dt(row["atUtc"]), row) for row in rows if row.get("atUtc"))
    if len(stamped) < 2:
        return None
    left_time, left_row, right_time, right_row = max(
        ((stamped[index][0], stamped[index][1], stamped[index + 1][0], stamped[index + 1][1])
         for index in range(len(stamped) - 1)),
        key=lambda interval: (interval[2] - interval[0]).total_seconds(),
    )
    return {
        "seconds": (right_time - left_time).total_seconds(),
        "startUtc": left_time.isoformat(), "endUtc": right_time.isoformat(),
        "startLabel": left_row.get("label", left_row.get("kind", left_row.get("command"))),
        "endLabel": right_row.get("label", right_row.get("kind", right_row.get("command"))),
    }


def audit(route, path):
    result = json.loads(path.read_text(encoding="utf-8"))
    if result.get("sourceCommit") != SOURCE:
        raise ValueError(f"{route} source mismatch: {result.get('sourceCommit')!r}")
    started = dt(result.get("runStartedAtUtc", result.get("startedAtUtc")))
    observations = result.get("observations") or []
    if not observations:
        raise ValueError(f"{route} has no direct observation to bound credited time")
    last = observations[-1]
    stop = dt(last["atUtc"])
    actions = sorted(result.get("actions") or [], key=lambda row: dt(row["atUtc"]))
    errors = result.get("errors") or {}
    driver_errors = errors.get("driver")
    if driver_errors is None:
        driver_errors = errors.get("harness") or []

    intervals = []
    details = []
    for error in driver_errors:
        when = dt(error["atUtc"])
        if when < started or when > stop:
            continue
        prior = [row for row in actions if dt(row["atUtc"]) <= when]
        later = [row for row in actions if dt(row["atUtc"]) > when]
        left = max(started, dt(prior[-1]["atUtc"])) if prior else started
        right = min(stop, dt(later[0]["atUtc"])) if later else stop
        intervals.append((left, right))
        details.append({
            "errorAtUtc": error["atUtc"],
            "command": error.get("command"),
            "excludedStartUtc": left.isoformat(),
            "excludedEndUtc": right.isoformat(),
            "seconds": (right - left).total_seconds(),
        })

    merged = merge_intervals(intervals) if intervals else []
    observed_window = (stop - started).total_seconds()
    recovery_exclusion = interval_seconds(merged)
    return {
        "sourceCommit": SOURCE,
        "route": route,
        "runnerStatus": result.get("status"),
        "sourceArtifact": str(path.relative_to(QA)),
        "startedAtUtc": started.isoformat(),
        "lastDirectObservationUtc": stop.isoformat(),
        "observedWindowSeconds": observed_window,
        "driverErrors": len(driver_errors),
        "excludedRecoveryUnionSeconds": recovery_exclusion,
        "conservativeObservedSecondsBeforeAdditionalKnownDebug": observed_window - recovery_exclusion,
        "meets3600SecondsBeforeAdditionalKnownDebug": observed_window - recovery_exclusion >= 3600,
        "errorBounds": details,
        "mergedBounds": [
            {"startUtc": left.isoformat(), "endUtc": right.isoformat(),
             "seconds": (right - left).total_seconds()}
            for left, right in merged
        ],
        "limitation": (
            "Conservatively excludes the full preceding-action to following-action interval "
            "around each harness error. Stops at the last direct observation, not process exit. "
            "External CDP/debug work and unobserved intervals require separate exclusions; "
            "console errors alone do not consume playtest time."
        ),
    }


def reviewed_adventure_accounting():
    core = json.loads(ADVENTURE_CORE.read_text(encoding="utf-8"))
    if core.get("sourceCommit") != SOURCE:
        raise ValueError("adventure final-core source does not match the frozen source")
    result_path = QA / ROUTES["adventure"]
    result = json.loads(result_path.read_text(encoding="utf-8"))
    if result.get("sourceCommit") != SOURCE:
        raise ValueError("adventure results source does not match the frozen source")
    observations = result.get("observations") or []
    if not observations:
        raise ValueError("adventure results have no direct observation for a canonical cutoff")

    accounting = core.get("sessionAccounting")
    required = (
        "completedRawElapsedSeconds", "status", "harnessFailureCount",
        "mergedHarnessFailureExclusionSeconds",
        "explicitUnobservedPostBossReviewIntervalSeconds",
        "activeObservedCreditedSeconds", "creditedThroughFormalElapsedSeconds",
        "postPauseReadOnlyReportTimeCredited", "calculation",
    )
    if not isinstance(accounting, dict) or any(key not in accounting for key in required):
        raise ValueError("adventure final-core sessionAccounting is incomplete")
    prior_superseded = accounting.get("supersededPriorAccounting")
    if isinstance(prior_superseded, dict):
        old_value = float(prior_superseded["supersededValue"])
        old_cutoff = float(prior_superseded["supersededCreditedThroughFormalElapsedSeconds"])
        superseded_record = dict(prior_superseded)
    else:
        old_value = float(accounting["activeObservedCreditedSeconds"])
        old_cutoff = float(accounting["creditedThroughFormalElapsedSeconds"])
        superseded_record = {
            "supersededValue": old_value,
            "supersededCreditedThroughFormalElapsedSeconds": old_cutoff,
            "source": (
                "Previously published /sessionAccounting in final-core-readonly.json and results.json; "
                "the originals are preserved in their append-only playlogs."
            ),
            "calculation": (
                f"{old_cutoff:.3f} - "
                f"{float(accounting['mergedHarnessFailureExclusionSeconds']):.3f} - "
                f"{float(accounting['explicitUnobservedPostBossReviewIntervalSeconds']):.3f} = {old_value:.3f}"
            ),
            "supersededReason": (
                "The old cutoff used a later read-only capture's printed runner clock; no recorded "
                "direct observation or pause action establishes the interval from the last observation to that clock."
            ),
        }
    started = dt(result["runStartedAtUtc"])
    last_observation = observations[-1]
    stop = dt(last_observation["atUtc"])
    canonical_cutoff = round((stop - started).total_seconds(), 3)
    calculated = (
        canonical_cutoff
        - float(accounting["mergedHarnessFailureExclusionSeconds"])
        - float(accounting["explicitUnobservedPostBossReviewIntervalSeconds"])
    )
    credited = round(calculated, 3)
    if abs((stop - started).total_seconds() - canonical_cutoff) > 0.001:
        raise ValueError("adventure canonical timestamp delta does not reconcile")

    updated = dict(accounting)
    updated.update({
        "activeObservedCreditedSeconds": credited,
        "creditedThroughFormalElapsedSeconds": canonical_cutoff,
        "finalWorldSnapshotElapsedSeconds": canonical_cutoff,
        "calculation": (
            f"{canonical_cutoff:.3f} seconds from runStartedAtUtc to the last direct observation "
            f"at {last_observation['atUtc']} - "
            f"{float(accounting['mergedHarnessFailureExclusionSeconds']):.3f}s merged harness-error intervals - "
            f"{float(accounting['explicitUnobservedPostBossReviewIntervalSeconds']):.3f}s unobserved post-boss review "
            f"= {credited:.3f}s. The later read-only capture runner clock is not direct-observation evidence."
        ),
        "canonicalCutoffEvidence": {
            "sourceArtifact": ROUTES["adventure"],
            "jsonPointer": f"/observations/{len(observations) - 1}",
            "lastDirectObservationUtc": last_observation["atUtc"],
            "timestampDerivedElapsedSeconds": canonical_cutoff,
            "storedElapsedSecondsRoundedToTenth": last_observation.get("elapsedSeconds"),
            "runStartedAtUtc": result["runStartedAtUtc"],
            "legacyReadOnlyCaptureRunnerClockSeconds": core.get("finalWorldSnapshotElapsedSeconds"),
            "legacyClockSupersededAsCreditCutoff": True,
            "pauseCommandRecordedAsAction": any(
                "pause" in str(action.get("kind", "")).lower()
                and dt(action["atUtc"]) > stop
                for action in (result.get("actions") or [])
            ),
        },
        "supersededPriorAccounting": superseded_record,
    })
    return {
        **updated,
        "sourceArtifact": str(ADVENTURE_CORE.relative_to(QA)),
        "sourceJsonPointer": "/sessionAccounting",
        "sourceCapturedAtUtc": core.get("capturedAtUtc"),
    }


def attach_adventure_accounting(accounting):
    core_path = ADVENTURE_CORE
    core = json.loads(core_path.read_text(encoding="utf-8"))
    if core.get("sourceCommit") != SOURCE:
        raise ValueError("adventure final-core source does not match the frozen source")
    core_accounting = {
        key: value for key, value in accounting.items()
        if key not in {"sourceArtifact", "sourceJsonPointer", "sourceCapturedAtUtc"}
    }
    if core.get("sessionAccounting") != core_accounting:
        core["sessionAccounting"] = core_accounting
        write_recorded(core_path, json.dumps(core, ensure_ascii=False, indent=2) + "\n",
                       producer="root-agent-timing-review")

    result_path = QA / ROUTES["adventure"]
    result = json.loads(result_path.read_text(encoding="utf-8"))
    if result.get("sourceCommit") != SOURCE:
        raise ValueError("adventure results source does not match the frozen source")
    if result.get("sessionAccounting") != accounting:
        result["sessionAccounting"] = accounting
        write_recorded(result_path, json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                       producer="root-agent-timing-review")


def checked_segment_accounting(name, path):
    if not path.is_file():
        return {
            "segment": name, "status": "pending_missing",
            "sourceArtifact": str(path.relative_to(QA)),
            "validActiveObservedSeconds": None,
        }
    result = json.loads(path.read_text(encoding="utf-8"))
    if result.get("sourceCommit") != SOURCE:
        raise ValueError(f"{name} source does not match the frozen source")
    if not (result.get("runStartedAtUtc") or result.get("startedAtUtc")) or not result.get("observations"):
        accounting = result.get("sessionAccounting")
        return {
            "segment": name,
            "sourceArtifact": str(path.relative_to(QA)),
            "runnerStatus": result.get("status"),
            "status": "pending_not_started",
            "validActiveObservedSeconds": None,
            "reportedSessionAccountingStatus": (
                accounting.get("accountingStatus") if isinstance(accounting, dict) else None
            ),
            "limitation": "No direct observations have been recorded for this segment yet.",
        }
    base = audit(name, path)
    accounting = result.get("sessionAccounting")
    public = {
        "segment": name,
        "sourceArtifact": str(path.relative_to(QA)),
        "runnerStatus": result.get("status"),
        "rawElapsedSecondsReported": result.get("elapsedSeconds"),
        "priorActiveSecondsReportedButNotCredited": result.get("priorActiveSeconds"),
        "cumulativeActiveSecondsReportedButNotCredited": result.get("cumulativeActiveSeconds"),
        "directObservationWindowSeconds": base["observedWindowSeconds"],
        "harnessRecoveryUnionSeconds": base["excludedRecoveryUnionSeconds"],
    }
    if not isinstance(accounting, dict) or accounting.get("accountingStatus") != "complete":
        return {
            **public,
            "status": "pending_accounting",
            "validActiveObservedSeconds": None,
            "reportedSessionAccountingStatus": accounting.get("accountingStatus") if isinstance(accounting, dict) else None,
            "limitation": "No segment credit until explicit unobserved intervals and the direct-observation window are finalized.",
        }

    started = dt(base["startedAtUtc"])
    stop = dt(base["lastDirectObservationUtc"])
    declared_start = dt(accounting["observedStartUtc"])
    declared_stop = dt(accounting["lastDirectObservationUtc"])
    raw = base["observedWindowSeconds"]
    if abs((declared_start - started).total_seconds()) > 0.01:
        raise ValueError(f"{name} accounting start does not match its run start")
    if abs((declared_stop - stop).total_seconds()) > 0.01:
        raise ValueError(f"{name} accounting stop does not match its last direct observation")
    if abs(float(accounting["observedWindowSeconds"]) - raw) > 0.1:
        raise ValueError(f"{name} accounting observation window does not reconcile")

    explicit = []
    explicit_rows = accounting.get("explicitUnobservedIntervals") or []
    for row in explicit_rows:
        left, right = dt(row["startUtc"]), dt(row["endUtc"])
        if left < started or right > stop:
            raise ValueError(f"{name} explicit exclusion falls outside its observed window")
        explicit.append((left, right))
    error_bounds = [(dt(row["startUtc"]), dt(row["endUtc"])) for row in base["mergedBounds"]]
    combined = merge_intervals([*error_bounds, *explicit]) if error_bounds or explicit else []
    total_exclusion = interval_seconds(combined)
    credited = raw - total_exclusion
    if credited < 0:
        raise ValueError(f"{name} exclusions exceed its observed window")
    reported_credit = accounting.get("activeObservedCreditedSeconds")
    if reported_credit is not None and abs(float(reported_credit) - credited) > 0.05:
        raise ValueError(f"{name} reported credit does not reconcile: {reported_credit} != {credited}")

    return {
        **public,
        "status": "accounted",
        "explicitUnobservedIntervals": explicit_rows,
        "explicitUnobservedUnionSeconds": interval_seconds(merge_intervals(explicit)) if explicit else 0.0,
        "combinedExclusionUnionSeconds": total_exclusion,
        "activeObservedCreditedSeconds": credited,
        "validActiveObservedSeconds": credited,
        "reviewedSessionAccounting": accounting,
        "creditedFromDirectWindowAndMergedExclusions": True,
    }


def hybrid_accounting(route_audit):
    segment1_before_reserve = float(route_audit["conservativeObservedSecondsBeforeAdditionalKnownDebug"])
    reserve = HYBRID_SEGMENT1_ESTIMATED_DEBUG_RESERVE_SECONDS
    segment1_historical_estimate = round(segment1_before_reserve - reserve, 3)
    if segment1_historical_estimate < 0:
        raise ValueError("hybrid segment-1 reserve exceeds its conservative direct-observation bound")
    segment1_result = json.loads((QA / ROUTES["hybrid"]).read_text(encoding="utf-8"))
    observation_gaps = largest_timestamp_gap(segment1_result.get("observations") or [])
    combined_gaps = largest_timestamp_gap(
        [*(segment1_result.get("observations") or []), *(segment1_result.get("actions") or [])])
    segments = [{
        "segment": 1,
        "sourceArtifact": ROUTES["hybrid"],
        "runnerStatus": segment1_result.get("status"),
        "directObservationWindowSeconds": route_audit["observedWindowSeconds"],
        "harnessRecoveryUnionSeconds": route_audit["excludedRecoveryUnionSeconds"],
        "lowerBoundBeforeEstimatedExternalDebugReserveSeconds": segment1_before_reserve,
        "estimatedConservativeExternalDebugReserveSeconds": reserve,
        "reserveIsMeasuredInterval": False,
        "reserveProvenance": (
            "Coordinator review steering: retain an estimated conservative 600-second reserve "
            "for incompletely logged external CDP/debug work in segment 1. This is not a measured interval."
        ),
        "recordedTimestampGapReview": {
            "maximumObservationToObservationGap": observation_gaps,
            "maximumGapAcrossRecordedObservationsAndActions": combined_gaps,
            "interpretation": (
                "No recorded consecutive event gap exceeds the 600-second estimated reserve. "
                "This does not measure or rule out unrecorded external CDP/debug activity; the reserve remains."
            ),
        },
        "formalActiveObservedCreditedSeconds": 0.0,
        "formalCreditEligible": False,
        "conditionalHistoricalEstimateSeconds": segment1_historical_estimate,
        "formalCreditExclusionReason": (
            "The estimated 600-second reserve is not proven to upper-bound all unrecorded external CDP/debug work; "
            "segment 1 receives zero formal credit."
        ),
    }]

    additional_segments = []
    for index, relative in enumerate(HYBRID_SEGMENTS, start=2):
        name = f"segment-{index:02d}"
        additional_segments.append(checked_segment_accounting(name, QA / relative))
    resumed_segment_credit = sum(
        float(row["validActiveObservedSeconds"])
        for row in additional_segments
        if row.get("status") == "accounted" and row.get("validActiveObservedSeconds") is not None
    )
    resumed_segment_credit = round(resumed_segment_credit, 3)
    segment04 = next((row for row in additional_segments if row.get("segment") == "segment-04"), None)
    segment04_credit = (
        float(segment04["validActiveObservedSeconds"])
        if segment04 and segment04.get("status") == "accounted"
        and segment04.get("validActiveObservedSeconds") is not None else 0.0
    )
    segment04_target_met = segment04_credit >= HYBRID_SEGMENT04_TARGET_SECONDS
    minimum_met = resumed_segment_credit >= HYBRID_MINIMUM_SECONDS
    pending = []
    pending.extend(row["segment"] for row in additional_segments if row.get("status") != "accounted")
    if not minimum_met:
        pending.append(
            f"{round(HYBRID_MINIMUM_SECONDS - resumed_segment_credit, 3):.3f} more formal resumed-segment seconds "
            "to reach the 3,600-second requirement"
        )
    if not segment04_target_met and "segment-04" not in pending:
        pending.append(
            f"segment-04 needs {round(HYBRID_SEGMENT04_TARGET_SECONDS - segment04_credit, 3):.3f} more valid seconds "
            "to meet its 3,000-second target"
        )
    conditional_cumulative = round(segment1_historical_estimate + resumed_segment_credit, 3)
    if pending or not segment04_target_met or not minimum_met:
        gate_status = "pending"
    else:
        gate_status = "ready_for_final_review"
    return {
        "accountingStatus": gate_status,
        "segment1": segments[0],
        "additionalSegments": additional_segments,
        "segment1ConditionalHistoricalEstimateSeconds": segment1_historical_estimate,
        "segment1FormalCreditedSeconds": 0.0,
        "formalCreditedResumedSegmentsSeconds": resumed_segment_credit,
        "formalPendingRemainingSeconds": max(0.0, round(HYBRID_MINIMUM_SECONDS - resumed_segment_credit, 3)),
        "historicalConditionalCumulativeEstimateSeconds": conditional_cumulative,
        "supersededPriorConditionalCumulativeEstimate": {
            "supersededValue": 4504.145,
            "source": "Previously published review/agent-timing-audit.json and its append-only playlog.",
            "calculation": "3346.954 conditional segment-1 estimate + 706.055 segment 2 + 451.136 segment 3 = 4504.145",
            "status": "Historical conditional estimate only; not a formal gate pass.",
        },
        "minimumRequirementSeconds": HYBRID_MINIMUM_SECONDS,
        "minimumRequirementMet": minimum_met,
        "segment04ValidTimeTargetSeconds": HYBRID_SEGMENT04_TARGET_SECONDS,
        "segment04ValidTimeTargetMet": segment04_target_met,
        "pendingSegments": pending,
        "remainingSecondsToMinimum": max(0.0, round(HYBRID_MINIMUM_SECONDS - resumed_segment_credit, 3)),
        "priorActiveSecondsAndCumulativeActiveSecondsUsedForCredit": False,
        "classification": "Agent Exploratory Playtest; not human playtest or Drought Matrix agent.",
        "policy": (
            "Segment 1 receives zero formal credit because the estimated reserve is not proven to bound all "
            "unrecorded external debug. Count only resumed segments after their explicit exclusions reconcile "
            "with direct-observation windows and harness-recovery unions. Formal completion requires at least "
            "3,600 resumed-segment seconds and at least 3,000 valid seconds in segment 04. Do not use raw elapsed "
            "or cumulativeActiveSeconds as credit."
        ),
    }


def main():
    result = {"sourceCommit": SOURCE, "routes": {}}
    for name, relative in ROUTES.items():
        result["routes"][name] = audit(name, QA / relative)

    adventure = result["routes"]["adventure"]
    reviewed = reviewed_adventure_accounting()
    attach_adventure_accounting(reviewed)
    adventure["helperObservedWindowCreditBeforeCanonicalPostBossExclusion"] = adventure[
        "conservativeObservedSecondsBeforeAdditionalKnownDebug"]
    adventure.pop("conservativeObservedSecondsBeforeAdditionalKnownDebug", None)
    adventure.pop("meets3600SecondsBeforeAdditionalKnownDebug", None)
    adventure["parentReviewedSessionAccounting"] = reviewed
    adventure["activeObservedCreditedSeconds"] = reviewed["activeObservedCreditedSeconds"]
    adventure["conservativeObservedSecondsAfterAllReviewedExclusions"] = reviewed[
        "activeObservedCreditedSeconds"]
    adventure["creditedThroughFormalElapsedSeconds"] = reviewed["creditedThroughFormalElapsedSeconds"]
    adventure["completedRawElapsedSecondsNotCredited"] = reviewed["completedRawElapsedSeconds"]
    adventure["explicitUnobservedPostBossReviewIntervalSeconds"] = reviewed[
        "explicitUnobservedPostBossReviewIntervalSeconds"]
    adventure["meets3600SecondsAfterAllReviewedExclusions"] = (
        float(reviewed["activeObservedCreditedSeconds"]) >= 3600)

    hybrid = result["routes"]["hybrid"]
    hybrid_review = hybrid_accounting(hybrid)
    hybrid["directObservationSecondsBeforeEstimatedDebugReserve"] = hybrid.pop(
        "conservativeObservedSecondsBeforeAdditionalKnownDebug")
    hybrid.pop("meets3600SecondsBeforeAdditionalKnownDebug", None)
    hybrid["reviewedSegmentAccounting"] = hybrid_review
    hybrid["formalCreditedResumedSegmentsSeconds"] = hybrid_review[
        "formalCreditedResumedSegmentsSeconds"]
    hybrid["formalPendingRemainingSeconds"] = hybrid_review[
        "formalPendingRemainingSeconds"]
    hybrid["historicalConditionalEstimateSeconds"] = hybrid_review[
        "historicalConditionalCumulativeEstimateSeconds"]
    hybrid["meets3600SecondsAfterAllReviewedExclusions"] = hybrid_review[
        "minimumRequirementMet"]
    write_recorded(QA / "review/agent-timing-audit.json",
                   json.dumps(result, ensure_ascii=False, indent=2),
                   producer="root-agent-timing-review")
    for name, route in result["routes"].items():
        credited = route.get("activeObservedCreditedSeconds")
        if credited is None:
            credited = (route.get("reviewedSegmentAccounting") or {}).get(
                "formalCreditedResumedSegmentsSeconds")
        if credited is None:
            credited = route.get("conservativeObservedSecondsBeforeAdditionalKnownDebug")
        status = (route.get("reviewedSegmentAccounting") or {}).get("accountingStatus", route.get("runnerStatus"))
        print(name, status, round(float(credited), 3))


if __name__ == "__main__":
    main()
