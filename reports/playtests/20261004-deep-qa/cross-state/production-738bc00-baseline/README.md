# 738bc00 fixed-production baseline

- Source commit: `738bc0010c549fa3fb2420437d171f5aa2a043a0`
- Source label: `738bc00 baseline without O1 recovery patch`
- URL: `http://127.0.0.1:5191/`
- Manifest: `reports/playtests/20261004-deep-qa/baseline/manifest.json`
- Manifest SHA-256: `efa756a586fc23f2f2b6712c2358d41f7a9a82cf4abe3c6b682825a52212b3cb`
- HTTP assets verified against that manifest: `index.html` `1c1b06bb8958f7a45d6c141863253922a0e50f651e36178e3956cdacf2f3927a`; `assets/index-DcqD1dRF.js` `d2ff6dccdf819cf8f4e911c16048863951ab602fa7878838f41dbe9b37f7c813`; `assets/index-B0QR5Rvd.css` `cb53c449ba9875b40c40ecfba8fd4eb473b63903a19ebb4f3dbb810dcfc65fb8`.
- Result: **10 cases passed, 0 failed; 42 checkpoints; 0 page errors.**
- UTC: `2026-10-04T02:52:48.331557+00:00` through `2026-10-04T02:53:29.280+00:00`.
- Browser: headless Playwright Chromium `/usr/bin/chromium`, `151.0.7922.173`.

Run from the repository root while the fixed server is available:

```sh
CROSS_STATE_OUTPUT=/workspace/plw-rpg/reports/playtests/20261004-deep-qa/cross-state/production-738bc00-baseline \
CROSS_STATE_URL=http://127.0.0.1:5191/ \
CROSS_STATE_MANIFEST=/workspace/plw-rpg/reports/playtests/20261004-deep-qa/baseline/manifest.json \
CROSS_STATE_SOURCE_LABEL='738bc00 baseline without O1 recovery patch' \
CROSS_STATE_MANIFEST_COMMIT=738bc0010c549fa3fb2420437d171f5aa2a043a0 \
python reports/playtests/20261004-deep-qa/cross-state/harness.py
```

The full case/checkpoint evidence, fixture definitions, source hashes, and raw state hashes are in [results.json](results.json); append-only checkpoint entries are in [playlog.jsonl](playlog.jsonl). `raw/` includes before/after `oakvale-v1` values and archive snapshots, including the intentionally conflicting rollback fixture. `artifacts/` contains the retained focus, calendar, party, and dungeon screenshots.

Current checkout source hashes for `src/App.vue`, `src/stores/gameStore.ts`, and `src/stores/gameStore.test.ts` do not match the baseline manifest because O1 was applied after this build was captured. All fetched baseline production asset hashes match the baseline manifest; see the report-root README for this source/build distinction and the one unresolved generic console 404 observation.
