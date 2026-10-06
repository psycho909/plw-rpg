# Phase 0 Baseline / Freeze

Source commit: ac144ef4759d14570bf686e6a0e6b2983075fa9b; V2 application source: 441e3c2b435f199a50cb78ee5b19521bcc084593. Branch v2x/reward-core. Start environment/timestamp/spec fingerprint: [baseline.json](baseline.json), [environment](baseline-run/environment.json).

## Results
- Full V1/V2 Vitest: 229 tests / 14 files, exit 0 (single worker), 30.47s.
- vue-tsc --noEmit + Vite production build: exit 0, 69 modules.
- Actual production Chromium: 20 checks, page errors 0, exit 0; [raw stdout](baseline-run/browser-stdout.txt), [result](baseline-run/browser.json).
- All 58 source files match pre-run fingerprints; no source or dependency edits.
- Earlier browser attempts: missing fixture path / loaded foreground timer assertion race. Exact raw failures retained; [correction](baseline-run/browser-harness-correction.md). Attempt 3 observes native first checkpoint and requires exact saved worldTime equality, without state/timer changes.
- npm upgrade notice only; no package upgrade.

## Review and Gate
Root reviewed source equivalence, runner correction, exact checkpoint invariant, original V1 field equality and counts. Standards PASS WITH FINDINGS (harness failures retained); Spec PASS for Phase 0. Baseline clean for implementation. Independent Luna workers encountered account usage limit; their incomplete tasks are not marked passed.

V2 findings remain [C01 export race / C02 journal growth / C03 retention and P3](../../playtests/20261004-v2-final-qa/bugs.md); no broad refactor authorized. Human Fun Gate PENDING / Product NOT YET APPROVED.
