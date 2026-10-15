# Dispatch D1 — Phase8-D World & Regional Crisis (measure + diagnose)

- Role / single owner: `g6-luna-high-engineer` (requested gpt-6-luna / high; Owner escalation rule chooses High for cross-system Director/Crisis work). Review later by a different Max agent.
- Ticket `tickets/20261014-v2x-08d-world-crisis.md`; spec `docs/specs/V2X-PHASE8-BALANCE-TUNING.md` §3 P8-F05, §4, §8, §10 World, §13. HEAD `5e223be` (B, C accepted; C changed farming yield to `min(2, floor((level-1)/2))` — D must re-verify it in long worlds).
- Write scope (exclusive): new `scripts/phase8/*world*`/`*crisis*` runners + node:test files, `reports/v2/20261014-balance-tuning/phase-08/d-*/**`, `world-crisis-balance.md`. **No `src/` changes in D1.** Root-only Git: no commit/push/stash/reset; never delete attempts.
- Sandbox: you may request escalation ONLY for commands starting with `node scripts/phase8/` or `node --test scripts/phase8/`. Run your runners/tests yourself until validity gates pass; do not hand back unexecuted code. No npm/vitest/full check (lead runs). Keep each execution ≤ 20 min; split long lanes by seed/year if needed; runners write JSON/CSV/log then exit (no LLM polling).

## Reuse / read first
- `phase-08/baseline.md` World section (Phase7 long-world: threat stayed 3 at all 9 checkpoints, population 78–80 — explain whether threat is pinned/clamped or genuinely stable; crisis cycles were NOT measured).
- Phase7 `reports/v2/20261008-content-expansion/phase-07/long-world.md` + `k-current-source-long-world-20261013/attempt-01/` (how the lane loaded the engine).
- C harness pattern `scripts/phase8/economy-harness-core.mjs` / `run-life-economy.mjs` (Vite ssrLoadModule of src, public actions only, route-validity gates in `route-validity.mjs`). Do not build a second simulation engine: drive the real `simulate()` and public actions.
- Source: `src/engine/regionalCrisis.ts`, `regionalCrisisRecognition.ts`, `civilDefense.ts`, `crisisContributions.ts`, `simulation.ts` (director, threat, settlement food/population), `ownership.ts`.

## Tasks
1. From source (cite file:line): threat growth/decay, crisis trigger probability and cooldown, readiness inputs (food, equipment, guards, residents), outcome tiers, aftermath/recovery, population birth/death/succession, settlement food/prosperity dynamics, monster population & boss respawn.
2. Six scenarios (spec §8): No Intervention, Life-focused, Adventure-focused, Mixed, Prosperous settlement, Struggling settlement. Player scenarios use legal public actions (reuse validated route policies where possible; a light periodic policy is fine for 50/100y as long as it is legal and documented). Prosperous/Struggling = controlled starting-state fixtures — label them controlled, separate from normal.
3. ≥3 seeds × 10/50/100 years per scenario (add seeds, not years, if conclusions unstable). Record per seed: crisis count/interval distribution, outcome tier distribution, readiness at trigger, food/equipment donations by source (cheap-donation dominance check), threat & monster population series, boss alive/respawn, population/living NPCs, settlement food/prosperity, recovery time after failures, save size & save/reload equality at checkpoints.
4. Check explicitly: Monster Flood, Boss Spam, Threat Spiral, Crisis Overfrequency, Population Death Spiral, Permanent Decline, Resource Inflation (incl. gold under V4 farming), "NPC always auto-wins", "fixed crises", "one cheap donation replaces all contributions", "life player forced to fight", game-over/reset.
5. Write `world-crisis-balance.md` (normal vs controlled separated, seeds, sample sizes, uncertainty, no invented targets, source file:line), ending with "D2 change proposals" answering §4's five questions per candidate or NO CHANGE with reason. Do not implement changes.

## Output
`d-runner/d1-summary.md`: commands run with results, attempt paths, validity status, lead pending commands. Reply with only that path.
