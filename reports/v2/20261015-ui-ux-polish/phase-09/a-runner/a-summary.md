# Phase 9-A Runner Summary

## Result

Lead review additions are recorded in [ux-baseline.md](../ux-baseline.md). The latest complete attempt is [attempt-20261015T085040840Z-ux-audit](attempt-20261015T085040840Z-ux-audit/): 172 recorded actions, 105 dispatched clicks, 0 obscured clicks, 0 page/console/network errors, and 43 screenshots. Normal fresh-save evidence remains separate from the three labeled controlled starting-save fixtures.

## Commands and checks

- Existing baseline `npm.cmd run check` — PASS: 38 test files / 631 tests; TypeScript check and production build completed. Log: [npm-run-check-baseline-97dd33c.log](../a-check-run/npm-run-check-baseline-97dd33c.log). No source changed since that baseline.
- `node --check scripts/phase9/audit-runner.mjs` — PASS after adding the controlled fixture and viewport-height probes.
- `node scripts/phase9/audit-runner.mjs` — latest completed attempt `attempt-20261015T085040840Z-ux-audit`, Chrome 153.0.8010.53 / Node v22.14.0, production `dist/`.
- `node scripts/phase9/compact-artifacts.mjs` — PASS; scanned 15 attempt directories and compressed the oversized trace in `attempt-20261015T084645406Z-ux-audit`, recording original/compressed hashes. No attempt directories were deleted.
- `git diff --quiet 9118454fe6520ae6a1fdb6283858ee1ead8fc5ab HEAD -- src` — PASS (exit 0). No `src` changes; no commit or push.

## Added controlled coverage

- **Practice cap, seed 94103:** engine `craft()` produced six successful `starterSpear` crafts until `planCraft.practice.graduated` (Smithing Lv.3 / 0 XP). The workbench explicitly displays 「本配方已達熟練上限 Lv.3」 and next target 「下一項配方目標：Smithing Lv.4 解鎖鍛造晶刺長槍。」. With no materials, `fieldArmor` showed iron 2 / held 0, wood 1 / held 0, inline warning 「鍛造材料不足。」 and disabled craft action. See `craftingCapFixture` in `results.json` and the two cap screenshots.
- **Succession, seed 94104:** fixture generated the active character's death via engine `die()`, packed that save, then loaded it solely to inspect the UI. The modal opened focused on the first of 29 adult resident choices; no close button was present and Escape left it open. Tab moved through choices. Selecting the first resident closed the dialog and showed 米拉 1, Lv.1, 100 HP, 84 stamina, 45 gold in the HUD. See `successionFixture`, checkpoint, and before/after screenshots.
- **Viewport height:** measured all 5 required widths at heights 768, 900, and 1000. At 1280×768 the player HUD and bottom controls are clipped; at 1280×900 the player row is clipped and recent-event/shortcut controls remain below the initial viewport. Screens and exact boxes are recorded in `results.json` and `responsive-1280-h768-main.png` / `responsive-1280-h900-main.png`.

## Fingerprint parity — RESOLVED

The final runner's `23d8f619f94b1d8296eb5f6ecf34cad22f0cf71f650e1a7d271280195a42cba2` uses the Phase8-F browser-suite algorithm: recursively sort source file entries, hash each file, then hash the newline-joined `relative/path:hex-digest` rows. Phase8-F recorded the same result at HEAD `9118454fe6520ae6a1fdb6283858ee1ead8fc5ab`.

The dispatch's `b2db22c9…058f` is the lead's distinct sorted `git ls-files src` SHA-256-of-SHA-256 fingerprint. The different digests reflect different algorithms; the source tree is unchanged from Phase8-F to this audit HEAD, confirmed by the clean source diff above.

## Attempts and review

All attempts remain under `a-runner/`. `attempt-20261015T084645406Z-ux-audit` is an incomplete retained attempt: its first cap fixture did not include enough materials for all six crafts, after normal and crisis evidence had already been written. `attempt-20261015T084824269Z-ux-audit` completed the fixtures but preceded the final screenshot/search correction. The latest `attempt-20261015T085040840Z-ux-audit` contains the corrected cap and advanced-recipe views, succession evidence, and 768/900 height evidence. Earlier incomplete/revision attempts also remain intact.

Lead review pending for the updated findings and controlled-fixture evidence.
