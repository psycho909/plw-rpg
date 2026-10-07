# Phase 05-J durable browser supervisor design

Disposition: **supervisor implementation and fake-child verification complete; no real browser run was launched.** The invocation that motivated this work remains interrupted/unknown and its raw evidence is preserved.

## Why this wrapper exists

`browser-runs/j-invocations/20261007T093745Z-life/j-runtime-interruption.md` records a Life invocation with no terminal result, launcher status, wrapper exit code, or wrapper end time. Runner and Chromium were zombies and their tool sessions were unavailable. The last checkpoint was at 1,271.64 seconds of an 1,800 second request. The cgroup limit was 32 GiB, observed peak 4.58 GB, and OOM counters were zero; these facts do not identify the exit cause. That report correctly classifies the invocation as interrupted/unknown.

## Supervisor behavior

- The public CLI does nothing without `--go`. With `--go`, it requires an authorized `browser-release.json` mode and enforces the launcher's existing stress, life, and hybrid duration bounds. It passes the normal launcher `--go`, mode, duration, execution model, and effort arguments. The launcher retains its full source/build fingerprint gate.
- The caller creates a unique `browser-runs/j-invocations/<id>/` record and starts the detached supervisor worker with `subprocess.Popen(start_new_session=True, stdin/stdout/stderr=DEVNULL)`, then returns immediately. The worker starts the normal launcher in its own new session and captures launcher stdout/stderr in that invocation directory. This keeps the run independent of the invoking exec session and model turn.
- `execution.json` records the exact launcher command and `wait()` exit code, launcher start/end timestamps, canonical result path/status/hash, runner exit/end fields from `launcher-status.json`, requested model/effort arguments, caller/supervisor/launcher PIDs and process groups, detached launch method, release marker values/hash, source commit, and supervisor/launcher/driver/support hashes.
- A JSONL heartbeat records launcher/runner/owned-server liveness plus checkpoint and operation-log size, mtime, and age. File freshness is telemetry; a stale checkpoint never overrides process liveness.
- The watchdog deadline is requested duration plus a 120 second grace period. On timeout, explicit stop, or supervisor shutdown signal, it signals only the separately created launcher process group. The stop command verifies the recorded PID, process group, and launcher command line. It does not search for or kill unrelated Chromium processes.
- `COMPLETE_PASS` requires launcher wait exit 0, canonical result status `PASS`, launcher status `COMPLETE`, runner and launcher exit codes 0, and stable source pins. A resultless exit, including exit code 0, is `INTERRUPTED_NO_RESULT`; watchdog and explicit stop are never pass-eligible. `--status` reconciles a dead supervisor's stale active record. If the launcher remains alive, it records `SUPERVISOR_LOST_LAUNCHER_ALIVE` and keeps the invocation non-pass-eligible; after the launcher is gone, no canonical result becomes `INTERRUPTED_NO_RESULT` with unknown launcher end/exit, while a result without an exact supervisor wait record becomes failed, never pass.

## Test-first evidence and verification

The first invocation of the new regression file was run before the supervisor module existed and failed with `ModuleNotFoundError: No module named 'phase05_browser_supervisor'`. After implementation, the focused test file passed all six cases:

- clean zero-exit PASS requires the canonical result and launcher status;
- nonzero exit with a result remains failed;
- abrupt exit without a result becomes `INTERRUPTED_NO_RESULT`;
- bounded watchdog kills the owned child group and cannot pass without a result;
- a detached worker finishes after its short-lived launching command exits;
- stale RUNNING metadata first reports a lost supervisor while the launcher remains alive, then reconciles to `INTERRUPTED_NO_RESULT` without a result once both are gone.

`py_compile` passed for the supervisor and test files. Running the supervisor CLI without `--go` printed `PREPARED ONLY` and created no invocation. No real release marker was consumed by a browser launch, no browser run was started, and no run duration or product gate is claimed.

## Independent review correction: PASS must match a complete invocation

The independent review in `j-qa-delta-independent-review.md` blocked the earlier supervisor because a synthetic `{status: PASS}` plus a minimal launcher-status object could be accepted. The reviewed preimage hashes remain archived in the phase `playlog.jsonl`: supervisor `65bc16e7471cead42f97c965a1791287786ea811db08925332e7cf981393d8cd`, tests `f898077e3cfc8bca75cd88894727aa6446bfd76f13b14edd8d03baab1a4bd02b`, and report `ba196f7ddd723c894cecd87d275c9ef4ee4efe8f88998a3700d178db307b70b`.

The new short-duration, wrong-mode/runId, wrong-result-directory, and invalid-source-pin regressions were added before the guard correction. The test-first run produced eight false-pass failures against the prior implementation. The test pass fixture now includes a complete provenance object with source/build-input/dist manifests and their fingerprints, release marker pins, matching launcher metadata, minimum duration, timestamps, and run identity.

The PASS guard now requires all of the following together:

- launcher wait exit 0, canonical status `PASS`, launcher state `COMPLETE`, and zero launcher/runner exit codes;
- result mode matching the invocation and launcher status, result runId matching launcher status, and a result path named exactly `<mode>-<runId>/<mode>-result.json`;
- requested target metadata matching the invocation while actual result duration and supervisor-observed monotonic launcher elapsed time both meet the hard mode minimum and result-declared minimum (stress 1,200 seconds; life 1,800 seconds); the result start/end timestamps must substantiate its finite duration;
- result source stability set to true, identical sourceBefore/sourceAfter equal to the frozen full invocation provenance, internally consistent source/build-input/dist manifest fingerprints, source HEAD equal to the invocation HEAD and release commit base, and helper/build/dist hashes matching the frozen release marker; launcher status provenance and release marker must match the same pins.

The resulting 12 focused supervisor tests pass. They cover clean short-mode success, complete synthetic stress/life minimum evidence at the classifier seam, short actual duration even with a long requested target, non-finite duration, wrong mode/runId/path, missing or changed source guards and source/helper pins, abrupt exit without result, watchdog isolation, detached worker durability, and stale supervisor reconciliation. Python compilation passed for both files; the CLI without `--go` remains inert. No release marker was consumed to start a browser, and no long run was launched.

## Current source hashes

```text
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_supervisor.py 7c603a12380a4e0829983effb092c4f13ae933871117aeecd69dbbec620c6657
reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_supervisor.py 6847a7f706c1ef631b9b1ac35c754d631de23d6fa3a29040419591557895c7f1
```
