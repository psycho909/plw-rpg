# Phase 5 E source freeze

Date: 2026-10-07 UTC  
Scope: E skill unlocks, bounded craft practice, craft-only rarity floors, and the E workbench projection.  
Status: implementation and targeted verification complete; Root acceptance and any browser pilot remain pending. This freeze releases no F or G implementation.

## Approved behavior

- Four registered recipes: `starterSpear` remains unchanged; `fieldSpear` uses wood 4 + stone 3, 6g/12 stamina/60m, spear Lv3, Smithing 2/store, practice cap 5; `fieldArmor` uses iron 2 + wood 1, 8g/12 stamina/60m, chainArmor Lv3, Smithing 2/store, cap 5, with wolfHide as its only influence material; `ironShortSword` uses iron 3 + wood 1, 18g/16 stamina/90m, shortSword Lv6, Smithing 5/blacksmith, cap 6.
- Success grants 10 Smithing and character XP while the current recipe is unlocked and the crafter is below its cap. At or above the cap it grants no XP through `gainExp`, but still records the life action and creates the item. Rejected actions leave state, RNG, item/event IDs, resources and time unchanged.
- At Smithing 3, starter/intermediate craft rarity weights move Common into Uncommon: `0 / 87 / 10 / 2.8 / 0.2`. At Smithing 5, the advanced iron recipe moves Common and Uncommon into Rare: `0 / 0 / 97 / 2.8 / 0.2`. Epic and Legendary weights remain unchanged; quality is craft-context-only and adds no raw-stat, MP, or Legendary-rate bonus.
- Preview fields expose recipe unlock, XP/cap/graduation, the active rarity floor and weights, and the next quality threshold. Quality preview and generation share one pure engine profile. Influence materials retain their existing affix/special behavior and do not change rarity weights.
- Save schema and item provenance shape are unchanged. Old crafted items are not revalidated against a crafter's later Smithing level; the regression preserves a legitimate Common starter craft's identity and rolled stats after skill advancement and reload.

## Verification

- RED before implementation: `npm test -- src/engine/crafting.test.ts` recorded 8 failing new assertions and 26 passing existing tests in [e-red-skill-capability.txt](e-red-skill-capability.txt), SHA-256 `8d4845d15d5e2d82007a48af1b5065854e056e4e5c1a631d1a22e7381703148a`.
- The earlier combined run's UI copy assertion mismatch is preserved in [e-red-ui-copy-mismatch.txt](e-red-ui-copy-mismatch.txt), SHA-256 `11eed6d7ec4f937230638eebb2a12ab3391546af8adc1bcce57f40109a640824`; it was a stale expected phrase and was corrected.
- Final targeted engine/save/UI projection suites: 4 files, 154/154 passing; raw result [e-green-targeted-tests.txt](e-green-targeted-tests.txt), SHA-256 `d02a3137dc095437ba888e6320ccc9eb849b61d617c5a178c55a735c7e878eb2`.
- `npm run build`: Vue typecheck and Vite production build passed, 81 modules; raw result [e-green-build.txt](e-green-build.txt), SHA-256 `7879230a4c611564cc4b12adfa5b5f2c97ed8e67b561c7aa8436bb0df69cf5bb`.
- UI-owned strict design audit and `git diff --check` passed with zero audit findings; details are in [e-ui-verification.md](e-ui-verification.md), SHA-256 `efcaef42974ccb53c5362234abcefece843fc414cb7b0bc6224333608974f68e`.
- No E browser run, 100k distribution run, or full regression is claimed in this phase.

## Frozen source hashes

| File | SHA-256 |
| --- | --- |
| `src/data/crafting.ts` | `90266a679fa66250ccadca0ea4d8f52d25941e9b602af4270e62ddba2f124b97` |
| `src/data/rewards.ts` | `f982ee8d8c67d3e3a8c52fa5b77bf2d0483d2e03f36f43428cdaef0b4be83388` |
| `src/domain/reward.ts` | `d2af16f6aa6539cc3de0d30e877dd0781c1f8e38e9ff3b4c3f17aab3311aa85f` |
| `src/engine/crafting.ts` | `8d61114d274438b1d4aba87c732e11194e36acca4265d397784117b40c849d82` |
| `src/engine/crafting.test.ts` | `b518b0b4560af57b112c533d57951912c6a3f2ab8981732d9c2a84a3011a93eb` |
| `src/engine/itemGeneration.ts` | `62707db431f9e0d3019d329ad4a38e7cc29919151ec2ddf774fe04c33997a5e1` |
| `src/engine/itemGeneration.test.ts` | `2b09ecb49724820a5187a26099f654a00b0457a0d0f8e50609562ff26f5d39e2` |
| `src/presentation/craftingProjection.ts` | `876403a322bd5bbaf2337cc057e2259c1c7771919ac858b9b359221e8717d4cd` |
| `src/presentation/craftingProjection.test.ts` | `955455d156a11a07c42b104847ad8fc18034813bc6d40cf31796e8898a7910c0` |
| `src/components/PlaceWindow.vue` | `54f9700e85ab6f96cf63b14af8711f870bc4765dce861254cfb51bb588be7396` |

The E UI verification summary itself is [e-ui-verification.md](e-ui-verification.md); the final test/build output and the two preserved RED artifacts are listed above. This manifest is the current E source checkpoint; later source edits require a new correlated freeze.
