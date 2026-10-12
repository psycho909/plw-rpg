# Phase7-C4 Fix, Independent Review, and Root Acceptance

## Source and scope

- Branch: `v2x/reward-core`.
- Source before correction: `9b13e7b9f45a60e175d8a278a822e951b1f46f9d`; repository HEAD before this closeout: `f0c9171faf7eb45528e627e3a0d3fde3a1b4dc81`.
- Corrective source snapshot: the five-file path→SHA-256 map fingerprint `fc27dd89b3791d702e877cf9b3bb6ec7d5161d95a88fba2bb076c51d3ad0c9b1` (exactly the snapshot independently reviewed).
- Changes: safely normalize Reward3 material-owner maps; preserve and validate special owner keys; add two public `deserialize` regressions; remove the two newly introduced unused helpers; clean the two reported source EOF whitespace issues.
- This is the final C corrective slice only. It adds no feature scope and changes no save schema version or world/RNG behavior.

## Findings and test-first evidence

- Initial independent post-fix C review returned the snapshot with a P2 `__proto__` owner data-loss / unknown-owner acceptance finding and a P3 unused-helper finding. The exact initial review remains in `reports/audit/phase7-c-postfix-independent-review.md`.
- Before production correction, the new tests failed as expected: `npm run test -- src/services/saveService.test.ts -t special` exited 1, with 2 failed / 105 skipped. Raw failure evidence remains in `c4-proto-owner-red.md` and the report archive; it is not overwritten by the passing result.
- After correction, the same focused command passed: 1 test file, 2 passed / 105 skipped.
- Independent follow-up: `reports/audit/phase7-c-postfix-followup-review.md` — Standards PASS, Spec PASS, no remaining finding in the corrected diff. Requested `gpt-6-astra/max`; actual runtime telemetry unavailable. Reviewer did not rerun the complete suite.

## Engineering verification

- `npm run check` after the correction: PASS, 30 test files / 567 tests; `vue-tsc --noEmit` PASS; production Vite build PASS (90 modules, JS 366.84 kB / gzip 127.55 kB).
- `git diff --check -- src/`: PASS.
- The earlier full C corrective run at 565 tests and the original failures remain preserved in `c-regression-final.md`, `c-regression.md`, and `c-fullregression-run/`. The two additional C4 tests explain the increase from 565 to 567.
- Existing frozen Slime validation remains the scoped data proof: 0 errors / 0 warnings, 11 qualifying monsters, 8 usable materials, 8 equipment bases, 4 recipes; pack/module hashes are recorded in `c-core.md` and `slime-content-validation.md`. C4 did not change the Slime pack.
- A validator command attempted without its required `--pack` argument returned usage (exit 2); that was an invocation error, not a validation run. No pass is attributed to it.

## Browser smoke and environment limitation

- The environment's pre-existing `/workspace/.cloud-onboarding/plw-rpg/smoke.py` did not pass unchanged: on a fresh save the game presents the expected `起身` introduction dialog, which intercepts its first click on the global `暫停` control. The helper was not modified.
- A disposable Chromium context reran the same functional flow after dismissing that introduction: pause, movement, farming preparation/plant/mature/harvest, C/I/L/M windows, localStorage save/reload. Result PASS; world time 3456, food 8, no page errors.
- This is a smoke test, not a long browser soak, full UI regression, or natural-exposure/balance measurement.

## Root acceptance and remaining gate

- Standards: PASS.
- Spec: PASS for C's accepted Slime content/runtime/save/RNG closure and the reviewed corrective diff.
- Root accepts Phase7-C locally on 2026-10-12 after the independent audit and required engineering checks.
- Phase7-D is released as a separate in-progress stage; its own acceptance remains pending. Phase7 as a whole remains `in_progress`; no Phase7 Product Gate or human validation is claimed.
