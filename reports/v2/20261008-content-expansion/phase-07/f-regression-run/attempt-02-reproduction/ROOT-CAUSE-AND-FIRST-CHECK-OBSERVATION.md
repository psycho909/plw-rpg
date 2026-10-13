# F Regression Reproduction — Root Cause Evidence

## Reproduction attempt 02

- Command: `npm exec -- vitest run src/engine/remainingFamilies.integration.test.ts -t "keeps Wild and Frontier bias materials compatible with their recipe outputs and exposes planned gear in selected loot"`
- Working directory: `/workspace/plw-rpg`
- Exit: 1; one selected test failed and 12 tests were skipped in the same file.
- Runtime: 1.377 seconds; UTC `2026-10-13T07:20:08.459+00:00` to `2026-10-13T07:20:09.836+00:00`; Taipei `2026-10-13T15:20:08.459+08:00` to `2026-10-13T15:20:09.836+08:00`.
- HEAD before/after: `e05cc78f1ef452e2672df223f2febf48444dcbd3` / same.
- Source snapshot: 107 files before and after; SHA-256 map unchanged. Full maps are `before.json` and `after.json`.
- Raw stdout/stderr: `targeted.stdout.txt` and `targeted.stderr.txt`; exact exit/timing/command are in `result.json`.

## Exact failing recipe/material/output tuple

The test visits the Wild recipes before the Frontier recipes. The first failing combination is:

- Recipe: `frontier_goblin_scrap_spear_recipe`
- Allowed bias material: `frontier_goblin_scrap`
- Material bias: `{ striking: 1 }`
- Recipe `outputBase`: `frontier_goblin_scrap_spear`
- Output equipment affixes: `['piercing', 'keen']`

At `src/engine/remainingFamilies.integration.test.ts:274`, the assertion checks whether any bias affix appears in the output equipment's `affixIds`. For this tuple, `striking` is not in `['piercing', 'keen']`, so the expression is false and conflicts with the expected true. This identifies the concrete mismatch without changing the test or product data.

## Initial `npm run check` observation

**Reconstructed excerpt only; this is not a raw log file.** The original complete stdout/stderr was not supplied for this attempt. The following is limited to the observed summary reported by the task owner:

- Command observed: `npm run check`
- Reported suite total: 605 tests; 604 passed and 1 failed.
- Reported failure: `src/engine/remainingFamilies.integration.test.ts:274`, test `keeps Wild and Frontier bias materials compatible with their recipe outputs and exposes planned gear in selected loot`; expected `true`, received `false`.

The targeted reproduction above is the raw captured execution for attempt 02. No source or content files were edited.
