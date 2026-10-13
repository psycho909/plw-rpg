# Combat fixture context preflight

The preparation-only `combat-preflight` lane checked all 66 monsters across early, mid, and late bands: 198/198 finite public witnesses. `sourceStable` and `runnerStable` are true. The required product-source fingerprint matched: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`.

Each row now records `baselineContext`, `effectiveContext`, and a reason for every changed field among region, player level, threat, settlement stage, safety, and world time. Time adjustments name the season and hour constraints. For example, `slime_amber/mid` moved from requested level 5 to 4 and from default spring 08:00 (`worldTime=480`) to summer 08:00 (`worldTime=43680`) for the authored summer/fall and 08–18 predicates. Even `slime_slick` moves from default 08:00 to 06:00 because its legal window starts at 06:00.

Verification: 5 focused tests passed; TypeScript check and `git diff --check` passed. Only the witness preflight lane ran; no full combat, economy, or long lane ran.

`SHA256SUMS` covers every other file in this directory. The checksum file does not include its own digest.
