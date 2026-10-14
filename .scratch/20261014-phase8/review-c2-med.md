# Review request — Phase8-C2 V4 farming yield cap (g6-luna-med-reviewer)

Review only; do not modify files; no commit. Report findings with evidence/severity/recommendation, or explicit PASS. Write result to `reports/v2/20261014-balance-tuning/phase-08/c-review/c2-med-review.md` (create dir) and reply with only that path.

- Spec: `docs/specs/V2X-PHASE8-BALANCE-TUNING.md` §4 (five questions), §7 (economy limits, 生活成長), §13 (no new systems).
- Owner decision 2026-10-14: V4 = Farming yield bonus `min(2, floor((level-1)/2))`, applied to all crops incl. wheat.
- Diff: `.scratch/20261014-phase8/c2-v4-src.diff` (src/engine/crops.ts, src/engine/actions.ts, src/engine/crops.test.ts).
- Evidence: engine vitest 28 files/424 PASS (lead); after-run `reports/v2/20261014-balance-tuning/phase-08/c-runner/attempt-20261014T093926448Z/` 15/15 VALID vs before `attempt-20261014T090744303Z/`; brief with numbers `.scratch/20261014-phase8/dispatch-c-high-r3.md`.
Check: formula matches the decision at every level; all yield paths covered (grep for other farming-level yield uses incl. NPC farming, FarmBusiness, UI previews showing harvestAmount); save/load or determinism impact; test adequacy; no out-of-scope change.
