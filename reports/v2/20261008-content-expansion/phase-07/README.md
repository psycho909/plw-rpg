# Phase 7-K Final QA and Delivery

This package records final Development QA for Phase 7 on branch v2x/reward-core. The tested source snapshot is HEAD e05cc78f1ef452e2672df223f2febf48444dcbd3 with recursive src fingerprint 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58. The working tree held the intended Phase 7 source, tests, and QA artifacts; it was not a clean commit-pinned release. Both Browser lanes and the current-source long-world run recorded stable source identity.

## Reports

- [Baseline](baseline.md) — source identity, environment, and build provenance.
- [Engineering regression](regression.md) — full repository tests, typecheck, production build, content validation, migration coverage, and Browser smoke.
- [Browser stress](browser-stress.md) — two-hour Chromium stability soak and one-hour content-agent lane.
- [Agent Exploratory Playtest](agent-content-playtest.md) — runner-driven heuristic action trace and its limits.
- [Life route review](agent-playtest-life.md), [Adventure route review](agent-playtest-adventure.md), and [Hybrid route review](agent-playtest-hybrid.md) — route-specific evidence status.
- [Long-world simulation](long-world.md) — current-source three-seed 10/50/100-year checkpoints.
- [Performance and storage](performance.md) — heap, DOM, save, IndexedDB, and action-latency observations.
- [Fun signal audit](fun-signal-audit.md) — reward, goal, and repetition signals from automation, not human opinion.
- [Product findings](content-findings.md) and [bug register](bugs.md) — design/evidence gaps separated from confirmed defects.
- [External review handoff](external-review-handoff.md) — prepared for the Owner; external code review has not been performed.
- [Human Fun Gate packet](human-fun-gate.md) — blank eight-question and observation form.
- [Final review and gates](final-review.md) — engineering, Browser, agent, human, and product disposition.

The raw Browser runs and runner closeouts are linked from the reports. Published report revisions are appended to playlog.jsonl with scripts/recorded_reports.py.

Oversized controlled-combat attempts 04 and 05 are archived as lossless `combat-raw.jsonl.gz` blobs. Each sibling `combat-raw.jsonl.original.json` records the original raw filename, SHA-256, byte count, compressed-file hash, and exact restore command; each folder `SHA256SUMS` verifies the stored gzip and sidecar. Both decompressed streams were hashed and byte-counted against the original raw values before packaging. This storage representation preserves the exact JSONL bytes; it does not alter the controlled-combat evidence.

## Gate snapshot

- Engineering Gate: PASS WITH FINDINGS.
- Browser Stability Gate: PASS WITH FINDINGS. The 7,200-second and 3,600-second Chromium runs completed with zero recorded Browser errors and verified normal reloads; runner status remains review-required because its visible-action progress classifier found substantial repeated/no-progress actions.
- Agent Exploratory Gate: PASS WITH FINDINGS for the completed one-hour heuristic lane. Life, Adventure, and Hybrid mastery were not isolated; see the three route reports.
- Human Fun Gate: DEFERRED / NOT APPLICABLE AT THIS STAGE under the Development QA policy.
- V2 Product Gate: NOT APPROVED. No human Fun Gate answers were collected, and no product-quality conclusion is inferred from automation.

Native Safari and physical iOS/Android tests are excluded by the user's scope. Firefox is unavailable in this environment. No Phase 8/V3 work, merge, deployment, or public release is part of this package.
