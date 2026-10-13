# Failing regression evidence retained by Low

The failing reproduction was already captured by Low and remains unchanged at `../f-regression-run/attempt-02-reproduction/`.

- Command: `npm exec -- vitest run src/engine/remainingFamilies.integration.test.ts -t "keeps Wild and Frontier bias materials compatible with their recipe outputs and exposes planned gear in selected loot"`
- Exit 1; one selected test failed, 12 skipped.
- First failing tuple: `frontier_goblin_scrap_spear_recipe` / `frontier_goblin_scrap`; material bias `{ striking: 1 }`, recipe output `frontier_goblin_scrap_spear`, output affixes `['piercing', 'keen']`.
- Raw `targeted.stdout.txt`, `targeted.stderr.txt`, and SHA-256 evidence are preserved in that directory. No reproduction was rerun before the content correction.

This fix changes only the material's bias and its localized description in `src/data/content/frontierGoblins.ts`.
