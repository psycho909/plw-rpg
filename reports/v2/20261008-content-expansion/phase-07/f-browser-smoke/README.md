# Phase 7 F — Chromium onboarding smoke

## Final attempt

- Source branch / HEAD: `v2x/reward-core` / `e05cc78f1ef452e2672df223f2febf48444dcbd3`.
- Browser: Chromium 151.0.7922.173 (Debian GNU/Linux 13).
- Runner: disposable Playwright Chromium context at `http://127.0.0.1:5173/`; no real save was used.
- Start / end: 2026-10-13T07:30:17.460815+00:00 / 2026-10-13T07:30:21.033658+00:00 (3.573 s).
- Helper SHA-256: `13ed5de5f9036c605754b6e669fff4aa96b6b03ea5af4a7882334da8296406fc`.
- Result: PASS. Vue render, opening dialog dismissal, pause, movement, farming prepare/plant/growth/harvest, Character/Inventory/History/Map windows, localStorage save/reload all passed. Harvested reward remained 8 food after reload; browser page errors: 0.
- Raw result, stdout, and stderr: `onboarding-attempt-04-stable-source/`.

## Retained failed attempts

- `onboarding-attempt-02/` failed because the new-world `起身` dialog was still open and intercepted the pause click. The disposable helper was updated to dismiss that documented opening dialog before asserting the rest of the UI.
- `onboarding-attempt-03-fixed-helper/` then timed out while looking for `旅人筆記`; Playwright reported same-URL navigation during the wait. That run preceded a stable-source rerun, so it is retained as an inconclusive harness/runtime attempt and is not represented as a product defect.
- `onboarding-attempt-04-stable-source/` is the passing rerun after the F source/test tree was frozen. Earlier raw failures remain unchanged.

This smoke verifies an onboarding/runtime slice; it does not replace the full Phase 7 browser/soak QA gates.
