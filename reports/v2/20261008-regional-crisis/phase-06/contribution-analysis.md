# Phase 6-D Contribution Analysis

Status: implementation frozen for independent review. D adds player equipment, food, and gold contributions during a crisis warning or preparation phase. It does not advance time or consume RNG.

## Public actions and guards

The public engine functions are `contributeCrisisEquipment(state, crisisId, defenderNpcId, instanceId)`, `contributeCrisisFood(state, crisisId, inventoryItems)`, and `contributeCrisisGold(state, crisisId, amount)` in `src/engine/crisisContributions.ts`.

Every action checks the current crisis ID and accepted phase, a living idle active character, no combat or dungeon, the local village handoff area, and safe event capacity before changing state. Each action then checks the relevant live need and owned asset. A rejected action leaves the full game state unchanged. A successful action consumes the player asset, records bounded crisis attribution, emits one ordinary event, and updates last player activity; it does not call simulation or a random service.

## Contribution effects

Civil defense considers currently available guard and mercenary workers. The crisis severity sets a target of `min(8, 2 + 2 × severity)` defenders, with two equipment slots per defender. Donated items fill only actual open slots on those defenders, and the ledger allows at most 16 allocations in one crisis. The source item snapshot retains its owner, rolled stats, affixes, and provenance; the live item is removed from the player reward inventory. No NPC is added to the reward owner registry.

Each gear slot contributes an effectiveness value from its actual rolled stats and its defender's combat skill. Weapon core is attack + 0.5 × penetration + 0.25 × bleed + 0.1 × critical. Armor core is defense + 0.25 × block + 0.5 × reduction. The value is multiplied by suitability `clamp(0.5 + clamp(combatSkill, 1, 10) / 20, 0.55, 1)`, normalized against the configured base sword attack or armor defense, and clamped to 0–1 per slot. Equipment readiness is 10 points multiplied by total effective slots divided by the current defenders' available equipment slots. Rarity labels do not enter the calculation; the public tests compare common baseline stats with a stronger rolled item and verify the cap.

Food uses the existing daily food balance: `1.8 + farmers × 1.4 − population × 0.12 − 1 when the boss is alive`. The forecast applies that net across the remaining warning, preparation, and active durations, matching the civil-defense projection. A food item adds four real settlement food, up to the physical stockroom cap of 100 and a per-crisis contribution cap of 100. The action also respects the raw forecast and the configured low-food threshold. When the raw forecast remains at or below zero after the proposed supply, it rejects the donation and explains that more farmers or defense are needed; this prevents spending food that cannot improve readiness. An oversized request that would improve a negative forecast but exceeds the remaining need gets an over-request message instead of misleading advice.

Gold is deducted from the character and recorded as bounded emergency logistics. Available logistics workers establish capacity: `min(100, max(0, 20 − otherWorkers) × 5)`. Contributed gold adds `spent / 5` logistics-worker equivalents, shares the existing adult logistics factor, and cannot raise that factor past its 8-point cap. The total per-crisis gold limit is 100.

## Save and migration behavior

The save format advances from V4 to V5. V5 crisis saves require an exact bounded contribution ledger; V4 crisis saves reject a ledger and are validated with the V4 shape before migration adds an empty one. The migration preserves the complete crisis snapshot and does not recreate the world or crisis. V1–V3 migration coverage remains in place and now produces V5.

Equipment attribution validates the historical NPC ID form and requires its numeric component to be below the monotonic `nextNpcId`. It deliberately does not require that NPC to remain in the current NPC array: daily simulation removes dead nonfeatured NPC records and their life details. The public regression contributes equipment, kills a nonfeatured defender, advances one day through simulation, verifies the NPC and life record were pruned, then saves and reloads the still-attributed crisis successfully. The donor remains a historical character record, and the consumed item snapshot remains strictly validated without adding an NPC item owner.

Three controlled V4 saves were produced by extracting committed checkpoint `bd4901c28ed3fb8469d6fe5c82354b4e1128691e` with `git archive`, running the archived V4 public engine and save service, and verifying V4 round trips before using them as migration inputs. The manifest is `d-v4-fixtures/manifest.json` (SHA-256 `bc07f9ac342b5e10886279ca60d3856e28690d39b3207f874c3e1d9c9c0c6ab8`); its source fingerprint is `ea7c30c1b6872bcb92f3f5f7c68ad216e0fdf4e0929679ed7d876fab25c7dc5b`. The fixtures share crisis ID `goblin-regional:01352890:1` and cover:

- Warning: world time 480, RNG 875340395, SHA-256 `4d4e2bdc4767bc6652cadff98bb1d943b59dcf32775f9a0975d36033a2ebb10b`.
- Preparation: world time 6240, RNG 2279396558, SHA-256 `1b77345d364ca4dea182cc90154dff471a6ebafb101c297d0122f115693ae0ef`.
- Active: world time 12000, RNG 3060907490, SHA-256 `28c3a3daf0f0d46c75f34c9e8b5c6a1de9add141a7a8ad72437360e5b16a0c3c`.

## Verification evidence

The focused D regression set passed 170 tests across six files (`d-regression-final.txt`, SHA-256 `6fde8385b095d840f291b5908072074567e1900f4e58741685bcbabc5933c5c4`). `vue-tsc --noEmit` passed (`d-typecheck-final.txt`). The schema-wide `npm run check` passed all 475 tests in 25 files, typecheck, and production build (`d-fullcheck-green.txt`, SHA-256 `884991ad530fadcc165e683e0d94e7fa48b7e40c59c31424abfaa42b03e6e23c`). The earlier `d-fullcheck.txt` is preserved; its two failures were stale V4 expectations in `gameStore.test.ts`, which were updated to V5 before the green full check.

Public red/green records cover the contribution seam (`d-red-contributions-public-seam.txt`), food no-effect feedback (`d-red-food-feedback.txt`, `d-green-food-feedback.txt`), authentic V4 migration (`d-red-v4-v5-migration.txt`, `d-green-v4-authentic-migration.txt`), and the pruned historical defender reference (`d-red-pruned-defender-reference.txt`, `d-green-pruned-defender-reference.txt`). The pre-fix source hashes for the prune persistence failure are preserved in `d-red-pruned-defender-source-hashes.txt`.

Two earlier historical-reference records are superseded: `d-red-historical-defender-reference.txt` and `d-green-historical-defender-reference.txt` tested an overstrict rule requiring every historical defender to remain in the current NPC array. Root clarified that legitimate dead nonfeatured NPC references must remain loadable after daily pruning. The final code removes that rule and the replacement prune→save→reload regression passes.

The final D source hashes are recorded in `d-source-freeze.json` (SHA-256 `1f221ac850211a7f32166c8125178fc995f6ca21aeb615e9876aa4ad876b4d55`). No D source changed after the green full check; independent review is pending.
