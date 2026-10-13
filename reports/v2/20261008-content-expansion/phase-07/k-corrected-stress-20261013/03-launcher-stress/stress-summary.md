# Corrected Chromium stress closeout

- Run: `20261013T111951Z-pid381708`
- Result: `COMPLETE_STRESS_REVIEW_REQUIRED`; launcher exit 0, runner exit 0, source stable.
- Runtime: 1200.85s / 1200s, 2026-10-13T11:19:51.555558+00:00 to 2026-10-13T11:39:54.095515+00:00.
- Frozen identity: HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`, source fingerprint `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3` (same after run), build status `3fb03bbaff6985b66c690ecd11738cb9464db56b5bbb31ca76ed636101105f05`, dist `48acf36483c40a6bb47bf3501e1de891360571f18b11508c3f3ce3a6d11c1f55`, release `4fc71d98a6b408ba17fa8639ecc979f6ac6271c811971e13537de20dd8871296`.
- Browser: Chromium `151.0.7922.173`.
- Play: 20 checkpoints, 278 visible actions (start_from_opening=1, explore=71, navigate=70, observe=70, close_dialog=66), 3 successful reloads; world time advanced from 594 at first checkpoint to 2978 at final save. Reload speed restoration and runtime/storage comparisons passed.
- Errors: none recorded (`errorCounts={}`, `browserErrors=False`); browser events include 4511 save writes and 1 long task(s). Checkpoint-final event counts: {'saveWrites': 4496, 'longTasks': 1}.
- Trends over 20 checkpoints:
  - localStorageBytes: 83543 -> 86422, min 83543, max 86518, mean 85437.35
  - indexedDBRecords: 16 -> 2393, min 16, max 2393, mean 1201.80
  - DOMNodes: 2736 -> 2832, min 2733, max 2832, mean 2802.75
  - JSListeners: 431 -> 460, min 431, max 463, mean 455.05
  - runtimeHeapUsedBytes: 10001420 -> 23143332, min 8128176, max 35211180, mean 20409657.40
  - runtimeHeapTotalBytes: 22077440 -> 66813952, min 22077440, max 68288512, mean 64199065.60
- Limitation: Chromium did not expose `Memory.enable`; heap and DOM data came from `Runtime.getHeapUsage` and `Memory.getDOMCounters`. This was runner-driven coverage; human validation remains deferred. `COMPLETE_STRESS_REVIEW_REQUIRED` records the runner’s stress review status.

Raw run directory: `reports/v2/20261008-content-expansion/phase-07/qa-browser-runs/20261013T111951Z-pid381708`. Raw files are hashed by `raw-run.sha256` in this evidence directory; do not edit the run directory.
