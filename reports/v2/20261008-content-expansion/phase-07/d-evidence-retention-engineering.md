# D QA Evidence Retention Repair — Engineering Record

Status: bounded runner repair and focused verification complete. The original failed pack and authored-source evidence remains unrecovered. This work does not satisfy the historical blocker, accept D, waive a gate, or release E. Root will run the immutable old-CLI behavioral baseline and valid/invalid/publisher-failure CLI regressions after this source freeze; this record does not claim those runs happened.

## TDD evidence and provenance

The initial RED was `node --test scripts/test_validate_content_batch.mjs` failing to import the not-yet-created evidence helper (`ERR_MODULE_NOT_FOUND`). That was a missing-test-seam failure, **not** a behavioral reproduction of the prior evidence-retention defect. The original tool-history renderer exposed one combined output string; separate stdout/stderr streams and its numeric exit result were not retained. The complete output available in that tool history and an initial test-source reconstruction are transcribed now under `d-evidence-retention-red/`; both files state their retrospective provenance. The reconstructed initial test-source SHA-256 is `a085e3668cc452e41ff878ddfbc6af03dede33c955a370da472615f6ef50f49e`. The pre-fix validator SHA-256 at HEAD was `c40e157d2c3395cf2b7179c99aa26aa4fb5364a026e4575358626ef23cf06164`.

## Fix and focused GREEN verification

- Each exclusive run-evidence file write requests Node `flush: true`. This does not establish directory-entry synchronization or complete power-loss durability; README now states that limit.
- The manifest adds `package-lock.json`, `tsconfig.json`, and `scripts/recorded_reports.py` to the captured context, plus Node version, platform, and architecture.
- Reports distinguish content validation status from the overall validator plus child-check outcome. `outcome.json` has matching `contentValidationStatus` and `overallStatus` fields. A `vite.close()` error is retained as cleanup diagnostics and makes the aggregate fail.
- Report publisher stdout, stderr, and actual exit/error/signal status are captured in separate exclusive run artifacts. Publisher failure returns nonzero without replacing the prior readable report when the report writer fails.
- Native Node tests: 8 passed, 0 failed. They cover overwritten pack/source paths, unique captures, malformed bytes, child failures despite output (including spawn errors), truthful aggregate status, and refusal to overwrite an existing run artifact.
- `node --check scripts/validate_content_batch.mjs`: passed.
- `node --check scripts/validate_content_evidence.mjs`: passed.

No real CLI, old-CLI baseline, Python writer test, or full-game test suite was run in this fix pass.

## Current source identity

- Branch: `v2x/reward-core`
- HEAD: `f026b6b4947d18aadc0f551c642c31750db5768c`
- `scripts/validate_content_batch.mjs`: `79f390fad5a706955b1f2546c6065191e52e556d4c6297587d2a11cc8859c989`
- `scripts/validate_content_evidence.mjs`: `574343415da3524deb7092cc1288ce8e602eae8aa9eb41be9b998c62d8dd6bc4`
- `scripts/test_validate_content_batch.mjs`: `0d071a6a405b2121f5360a0af2c737a17f403d60f61b460ef4dc1cc842a393ba`
- `scripts/README.md`: `d50ca95bb9180265b7844e25ccb9ab6c488f3283003229e691867e24e2565b0d`

Evidence writes remain local filesystem captures. They are not tamper-proof and the input/source snapshots do not assert that a captured source generated the supplied pack.
