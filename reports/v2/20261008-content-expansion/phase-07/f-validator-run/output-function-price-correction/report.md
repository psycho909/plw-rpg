# Phase 7 recipe output function price correction

- Baseline HEAD: recorded in `original/head.txt`; source hashes and snapshots, initial status, UTC timestamps, and raw expected RED output are retained in `original/`.
- RED: targeted sale-price counterexample failed as expected because current consumer semantics included equipment `sell`.
- Correction: recipe consumer output semantics now reuse `equipmentSemantic` while omitting only its `sell` field. Existing uses of `equipmentSemantic` remain unchanged. The new test confirms materials with equal passives and combat output functions remain duplicate despite differing output prices and IDs.
- GREEN: `./node_modules/.bin/vitest run src/engine/contentValidation.test.ts -t 'does not distinguish material consumers by output equipment sale price'` exited 0 (1 passed, 20 skipped).
- Type check: `npx vue-tsc --noEmit` exited 2 due to TypeScript errors in concurrently added `src/engine/contentItems.integration.test.ts` (BuildingId typing, inference of recipe/influenceMaterial values, unknown properties, indexing, and possibly undefined weight). No errors were reported in validator files; the unrelated file was left untouched.
- Final snapshots, source hashes, diff, status, timestamps, and raw outputs are retained in `final/`.
- Independent review remains the root integration owner's responsibility.
