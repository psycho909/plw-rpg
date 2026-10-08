# Phase 7 C corrective full regression

- Source anchor: \`a1307d220a68213be6465bc40e0a85af8ec605a3\` (working tree includes the C corrective source and test fixtures; no new commit was created during this run).
- Command: \`npm run check\`
- Environment: Node 24.19.0, npm 11.9.0, Vitest 4.1.11, Vite 7.3.6, Debian Linux, Chromium 151 available.
- Result: PASS
- Test files: 30 passed
- Tests: 565 passed
- Test duration: 16.68s
- Build: PASS (\`vue-tsc --noEmit\` and \`vite build\`)
- Vite: 90 modules transformed; output \`dist/assets/index-CWjEHFYG.js\` 366.81 kB, gzip 127.55 kB.
- Exit code: 0
- Started: 2026-10-08 07:17:29 UTC

The earlier C full regression failure (552/557, three stale save-version assertions, one legacy recipe-count assertion, and the 100-year timeout) remains preserved in \`c-regression.md\` and \`c-fullregression-run\`. The corrective run was performed only after C1/C2/C3 fixes and the approved test-fixture updates. The 100-year case retains its full simulation and assertions with a test-local 15-second timeout; this is not a performance gate.

The C core focused report remains \`c-core-corrective-validation.md\`; independent Max review of the post-fix snapshot is still pending because the reviewer agent hit its usage limit. Browser stress, long-world simulations, remaining-family authoring, and final Phase 7 QA are not covered by this run.
