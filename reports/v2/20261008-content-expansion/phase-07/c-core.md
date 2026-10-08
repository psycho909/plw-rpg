# Phase 7 C core integration freeze

## Provenance and scope

- Root-reported source HEAD at this freeze: `a1307d220a68213be6465bc40e0a85af8ec605a3`. Git metadata was not queried, per task instruction.
- Initial A baseline source provenance: `2d6af37`; corrected AST baseline independently accepted, with the 531-test regression baseline passing. B contracts/validator were independently accepted before this C integration. The current source HEAD contains the accepted B/Slime baseline artifacts; this report captures their hashes alongside the C integration files.
- C integration is frozen at the hash map below. No Cave or additional family packs are included.

## Core seams delivered

- `contentRegistry.ts` projects authored family, monster, selected loot table, equipment, material, crop, crop-good, recipe, and affix definitions into shared runtime catalogs. Existing Wolf registries and wrapper paths remain available.
- The shared family encounter path uses authored eligibility and spawn predicates, finite combat mechanics, the same phase data for telegraphs, and source/use projections. Invalid selected loot-table references fail before RNG or reward mutation. Boss table guarantees and boss-rule guarantees are unioned and deduplicated; the exclusive base is awarded once.
- Boss variants freeze in the existing reward save state across escape/reload. Defeat removes the frozen form and installs a bounded cooldown under existing `life.director.cooldowns`; the consequence does not modify Goblin global threat or crisis state. Variant effects remain additive as specified.
- Save 8 / Reward 3 add stable crop identity and content material keys. Pre-Reward-3 saves migrate without RNG draws or world reconstruction. An older Reward-3 save gets zero-fill only for newly registered Phase 7 material keys; required legacy keys remain required, existing values are preserved, and unknown keys or invalid numeric values are rejected.
- The legacy Wolf generation stream and combat wrappers remain covered by regression tests. `InventoryWindow.vue` and `PlaceWindow.vue` contain only narrow catalog-key/type adapters needed for dynamic material IDs; they add no new player workflow.

## RED evidence and economy decision

The first combined post-patch targeted run had 363/364 tests pass. The maximum-premium sale-bound assertion reported `slime_moss_coat_recipe` expected proceeds of `60.918` against `57` gold of replacement/opportunity inputs. Root classified this as a bounded positive expected value from earned, scarce materials, not a demonstrated repeatable buy/craft/sell arbitrage; the authored gold fee remains 20. This is the exact reason the initial blanket content-recipe assertion was replaced.

The earlier resin-guard check found expected proceeds `32.782` versus full replacement cost `31` at the authored fee of 8. Root approved the narrow authored fee change to 11, making replacement cost 34. This preserves the conservative legacy sale-bound policy, but is not evidence that an infinite purchase loop was reproduced: the family resin input is earned-only and the runtime has no material purchase market.

The final economy test retains the legacy recipe assertions and checks new recipes only when all recipe inputs and the selected influence material have a repeatable purchase source. It prices inventory goods at the current maximum shop discount, counts the cheapest available store/home recipe fee, and compares expected sale proceeds at the bounded premium. Material trade is currently sell-only, so earned-only content drops do not qualify as purchase inputs.

## Persistence and runtime evidence

Focused tests cover: Save 7-to-8 crop migration to stable `wheat`; Reward 2-to-3 migration; older Reward-3 zero-fill for newly registered known materials; preservation of existing values, world state and RNG; rejection of unknown keys and fractional/overflow material stacks; boss form persistence across escape and reload; expiry/re-formation after defeat/cooldown; invalid loot rejection before RNG/cost/reward changes; overlapping boss guarantee deduplication; and legacy Wolf stream compatibility.

Final validation passed:

- `./node_modules/.bin/vue-tsc --noEmit`
- `./node_modules/.bin/vitest run src/engine/rewardActions.test.ts src/engine/contentFamilies.test.ts src/engine/itemGeneration.test.ts src/engine/wolfFamily.test.ts src/services/saveService.test.ts src/engine/crafting.test.ts src/engine/actions.test.ts src/engine/crisisAdventure.test.ts src/presentation/worldUI.test.ts src/services/rewardSave.test.ts src/engine/simulation.test.ts` — 11 files, 365 tests passed.
- Low's frozen Slime pack validation: 0 errors, 0 warnings; 11 qualifying monsters, 16 unique usable IDs and 8 materials. Module SHA-256 `0f91295536535f55679a770d3d09b368ec188c7ff322104f059e048589e55ead`; serialized pack SHA-256 `a59fb46f120390a4a37bef4084ffe9c3700ae0c107af79e5cc9e387055cfeb97`; validation archive SHA-256 `9bf4d4f22a757fd690d0942290eca0128c16396e625a6b82c7957d6c3e3d48bd`.

The 531-test baseline was not rerun for this focused C gate.

## Source SHA-256 map

These 26 Phase 7 B/C source artifacts were hashed after the final source checks. The C-owned runtime changes and the frozen Slime pack are ready for independent review.

```text
8a249649509a1b5fbff74e2d9cf2a1af8ee96e00d4da588dbaee2169de33108a  src/components/InventoryWindow.vue
ba525fb8a9dcfda93ea064a7381010558d560885a92194bbdca78a92be75a8f0  src/components/PlaceWindow.vue
ea56d790207bf13575ee19cbbdf46fa29ad8a03dd374a4613863af33c44e707a  src/data/config.ts
12dcc921ff7e8014cee9a6a8a320df10ad44dcd29b621bd62e5f8bea17c23384  src/data/contentRegistry.ts
e882f58803229c01b4853e44710f5cd1f7b2a56a2c4b058bbebe2fe2141aaa73  src/data/crafting.ts
7169a34cfd420ec4a181fa54c03560c5301f7fac666a049e5773d0439d897806  src/data/rewards.ts
0f91295536535f55679a770d3d09b368ec188c7ff322104f059e048589e55ead  src/data/content/slime.ts
dd9d3eedac08df9b47af1e16d6f0610190378450e90a768079b574e0aa2408ba  src/domain/content.ts
84dcc0abb3a8eb19b9aae3a190766d33c8da3530c761a6bbb8ce8d92bf1641b5  src/domain/reward.ts
7924e0383ca4f1e5623e95aca5ceb28b5022c03af007dca0d2cb2c1ec0050450  src/domain/types.ts
dfcc8830c17cd2f41727a8fdb195b05b3fb4c9c304312489522d115d4afecd45  src/engine/actions.ts
2fd4c455b9a684331382ca5d742275ad93a3b8e427b0a4396390261195273818  src/engine/contentFamilies.ts
99b0efff6cd32cff2bcaa714c1c2ae4bdec6790daefe8318e1fc8a0c265fea7e  src/engine/contentFamilies.test.ts
1c44bfa79e0e37f3fa601a5e3832925a8c0b63e2cd2c6dec30176586aab7565e  src/engine/contentValidation.ts
484c9e8e528311574ba21139bc9c68b7ab74377da3cbc1893ecac71c65a08226  src/engine/contentValidation.test.ts
11514e5bc8a69f9b0993adcdb41232c692814578dc821389088a4b7048dde00e  src/engine/crafting.test.ts
729e442247d398292bb9bd0a2a6c4f3a2fb3488248859f362a3b700383454624  src/engine/crisisAdventure.test.ts
38676a3b5bce1406ea7a4471139b72ee58c9a53f41fb90adba47885d95b7c559  src/engine/itemGeneration.ts
377f8471b4bc69169d01d969a3c0d443b5ddbe1624f7436851320c0a9b45287f  src/engine/itemGeneration.test.ts
133b21d4f52de1c4a46e2c4600b214fc56d14f80de45ade78e81b1eebad667f1  src/engine/rewardActions.test.ts
ea988c2712fe5d788f6eeba088aee3cfbb08aaa3fa67603cd1b9278044ecb840  src/engine/rewardState.ts
8624c052a385e339598ef0954e7f15e79541147fdd1962b17b92b7b946ecaac1  src/presentation/worldUI.test.ts
9d2841e99d9d9f147aa23d35669b52d831d103915f98fe494df2ddb484f9ec52  src/services/rewardSave.test.ts
15e981cb265f445adfd5d93a035bfecf9c83dbfea9f914f9cb290dc77c949ca1  src/services/rewardValidation.ts
611e654d20884514571736a6798636ee956d59aa1446422303d4c450c5b6ca5e  src/services/saveService.ts
5204c0264daafd5ba5a8a75229eaac183fa18187958b588562b3d25fbdc76edb  src/services/saveService.test.ts
```

## Corrective C1/C2/C3 source freeze

The independent C audit reopened this freeze for three focused integrity corrections. The base source HEAD is still Root-reported `a1307d220a68213be6465bc40e0a85af8ec605a3`; this corrective freeze is a working-tree fingerprint and no Git metadata was queried.

- **C1 boss state:** `RewardState.bossForms` is now catalog-bounded by validation and stores either `{ kind: 'frozenEncounter', encounter }` or `{ kind: 'cooldownUntil', availableAt }`. Defeat replaces the frozen entry, so variant/context details are cleared and new content bosses no longer allocate director cooldown keys. Save 8 / Reward 3 top-level shape is unchanged. Historical raw Reward3 encounter entries are deterministically wrapped before active-combat validation; normalization is idempotent and consumes no world RNG or reconstruction. Historical `content-boss:*` director keys remain validated/read-only compatibility inputs. Active encounter, defeated cooldown, expiration/reformation, legacy raw-entry migration, unknown IDs, and malformed cooldown shapes have focused coverage.
- **C2 outdoor progression:** dungeon stage, completion count, and clear-iron reward now advance only when `monster.dungeon` is true. Outdoor content-family victories do not alter dungeon state; the existing Wolf and dungeon payout paths remain covered.
- **C3 cooldown capacity:** the persisted director cooldown map remains capped at 100. The writer preserves active/unknown entries and uses only the existing expired-hunt pruning. If `director:lastDailyTick` is absent and no slot is available, the optional living-event daily pass declines before event progression or marker writes; core simulation time/NPC/threat work continues. If the marker consumes the final slot, new event candidates requiring new keys are filtered before RNG selection. Candidate events and traveler hooks preflight needed keys; hunt feedback returns zero before request progress when full. Existing keys can still be updated. Tests prove both saturation boundaries, no hunt partial progress, no RNG draw from a filtered candidate set, and reloadable saves at 100 keys.
- **Canonical closure:** the loot-to-craft-to-equip-save test earns all four resin through four legal encounter/combat victory paths. It is a deterministic controlled fight fixture (combat HP set to 1), not natural-exposure evidence; no direct loot-award calls pad the closure inventory.

The initial C1/C2 RED outputs are preserved in `c1-cooldown-race-red.md` and `c2-outdoor-dungeon-red.md`; the pre-fix C3 outputs are archived in `c3-director-capacity-red.md`. Final focused output and typecheck evidence are in `c-core-corrective-validation.md`. The final focused core gate passed 7 files / 252 tests; `vue-tsc --noEmit` exited 0. Root assigned the broad 531-test retry to Low after independent review; this core owner did not rerun it.

The corrective source fingerprint supersedes the earlier freeze map above:

```text
8a249649509a1b5fbff74e2d9cf2a1af8ee96e00d4da588dbaee2169de33108a  src/components/InventoryWindow.vue
ba525fb8a9dcfda93ea064a7381010558d560885a92194bbdca78a92be75a8f0  src/components/PlaceWindow.vue
ea56d790207bf13575ee19cbbdf46fa29ad8a03dd374a4613863af33c44e707a  src/data/config.ts
12dcc921ff7e8014cee9a6a8a320df10ad44dcd29b621bd62e5f8bea17c23384  src/data/contentRegistry.ts
e882f58803229c01b4853e44710f5cd1f7b2a56a2c4b058bbebe2fe2141aaa73  src/data/crafting.ts
7169a34cfd420ec4a181fa54c03560c5301f7fac666a049e5773d0439d897806  src/data/rewards.ts
0f91295536535f55679a770d3d09b368ec188c7ff322104f059e048589e55ead  src/data/content/slime.ts
dd9d3eedac08df9b47af1e16d6f0610190378450e90a768079b574e0aa2408ba  src/domain/content.ts
237c1e6eeb42d4af77d78c24ef7c3b699816459a9b71357acfd57c31810a9aac  src/domain/reward.ts
7924e0383ca4f1e5623e95aca5ceb28b5022c03af007dca0d2cb2c1ec0050450  src/domain/types.ts
89c19f827a75999a271055f0d08c20a762fec098c178fa7e0e18af16d2bac74a  src/engine/actions.ts
f60684e7b3a6523dd2a984303d4f284d6512f857f5ad2856f4ec2f419bbcfb42  src/engine/contentFamilies.ts
c935abec493128697faa6dc5a2792de25a22a6d7e9a7180bc5a6761e4e4d1cad  src/engine/contentFamilies.test.ts
1c44bfa79e0e37f3fa601a5e3832925a8c0b63e2cd2c6dec30176586aab7565e  src/engine/contentValidation.ts
484c9e8e528311574ba21139bc9c68b7ab74377da3cbc1893ecac71c65a08226  src/engine/contentValidation.test.ts
11514e5bc8a69f9b0993adcdb41232c692814578dc821389088a4b7048dde00e  src/engine/crafting.test.ts
729e442247d398292bb9bd0a2a6c4f3a2fb3488248859f362a3b700383454624  src/engine/crisisAdventure.test.ts
38676a3b5bce1406ea7a4471139b72ee58c9a53f41fb90adba47885d95b7c559  src/engine/itemGeneration.ts
377f8471b4bc69169d01d969a3c0d443b5ddbe1624f7436851320c0a9b45287f  src/engine/itemGeneration.test.ts
133b21d4f52de1c4a46e2c4600b214fc56d14f80de45ade78e81b1eebad667f1  src/engine/rewardActions.test.ts
9af3811e2c5e566498fbaa0e846d0fc93caa6f8b2dabbecdf347bfcdf25ac3b8  src/engine/rewardState.ts
aba3813377c4940ca192a6275452288c1d10b501c6aad0b693a4205c22900bec  src/engine/livingEvents.ts
8570cc1d1a00bd8970237cb469b71ce1b7b21146dd14eb28e2fe0d921677a217  src/engine/livingEvents.test.ts
8624c052a385e339598ef0954e7f15e79541147fdd1962b17b92b7b946ecaac1  src/presentation/worldUI.test.ts
236af259c210d02bc843aa7e29fba06b5bcb5c220793d7668b224e5860337d30  src/services/rewardValidation.ts
8778befac0ea57c90d2e5b0ac6a05f18cd95bcb40fbc4a4ccaaa3049935348cb  src/services/saveService.ts
5204c0264daafd5ba5a8a75229eaac183fa18187958b588562b3d25fbdc76edb  src/services/saveService.test.ts
9d2841e99d9d9f147aa23d35669b52d831d103915f98fe494df2ddb484f9ec52  src/services/rewardSave.test.ts
```
