# Phase3 regression — verified source snapshot

Base commit: `6568b466390d06e6be0af2585e7524b9415204b8`; Phase3 working-tree source. All 74 source SHA-256 values are recorded in full-status.json and build-status.json; final source-commit correlation follows accepted commit.

- `npm run check`: **314 tests / 20 files PASS**, followed by `vue-tsc --noEmit` and Vite production build (**78 modules PASS**). Full stdout/stderr and unique timestamped raw files are retained.
- `python3 .../phase-03/browser-run/verify_browser.py`: **20 production Chromium regression checks PASS**, zero uncaught browser exceptions. Its controlled V1 migration/property/NPC/succession fixtures are individually disclosed in browser.json; these are not normal-play elapsed time.
- `npx vitest run --config .../simulation.config.ts`: **5 tests / 3 files PASS**, 240 repeated family fights (120 unique scenarios, 12 seeds × 5 definitions × 2 policies), all three boss variants, exact midfight save/reload and same-actions deterministic states. Controlled Lv4/140HP/canonical gear fixtures are clearly labelled.
- Seeds17/909/2026: **10/50/100 game-year engine checkpoints PASS** with 500 canonically generated equipment instances, a canonically formed/fled wolf boss preserved across successors, finite data, stable IDs and exact save/reload/idempotence. At100 years saves were477187–518204 bytes; individual load measurements5.37–6.84ms on this environment are samples, not an SLA.

These commands include existing V1/V2 test files, not only new reward tests. `src` and report harnesses were stable during all three completed gates. Original Phase3 missing-module RED and fractional-companion fixture failure remain preserved in engine-worker evidence. The latter was an incorrectly configured test fixture, not a production bug.

**Completed:** fresh normal UI production Chromium stress1200.610s /41checkpoints /1425cycles /7reloads; five wolf victories, boss exact reload/flee/retrack/cooldown and gear/modal paths. Zero page/rejection/storage errors; one favicon404 preserved. Independent source, harness and final evidence reviews completed. Three report-regression tests also pass after correcting temporal endpoints and Markdown table projection. Delivery commit correlation follows in its own artifact. Human Fun Gate is DEFERRED / NOT APPLICABLE AT THIS STAGE; no Product Gate claim.

Current-stage policy: human validation is deferred during this development slice and does not block engineering QA. Earlier historical Human-PENDING records describe the prior product-test stage; no human answer or product approval is fabricated.
