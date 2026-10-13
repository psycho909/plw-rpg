# Phase7-I Root Review Closeout — 2026-10-13

**Disposition: PASS WITH FINDINGS.** Root accepts the Phase7-I implementation for local phase progression and releases the approved Phase7-J balance/coverage QA scope. This is an engineering/stage gate, not Phase7 Product Gate approval.

## Frozen source and verification

- Branch: `v2x/reward-core`
- HEAD: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- Recursive `src/` fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3` (112 source files). J must use this exact commit and fingerprint; no product source/content edits during its formal runs.
- Final `npm run check`: **37 test files / 627 tests passed**, `vue-tsc --noEmit` passed, Vite 7.3.6 production build passed. Full stdout, stderr, exit code, source maps and source hash diff are in `i-final-run-20261013/timeout-adjustment-01/`; source hash diff is empty.
- Built browser release manifest: `qa-browser-preparation/phase7-i-browser-release.json`; source fingerprint and dist fingerprint were checked against the release build.
- Strict premium UI audit: 0 findings, 0 warnings, 0 errors at `i-run-20261013/premium-audit.json`.
- Independent Standards and Spec reviews: PASS; the Browser QA runner correction received a separate Spec review PASS. Durable review notes: `i-independent-review-20261013.md`.

## Production Chromium regression

- Run: `qa-browser-runs/20261013T092721Z-pid368053/`
- Browser: Chromium 151.0.7922.173
- Real duration: 61.75 seconds; one initial checkpoint
- Normal fresh world; no state injection or controlled fixture
- Visible actions: 152 total (1 opening action, 148 exploration, 1 advance, 1 navigation, 1 observation)
- The legal visible `等待 1 日` action advanced `worldTime` 480 → 1920; one normal save/reload retained `worldTime` 1920 and core-state equality.
- Result: `PASS_BROWSER_REGRESSION`; source remained stable.
- Browser page, console, request and HTTP error counts: zero. Save writer recorded 11 writes; final localStorage was 86,425 bytes.
- Heap profiling was unavailable because this Chromium CDP build rejected `Memory.enable`; the exact limitation is retained in `profiling-limitations.jsonl`. This short I regression is not a long soak or a memory gate.
- Desktop 1280×800 and 390×844 viewport screenshots are present. This run did not assert the complete 360px responsive contract.

## Findings and limits

1. The generic semantic regression did **not** individually verify the I-specific selector contracts. Dedicated browser assertions for search/filter/page boundaries, source knowledge privacy, recipe/crop eligibility help, current-region rank/Boss presentation, keyboard focus and 360px layout remain required in Phase7-K. Do not claim those individual paths were browser-tested here.
2. The full suite initially failed because the existing 500-year save/load test exceeded its 15-second test timeout (626 passed, 1 timed out). The original failure remains in `i-final-run-20261013/check.stdout.txt` and `check.stderr.txt`; the isolated reproduction is in `saveService-isolated.*`. The isolated test passed at 9.33 seconds. Only its test timeout was increased to 30 seconds; assertions and implementation behavior were unchanged. The final full check passed, and the original failure was not replaced or deleted.
3. Browser QA runner attempts exposed preparation faults before the final pass: release/build manifest invocation, relative build path, launcher-owned files in the run directory, unsupported Playwright positional `arg`, and a broad close-button regex selecting the status-notice dismiss button. All original launcher/run evidence remains under `i-final-run-20261013/browser-launcher-attempt-*`, `qa-browser-runs/`, and `qa-browser-preparation/runner-shared-dir-fix/`. The runner was corrected, contract tests passed 9/9, Python compilation passed, and the final browser regression passed. Independent follow-up Spec review found no issues in these QA-only fixes.
4. One pre-fix content finding was retained: family-wide source attribution falsely credited every monster for family-level rewards. It was corrected to honor each monster's actual drop permissions and covered by a test; the red evidence and final targeted tests are retained in `i-final-run-20261013/` and `contentFamilies.test.ts`.
5. The first closeout publication call supplied no report body to `scripts/recorded_reports.py`; the tool appended a zero-byte archive entry and replaced the working view with an empty file. That original entry is preserved in `playlog.jsonl`. The report was reconstructed from the recorded QA evidence and republished with stdin; the corrected view and checksum are verified below. This is a report-tool invocation error, not a product or test failure.

## Gate and next stage

- Phase7-I: **PASS WITH FINDINGS**.
- Engineering/source identity for J: frozen at the HEAD and fingerprint above.
- Phase7-J: released for approved inventory, 100,008 evenly stratified loot awards (4,167 per family/rank cohort), controlled combat matrix, public crafting/economy checks, and three-seed continuous 10/50/100-year checkpoints. Preserve the distinction between controlled fixtures and natural-world observations.
- Human validation: `DEFERRED / NOT APPLICABLE AT THIS STAGE`.
- Phase7-K still owns full final browser QA, the focused I-selector sweep, integrated review, and final Phase7 delivery gate. No Phase8 or V3 work is started.
