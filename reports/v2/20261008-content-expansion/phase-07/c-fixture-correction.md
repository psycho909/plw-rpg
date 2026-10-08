# Phase 7-C Test Fixture Corrections

Date: 2026-10-08 UTC
Scope: test-only corrections authorized by Root for the ordinary stale fixtures recorded in `c-fullregression-run/fullregression.json`, plus one isolated timeout allowance for the 100-year integration test. No production, core integration, or Git changes were made by these corrections.

## Changes

- `src/stores/gameStore.test.ts`: updated all three assertions for current serialized output to save version 8: the migrated V1 state, its persisted current checkpoint, and a reset-created new world. The V1 fixture input remains version 1.
- `src/services/playJournal.test.ts`: updated the V1 migration output expectation to save version 8; the legacy input remains version 1.
- `src/presentation/craftingProjection.test.ts`: retained exact assertions for the four legacy recipes and added exact IDs, zh-TW names, and unlock states for the four Slime recipes. It also confirms each Slime recipe remains inspectable with the engine-provided denial.

The recipe assertion still checks the expected four legacy plus four Slime entries; it does not relax the set to an arbitrary count or any-of assertion.

## Verification

Ran once:

`npm run test -- src/stores/gameStore.test.ts src/services/playJournal.test.ts src/presentation/craftingProjection.test.ts`

Result: exit 0; 3 test files passed; 48 tests passed. No full regression, build, or additional test run was performed for this correction. The original full-regression failure record remains in `c-fullregression-run/fullregression.json` and its adjacent raw stream artifacts.


## Isolated long-world test scheduling allowance

Root approved a `15_000ms` timeout only for the named 100-year case, `keeps a 100-year world bounded, serializable and deterministic after save`, in `src/engine/lifeIntegration.test.ts`. The original Vitest default was `5_000ms`. In isolation, the unchanged test body passed in `4.34s`; in the parallel full regression it took `5_013ms` and crossed the default by 13ms.

The test still simulates and saves/reloads the same 100-year world and retains every existing determinism and bounded-state assertion. The 10- and 50-year cases keep the default timeout. The timeout adjustment preserves the full long-world test; the runtime difference cause remains unknown and requires Phase7-J profiling: it is not a product performance-gate pass, and no product performance bug has been confirmed. No test was rerun for this edit because the simulation/assertion body was unchanged. Phase 7-J profiling of actual duration remains required.


## Slime recipe denial assertion refinement

The current `readyAtStore()` fixture has no blacksmith, and each of the four Slime recipes requires one. Tightened the projection test to assert the exact engine denial `station_unavailable` and its Traditional Chinese display message (`這項配方的工作台尚未開放。`) for every Slime recipe, while retaining the explicit `ok === false` check. This verifies the concrete denial contract rather than merely requiring a message.

No test was rerun, as requested while the full retry remains pending the core audit. The reason and message were checked against the current crafting contract; no product or fixture state changed.
