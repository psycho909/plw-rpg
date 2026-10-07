# Phase 4 final-runtime independent review

## Disposition

**Static review accepted for the frozen final driver at SHA-256 `8412261b32ce1b1cb02a509b820d50916f90b701b1e6ded5f29f90e3dbda6555`.** The browser report-path fix and the Adventure decision-evidence guard are correct. The previously identified P2 false-pass finding is closed by this delta. One non-blocking P3 test-coverage note remains below.

This is a runner/code review, not a final runtime pass. The only recorded final-driver run stopped at targeted-browser under older driver SHA `ab97b1afdf0868280160e272661e8afab9fd377ad5ef19f403837d3f2d25cb06`. It failed because the consumer looked for `phase-04/browser.json` while the helper published `phase-04/archive/browser.json`. The frozen driver corrects that route. No run of SHA `8412261b...` has produced stress or adventure evidence yet.

## Scope and snapshot

- Authority: Phase 4 ticket `tickets/20261006-v2x-04-adventure-loop.md`, spec `docs/specs/V2X-PHASE4-ADVENTURE-REWARD.md`, phase README, root `AGENTS.md` / `README.md`, and `docs/agents/review.md` / `skill-workflows.md`.
- Baseline HEAD: `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`. The review covered the archived QA driver/helpers, their report contracts, and the recorded build/simulation/browser/runtime outputs. No source or Git changes were made.
- Reviewer: `g6-luna-max-phase4-deep-reviewer`, requested GPT-6 Luna Max; runtime model telemetry unavailable; did not implement the reviewed code.
- The frozen driver SHA above and all reviewed helper hashes are listed at the end of this report.

## Standards

Current producer and consumer paths agree. `verify_browser.py`, stress, and adventure publish the expected filenames under their archive directory. The driver reads targeted output from `BROWSER_REPORT_DIR / "browser.json"` and records long-run paths under the same directory. The parser accepts the actual targeted report's `source_sha256` field and checks it against the source snapshot and helper hash.

The driver consistently propagates port 5214 through its URL, HTTP Host check, listener query, server command, and `PLW_V2_URL` for all browser helpers. It refuses to signal unknown listeners; the old 5202 listener and PID 4506 remain untouched. Cleanup signals only the driver-owned server process and waits for it.

The browser helpers use fresh Playwright contexts and the visible “起身” flow. They verify level 1, 45 gold, and no starting gear; storage instrumentation observes calls while forwarding the original Storage receiver and arguments. Stress enforces at least 1,200 monotonic seconds, 100 gear/modal cycles, and three reloads. Adventure enforces at least 1,800 monotonic seconds and records decisions from the visible goal, combat cue, owned items, and UI comparison. Gear pagination maps the active character's saved-item order to the UI's owner-filtered 20-item slices; no selector or slot-mapping defect was found.

**P3, non-blocking — the report-path unit test does not exercise the long-run consumer call site.** `archive/test_final_runtime_driver_helper_reports.py:41-54` verifies helper publication names and constructs expected paths from `BROWSER_REPORT_DIR`, but does not assert the paths returned by `run_parallel_long_tests`. A regression from the current correct `final-runtime-driver.py:811` back to the phase-root paths could pass that test. This does not block the current runtime attempt because the frozen consumer lines were checked directly and match all three producers.

## Spec

The final Adventure consumer now calls `validate_adventure_decision_log` before accepting a long-run result. The validator rejects missing/empty logs, non-object entries, and entries without nonblank string `wanted`, `why`, and `decision` fields. This closes the P2 gap against spec §44, which requires the exploratory playtest to record what the agent wanted next, why, and how reward affected behavior. Three focused pure tests cover missing/empty logs, malformed records, and a valid record. The author reports those three new tests plus six existing tests passed; I inspected the tests but did not rerun them.

The full report consumer also requires a passing helper status and the explicit duration completion flag and duration threshold. The stress consumer requires status PASS, duration at least 1,200 seconds, and at least 100 gear/modal cycles. Both paths validate the report source map and helper hash. Runtime helper code records errors, state, storage, and source/helper/build fingerprints at the run endpoints; actual long-run report contents remain unverified until the frozen driver runs.

## Recorded evidence and limits

The current recorded artifacts are internally consistent for the phases they cover:

- `build-status.json`: `npm run check` exit 0; HEAD remains the baseline; all 74 source files match, with source fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`.
- `final-simulation-status.json`: PASS; 100,000 awards, 4,320 expected combat rows, 8,640 actual fight runs, and eight seeds. Its source map and commit match the build record.
- `archive/browser.json`: PASS; 20 checks, zero errors. Its 74-file source map, commit, helper hash, and build-status file hash match the recorded build and current targeted helper.
- `final-runtime-status.json`: FAILED at 2026-10-06 13:01:36 UTC under old driver SHA `ab97b1af...`, after check/build, sanity, full simulation, and targeted browser command all exited 0. Failure was only the old report-path miss. Stress and adventure did not start. The raw status and logs remain preserved; this report does not overwrite that history.
- No `archive/stress-browser.json` or `archive/adventure-agent-playtest.json` exists from the frozen driver at this review snapshot.

I inspected code and artifact fields read-only. I did not rerun tests, build, simulation, browser, stress, adventure, or full QA. The recorded check/build/simulation/targeted-browser results are evidence for those earlier stages only; they do not establish a pass for the 20-minute stress, 30-minute adventure playtest, or final runtime driver.

## Reviewed hashes

```text
archive/final-runtime-driver.py 8412261b32ce1b1cb02a509b820d50916f90b701b1e6ded5f29f90e3dbda6555
archive/verify_browser.py cb872c53961200a507405010f69e4eaca2e77f3c364595513f80b69fbe4209e8
archive/phase04_stress_browser.py 3970a59c0789d02efe58cfd8faf3e8a4b79d7adcd012310315e15aa6bd587f8c
archive/phase04_adventure_playtest.py 7278814b4ccc8ff1e2ac00d173e71400c6d27ff5ec33d5938d701cfd38bc4a6e
archive/adventure_policy.py 928b3e105b921b5bb96aefca3e02069dee4f406f8c2ea58d9ebabc5e5c849704
archive/runner_paths.py 8b823117dab98c4dad35f7da12f236cd6d06c6fd05b10bf8635cca5d54486491
archive/test_final_runtime_driver_helper_reports.py b53c3d208d9e281ee833c60459ba1184310b6b44d046b076bf5e9734a060d777
archive/test_final_runtime_driver_decision_log.py ae8e17485a2b069a516cbf4e32f106a4b6fa34feceedaa074b3892dc55345bb0
archive/test_final_runtime_driver_validation.py 3e11c7e11643c20000cc2b9c7ced304406d59ecc224612281b5e887732827113
build-status.json 3291459be69589b5b1e85db539c1218717fc7242fde397ac1fe99db863fb4986
final-simulation-status.json c267345e6b63c386da9509096b6dbdc53a3847476c26c2cb858034aee6b6510c
archive/browser.json 3148865f5ad8a44e1b4b899ba83b8b83a5027a0e930b707a7c0e01f40861b80b
final-runtime-status.json fc823abeb2e96bb63612c90e6aa9178c3d6cb32baf7639c3d7540086f94c159b
```
