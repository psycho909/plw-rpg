# Default time preference regression

The harness now tests the baseline spring 08:00 first. If both family and monster profile time predicates accept it, the fixture keeps 08:00. If not, it searches the finite annual hour sequence and records the actual season/hour constraint in the adjustment reason.

Red-first evidence is in `../combat-witness-time-preference-red-20261013/`: the new `slime_slick` contract failed against the previous helper because it received worldTime 360 instead of 480. After the change, 6 focused fixture tests passed. The retained `slime_amber/mid` contract confirms spring 08:00 is rejected and the selected summer 08:00 (`worldTime=43680`) satisfies the authored summer/fall, hour 8–18 predicates.

The source-guarded preparation-only `combat-preflight` checked 198/198 monster × band witnesses through public `contentEncounterOptions`. `laneSucceeded`, `sourceStable`, and `runnerStable` are true; the required frozen source fingerprint is `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`. TypeScript and `git diff --check` passed. No full combat, economy, or long lane ran.

`SHA256SUMS` covers every other file in this directory, excluding the checksum file itself.
