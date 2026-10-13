"""Publish corrected K baseline, regression and short-browser report views."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded  # noqa: E402

PHASE = Path(__file__).resolve().parent
reports = {
    "baseline.md": """# Phase 7-K QA Baseline — 2026-10-13 UTC

- Repository: `psycho909/plw-rpg` at `/workspace/plw-rpg`.
- Branch: `v2x/reward-core`.
- Latest committed HEAD during these runs: `e05cc78f1ef452e2672df223f2febf48444dcbd3`.
- Recursive working-tree `src/` fingerprint: `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58` (112 files). This exact fingerprint includes the intended uncommitted Phase 7 product/tests and the reviewed PixelWindow keyboard-accessibility correction. QA results must not be attributed to HEAD alone.
- Working tree at evidence capture: intentionally dirty with Phase 7 implementation, tests, tickets, QA reports, and harness evidence; source identity is pinned by the recursive manifest. No reset, checkout, clean or stash was performed.
- Full `npm run check`: 2026-10-13 12:53:54Z–12:54:41Z; tests, vue-tsc and production Vite build passed. Build output retained under `k-final-checks-20261013/`.
- Frozen build status SHA-256: `b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc`; `dist/` fingerprint: `0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1`.
- Browser release manifest SHA-256: `6fb1b481faf264aa22866114d348827eef9b70b736aaef4fa48a31f0eab94cbf`.
- Node `v24.19.0`; npm `11.9.0`; Vite `7.3.6`; Vitest `4.1.11`; TypeScript / vue-tsc `5.9.3`; Python `3.12.14`; Playwright `1.62.0`.
- Browser: headless Chromium `151.0.7922.173`, Debian GNU/Linux 13 (trixie), Linux x86_64, kernel `6.18.44`. Firefox is not installed. Native Safari and physical iOS/Android are excluded by the user’s test scope.
- Baseline/build provenance was captured before final K test execution on 2026-10-13 UTC. The launcher verifies complete source, build-input and `dist/` maps before and after each production Browser lane.

The V2x Phase 7 delivery source commit will be recorded after the authorized current-branch commit. The test HEAD above is not presented as that delivery commit.
""",
    "regression.md": """# Phase 7-K Engineering Regression

## Latest source

- Test-time HEAD: `e05cc78f1ef452e2672df223f2febf48444dcbd3`, branch `v2x/reward-core`.
- Recursive `src/` fingerprint: `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`.
- Frozen production build status SHA-256: `b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc`; `dist/` fingerprint `0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1`.

## Results

- `npm run check` passed on the latest source at 2026-10-13 12:53:54Z–12:54:41Z: **37 test files / 627 tests**, followed by `vue-tsc --noEmit` and the Vite 7.3.6 production build (97 modules). Stdout, stderr and source-stability record are in `k-final-checks-20261013/`.
- This is the repository-wide suite, not a Phase7-only subset. It includes the existing V1 lifecycle, farming, gathering, economy, combat, dungeon, party, settlement, threat, boss, death/succession, save/load, event/history and regression coverage, as well as the V2 and Phase7 tests.
- The approved seven-pack authoring validation was run separately against `g-integration-run/merged-validator-run/packs/seven-pack-combined.json` at 12:57:13Z–12:57:20Z. It passed content validation, 23 targeted validator tests and typecheck; current run evidence is `k-final-content-validation-20261013/` and the canonical report is `content-validation.md`.
- Browser runner contract suite: **20 tests passed**, Python compilation and scoped diff check passed. RED and GREEN artifacts, including the original failure, are retained in `k-runner-region-classification-20261013/green/` and `red/`.
- A short real Chromium confirmation on the frozen production `dist/` opened a fresh world, entered the actual news window, selected the visible `區域` filter, and verified the updated policy did not classify or choose it as an exploration action. It passed with zero Browser/HTTP errors; evidence is `k-runner-region-classification-20261013/browser-smoke.json`.
- Chromium production regression passed in run `20261013T115419Z-pid386544`: 61.95 seconds, 17 visible actions, one normal save/reload, all 23 core state fields equal, and zero page/console/request/HTTP/storage/unhandled errors. See `browser-regression.md`.
- The dedicated production selector/accessibility smoke passed **42/42 checks** against this source. It covered keyboard reachability and focus restoration/containment, narrow reflow, material/recipe search, crops, current-region monster filtering and Boss cues. Its prior keyboard-focus failure remains archived. See `k-ui-selector-20261013/`.

## Retained non-passing attempts and invocation diagnostics

- The original paused-world stress attempt and its invalid action coverage remain preserved; the corrected 1,203.22-second stress lane is the eligible stability evidence.
- The first content-agent run ran for 1,800.80 seconds but repeated the `區域` news filter and produced no new content candidates. This exposed a P2 QA-policy classification defect, not a product defect. Its raw action log remains intact. The classifier now ignores the generic tab while still recognizing `探索區域` and `前往區域`; the fix has RED/GREEN contract evidence and a current-source Browser confirmation.
- An initial optional Browser smoke encountered only a local static-server `/favicon.ico` 404. The attempt is retained as `browser-smoke-attempt-01-favicon-404.json`; the corrected smoke explicitly serves an empty 204 for that absent optional asset and then passed with no remaining errors.
- The first bare `npm run validate:content` invocation returned the CLI usage message because `--pack` is required; no validator ran in that attempt. It is preserved under `k-final-checks-20261013/attempt-01-invalid-content-cli/`. The approved seven-pack command then passed as listed above.
- All historical A–J failures and corrected retries remain in their existing evidence directories; no failure is erased or restated as a pass.

## Scope limits

Native Safari/physical-device testing is excluded by user instruction; Firefox is unavailable. Controlled combat/loot fixtures and headless long-world simulation do not measure natural encounter odds or human engagement. Human testing remains `DEFERRED / NOT APPLICABLE AT THIS STAGE` and is not an Engineering QA blocker.
""",
    "browser-regression.md": """# Phase 7-K Chromium Browser Regression

## Frozen production build

- Test-time HEAD: `e05cc78f1ef452e2672df223f2febf48444dcbd3` on `v2x/reward-core`.
- Recursive `src/` fingerprint: `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`.
- Build status SHA-256: `b9d5b047229baf9c8a1bb5f516d18ebc48be4ffb96d6a7dab159e81bdb4f09fc`; `dist/` fingerprint `0fc9f8bba0f703f18da79e16184ad07e431dd1817892cc70f5be1377979165d1`.
- Browser: Chromium `151.0.7922.173`, headless production Browser runtime.
- Run: `qa-browser-runs/20261013T115419Z-pid386544/`; launcher/runner exit 0.

## Regression result

- Status `PASS_BROWSER_REGRESSION`; 61.95 seconds real elapsed; one checkpoint and 17 visible actions.
- Fresh opening and playable world controls were verified. A normal in-game wait advanced `worldTime` from 591 to 2020.
- One visible save/reload compared 23 core state fields with no differences. Reload used the normal app UI and did not inject or edit the saved state.
- Page errors, console errors, failed requests, HTTP errors, storage errors and unhandled rejections: **0**.
- Raw checkpoints, UI actions, reload baseline, post-load proof, screenshots and SHA-256 manifests remain in the run directory.

## Focused current-source Browser checks

- The selector/accessibility Browser smoke passed **42/42** checks at the same current source fingerprint. It verified search keyboard reachability, dialog focus management, gear/material/recipe filtering, crop flows, responsive layout and Boss rank/turn cues; the original keyboard failure remains preserved in the run history.
- A separate 2.30-second Chromium smoke loaded this exact production `dist/`, started from the normal opening, entered the live news UI and selected the real `區域` tab. The tab was visible/enabled/selected, classified as no action, and the updated policy did not click it. Browser and HTTP error arrays were empty. Evidence: `k-runner-region-classification-20261013/browser-smoke.json`.
- The first attempt at this tiny smoke saw the static server’s absent optional favicon produce a 404; that harness-only result is retained in `browser-smoke-attempt-01-favicon-404.json`. The passing attempt handles the absent favicon explicitly and still gates on all remaining Browser/HTTP errors.

This short Browser regression is not the long soak. See `browser-stress.md` for the 20-minute stress and content-agent lane findings. Firefox is not installed; native Safari and physical mobile testing are outside scope. Human testing remains deferred.
""",
}

for name, body in reports.items():
    entry = write_recorded(PHASE / name, body, producer="g61-sol-med-orchestrator")
    print(f"published {name} sha256={entry['sha256']} bytes={entry['bytes']}")
