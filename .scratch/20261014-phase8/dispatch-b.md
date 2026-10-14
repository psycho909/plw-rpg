# Dispatch B — Phase8-B Combat & Equipment Balance

- Role / single owner: `g6-luna-max-core-engineer` (gpt-6-luna / max). Reason: P8-F01 Elite/MiniBoss eligibility is a cross-system encounter/Director question and you already hold the A4 encounter-legality context. You will NOT be the independent reviewer (that is a separate Max context).
- Ticket: `tickets/20261014-v2x-08b-combat-equipment.md`; spec §3 (F01, F04), §4, §6, §10 Combat, §16; baseline: `reports/v2/20261014-balance-tuning/phase-08/baseline.md` (accepted, commit `ea75684`).
- Write scope (exclusive): `src/data/**` and `src/engine/**` combat/encounter/reward-eligibility code ONLY where evidence requires; matching `src/**/*.test.ts`; `scripts/phase8/**` (you may extend runners; keep new attempt dirs, never delete attempts); `reports/v2/20261014-balance-tuning/phase-08/b-*/**` and the three B reports. Do not touch economy/merchant/crop/crisis tuning (C/D lanes).
- Root-only Git: no commit/push/stash/reset/branch.
- Sandbox: you cannot spawn child processes. Any command needing Vite/Vitest/npm/node --test/runner execution → list as **pending lead execution** with exact command; the lead runs it and reports results back to you. Do not request escalation.

## Method (spec §4 — mandatory order)

`Baseline → Hypothesis → Controlled Comparison → Change → Regression → Natural Validation`. Never blanket buff/nerf. No new monsters/bosses/families/engine.

## Stage B1 — diagnosis and plan (deliver first, then STOP for lead decision)

1. **Elite / MiniBoss NOT OBSERVED.** Using source + v3 encounter/availability rows, determine exactly why no Elite/MiniBoss became eligible in 3 scripted years on any route (which gate: level, threat, settlement stage, season/hour, region, Wolf chain, population, cooldown). Classify: (a) runner policy limitation, (b) intended long-horizon gating, (c) unreachable/near-unreachable gating defect. Prove with a minimal deterministic reproduction where possible.
2. **Boss progression.** Separate Phase7's six new Bosses and existing important Bosses (Goblin Chief, Wolf King, …). For each: legal spawn conditions, observed natural opportunity in v3 (or `NOT OBSERVED`), controlled win rate by band (from Phase7 combat extraction), retreat/death, preparation cost, reward on victory, cooldown, save/reload coverage in existing tests.
3. **Combat matrix design.** Representative Early/Mid/Late × Normal/Elite/MiniBoss/Boss × builds (Legacy / Adventure Loot / Crafted / Boss Gear / Masterpiece; Damage / Crit-Speed / Bleed / Penetration / Defense). Builds must be legally obtainable at that band — document the acquisition path for each. Specify metrics: win rate, turns P10/P50/P90, potion use, HP remaining, risk-adjusted reward, fight cost. If the engine does not expose potion/damage/cost, propose the smallest read-only instrumentation.
4. **Hypotheses.** List candidate balance problems with the evidence that supports each, the player decision it affects, the proposed minimal parameter change (stat coefficient / encounter weight / skill cost-cooldown / resistance-armor / reward quality / progression eligibility), expected effect, and regression risks. Rank them. Include "no change" where evidence does not justify one.

Write `reports/v2/20261014-balance-tuning/phase-08/b1-diagnosis.md` and reply with only its path. Do not change `src/` in B1. The lead will decide which hypotheses proceed to B2 (controlled comparison + change).

## Product principles to respect

Normal monsters offer different tactics; Elite worth challenging; MiniBoss rewards preparation; Boss high risk with unique reward; specific builds may counter specific enemies; no low-cost build dominates everything. Controlled win rate never substitutes for normal-play experience. No invented numeric targets.
