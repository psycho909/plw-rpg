# Phase 7-K Engineering Regression

## Frozen source

- Branch v2x/reward-core, test-time HEAD e05cc78f1ef452e2672df223f2febf48444dcbd3.
- Recursive src fingerprint 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58.
- Frozen build status SHA-256 b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc; dist fingerprint 0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1.

## Results

- Repository-wide npm run check passed: 37 test files / 627 tests, followed by vue-tsc --noEmit and the Vite production build (97 modules). The suite includes the V1 lifecycle, world time, NPC life, farming/gathering, economy, combat, dungeon, party/mercenary, settlement, threat, Boss, succession/death, events/history, save/load, and Phase 7 changes. Raw command output and source-stability evidence are in k-final-checks-20261013/.
- The approved seven-pack content validator passed, with 23 targeted validator tests and typecheck; evidence is k-final-content-validation-20261013/ and content-validation.md.
- Final Browser runner contracts: 41 tests passed. Python compilation, generated IndexedDB instrumentation syntax, inert launcher, help output, release-manifest parsing, and scoped diff checks passed. RED/GREEN artifacts preserve the original telemetry failure and corrected result under k-final-runner-stress-7200-20261013/npc-death-history-20261013/ and related runner evidence.
- Save migration is covered in the full suite. saveService.test.ts exercises archived V1 fixtures through the current save format, preserving legacy world fields, RNG state, and world time, then serializes and reloads the migrated state. Corrupt V1 inputs are rejected while preserving the original. rewardSave.test.ts and playJournal.test.ts cover native-V1 and journal migration/round trips. This is automated fixture coverage; no manual external save file was imported in Browser.
- Current-source long-world lane passed 1 file / 11 tests. Nine checkpoints across three seeds at 10/50/100 years all passed save/reload and one-day continuation equality; source and runner identity matched before and after. See long-world.md.
- Production Chromium regression and selector/accessibility smokes passed. The latest short UI smoke completed one ordinary save/reload with all 23 core state fields equal and zero recorded browser errors. The focused selector smoke passed 42/42 checks and the independent Spec review passed; details are in browser-regression.md and k-ui-selector-20261013/.

## Preserved non-passing attempts and limits

- The earlier interrupted 7,200-second lane at 445.56 seconds remains a harness diagnostic, not a soak result. The later full 7,200-second lane completed and is documented in browser-stress.md; its runner status remains COMPLETE_STRESS_REVIEW_REQUIRED.
- The first 1,800-second content-agent attempt repeated a generic news filter and is retained as a diagnostic. Corrected policy and browser confirmation are separately preserved.
- Earlier harness defects (destructive reset, speed restore, action classification, watchdog and bounded IndexedDB projection) retain their RED attempts and corrections in the K evidence folders; they were not removed from the record.
- The initial invalid validate:content invocation and optional favicon 404 are retained as invocation diagnostics; the corrected seven-pack validator and Browser smoke passed.
- Human testing is DEFERRED / NOT APPLICABLE AT THIS STAGE and does not block Engineering or Development QA. Browser/agent runs do not substitute for human responses.
- Native Safari and physical devices are excluded; Firefox was not installed.
