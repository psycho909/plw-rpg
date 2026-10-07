# Phase6-B strict severity save validation fix

- Base commit: `b82de85fb251697fca3e4331c5bb44945349a387`.
- Low reproduction: `b-review-repro.md` and `b-review-repro-raw.json`. String `"2"` and array `[2]` were accepted by `deserialize` as malformed runtime values; numeric `2` was accepted as the control. The initial runner startup failure remains in `b-review-repro-initial-failure.json`.
- RED after adding regression coverage: `b-fix-red-save-severity.txt` records exit 1, with three numeric controls passing and string, boolean, and array severities unexpectedly accepted.
- Fix: `saveService.ts` now validates severity with `safeInt(value.severity, 1, 3)`, compares the already validated numeric value directly, and uses it directly for cooldown arithmetic.
- An initial typecheck finding is preserved in `b-fix-typecheck.txt`: the new test accessed `severity` without narrowing the `RegionalCrisisState` union. The assertion was changed to `toMatchObject`; this was a test typing issue, not a runtime source defect.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test -- src/services/saveService.test.ts -t 'validates crisis severity as a number'` | PASS, 6 cases | `b-fix-green-save-severity.txt` |
| `npm run test -- src/services/saveService.test.ts` | PASS, 92 tests | `b-fix-regression-save-service.txt` |
| `npx vue-tsc --noEmit` | PASS, exit 0, no diagnostics | `b-fix-typecheck-green.txt` (empty output) |
| `git diff --check -- src/services/saveService.ts src/services/saveService.test.ts` | PASS | command returned exit 0 |

## Source correlation

Compared against `b-source-freeze.json` (base fingerprint `85b0cdb5eb05a9ab650b083e6d962bbd44554e18f5ba79e7af87a091b5a6b663`): all 82 frozen source paths exist; only the authorized save service and its test differ. The other 80 frozen source hashes match.

- `src/services/saveService.ts`: `0a3c0eccd472dfcfc6b1474f9594cc6d71b3246b5f8b45358b01644bc0f430d6`
- `src/services/saveService.test.ts`: `b04c7edca2206d6eab886eb6ff2f7e3676fae662377966d585e14ff983110e85`

No C implementation was started. B remains pending independent review.
