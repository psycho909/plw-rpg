# Phase 6-I long-world execution

The frozen Phase 6-I runner completed one continuous 100-year canonical world run for each seed `399889`, `400162`, and `400435`. Each year used 120 canonical days, for 12,000 days per seed. Checkpoints were emitted at years 10, 50, and 100 (1,200 / 6,000 / 12,000 days).

The run started at 2026-10-08T00:18:11Z and completed at 2026-10-08T00:18:18Z (7 seconds wall time), with exit code 0. It produced 300 annual JSONL rows and 9 checkpoint JSONL rows. At every checkpoint, saved-state reload and deterministic one-day continuation matched; unique actor IDs, finite world time, and event sequence safety all passed. Source fingerprint was `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb` both before and after, and HEAD remained `4399579ea67703f2f5ea7ac03d3f2c249ce94eef`.

| Seed | Year-100 population / living NPCs | Crisis sequence | History events | Serialized save bytes | Last outcome |
| --- | ---: | ---: | ---: | ---: | --- |
| 399889 | 79 / 79 | 23 | 788 | 323,612 | setback |
| 400162 | 80 / 80 | 22 | 780 | 321,721 | setback |
| 400435 | 80 / 80 | 23 | 818 | 378,906 | decisive success |

The output preserves annual state and 10/50/100-year checkpoint snapshots, including settlement/economy, threat and crisis state, NPC counts, history rows, event rows, save size, and identity-integrity indicators. This report records observed results only; balance findings are handled separately.

Artifacts: `i-runs/phase6-i-3x100/long-world-annual.jsonl` (300 rows), `long-world-checkpoints.jsonl` (9 rows), `long-world-progress-<seed>.json` (year-boundary recovery states), `long-world-summary.json`, runner stdout/stderr, command, timestamps, and exit code. Directory size: 1.4 MiB. The complete source manifest and before/after helper hashes are in `long-world-summary.json`.
