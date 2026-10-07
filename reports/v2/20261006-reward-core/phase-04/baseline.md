# Phase4 Environment Baseline

Captured: 2026-10-06T11:22:55.997776408Z (UTC). Scope: Phase4 only. Environment, checkout and complete `src/` SHA256 map are recorded in [baseline.json](baseline.json). Specification SHA256: `9e5cced00eb8db215f27e88fc7494db6efc3d0c69d918039d897aa28666f0a25`.

## Checkout and tools

- Branch `v2x/reward-core`, HEAD/base `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`.
- Working tree at capture contains the expected Phase4 ticket, spec, reports directory and TODO index modification; see `workingTree` in `baseline.json`.
- OS `Linux-6.18.44-x86_64-with-glibc2.41` (x86_64); Node `v24.19.0`, npm `11.9.0`, Python `3.12.14`.
- Vue 3.5.43, Vite 7.3.6, Vitest 4.1.11, TypeScript 5.9.3, vue-tsc 3.3.12.
- Browser available: Chromium 151.0.7922.173 built on Debian GNU/Linux 13 (trixie).

## Existing Phase4 check evidence

Reused this round's `phase-04/check-status.json` (SHA256 `fa2d4f0a0b001b9a1f56c278ba1d0f1e09126d7cf36fceea4a16953421b98fc3`), command `npm run check`, start 2026-10-06T08:11:28.728901+00:00, end 2026-10-06T08:11:44.393561+00:00, exit 0. Its logs report 314 tests in 20 files passed and a successful production build transforming 78 modules. Source and harness were recorded stable during that run; all 74 current `src/` files match its recorded fingerprints. Raw stdout and stderr remain at the paths in `check-status.json`.

This is prior current-round evidence, not a rerun by this QA assignment. No browser run, stress run, or loot/combat baseline has been performed as part of this environment capture; those remain pending Root's runner command.
