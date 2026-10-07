# G/I economy baseline bounds and combat matrix reuse

This note computes static values from current source and records the existing Phase 4 matrix for reuse. No source change, tuning, economy simulation, or 100,000-award rerun was performed.

## Starter spear resale bounds

The registered recipe ID `starterSpear` outputs item/base ID `spear` (sell base 14; see `src/data/crafting.ts:4-17`). Current `itemSellPrice` is `max(1, floor(base sell × rarity multiplier))`, with no affix, provenance, quality, skill, or masterpiece premium.

| Rarity | Normal wolf profile chance | Sale value |
|---|---:|---:|
| Common | 60% | 14 |
| Uncommon | 27% | 21 |
| Rare | 10% | 28 |
| Epic | 2.8% | 42 |
| Legendary | 0.2% | 70 |

If an unequipped spear is legally sold, **14 gold** is its current value lower bound. Its conditional expected sale value under the normal wolf rarity weights is **18.186 gold**. The rare result is 28 gold; the Legendary high roll is 70 gold at 0.2% in that profile. This does not guarantee a sale: the actor must reach an open blacksmith, and the item must be unequipped. Under the Phase 4 gray-wolf drop rules, spear is 2/11 of gear bases and gear drops at 65%; the derived expected spear sale revenue is **2.149 gold per gray-wolf kill** if every spear drop is eventually sold. These are unmodified Phase 4 normal-rarity sale bounds, not a measured starterSpear crafting distribution.

## Best ordinary material purchase price

`buyPrice` applies a town-stage factor of 0.8 and `tradePriceMultiplier = 1 + clamp(tradePenalty, 0, 0.75)`. Thus the best ordinary item-buy discount is 20% at town stage and zero penalty; living-event trade penalty cannot create a discount. `ceil` rounds each unit price, so effective savings are slightly below 20%. Current UI/action buys one item per trade, not a quantity bundle.

| Input | Listed price | Best town unit price | 10 individual buys | Store resale/unit |
|---|---:|---:|---:|---:|
| Wood | 8 | 7 | 70 | 4 |
| Stone | 6 | 5 | 50 | 3 |
| Iron | 16 | 13 | 130 | 8 |

A raw material bought at the best ordinary price still sells back below cost. The registered starterSpear recipe consumes **3 wood + 2 stone + 4 gold**, takes 10 stamina/45 minutes, requires Smithing 1, and outputs a level-2 spear.

| Acquisition comparison | Wood | Stone | Fee | Total input/opportunity cost | Expected sale | Expected difference |
|---|---:|---:|---:|---:|---:|---:|
| Hamlet purchases | 24 | 12 | 4 | **40** | 18.186 | **−21.814** |
| Best town purchases | 21 | 10 | 4 | **35** | 18.186 | **−16.814** |
| Gathered stock liquidation value | 12 | 6 | 4 | **22** | 18.186 | **−3.814** |

The gathered row uses the 18 gold sell-back value of the consumed 3 wood/2 stone plus the fee; it excludes stamina and elapsed time. Gathering also pays 4 gold per action, recorded separately in the acquisition baseline. Treat these as an initial investment/gear-utility comparison only, not Phase5-G final economics: the expected sale still uses the unmodified normal wolf rarity profile, not a measured crafted-item distribution. Property purchase costs are separate fixed deductions in `buyProperty` and do not discount shop inputs.

## Existing Phase 4 combat matrix for I

The recorded Phase 4 artifact [`final-combat-balance.json`](../../20261006-reward-core/phase-04/final-combat-balance.json) contains **15 builds**, 3 progression bands, 6 target profiles, 2 policies, and 8 seeds: 4,320 metric rows and 8,640 actual fight runs (4,320 paired rows). Builds: `legacy, earlygear, raw, crit, bleed, penetration, affixControl, defense, common, rare, epic, eliteDrop, miniBossDrop, boss, bossStandardBody`. Targets cover Gray Wolf, Alpha Wolf, armored Alpha Wolf, and Wolf King well-fed/starved/moonlit; policies are attack and cue.

Harness: [`combat_simulation.test.ts`](../../20261006-reward-core/phase-04/combat_simulation.test.ts); data: [`final-combat-balance.json`](../../20261006-reward-core/phase-04/final-combat-balance.json). This is prior Phase 4 evidence with fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`, not a Phase 5 result. Reuse the builder/progression seams and run a new crafted build only under the current Phase 5 frozen source manifest; no old Monte Carlo was repeated for this note.

Full formulas, source paths and machine-readable values are in [`economy-baseline-bounds.json`](economy-baseline-bounds.json).
