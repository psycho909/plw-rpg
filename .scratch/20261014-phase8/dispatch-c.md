# Dispatch C — Phase8-C Life & Economy Balance (stage C1: measure + diagnose)

- Role / single owner: `g6-luna-med-engineer` (gpt-6-luna / medium).
- Ticket: `tickets/20261014-v2x-08c-life-economy.md`; spec §3 P8-F03, §4, §7, §10 Economy, §13; baseline `reports/v2/20261014-balance-tuning/phase-08/baseline.md`; B results `combat-balance.md` (B accepted, commit `5bb7e48`).
- Write scope (exclusive): `scripts/phase8/**` economy/life runners and their node:test files (do not change B-owned combat/route-policy behavior; you may add a new route policy flag value or a new runner), `reports/v2/20261014-balance-tuning/phase-08/c-*/**`, `life-progression.md`, `economy-balance.md`. **No `src/` changes in C1.**
- Root-only Git. Sandbox: you cannot spawn child processes; list runner/vitest/node --test commands as **pending lead execution**. Never delete attempts.

## Known signals to explain (do not assume they are defects)

1. Life route v3: 676 crafts of the starterSpear-type recipe for Smithing Lv.3 (+60 XP) over 3 years; Hybrid 455–458 crafts, Smithing 3 → chore-risk signal (spec §7 "no endless lowest-tier crafting for XP").
2. Life seed-invariant (no RNG on gather/craft path).
3. Life gross gold 11,727 / net 9,023 vs Adventure ~2,300 in A v3 — check whether gather→sell is a near-riskless dominant income and whether it is a legitimate life-path advantage or an arbitrage/inflation risk.
4. Masterpiece: 16 consecutive ironShortSword crafts at Smithing 6 without a masterpiece in B2; masterpiece eligibility 0 under v3 policies.
5. Merchant buy/sell/stock/restock never measured (Phase7 gap P8-F03).

## Tasks

1. From source (cite file:line): merchant buy/sell price formulas, spread, stock model, restock rules, gold sinks; smithing XP curve and practice cap; recipe unlock rules; masterpiece chance formula; crop costs/yields/seasons; gathering yields.
2. Instrument the full cycle `Acquire → Produce → Sell → Purchase → Restock → Reinvest` and `Farm → Food → Economy/Civil Defense` using only public engine actions: item-level ledger of gathered inputs, crafted outputs, sales, purchases, stock levels before/after, restock events, gold sources/sinks. Run normal routes (Life, Hybrid, plus a crafting-focused variant that progresses recipes when legal) on seeds 61101–61103 × 3 years, and a controlled arbitrage probe: `Buy Material → Craft → Sell` loops at different smithing levels and stock states — report whether any loop yields unbounded riskless profit.
3. Smithing progression: XP per craft by recipe tier, time/craft count to each level, whether higher-tier recipes are legally reachable with obtainable materials, and whether the practice cap forces lowest-tier grinding.
4. Masterpiece: analytic chance by Smithing level/recipe from the formula, plus observed frequency where sampled — is it skill-driven or casino-like?
5. Write `life-progression.md` and `economy-balance.md` (normal vs controlled separation, seeds, sample sizes, uncertainty, no invented targets). End with a "C2 change proposals" section answering spec §4's five questions per candidate, or NO CHANGE with reason. Respect: different professions keep different economic/time costs; do not make all crafting permanently unprofitable to block arbitrage.

## Output

First reply with only the path of `reports/v2/20261014-balance-tuning/phase-08/c-runner/c1-pending-commands.md` once runners/tests are written. The lead runs them and returns results; then you write the two reports.
