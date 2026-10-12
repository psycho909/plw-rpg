# Phase 7-C Independent Core Audit — Initial Post-Fix Snapshot

## Scope and provenance

- Ticket: `tickets/20261008-v2x-07c-first-content-batch.md` (L3).
- Pinned source base: `a1307d220a68213be6465bc40e0a85af8ec605a3`.
- Reviewed implementation commit: `9b13e7b9f45a60e175d8a278a822e951b1f46f9d`.
- Current documentation-only successor: `f0c9171faf7eb45528e627e3a0d3fde3a1b4dc81`; `src/` is identical, worktree clean at review start.
- Diff: `git diff a1307d220a68213be6465bc40e0a85af8ec605a3..9b13e7b9f45a60e175d8a278a822e951b1f46f9d -- src/` (29 changed source files). Corrective source fingerprints in `c-core.md` match the current files.
- Reviewer: independent auditor, not involved in implementation; requested model/effort `gpt-6-astra/max`. Runtime telemetry is unavailable; this does not claim the backend model actually used.
- Read-only review; no files changed by reviewer.

## Standards — PASS WITH FINDINGS

**P3, non-blocking: unused helpers.** `src/engine/itemGeneration.ts:62-69` adds `contentMonsterIsBoss` and `monsterIsBoss`; search found no callers of `monsterIsBoss`. This conflicts with `AGENTS.md` §3 cleanup of newly introduced unused code. Remove the unused helpers. No other blocking standards issue was identified in the reviewed scope.

`git diff --check` reported extra blank lines at EOF in `src/data/contentRegistry.ts:27` and `src/engine/contentFamilies.ts:330`; these are recorded for cleanup with the scoped follow-up.

## Spec — RETURNED

**P2: Reward3 material normalization can silently lose a valid owner's stacks and accept an unknown owner.** `src/engine/rewardState.ts:65-72` builds `normalized` as `{}` and assigns `normalized[ownerId]`. For `ownerId === "__proto__"`, this mutates the object's prototype instead of creating an own entry. The subsequent `Object.entries`-based reward validator cannot see the owner; serialization then omits its stacks.

The reviewer reproduced this in a memory-only harness against both pinned commits: pre-C Save7 accepted and retained a valid `__proto__` character owner with `{wolfFang:7,wolfHide:2,moonStone:1}`; the first Save7→8 migration retained it; a second V8 load yielded `Object.hasOwn(materials, "__proto__") === false`; serialization produced no owner key and a later load had lost the materials. A Reward3 material entry for a nonexistent `__proto__` owner was also accepted. This violates Phase7 spec §19, `content-plan.md:26` strict known-ID/preservation requirements, and Ticket C's strict migration constraint. Recommended fix: build the normalized owner map with a safe own-property mechanism such as `Object.fromEntries`; add public `deserialize` regression coverage for known-owner retention and unknown-owner rejection.

## Previously reported findings and verification

- C1 boss cooldown race: corrected using catalog-bounded `bossForms` encounter/cooldown states, independent of director-key capacity.
- C2 outdoor content wins entering dungeon progression: corrected to advance dungeon only for `monster.dungeon`.
- C3 director cooldown map overflow: corrected with capacity preflight on cooldown writers and a bounded optional daily pass.
- Reviewer ran read-only memory checks for four capacity/outdoor boundaries and compared 4 seeds × 50 Wolf reward/RNG/ID outcomes between the pinned commits; no regression was found. Existing 565-test full regression, typecheck and build evidence was read, not rerun by the auditor.
- Root independently reran the seven focused files: `npm run test -- src/engine/contentFamilies.test.ts src/engine/livingEvents.test.ts src/services/saveService.test.ts src/services/rewardSave.test.ts src/engine/actions.test.ts src/engine/simulation.test.ts src/engine/itemGeneration.test.ts` — 7 files / 252 tests passed.

## Disposition

**Do not accept C or release D yet.** Resolve the P2 data-loss issue, remove the P3 dead helpers, clean the reported EOF whitespace, add failing regression evidence before the production fix, then rerun targeted/full relevant checks and request an independent review of the exact corrected source. This report applies only to the pinned `9b13e7b` source and does not claim a Phase7 Product Gate or Owner acceptance.
