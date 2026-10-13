# Phase 7 equipment function correction

- Baseline HEAD, original validator/test source hashes and snapshots, initial status, and UTC time are recorded in `original/`.
- RED: `red/` captures the sale-price-only clone test failing because `sell` was part of `equipmentSemantic`; the true combat-stat sidegrade test passed.
- Change: `equipmentSemantic` now compares slot, base attack/defense/penetration, and resolved affix effects only. IDs and localized name/description were already excluded; baseline affix IDs remain canonical when effect metadata is unavailable. This semantics now applies consistently to duplicate equipment and recipe outputs.
- GREEN: focused validator run passed 6 related tests; 17 unrelated tests skipped. Raw output, status, hashes, snapshots, timestamps, and diff are in `green/`.
- `vue-tsc` was not run as directed pending the concurrent Fog affix issue.
