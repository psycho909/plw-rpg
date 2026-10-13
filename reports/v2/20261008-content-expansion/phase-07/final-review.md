# Phase 7-K Final Engineering Review

## Tested source and environment

- Branch `v2x/reward-core`; test-time HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`.
- Delivery source commit `b71201e84ff6b78035f8b6ef9b845dbb831451c5` contains the tested recursive `src/` fingerprint below; no source files changed during final packaging.
- Recursive src fingerprint 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58.
- Frozen production build status SHA-256 b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc; dist fingerprint 0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1.
- Chromium 151.0.7922.173, Playwright 1.62.0, Debian 13 x86_64. Native Safari and physical mobile are excluded; Firefox is unavailable.
- Browser soak, content-agent wrapper, and current-source long-world checksums were verified from their correct manifest roots.

## Gate disposition

| Gate | Status | Evidence / interpretation |
| --- | --- | --- |
| Engineering Gate | PASS WITH FINDINGS | Full repository suite: 37 files / 627 tests, typecheck, production build, seven-pack content validation, 41 Browser runner contracts, and current-source long-world simulation (11 tests) passed. Migration tests preserve V1 world fields/RNG/worldTime and round-trip; invalid fixtures are rejected. |
| Browser Stability Gate | PASS WITH FINDINGS | Two-hour Chromium lane completed 7,200.66s and one-hour lane 3,603.84s; 115 / 58 checkpoints, 23 / 11 verified reloads, zero recorded browser errors, and stable source. Launcher results remain COMPLETE_STRESS_REVIEW_REQUIRED due 496/1,646 and 247/840 no-progress action classifications. |
| Agent Exploratory Gate | PASS WITH FINDINGS | A full one-hour runner-driven heuristic interaction trace completed. It has no model inference and is not human play. Life, Adventure, and Hybrid strategies were not isolated; their route reports say NOT ESTABLISHED. |
| Human Fun Gate | DEFERRED / NOT APPLICABLE AT THIS STAGE | Current work is Development QA and does not declare this build ready for human product testing. The blank eight-question packet is ready for later use; no answer is fabricated and human testing does not block these engineering gates. |
| V2 Product Gate | NOT APPROVED | No human Fun Gate evidence exists, and automated evidence does not establish that the game is fun or ready for product acceptance. |

## Bugs and product findings

- P0: none open.
- P1: none open; the Phase 7 C01–C03 findings are fixed and regression-covered.
- P2: QA harness telemetry and destructive-reset findings are fixed and accepted after the complete Browser run. The D historical input/fingerprint gap remains a documented auditability limitation with the owner's compensating-evidence disposition. No new P2 product bug was confirmed.
- P3: wolf drop-eligibility duplication remains as maintainability debt.
- Product/evidence findings remain separate: early/mid Boss balance signal, natural Boss reachability/defeat not measured, merchant full-cycle economics incomplete, IndexedDB actual bytes/quota/compaction unmeasured, and heuristic route coverage incomplete. See bugs.md and content-findings.md.

## Known limits

Oversized controlled-combat attempts 04 and 05 are archived as lossless `combat-raw.jsonl.gz` blobs. Each sibling `combat-raw.jsonl.original.json` records the original raw filename, SHA-256, byte count, compressed-file hash, and exact restore command; each folder `SHA256SUMS` verifies the stored gzip and sidecar. Both decompressed streams were hashed and byte-counted against the original raw values before packaging. This storage representation preserves the exact JSONL bytes; it does not alter the controlled-combat evidence.

The one-hour content lane performed visible actions without state injection but followed a heuristic, not a human or model-intent plan; 247 actions were marked no-progress and it repeatedly chose Wait 1 day. These findings limit route-mastery and retention conclusions. The Browser byte metric is a bounded serialization estimate, not physical IndexedDB usage. Long-world simulation has no player encounter actions and no natural content-Boss defeat evidence. Native Safari and physical device testing were explicitly excluded. Human validation is deferred by the Development QA policy.

## Final disposition

Phase 7-K Engineering QA is complete with findings. Browser stability and long-world determinism passed for the tested source, runtime, durations, and seeds. The agent route evidence is limited and is not a substitute for human testing. No product gate is declared passed; V2 Product Gate remains NOT APPROVED pending a later explicit human-testing stage.
