# Phase9-C Pending Lead Commands

Source changes and the focused projection test are ready. The focused browser probe intentionally refuses to run until `dist/` contains the updated material-origin UI; Lead owns the build and full check per dispatch.

Run each command separately:

1. `npm.cmd run build`
2. `npm.cmd run check`
3. `node scripts/phase9/c-probe.mjs`

The probe will retain its controlled checkpoint, screenshots, and JSON evidence at a new `reports/v2/20261015-ui-ux-polish/phase-09/c-runner/attempt-<UTC timestamp>/` directory. It records the Chrome profile size before deleting only that attempt-local profile.

## Completion update

All commands listed above are complete. Lead reports build and full check PASS (39 files / 642 tests); the worker's focused projection test passed 9/9; `node --check scripts/phase9/c-probe.mjs` passed; and `node scripts/phase9/c-probe.mjs` passed at `attempt-20261016T003828476Z`. See `c-summary.md` and the attempt evidence.
