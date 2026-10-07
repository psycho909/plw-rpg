# Phase 4 final combat and build analysis

## Evidence and method

This uses `final-combat-balance.json`: 8 seeds × 15 builds × 3 power bands × 6 targets × 2 policies = 4,320 paired metric rows. Every row has two real-engine executions: uninterrupted and save/reload every three turns, for 8,640 total fights. Replay command/state equality is asserted. Same-seed profiles share the target snapshot, initial HP, starting RNG state and action policy; RNG divergence caused by different mechanics is expected. Source commit is `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`, recursive all-files `src/` fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`; source and harness stayed stable during the simulation. The final simulation status is PASS (100,000 loot awards, 4,320 rows, 8,640 actual fights).

The engine uses public `encounterWolf`, `combatTurn`, and `playerAttackDamage`, with an explicit armor-phase context for the latter. Damage dealt is checked against the public formula and actual enemy HP changes; incoming damage is gross HP loss adjusted for actual potion healing. Winning turns have no incoming attack. The matrix is: natural gray wolf, natural alpha elite, controlled armored-only alpha elite, and wolf king well-fed/starved/moonlit variants. Policies are attack and cue response. Early is engine Lv1 / 100 HP, Edge is `gainExp(180)` (Lv4), Ready is `gainExp(300)` (hero Lv5 / combat Lv6). There is no injected gold or world resource progression.

Builds cover legacy, early gear, raw, Crit, Bleed, Penetration, Defense, Common/Rare/Epic, actual rank-award profiles (elite, mini-boss, boss), and a matched standard-body boss counterfactual. Rank reward profiles are actual detached `awardWolfLoot` outputs sampled once per seed/powerband and reused across scenarios; they are not a repeated distribution of every possible awarded item and not win-conditioned acquisition. The boss profile is the canonical level-7 `moonFangSpear` award; `bossStandardBody` changes only the base to a standard spear and recomputes rolled stats. The `affixControl` profile reuses the Penetration fixture and changes only the same-tier piercing weapon affix to bleeding.

For every profile/power band there are 96 paired scenarios (6 targets × 8 seeds × 2 policies). Relative to legacy, “upgrade” means no worse on win, survival, turns, gross damage taken and potion count, and strictly better on at least one; “low” is reverse dominance, “equivalent” is exact equality on that vector, and the remainder are tradeoffs. Counts below are paired scenarios, not independent player samples. `U/E/L/T` abbreviates upgrade / equivalent / low / tradeoff.

## Wins and paired outcomes

| Build | Early wins /96 | Early U/E/L/T | Edge wins /96 | Edge U/E/L/T | Ready wins /96 | Ready U/E/L/T |
|---|---:|---:|---:|---:|---:|---:|
| Legacy reference | 62 | — | 96 | — | 96 | — |
| Early gear | 48 | 34/0/48/14 | 96 | 0/0/96/0 | 96 | 0/0/96/0 |
| Raw | 48 | 21/13/57/5 | 96 | 0/96/0/0 | 96 | 0/96/0/0 |
| Crit | 48 | 19/20/52/5 | 96 | 27/48/17/4 | 96 | 35/40/21/0 |
| Bleed | 49 | 15/27/50/4 | 96 | 25/56/12/3 | 96 | 31/50/13/2 |
| Penetration | 48 | 19/15/57/5 | 96 | 30/47/15/4 | 96 | 21/60/14/1 |
| Affix control (Bleed) | 48 | 19/15/57/5 | 96 | 24/47/21/4 | 96 | 21/60/14/1 |
| Defense | 51 | 12/25/58/1 | 96 | 43/16/21/16 | 96 | 49/16/17/14 |
| Common | 48 | 21/13/57/5 | 96 | 0/34/62/0 | 96 | 0/61/35/0 |
| Rare | 52 | 13/26/55/2 | 96 | 65/16/9/6 | 96 | 78/14/4/0 |
| Epic | 65 | 49/11/29/7 | 96 | 74/14/4/4 | 96 | 84/12/0/0 |
| Actual elite award profile | 48 | 28/5/54/9 | 95 | 0/2/91/3 | 96 | 2/6/86/2 |
| Actual mini-boss award profile | 52 | 34/1/45/16 | 96 | 10/3/68/15 | 96 | 22/4/59/11 |
| Actual boss award profile | 67 | 53/0/10/33 | 96 | 29/0/45/22 | 96 | 48/0/20/28 |
| Boss standard-body counterfactual | 52 | 45/0/24/27 | 96 | 15/0/53/28 | 96 | 27/0/45/24 |

The Early band is where win rates separate: legacy wins 62/96; Epic 65/96; actual boss award 67/96. The actual elite-drop profile wins 48/96 and is low versus legacy in 54/96 scenarios. At Edge, the elite-drop profile wins 95/96; all other builds win 96/96. Ready is 96/96 wins for every profile. Edge/Ready still differ on turns, incoming damage, potion use and paired outcomes.

The profile-level table is descriptive of the sampled gear fixtures. It does not say that every item at a rarity has the same value. In particular, the single sampled actual rank drop is reused across the band’s scenarios, so it cannot estimate the expected combat value across the loot distribution.

## Affix utility and armor control

The strongest isolated affix comparison is Penetration versus the same legal gear with its same-tier piercing weapon affix replaced by bleeding. Across all targets, policies and seeds (96 matched cells per band), Penetration strictly dominates the Bleed control in 12/96 Early, 23/96 Edge and 16/96 Ready cells; 77/96, 73/96 and 80/96 are outcome-equivalent, and Early has 7 tradeoffs. No matched cell is dominated by the Bleed control. This measures the tested +1 piercing-for-+1 bleeding substitution and this fixture only.

On the controlled armored-only elite subset, each band has 16 matched cells: Penetration strictly dominates the control in 1/16 Early and 0/16 Edge/Ready; the remaining 15/16, 16/16 and 16/16 are equivalent. Both profiles win all 16 in each band. Thus this measured setup does not show a practical combat-outcome separation on the armored fixture, even though the full matrix contains Penetration-favoring outcomes. It does not establish penetration is useless or support a global increase.

Crit, Bleed and Defense profiles are legal gear builds but not single-variable replacements against legacy; differences also include bases, rarity, tiers, defense/block and materials. Their Pareto counts are not causal trait estimates. Defense has 43/96 Edge and 49/96 Ready upgrades versus legacy, but also 16/96 and 14/96 tradeoffs; this suggests scenario-sensitive survivability, not a universal defense multiplier. No isolated damage or incoming-damage conclusion is asserted for Crit/Bleed from these builds.

## Boss-variant risk and canonical reward comparison

For Early well-fed / starved / moonlit boss variants (16 fights each: 8 seeds × 2 policies), legacy wins 0/16, 14/16, 0/16. Epic wins 1/16, 15/16, 1/16. The actual level-7 boss award profile wins 2/16, 10/16, 7/16; its standard-body counterfactual wins 0/16, 4/16, 0/16. At Edge and Ready, both boss profiles win all 16 in every variant. Variant and progression strongly affect risk; these are controlled headless fights, not encounter-access or player-experience tests.

The matched boss pair uses the same detached actual level-7 `moonFangSpear` award, changing only the base to standard `spear` and recomputing base-dependent stats. Boss-exclusive profile dominates the standard body in 49/96 Early, 46/96 Edge, and 45/96 Ready matched scenarios; all remaining cases are equivalent, with no reverse-dominance/tradeoff cases. Wins are 67 vs 52 Early and 96 vs 96 in Edge/Ready. This supports a mechanical benefit for the tested exclusive base and roll, not the average causal value of every boss reward or the fairness of obtaining it.

## Potion / gold pressure

Aggregate potion cost divided by combat gold earned (gold is recorded only for wins) provides a scenario-level pressure indicator. The target/policy mix has 96 fights per profile and band.

| Build | Early | Edge | Ready |
|---|---:|---:|---:|
| Legacy | 0.97 | 0.27 | 0.06 |
| Common | 2.24 | 0.33 | 0.12 |
| Rare | 1.60 | 0.18 | 0.01 |
| Epic | 0.87 | 0.12 | 0.00 |
| Actual elite award | 2.72 | 0.43 | 0.30 |
| Actual mini-boss award | 1.71 | 0.35 | 0.19 |
| Actual boss award | 0.82 | 0.29 | 0.11 |
| Boss standard body | 1.64 | 0.34 | 0.15 |

Each cell is total potion cost / total combat gold, not a percentage or an item-sale-adjusted net margin. A `null` ratio is used when a group earns zero gold. Starting gold, future shop purchases, out-of-combat recovery, item/material sales and crafting are outside this measure.

## Findings and limits

- **Medium, Common combat-value finding:** Normal Common-style gear is often dominated by fixed legacy gear in this comparison; at Edge/Ready, Common is low in 62/96 and 35/96 scenarios. This is not a junk/sell conclusion; Common still has material, sale, collection and progression utility not represented in the outcome vector.
- **Low-to-medium, tested-fixture build finding:** Rare/Epic profiles separate from Common at Edge/Ready; the tested penetration affix substitution tends to favor penetration overall but does not separate on the armored elite at Lv4/Lv5. No balance change is recommended solely from the mixed legal Crit/Bleed/Defense profiles.
- **Medium, boss-base counterfactual finding:** A canonical actual boss drop and its standard-body counterfactual have a measurable advantage in this matched roll. Boss variant survival remains highly progression-sensitive in Early.
- **Not established:** Human choice, overall loot acquisition opportunity, encounter cadence, browser/adaptive-agent acceptance, fun or retention. The original aggregate final-runtime remains FAILED for its separate browser-report-consumption/orchestration error. The fresh component run passed npm check, sanity, formal simulation and targeted browser with stable inputs. The independent current-source stress retry then passed its 20-minute scope, and the corrected-policy normal-save Adventure retry passed 1,800.857 seconds; these component results do not overwrite the aggregate failure. The original Adventure artifact remains policy-confounded and is superseded for target-progression inference by the corrected retry. See `browser-stress.md` and `agent-adventure.md` for exact evidence. No human, retention or product gate is claimed by this analysis.