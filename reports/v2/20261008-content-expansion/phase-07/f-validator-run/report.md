# Phase 7 validator material consumer run

- HEAD at baseline capture: `e05cc78f1ef452e2672df223f2febf48444dcbd3`.
- TDD RED: `./node_modules/.bin/vitest run src/engine/contentValidation.test.ts` exited 1; 18 passed, 2 expected new assertions failed. Raw stdout/stderr, exit code, UTC timestamps, source snapshots/hashes, and initial `git status --short` are retained in `original/`.
- TDD GREEN: same targeted command exited 0; 20 passed. `npx vue-tsc --noEmit` exited 0. Raw outputs, exit codes, UTC timestamps, final source snapshots/hashes, and final `git status --short` are retained in `final/`.
- Implementation adds the set of semantic output functions of validated authored recipes that consume each material as a required material input. Duplicate recipe IDs/functions collapse; invalid recipe/output definitions earn no consumer function. Existing material economy/passive comparison remains intact.
- Files changed by this work: `src/engine/contentValidation.ts`, `src/engine/contentValidation.test.ts`. Concurrent authoring changes were present in data modules and remain untouched.
- Independent review remains pending.
