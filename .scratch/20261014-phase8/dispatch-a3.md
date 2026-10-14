# Dispatch A3 — normal-route runner validity (RETURNED)

Owner: `g6-luna-med-engineer`; same scope/rules as dispatch-a.md / a2.md (Root-only Git, `git diff -- src` empty, never delete attempts).

Lead executed (outside sandbox):
- `node --test scripts/phase8/test_classify_playtest.mjs` → PASS 2/2.
- `node scripts/phase8/run-normal-routes.mjs` → PASS, 34 s, attempt `a-baseline-run/attempt-20261014T031753470Z/` (3,240 daily rows, 314 encounters, 3,275 actions).

## Lead review: results are policy artifacts, not a baseline

Seed 61101 summaries:
- **Life**: 360 actions over 3 years, 0 crafts, 0 crops, all skills level 1, gold 45, food 3, `noProgress: 0`. The route did nothing effective, yet no failure was recorded → failed/ineffective actions are being counted as success, or the policy never issues productive actions.
- **Exactly 1 action per in-game day** for every route. A player takes many actions per day bounded by stamina/time; one-per-day starves every route.
- **Adventure**: 310 fights, 16 Boss + 82 MiniBoss wins, 0 deaths, 0 retreats, level 22. Controlled Boss win rate is 34.2%; 100% needs an explanation (encounter selection? Boss definitions actually engaged? HP restored between fights? fights only at high level?).
- **Hybrid**: 1 fight, level 4 → the branch logic barely executes the adventure half.

Do not tune the game. Fix and validate the **runner/policy**:

1. Read how the existing UI/action layer advances time and spends stamina (`src/engine/actions.ts`, `simulation.ts`, related UI handlers) and model a realistic per-day action budget: act until the legal budget (stamina/time/rest) is used, then advance. Document the rule.
2. Treat every action outcome strictly: success only when the engine reports success AND the relevant state changes; otherwise record no-progress with a reason. Life actions (gather/farm/plant/harvest/craft/sell) must be verified as actually changing resources/skills.
3. Add **validity gates** written to `completion.json` per route/seed, and report status `INVALID_POLICY` (not PASS) if violated, for example: Life must show non-zero gathering/farming/craft activity and some skill XP gain; Adventure must show at least one non-win outcome OR a documented reason why all wins are expected (with HP before/after and Boss definition IDs checked); Hybrid must execute both halves. Gates check that the runner actually played; they are not balance targets.
4. Explain the Adventure 100% result with evidence from encounter rows (definition IDs, rank, band, HP before/after, level).
5. Leave the rerun to the lead: list `node scripts/phase8/run-normal-routes.mjs` as pending lead execution. Add node:test coverage for the validity-gate and outcome-classification helpers (pure functions, runnable via `node --test`).
6. Append an "A3" section to `a-worker-summary.md`; record attempt `031753470Z` in `baseline.md` as superseded (policy artifact) with the reasons above; do not use its numbers as baseline.

Reply with only the summary path.
