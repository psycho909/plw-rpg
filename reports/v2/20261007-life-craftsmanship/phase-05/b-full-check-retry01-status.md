# Phase5-B frozen full regression — retry01

**PASS** — `npm run check` ran once after the documented repair addendum and exited 0 at 2026-10-07T02:27:18.388+00:00. HEAD remained `1a56cd3eeb2ea65114a5dcf03c0e00504b69239f`. The recursively frozen `src/**` set included **75 files**, including untracked `src/data/crafting.ts`; every source SHA-256 matched before/after. The build-input manifest SHA-256 was `4c92404611800fd2c8872bc4b21f44e79b3e1f19d0c70fe89f2f3469159fb203` before and after, and the runner harness SHA-256 was `6ce5a003c98b741b3d288ce764918c4a77d9d2a23378fb9399254ca09b70fa92` before and after.

Vitest passed **20/20 files and 341/341 tests**. `vue-tsc --noEmit` and the production Vite build passed; Vite transformed 79 modules.

Full stdout/stderr are preserved in [`b-full-check-retry01-20261007T022704Z/stdout.log`](b-full-check-retry01-20261007T022704Z/stdout.log) and [`b-full-check-retry01-20261007T022704Z/stderr.log`](b-full-check-retry01-20261007T022704Z/stderr.log); the exit code, UTC timestamps, environment versions, and complete before/after source and input maps are in `b-full-check-retry01-20261007T022704Z/exit-code.txt`, `b-full-check-retry01-20261007T022704Z/environment.json`, [`b-full-check-retry01-20261007T022704Z/source-before.json`](b-full-check-retry01-20261007T022704Z/source-before.json), and [`b-full-check-retry01-20261007T022704Z/source-after.json`](b-full-check-retry01-20261007T022704Z/source-after.json).

The original B full-check FAIL report and raw logs remain unchanged. This retry followed the saved repair addendum; it did not run migration, simulations, or source/Git edits.
