"""Chronology-safe summary helpers for browser QA reports."""
from math import ceil
from statistics import median


def summarize(values):
    """Summarize observations, preserving input-order endpoints.

    Distribution statistics use a sorted copy. Callers should supply the
    original chronological sequence, with missing observations removed.
    """
    if not values:
        raise ValueError("cannot summarize an empty series")
    ordered = list(values)
    sorted_values = sorted(ordered)
    return {
        "n": len(ordered),
        "min": sorted_values[0],
        "p50": median(sorted_values),
        "p95NearestRank": sorted_values[ceil(0.95 * len(sorted_values)) - 1],
        "max": sorted_values[-1],
        "first": ordered[0],
        "last": ordered[-1],
    }


def production_metric_series(checkpoints, final_save_latency, click_response_ms):
    """Return series keyed like qa-summary.json from raw stress evidence."""
    selectors = {
        "worldTime": lambda cp: cp["worldTime"],
        "population": lambda cp: cp["livingPopulation"],
        "livingNPC": lambda cp: cp["livingNPC"],
        "deadNPC": lambda cp: cp["deadNPC"],
        "playerGold": lambda cp: cp["player"]["gold"],
        "settlementFood": lambda cp: cp["settlement"]["food"],
        "settlementProsperity": lambda cp: cp["settlement"]["prosperity"],
        "settlementSafety": lambda cp: cp["settlement"]["safety"],
        "settlementInfrastructure": lambda cp: cp["settlement"]["infrastructure"],
        "monsterPopulation": lambda cp: cp["threat"]["monsterPopulation"],
        "threatLevel": lambda cp: cp["threat"]["threatLevel"],
        "goblinBossProgress": lambda cp: cp["bossState"]["goblinBossProgress"],
        "wolfBossDefeatedAt": lambda cp: cp["bossState"]["wolfBossDefeatedAt"],
        "eventRing": lambda cp: cp["events"],
        "majorHistory": lambda cp: cp["history"],
        "journalPending": lambda cp: cp["journalPending"],
        "saveBytes": lambda cp: cp["saveBytes"],
        "originStorageEstimateBytes": lambda cp: cp["originStorageEstimate"]["usage"],
        "cdpNodes": lambda cp: cp["domCounters"]["nodes"],
        "documents": lambda cp: cp["domCounters"]["documents"],
        "actualJsListeners": lambda cp: cp["jsEventListeners"],
        "jsHeapUsedBytes": lambda cp: cp["heapUsage"]["usedSize"],
        "embedderHeapBytes": lambda cp: cp["heapUsage"]["embedderHeapUsedSize"],
        "backingStorageBytes": lambda cp: cp["heapUsage"]["backingStorageSize"],
        "resourceEntries": lambda cp: cp["resourceEntryCount"],
    }
    series = {key: [selector(cp) for cp in checkpoints] for key, selector in selectors.items()}
    series["wolfBossDefeatedAt"] = [value for value in series["wolfBossDefeatedAt"] if value is not None]
    series["saveLatencyMs_finalRollingWindow"] = list(final_save_latency)
    series["automationClickResponseWallMs"] = [item["wallMilliseconds"] if isinstance(item, dict) else item for item in click_response_ms]
    return series
