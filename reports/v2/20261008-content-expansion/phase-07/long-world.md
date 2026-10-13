# Phase 7-K Long-World Validation — Current Source

## Provenance

- Current K test source: branch v2x/reward-core, HEAD e05cc78f1ef452e2672df223f2febf48444dcbd3, recursive src fingerprint 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58.
- Run: k-current-source-long-world-20261013/attempt-01/.
- Lane: long; seeds 40131, 40132, 40133; Vitest 1 file / 11 tests passed in 24.09 seconds.
- All nine checkpoints passed save/reload equality and one-day continued-simulation equality. The simulation recorded sourceStable=true and runnerStable=true; the expected HEAD and fingerprint guards matched.
- The earlier J run at fingerprint 6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3 was valid for J but is superseded here by the K current-source rerun.

| Seed | Year | Living / total NPCs | Threat / monster population | Boss alive | Events / retained history | Save bytes | Reload and continuation |
| ---: | ---: | ---: | ---: | :---: | ---: | ---: | :--- |
| 40131 | 10 | 79 / 80 | 3 / 100.000 | yes | 150 / 207 | 258,230 | equal / equal |
| 40131 | 50 | 80 / 81 | 3 / 100.000 | yes | 150 / 1,017 | 415,455 | equal / equal |
| 40131 | 100 | 78 / 79 | 3 / 90.205 | no | 150 / 1,996 | 611,123 | equal / equal |
| 40132 | 10 | 79 / 80 | 3 / 91.270 | no | 150 / 199 | 245,878 | equal / equal |
| 40132 | 50 | 80 / 81 | 3 / 100.000 | yes | 150 / 980 | 372,913 | equal / equal |
| 40132 | 100 | 80 / 81 | 3 / 100.000 | yes | 150 / 1,960 | 576,378 | equal / equal |
| 40133 | 10 | 79 / 80 | 3 / 85.200 | no | 150 / 222 | 310,690 | equal / equal |
| 40133 | 50 | 80 / 81 | 3 / 100.000 | yes | 150 / 1,007 | 407,456 | equal / equal |
| 40133 | 100 | 80 / 81 | 3 / 100.000 | yes | 150 / 1,980 | 579,924 | equal / equal |

Event rows reached their configured 150-row cap at all sampled checkpoints. History grew with world progression to 1,960–1,996 rows at year 100. Save size at year 100 was 576,378–611,123 bytes across these seeds. Population at sampled checkpoints was 78–80 living and 79–81 total.

At every checkpoint, naturalContentBossDefeats was empty and playerEncounterActionsSimulated was false. This is evidence for autonomous long-world stability, deterministic save/reload, and bounded event rows; it does not measure natural encounter exposure, player progression, or Boss defeat probability.

Raw manifests, before/after source and runner maps, all nine checkpoint rows, stdout/stderr, completion, and checksums are in k-current-source-long-world-20261013/attempt-01/.
