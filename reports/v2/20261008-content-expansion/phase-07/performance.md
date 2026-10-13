# Phase 7-K Performance and Storage Review

## Test identity and method

The current-source production Browser runs used Chromium 151.0.7922.173, Playwright 1.62.0, Debian 13 x86_64, and the frozen K source/build recorded in baseline.md. The Browser runner sampled at one-minute checkpoints. Chromium Memory.enable was unavailable; heap and DOM values came from Runtime.getHeapUsage and Memory.getDOMCounters. IndexedDB byte counts are bounded UTF-8 JSON projection estimates from read-only cursors, not physical store bytes or browser quota measurements.

## Two-hour Chromium lane

Run 20261013T152918Z-pid405218 lasted 7,200.66 seconds, with 115 checkpoints and 23 verified save/reloads. Save/localStorage grew from 83,543 to 207,774 bytes. IndexedDB rows increased from 13 to 14,847; bounded projected serialized bytes rose from 3,577 to 3,823,102. DOM nodes ranged 2,736–6,770 and ended at 2,910; JS listeners ranged 431–856 and ended at 467. Used heap ranged 7,978,268–42,759,248 bytes and ended at 14,031,456 bytes. Six Browser long tasks were recorded, maximum 171 ms.

Visible action latency was 207.52 ms median, 228.2 ms p95, and 257.88 ms maximum across 1,593 measured actions. This includes Playwright visible-action overhead and is not a standalone frame-time benchmark. No action exceeded 500 ms.

## One-hour content-agent lane

Run 20261013T173052Z-pid410744 lasted 3,603.84 seconds, with 58 checkpoints and 11 verified save/reloads. Save/localStorage grew from 83,543 to 164,308 bytes. IndexedDB rows increased from 13 to 7,403; bounded projected serialized bytes rose from 3,577 to 1,906,272. DOM nodes ranged 2,735–6,771 and ended at 2,860; JS listeners ranged 428–860 and ended at 474. Used heap ranged 9,530,728–41,040,980 bytes and ended at 18,057,304 bytes. One Browser long task was recorded, maximum 183 ms.

Visible action latency was 206.09 ms median, 228.67 ms p95, and 279.37 ms maximum across 537 measured actions. This includes the automation's visible-action overhead. No action exceeded 500 ms.

Both lanes recorded zero Browser, console, request, HTTP, storage, or unhandled-rejection errors. DOM peaks near 6,770 nodes were transient: subsequent checkpoints returned to roughly 2,800 nodes. Heap values fluctuated rather than rising monotonically. Save bytes and IndexedDB row counts grew with elapsed game time. No quota failure or storage exception occurred.

## 100-year save size

The current-source three-seed headless lane produced year-100 saves of 576,378–611,123 bytes, with 1,960–1,996 history rows and the configured 150-event cap. All nine save/reload and continuation comparisons were equal. This measures engine serialization, not browser quota behavior.

## Interpretation and follow-up

There is no confirmed memory leak or storage failure in these observations. IndexedDB row and projected-byte growth warrants a future retention/compaction and actual-quota measurement. The bounded projection is sampled and cannot be treated as physical database size. Native Safari, physical mobile, and Firefox coverage were excluded or unavailable.
