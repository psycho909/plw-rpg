# Phase 4 final loot distribution analysis

## Evidence and scope

This analysis uses the formal F artifacts `final-loot-distribution.json` and `final-combat-balance.json`. The final loot runner made 100,000 direct reward awards, 20,000 in each of five cohorts; 250 mirrored replay awards matched their corresponding deterministic award sequences. Combat contains 4,320 paired scenario rows and 8,640 actual fights (each scenario was run uninterrupted and with save/reload every three turns). The shared source fingerprint is `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`, source commit `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`; source and simulation harness were stable during the simulation. See the source JSON artifacts and `final-simulation-status.json` for the full manifest and run IDs.

This loot call distribution is not a win-conditioned acquisition rate. It does not estimate how often players defeat each rank or choose/equip/sell an item. Baseline files remain in `baseline-loot-distribution.json` and `baseline-combat-balance.json`; final artifacts are separately preserved as `final-*` and exposed through the generic `loot-distribution.json` and `combat-balance.json` aliases.

## Conditional drop quality

Rarity shares below use gear drops as the denominator. Affix counts also use gear drops and are ordered 0 / 1 / 2 / 3 affixes.

| Cohort | Gear / award | Common / uncommon / rare / epic / legendary | Affixes 0 / 1 / 2 / 3 |
|---|---:|---:|---:|
| Gray wolf (normal) | 13,003 / 20,000 (65.015%) | 60.102 / 27.224 / 9.513 / 2.892 / 0.269% | 60.102 / 27.224 / 9.513 / 3.161% |
| Scarred wolf (normal) | 13,010 / 20,000 (65.050%) | 45.419 / 34.028 / 16.372 / 3.728 / 0.453% | 45.419 / 34.028 / 16.372 / 4.181% |
| Alpha wolf (elite) | 20,000 / 20,000 (100%) | 20.090 / 44.925 / 27.920 / 6.475 / 0.590% | 20.090 / 44.925 / 27.920 / 7.065% |
| Pack leader (mini-boss) | 20,000 / 20,000 (100%) | 0 / 35.370 / 49.950 / 13.720 / 0.960% | 0 / 35.370 / 49.950 / 14.680% |
| Wolf king (boss) | 20,000 / 20,000 (100%) | 0 / 0 / 84.905 / 14.005 / 1.090% | 0 / 0 / 84.905 / 15.095% |

The normal cohorts have nearly identical gear-drop chance but not identical rarity: the configured scarred-wolf profile shifts mass toward Uncommon/Rare/Epic/Legendary. Elite awards guarantee gear and are Uncommon-heavy; mini-boss awards guarantee gear and are Rare-heavy. Boss awards are all Rare or better. These are the observed distribution from the declared rank profiles, not evidence that the current distinctions match player expectations.

The boss-exclusive base was `moonFangSpear` in 20,000 / 20,000 wolf-king awards (100%). All 218 Legendary boss items had boss-source provenance. The observed Legendary share was 218 / 20,000 = 1.090%, against the configured 1% profile; the estimate is descriptive at this sample size.

`moonHunter` counts are reported against the exact eligible Legendary-weapon roll denominator, separately from all awards:

| Cohort | moonHunter / eligible Legendary weapon rolls | Observed conditional share |
|---|---:|---:|
| Gray wolf | 1 / 18 | 5.56% |
| Scarred wolf | 1 / 40 | 2.50% |
| Alpha wolf | 5 / 75 | 6.67% |
| Pack leader | 16 / 130 | 12.31% |
| Wolf king | 42 / 218 | 19.27% |

For the boss profile the configured special chance with the award material is 25%; the observed 42/218 is 19.27%. The observed ratio is not the configured probability. With 218 eligible rolls it is an uncertain sample; this result alone does not establish a tuning defect or justify changing the chance.

## Repeated signatures and static screening

`duplicateLike` is a repeated `baseId + rarity + sorted affixId:tier` signature among gear drops. Its observed share is 98.525%–99.860% by cohort. This key omits item instance identity, stats, provenance, special traits and material; repeated signatures at these sample sizes are not a duplicate-item rate, a junk rate, a sale rate or a player-choice measurement.

The static screen in the JSON uses a weighted stat score and fixed ±0.5 boundaries. Its labels are only heuristic diagnostics; they are not ECV or observed combat outcomes. The actual combat comparison and its Pareto rules are in `build-analysis.md`. Do not use static upgrade/sidegrade/low-value fields as a balance gate.

## Gold, potion and material economy

A potion costs 20 gold. Nominal encounter gold is 10 / 12 / 24 / 40 / 75 by gray / scarred / alpha / pack leader / wolf king, equal to 0.50 / 0.60 / 1.20 / 2.00 / 3.75 potion prices per award. This is the loot-profile reward amount, not expected player income after encounter win rates.

| Cohort | Item sale value / award | Material sale value / award | Nominal gold / award | Material drops across 20,000 awards |
|---|---:|---:|---:|---|
| Gray wolf | 11.09 | 6.98 | 10 | 20,000 fang; 4,927 hide; 601 moonstone |
| Scarred wolf | 12.15 | 7.24 | 12 | 20,000 fang; 5,018 hide; 787 moonstone |
| Alpha wolf | 21.65 | 8.27 | 24 | 20,000 fang; 4,926 hide; 1,629 moonstone |
| Pack leader | 26.05 | 10.09 | 40 | 20,000 fang; 4,963 hide; 3,077 moonstone |
| Wolf king | 43.46 | 31.26 | 75 | 20,000 fang; 5,047 hide; 20,000 moonstone |

Item and material sale amounts assume everything is sold and are potential value, not realized currency. The catalog prices are 5 gold each for wolf fang/hide and 25 for moonstone. Current descriptions give fang/hide generation biases and moonstone Legendary/special bias; workshop crafting is not available in this phase. The loot runner did not perform sales, purchases or crafting.

Combat-side potion cost divided by gold earned (gold is credited only on wins) further shows power-band pressure. Representative 96-fight aggregates: in Early the ratios are legacy 0.97, Common 2.24, Rare 1.60, Epic 0.87, eliteDrop 2.72, miniBossDrop 1.71, Boss 0.82; in Ready they are 0.06, 0.12, 0.01, 0.00, 0.30, 0.19, and 0.11 respectively. These ratios pool the declared target and action-policy mix; they omit sale income, starting inventory, recovery outside fights and player choice, so they are not a complete profitability model.

## Findings and limits

- **Medium, rank-profile identity:** scarcity/quality rises by rank, but gray and scarred normal cohorts have distinctly different rarity profiles while similar 65% gear rates. Root should decide whether that within-normal split is intended; the sample does not call it a bug.
- **Low, boss special-rate evidence:** the exclusive base and legendary provenance are present in every sampled boss award. The special-rate result is 42/218 eligible rolls, with the 25% configured chance reported separately. Do not infer a 25% observed result or tune from this alone.
- **Unmeasured / not a finding:** player loot acquisition, sell/junk behavior, crafting demand, fun/retention, and real-economy balance. Direct award calls are not conditioned on wins; these reports do not establish browser, adaptive-agent, or human-play gates.


## Browser component status

The completed targeted browser, integrated stress, and corrected-policy Adventure artifacts are current-source components; their results and limits are consolidated in `browser-regression.md`, `browser-stress.md`, and `agent-adventure.md`. The original aggregate final-runtime remains FAILED and is not rewritten by these component passes. No human or product gate is claimed here.
