# Browser soak attempt 05

This attempt is prepared for the frozen source `441e3c2b435f199a50cb78ee5b19521bcc084593`, served at `http://127.0.0.1:5197` from `/tmp/oakvale-v2-final-441e3c2-dist`. The formal run requires the operator's exact `START 441e3c2b435f199a50cb78ee5b19521bcc084593`; preparation and the short preflight do not start its 7,200-second clock.

The short real-Chromium preflight passed on the same manifest. It verified writer readiness, same-origin second-page exclusion without a storage write, pause/save/reload with all 17 core fields captured at `document.readyState === "loading"`, saved actor/equipment continuity, 1 minute of foreground catch-up within the measured 5.17-minute bound, and normal-UI journal export with 8 archived records. Evidence is in [preflight.json](preflight.json) and [preflight-play-records.json](preflight-play-records.json). The foreground allowance is bounded by measured reload time × 2 plus a two-minute sampling tolerance; saved and pre-app world times still match exactly.

The formal harness opens one fresh persistent Chromium profile, waits for the single writer, checks both the frozen build and served asset hashes against the manifest before UI input, uses normal UI controls throughout, records 120 one-minute checkpoints, handles mandatory dialogs, and exports the full play journal through the menu UI. A failed final export keeps the Chromium profile for recovery. Every report version is written through `scripts.recorded_reports.write_recorded`.

Run only after the exact START token arrives:

```bash
cd /workspace/plw-rpg
env \
  PLW_SOAK_URL=http://127.0.0.1:5197 \
  PLW_SOAK_BASELINE=c02b600c6f5f1533374d671b707d333c86d852d7 \
  PLW_SOAK_BUILD=/tmp/oakvale-v2-final-441e3c2-dist \
  PLW_SOAK_TARGET_SECONDS=7200 \
  PLW_SOAK_OUT=/workspace/plw-rpg/reports/playtests/20261004-v2-final-qa/soak/attempt-05 \
  PLW_SOAK_SOURCE_LABEL=441e3c2b435f199a50cb78ee5b19521bcc084593 \
  PLW_SOAK_SOURCE_STATUS='frozen post-Web-Locks source; final browser QA' \
  PLW_SOAK_MANIFEST=/workspace/plw-rpg/reports/playtests/20261004-v2-final-qa/build-manifest.json \
  python3 reports/playtests/20261004-v2-final-qa/soak/attempt-05/harness.py
```

The old source attempt 04 and its failed final export remain preserved at `../attempt-04/`; attempt 05 artifacts are separate.
