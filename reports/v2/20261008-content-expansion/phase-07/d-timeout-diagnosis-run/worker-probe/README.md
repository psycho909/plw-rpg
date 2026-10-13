# Worker count timeout probe

## Scope

Sequential full-suite comparison for the 500-year continuation test in `src/services/saveService.test.ts`. No source or test files were edited for this probe. Repository HEAD at start: `fd6b5e84bef73d5dc429201c903d4a867976cd0a`.

## Initial controlled runs

| Command | UTC interval | Exit | Result |
| --- | --- | ---: | --- |
| `npm test` | 2026-10-13 01:06:19–01:06:37 | 1 | 30/31 files and 569/570 tests passed. The 500-year test ran 15,661 ms and hit its 15,000 ms test timeout. |
| `npm test -- --maxWorkers=2` | 2026-10-13 01:06:47–01:07:07 | 0 | 31/31 files and 570/570 tests passed; suite duration 18.74 s. |

Each run has separate raw stdout and stderr logs plus command, UTC timestamps, and npm exit code in its `.meta` file. The runs were sequential with no overlap.

## Verbose repeat with per-test timing

To compare the target test body time, a second sequential pair used Vitest's verbose reporter:

| Command | UTC interval | Exit | 500-year test | Suite |
| --- | --- | ---: | ---: | --- |
| `npm test -- --reporter=verbose` | 2026-10-13 01:07:55–01:08:12 | 0 | 14,938 ms | 570/570 passed |
| `npm test -- --maxWorkers=2 --reporter=verbose` | 2026-10-13 01:08:17–01:08:35 | 0 | 13,863 ms | 570/570 passed |

Both verbose runs preserved separate raw stdout/stderr and metadata. The full sorted hash maps for every file under `src/`, plus `package.json`, `package-lock.json`, `vite.config.ts`, and `vitest.config.ts` where present, are saved before and after each verbose run. Each before/after map is byte-identical. Their canonical map fingerprint is `fe237e57812978abe5532483fd92b7d3410cb61c86dfc26b3b3aa929d5b2555d`. The initial pair has the targeted source hashes below; the complete-map capture was added for the verbose pair.

## Source hashes

Hashes before and after both runs were identical:

| Source | SHA-256 |
| --- | --- |
| `src/services/saveService.test.ts` | `2a170a92ddec42dad46ce98cb3cde205f6083f98d43d5a8790346e9b2d4ddab1` |
| `src/services/saveService.ts` | `8778befac0ea57c90d2e5b0ac6a05f18cd95bcb40fbc4a4ccaaa3049935348cb` |
| `src/engine/simulation.ts` | `c0c83c8f9e6de55e09ea78fa1489015c6bcf35c066a06aa1f95daecd600ac907` |
| `src/engine/livingEvents.ts` | `aba3813377c4940ca192a6275452288c1d10b501c6aad0b693a4205c22900bec` |

The captured hash listings are `source-hashes-before.txt` and `source-hashes-after.txt`.

## Interpretation and limits

The initial default-worker run timed out, but the fresh verbose default run passed at 14,938 ms, just below its 15,000 ms limit. The limited-worker run was 1,075 ms faster in the verbose pair. This indicates the test is near its timeout threshold and is consistent with worker contention contributing to a timeout; the fresh default pass means a RED was not reliably reproduced. The evidence does not establish causality: these are single sequential pairs on one environment, with worker count, run ordering, and normal timing variation not isolated across repeated trials. No timeout was changed. A pass under `--maxWorkers=2` is not a general guarantee.
