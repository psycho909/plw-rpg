# Phase10-R independent re-review (luna-max-p10r-review; read-only, did not implement)

Ticket `tickets/20261016-v2x-10r-external-review-fixes.md`; external review `reports/v2/20261016-final-qa-rc/phase-10/Oakvale-V2x-External-Code-Review.md`.
Scope = all Phase10-R source/test changes: `git diff 0d86c50 99ae963 -- src/` (worker round 1–2) PLUS current uncommitted `git diff -- src/` (lead + round 3–4).
Worker summaries: `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r1-summary.md`, `.scratch/20261016-phase10r/r-runner/r2-summary.md`, `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r3-luna-medium-guard-test-summary.md`, `r4-sol-medium-journal-coalesce-summary.md`.

A previous independent review found 3 issues (now claimed fixed): (P2) coalescing mutated a checkpointed record in place; (P2) time coalesced into summary/gap markers; (P3) P3-02 guard test was vacuous. Verify these fixes and re-check everything:
1. P1-01 crafting aggregation + pre-deduction guard; G-01 covers all overlapping recipes from data; `contentItems.integration.test.ts` expectation change is correct.
2. G-02 reload invariant test is meaningful.
3. Journal: replacement-with-new-id for persisted records; in-place merge only for unpersisted; marker exclusion; cap/gap/compaction; retry/backoff; reset under quota; old v1 journal loads; no schema change. Judge the documented residual risk (overlapping ranges under different ids after lost ack) — acceptable or must fix?
4. P3-02 guard and its test.
5. Tests are not weakened to pass (compare old vs new assertions).

Read-only. Do NOT run tests: lead runs full `npm.cmd run check` separately.
Reply in your final message: verdict APPROVE / CHANGES REQUIRED, then findings ranked P1/P2/P3 with file:line, failure scenario, suggested fix. Concise.
