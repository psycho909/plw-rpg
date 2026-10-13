# Phase 7 production Chromium harness preparation

## Result

Prepared the Phase 7 launcher, runner and telemetry support under this report directory. This is **preparation only**: no service process, Chromium process, build, or long run was started. The production regression and duration lanes remain unreleased until Root pins and releases the final source/build/content catalog.

## Entry points

- `qa_browser_launcher.py` — inert without `--go`; when released, owns a static server over the frozen `dist/` and the runner process.
- `qa_browser_runner.py --mode regression` — 60–300 second desktop/narrow-viewport Chromium UI regression; its 60-second default requires normal visible one-day progression, manual save, and exact core-state save/reload equality. Optional hash-pinned fixtures use a separate controlled context and must assert expected target labels and operations.
- `qa_browser_runner.py --mode stress --seconds 1200` — at least 20 minutes of ordinary fresh-world stress.
- `qa_browser_runner.py --mode content-agent --seconds 1800` — at least 30 minutes of content-focused, policy-driven exploration. The controller does not use LLM inference; it is not a human tester and does not establish fun or retention.
- `qa-browser-preparation/README.md` — detailed method, release manifest contract and run commands.

The launcher checks successful build evidence and compares HEAD, recursive source hashes/fingerprint, build status/hash and `dist/` hashes to Root's release manifest. It also verifies that served HTML, JavaScript and CSS bytes equal the frozen build. Before/after provenance and errors remain in unique run folders, and failed run files are not overwritten.

## Coverage policy

Normal runs use empty browser storage and visible UI only. A missing opening dialog, exact `起身` control, game-shell/name, playable map, world clock, menu, save or pause control fails. The regression visibly navigates to `旅人筆記`, advances with `等待 1 日`, confirms world time advanced, then pauses and saves with the app controls. It preserves the exact pre-reload payload in an exclusive raw file. The reloaded localStorage payload is recorded as storage-retention evidence only; after another legal pause and visible UI save, the actual runtime reserialization is compared to the baseline and gates success. Every serialized `GameState` field is compared, including RNG and world time. Only timestamp `lastSavedAt` and append-only journal sidecar metadata `playJournal` are excluded. Any runtime core-field difference fails; if UI timing prevents a valid save, report the UI semantics issue instead of treating storage equality as load proof. Long-lane and controlled fixture reloads use the same invariant.

The runner-driven Agent Exploratory heuristic observes the opening screen/world, then follows visible enabled controls across semantic action families: exploration, combat, loot/use/equip, crafting, shops, farming, crisis, ordinary world advancement, and observation. Each action stores its visible cue, selected control and reason, saved candidate content IDs, route, before/after time and result. The small heuristic adapts to available accessible controls and save shapes, rather than hard-coding IDs from the in-progress catalog. It does not inject state, RNG, seed or clock values, does not use LLM inference and is not human validation.

Optional family/boss smoke cases require hash-checked fixtures, expected visible target labels, exact operation button labels and expected visible results before and after reload. They are one-shot injected into separate new contexts and explicitly labeled `controlledFixture`; they can demonstrate targeted UI/reload behavior but never count as natural acquisition or reachability. Dynamic current Phase 7 IDs/selectors are still pending final content integration and Root's freeze, so fixture content data stays outside the runner.

Minute checkpoints include visible page/dialog state, world/history/event/journal summaries, localStorage bytes, content candidates, IndexedDB counts, interval save latency, storage errors, rejected promises, long tasks, browser/network error counts and CDP heap/DOM/performance samples. Full errors and interval browser events are append-only JSONL; status keeps counters and bounded tails. Actions and checkpoints are each written once to their own JSONL stream. Normal browser contexts are fresh and isolated; controlled fixtures remain separate. Desktop Chromium and Chromium mobile viewport emulation are in scope; native Safari and physical devices are not.

## Validation and limits

- Preparation files were statically syntax-checked with Python `py_compile`; bytecode output is directed under the owned preparation directory and removed after checking. Focused mock-contract tests cover regression reload timing, complete core-save comparisons including unchanged-storage/changed-runtime rejection, fixture expectations and bounded event telemetry (6/6 passed). Runner/launcher `--help` and the retained pre-fix counterexample were checked without starting a browser or app process.
- No browser or server was launched; browser behavior and selector coverage are therefore not yet verified.
- Environment versions observed by the task owner: Chromium 151.0.7922.173, Python 3.12.14, Playwright 1.62.0.
- Required next: Root supplies `phase7-build-status.json` and a matching `phase7-browser-release.json` after final source/content freeze, then launches the regression, ≥1200-second stress and ≥1800-second exploratory lanes. Preserve full original failures and exact durations.
- If a run exposes a core render/save/persistence defect, retain all evidence and send it to Root; this harness task does not alter product code.
