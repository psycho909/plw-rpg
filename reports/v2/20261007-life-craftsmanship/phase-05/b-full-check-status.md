# Phase5-B frozen full regression status

**FAIL** — `npm run check` exited 1 at 2026-10-07T02:22:45.332+00:00. This run used HEAD `1a56cd3eeb2ea65114a5dcf03c0e00504b69239f`. The frozen recursive `src/**` set contained 75 files, including untracked `src/data/crafting.ts`; all source SHA-256 values were unchanged before/after. HEAD and build-input manifest were also stable. The manifest SHA-256 was `3fe1adb41f3dee5eb6881e6806010ed87a5ebf45d0d6a669fea1d506d75c8d5b`.

Vitest: **18/20 files passed; 335/340 tests passed, 5 failed**. Three V1 migration tests reject input as incomplete at `src/services/saveService.ts:269`; one expected world seed 88 but received 909; the corrupt-reset test expected saveVersion 2 but received 3. Exact test names and error text are in [`b-full-check-status.json`](b-full-check-status.json).

Because `npm run check` short-circuits on Vitest failure, **typecheck and production build did not run**. The complete original command output is preserved in [`b-full-check-20261007T022236Z/stdout.log`](b-full-check-20261007T022236Z/stdout.log) and [`b-full-check-20261007T022236Z/stderr.log`](b-full-check-20261007T022236Z/stderr.log); exit code, UTC timestamps, tool versions and source/build input maps are in `b-full-check-20261007T022236Z/exit-code.txt`, `b-full-check-20261007T022236Z/source-before.json`, `b-full-check-20261007T022236Z/source-after.json`, and `b-full-check-20261007T022236Z/environment.json`.

The failure was sent to Root. I stopped without diagnosis, retry, migration execution, Monte Carlo rerun, source modification, or Git operation.
