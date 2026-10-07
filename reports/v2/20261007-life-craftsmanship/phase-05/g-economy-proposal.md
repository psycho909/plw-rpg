# G economy proposal — crafted-only bounded sale premium

Status: design proposal only; G has not been released. No source changes, build, tests, or economy simulation were performed.

## Contract and ownership boundary

Implement one helper at the existing src/engine/rewardActions.ts sale-pricing seam and have itemSellPrice delegate to it only when item.craftProvenance !== null. Keep the current base × rarity multiplier formula exactly for every legacy/noncrafted item. Do not change shop buy prices, raw-material sell prices, recipe inputs or fees, loot, item stats, rarity weights, or general gold sinks.

Proposed crafted premium, in gold:

    base = ITEM_BASES[item.baseId].sell
    affixValue = item.affixes.length + sum(max(0, affix.tier - 1))
    affixPremium = min(floor(base * 0.15), affixValue)
    masterpiecePremium = item.craftProvenance.masterpiece ? ceil(base * 0.15) : 0
    premium = min(floor(base * 0.25), affixPremium + masterpiecePremium)
    sell = max(1, floor(base * SELL_MULTIPLIER[item.rarity]) + premium)

Affix value is one gold per affix and per tier above tier 1, first capped at 15% of base sell value. Masterpiece independently adds ceil(15% of base), and total premium is capped at 25% of base sell value. This preserves the Masterpiece increment even when high affix tiers saturate the affix component. The premium is integral and inspectable, and never depends on random stat magnitude. A Common craft with no affixes and no Masterpiece gets no premium; a typical Uncommon gets +1 gold; a Masterpiece gets at least the 15%-of-base component, subject to the shared cap. The helper must use the validated ItemInstance contract; no new provenance fields are needed.

This belongs to the future single pricing owner in rewardActions and ordinary pricing tests. CoreMax retains ownership of crafting/domain/data/generator/identity/ownership. G is still pending release.

## Economy bounds

Inputs use the current best ordinary town purchase prices: wood 7, stone 5, iron 13. The worst eligible ownership benefit is treated as a 1-gold reduction to each recipe fee. The table counts all recipe inputs as bought, includes the fee reduction, and excludes stamina/time. Expected rarity values use the current floor rules: Smithing ≥3 gives Uncommon/Rare/Epic/Legendary weights 87/10/2.8/0.2; Smithing ≥5 gives Rare/Epic/Legendary 97/2.8/0.2. These normalized weights produce expected rarity multipliers 1.886 and 2.056 respectively.

For the receipt upper bound, every item is pessimistically assigned the maximum premium cap, regardless of its affixes or Masterpiece roll. That is stricter than the actual expectation, including the proposed 25% Masterpiece chance on the advanced recipe.

| Recipe / output | Rarity floor used | Best town inputs + fee | Cost after 1g ownership reduction | Expected sale before premium | Maximum per-item premium | Expected sale at max premium | Expected margin at max premium |
|---|---:|---:|---:|---:|---:|---:|---:|
| starterSpear / spear (base 14) | Uncommon | 3×7 wood + 2×5 stone + 4 = 35 | 34 | 26.404 | 3 | 29.404 | −4.596 |
| fieldSpear / spear (base 14) | Uncommon | 4×7 wood + 3×5 stone + 6 = 49 | 48 | 26.404 | 3 | 29.404 | −18.596 |
| fieldArmor / chainArmor (base 18) | Uncommon | 2×13 iron + 1×7 wood + 8 = 41 | 40 | 33.948 | 4 | 37.948 | −2.052 |
| ironShortSword / shortSword (base 12) | Rare | 3×13 iron + 1×7 wood + 18 = 64 | 63 | 24.672 | 3 | 27.672 | −35.328 |

For starter/field spear and armor, the ≥3 floor moves the Common 60% weight into Uncommon, leaving 87/10/2.8/0.2 across Uncommon through Legendary. For the short sword, the ≥5 floor moves Common and Uncommon weight into Rare, leaving 97/2.8/0.2. The pre-premium expected sale is base sell × expected rarity multiplier. Adding the maximum cap to every roll still leaves expected proceeds below minimum legal bulk-buy-plus-fee cost for all four recipes. Consequently the 25% Masterpiece roll and high Smithing cannot make a positive expected buy→craft→sell loop. Individual favorable rolls can still sell above their particular input cost, as allowed by the spec.

The tightest expected bound is fieldArmor: 37.948 expected gold versus 40 gold after the full 1-gold ownership benefit. It retains 2.052 gold of margin even under the deliberately impossible assumption that every output earns the full cap. Distribution simulation should verify the realized distribution after G release.

## Source observations and limits

- src/engine/rewardActions.ts:itemSellPrice currently prices all items as max(1, floor(baseSell × rarityMultiplier)); sellInstance uses this helper.
- src/engine/actions.ts:buyPrice gives the best ordinary town price at a 0.8 multiplier, rounded up: wood 7, stone 5, iron 13. Current purchase action trades one item at a time; table totals represent repeated legal purchases.
- src/data/crafting.ts is the source for the four input quantities, fees, and floor thresholds.
- The frozen economy baseline is in economy-baseline-bounds.md and machine values in economy-baseline-bounds.json. Its 18.186 starter-spear expectation uses the unmodified gray-wolf loot pool, so it is not the correct crafted expectation once the Smithing floor applies.
- The fixed cap protects the ordinary crafted-only sell helper. It makes no claim about gathering income, gameplay time/stamina value, or a broader full-economy equilibrium, which remain outside this static design check.

## Influence-material modes

Influence materials are not ordinary shop purchases; their lowest direct gold opportunity cost is the current store resale value forfeited by consuming them (fang 5, hide 5, moonstone 25). Bias changes affix selection but not rarity weights or affix count, so the same deliberately maximum premium bound applies to each mode. Neutral is included for comparison.

| Recipe | Mode | Added material opportunity cost | Total cost after 1g fee reduction | Expected sale at maximum premium | Expected margin |
|---|---|---:|---:|---:|---:|
| starterSpear | neutral | 0 | 34 | 29.404 | −4.596 |
| starterSpear | wolfFang | 5 | 39 | 29.404 | −9.596 |
| starterSpear | moonStone | 25 | 59 | 29.404 | −29.596 |
| fieldSpear | neutral | 0 | 48 | 29.404 | −18.596 |
| fieldSpear | wolfFang | 5 | 53 | 29.404 | −23.596 |
| fieldSpear | moonStone | 25 | 73 | 29.404 | −43.596 |
| fieldArmor | neutral | 0 | 40 | 37.948 | −2.052 |
| fieldArmor | wolfHide | 5 | 45 | 37.948 | −7.052 |
| ironShortSword | neutral (only legal mode) | 0 | 63 | 27.672 | −35.328 |

Thus the neutral mode is the least-cost mode for every recipe; every legal bias mode widens the expected loss. The advanced short sword has no influence-material mode in the current recipe registry. This is a static bound, not a generated distribution.

## Refinement: independent affix and Masterpiece components

Use this exact premium formula for any future G implementation:

    base = ITEM_BASES[item.baseId].sell
    affixValue = item.affixes.length + sum(max(0, affix.tier - 1))
    affixPremium = min(floor(base * 0.15), affixValue)
    masterpiecePremium = item.craftProvenance.masterpiece ? ceil(base * 0.15) : 0
    premium = min(floor(base * 0.25), affixPremium + masterpiecePremium)
    sell = max(1, floor(base * SELL_MULTIPLIER[item.rarity]) + premium)

The independent affix cap prevents a high-tier affix roll from consuming all premium room before the Masterpiece marker is considered. For the advanced short sword (base sell 12), the affix cap is 1 gold and the Masterpiece component is 2 gold. Any valid Rare output already has at least two affixes, so its affix component is 1; adding Masterpiece moves the premium from 1 to 3, a guaranteed +2 gold for the same rarity and affixes. The total cap remains 25% of base (3 gold for this sword), so all earlier expected-value upper bounds remain unchanged.

The recipe registry currently gives ironShortSword no influence-material options. The current legal-material table therefore correctly lists only its neutral mode. The F slice decision proposes extending the advanced recipe to allow Fang or Moonstone while retaining the same rarity floor and 25% Masterpiece chance. Under that future, explicitly proposed mode, the consumed material's resale opportunity cost adds 5 or 25 gold; expected sale at the same conservative maximum remains 27.672:

| Future F ironShortSword mode (proposal, not current registry) | Added material opportunity cost | Total cost after 1g fee reduction | Expected sale at maximum premium | Expected margin |
|---|---:|---:|---:|---:|
| neutral | 0 | 63 | 27.672 | −35.328 |
| wolfFang | 5 | 68 | 27.672 | −40.328 |
| moonStone | 25 | 88 | 27.672 | −60.328 |

This projected extension only changes an input-opportunity-cost comparison here. It does not assert that G or F is released, or that any source implementation exists.
