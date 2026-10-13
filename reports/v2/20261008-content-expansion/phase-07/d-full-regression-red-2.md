# Phase 7-D Full Regression — Repeated RED

- Branch: `v2x/reward-core`
- Source HEAD: `fd6b5e84bef73d5dc429201c903d4a867976cd0a`
- Run: `npm run check`
- Start / end: 2026-10-12 07:04:26–07:04:45 UTC
- Exit: 1 during the test stage; typecheck/build did not run.
- Tracked working-tree diff SHA-256 (`git diff --binary`): `d002a0120ebae76131e51d3af8379925da2d60ef36891ae29b34d4633e0a34f4` (untracked files are not represented by this Git diff hash; see per-file hashes in the D closeout).
- Vitest: 31 files, 30 passed / 1 failed; 570 tests, 569 passed / 1 failed; duration 16.68 s (reported per-test aggregate 33.68 s).

## Original failure excerpt

`src/services/saveService.test.ts` —
`versioned saves and deterministic continuation > round trips 500 years of history, natural deaths and successors and continues deterministically`

- Test duration: 15,074 ms; configured timeout: 15,000 ms.
- Error: `Test timed out in 15000ms. If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".`
- Stack: `src/services/saveService.test.ts:708:3`; simulation loop begins at line 710.
- No timeout or test configuration was changed.

This is the same test that timed out in the first full-suite run (`d-full-regression-red.md`). It previously passed once when run in isolation (9.95 s). A controlled whole-suite diagnostic then passed once with `npm test -- --run --maxWorkers=1`: 31/31 files and 570/570 tests passed, Vitest duration 38.14 s (2026-10-12 07:05:33–07:06:14 UTC). `npm run build` was run separately and passed (2026-10-12 07:06:28–07:06:37 UTC; `vue-tsc --noEmit` clean, Vite 7.3.6 transformed 91 modules). The result is consistent with parallel contention but does not prove causality. The default `npm run check` remains RED twice; no code fix, runner configuration change, or timeout increase is included.

The runner returned the failure excerpt but did not save a raw stdout file. The data above is transcribed from that returned result; the original first-run evidence remains separately archived.
