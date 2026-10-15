# Dispatch E1 — Phase8-E Reward & Progression Pacing (measure + classify)

- Role / single owner: `g6-luna-med-engineer` (requested gpt-6-luna / medium). Per Owner escalation rule, two failures with a shared root cause ⇒ lead escalates to High; so execute and verify your own work.
- Ticket `tickets/20261014-v2x-08e-reward-pacing.md`; spec `docs/specs/V2X-PHASE8-BALANCE-TUNING.md` §3 P8-F02, §4, §9, §10 Loot/Normal Play, §13. HEAD `5e223be`. Phase8-D runs in parallel (another worker owns `scripts/phase8/*world*|*crisis*`, `d-*/`); do not touch those.
- Write scope (exclusive): new `scripts/phase8/*pacing*|*drought*|*loot*` scripts + node:test files, `reports/v2/20261014-balance-tuning/phase-08/e-*/**`, `reward-pacing.md`, `loot-reward-distribution.md`. **No `src/` changes in E1.** Root-only Git; never delete attempts.
- Sandbox: escalation ONLY for commands starting with `node scripts/phase8/` or `node --test scripts/phase8/`. Run your scripts/tests yourself until they pass; no npm/vitest/full check (lead runs). Each execution ≤ 15 min.

## Inputs (reuse, do not rerun unless needed)
- Normal routes: A v3 `phase-08/a-baseline-run/attempt-20261014T040039340Z/` (Life/Adventure/Hybrid × 3 seeds × 3y; raw >1MB are `.gz`, read with zlib), B measured routes `phase-08/b-runner/normal-route-attempts/`, C after-V4 `phase-08/c-runner/attempt-20261014T093926448Z/` (economy variants). Note each route's policy, action ceiling and that they are scripted itineraries, not humans.
- Phase7 heuristic 1h fresh-save trace + A classifier `scripts/phase8/classify-playtest.mjs` (A: 840 actions, 247 noProgress; 173 runner-marker, 74 resource-cue, 0 UI/world-wait/goal — rules were narrow).
- B-F1 (`phase-08/combat-balance.md:115`): Bosses visible long before beatable → goal/danger clarity question for E. B-F2 Boss difficulty spread is for F, only reference it.
- Loot: Phase7 `reports/v2/20261008-content-expansion/phase-07/loot-analysis.md` (≥100k drops, fingerprint 6a320cfc…). Spec allows reuse only if loot parameters are unchanged: prove it with `git diff e05cc78 HEAD -- <loot/reward/itemGeneration/drop-table files>` (list files checked); if anything changed, rerun a ≥100k loot sample with a runner.

## Tasks
1. Per route (Life, Adventure, Hybrid separately; normal vs controlled labeled), compute drought intervals in game time and action count for: meaningful new item (define from data: first-of-kind / rarity/stat upgrade), skill level-up, new enemy/content first seen, asset/wealth step (property, gold milestones), new available goal (recipe unlock, rank unlock, boss eligibility). Report distributions (median/p90/max), not targets.
2. Chore risk: repeated low-tier craft past practice cap, repeated low-tier gathering, repeated Wait 1 Day, farming with no strategy change, same low-risk enemy streaks — with counts and whether a better legal option existed at that moment (from state).
3. Classify no-progress (runner policy defect / UI not visible or reachable / lacking resources / no understandable next goal / excessive wait-repeat cost / legitimate world wait) with evidence and confidence; broaden A's rules using state (stamina, gold, time-of-day, cooldowns, shop hours). Do not equate no-progress with boredom.
4. B-F1: from route data, time from first Boss visibility/encounter to first legal win, what the UI/state exposes as the next step meanwhile (cite UI source, e.g. src/components/*), and whether players can tell danger/eligibility.
5. Write `reward-pacing.md` and `loot-reward-distribution.md` (sources file:line, seeds, samples, uncertainty, no invented thresholds), ending with "E2 change proposals" answering §4's five questions per candidate or NO CHANGE with reason. Prefer existing world state / visible goals / player choice; never daily quests, login rewards, fixed timed rewards, or "every click rewards".

## Output
`e-runner/e1-summary.md` with commands run + results, outputs, lead pending commands. Reply with only that path.
