# Browser soak launcher reliability

## Why attempt 05 stopped

Attempt 05 used the frozen app source `441e3c2b435f199a50cb78ee5b19521bcc084593` and verified all three served assets against the immutable build manifest. It started at `2026-10-05T14:08:55.868Z`, targeted `2026-10-05T16:08:55.868Z`, and ended at `2026-10-05T15:16:57.105Z` after `4081.476` seconds. Its result is `failed`; it does not satisfy the two-hour acceptance requirement.

The preserved result records `BrokenPipeError: [Errno 32] Broken pipe`, 68 observations, no page errors, no unhandled rejections, no interruptions, and one startup console error for the missing `/favicon.ico`. Its final checkpoint snapshots and archived versions remain in [attempt 05](attempt-05/). No traceback was stored in the report; the prior live terminal stream was not a durable artifact. The saved evidence supports a harness stdout pipe failure after the model session disconnected, while the app diagnostics show no app error. The specific `print` call that raised cannot be established without that traceback.

The harness published each checkpoint before printing its short progress line. Attempt 05 stopped after a saved checkpoint near minute 68, so its actual elapsed time remains partial and receives no two-hour credit.

## Attempt 06 isolation and launcher

Attempt 06 uses a new copy of the same harness. Its SHA-256 is `e706da92c3cd60d8433c984ae90da135859b3d9fcc27b63c18e50b8bdf153c64`; the original attempt 05 source hash remains `a4b4f853e862d7ce4ae2479b2b8e953433b96fa90db4323f48781b62446562e0`. A diff confirms only the dedicated output-directory guard/message and unique temporary-profile prefix changed. App source, UI actions, timing, and sampling code did not change.

The launcher is [launch_attempt_06.py](attempt-06/launch_attempt_06.py). It checks the immutable build and all served asset hashes against [build-manifest.json](../build-manifest.json), requires a passing fresh-profile preflight, refuses an already-used attempt directory, and records the exact environment and command. It starts the harness with `subprocess.Popen`, `start_new_session=True`, `stdin=DEVNULL`, and both stdout and stderr redirected to the permanent file [harness.stdout.log](attempt-06/harness.stdout.log). This keeps checkpoint work independent of the model terminal stream. The harness itself still writes checkpoint, result, raw-profile, and export artifacts using `scripts.recorded_reports.write_recorded` where supported.

The post-restart preflight passed in 6.771 seconds: UI start and writer readiness, same-origin second-tab exclusion, exact comparison of all 17 core save fields before app startup after reload, saved actor/equipment continuity, and normal menu-driven play-journal export. It observed the same single `/favicon.ico` 404 console message; that diagnostic is retained in [preflight.json](attempt-06/preflight.json).

Attempt 06 started at `2026-10-05T19:04:08.048Z`, process 201841, with a fresh profile at `/tmp/plw-rpg-qa-20261005-soak-attempt06-profile-p8oa_63w`. It targets `2026-10-05T21:04:08.048Z`. The start checkpoint records a newly created world, active character `alden`, and ×20 selected in the UI. At launch verification, the detached process had emitted `SOAK_START` and its first checkpoint. The latest live status belongs in [attempt-06/checkpoints.json](attempt-06/checkpoints.json); final acceptance depends on the full 7,200 seconds, 120 checkpoints, reloads at minutes 30/60/90, and successful full archive export.

The runner wrapper initially failed only after the child had started, because its post-spawn import of `scripts.recorded_reports` lacked the repository root on `sys.path`. The child was confirmed detached and continued writing its permanent log and checkpoints. I fixed the launcher import path and recovered the launch metadata in [launcher.json](attempt-06/launcher.json); the exact wrapper PID was unavailable and is left unknown. The attempt lock remains in place, and attempt 06 must not be launched again.
