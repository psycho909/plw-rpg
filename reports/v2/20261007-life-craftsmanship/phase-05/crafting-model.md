# Phase5-B crafting model

ACCEPTED for B model/save/determinism only. Source baseline HEAD1a56cd3 plus 75-file working-source snapshot in b-full-check-retry02 source-before/after.json; all hashes stable. This is not yet the complete gameplay loop.

One shared generateItem craft context references data-driven starterSpear recipe. Fixed old skill defaults gain smithing Lv1/XP0; existing life actions gain smithing0. Save format3 / Reward schema2 are serialization versions within product V2.x. Strict source-version validation occurs before incremental defaults. Actual archived V1 and Phase4 V2 fixtures preserve world seed, RNG, world time, character/NPC, history, legacy item rolls and equipment; migrations are idempotent. No world recreation or old-item re-roll.

craftProvenance carries recipe, original creator, time, optional influence and masterpiece boolean. Original creator and current holder are independently known character IDs; existing succession behavior is not rewritten. Old items get null craftProvenance. Craft context rejects incompatible source/material/recipe/output before RNG or sequence. Crafted Legendary legacy bossSource must be null; noncrafted historical wolfKing provenance remains legal.

Initial full check failed335/340 with five stale synthetic V1 fixture/version assertions; original raw evidence is retained. Fixtures corrected to true historical shape without loosening production validation. Retry01 passed341; final retry02 passed342/342,20/20 files, typecheck and build79modules. Core focused RED failures and later narrow provenance RED are preserved. Independent Max review b-core-independent-review.md ACCEPT covers final hashes and both metadata corrections.

C transaction/access enforcement, material bias, skill probability controls, masterpiece behavior and economy integration are later stages, not claimed here.

## Current A–G crafting model addendum

The preceding B section is retained as its historical scope snapshot. This addendum records the current accepted A–G implementation model at source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`. [Source/commit correlation](source-commit-correlation.json) pins the committed source to fingerprint `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb` and confirms it matches the source used for the 425-test full check. The current model is supported by the independent [CORE review (ACCEPT)](j-core-independent-review.md), the full [regression record](regression.md), and the E/F/G source freezes below. This does not declare a final Phase 5 gate pass.

### Registry, skill thresholds, and costs

The current registry is [`src/data/crafting.ts`](../../../../src/data/crafting.ts), pinned in the source correlation file. All recipes use the existing `generateItem` implementation with `context: { kind: 'craft', recipeId }` through [`src/engine/crafting.ts`](../../../../src/engine/crafting.ts); crafting does not use a second item generator.

| Recipe | Inputs | Fee / stamina / duration | Smithing unlock / practice cap | Station and craft quality |
|---|---|---|---|---|
| `starterSpear` | 3 wood + 2 stone | 4g / 10 / 45m | Lv1 / 3 | Store; at Smithing 3, minimum Uncommon; wolfFang or moonStone influence |
| `fieldSpear` | 4 wood + 3 stone | 6g / 12 / 60m | Lv2 / 5 | Store; at Smithing 3, minimum Uncommon; wolfFang or moonStone influence |
| `fieldArmor` | 2 iron + 1 wood | 8g / 12 / 60m | Lv2 / 5 | Store; at Smithing 3, minimum Uncommon; wolfHide influence |
| `ironShortSword` | 3 iron + 1 wood | 18g / 16 / 90m | Lv5 / 6 | Blacksmith; at Smithing 5, minimum Rare; Smithing 6 enables a 25% Masterpiece roll; wolfFang or moonStone influence |

All stations operate 08:00–18:00. An owned, nearby, walkable home can replace the store site for store recipes at any hour and reduces their fee to `max(3, recipe.goldCost - 1)`. This home path does not replace the advanced recipe's blacksmith requirement. The E freeze records the recipe practice caps and quality floors; the F freeze records advanced material and Masterpiece behavior. See [E source freeze](e-source-freeze.md), [F source freeze](f-source-freeze.md), and [G core source freeze](g-core-source-freeze.md).

### Save, provenance, and Masterpiece identity

Current saves use `saveVersion: 3`; the reward subdocument remains `schemaVersion: 2` ([config](../../../../src/data/config.ts), [reward schema](../../../../src/domain/reward.ts), [save migration](../../../../src/services/saveService.ts)). Migrated characters receive Smithing Lv1 / XP0 and life-action Smithing count 0. Existing item rolls and equipment are preserved; historical items without craft metadata keep `craftProvenance: null` rather than being regenerated or assigned invented history.

New crafted items carry a `CraftProvenance` with recipe ID, creator character ID, creation time, nullable influence-material ID, and an explicit `masterpiece` boolean. The generator derives that flag from the eligible recipe's seeded roll and persists it with the item. A successful first Masterpiece forms the crafter's `masterpieceCrafter` identity and awards +3 reputation once; that identity is the idempotence record even if the item is sold or an older milestone is evicted. This behavior is covered by the [G core freeze](g-core-source-freeze.md) and [independent CORE review](j-core-independent-review.md).

### Crafted sale premium and evidence boundaries

The released [`itemSellPrice`](../../../../src/engine/rewardActions.ts) preserves rarity-only sale price for noncrafted items. Crafted affix premium is capped at 15% of base sale value; the Masterpiece boolean adds `ceil(15% of base)`; combined premium is capped at 25% of base before adding it to rarity price. G's focused pricing evidence and the static economic bounds are summarized in [economy analysis](economy-analysis.md).

The [crafting analysis](crafting-analysis.md) and [distribution projection](crafting-distribution.json) report seeded quality-generation profiles, including 100,000 generated craft-context items over 30 profiles and zero full craft transactions. They do not establish normal-player prevalence or prove that an advanced Masterpiece was crafted through ordinary browser play. No such browser claim is made here. Human validation remains deferred, and this addendum is implementation-model documentation rather than a final balance or Phase 5 gate verdict.
