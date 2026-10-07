# Phase 05-E design proposal — pending Root approval

- Drafted: 2026-10-07T04:16:48+00:00
- Status: design only; no E source edits made.
- Basis: accepted A–D contracts, existing `gainExp` skill threshold `level × 20`, existing recipes/materials/shops, and the preserved Phase 5 economy bounds. No new economy simulation is claimed.

## Proposed recipe set

Four useful recipes are enough to cover early weapon progression, an armor material path, and later iron work. The existing starter recipe remains unchanged.

| Recipe | Unlock and station | Inputs | Service / stamina / time | Output | Optional influence |
|---|---|---|---|---|---|
| `starterSpear` (existing) | Smithing 1, Store 08:00–18:00 | wood 3, stone 2 | 4g / 10 / 45m | spear, Lv2 | Fang or Moonstone, as released in D |
| `fieldSpear` | Smithing 2, existing Store | wood 4, stone 3 | 6g / 12 / 60m | spear, Lv3 | 1 wolfFang or 1 moonStone |
| `fieldArmor` | Smithing 2, existing Store | wood 2, stone 1 | 8g / 12 / 60m | hideArmor, Lv3 | 1 wolfHide |
| `ironShortSword` | Smithing 5, existing Blacksmith after village unlock | iron 3, wood 1 | 18g / 16 / 90m | shortSword, Lv6 | 1 wolfFang or 1 moonStone |

The new Store recipes use only existing inputs and buildings, so the intermediate weapon unlock can happen before village growth. `fieldArmor` makes wolfHide a meaningful armor bias: current weights become sturdy 4, blocking 3, warding 1 (neutral is 1 each). The iron recipe uses ordinary inventory iron and the existing Blacksmith; no new base item or building is needed. The recipe set leaves `starterSpear` output level, inputs, fee, stamina, and duration unchanged; any economy tuning remains in G.

As a paper bound from the recorded source prices, the new recipes’ input liquidation value plus fee is 31g for `fieldSpear`, 19g for neutral `fieldArmor` (24g with wolfHide), and 46g for `ironShortSword`, versus current normal-rarity expected sale values of 18.186g for spear, 12.99g for hideArmor, and 15.588g for shortSword. Optional influence materials add their current sale value. This is static comparison only; it does not replace G’s measured economy pass, and no sale premium is proposed here.

## Smithing capabilities and quality

1. **Recipe access:** Smithing 2 unlocks `fieldSpear` and `fieldArmor`; Smithing 5 unlocks `ironShortSword` at the existing Blacksmith. Unlocks derive from current skill and station state, with no saved unlock list.
2. **Bounded craft quality control:** current Smithing 3 shifts 5 rarity-weight points from Common to Uncommon; Smithing 5 shifts 5 more. On a craft, the weight schedule is:

   | Smithing | Common | Uncommon | Rare | Epic | Legendary |
   |---:|---:|---:|---:|---:|---:|
   | 1–2 | 60 | 27 | 10 | 2.8 | 0.2 |
   | 3–4 | 55 | 32 | 10 | 2.8 | 0.2 |
   | 5+ | 50 | 37 | 10 | 2.8 | 0.2 |

This changes only the existing craft rarity draw: it adds no minimum rarity, raw-stat multiplier, new rarity, affix count override, or masterpiece behavior. The Legendary weight stays 0.2; material affix weighting and Moonstone’s conditional special-trait bonus remain independent. Loot/drop generation and saved legacy items remain unchanged. The successful craft uses the current skill level for this roll; practice gained from that craft applies to the next craft.

## Practice graduation

Award the existing 10 XP only after a successful craft and only while current Smithing is below that recipe’s practice cap:

| Recipe tier | Practice cap | XP at/above cap |
|---|---:|---:|
| `starterSpear` | Smithing 3 | 0 |
| `fieldSpear`, `fieldArmor` | Smithing 5 | 0 |
| `ironShortSword` | Smithing 6 | 0 |

At the current `level × 20` Smithing threshold, two starter crafts reach Smithing 2 and six total reach Smithing 3. The starter then graduates. The intermediate recipes can advance the character to Smithing 5, where iron work becomes available; iron work can advance to Smithing 6, the later F eligibility threshold, then graduates as well. At a graduated cap, skip the existing `gainExp` call entirely (it currently grants both character EXP and skill EXP) while continuing the normal craft and life-action record. Rejections still yield no XP or action record.

## Later F boundary

E does not roll or persist Masterpiece. `ironShortSword` is a candidate F-eligible recipe because it consumes ordinary iron; future F may also accept an eligible advanced recipe with a selected Moonstone. The proposed F contract is current Smithing ≥6, eligible recipe plus iron input or Moonstone influence, then one seeded 25% Masterpiece roll. No E source should implement that roll, history, price, or ownership behavior.

## Approval requested

Approve or adjust the exact three new recipes, fees/durations/outputs, quality weight schedule, and practice caps above before E implementation. Until that decision, this remains a proposal and the E source stays untouched.
