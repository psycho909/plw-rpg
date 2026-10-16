# Phase10-C Review Follow-up

## P2 — Goal-hint destination legality

**Status: RESOLVED**

The follow-up assertions close the destination-coverage gap recorded in `c-review.md`. In `src/engine/phase10GoalContinuity.test.ts`, every emitted hint in the seeded seasonal and regional fixtures is checked by `hasCanonicalHintDestination`: both `where` and the `x`/`y` position must match the expected destination for that hint ID and current state. The expectation covers request types (including a live medicine-request NPC destination and incomplete hunt routing), crisis, crop, content encounter by region, eligible wolf, and the forest boss hint.

The test also constructs a crop hint routed to the mine and asserts that the destination contract rejects it. Therefore, if an emitted hint in the exercised fixtures is changed to a different label or coordinate, its destination assertion fails; the explicit wrong-route assertion confirms the rejection path. This is regression-assertion evidence, not evidence of a reproduced production misroute. The expected mapping is expressed in the test helper and should remain aligned with the existing destination contract in `src/presentation/goalHints.ts`.

## Verification and disposition

The new assertions and C runner's `Review fixes` note were read. The runner summary records `npx.cmd vitest run src/engine/phase10GoalContinuity.test.ts` passing (1 file, 3 tests); this follow-up did not rerun that command. No product-source change was needed for this finding.

**Disposition: RESOLVED; close the P2 review finding.** No remaining issue from this finding blocks Phase10-C acceptance.
