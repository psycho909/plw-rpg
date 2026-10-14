# Dispatch C1-High — Phase8-C economy harness (escalated Medium → High)

- Role / single owner: `g6-luna-high-engineer` (requested gpt-6-luna / high). Escalated per Owner rule (docs/agents/agent-routing.md §2, 2026-10-14) after three failed Medium handoffs on C1 (syntax error → Life/craft routes policy artifact → runtime `TypeError: Cannot read properties of undefined (reading 'x')`). Medium is stopped on C.
- Owns: `scripts/phase8/run-life-economy.mjs`, `scripts/phase8/economy-harness-core.mjs`, `scripts/phase8/test_economy_harness.mjs`, new attempts under `reports/v2/20261014-balance-tuning/phase-08/c-runner/`, then `life-progression.md`, `economy-balance.md`. You may read/import (not change behavior of) B-owned `run-normal-routes.mjs`, `route-policy.mjs`, `route-validity.mjs`; a small export-only refactor of them is allowed if covered by their existing tests.
- **No `src/` changes.** Root-only Git: no commit/push/stash/reset. Never delete attempts.

## Process change (root-cause fix)

You MAY request sandbox escalation, but ONLY for commands starting with `node scripts/phase8/` or `node --test scripts/phase8/`. The lead will approve that prefix. Run your own runner and tests until they pass validity gates — do not hand back unexecuted code. Do NOT run `npm`, `npx vitest` or the full check; the lead runs those. Keep each runner execution ≤ 15 min.

## Read first

`.scratch/20261014-phase8/dispatch-c.md` (C1 goals — still authoritative), `reports/v2/20261014-balance-tuning/phase-08/c-runner/c1-pending-commands.md` (Medium's source notes incl. merchant stock/restock NOT MODELED), `a4-max-summary.md` (validated route policy facts), `baseline.md` (v3 Life ~676 crafts, farming).

## Evidence so far (lead-executed)

- Attempt `attempt-20261014T065217256Z`: superseded, Life/craft-focused routes did nothing (gold 75–83, skills 1, 0 crops). Controlled Buy→Craft→Sell probes 58 rows and finding "no merchant stock state on GameState" are reusable observations.
- Attempt `attempt-20261014T065611582Z`: crash, `failure.json` retained.
- `node --test test_economy_harness + test_route_validity`: 16/16 PASS.

## Deliver

1. Economy ledger built on the validated v3 policies (Life, Hybrid; optional craft-focused only if it passes gates), seeds 61101–61103 × 3 years, route-validity gates enforced (any INVALID_POLICY ⇒ run status not PASS). Item-level ledger: gathered inputs, crafts, sales, purchases, gold sources/sinks, stock observations, farm→food→settlement supply.
2. Controlled arbitrage probe results (Buy Material → Craft → Sell by Smithing level / settlement stage).
3. Smithing XP curve, practice caps, recipe unlock reachability, masterpiece chance formula + observed frequency.
4. `life-progression.md`, `economy-balance.md` (normal vs controlled separation, seeds, sample sizes, uncertainty, no invented targets, source file:line), ending with "C2 change proposals" answering spec §4's five questions per candidate or NO CHANGE with reason. Note: a missing merchant stock/restock system cannot be added in Phase8 (spec §13 forbids a new economy engine) — report it as a product finding with impact.
5. `c-runner/c1-high-summary.md`: commands you ran with results, attempt paths, then the lead's pending commands (vitest/npm only). Reply with only that summary path.
