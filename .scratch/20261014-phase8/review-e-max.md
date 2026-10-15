# Review request — Phase8-E (g6-luna-max-deep-reviewer role; reviewer did not build E)

Review only; do not modify files; no commit. Report findings (severity, evidence file:line, recommendation) or explicit PASS. Write to `reports/v2/20261014-balance-tuning/phase-08/e-review/e-max-review.md` and reply with only that path.

- Spec: `docs/specs/V2X-PHASE8-BALANCE-TUNING.md` §3 P8-F02, §4, §9 (incl. "Runner 與產品問題區分"), §10 Loot/Normal Play, §13, §17 (reports must have raw evidence, seeds, before/after, source fingerprint).
- Ticket `tickets/20261014-v2x-08e-reward-pacing.md`. HEAD `5e223be` (src unchanged in E).
- Deliverables: `phase-08/reward-pacing.md`, `phase-08/loot-reward-distribution.md`, `phase-08/e-runner/e1-summary.md`; scripts `scripts/phase8/{pacing-analysis-core,run-pacing-drought,run-pacing-instrumented,analyze-pacing-instrumented,run-loot-pacing,test_pacing_analysis}.mjs`; evidence `phase-08/e-runner/instrumented-attempt-20261014T102419801Z/` (+ analysis-summary-r6.json, boss-visibility.json), `loot-attempt-20261014T100851766Z/`.
Check: are claims supported by the raw data (spot-check numbers); is the instrumented runner a faithful reuse of policy v3 (no hidden policy change) and are validity gates real; is the no-progress classification logic sound and honest about confidence; loot reuse/rerun decision correct (git diff e05cc78..HEAD on loot files); controlled vs normal separation; is "E2 NO CHANGE" justified under §4/§9, or is there an evidenced product defect that should be changed within §13 limits; anything invented as a threshold.
