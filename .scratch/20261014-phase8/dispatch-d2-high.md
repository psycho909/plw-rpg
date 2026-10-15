# Dispatch D2 — threat saturation controlled comparison (g6-luna-high-engineer)

D1 r2 is accepted for review. Main open question (your D2 candidate 1): `simulation.ts:317` monsterPopulation += growthRate (0.65/day) − guards×0.035 (≈0.30/day observed) ⇒ net ≈ +0.35/day ⇒ monster pop at 100 cap, threat band 3 permanently, safety at 25 floor in most normal worlds; player/NPC activity only dents it. Owner must decide whether/how to change this (Phase8 may not invent targets), so produce decision-grade evidence. **No src changes.**

1. Design intent: search Phase6 tickets/reports/specs/ADR/CHANGELOG (`tickets/`, `reports/v2/*phase-06*`, `docs/`) and git history (`git log -S growthRate`) for the intended threat/monster equilibrium or why growthRate=0.65 and guard 0.035 were chosen. Quote sources. If intent says saturation is by design, say so.
2. Controlled comparison (label controlled; same seeds 40131–40133; scenarios No Intervention, Life, Adventure with succession; 10/50/100 years): patch the parameter in-process for the run only (runner-side override of the loaded config/state; never edit src), variants with **data-derived** values only:
   - V0 current (growth 0.65, guard 0.035)
   - G1 growth = observed mean guard offset (≈0.30 → net ≈ 0 at average guards; compute the exact observed mean from D1 r2 series)
   - G2 growth halfway between (≈0.475)
   - K1 guard coefficient raised so observed mean guards offset 0.65 (equivalent to G1 via guards; shows guard-dependence)
   Record per variant: monster pop/threat band distribution over time, time at band 3, safety distribution and floor-time, crisis count/interval/outcomes, boss spawns, population/food/prosperity, Life-forced-to-fight check, whether crises still occur (must not vanish — spec forbids fixed crises and NPC always winning, but also says the world may decline yet most worlds must be recoverable).
3. Add a section "D2 controlled comparison" to `world-crisis-balance.md` with a variant table, trade-offs, and §4 five answers per variant; mark **Owner design decision required**. Update `d1-summary.md` (D2 part). Keep runs ≤ 20 min each, single standalone commands, no chaining. Reply with only the summary path.
