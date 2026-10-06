# Adventure final-source browser-agent playtest

This directory contains the dedicated fresh-profile exploratory run against the frozen Oakvale production build. The driver is `interactive.py`; all gameplay controls use visible browser UI and the run starts only after an exact source-SHA gate. It auto-publishes `run-01/results.json` through `scripts.recorded_reports.write_recorded` and appends every version to `run-01/playlog.jsonl`.

## Run identity

- Source SHA: `441e3c2b435f199a50cb78ee5b19521bcc084593`
- Production URL: `http://127.0.0.1:5197`
- Canonical public seed: 17 (`../seeds/seed-17.json`)
- Browser: Chromium 151 via Playwright; isolated profile `/tmp/plw-v2-final-adventure-profile-source-final-02`
- CDP port: 9261
- Start: 2026-10-05 13:56:40.485 UTC; completion: `run-01/results.json`
- This is an exploratory Browser Agent run, not a human playtest. No state/time/resource injection was used.

## Reproduction

From the repository root, launch the driver in a PTY:

```sh
python3 -B reports/playtests/20261004-v2-final-qa/adventure-final/interactive.py
```

The harness verifies the production fingerprint and seed, pauses the loaded world for preflight, then waits for the exact line `START 441e3c2b435f199a50cb78ee5b19521bcc084593`. Once started, use the command list printed by the harness and record player motivation with `decision <reason>` at goal changes. Do not reuse this persistent browser profile for a separate run; use a fresh profile/CDP port and update the run identity before another session.

## Artifacts

- `run-01/results.json`: final driver status, observations, player decisions, errors and raw formal elapsed time.
- `run-01/playlog.jsonl`: append-only versions of the readable result.
- `run-01/final-core-readonly.json`: frozen full-state read-only checkpoint, identity/reputation and initial/final NPC samples.
- `../agent-playtest-adventure.md`: findings and 10–15 minute signal matrix.

At completion the driver reported 4,149.63 raw seconds. Independent direct-UTC review corrects conservative credit to 3,745.531 active observed seconds after subtracting eight merged harness-error intervals (143.229s) and a 67.9s explicitly unobserved post-boss review interval; the paused reporting period after the final directly timestamped 3,956.660s checkpoint is not credited. The requirement of 3,600 active observed seconds is met. The prior 3,745.791s claim used a later untraced runner clock (3,956.92s) and is superseded; its original versions and all traces remain in the results archive.
