"""Summarize completed natural-GC soak measurements; no browser interaction."""
import csv
from datetime import datetime
import hashlib
import io
import json
from pathlib import Path
import statistics
import sys

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded


def quantile(values, q):
    ordered = sorted(values)
    pos = (len(ordered) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(ordered) - 1)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (pos - lo)


def summary(values):
    return {"count": len(values), "first": values[0], "last": values[-1],
            "min": min(values), "max": max(values), "p50": quantile(values, .5),
            "p95": quantile(values, .95)}


def main():
    data = json.loads((OUT / "results.json").read_text())
    chain = json.loads((OUT / "export-chain-validation.json").read_text())
    assert data["status"] == "completed" and data["elapsedSeconds"] >= 7200
    assert chain["pass"]
    obs = data["observations"]
    assert len(obs) >= 120
    elapsed = [o["elapsedSeconds"] for o in obs]
    fields = {
        "jsHeapMiB": [o["heap"]["usedSize"] / 1048576 for o in obs],
        "rssTreeMiB": [o["rss"]["bytes"] / 1048576 for o in obs],
        "storageEstimateMiB": [o["browser"]["storageUsage"] / 1048576 for o in obs],
        "checkpointKiB": [o["browser"]["checkpointBytesUtf8"] / 1024 for o in obs],
        "archiveRecords": [o["browser"]["archiveCount"] for o in obs],
        "pendingRecords": [o["browser"]["pending"] for o in obs],
        "domNodes": [o["dom"]["nodes"] for o in obs],
        "eventListeners": [o["dom"]["jsEventListeners"] for o in obs],
        "connectedElements": [o["browser"]["connectedElements"] for o in obs],
    }
    ui = {}
    for kind in sorted({row["kind"] for row in data["uiLatencies"]}):
        ui[kind] = summary([row["ms"] for row in data["uiLatencies"] if row["kind"] == kind])
    utc_duration = (datetime.fromisoformat(data["endedAtUtc"]) - datetime.fromisoformat(data["startedAtUtc"])).total_seconds()
    result = {
        "status": "pass", "startedAtUtc": data["startedAtUtc"], "endedAtUtc": data["endedAtUtc"],
        "realActiveDurationSecondsUtc": utc_duration, "elapsedIncludingExportSeconds": data["elapsedSeconds"],
        "sampleCount": len(obs), "initialWorldTime": data["initialGameState"]["worldTime"],
        "pausedEndWorldTime": data["endSnapshot"]["worldTime"],
        "gameDaysAdvanced": (data["endSnapshot"]["worldTime"] - data["initialGameState"]["worldTime"]) / 1440,
        "measurements": {name: summary(values) for name, values in fields.items()},
        "uiRoundtripPaintMs": ui, "longTasks": data["endSnapshot"]["longTasks"],
        "pageErrors": data["pageErrors"], "consoleErrors": data["consoleErrors"], "httpFailures": data["httpFailures"],
        "exportChainPass": chain["pass"], "exportRecordCount": chain["mergedRecordCount"],
        "resultsSha256": hashlib.sha256((OUT / "results.json").read_bytes()).hexdigest(),
        "limitations": data["limitations"] + [
            "First memory/RSS sample is at minute one; baseline initialGameState has no heap/RSS sample.",
            "No forced GC: individual CDP heap/node peaks are not retained-memory measurements.",
            "One browser run is evidence for this tested scenario, not proof against all leaks or races.",
            "IndexedDB is append-only by product behavior, so archive count/storage growth is expected."]}
    write_recorded(OUT / "profile-summary.json", json.dumps(result, ensure_ascii=False, indent=2) + "\n", producer="root-clean-soak-analysis")
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["elapsedSeconds", "worldTime", *fields])
    for i, o in enumerate(obs):
        writer.writerow([elapsed[i], o["browser"]["worldTime"], *[values[i] for values in fields.values()]])
    write_recorded(OUT / "profile-timeseries.csv", buffer.getvalue(), producer="root-clean-soak-analysis")
    # Standalone figures use a standard plotting library, without affecting the soak process.
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(4, 1, figsize=(10, 11), sharex=True, constrained_layout=True)
    minutes = [t / 60 for t in elapsed]
    axes[0].plot(minutes, fields["jsHeapMiB"], label="JS heap (natural GC)")
    axes[1].plot(minutes, fields["rssTreeMiB"], label="Chromium process-tree RSS sum")
    axes[0].set_ylabel("MiB")
    axes[2].plot(minutes, fields["storageEstimateMiB"], label="Browser storage estimate")
    axes[1].set_ylabel("MiB")
    axes[2].set_ylabel("MiB")
    axes[3].plot(minutes, fields["domNodes"], label="CDP nodes")
    axes[3].plot(minutes, fields["connectedElements"], label="Connected elements")
    axes[3].set_ylabel("Count")
    axes[3].set_xlabel("Real elapsed minutes")
    for ax in axes:
        ax.grid(alpha=.25)
        ax.legend(loc="best")
    fig.suptitle("Pinned production build: two-hour Chromium soak")
    figure = OUT / "profile.png"
    fig.savefig(figure, dpi=150)
    plt.close(fig)
    write_recorded(OUT / "profile-figure.json", json.dumps({"file": figure.name, "bytes": figure.stat().st_size,
        "sha256": hashlib.sha256(figure.read_bytes()).hexdigest()}, indent=2) + "\n", producer="root-clean-soak-analysis")
    print(json.dumps({k: result[k] for k in ("status", "realActiveDurationSecondsUtc", "sampleCount", "gameDaysAdvanced", "exportRecordCount")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
