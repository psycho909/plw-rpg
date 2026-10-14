# Phase8-C2 V4 Farming Yield Review

Review scope: `.scratch/20261014-phase8/c2-v4-src.diff` against the V4 owner decision and the requested C2 checks. Review only; no source files were changed and no tests were run during this review.

## Finding

### LOW — Harvest mutation lacks an exact-yield regression assertion

**Evidence:** `src/engine/crops.test.ts` verifies `farmCropChoices()` projections for spring pea and wheat across Farming levels 1–6 and 33. `src/engine/actions.test.ts` exercises an actual wheat harvest but only asserts that food increased, not that the delivered amount equals the projected harvest amount. No test asserts an actual content-crop material stack delta at a bonus boundary or cap.

**Impact:** The current implementation is consistent: `src/engine/actions.ts:62-74` obtains the crop choice and credits `cropChoice.harvestAmount` to either food or the content-good stack; wheat's projection includes the bonus and its harvest goes through the food branch. A future divergence between the UI projection and mutation could evade these tests.

**Recommendation:** Add focused action tests that harvest wheat and at least one content crop at Farming levels 1, 3, 5, and an over-cap level, asserting exact inventory/material deltas against the formula. This is a coverage improvement, not a defect in the reviewed implementation.

## Requested checks

- **Formula:** PASS. `src/engine/crops.ts:36-39` implements `min(2, floor((level-1)/2))`. Valid saved skill levels are integers >=1 (`src/services/saveService.ts` actor skill validation); expected bonus transitions are 0 through level 2, +1 at levels 3–4, and +2 from level 5 onward. The focused projection test samples each transition, level 6, and level 33.
- **Yield paths:** PASS. Content-crop projections add the bonus to authored `harvestAmount` (`src/engine/crops.ts:77`); wheat uses the same projection and its existing fallback harvest adds the bonus (`src/engine/actions.ts:62-74`). `PlaceWindow.vue:173` displays `selectedCrop.harvestAmount`, so the preview shares the projection. Repository search found no other farming-level-based harvest calculation. NPC lifecycle has no crop-yield path; FarmBusiness food supply consumes player inventory via `supplyFarmFood()` and is not a separate crop harvest calculation.
- **Save/load and determinism:** PASS. The change adds no persisted field, migration, or RNG call. It reads the already persisted Farming level and computes a deterministic integer bonus. Existing crop serialization remains unchanged. The changed harvest quantity will naturally affect future world state where food/material totals are consumed, but that is the intended mechanic.
- **Evidence:** PASS as supplied. Both before and after completion files report `PASS`, 15 route variants, and 15/15 `VALID_POLICY`; the after attempt is `attempt-20261014T093926448Z`. No causal claim beyond the fixed-sequence counterfactual and supplied route runs is made here.
- **Scope:** PASS. The supplied diff changes only `src/engine/crops.ts`, `src/engine/actions.ts`, and `src/engine/crops.test.ts`; it implements the approved V4 formula and does not add a system or alter NPC/FarmBusiness mechanics.

Overall: **PASS with the low-priority test-coverage recommendation above.**
