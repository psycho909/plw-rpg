# Phase 5 browser driver handoff

Status: prepared only. No production build or browser execution is claimed by these new drivers. Earlier C pilot failures and the accepted C pass remain in their original unique reports; this handoff does not relabel them.

## New files

- `phase05_browser_support.py` — recursive source/build/dist fingerprints, HTTP byte verification, pre-app save/storage instrumentation, bounded JSONL and recorded projection helpers.
- `phase05_browser_launcher.py` — inert-by-default runner launcher; starts an owned loopback server only after Root's release marker and matching build evidence pass.
- `phase05_browser_driver.py` — separate `stress`, `life`, and `hybrid-short` normal-UI run modes. Each launcher invocation creates a new isolated Chromium context and unique run directory.
- `test_phase05_browser_support.py` — three helper-only provenance/asset smoke tests; it does not import or exercise production code.
- `test_phase05_browser_driver.py` — three focused checks for first/second Life notes and hybrid completion/blocker disposition, using a fake page (no browser).
- `browser-driver-life-note-red.json`, `browser-driver-hybrid-combat-red.json`, `browser-driver-cdp-compat-red.json`, and `browser-driver-gather-red.json` — preserved pre-fix failures/hashes and minimal reproductions. `browser-driver-regressions-green.json`, `browser-driver-cdp-compat-green.json`, and `browser-driver-gather-green.json` record focused green evidence. Reports are archived through `write_recorded`.

These files do not modify the C pilot, product source, build output, or Git state.

## Release contract

Root creates `browser-release.json` only for the currently frozen source/build and the mode that has reached its release gate. The launcher and child driver both require this contract:

```json
{
  "authorized": true,
  "authorizedModes": ["hybrid-short"],
  "sourceFingerprint": "<current recursive src/ fingerprint>",
  "buildStatusSha256": "<current build-status.json SHA-256>",
  "distFingerprint": "<current recursive dist/ fingerprint>",
  "qaFilesSha256": {
    "reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_launcher.py": "<SHA-256>",
    "reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py": "<SHA-256>",
    "reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_support.py": "<SHA-256>"
  }
}
```

`hybrid-short` is H: Root may authorize it after G is frozen and a fresh matching build is recorded, before I. It runs the legal guaranteed-wolf-material → targeted craft → equip → return-to-combat pilot in its own fresh save and has no arbitrary minimum duration. The final J integrated stress and Life Agent run require their later release after I and review; they use separate fresh saves, with stress at least 1,200 seconds and Life at least 1,800 seconds. The release marker can authorize modes independently.

## Invocation after release

```bash
python reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_launcher.py --mode hybrid-short --go --execution-model "GPT-6 Luna" --execution-effort low
python reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_launcher.py --mode stress --seconds 1200 --go --execution-model "GPT-6 Luna" --execution-effort low
python reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_launcher.py --mode life --seconds 1800 --go --execution-model "GPT-6 Luna" --execution-effort low
```

The launcher arguments record the requested runner model and effort (`GPT-6 Luna` / `low` in these examples); they do not attest the actual backend runtime, so `backendRuntimeVerified` remains false. `policyExecution` labels the controller as deterministic runner-driven, with no model inference; it adapts from visible UI plans and read-only state telemetry. The requested model is execution attribution, not per-action LLM control. Requested model attribution does not imply per-action LLM control. Driver authorship is recorded separately as GPT-6 Luna / medium. Root may pass the exact model string used for the authorized Luna Low runner.

## Evidence and policy

Before browser start, the driver requires a successful build status matching the full recursive `src/` map (tracked and untracked), named build inputs/config, and the full `dist/` asset map. Current harness pins after the timed-note and mode-disposition fixes are: launcher `84c7f4429196180787be2de52b6cf05817078e41faac984813c6472125823297`, driver `8a64c37bc58ff60f7db4623e9ed3b3c5e55e3c01cac16bd9377c6eaf0bdbf68b`, support `8572bdf613f7840d5818e7ec0de844c3f4501ce70fe66df71986c0a1e1f6572c`. Root must use current matching hashes in the release marker; any further file change requires recomputing them. The launcher verifies the loopback index and every referenced JS/CSS asset against both `dist/` bytes and build evidence. Both launcher and driver fingerprint HEAD, all current source/build/dist files, build status, all three QA files, and `scripts/recorded_reports.py` before and after a run.

The browser uses a fresh isolated context and validates the pre-app local-storage guard before normal opening-save creation. CDP profile collection feature-detects `Performance.enable`, `Memory.getDOMCounters`, `Runtime.getHeapUsage`, and `Performance.getMetrics`; it does not call Chromium 151’s unsupported `Memory.enable`. Unsupported metrics are recorded as `profilingLimitations` and do not fail the QA run; browser/page/request/storage errors remain fatal. Runtime heap data falls back to JavaScript heap metrics from Performance when available. Game mutations use visible controls and normal native save/reload. State reads are telemetry only. A real Escape or visible close X closes native dialogs before the top-level save button is reacquired. The desktop run uses viewport 1280×900 and checks the accessible inventory name `物品 I`.

Raw meaningful operations, Life notes, and 60-second bounded checkpoints append to per-run JSONL. A compact result and launcher status publish through `scripts.recorded_reports.write_recorded` once per state projection. The control file supports `{"stop": true}` and a `focus` value (`balanced`, `preserve_rare`, or `material_value`); changing focus only changes the normal UI agent's recipe/material policy. Browser errors, failed requests, unhandled rejections, storage write errors, cleanup failures, source drift, and reload invariant changes prevent a clean PASS.

The Life policy inspects recipe and material controls from the live registry, records neutral and currently available influence-option planner results, uses visible input shortages to choose lawful gathering goals, favors unlocked/ready recipes with fewer prior crafts, and preserves one-off rare materials unless focused on material value. It uses the current native button hooks (`button[data-craft-recipe]`, `[data-crafting-material]`, and `button[data-craft-submit]`) and records visible planner text, including the selected station, hours, fee, materials, skill, and denial. Recipe and material availability remain registry-driven; the runner does not hard-code the recipe catalogue. Where G’s public plan resolves a nearby owned home as the store recipe station, the recorded live plan/copy reflects that schedule and fee. A note every ten real minutes records reward deltas, current and longer goals, unexpected events, choice context, progress, drought, and repetition. These notes are runner observations, not human enjoyment evidence. Human Gate remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`.

The short Hybrid runner picks a currently eligible track with a visible guaranteed-material cue, verifies the actual owned material ledger delta, gathers any missing recipe inputs normally, selects that actual material in the live recipe UI, crafts/equips/reloads, then uses a currently eligible return encounter. Enemy/progression/equipment differences are recorded as confounds; exact causal comparison belongs to the later I combat matrix.

## Verification completed during preparation

Pre-fix Life note failure and exact original driver hash are preserved in `browser-driver-life-note-red.json`; the independent review correction that raw `lastLifeNoteState` was already stored is recorded there too. After fixing missing `last_recipe_choice` initialization/live assignment, successful Hybrid completion disposition, and the planner’s `鍛造熟練度／需求 Lv.N` parser, `test_phase05_browser_driver.py` exercises first and second ten-minute notes through the real `timed_note()` method with a fake page and changing snapshots, Hybrid pass/block status, and recipe skill locked/unlocked selection. Python syntax checks and all seven helper/driver focused tests passed. No production build, product test suite, source freeze, or browser run is part of this preparation handoff.
