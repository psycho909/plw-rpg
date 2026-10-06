# Browser soak attempt 06

## Runtime and source

- Frozen app source: `441e3c2b435f199a50cb78ee5b19521bcc084593`
- Baseline source: `c02b600c6f5f1533374d671b707d333c86d852d7`
- Runtime URL: `http://127.0.0.1:5197`
- Immutable build: `/tmp/oakvale-v2-final-441e3c2-dist`
- Manifest: `../../build-manifest.json` (SHA-256 `eeecc773a520c4f00949926c9cfb293c0d5529ea0e5e8624e1a4827cbbf703b5`)

The frozen build and the three served assets matched the manifest before launch and during the copied preflight. The run uses the normal production app, a fresh persistent Chromium profile, normal UI actions, and the app's real timers. It injects no game clock, save state, resources, or debug controls. The attempt-06 harness is a copy of attempt 05 with only its output-directory guard and temporary-profile prefix changed; its hash is recorded in [launcher.json](launcher.json).

## Preflight

[preflight.json](preflight.json) records a passing fresh-profile Chromium check: app start and writer readiness, blocked second-tab writes, all 17 core save fields compared from read-only pre-app storage across reload, actor/equipment continuity, and journal export through the menu UI. The preflight also recorded one console error for the server's missing `/favicon.ico`; it is retained as evidence.

## Formal run

The detached runner started at `2026-10-05T19:04:08.048Z` and targets `2026-10-05T21:04:08.048Z` for 7,200 elapsed seconds. Its fresh profile is `/tmp/plw-rpg-qa-20261005-soak-attempt06-profile-p8oa_63w`; the UI created a new world with active character `alden` and selected ×20. The process is 201841. The permanent combined harness output is [harness.stdout.log](harness.stdout.log); structured results, checkpoint history, and observations are [results.json](results.json), [checkpoints.json](checkpoints.json), and [raw_profiles.jsonl](raw_profiles.jsonl) as they are produced. The harness plans 120 one-minute checkpoints, normal-UI save/reload continuity at minutes 30, 60, and 90, and a full archive export through the menu.

The launcher is [launch_attempt_06.py](launch_attempt_06.py). Its exact environment and command are recorded in [launcher.json](launcher.json). If a future isolated attempt is prepared, the one-shot invocation is:

```bash
cd /workspace/plw-rpg
python3 reports/playtests/20261004-v2-final-qa/soak/attempt-06/launch_attempt_06.py \
  --start-token 'START 441e3c2b435f199a50cb78ee5b19521bcc084593'
```

Attempt 06 completed at `2026-10-05T21:04:13.023Z`: 7,204.975 seconds and 120 checkpoints. The launcher received a post-spawn import error while writing metadata; the detached harness continued normally. The import path was fixed in the saved launcher, and the confirmed child PID, start time, runtime checks, and output paths are recorded in `launcher.json`. The full UI journal export completed: 72,068 archived unique records with contiguous ordinals 1–72,068 plus 5 unique pending records; the export checkpoint was world time 290,548 and the final running snapshot was 290,652. See canonical [`browser-soak.md`](../../browser-soak.md) for exact runtime, lifecycle, errors, coverage, and limitations.

Attempt 05 remains preserved separately; its 4,081.476-second failure is not credited toward this two-hour result. Human Fun Gate remains PENDING.
