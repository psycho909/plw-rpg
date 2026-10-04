# 738bc00 + O1 recovery patch fixed-production final

- Source commit: `738bc0010c549fa3fb2420437d171f5aa2a043a0`
- Source label: `738bc00 + O1 recovery patch final build`
- URL: `http://127.0.0.1:5192/`
- Manifest: `reports/playtests/20261004-deep-qa/baseline/final-manifest.json`
- Manifest SHA-256: `ba71b37f0c37e07d44d130c35602aae2210334b7704e7b4e1ce81c69cb2425ae`
- HTTP assets verified against that manifest: `index.html` `c05d86559e72706f8acfd1b979aab9cb530c0769022c3e0134c1b6a91a99b911`; `assets/index-BicP0bQ_.js` `24c25d4370be890fe10194c1b3a9d85e2bb9289a8d67bcc6757da11e3fc2c8c9`; `assets/index-B0QR5Rvd.css` `cb53c449ba9875b40c40ecfba8fd4eb473b63903a19ebb4f3dbb810dcfc65fb8`.
- Result: **10 cases passed, 0 failed; 42 checkpoints; 0 page errors.**
- UTC: `2026-10-04T02:54:27.134239+00:00` through `2026-10-04T02:55:09.285+00:00`.
- Browser: headless Playwright Chromium `/usr/bin/chromium`, `151.0.7922.173`.

Run from the repository root while the fixed server is available:

```sh
CROSS_STATE_OUTPUT=/workspace/plw-rpg/reports/playtests/20261004-deep-qa/cross-state/production-738bc00-o1-final \
CROSS_STATE_URL=http://127.0.0.1:5192/ \
CROSS_STATE_MANIFEST=/workspace/plw-rpg/reports/playtests/20261004-deep-qa/baseline/final-manifest.json \
CROSS_STATE_SOURCE_LABEL='738bc00 + O1 recovery patch final build' \
CROSS_STATE_MANIFEST_COMMIT=738bc0010c549fa3fb2420437d171f5aa2a043a0 \
python reports/playtests/20261004-deep-qa/cross-state/harness.py
```

The full case/checkpoint evidence, fixture definitions, source hashes, and raw state hashes are in [results.json](results.json); append-only checkpoint entries are in [playlog.jsonl](playlog.jsonl). `raw/` includes before/after `oakvale-v1` values and archive snapshots, including the intentionally conflicting rollback fixture. `artifacts/` contains the retained focus, calendar, party, and dungeon screenshots.

The final manifest identifies the O1 recovery patch build separately from the `738bc00` source commit. Its fixed production assets and every recorded source hash match the final manifest. The report-root README documents the browser-only coverage and generic console-error observation.
