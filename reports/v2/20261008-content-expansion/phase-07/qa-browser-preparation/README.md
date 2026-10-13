# Phase 7 browser QA preparation

This runbook was first captured before a production Browser was launched; that preparation status is historical. Current results and launcher provenance are in `../k-final-browser-lanes-20261013/` and the final reports when complete. The required upcoming stress duration is two hours and the content-agent duration is one hour. This file describes the runner contract; it is not itself test evidence.

## Entry points

- `python3 reports/v2/20261008-content-expansion/phase-07/qa_browser_launcher.py` — inert status only.
- `--go --mode regression` — 60–300 seconds; even the 60-second default requires visible normal opening, legal one-day progression, manual save and core-state reload equality.
- `--go --mode stress --seconds 7200` — required two-hour fresh-world stress.
- `--go --mode content-agent --seconds 3600` — required one-hour content-focused exploratory window. A 60-second run is permitted only for a short harness/browser smoke; the default and final acceptance duration remain 3600 seconds.

The visible action chooser rotates destinations by bounded per-surface label-use counts, so a single menu destination cannot monopolize a long exploratory run. It classifies life/ownership menu destinations as navigation and retains the configured stalled-control exclusions.

The runner writes an atomic turn heartbeat with the current stage. If the launcher sees no heartbeat for 120 seconds, it records the stale stage, turn, age and termination/reap result in a `FAILED_RUNNER_HEARTBEAT_TIMEOUT` launcher status, then terminates and reaps the runner process group (including Chromium descendants). The original action/checkpoint/error files remain in the run directory for diagnosis.

A content-agent smoke shorter than the first 300-second scheduled reload completes one final normal UI save/reload after its requested action window if it has not reloaded already. This uses the visible pause/save/reload path, records the reason and checkpoint, and does not inject state or run controlled fixtures. Longer lanes keep their 300-second periodic reloads and still require at least one successful reload.

The launcher checks the `RELEASED` manifest against HEAD, recursive `src/` SHA map/fingerprint, build-status hash and `dist/` fingerprint before starting its loopback static server. It checks served HTML/JS/CSS bytes against that build. The runner repeats the build and release checks. UTC+PID run directories are exclusive; existing evidence is never reused. Source, harness and build provenance are compared before and after.

The Root release record is expected at `phase7-browser-release.json` and must contain `status: RELEASED`, frozen `head`, `sourceFingerprint`, `buildStatusSha256`, and `distFingerprint`. Values must match the current source and production build. Placeholders are documented in [qa_browser_preparation.md](../qa_browser_preparation.md); they are not an active release.

## Normal fresh regression

Normal contexts begin with empty storage. The runner requires a visible game shell/name, the normal opening dialog and exact `起身` control, then verifies the playable world map, world clock, menu, save and pause controls. A missing start control or invalid/blank UI fails.

The regression visibly pauses, navigates `選單` → `旅人筆記`, clicks `等待 1 日`, and verifies persisted world time advances. It then pauses/saves through the app UI, reloads, and records the loaded localStorage snapshot as storage-retention evidence only. After visible pause and save controls are used again, the newly serialized runtime payload is compared to the baseline and gates reload success. This includes seed/RNG, time, player/characters/NPCs, inventory/equipment, crops, threat/boss forms, reward/collection, crisis and history. Only `lastSavedAt` (timestamp) and `playJournal` (append-only sidecar metadata) are excluded. A retained localStorage snapshot cannot pass if the post-load runtime save has changed core state.

Long lanes use the same visible-control save/reload invariant every five minutes. Save/reload never calls app internals or alters saved state. If legal pause/save cannot establish a stable runtime payload or the runtime differs (including world time or RNG), the run fails for investigation; no fields are ignored to make it pass. The small action controller uses visible cues and enabled controls for observation, exploration, combat, loot, use/equip, crafting, shops, farming, crisis and ordinary advancement. Each action logs visible evidence and its motivation. Normal contexts never inject seed, RNG, time or state.

## Controlled fixture lane

`qa-browser-preparation/controlled-fixtures.json` is optional and only for Root-accepted, hash-pinned fixtures. Every case must declare `expectedVisible` target/content labels, one or more operations with exact visible `buttonLabel` and `expectedVisibleAfter`, and `expectedAfterReload` labels. The fixture JSON supplies a literal `localStorageValue` and optional `storageKey`. The dedicated context verifies target content, executes each visible operation, checks the result, reloads and checks persisted UI/core save. Empty page text is insufficient. These cases are labeled `controlledFixture` and excluded from natural coverage. Fixture authoring should follow the current-source/Vite/serialize-round-trip safeguards in Phase 6 `j_fixture_generator.py`; this Phase 7 harness does not generate content against an unfinished catalog.

## Telemetry and interpretation

Minute checkpoints record visible text/dialogs, world time, history/event/journal sizes, localStorage bytes, candidate content IDs, IndexedDB per-store record counts and estimated UTF-8 JSON bounded-projection key/value bytes, CDP DOM/heap/performance metrics, save-write latency summaries and browser event/error counts. The read-only cursor visits at most 8 databases × 32 stores/database × 64 records/store per minute. Before JSON serialization, each key/value record is projected with caps of 256 nodes, depth 8, 1024 characters per text value, 4096 total text characters, and 64 properties per object/array. BigInt values are represented by a fixed marker without converting their full decimal form. Truncated sample counts are recorded; if any sampled record is truncated or serialization fails, the store total estimate is omitted. Omitted database/store counts are recorded. The estimate covers this bounded JSON projection, not full IndexedDB disk/quota bytes; cursor order may bias sampling, individual records vary, and projection/serialization adds bounded CPU/allocation cost. Full browser errors and interval save/storage/rejection/long-task events are written once to append-only JSONL streams. Actions and full checkpoints likewise have single append-only JSONL streams. Final status retains fixed counts and bounded tails instead of lifetime event arrays or duplicated checkpoints. Screenshots are hashed.

The controller is a **runner-driven Agent Exploratory heuristic** (`runner_driven_agent_heuristic_semantic_visible_control_v1`), not LLM inference or a human tester. It is useful for repeatable UI exploration, but its small label taxonomy cannot establish broad independent exploration, fun, or retention. Human validation remains deferred. Desktop Chromium and a 390×844 Chromium viewport emulation are covered; native Safari and physical phones are out of scope.

## Freeze/run constraints

- Do not use `--go` before Root release and final content/build freeze.
- Environment observed: `/usr/bin/chromium` 151.0.7922.173, Python 3.12.14, Playwright 1.62.0.
- A report-only preparation run does not prove browser behavior. Preserve full failure records and any original result; retries need new run IDs.
- If current runtime rendering or persistence fails, preserve the evidence and report it to Root. This QA scope does not patch app/source code.
