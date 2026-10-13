# D quality-count validator fix run

- Original false-positive report remains in `d-remaining-validation-run/runs/2026-10-13T02-18-13.159Z-6acc43b8-e9e8-42d8-a689-89b3d08be6bb/`; this fix run did not alter or rerun its frozen CLI/source snapshots.
- RED: `red-exit.txt` is 1. Captured stdout/stderr and pre-edit source SHA are in the adjacent `red-*` files. The new baseline-affix regression observed `duplicate-like-equipment` and `duplicate-like-material` for distinct baseline affix IDs.
- GREEN: `green-exit.txt` is 0; `src/engine/contentValidation.test.ts` passed all 18 tests, including distinct baseline effects and duplicate detection for identical authored effects.
- Typecheck: `typecheck-exit.txt` is 0 (`npx vue-tsc --noEmit`).
- An intermediate test invocation exposed an incorrect expected total in the new test (the aggregate item count includes both equipment and materials). Its raw output and status are retained in `green-attempt-*`; after correcting the expectation, the recorded GREEN run passed.
- Change: validator signatures now use actual authored affix stat/slot/tier metadata when present, and stable affix IDs when effect metadata is unavailable. Material bias signatures use the same resolver.
- Final source SHA-256 values: see `final-source-sha256.txt`; exact scoped diff: `final-diff.patch`.
- No domain or CLI metadata change was needed. The combined D pack qualification has not been recalculated here; Root's serialized QA runner should perform that against the corrected frozen validator.
