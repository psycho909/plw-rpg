# Phase 7 External Code Review Handoff (Prepared for Owner)

**Target reviewer:** Claude Opus 5.5, to be run by the Owner separately. This is a handoff only; external review has not been performed.

## Review scope and source identity

- Repository: `psycho909/plw-rpg`
- Branch: `v2x/reward-core`
- QA source commit: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- Recursive `src/` fingerprint: `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58` (112 source files)
- Delivery commit: to be filled after the authorized current-branch commit; use that exact commit and its diff for review.
- Build status SHA-256: `b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc`; `dist/` fingerprint: `0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1`.
- Do not infer source identity from a test base SHA alone; the K QA exercised uncommitted source captured by the recursive fingerprint above before delivery.

## Architecture summary, Phases 0–7

Oakvale is a client-side Vue/TypeScript game. `src/engine` owns world transitions and action rules, `src/domain` defines persisted world/character/reward types, `src/data` owns static catalogs, `src/presentation` projects world state for the UI, and Vue components expose normal visible actions. The active game runs only while the page is open; local saves use the existing `oakvale-v1` browser key. No server-side save service is part of this Phase7 delivery.

The engine has a seeded random service and persisted RNG state. New content is routed through existing seeded world/reward/combat systems rather than a parallel generator. Save state is currently save version 8 with Reward data version 3; migration/normalization and validation are centralized in `src/services/saveService.ts` and `src/engine/rewardState.ts`. Earlier phases establish the living-world simulation and NPC lifecycle; reward/adventure phases add equipment, loot, combat/dungeon targets; Phase5 adds bounded crafting/life use; Phase6 integrates regional crisis and civil-defense contributions; Phase7 adds six authored monster families, equipment/materials/recipes, crops, discovery UI, and balance/coverage verification.

### Phase 7 data and runtime flow

- Six family definition modules are registered through `src/data/contentRegistry.ts`; `src/engine/contentFamilies.ts` projects current-region encounter eligibility using existing region, level, threat, settlement, season, hour, safety and discovery state.
- Encounters use existing action/combat contracts and Boss cooldown/form state. Loot is resolved through the established `itemGeneration`/reward path and seeded RNG.
- 48 new equipment bases, 48 ecology/crafting materials and 11 crop goods produce 107 unique qualified item IDs. 24 recipe transactions consume authored materials and create normal generated items. Eleven new crops produce stable crop-good identities with conversion-to-food, sale, farm supply and crisis contribution paths.
- No new map, faction, broad magic system or second generator was introduced.

## Relevant specifications and tickets

- `docs/specs/V2X-PHASE7-CONTENT-EXPANSION.md` — authoritative scope, acceptance, gates and output questions.
- `tickets/20261008-v2x-07-content-expansion.md` — Parent L3 and stage history.
- `tickets/20261008-v2x-07a-baseline-content-plan.md` through `...07k-qa-review-delivery.md` — stage work, dependencies and acceptance.
- Related contracts: `docs/specs/V2X-REWARD-RETENTION.md`, `docs/specs/V2X-PHASE5-LIFE-CRAFTSMANSHIP.md`, `docs/specs/V2X-PHASE6-REGIONAL-CRISIS.md`, and `docs/UI.md`.

## Current test matrix

- Full npm run check: 37 test files / 627 tests, TypeScript check, and production build passed on source fingerprint 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58.
- Seven-pack validator: approved content pack validation, 23 targeted validator tests and typecheck passed.
- Browser runner contracts: 41 passed; Python compilation, runner syntax, launcher, instrumentation, and scoped diff checks passed.
- Focused production Browser selector/keyboard smoke: 42/42 checks passed; independent Spec review passed.
- Two-hour Chromium soak: run 20261013T152918Z-pid405218, 7,200.66 seconds, 115 checkpoints, 1,646 actions, 23 verified save/reloads, zero recorded Browser errors, source stable. Launcher status remains COMPLETE_STRESS_REVIEW_REQUIRED because 496 visible actions were marked no-progress.
- One-hour content-agent Chromium lane: run 20261013T173052Z-pid410744, 3,603.84 seconds, 58 checkpoints, 840 actions, 11 verified save/reloads, zero recorded Browser errors, source stable. Launcher status remains COMPLETE_STRESS_REVIEW_REQUIRED because 247 visible actions were marked no-progress. This is a runner-driven heuristic with no model inference and is not human play.
- Current-source long world: three seeds × 10/50/100 years; 9/9 save/reload and continuation comparisons equal, 11 Vitest tests passed, source and runner stable. No player encounter actions or natural content-Boss defeats were recorded.
- Loot and combat: 100,008 controlled loot awards and 118,800 controlled combat fixtures; neither estimates natural encounter/player outcomes.

See regression.md, browser-regression.md, browser-stress.md, long-world.md, performance.md, loot-analysis.md, monster-balance.md, content-validation.md, and final-review.md for exact artifacts and limits. Verify every identity against the final delivery commit before external review.
## Save, migration and determinism overview

The tested source keeps the existing save key and versioned shape; Phase7 is principally additive content with no new top-level save schema. Core save tests exercise serialization, reload, migration normalization and invalid-data behavior. Long-world runs compare save/reload state and continued deterministic simulation. Loot mirrors compare awards, RNG progression and next item identity. The K browser runs use normal visible save/reload and compare core runtime state. Review migration version boundaries, future unknown IDs, RNG draw ordering and item instance identity against the exact source diff.

## Existing findings to carry into the review

- Early/mid Boss controlled fixture win rates are low; natural acquisition and player tactics have not been sampled.
- Natural encounter exposure and player-driven new-content Boss defeats were not measured in the long-world lane.
- Craft-fee versus output-sale checks omit input prices, merchant volume, stock, restock cycles and natural material acquisition; no arbitrage conclusion is claimed.
- IndexedDB records grew 13→14,847 over the two-hour Browser lane and 13→7,403 over the one-hour lane. Bounded serialized-record estimates reached approximately 3.82 MB and 1.91 MB; these are not physical database bytes or quota measurements. No Browser storage error occurred.
- The one-hour heuristic selected Wait 1 day 289 times and marked 247/840 visible actions no-progress. It supports stability observations but does not establish goal clarity, fun, boredom, or route mastery.
- Life, Adventure, and Hybrid route reports each state NOT ESTABLISHED as deliberate strategies; they are evidence gaps, not confirmed bugs.
- Historical P2 D auditability condition: original Cave Insects authoring bytes/source fingerprint from the first failure are unavailable; accepted compensating evidence does not recreate the original.
- P3 maintainability debt: contentFamilies.ts duplicates some wolf drop eligibility rules also represented in itemGeneration.ts.
- Human Fun Gate is DEFERRED / NOT APPLICABLE AT THIS STAGE; no Agent/Playwright evidence is human feedback.
## Review focus

Oversized controlled-combat attempts 04 and 05 are archived as lossless `combat-raw.jsonl.gz` blobs. Each sibling `combat-raw.jsonl.original.json` records the original raw filename, SHA-256, byte count, compressed-file hash, and exact restore command; each folder `SHA256SUMS` verifies the stored gzip and sidecar. Both decompressed streams were hashed and byte-counted against the original raw values before packaging. This storage representation preserves the exact JSONL bytes; it does not alter the controlled-combat evidence.

1. Cross-module consistency between family eligibility/presentation and the canonical encounter/loot resolver; especially the duplicated wolf rule source.
2. Save8/Reward3 migration, strict ID validation, unknown content behavior, and preserving RNG state and item identity.
3. Determinism and draw-order stability across content additions and registry ordering.
4. Boss cooldown, midnight boundaries, director capacity and progression interactions.
5. Whether content registration, family predicates and reward routing remain maintainable as the catalog grows.
6. Crop-good conversion, recipe material consumption, economic paths and Regional Crisis contribution boundaries.
7. Browser IndexedDB journal retention/compaction and failure behavior under storage quota.
8. UI search/filter/focus semantics at keyboard and narrow widths.

The external reviewer should report findings with severity, concrete source locations, reproduction/evidence and recommended direction. Do not ask the reviewer to decide product fun from automated metrics, change scope, or treat the human gate as passed. Phase7 Parent L3 remains Owner-pending until the Owner reviews the complete local delivery and any independent review.
