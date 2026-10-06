"""Summarize the completed natural-GC Chromium soak into CSV, JSON and a plot."""
import csv
import io
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded
import matplotlib
matplotlib.use('Agg')
from matplotlib import pyplot as plt
import numpy as np

def stats(values):
    numbers = [float(value) for value in values if value is not None]
    if not numbers:
        return {'available': False}
    return {'available': True, 'count': len(numbers), 'first': numbers[0], 'last': numbers[-1],
            'minimum': min(numbers), 'maximum': max(numbers), 'median': float(np.median(numbers)),
            'p95': float(np.percentile(numbers, 95)), 'delta': numbers[-1] - numbers[0]}

def main():
    primary = OUT / 'soak/attempt-04/results.json'
    if not primary.exists():
        primary = OUT / 'soak/results.json'
    result = json.loads(primary.read_text())
    elapsed = result.get('actualElapsedSeconds', result.get('elapsedSeconds', 0))
    observations = result['observations']
    if elapsed < 7200 or len(observations) < 120 or result['status'] in ['running', 'incomplete', 'failed']:
        raise SystemExit('Refusing to summarize an incomplete run as the final 2h soak')
    rows = []
    for observation in observations:
        browser = observation.get('browser', {})
        storage = browser.get('storageEstimate') or {}
        heap = observation.get('cdpHeap') or {}
        dom = observation.get('cdpDom') or {}
        rows.append({'sourceCommit': result['sourceCommit'], 'checkpoint': observation['checkpoint'],
                     'elapsedSeconds': observation['elapsedSeconds'], 'worldTime': browser.get('worldTime'),
                     'rawNpcOnlyPopulation': browser.get('population'),
                     'populationIncludingActiveCharacter': (browser['livingNpcCount'] + int(browser['alive']))
                         if browser.get('livingNpcCount') is not None and isinstance(browser.get('alive'), bool) else None,
                     'livingNpcCount': browser.get('livingNpcCount'),
                     'retainedDeadNpcCount': browser.get('deadNpcCount'), 'gold': browser.get('gold'),
                     'eventCount': browser.get('eventCount'), 'historyCount': browser.get('historyCount'),
                     'liveDomElements': browser.get('domNodes'), 'cdpDomNodes': dom.get('nodes'),
                     'cdpDocuments': dom.get('documents'), 'cdpListeners': dom.get('jsEventListeners'),
                     'heapUsedBytes': heap.get('usedSize'), 'heapAllocatedBytes': heap.get('totalSize'),
                     'embedderHeapUsedBytes': heap.get('embedderHeapUsedSize'),
                     'backingStorageBytes': heap.get('backingStorageSize'),
                     'localStorageBytes': browser.get('localStorageBytes'), 'storageEstimateBytes': storage.get('usage'),
                     'journalRecordCount': browser.get('indexedDbRecordCount'),
                     'chromiumProcessTreeRssBytes': (observation.get('rss') or {}).get('rss_bytes'),
                     'pageErrorCount': observation.get('pageErrorCount'),
                     'consoleErrorCount': observation.get('consoleErrorCount')})
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    write_recorded(OUT / 'profiling/checkpoints.csv', buffer.getvalue(), producer='root-profile-summary')
    numeric = [key for key in rows[0] if key not in ['sourceCommit', 'checkpoint', 'elapsedSeconds']]
    summary = {key: stats([row[key] for row in rows]) for key in numeric}
    x = np.array([row['elapsedSeconds'] / 60 for row in rows])
    storage_points = [(row['elapsedSeconds'] / 3600, row['storageEstimateBytes']) for row in rows if row['storageEstimateBytes'] is not None]
    slope = float(np.polyfit([t for t, _ in storage_points], [v for _, v in storage_points], 1)[0]) if len(storage_points) >= 2 else None
    latency_kinds = sorted({sample['kind'] for sample in result.get('uiLatenciesMs', [])})
    latency = {kind: stats([sample['ms'] for sample in result['uiLatenciesMs'] if sample['kind'] == kind]) for kind in latency_kinds}
    # Reloads start new documents; report heap ranges separately from the whole-run range.
    reload_checkpoints = sorted(check['checkpoint'] for check in result.get('reloadChecks', []) if check.get('checkpoint'))
    boundaries = [0, *reload_checkpoints, max(row['checkpoint'] for row in rows) + 1]
    heap_segments = []
    for left, right in zip(boundaries, boundaries[1:]):
        segment = [row for row in rows if left <= row['checkpoint'] < right]
        if segment:
            heap_segments.append({'firstCheckpoint': segment[0]['checkpoint'], 'lastCheckpoint': segment[-1]['checkpoint'],
                                  'heapUsedBytes': stats([row['heapUsedBytes'] for row in segment]),
                                  'embedderHeapUsedBytes': stats([row['embedderHeapUsedBytes'] for row in segment]),
                                  'liveDomElements': stats([row['liveDomElements'] for row in segment]),
                                  'cdpDomNodes': stats([row['cdpDomNodes'] for row in segment])})
    report = {'sourceCommit': result['sourceCommit'], 'resultArtifact': str(primary.relative_to(OUT)), 'runStartedAt': result['startedAtUtc'],
              'runEndedAt': result.get('endedAtUtc'), 'elapsedSeconds': elapsed, 'checkpointCount': len(rows),
              'metrics': summary, 'storageEstimateLinearSlopeBytesPerRealHour': slope,
              'uiRoundTripLatencyMs': latency,
              'documentSegmentsBetweenReloads': heap_segments,
              'limitations': ['Natural GC only; no retained-object/forced-GC proof. Reloads divide heap segments.',
                              'Raw soak population counts living NPCs only. Derived population adds the active living character under the normal single-living-character lifecycle; it is not an independently sampled characters[] count.',
                              'Retained dead NPC count is not cumulative deaths: the world prunes dead NPC entities.',
                              'Storage estimate is browser-reported usage, not exact serialized journal bytes.',
                              'RSS sums the Chromium process tree and can double count shared pages.',
                              'UI round-trip latency includes Playwright and two animation frames; not direct storage API timing.',
                              'First and last profile values refer to checkpoints, not the instant of initial creation.']}
    write_recorded(OUT / 'profiling/summary.json', json.dumps(report, ensure_ascii=False, indent=2), producer='root-profile-summary')
    fig, axes = plt.subplots(3, 2, figsize=(12, 10), sharex=True)
    def draw(axis, key, unit, label):
        values = np.array([np.nan if row[key] is None else row[key] / unit for row in rows])
        axis.plot(x, values, label=label, linewidth=1.4)
        axis.grid(alpha=.2)
    draw(axes[0, 0], 'heapUsedBytes', 2**20, 'JS used heap')
    draw(axes[0, 0], 'heapAllocatedBytes', 2**20, 'JS allocated heap')
    axes[0, 0].set_ylabel('MiB'); axes[0, 0].legend()
    draw(axes[0, 1], 'liveDomElements', 1, 'Live document elements')
    axes[0, 1].set_ylabel('Elements'); axes[0, 1].legend()
    draw(axes[1, 0], 'cdpDomNodes', 1, 'CDP nodes (includes detached nodes)')
    axes[1, 0].set_ylabel('Nodes'); axes[1, 0].legend()
    draw(axes[1, 1], 'storageEstimateBytes', 2**20, 'Browser storage estimate')
    axes[1, 1].set_ylabel('MiB'); axes[1, 1].legend()
    draw(axes[2, 0], 'localStorageBytes', 1024, 'Current localStorage checkpoint')
    axes[2, 0].set_ylabel('KiB'); axes[2, 0].legend()
    draw(axes[2, 1], 'journalRecordCount', 1, 'Append journal records')
    axes[2, 1].set_ylabel('Records'); axes[2, 1].legend()
    for axis in axes.ravel():
        for reload in result.get('reloadChecks', []):
            if reload.get('checkpoint'):
                axis.axvline(reload['checkpoint'], color='#777777', linestyle=':', alpha=.5)
    for axis in axes[2]: axis.set_xlabel('Actual browser elapsed minutes')
    fig.suptitle('Oakvale V2 Chromium soak — natural GC; dotted lines mark reload checkpoints')
    fig.text(.01, .01, 'Source: ' + result['sourceCommit'], fontsize=8)
    fig.tight_layout(rect=[0, .03, 1, .96])
    (OUT / 'profiling').mkdir(exist_ok=True)
    fig.savefig(OUT / 'profiling/trends.png', dpi=160)
    plt.close(fig)
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
