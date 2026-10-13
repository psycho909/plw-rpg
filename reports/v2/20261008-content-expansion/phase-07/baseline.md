# Phase 7-K QA Baseline — 2026-10-13 UTC

- Repository: psycho909/plw-rpg at /workspace/plw-rpg.
- Branch: v2x/reward-core.
- Test-time HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3.
- Recursive src fingerprint: 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58 across 112 files.
- The working tree contained the intended Phase 7 product, tests, tickets, runner, and QA artifacts. Results are attributed to the fingerprinted worktree, not to HEAD alone. No source, build, dist, runner, or report-archive inputs changed during either Browser lane or the current-source long-world simulation.
- Frozen production build status SHA-256: b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc.
- Dist fingerprint: 0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1.
- Environment: Debian GNU/Linux 13 x86_64, kernel 6.18.44; Node v24.19.0; npm 11.9.0; Python 3.12.14; Vite 7.3.6; Vitest 4.1.11; TypeScript/vue-tsc 5.9.3; Playwright 1.62.0.
- Browser runtime: headless Chromium 151.0.7922.173. Firefox is unavailable. Native Safari and physical iOS/Android are excluded by request.
- Full npm run check was executed at 2026-10-13 12:53:54Z–12:54:41Z on the same src fingerprint: 37 test files / 627 tests, vue-tsc, and Vite production build passed.
- Two-hour Chromium stress run: 20261013T152918Z-pid405218; requested 7,200 seconds, actual 7,200.66 seconds.
- One-hour Chromium content-agent run: 20261013T173052Z-pid410744; requested 3,600 seconds, actual 3,603.84 seconds.
- Current-source long-world lane: k-current-source-long-world-20261013/attempt-01; 3 seeds × 10/50/100 years; source and simulation runner remained stable.
- The Browser runs used a frozen production dist and verified source/build/dist maps before and after. Their exact manifests, commands, and raw outputs remain in the linked run folders.
- Human validation remains DEFERRED / NOT APPLICABLE AT THIS STAGE. The Browser heuristic is not a human tester and has no model inference.

Delivery source commit: `b71201e84ff6b78035f8b6ef9b845dbb831451c5`. Its recursive `src/` fingerprint matches the tested fingerprint above. The test HEAD remains `e05cc78f1ef452e2672df223f2febf48444dcbd3`; test results are attributed to the fingerprinted source tree, not to that HEAD alone.
