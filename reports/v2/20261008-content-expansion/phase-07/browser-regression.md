# Phase 7-K Chromium Browser Regression

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


## Final-runner Chromium regression smoke — 2026-10-13

- Run `qa-browser-runs/20261013T141929Z-pid399598/`; runner SHA-256 `a2f5e3478d99a4e693d7b43441836441598ffa685c01c694945174da7a9331a4`; release manifest SHA-256 `966f971f5920c49a6d5510df7dc5ee990070c4cf01c71301ffa10922a4e9e97d`.
- `PASS_BROWSER_REGRESSION`; 74.03 seconds real elapsed for the requested 60-second smoke, 14 visible actions, two checkpoints, and one verified normal UI save/reload. Visible legal wait advanced `worldTime` 480→1920; after reload and continued UI play, final `worldTime` was 2120. All 23 core state fields matched on runtime reserialization after reload.
- Browser errors: false; error counts empty. Chromium `151.0.7922.173`. Source fingerprint matched `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`; source remained stable. Build status and `dist/` match the frozen release.
- This is a short smoke for the final harness revision; it is not the required two-hour stress or one-hour content-focused lane. Runner execution used GPT-6 Luna Low configuration, no model inference, no human tester, and no controlled fixture lane.
