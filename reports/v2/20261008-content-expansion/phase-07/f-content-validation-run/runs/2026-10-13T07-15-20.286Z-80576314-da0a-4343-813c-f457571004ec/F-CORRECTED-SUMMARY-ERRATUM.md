# Corrected F Summary — Supersedes Stale Summary Statements

This append-only erratum corrects the narrative and test-count values in `f-content-validation-final-summary.md`. It does not replace that file or alter its archived playlog snapshot. Treat this erratum as the corrected summary for the run.

- Run: `2026-10-13T07-15-20.286Z-80576314-da0a-4343-813c-f457571004ec`
- Original summary SHA-256: `0dcb48639c009c2dcee23f5b8d3114540a92c30ee6114c8d1eb7b0930cc07603`
- Original playlog record ID: `fd4b7e25-e252-4c54-ab1a-83352dea5fbc` (`initial-capture`, recorded `2026-10-13T07:16:17.438+00:00`). The original compressed snapshot remains in `playlog.jsonl` and matches the original summary bytes and SHA.

## Corrected measured outcomes

All seven standard CLI invocations exited 0 with Content PASS and Overall PASS. Each case passed 23/23 targeted tests, typecheck, and report publishing. This supersedes the original summary table's “23” row formatting ambiguity and its incorrect prose claiming 21 tests, five content passes, and two failures.

| Case | CLI | Content | Targeted tests | Typecheck | Publisher |
| --- | ---: | --- | ---: | --- | --- |
| slime | 0 | PASS | 23/23 | PASS | PASS |
| cave-insects | 0 | PASS | 23/23 | PASS | PASS |
| wild-beasts | 0 | PASS | 23/23 | PASS | PASS |
| frontier-goblins | 0 | PASS | 23/23 | PASS | PASS |
| fog-undead | 0 | PASS | 23/23 | PASS | PASS |
| mine-constructs | 0 | PASS | 23/23 | PASS | PASS |
| six-family-combined | 0 | PASS | 23/23 | PASS | PASS |

Raw result JSON, outcome JSON, and targeted-test stdout for each case independently report exit 0 and `Tests 23 passed (23)`. The six-family aggregate has 66 qualifying monsters, 96 candidate item IDs, and 48 usable materials. The gear audit measured 48 definitions, zero functional clone groups, and 48 qualified gear candidates. No content errors or warnings were recorded.

The original artifact remains available unchanged for audit history; this erratum and its new playlog capture are the corrected, superseding human-readable summary.
