# Clean soak low-effort monitor

Read-only monitoring of `../clean-run/`; does not control the harness, browser, game clock, or Git. The requested tool route is GPT-6 Luna with low effort; backend model telemetry is unavailable, so this records routing intent only.

The monitor checked the latest checkpoint at low frequency, reported anomalies to the root owner, and recorded 30-, 60-, and 90-minute milestones. Each published snapshot uses `scripts.recorded_reports.write_recorded`, which appends the full prior version to `playlog.jsonl`. Luna/low's last observation was the 90-minute milestone at `2026-10-04T08:53:12.166Z` (16:53 Taiwan time; elapsed 5,400.197 seconds, checkpoint 90). Luna did not monitor the final 30 minutes.

At the corrected initial monitor read (`2026-10-04T07:42:34.822+00:00`), clean-run was running for 1200.219 seconds at checkpoint 20. Game time was 48498, IndexedDB had 12005 records, pending was 0, heap was 4802880 bytes, RSS was 941744128 bytes, with zero page errors and no game warning. The console had one 404 for `/favicon.ico`; track it as an existing static-resource console error unless it changes.

## Root terminal reconciliation

The harness ended its active run at `2026-10-04T09:22:33.730Z` (17:22 Taiwan time). Root reviewed that completed evidence after resuming the session; the ending timestamp is not the root review time or a Luna/low observation. The clean-run reports 7,200.219 active seconds, 120 checkpoints, and 72,013 exported records with pending 0. Root reconciled [results](../clean-run/results.json), [profile summary](../clean-run/profile-summary.json), and [export-chain validation](../clean-run/export-chain-validation.json): final duration, build fingerprints, export hash, identity, and continuous record chain passed. See [clean-run report](../clean-run/README.md) for measurements and limits.

The separately recorded [root reconciliation](terminal-reconciliation.json) distinguishes the observed review time from the harness ending time.
