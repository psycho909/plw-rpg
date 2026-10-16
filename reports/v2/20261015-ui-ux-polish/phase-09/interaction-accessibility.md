# Phase9-D Interaction & Accessibility

## Scope and evidence

This report distinguishes the accepted Phase9-A production-browser baseline from the Phase9-D rerun. The D probe is `scripts/phase9/d-probe.mjs`; it opens only the production `dist/`, starts from a visible fresh-save control, checks the intended target against `document.elementFromPoint` before dispatching each pointer action, and records the production browser and screenshots under `d-runner/probe-*/`. No game state is injected.

The initial source review found native `dialog.showModal()` use, visible focus styling, Escape handling, trigger restoration, a scrollable `.window-body`, and a single-modal app pane. The accepted B fix for `details > summary` remains in PixelWindow's focusable selector. The tab-order filtering and wrap calculation were extracted into `src/presentation/modalFocus.ts` so the key behavior can be unit-tested without introducing a DOM-test framework.

## Automated focus logic

`npx.cmd vitest run src/presentation/modalFocus.test.ts` passed 3 tests: the disclosure-summary selector, positive-tabindex ordering with DOM-order ties and hidden/negative exclusions, and forward/backward wrap including focus recovery and an empty list. `node --check scripts/phase9/d-probe.mjs` and `git diff --check` passed.

## Browser results

The approved production build passed (`vue-tsc --noEmit` and Vite build). `node scripts/phase9/d-probe.mjs` completed on Chrome 153.0.8010.53 at `d-runner/probe-20261016T010259948Z/`, entering a fresh save through the visible `起身` button. All dispatched mouse and touch targets matched the topmost `elementFromPoint` result; there were no refused or obscured clicks.

- Opening the menu produced one native modal (`:modal === true`) and moved focus inside it. Tab moved focus to the next enabled button with a visible 2 px outline.
- Enter activated the focused `住所與產業` menu item and opened that view. Space activated the focused `這一生` item and opened its view.
- Escape closed the dialog and restored focus to the `選單` trigger.
- Inventory content had a 547 px scroll height in a 350 px body viewport. Its footer remained inside the dialog and the dialog remained inside the browser viewport.
- At 320×667, a CDP touch event on the 72×40 px mobile `物品` navigation button opened Inventory. Direction-pad targets were 42×42 px and mobile-nav targets 72×40 px.

The probe records target/topmost element pairs and screenshots in `d-runner/probe-20261016T010259948Z/`; the final Chrome profile was 14,838,759 bytes before cleanup and was removed. No product hit-testing defect was found in these checks.

## Interaction boundary

The first sandboxed launch timed out before Chrome created `DevToolsActivePort`; a later escalated run exposed and corrected a runner-side label serialization error. Both failed attempts are retained with failure records. Successful browser evidence is from the final attempt above. Cleanup is limited to the validated `chrome-profile` child directory after its byte size is recorded; attempt folders and screenshots are retained.
