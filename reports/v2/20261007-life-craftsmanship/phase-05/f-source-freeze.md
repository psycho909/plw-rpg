# Phase 5 F Core source freeze

Status: Core F implementation frozen for UI final build and Root review. No G source work is included.

The iron short sword remains craftable with ordinary iron and wood at Smithing 5; Smithing 6 unlocks an engine-owned seeded 25% masterpiece roll. Wolf fang and moonstone are optional one-unit influence materials, using the existing affix/special generator bias and leaving rarity weights and masterpiece chance unchanged. Successful results expose the derived `masterpiece` flag and persist it in the existing craft provenance shape. Masterpiece or Legendary crafts record one bounded crafter milestone at craft start and mark the existing completion event as major; ordinary crafts add no important history. A milestone is stored before simulation so an age-boundary death cannot remove the completed item or its original creator/time record.

Core-owned frozen source files and SHA-256:
- `src/data/crafting.ts` — `a6946d02a5783c52e672bc25abc33202830f98983488e7f0df2ee1984d7c86f9`
- `src/data/rewards.ts` — `f2d60b4eb0c7d3349e242b6c2a81853e92cf5b74e25e1be071cf839fd6c98cd5`
- `src/domain/reward.ts` — `fb7463d0327e73097979d5ccd6823b10b0f0d9d14280974215ba6459eb899c0a`
- `src/engine/crafting.ts` — `61b9b2305d54cf9e1f7ab19004a1b7017ccb14243d9dfd485047fcd07763c624`
- `src/engine/crafting.test.ts` — `fbddd977a02f7ff89a3ca853dee6468d6bcfd25220f8358aaeed4f99dfc61fab`
- `src/engine/itemGeneration.ts` — `87be6646c4aa67a8d6443586373e848d0d8ffabad72b9752825224cb170fff71`
- `src/services/rewardValidation.ts` — `039cab272c301f7d91d2ba49cade91ea0751d80bbb8957a20692e8e723a24171`

Verification:
- `npm test -- src/engine/crafting.test.ts src/engine/itemGeneration.test.ts src/services/saveService.test.ts` — exit 0, 154/154 tests; see `f-green-core-final-targeted.txt`.
- `npx vue-tsc --noEmit` — exit 0, no diagnostics; see `f-green-typecheck-final.txt`.
- Focused F scenarios include seeded masterpiece and save/reload, material consumption and unchanged rarity/masterpiece chance, ordinary-craft exclusion, Legendary non-masterpiece history, full milestone/history buffers, invalid milestone preflight, and creator death during completion.
- Red evidence for missing plan/result, missing advanced material support, and malformed milestone preflight is preserved in `f-red-masterpiece-core.txt`, `f-red-advanced-bias.txt`, and `f-red-milestone-preflight.txt`.
- UI final build/type/projection verification is delegated to the UI owner after this freeze; no browser pilot is claimed for F.
