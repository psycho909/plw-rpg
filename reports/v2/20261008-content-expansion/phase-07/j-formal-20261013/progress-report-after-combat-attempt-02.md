# Phase 7-J formal simulation progress

Frozen identity used for formal lanes: HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`; source fingerprint `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`. The updated runner file hash before the combat attempt was `1a19fcfd13412b2393b210327aef10d81a6989188038524e330514093e3ee469`.

## Loot

`loot-attempt-01` passed with exit 0 at 2026-10-13 09:37:59.228–09:38:02.796 UTC. It recorded 100,008 awards, evenly assigned as 4,167 to each of the 24 family/rank cohorts, and 1,200 mirrored first-50 checks. Raw awards occupy 42,607,096 bytes. Completion recorded source and runner stability. The run's `SHA256SUMS` verifies; its SHA-256 is `92b38a5af777cf0cd7afe44cc5f97bb32245d938b877879a7bdea2501ddd307a`.

The earlier failed `combat-attempt-01` is retained unchanged and is not treated as a passing run.

## Combat attempt 02

The new run used default 100 samples per definition × band × build cell. It failed with exit 1 at 2026-10-13 09:49:03.290–09:49:04.821 UTC. The captured Vitest output reports 3 passed and 1 failed tests. The failure was a fixture expectation mismatch in `runCombat` at `qa_simulation.test.ts:331`: expected `controlledRecipe.masterpiece: false`, received `true` (early band, recipe `ironShortSword`, smithing gate 6, chance 0.25). The run preserved 502 `combat-raw` records and five `combat-summary` records before failure. `failures.jsonl` contains the original error and stack. Completion recorded `laneSucceeded: false`, `sourceStable: true`, and `runnerStable: true`.

`combat-attempt-02/SHA256SUMS` verifies; its SHA-256 is `bd8cc756402d21bae62452cf9e0806bb5a86765ad70a5097cb2775e72a53d324`.

## Gate

Stopped after the combat failure as instructed. Economy and long lanes were not run. Loot was not rerun. All output paths retain their exact command, raw stdout/stderr, exit code, timestamps, manifest, raw samples, completion/failure records, and per-attempt checksums. No source or runner files were edited by this QA run.
