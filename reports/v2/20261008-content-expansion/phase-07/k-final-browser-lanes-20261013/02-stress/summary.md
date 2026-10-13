# Stress lane closeout

- Run `20261013T115543Z-pid386732` returned launcher/runner exit 0 and `COMPLETE_STRESS_REVIEW_REQUIRED` after 1203.22s. Source stable: True.
- UTC: 2026-10-13T11:55:43.592594+00:00 to 2026-10-13T12:15:48.288707+00:00; Chromium 151.0.7922.173.
- Identity: HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`, source `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`, build `b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc`, dist `0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1`, release `6fb1b481faf264aa22866114d348827eef9b70b736aaef4fa48a31f0eab94cbf`.
- 20 checkpoints; 287 visible actions: {'start_from_opening': 1, 'explore': 72, 'navigate': 73, 'observe': 72, 'close_dialog': 69}; 3 normal save/reloads; worldTime 591 → 2983.
- Errors: `{}`; browserErrors `False`; telemetry `{'saveWrites': 4457, 'longTasks': 1}`.
- Checkpoint trends (first/last/min/max/mean): `{'localStorageBytes': {'first': 83543, 'last': 86422, 'min': 83543, 'max': 86646, 'mean': 85445.5}, 'DOMNodes': {'first': 2735, 'last': 2836, 'min': 2728, 'max': 2836, 'mean': 2790.8}, 'JSListeners': {'first': 428, 'last': 463, 'min': 428, 'max': 463, 'mean': 451.55}, 'runtimeHeapUsedBytes': {'first': 11310136, 'last': 15459448, 'min': 9302248, 'max': 34099100, 'mean': 17786274.8}, 'runtimeHeapTotalBytes': {'first': 22077440, 'last': 69074944, 'min': 22077440, 'max': 69779456, 'mean': 64111411.2}, 'indexedDBRecords': {'first': 14, 'last': 2373, 'min': 14, 'max': 2373, 'mean': 1192.45}}`.
- Profiling limitations recorded by runner: `[{'atUTC': '2026-10-13T12:15:31.794863+00:00', 'setup': "CDPSession.send: Protocol error (Memory.enable): 'Memory.enable' wasn't found"}]`. Stress status requires review by design; human validation remains separate.

Raw run: `/workspace/plw-rpg/reports/v2/20261008-content-expansion/phase-07/qa-browser-runs/20261013T115543Z-pid386732`. Detached `raw-run.sha256` covers the immutable raw directory.
