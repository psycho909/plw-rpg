# Current-source 100-year simulation closeout

- Lane: `long`; seeds `40131`, `40132`, `40133`; Vitest result: exit 0, 1 file and 11 tests passed.
- Checkpoints: 9 total (10, 50, 100 years for each seed). Every checkpoint reports save/reload equality and one-day continuation equality.
- Exact command: `PHASE7_QA_LANE=long PHASE7_QA_SEEDS=40131,40132,40133 PHASE7_QA_OUT=reports/v2/20261008-content-expansion/phase-07/k-current-source-long-world-20261013/attempt-01 PHASE7_QA_EXPECT_COMMIT=e05cc78f1ef452e2672df223f2febf48444dcbd3 PHASE7_QA_EXPECT_FINGERPRINT=585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58 npx vitest run --config reports/v2/20261008-content-expansion/phase-07/qa_simulation.config.ts`
- Started: `2026-10-13T18:32:41.146027709Z`; ended: `2026-10-13T18:33:05.756512956Z`; process exit: 0.
- Guarded identity: HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`; source fingerprint `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`; source and runner stable in `completion.json` and external before/after snapshots.
- Runner test SHA-256: `07eab59e031fd2547a6fa9278bf05ed1244c97baa66b2c57e086f2abf016ea7f`.

| Seed | Year | Alive / total NPCs | Threat / monsters | Boss alive | Events / retained history | Save bytes | Reload equality |
|---:|---:|---:|---:|:---:|---:|---:|:---:|
| 40131 | 10 | 79 / 80 | 3 / 100.000 | yes | 150 / 207 | 258230 | true + continuation true |
| 40131 | 50 | 80 / 81 | 3 / 100.000 | yes | 150 / 1017 | 415455 | true + continuation true |
| 40131 | 100 | 78 / 79 | 3 / 90.205 | no | 150 / 1996 | 611123 | true + continuation true |
| 40132 | 10 | 79 / 80 | 3 / 91.270 | no | 150 / 199 | 245878 | true + continuation true |
| 40132 | 50 | 80 / 81 | 3 / 100.000 | yes | 150 / 980 | 372913 | true + continuation true |
| 40132 | 100 | 80 / 81 | 3 / 100.000 | yes | 150 / 1960 | 576378 | true + continuation true |
| 40133 | 10 | 79 / 80 | 3 / 85.200 | no | 150 / 222 | 310690 | true + continuation true |
| 40133 | 50 | 80 / 81 | 3 / 100.000 | yes | 150 / 1007 | 407456 | true + continuation true |
| 40133 | 100 | 80 / 81 | 3 / 100.000 | yes | 150 / 1980 | 579924 | true + continuation true |

- All nine checkpoint records show crisis phase `cooldown`; `eventCount` is 150 in each retained event projection. Checkpoint evidence is in `long-checkpoints.jsonl`.
- `naturalContentBossDefeats` is empty at all nine checkpoints, and `playerEncounterActionsSimulated` is false. This lane validates continuous world simulation/save-reload determinism; it does not evidence player encounters or natural content-boss defeats. Controlled reachability is recorded separately by the runner.
- Raw `stdout.txt`, `stderr.txt`, `manifest.json`, `completion.json`, before/after identity snapshots and timestamps are retained in this directory.
