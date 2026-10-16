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
