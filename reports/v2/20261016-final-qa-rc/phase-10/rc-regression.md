# V2.x Engineering RC — Focused Final Regression

Source `76595c5`; product src unchanged during this round. Only QA runners changed（below）.

## 5.1 Automated

`npm.cmd run check` on current HEAD（[baseline](rc-baseline.md) §3）: **48 files / 719 tests PASS**, `vue-tsc` PASS, `vite build` PASS. It is the full Vitest suite, so the focused areas below were not run again separately:

| Area | Test files（in the 48） |
|---|---|
| O-01 / journal | `gameStore.test.ts`, `phase10rJournal.test.ts`, `playJournal.test.ts` |
| Save / reload / migration | `saveService.test.ts`, `rewardSave.test.ts`, `phase10Persistence.test.ts`, `bossSaveReload.test.ts` |
| Determinism | `phase10Determinism.test.ts`, `regionalCrisis.test.ts`（chunked = hourly）, `simulation.test.ts` |
| Crafting material integrity | `phase10rCrafting.test.ts`（22 recipes / 35 overlaps）, `crafting.test.ts`, `contentItems.integration.test.ts` |
| Cross-system action invariants | `phase10rSaveInvariant.test.ts`, `phase10Integration.test.ts`, `actions.test.ts`, `ownership.test.ts` |

Browser determinism evidence: O-01 A-det（browser segment = Node replay）.

## 5.2 Browser smoke（production build）

Reused the Phase10-E runner [`scripts/phase10/e-regression.mjs`](../../../../scripts/phase10/e-regression.mjs) unchanged in behavior, with two runner-only edits: `CHROME_PATH` / `QA_OUT` environment overrides（Chrome moved to `Program Files (x86)`; output to `rc-runner/`）, and waiting for an **enabled** 起身 button before clicking.

Authoritative attempt: [`rc-runner/attempt-20261016T141817438Z-regression/`](rc-runner/attempt-20261016T141817438Z-regression/) — 200 actions, 123 hit-tested clicks, **0 refused obscured clicks**, 51 screenshots, Chrome profile 59.3 MB deleted after run.

| Scenario | Result |
|---|---|
| New game / start life | PASS |
| Normal world progress（time flowing / pause） | PASS |
| Life: gather wood, mine stone, store, craft 木石長矛 | PASS（craft submitted; Lv.2 after practice） |
| Inventory: compare, search, equip crafted gear | PASS |
| Combat: slime encounter, 2 attacks, loot, next goal | PASS（loot `怪物素材 ×1`） |
| Save / reload | PASS（HUD, place and player tile equal; clock 14:18 = 14:18） |
| Journal recovery | covered by [O-01 verification](o01-browser-verification.md) |
| Modal / keyboard（Tab focus, Esc, focus return） | PASS |
| Responsive 15 viewports（320–1920 × 768/900/1000） | PASS: 0 horizontal overflow, 0 clipped buttons, 0 small targets |
| Mobile: 375×667 inventory window, 320×667 mobile nav | PASS |
| Controlled fixtures: crisis, craft-cap, succession, hybrid | all `observed`（separately labeled controlled starting saves） |

Locator misses: 13 `locator-no-visible-enabled-button` entries（e.g. `open-place:森林`）, the same 13 as the accepted Phase10-E baseline `e-runner/attempt-20261016T054428920Z-regression` — consistent with baseline, not a regression.

Errors: 1 `net::ERR_ABORTED` request at the first navigation（1 s after start; the initial `about:blank` → app navigation is replaced）; 0 page exceptions, 0 console errors.

Retained failed attempt: `attempt-20261016T141656528Z-regression` — runner clicked 起身 18 ms after load while it was correctly disabled（「正在確認存檔使用狀態」, Web Lock not yet acquired）. Escape later closed the dialog and map/menu clicks succeeded, but life never started（`openingSeen=false`）, so actions failed and the run timed out waiting for the save notice. Runner timing defect, not a product regression（Phase10-E ran on a faster lock acquisition）.

## Performance

- `compactPending()` now runs on every save; under the cap it is one size pass. Node v22 micro-benchmark: 0.83 ms per save at full cap（256 records, ~285k chars）, 0.026 ms for 8 records. Saves occur per action and every 10 s.
- No 2-hour stress or new long-world run（Owner §6）. Engine simulation and `scripts/` long-world runners unchanged since Phase10-D; crafting changes in `99ae963` were checked by the external reviewer（238 legal crafts byte-identical incl. 6 h continuation）.

## Not run

Long-world 10/50/100 years, Monte Carlo, Phase0–10 full browser QA, 2-hour stress; Safari / Firefox / physical devices（NOT TESTED）.
