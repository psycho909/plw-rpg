# Phase 6-D Contribution Analysis

Status: D independently reviewed and accepted by Root. Source commit `dfdc81636bb68f83ee87c4046199dcbaaf11e192`; tests ran on parent bd4901c plus the exact reviewed D12 source hashes now captured by dfdc816, without a post-commit rerun claim. D adds player equipment, food, and gold contributions during a crisis warning or preparation phase. It does not advance time or consume RNG.

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

The final D source hashes are recorded in `d-source-freeze.json` (SHA-256 `1f221ac850211a7f32166c8125178fc995f6ca21aeb615e9876aa4ad876b4d55`). No D source changed after the green full check; independent Standards/Spec review accepted D, with four targeted regression cases and actual crafted-item contribution/reload. See d-core-independent-review.md/json. E is not covered by this D acceptance.

# Phase 6-E Adventure Analysis

Status: E implementation candidate, pending independent review; Root has accepted E; F implementation is not yet released. Base source is `dfdc81636bb68f83ee87c4046199dcbaaf11e192` (accepted D). The approved E scope is the current Goblin camp raid plus the existing Goblin Chief outcome. No UI, new monster family, or F–J behavior is included. Workflow used `cloud-environment-onboarding:setup` and the project-adapted `matt-skills-curated:implement` / `matt-skills-curated:tdd` process.

## Public adventure facts and effects

`startRegionalCampRaid(state, crisisId)` starts the existing Goblin in a shared encounter constructor. It accepts only the matching warning, preparation, or active crisis before the phase deadline, with a living idle player on a forest tile, outside combat and dungeons, and with the normal stamina cost. It does not change boss flags or use a count of ordinary hunts. The combat marker stores `{ kind: 'camp_raid', crisisId, startedAt }`; an actual victory records `adventure.campRaidAt` once only if the same crisis remains current and live at victory time. A failed or fled attempt can be retried, an ordinary Goblin hunt never credits the camp, and a late or departed objective keeps ordinary combat rewards without special credit.

The existing Chief outcome contributes 8 points of actual special relief and the camp raid contributes 6, capped at 14 total. Threat demand uses `max(20, max(causeFloor, currentPressure) - specialRelief)`, preserving the ordinary cause floor and ensuring a successful camp raid changes odds when current pressure dominates. Tests isolate the camp effect against the same post-victory world with only `campRaidAt` cleared, so the normal hunt's threat reduction cannot masquerade as the camp benefit. Chief-only and combined Chief-plus-camp cases remain non-guaranteed.

## Save and event-capacity behavior

V6 validates the exact crisis `adventure` shape. V4 migration adds both the empty D contribution ledger and adventure default; V5 migration validates the historical V5 shape and preserves its complete world, D ledger, crisis, world time, and RNG while adding only the adventure default. V6 in-flight objectives require a same-seed canonical Goblin crisis ID whose sequence is between one and the persisted regional-crisis sequence, `startedAt <= worldTime`, and a real non-dungeon Goblin combat. A historical marker remains loadable after its phase or current crisis changes; the victory path rechecks current ID and phase before writing any credit.

The V5 input is the retained controlled fixture `e-v5-fixtures/crisis-v5-preparation-d-ledger.json` (SHA-256 `b06eeb743cbd941c20c0b54e42f13120a1366b7b166da03c18ebfea6f5b03a25`), generated by the archived V5 public engine at D checkpoint `dfdc81636bb68f83ee87c4046199dcbaaf11e192`. Its manifest verifies all archived `src` hashes, V5 round-trip acceptance, and nonempty equipment, food, and gold ledgers. It was reused unchanged.

The MAX_SAFE_INTEGER-2 public start→win save failure was preserved before the fix in `e-red-event-capacity.txt`; a second pre-fix record, `e-red-event-capacity-atomic.txt`, captures the required atomic start, win-turn, and canonical-day-boundary failures. Before raid start, an isolated one-hit Goblin victory projection checks the start event plus the complete reward and time-step path before stamina or the real event sequence changes. For each in-flight raid turn, the actual command is applied to an isolated game-state clone, including canonical simulation events, and rejected before the real world changes if the resulting event sequence would fail V6 save validation. This avoids reserving a guessed number of events and makes no real RNG draw or journal/global mutation. Only the optional camp objective uses this preflight. The exact simulation clones the complete game state, including bounded but potentially 20,000-entry history; no generic event-bound helper covers combat and canonical daily simulation. The optional camp path accepts that cost to avoid a drift-prone duplicate budget; performance remains a review item for later Phase 6 work, and no fast path is added without a proven conservative bound.

## Verification and review state

The focused E regression passed 297 tests across 12 files (`e-green-event-capacity-regression.txt`, SHA-256 `8187b844f88980874634a50d189003e753470bb7c3cb2dea4647f3f6cd7d819e`). `vue-tsc --noEmit` passed (`e-typecheck-event-capacity.txt`, SHA-256 `6160d5bc8f0a1e5dc08ba504142cdebaa4d18b18777de7fc7910bdd38fcb76e6`). The one schema-wide `npm run check` passed 505 tests in 26 files, typecheck, and production build (`e-fullcheck-green.txt`, SHA-256 `5de37e200e59e07c14edf58c74a0d0b374820536bfdd9140eccb2e258cae4580`). Earlier missing-action, V5 migration, and event-capacity RED records remain in the evidence directory. The candidate source hashes are in `e-source-freeze.json`; independent review is pending, so this is not an E acceptance claim.
