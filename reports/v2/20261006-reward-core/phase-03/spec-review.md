# Phase 3 Spec Review

Disposition: **PASS WITH FINDINGS** for static spec review; the Phase 3 engineering gate remains pending the root-owned runtime gate. Scope is the Phase 3 working tree against base and HEAD `6568b466390d06e6be0af2585e7524b9415204b8`, canonical spec §77 and ticket `20261006-v2x-03`. Requested GPT-6 Luna/max profile; runtime identity is unverified.

The frozen source manifest at `reports/v2/20261006-reward-core/phase-03/source-freeze.json` contains 74 `src` hashes; all 74 match current files, including `wolfFamily.ts` and its test. I did not run tests, builds, simulations, or browser checks and made no source edits.

The implementation statically matches the Phase 3 slice: five ordered wolf encounters, bounded rank traits, seeded context-based boss variants stored across attempts, combat effects for roles/traits/cores/variants, family loot, visible rank/trait/variant and next-turn cues, and shared regional threat reductions that leave Goblin Chief alive/warning/memory state unresolved. No Phase 4+ scope was evaluated as an acceptance requirement.

**P2 — active boss save can bypass the root-form crossguard.** `src/services/saveService.ts:89-93` invokes `validFamilyEncounter` only when optional `combat.familyEncounter` exists. `src/services/rewardValidation.ts:194-196` accepts a valid `reward.wolfBossForm` independently. A Wolf King save with its family marker removed is therefore accepted; on victory `src/engine/actions.ts:179-182` takes the Gray Wolf fallback and leaves the root boss form/cooldown stale. This misses ticket `20261006-v2x-03-monster-slice.md:40`'s static active-boss/root-form consistency.

Do not require a tag for every combat whenever a root form exists: after fleeing, the root intentionally persists, and existing `encounter()` can legally start an untagged outdoor wolf. The current normal wolf range is max HP 30–45 / attack 8–12 (`src/data/config.ts:33-37, 143-149`), while resolved Wolf King stats start at max HP 108 / attack 16 (`src/data/rewards.ts:44`; `src/engine/wolfFamily.ts:122-140`). When a root form exists, compare an untagged outdoor wolf's persisted static combat tuple with the root-derived boss tuple to catch a missing marker without rejecting the legal legacy fight; add both cases to save regression.

No fun, retention, or human-product PASS is claimed.
