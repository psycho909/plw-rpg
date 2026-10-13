# Combat fixture witness preflight

The preparation-only `combat-preflight` lane checked all 66 monster definitions across early, mid, and late bands: 198/198 finite witnesses. Each witness was built from the shared family and monster spawn-profile predicates, then confirmed with public `contentEncounterOptions`. The lane completed with `laneSucceeded=true`, `sourceStable=true`, and `runnerStable=true`.

The frozen product source fingerprint matched the required value: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`.

`slime_slick/mid` requested level 5 and resolved to level 3 in farmland, threat 1, village, safety 60, at world time 360. The focused regression then verified `encounterContentMonster` starts the encounter through the public action.

Focused fixture verification: 4 passed. TypeScript check (`npx tsc --noEmit -p reports/v2/20261008-content-expansion/phase-07/qa_simulation.tsconfig.json`) and `git diff --check` passed. No combat, economy, or long lane was run.

SHA-256:

- `combat-witness-preflight.jsonl`: `a2d8c2b305a81365621e4d2a59c1e699c777a1c48405093b0f76cac466f29777`
- `manifest.json`: `02cf9e04c8c5755d436509a17067a12deb18b78c14e6b1a89510113cf1c0015f`
- red reproduction `attempt-03-failure.jsonl`: `8f1805ea51bfc8408a49b2900f8d59afb836edd05afb32b6e78ef5e2156c12e5`
