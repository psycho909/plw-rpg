# Economy owner material stack fixture correction

The preserved formal economy-attempt-01 failed before calling `planCraft`: a fresh controlled state had no `reward.materials[ownerId]` stack, and the fixture dereferenced it while seeding `slime_resin`. The runner now initializes only that missing owner stack before seeding each recipe's material inputs.

The preparation economy lane ran in `economy-prep-attempt-01/`, not as formal attempt-02. It completed all 24 recipe fixtures with 24 raw craft rows, one summary row, `laneSucceeded: true`, `sourceStable: true`, and `runnerStable: true`. Original attempt-01 remains unchanged and its SHA256SUMS verified.

Runner TypeScript check and focused owner-stack/configuration tests passed. Source fingerprint remained frozen at `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`.
