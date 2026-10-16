# Phase9-C Summary — Gameplay Interaction Polish

- Branch / base HEAD: `v2x/reward-core` / `4afc604` (dispatch baseline confirmed).

## Changes

- `src/presentation/craftingProjection.ts` adds a registry-backed origin projection distinguishing authored content materials, legacy wolf-family materials, and registered crop goods.
- `src/presentation/craftingProjection.test.ts` covers `wolfFang`, `slime_resin`, and `spring_pea_good` origin classification.
- `src/components/InventoryWindow.vue` shows those origins in collected material rows and clarifies that the generic monster-drop supply item is separate from recipe materials and harvest goods.
- `scripts/phase9/c-probe.mjs` is a focused CDP probe for material/source/recipe linkage, missing-input context, and the existing post-craft focused compare path. It uses elementFromPoint-verified clicks, a labeled controlled checkpoint, and attempt-local Chrome-profile size capture/cleanup.
- `docs/UI.md`, `phase-09/life-crafting-ux.md`, `adventure-ux.md`, and `world-feedback.md` document ownership, findings, evidence and the no-change history/crisis observation.

## Findings and scope

- Legacy wolf materials and authored registry materials have different data roles: `wolfFang` / `wolfHide` / `moonStone` are old recipe influence materials, while registered content materials such as `slime_resin` can be recipe inputs. `contentKnowledgeCatalog` already supplies discovered source and recipe-use information; this change reuses it and adds only a visible origin label.
- The workbench already shows required/held quantities and known sources for missing registered inputs, using the same knowledge projection. The crafted-item success state already opens Inventory focused on the new gear for comparison, where existing equip/sell paths remain available. No additional switch or duplicate rule was needed.
- The A1 crisis-contribution and world-history evidence showed the recorded outcomes; no C-scope change was warranted there. Human comprehension remains unmeasured.
- No engine rule, balance/config number, save schema, or second collection database changed. No commit or push was made.

## Verification

- `node --check scripts/phase9/c-probe.mjs` — PASS.
- `npx.cmd vitest run src/presentation/craftingProjection.test.ts` — **9/9 PASS**.
- `npm.cmd run build` - PASS, Lead execution; dist current for probe.
- `npm.cmd run check` - PASS, Lead execution: 39 files / 642 tests (`c-runner/npm-run-check-c.log`).
- `node scripts/phase9/c-probe.mjs` - PASS at [`attempt-20261016T003828476Z`](attempt-20261016T003828476Z/probe-results.json).

## Final verification and probe recovery

This section supersedes the earlier pending verification bullets above. Lead reports `npm.cmd run build` PASS and `npm.cmd run check` PASS (39 files / 642 tests; `c-runner/npm-run-check-c.log`). The focused `npx.cmd vitest run src/presentation/craftingProjection.test.ts` previously passed 9/9. Latest `node --check scripts/phase9/c-probe.mjs` PASS. I ran `node scripts/phase9/c-probe.mjs`: PASS at [`attempt-20261016T003828476Z`](attempt-20261016T003828476Z/probe-results.json), with missing-material workbench/source, material-origin/generic-drop, and post-craft comparison evidence. Chrome profile size was 15,763,123 bytes before cleanup; the attempt-local profile was removed.

Retained failures: initial dist bundle glob failure; `attempt-20261015T100214719Z` state timeout; `attempt-20261015T100437834Z` invalid controlled save; `attempt-20261016T003559159Z` Vite transport timeout / cleanup lock; `attempt-20261016T003705190Z` and `attempt-20261016T003752018Z` store locator assumptions. The fixture now validates through game `deserialize`; store opening follows the audit runner's tile then context-interact flow (which opens the workbench directly). Chrome closes through CDP before its attempt-local profile is removed.

## Review fixes

- P3 material search now indexes the same displayed Chinese origin label as the Inventory row through shared `projectMaterialOriginLabel` and `projectMaterialSearchIndex` projections. The focused test asserts that a query using the displayed registered-material label matches the material search index.
- P3 replaced the superseded adventure-ux pending statement with completed-probe wording. The final evidence remains `attempt-20261016T003828476Z`.
- Verification: `npx.cmd vitest run src/presentation/craftingProjection.test.ts` PASS, 10/10 tests.
