# Phase 1 Reward Data / Save Migration — Independent Review

Disposition: **PASS WITH FOLLOW-UP**. No current Phase 1 migration blocker found. One P2 save-validation follow-up must close before Phase 3 enables family combat.

## Scope and snapshot

Reviewed ticket 20261006-v2x-01-data-model.md, AGENTS.md, README.md, docs/agents/review.md, the Phase 0–3 data/save and gate sections of docs/specs/V2X-REWARD-RETENTION.md, the tracked Phase 1 diff, and the new reward domain, catalog, initializer, gear stats, validator, and save tests.

Base commit and current HEAD are both 468a4923d3e847dbd04a5b7edeff6cf5be21a9d5. Phase 1 changes are uncommitted in the working tree; staged diff is empty. The project baseline is ac144ef4759d14570bf686e6a0e6b2983075fa9b. I reviewed the tracked changes with git diff --stat and git diff for src/domain/types.ts, src/engine/simulation.ts, src/services/saveService.ts, src/services/saveService.test.ts, src/stores/gameStore.test.ts, src/services/playJournal.test.ts, tickets/20261006-v2x-01-data-model.md, and docs/specs/V2X-REWARD-RETENTION.md. I enumerated untracked files and read the six requested source/test files in full. git diff --cached --stat was empty; git diff --check passed. No source or Git state was changed by this review.

Reviewed source SHA-256:
- src/domain/reward.ts — 4c34b926386fbbb6642954eee92a1e2b9e5523fcb4a1e37d33414009362b7279
- src/data/rewards.ts — 7734afccc540e398dc9d622c8d044067f4b9184ca329e357db60315712bfe513
- src/engine/rewardState.ts — 0544a7fe955cd1965985e2f99c8fb4ef5ff38c6094bf41068186a06b267c5d1f
- src/engine/gearStats.ts — 5b26e121761f613a08ad2d09f25d7055137819490482c25a56ed23235997d20f
- src/services/rewardValidation.ts — fac48c4d92e290b027925509928018ef6a8d862faa1cc9461f9d4e858ea20100
- src/services/rewardSave.test.ts — 4110e563a0a1f0aca6d4090f1fbcfd1ad38cef37ddfd1cd8e63aa0fb39725c38
- src/domain/types.ts — d91ba10e135abfcda060fdfddb31125a3eb19fb0cc6b6d1b14b7d4068a475705
- src/engine/simulation.ts — e85e143a23a9130df8b68a62fdd3a9c06d09cc9a1c7a2af2bdde8ec8395a2484
- src/services/saveService.ts — 371b59e7b13228e0b7fdae5b6e7bd62e4d538ff1223013c8c708fb1c0cf05850

Reviewer is an independent context. The orchestration tool explicitly requested model gpt-6-luna with reasoning_effort max and fork_turns none; runtime model telemetry is unavailable. The project profile .codex/agents/luna_worker.toml is absent.

## Finding

**R1 — P2, follow-up required before Phase 3; not a current Phase 1 blocker.** A tagged family encounter can pass save validation with impossible or hand-edited combat numbers. saveService.ts checks combat.hp, maxHp, attack, defense, exp, and gold independently for broad numeric ranges. validFamilyEncounter checks the snapshot shape and equality with combat.familyEncounter, but does not require hp <= maxHp or resolve combat stats from the saved definition, traits, variant, and context. The architecture preflight explicitly requires hp <= maxHp and exact comparison to resolved snapshot stats.

This is currently latent: Phase 1 adds no family encounter producer or combat consumer, and no supported Phase 1 path emits familyEncounter. The unresolved checks are explicitly assigned to the Phase 3 canonical resolver, so they do not block the additive migration gate. Before Phase 3 enables these saves, use that resolver during load validation and reject impossible HP and mismatched derived stats. If familyEncounter is made usable before that work lands, its save payload must fail closed until the resolver is available.

## Phase 1 conclusions

- Migration is additive. A V2 save without reward gets a fresh empty extension only after existing world and life validation. A present reward is validated and rejected on failure; it is never replaced. A V1 save containing reward is rejected. The V1 path preserves legacy inventory and sword/armor equipment and uses the existing isolated life initialization without consuming the saved world RNG.
- The tests compare preserved V1/V2 world fields and round-trip new instances/material counts; they also cover malformed reward rejection and the game-store behavior that blocks writes while retaining the original malformed save. No legacy stack or fixed-gear conversion is forced.
- emptyReward is deterministic and pure. The V2 missing-extension migration does not reconstruct the world, advance time, or consume RNG. The reviewed tests and saved verification evidence support repeatable save/load.
- The validator rejects unknown reward, instance, stat, affix, provenance, collection, material-map, and equipment-map fields; checks registry membership, safe counts, unique IDs/references, rolled-stat consistency, and conflicts between legacy and instance equipment.
- Phase 2 loot generation and Phase 3 monster behavior are outside this review and are not treated as missing Phase 1 work.

## Verification evidence

I did not rerun tests or build. The checked-in phase-01/verification.md and matching run artifacts report 243 tests across 15 files PASS, npm run build (including vue-tsc) PASS, and 20 fresh Chromium checks PASS with zero uncaught page errors. Root confirmed these runs completed against stable source snapshots. This review independently ran only git diff --check, which passed.

Phase 1 disposition: **PASS WITH FOLLOW-UP**. Keep R1 open as a mandatory Phase 3 validation gate.