# Phase8-C1 — Pending Lead Execution

Status: **normal-route v3 policy parity and validity gating added; Lead reruns pending**. Attempt `attempt-20261014T065217256Z` is superseded because its Life and craft-focused routes were policy artifacts (`INVALID_POLICY`); retain it as historical evidence. The corrected runner uses walkable engine region tiles and applies the shared `route-validity.mjs` gates; any invalid route makes completion status `INVALID_POLICY`, never `PASS`.

## Scope and constraints

- Owner: `g6-luna-med-engineer`, single owner for C1.
- Ticket: `tickets/20261014-v2x-08c-life-economy.md`; specification: `docs/specs/V2X-PHASE8-BALANCE-TUNING.md` §3 P8-F03, §4, §7, §10 Economy, §13.
- New runner: `scripts/phase8/run-life-economy.mjs`; pure ledger helpers: `scripts/phase8/economy-harness-core.mjs`; focused tests: `scripts/phase8/test_economy_harness.mjs`.
- Output is written to an exclusive new UTC attempt under `reports/v2/20261014-balance-tuning/phase-08/c-runner/attempt-<UTC>/`. Do not remove or overwrite attempts.
- No `src/` change, no commit/push, no sandbox escalation. Lead execution is needed for Node/Vite/Vitest commands.

## Remaining reruns for Lead execution

Run at repository root in the installed-dependency Windows environment. Record the actual result and attempt path; retain failure output and attempts.

1. **pending lead execution** ? `node scripts/phase8/run-life-economy.mjs`
2. **pending lead execution** ? `npm run check`

Expected runner evidence: nine normal fresh-save policy samples (Life, Hybrid, crafting-focused Life × seeds 61101–61103, three years each), action-level item/gold ledger, farm and craft rows, daily recipe-plan samples / first-legal-plan times, daily stock snapshots, farm-business food contributions where public eligibility permits, controlled Buy → Craft → Sell loops for Smithing levels 1/3/5/6, and post-day repeat-buy availability checks. Confirm the `completion.json` status, each route's completion window, output counts, and every controlled probe outcome. These are scripted route observations, not human play or target rates.

## Source-reading notes for report continuation

Current engine source indicates common store purchases are gated by price, gold, settlement stage and store access; `trade` sells only owned inventory. The buy formula uses item base price, a town-stage factor, and a living-event trade penalty. Gather and crop actions apply the item/food quantities and costs in the public engine. Recipe practice XP stops at each recipe's `practiceCap`; masterpiece eligibility and chance are recipe-specific. No merchant stock inventory or restock action/API was found in the source search. The runner will verify its stock-field observations and repeat-buy-after-day probe at runtime; report stock/restock as **NOT MODELED** unless runtime evidence contradicts source inspection.

Primary source pointers (line numbers are the current checkout; recheck before final reports):

- `src/engine/actions.ts:83-98` gather amount, stamina/time, resource depletion and 4-gold work income.
- `src/engine/actions.ts:115-138` public store trade restrictions, sell value and purchase formula.
- `src/engine/livingEvents.ts:553-564` trade price multiplier and living-trade effects; `src/engine/livingEvents.ts:444` daily penalty decay.
- `src/data/config.ts:33-37` common item base buy/sell prices and minimum settlement stage.
- `src/engine/crafting.ts:179-258, 414-478` plan legality, recipe cost, practice XP cap, masterpiece eligibility, public craft transaction.
- `src/data/crafting.ts:4-117` legacy recipes, required Smithing levels, practice caps, inputs/time/gold and `ironShortSword` masterpiece rule.
- `src/engine/simulation.ts:225-239` skill XP progression curve; `src/engine/simulation.ts:27` settlement-stage index.
- `src/engine/crops.ts:35-73`, `src/engine/actions.ts:35-80`, `src/data/content/farmCrops.ts:10-100` crop eligibility, costs, maturity/yield, food values and sale prices.
- `src/engine/rewardActions.ts:44-54, 67-122` crafted-item valuation/premium and public item/material sales.
- `src/engine/ownership.ts:53-105, 169-212` property eligibility and cost gates, farm-business acquisition, and public food supply into settlement stock (civil-defense supply); `src/data/ownership.ts:12-31` land/business price and reputation gates.
- `src/engine/crafting.ts:240-245` plan-level masterpiece chance; `src/engine/itemGeneration.ts:191-201, 239-246` skill eligibility and RNG application.

Known controlled-fixture distinction: the probe sets Smithing level and, for the town case, settlement stage/blacksmith availability directly to represent the requested comparison cells; it executes purchase, craft and sale through public engine actions. Keep these results under **controlled** evidence. If blacksmith is unavailable in the village cell, preserve that blocked result instead of counting it as a completed loop.
