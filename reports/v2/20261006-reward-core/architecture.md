# V2.x Phase 0–3 Reward Core Architecture

Baseline source: ac144ef4759d14570bf686e6a0e6b2983075fa9b (V2 app 441e3c2). Authority: [Phase1](../../../tickets/20261006-v2x-01-data-model.md), [Phase2](../../../tickets/20261006-v2x-02-equipment-slice.md), [Phase3](../../../tickets/20261006-v2x-03-monster-slice.md). This document records agreed narrow seams; it is not a completed implementation claim.

## Save boundary
- Keep saveVersion 2, new required in-memory GameState.reward.schemaVersion 1. Native old V1/V2 without reward validate first, then attach emptyReward without RNG/time/world reconstruction. Existing reward is strictly validated, never replaced on error.
- Legacy inventory and sword/armor semantics remain unchanged; add globally unique ItemInstance IDs/ownerId, sparse per-character material stacks and equipped instance refs. Same two physical slots: instance vs legacy cannot overlap.
- Instance fields include base, level, material, rarity, exact rolledStats, eligible unique affixes/tier/value, specialTrait and nullable limited provenance. Generators use engine/random.ts only.
- Catalog discovery records finite registry IDs; never individual low-value item histories. Instance inventory preserves all owned gear; UI must paginate rather than silently discard gear. Old property storage remains legacy stackable-only in this slice.
- Combat.familyEncounter is optional inline persisted snapshot, not a second root active encounter. Existing goblin crisis/boss and dungeon behavior remains independently identified. Wolf victory never clears goblin bossAlive.

## Domain seams
- data/rewards.ts owns catalog names/stats/eligibility/rarity weights/traits/family/loot tables; Vue does not roll content.
- engine/gearStats.ts owns base+level+affix stat resolution, no rarity scalar multiplication. max affix tier uses rarity and item level.
- engine/itemGeneration.ts will be single deterministic generateItem/loot seam in Phase2; caller awards result exactly once.
- engine/rewardActions.ts will own equip/sell/material trade; shared damage projection must read either legacy or instance gear, not both.
- engine/wolfEncounters.ts will own seeded formation, actual trait rhythms, variants and isolated family battle resolution in Phase3.
- services/rewardValidation.ts owns serialized unknown-data guards; serializers/checkpoint/journal use existing whole-state serialization.

## UI ownership
Monochrome World First, docs/design/DESIGN.md and docs/UI.md remain canonical. Extend InventoryWindow/AdventureWindow/PlaceWindow with existing PixelWindow/PixelMeter/StatusNotice; no new overlay primitive, fixed dashboard, slots or color-coded rarity-only information. Show rarity words, real affix values, trait cues and actual gear comparison. UI selection/paging stays transient.

## Phased boundaries
Phase0 complete with retained harness findings; Phase1 accepted with nonblocking Phase3 validation follow-up R1. Phase2 implementing; Phase3 remains blocked by its preceding gate. Crafting/workshop/Masterpiece/crisis integration/content budget/build-retention verdicts are Phase4+ and are not claimed by this package. Human Gate remains PENDING.

## Cost and review
User delegated baseline long runner to GPT-6 Luna low; implementation/validation to GPT-6 Luna max. Initial model/baseline workers hit account usage limit; root resumed safe work under repository fallback. The preflight agent later owns validation implementation, therefore its preflight is not an independent final implementation audit. Root must distinguish final review role and any unavailable independent review from product approval.
