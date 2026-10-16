# Responsive Visual Review — Phase9-D

## Baseline before D

Phase9-A's accepted production-build screenshots show that the fixed `.world-frame` viewport-height calculation pushes persistent controls below the initial viewport. The recorded baseline measured the player identity beginning at y=747 in 1280×768, while recent-event/shortcut controls began at y=798. The identity was still clipped at 1280×900 and 1280×1000; at 320×1000 and 375×1000 mobile navigation began at y=1016. Its sampled widths 320, 375, 768, 1280 and 1920 had no document horizontal overflow and sampled targets were at least 24×24. Before screenshots and detailed figures are retained in `a-runner/attempt-20261015T085040840Z-ux-audit/` and summarized in `ux-baseline.md`.

## D implementation

The exploration shell now occupies the dynamic viewport as a column. The world stage uses the remaining height, and the map frame flexes inside it while retaining its existing 380 px desktop and 240 px mobile minimums. Header, HUD, desktop event/shortcut row, notice row, and mobile navigation keep their natural sizes. This removes the brittle `100dvh - 220px` and `100dvh - 250px` frame calculations without removing content.

## D production-browser results

The approved production build passed TypeScript checking and Vite build. Chrome 153.0.8010.53 probe `d-runner/probe-20261016T010259948Z/` captured all 20 combinations of widths 320, 375, 768, 1280, 1920 and heights 667, 768, 900, 1000. Across all 20 cells:

- Document horizontal overflow: **0/20**.
- Required visible controls outside the viewport: **0/20**.
- Sampled required controls below 24×24 px: **0/20**.
- Map frame height ranged from 421 px to 778 px; the map yielded vertical space to keep persistent controls in view.

This includes desktop identity, recent-event and shortcut rows, mobile player HUD and four-button navigation. Screenshots are named `responsive-{width}x{height}.png`; `probe-results.json` contains per-control rectangles and measurements. The 320×667 screenshot also confirms the map, HUD and navigation fit together at a common short mobile height. A separate CDP touch event successfully opened Inventory through the mobile nav; the direction pad measured 42×42 px and mobile navigation buttons 72×40 px.

The report is limited to tested viewport states and the production build; it makes no claim about human preference or device-specific browser chrome beyond the emulated viewport.

## Phase9-E visual and feedback consistency

### Before/after evidence

The fresh-save opening and post-start world screenshots, followed by the forest action and log views, are retained in [`e-runner/attempt-20261016T012939967Z/`](e-runner/attempt-20261016T012939967Z/). `menu-hover-active-focus.png` records the real pointer/keyboard state pass; `before-fresh-save-opening.png` and `after-fresh-save-world.png` show the opening-to-world transition; `gather-feedback.png` and `gather-event-log.png` show immediate versus reviewable feedback. The action captures are not represented as a before/after source-code visual diff. The rebuilt production build's craft and boss message captures are retained in [`e-runner/attempt-20261016T013838256Z/`](e-runner/attempt-20261016T013838256Z/), including `starter-spear-craft-feedback.png`, `controlled-boss-immediate-result.png`, and `controlled-boss-event-log.png`. The two source changes affect message text only, so no visual-rule change was justified by the sampled evidence.

### E consistency pass

The production-browser sample retained the existing monochrome palette, zero-radius borders, Traditional Chinese UI font stack, and spacing tokens of 4/8/12/16 px. CDP pointer input observed the menu button hover (`#191919` background, white border) and active state (inverted black/white); Tab reached a modal button with a visible 2 px outline and 4 px offset. The pressed ×1 speed button retained its selected inversion. A disabled map cell remained low-contrast while retaining its map-specific size override. The window header/body/footer and status notice remain within the existing PixelWindow/StatusNotice hierarchy; no dashboard treatment, new color, card style or persistent notification stream was introduced. No visual CSS edit was warranted; changing the Phase9-D height allocation would be out of scope.

The E browser run was at the default headless viewport and is an interaction evidence pass, not a replacement for D's 20-cell responsive matrix. The targeted tests passed 37/37 across two files. Lead's [`e-runner/npm-run-check-e.log`](e-runner/npm-run-check-e.log) records the full check passing (41 files / 650 tests, TypeScript check and Vite build with 103 modules); the post-build E probe passed at [`e-runner/attempt-20261016T013838256Z/probe-results.json`](e-runner/attempt-20261016T013838256Z/probe-results.json).
