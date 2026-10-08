# C 100-year timeout isolated reproduction

- Result: isolated pass; the original full-check timeout did not reproduce in this one focused invocation.
- Command: `npx vitest run src/engine/lifeIntegration.test.ts -t "keeps a 100-year world bounded, serializable and deterministic after save"`. Vitest: 1 passed, 10 skipped; process exit 0. Default 5,000 ms timeout unchanged.
- Timing: actual command 5.549 s (05:40:38.410–05:40:43.959 UTC / 13:40:38.410–13:40:43.959 Asia/Taipei); Vitest duration 4.91 s, test body 4.34 s. The original full run remains recorded as a 5,013 ms timeout. This single pass is close to the configured timeout and does not establish a robust margin.
- Context: Linux 6.18.44 x86_64, 5 CPUs; Node v24.19.0, npm 11.9.0, Vitest 4.1.11. Load average before `0.37 0.34 0.21`, after `0.42 0.35 0.21`.
- Scope hashes stable: `lifeIntegration.test.ts` SHA-256 `c9e702a8819e0d372aff7411f45a85ebc1e829dfc6f1e753b728863a21f56a16`; all 26 c-core source hashes matched the freeze before/after.
- Raw stdout/stderr/exit and focused before/after provenance are archived in `c-timeout-reproduction-run/` via `recorded_reports.py`. No source, timeout, or full-suite rerun changes were made.
