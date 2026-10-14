# Dispatch B2 — Lead decisions on B1 and B2 scope

Owner: `g6-luna-max-core-engineer` (same write scope/rules as dispatch-b.md). B1 accepted as diagnosis (`b1-diagnosis.md`).

## Decisions

| Item | Decision |
|---|---|
| H1 Wolf tie-break | **APPROVED (runner-only).** Prefer the next legal not-yet-defeated chain member over re-farming a defeated one; document rule. |
| H2 Threat exposure | **APPROVED (runner-only).** Add a route variant (e.g. `adventure-measured`, `hybrid-measured`) that does not over-clear Normal monsters (justify the rule from player-plausible behavior, e.g. daily Normal cap / leaving regions to recover). Keep v3 policies runnable unchanged as the control; select policy via CLI flag or config so both can be run on the same seeds 61101–61103 × 3 years. |
| H3 per-Boss difficulty | **DEFERRED.** No parameter change in B2. Re-evaluate after matrix + corrected route data. |
| H4 narrow Boss windows | **DEFERRED.** Report per-Boss eligibility reasons/time windows from the new runs (stratified by region/hour/season/threat/level). |
| Boss save/reload gaps | **APPROVED (tests only).** Add focused tests: Goblin Chief `bossAlive`/`bossProgress` save→load round trip and post-defeat state; Wolf King post-defeat cooldown survives save→load. No engine change unless a test proves a defect — then STOP and report before fixing. |
| Combat matrix | **APPROVED as designed in B1 §4–§5**, runner-side only. First write a cell manifest with counts and estimated wall time; if any single run exceeds ~15 min, split it. Gross damage: runner-side observer only; if exact gross damage is impossible without a `src/` hook, mark it NOT MEASURED and write the hook proposal instead of editing `src/`. Potion use from inventory deltas. Boss rows per ID (6 Phase7 Bosses + Goblin Chief + Wolf King where legally constructible); first-kill loadouts may not include that Boss's own drops. |

## Deliverables

1. Runner changes + node:test coverage for new pure helpers (tie-break, variant policy rules, risk-adjusted reward calc, gross-damage reconstruction if used).
2. New vitest tests for Boss save/reload.
3. List of pending lead commands, in order, e.g.:
   - `node --test scripts/phase8/<tests>`
   - `npx vitest run <new/affected test files>`
   - `node scripts/phase8/run-normal-routes.mjs --policy <v3|measured>` (both)
   - matrix runner command(s)
4. After the lead returns results to you, write `combat-balance.md`, `boss-progression.md`, `equipment-build-analysis.md` drafts (§17) with normal vs controlled separation and before/after-ready structure; until then reply with the pending command list.

Reply now with only the path of a short `b2-pending-commands.md` once code/tests are written.
