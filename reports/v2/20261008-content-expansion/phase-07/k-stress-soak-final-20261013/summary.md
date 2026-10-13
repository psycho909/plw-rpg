# Browser Stress Diagnostic — Incomplete Telemetry

- Run: `20261013T150306Z-pid402337`
- Mode: real Chromium `stress`, requested 7,200 seconds; stopped at Root's request before completion.
- Start/end: `2026-10-13T15:03:06.879796+00:00` / `2026-10-13T15:10:32.438872+00:00`.
- Real duration: `445.56` seconds (7m 25.56s); wrapper exit `241`, launcher exit `-15`.
- Product source: HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3`, fingerprint `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`; source remained stable. Frozen build and release manifest were unchanged.
- Checkpoints: 7; last completed checkpoint at `379.45` seconds with `worldTime=80637`, `localStorageBytes=93908`, `eventCount=13`, `historyCount=7`, `journalPending=0`.
- Actions: 101; choice counts: `{"advance": 55, "close_dialog": 3, "combat": 4, "explore": 3, "farm": 6, "navigate": 20, "observe": 1, "start_from_opening": 1, "use_equip": 8}`.
- Normal visible UI save/reload: one completed and verified before the stop. Browser/storage/unhandled-rejection error counts at the last checkpoint were `{}`.
- The checkpoint schema omitted explicit living/dead NPC counts, settlement values, active-character gold/economy, and threat/Boss values. Those required soak metrics could not be reconstructed reliably from the available checkpoint projection.
- No `qa-browser-result.json` was produced. This run is an **incomplete harness diagnostic**, not a product failure and not a Browser Stability result. The raw run and launcher wrapper evidence are preserved in the sibling `qa-browser-runs/` directory and this folder.

Reason for stopping: complete the required checkpoint telemetry before committing two hours of runtime to an acceptance run. The next run must use a reviewed runner and a post-patch smoke.
