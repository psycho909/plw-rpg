# Oakvale V2.x — External Code Review Handoff

## Review status and source snapshot

**External Code Review: NOT STARTED.** This packet prepares the handoff only; it does not start or claim an external review. The reviewer must use an independent context and must not have participated in Phase10 implementation or internal review. Give the reviewer the exact source snapshot and linked evidence listed here.

- Branch: `v2x/reward-core`
- Current HEAD: `29e7c4b9328c8ea7d58a71a4163a8d93643ea0db`
- Current validated source snapshot: `29e7c4b9328c8ea7d58a71a4163a8d93643ea0db` (`29e7c4b`); product `src/` files have remained unchanged since this checked snapshot. The final later documentation-only commit, if created by the root lead, should be recorded at external-review handoff.
- Current tracked `src/` fingerprint at HEAD (sorted relative path + each file SHA-256, then SHA-256 of newline-joined `path:digest` rows): 123 files, `3f469b14053555bbee38db6eddcd66e3f78980bfe4ed1def6e8bc5677fbc4842` (matches the Phase10-E run snapshot).
- Phase9 tested product source is `c0a377b50e09b67664bc07b65d4e81a382daa53f`; source comparison records no product behavior change since Phase9. The `3f469b…` aggregate also includes later test files. Earlier fingerprints (`d312c8b3…` at 119 files and `fd2f020e…` at 120 files) describe earlier tracked-source snapshots, not this HEAD.
- Dist fingerprints `7f5efed239807081c82b1ba48d8b6c1befb24291642509deb32e29cf134d5e00` (dist-relative rows) and `72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04` (repository-relative rows) identify the same three-file build, as recorded in `a-check-run/build-correlation-23ef273.txt`. E rebuilt and tested that output at HEAD `29e7c4b`; it is byte-identical to Phase9-F1 output with unchanged product source. Do not compare the two hash conventions as if they were different builds.
- Runtime recorded for Phase10: Windows 10.0.22621 x64, Node v22.14.0, Vitest 4.1.11. Historical phase reports may use different environments; retain their stated provenance.

## V2.x architecture overview

- `src/engine/`: rules and state transitions. Public actions and `simulate()` advance the world; deterministic RNG is routed through `src/engine/random.ts` and state `rngState`.
- `src/domain/`: game-state and domain contracts, including crisis and content types.
- `src/data/`: authored configuration, recipes, materials, monsters, loot and world rules.
- `src/services/`: strict save serialization/migration in `saveService.ts`; append-only play journal persistence in `playJournal.ts`.
- `src/presentation/`: read-only UI projections for world, crisis, reward, crafting and goal hints; projections should not mutate simulation state.
- `src/stores/`: Vue/Pinia application state, save/load coordination, actions and lifecycle integration (`gameStore.ts`).
- `src/components/`: user-facing Vue views and controls.

Typical flow: a component calls a store action; the store invokes public engine operations; the engine updates `GameState` using authored data and seeded RNG; presentation projections translate state into display information; save services persist and validate the state and journal. Review UI projection code separately from simulation rules and from persistence.

## Phase0–10 completion summary

Phase0–9 have historical accepted engineering deliveries and final-review records. Each row links its review and formal ticket. Status wording is limited to the recorded engineering gate; it does not imply Human Product approval.

| Phase | Engineering summary | Final review | Ticket |
|---|---|---|---|
| 0 | Baseline and freeze; shared Phase0–3 review reports PASS WITH FINDINGS. | [Phase0–3 final review](../../20261006-reward-core/final-review.md) | [Phase0 baseline](../../../../tickets/20261006-v2x-00-baseline.md) |
| 1 | Reward data model and save compatibility; reviewed within the shared Phase0–3 delivery. | [Phase0–3 final review](../../20261006-reward-core/final-review.md) | [Phase1 data model](../../../../tickets/20261006-v2x-01-data-model.md) |
| 2 | Procedural equipment slice; reviewed within the shared Phase0–3 delivery. | [Phase0–3 final review](../../20261006-reward-core/final-review.md) | [Phase2 equipment](../../../../tickets/20261006-v2x-02-equipment-slice.md) |
| 3 | Wolf-family controlled variants; shared review PASS WITH FINDINGS. | [Phase0–3 final review](../../20261006-reward-core/final-review.md) | [Phase3 monster slice](../../../../tickets/20261006-v2x-03-monster-slice.md) |
| 4 | Adventure reward loop; accepted phase delivery. | [Phase4 final review](../../20261006-reward-core/phase-04/final-review.md) | [Phase4 adventure loop](../../../../tickets/20261006-v2x-04-adventure-loop.md) |
| 5 | Life reward and craftsmanship vertical slice; accepted. | [Phase5 final review](../../20261007-life-craftsmanship/phase-05/final-review.md) | [Phase5 ticket](../../../../tickets/20261007-v2x-05-life-craftsmanship.md) |
| 6 | Regional crisis and civil defense; accepted QA delivery with recorded findings. | [Phase6 final review](../../20261008-regional-crisis/phase-06/final-review.md) | [Phase6 QA delivery](../../../../tickets/20261008-v2x-06j-qa-delivery.md) |
| 7 | Content expansion and validation; accepted QA review with findings and historical evidence limitations. | [Phase7 final review](../../20261008-content-expansion/phase-07/final-review.md) | [Phase7 QA delivery](../../../../tickets/20261008-v2x-07k-qa-review-delivery.md) |
| 8 | Balance and reward-pacing review; PASS WITH FINDINGS, Owner review remains as stated in phase record. | [Phase8 final review](../../20261014-balance-tuning/phase-08/final-review.md) | [Phase8 QA delivery](../../../../tickets/20261014-v2x-08f-qa-review-delivery.md) |
| 9 | UI/UX polish; PASS WITH FINDINGS, human adequacy questions remain deferred. | [Phase9 final review](../../20261015-ui-ux-polish/phase-09/final-review.md) | [Phase9 QA review](../../../../tickets/20261015-v2x-09f-qa-review.md) |
| 10 | A–E accepted: A `4a71d35`, B `29e7c4b`, C `2330441` plus typing fix `23ef273`, D `9928112`, E `076edeb`. B’s route outcome assertion is fixed; all three E P2 findings are resolved. E keeps one unreproduced P3 2,004 ms latency outlier; 120 targeted menu re-tests maxed at 85 ms. Current-HEAD full check passed. F lead final is pending fresh whole-phase Independent Max Review and Owner acceptance. | [Baseline](baseline.md) · [B review](b-review/b-review.md) · [C review](c-review/c-review.md) · [C follow-up](c-review/c-review-followup.md) · [D review](d-review/d-review.md) · [E review](e-review/e-review.md) · [E follow-up](e-review/e-review-followup.md) · [E regression](browser-regression.md) · [E stress](browser-stress-performance.md) | [Phase10 parent](../../../../tickets/20261016-v2x-10-final-qa-rc.md) · [A](../../../../tickets/20261016-v2x-10a-baseline.md) · [B](../../../../tickets/20261016-v2x-10b-integration.md) · [C](../../../../tickets/20261016-v2x-10c-reward-signals.md) · [D](../../../../tickets/20261016-v2x-10d-persistence.md) · [E](../../../../tickets/20261016-v2x-10e-browser.md) · [F](../../../../tickets/20261016-v2x-10f-final-handoff.md) |

## Persistence and data contracts

- `src/services/saveService.ts` owns the versioned JSON save envelope, strict shape/reference validation, and sequential legacy migrations. Current `CONFIG.saveVersion` is 8. Preserve existing serialized fields and migration behavior; do not silently replace rejected/corrupt saves. Representative coverage: `src/services/saveService.test.ts`, `src/stores/gameStore.test.ts`, `src/engine/bossSaveReload.test.ts`, `src/services/phase10Persistence.test.ts`.
- `src/services/playJournal.ts` stores the play journal separately in IndexedDB and packs its checkpoint with the local save. Game state and append-only journal ownership/recovery have different failure paths; preserve both and test quota/storage failures explicitly.
- Files and browser storage are client-side. A local user can inspect or modify their own save; strict validation protects shape and references, not cryptographic authenticity or server-authoritative anti-cheat. Do not infer tamper-proofing.

## RNG and determinism contracts

- Random simulation uses the seeded state RNG (`src/engine/random.ts`), carried in `GameState.rngState`; deterministic replay requires identical seed, initial state and legal action sequence.
- Save migration must preserve RNG/world time where its migration contract requires it. Tests include `src/services/saveService.test.ts`, `src/engine/simulation.test.ts`, `src/engine/phase10Determinism.test.ts`.
- `Date.now()` is used for save/journal metadata (`src/stores/gameStore.ts`, `src/services/playJournal.ts`), not as gameplay RNG. Persistence metadata may differ while equivalent game state remains deterministic; document any future excluded field before comparing.

## NPC, world and crisis contracts

- `src/engine/simulation.ts` advances canonical world time and daily/yearly NPC, settlement, crop and history systems. Do not conflate elapsed world time with real play time.
- NPCs and player succession are persistent identities/records, with related state in `GameState`, `src/engine/identity.ts`, `src/services/saveService.ts` and play history. Keep references valid across death, reload and migration.
- `src/engine/regionalCrisis.ts` and `src/engine/crisisResolution.ts` own crisis phases, contributions, resolution/recovery and cooldown. UI uses projections such as `src/presentation/crisisProjection.ts` and must not become a second rules engine.
- Relevant evidence: `src/engine/regionalCrisis.test.ts`, `src/engine/crisisResolution.test.ts`, `src/services/saveService.test.ts`, and Phase10 D long-world checkpoints. Threat saturation is an Owner decision **KEEP V0**; no change is authorized here.

## Combat, rewards and crafting contracts

- Combat encounter eligibility, turns, loot and cooldowns are owned by `src/engine/actions.ts`, `src/engine/contentFamilies.ts`, `src/engine/wolfFamily.ts` and reward data in `src/data/rewards.ts`. Preserve deterministic drops and encounter/save state; see `src/engine/contentFamilies.test.ts`, `src/engine/bossSaveReload.test.ts`, `src/engine/itemGeneration.test.ts`.
- `src/engine/crafting.ts` and `src/data/crafting.ts` define legal plans, station, materials, hours, skill/practice caps and craft outcomes. Keep planning as a validation/projection step and preserve material/item provenance. See `src/engine/crafting.test.ts`, `src/engine/phase10GoalContinuity.test.ts`, and `src/engine/phase10Integration.test.ts`.
- Reward/progression findings and route/seed evidence are summarized in [Phase10-C](reward-retention-signals.md) and [content coverage](content-coverage.md). Merchant stock/restock remains **NOT MODELED**; do not present transaction checks as complete market simulation.

## QA evidence index

- [Phase10 baseline and source/build caveats](baseline.md)
- [Cross-system integration](cross-system-integration.md) · [Adventure/Life/Hybrid routes](adventure-life-hybrid.md) · [B review](b-review/b-review.md)
- [Reward, retention and goal signals](reward-retention-signals.md) · [Content coverage](content-coverage.md) · [C review](c-review/c-review.md) · [C review follow-up](c-review/c-review-followup.md) · [C runner](c-runner/c-summary.md)
- [Save/migration/determinism](save-migration-determinism.md) · [Long-world results](long-world.md) · [D review](d-review/d-review.md) · [D runner](d-runner/d-summary.md)
- [Browser regression](browser-regression.md) · [Browser stress/performance](browser-stress-performance.md) · [E runner summary](e-runner/e-summary.md) · [E review](e-review/e-review.md)
- [Final risk register](final-risk-register.md)
- [Lead final review (pending fresh independent review)](final-review.md)
- Phase10-A baseline was 41 files / 650 tests. At validated HEAD `29e7c4b`, `npm.cmd run check` passed **45 files / 658 tests**, `vue-tsc --noEmit`, and Vite build; see [current-HEAD check](a-check-run/npm-run-check-29e7c4b.log). Product `src/` files remain unchanged since. E is accepted at `076edeb`: its three P2s are resolved; equipment search P95 is 8.49 ms and recipe search P95 is 9.97 ms, while 120 menu-opening re-tests maxed at 85 ms. Preserve the original unreproduced 2,004 ms P3 outlier. The fresh whole-phase Independent Max Review remains pending.

## High-risk code paths for review

1. Save schema validation, migration, and corrupt-save preservation: `src/services/saveService.ts`, `src/stores/gameStore.ts`.
2. Seeded RNG and replay boundaries: `src/engine/random.ts`, `src/engine/simulation.ts`.
3. Crisis phase transitions, contribution accounting, resolution and recovery: `src/engine/regionalCrisis.ts`, `src/engine/crisisResolution.ts`.
4. Craft legality, reward/material source attribution and provenance: `src/engine/crafting.ts`, `src/engine/actions.ts`, `src/data/crafting.ts`, `src/data/rewards.ts`.
5. Modal focus, keyboard interaction and responsive navigation: `src/App.vue`, `src/components/`, `src/style.scss`.
6. Long-world history/journal growth and browser storage quotas: `src/engine/simulation.ts`, `src/services/playJournal.ts`.

## Open product findings and technical debt

- See [Final Risk Register](final-risk-register.md) for P10-F01 through P10-F05 and inherited findings. No automated run establishes fun, goal comprehension, retention, or player Boss-risk understanding.
- **P10-F03: KEEP V0** — long-run threat saturation is retained by Owner decision; do not tune threat/guard formulas.
- **P10-F04: NOT MODELED** — merchant stock/restock and full market-cycle economics are outside current evidence.
- **P10-F05: DEFERRED** — human goal/fun/retention validation awaits Owner-started playtesting; use the blank [Human Playtest Packet](human-playtest-packet.md).
- Phase10-A content-validator wrapper/publisher is incomplete on Windows (`npm` child spawn and `python3` publisher unavailable in that run), although semantic validation passed and the separately recorded lead check passed. Preserve this as tooling debt, not a product failure.
- Phase7 P7-D-HIST remains an auditability limitation: original Cave Insects validator input bytes/source fingerprint are unavailable; current-source checks cannot recreate that historical evidence.
- Phase10-B’s former P2 test-protection gap is fixed and accepted: both normal routes now assert `COMPLETED` at `29e7c4b`.
- Phase10-E review: [E review](e-review/e-review.md) and [follow-up](e-review/e-review-followup.md) accept the lane and close all three P2s. Search-latency measures, hash correlation, root report locations, and 120 menu-opening retests are documented. The single 2,004 ms menu-open delay remains P3 and unreproduced; see [E stress report](browser-stress-performance.md).
- IndexedDB physical usage/quota and compaction remain unmeasured; no quota failure was observed. Local save tampering is possible by the local user; validation is structural, not cryptographic.

## External review checklist

- Confirm the exact source commit/fingerprint and obtain a build produced from that same source snapshot; distinguish historical fingerprints from current ones.
- Review save validation/migration compatibility, corrupt/unknown version rejection, and preservation of player data.
- Reproduce seeded determinism and inspect all gameplay randomness for dependence on real time or unseeded sources.
- Trace NPC identity, succession, history references, crisis contributions/recovery/cooldowns through save and reload.
- Audit encounter eligibility, loot ownership/provenance, craft planning, material sources and goal-hint legal destinations.
- Review UI projection purity, modal focus/keyboard paths, responsive layout and browser storage behavior.
- Verify Phase10-B’s fixed normal-route assertions and inspect Phase10-A validator portability limitation.
- Separate confirmed defects, historical evidence gaps, product questions and explicitly retained Owner decisions; do not infer Human Product approval from engineering evidence.
- Keep the external review read-only and independent. Record findings with severity, evidence, reproduction, affected source snapshot and disposition. Do not implement changes during the review.

## Review handoff state

**External Code Review — NOT STARTED.** The external reviewer has not been engaged by this packet. Complete the fresh whole-phase Independent Max Review and obtain Owner acceptance, then freeze the final source/build snapshot and provide this handoff in a fresh, independent context.
