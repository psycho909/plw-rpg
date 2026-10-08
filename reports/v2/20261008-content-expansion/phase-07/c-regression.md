# Phase 7 C full regression

- Command: `npm run check` once at `/workspace/plw-rpg`; HEAD `a1307d220a68213be6465bc40e0a85af8ec605a3`.
- Result: **FAIL**, exit 1. Vitest: 30 files, 557 tests total; 26 files / 552 tests passed, 4 files / 5 tests failed. Exact test names and failure messages are preserved in `c-fullregression-run/fullregression.json` and raw streams.
- Failures: three pre-existing V1 migration/reset assertions expect `saveVersion` 7 but receive 8; crafting projection expects only four legacy recipes but receives four added Slime recipes as well; the 100-year life integration test exceeded its 5,000 ms timeout (reported 5,013 ms).
- Production typecheck/build did **not** run: package script is `npm run test && npm run build`, and the test failure short-circuited the second command.
- Source provenance: 98 recursive `src/` files including untracked files; canonical compact sorted-map SHA-256 `585c6edcdd2cab4495ec11c0c7cae038ea37c00a1a2a07e9e569376b620c21b8` before and after, with matching complete source maps. HEAD, package and lock hashes were stable. All 26 source hashes in `c-core.md` match the run map.
- Environment: Linux `6.18.44` x86_64; Node `v24.19.0`; npm `11.9.0`; Vitest `4.1.11`; Vite `7.3.6`; Chromium `151.0.7922.173`. Approximate run window 05:39:00–05:39:17 UTC / 13:39:00–13:39:17 Asia/Taipei; Vitest reports start 05:39:02 UTC.
- Full pre/post manifests, stdout, stderr and exit code are in [`c-fullregression-run`](c-fullregression-run/); versions are archived via `recorded_reports.py`. No source fixes, install, rerun, build-only command, browser run or long simulation was performed.
