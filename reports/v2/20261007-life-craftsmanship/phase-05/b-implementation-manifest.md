# Phase5-B implementation manifest

## Contract

- generateItem(state, { baseId, level, context: { kind: "craft", recipeId: "starterSpear" } }) is the only crafted-item generation seam. It rejects malformed/unknown context, output mismatch, disallowed material, and monster-source combinations before RNG or instance-sequence mutation. With no context, the old generation branch retains its fixed rarity, affix, stat, and RNG results.
- CRAFTING_RECIPES.starterSpear: wood 3 + stone 2, 4 gold, 10 stamina, 45 game minutes, spear level 2, Smithing 1, store 08:00-18:00, no bias materials, default rarity/affix rules. C transaction/access enforcement is not in this slice.
- ItemInstance.craftProvenance is null for legacy/noncraft output; craft output records recipe, active creator, world time, influence material, and masterpiece: false. Legacy loot provenance and rolls remain unchanged.
- deserialize accepts source save versions 1/2/3. V1 creates life + Reward2 defaults; V2 adds Smithing Lv1/XP0 and life action count 0, and migrates Reward1 instances with craftProvenance: null; V3 requires and validates Reward2. Source data is validated before defaults are applied. Migrations preserve old world/RNG/time and round-trip idempotently.
- Reward API: emptyReward(): RewardState returns schema2; migrateRewardV1(unknown): RewardState is called after strict validation; validateRewardV1 and validateReward enforce exact old/current schemas, with craft provenance constrained to known recipe/output/owner/time and Masterpiece disabled.

## Verification

- npm test -- src/services/saveService.test.ts: 81/81 passed.
- npm test -- src/engine/itemGeneration.test.ts: 26/26 passed.
- npm test -- src/services/rewardSave.test.ts: 33/33 passed.
- npx vue-tsc --noEmit: exit 0.
- Migration coverage includes the archived complete historical V1 save, the archived Phase4 V2 stress final with four rolled items, and the historical V2 no-reward seed-17 save. The complete broad suite was not run in this B work unit.
- Raw commands and outputs: b-green-save-service.txt, b-green-generation.txt, b-green-reward-save.txt, b-green-typecheck.txt; original TDD REDs: b-red-v2-migration.txt, b-red-v2-forged.txt, b-red-generation-context.txt. Projection-test correction evidence: b-validation-correction-notes.txt.

## Files and SHA-256

7a06eb4f36d44561a3b13a0729800b1776583bc555680814931b59f6cb775400  src/domain/types.ts
ab0205e8f286832ef4aa83d38685af163f2e193c245efadb4ea730bff93fe885  src/domain/reward.ts
3e6295be41dbc66f092133f75b6c0dc7a5181cdfbb94de7cf8e908d09fdf7bd7  src/data/config.ts
e351f28ac02ab31a0c9390f1afc82195105972a1994d7bf466922ea236c03488  src/data/crafting.ts
bd7697bcb564061cd00ff7fc14373625c30d2a7de06473b8f97bffb4c61b3c58  src/engine/lifeState.ts
82c84768ca89a87efa0beb6ba0c846bb60bf5a652c888ff243130a3de04ce6e3  src/engine/simulation.ts
2bc667870966beec916017a865f8e8cbf7b9893b31fe33823fec98305df5d901  src/engine/rewardState.ts
0b568eb6ab1a6475402ada4c2627148dd7b4e8bff97fd8291112e4a5e4c730f2  src/engine/itemGeneration.ts
4c680089734ecb48df3ec8298b7a7290b76c672c4f039404caf166162498cc22  src/services/rewardValidation.ts
ce3a9a50f5512ba6ace865a704649760e00cd6abb6eb66709d94905fa32259bf  src/services/saveService.ts
e4d546b1b380a308650f4577dc2bc58dd2449a4fa28f96a422d0cece59a10e05  src/engine/itemGeneration.test.ts
896b7517b4a2bcb4671b4d17188f0823edfe290e3826fc21f3bc94fe0f062bea  src/engine/combatStats.test.ts
33a9e68f6ebc7c378e3acab8e8112765d70ce40988ff428b99fccc4538fe7b58  src/engine/rewardActions.test.ts
c592f16bca69ed582725273e17d76f387a37edaf44672df705de8e94b8f0db53  src/presentation/rewardProjection.test.ts
ebd8476dc3500e310fc214877a47cc5edfcd11cdd4f7a5be6d6dfa66ec88349e  src/services/rewardSave.test.ts
9b9858afca96f3e97c1c06c34fcd7e8298e97f9b6e7d5d8b37f648decae2df98  src/services/saveService.test.ts

src/presentation/rewardProjection.test.ts changed only to supply the new required model field in test fixtures; no production UI file changed. B source is now frozen pending Root's independent migration/core review and C release.
