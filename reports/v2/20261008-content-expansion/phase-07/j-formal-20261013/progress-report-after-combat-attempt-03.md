# Phase 7-J formal simulation progress after combat attempt 03

Formal-lane identity: HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`; source fingerprint `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`. The latest runner SHA for `qa_simulation.test.ts` is `2c1d7f7357c1a4759fc9f89244110deca9c5cf72d57da3641f022d4fe04be227`; the other runner file hashes match the inventory/loot manifests.

## Lane history

- **Loot, `loot-attempt-01`: PASS.** Exit 0, 2026-10-13 09:37:59.228–09:38:02.796 UTC. 100,008 awards, 4,167 for each of 24 cohorts, with 1,200 mirrored first-50 checks. Completion recorded source and runner stable. SHA256SUMS verified (manifest SHA `92b38a5af777cf0cd7afe44cc5f97bb32245d938b877879a7bdea2501ddd307a`). Loot was not rerun.
- **Combat, `combat-attempt-01`: FAIL.** The earlier runner could not find a legal recipe for its controlled crafted build. Its raw output and failure remain preserved under the attempt path.
- **Combat, `combat-attempt-02`: FAIL.** The controlled recipe expectation recorded `masterpiece: false`, while the actual result was `true` for the early-band `ironShortSword` fixture. Its raw output and failure remain preserved under the attempt path.
- **Combat, `combat-attempt-03`: FAIL.** Exit 1, 2026-10-13 09:52:43–09:52:45 UTC; Vitest reported 4 passed and 1 failed. With 100 samples per cell, it failed while creating the controlled spawn fixture for `slime_slick`, mid band, requested player level 5: `no finite legal controlled spawn witness`. Before that failure it preserved 600 combat raw records and six combat summaries. `failures.jsonl` retains the original error and stack. Completion records `laneSucceeded: false`, `sourceStable: true`, and `runnerStable: true`. This attempt's SHA256SUMS verified; manifest SHA is `595374d8ef45a61e398f86b0c26e57d802362b28f0b9a1e6c5c974c224f581ba`.

## Gate

Stopped after combat attempt 03 failed. Economy and long were not run. No product code or runner changes were made by this QA run. Each lane attempt retains its exact command, raw streams, exit code, timestamps, manifest, sample records, completion/failure record, and checksum file.
