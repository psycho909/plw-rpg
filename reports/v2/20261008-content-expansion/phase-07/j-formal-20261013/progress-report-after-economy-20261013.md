# Phase 7-J formal simulation progress after economy

Frozen identity for these lanes: HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`; source fingerprint `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`. Runner `qa_simulation.test.ts` SHA-256 was `335c86372668d1462dd004ec1c49d1c752d952083ac3588fe32728eba546dd03`; other runner files matched the expected identity recorded in the manifests.

## Inventory and loot

- `j-inventory-20261013/attempt-01`: passed; 6 families, 66 monsters, 48 equipment, 48 materials, 24 recipes, 11 crops, 11 crop goods, 0 affixes. The inventory contained 24 family/rank cohorts: six normal, six miniBoss, six elite, and six boss cohorts.
- `j-formal-20261013/loot-attempt-01`: passed, exit 0, 2026-10-13 09:37:59–09:38:02 UTC. 100,008 awards, exactly 4,167 per cohort; 1,200 mirrored first-50 checks. The source and runner remained stable. Its checksum manifest verified (SHA `92b38a5af777cf0cd7afe44cc5f97bb32245d938b877879a7bdea2501ddd307a`). Loot was not rerun.

## Combat witness preflight

`qa-simulation-preparation/combat-preflight-20261013-attempt-01` passed, exit 0, 2026-10-13 10:10:32.595–10:10:34.137 UTC. It recorded 198 verified witnesses: each of 66 monsters in the early, mid, and late bands. Manifest and completion match the frozen identity; source and runner were stable. SHA256SUMS verified (SHA `adea69a4f7fa1e2560bc2729cab64b01fb1af6540c73b2924b54f083443540c0`).

## Combat attempts

- **Attempt 01: FAIL.** No legal recipe was found for the controlled crafted build. Original output is preserved.
- **Attempt 02: FAIL.** The early `ironShortSword` controlled recipe expected `masterpiece: false` but received `true`. Original output is preserved.
- **Attempt 03: FAIL.** No finite legal controlled spawn witness was found for `slime_slick`, mid band, requested player level 5. Original output is preserved.
- **Attempt 04: PASS with a result-field limitation.** Exit 0, 2026-10-13 10:11:02.686–10:12:01.519 UTC (58.832 seconds). Default 100 samples completed for all 1,188 definition × band × build cells: 118,800 combat rows and 1,188 summaries. The run also captured its integrated 198-witness preflight. Controlled-fixture results totaled 74,396 wins and 44,404 deaths; these are harness outcomes, not natural encounter rates. Completion records source and runner stable. SHA256SUMS verified (SHA `c6fe68df0e82334db04800c1d0519379fe99fcb1475a9d22a2b16139e0adfe3a`).

  Root review found `remainingEnemyHp: 0` is ambiguous on death rows because `die()` clears combat state; consumers must not interpret that field as observed enemy HP for those rows. The attempt remains preserved as a complete win/death execution; this field-quality limitation is separate from the recorded `won`/`died` counts.

## Economy and gate

`j-formal-20261013/economy-attempt-01` failed with exit 1 at 2026-10-13 10:12:32.697–10:12:33.896 UTC. It raised `TypeError: Cannot read properties of undefined (reading 'slime_resin')` in `runEconomy` while seeding a controlled material input at `qa_simulation.test.ts:534`. The original stack is in `failures.jsonl`. Completion records `laneSucceeded: false`, `sourceStable: true`, and `runnerStable: true`. SHA256SUMS verified (SHA `c5665ebb77cfa94205d557e3fbbff84cf8a4db159fe57bc7138336bb576c824b`).

Stopped at the first economy failure. The long lane was not run. All prior attempts and raw failures remain intact. No product source or QA runner was edited during these runs.
