# Phase9-D Runner Summary

## Scope

Responsive HUD/map allocation, PixelWindow focus containment, and focused production-browser accessibility checks under the approved Phase9-D ticket. No game-loop, engine, save, or balance changes.

## Changes

- `src/style.scss`: allocate dynamic viewport height through a column shell; allow the map to consume and yield remaining space while preserving the existing desktop/mobile map minimums.
- `src/presentation/modalFocus.ts`, `src/presentation/modalFocus.test.ts`, `src/components/PixelWindow.vue`: preserve the `details > summary` fix while making focusable ordering and Tab wrap a small tested pure function.
- `scripts/phase9/d-probe.mjs`: production-dist responsive matrix and interaction probe; mouse/touch actions require a successful `elementFromPoint` check; attempt evidence is kept; `finally` records Chrome-profile bytes and cleans only the profile directory inside the attempt.
- `docs/UI.md`: describe the persistent HUD and map space-allocation rule.
- Reports: `interaction-accessibility.md` and the responsive section of `responsive-visual-review.md`.

## Review fixes

- D review found that a disabled control could be admitted through the generic `[tabindex]` selector. The shared focus filter now rejects native disabled state (`:disabled` and `.disabled`) and `aria-disabled="true"` before ordering controls. The project currently uses native `disabled` attributes; the filter also honors ARIA's explicit disabled semantics so an aria-disabled generic tabindex match is not added to keyboard navigation.
- Added a regression test with a visible native disabled candidate at `tabIndex: 0`, plus coverage for `aria-disabled="true"`.

## Verification completed

- `npx.cmd vitest run src/presentation/modalFocus.test.ts`: passed, 1 file / 4 tests, including the disabled tabindex regression.
- `node --check scripts/phase9/d-probe.mjs`: passed.
- `git diff --check`: passed.
- Approved `npm.cmd run build`: passed (`vue-tsc --noEmit`; Vite transformed 102 modules and built production assets).
- Approved `node scripts/phase9/d-probe.mjs`: completed on Chrome 153.0.8010.53. All 20 width/height cells had no horizontal overflow, no sampled target outside the viewport, and no sampled target under 24×24 px. Map frame height ranged 421–778 px.
- Keyboard/modal: dialog opened as a native modal with focus inside; Tab moved focus with a visible 2 px indicator; Enter and Space activated focused menu items; Escape closed and restored focus to the menu trigger. Inventory body scroll height was 547 px in a 350 px viewport, with footer and dialog in bounds.
- Touch: at 320×667 the 72×40 px mobile Inventory control opened the window through a CDP touch event; direction-pad targets were 42×42 px.
- Final evidence: [`probe-results.json`](probe-20261016T010259948Z/probe-results.json), 20 viewport screenshots and interaction screenshots in [`probe-20261016T010259948Z`](probe-20261016T010259948Z/). Profile size before cleanup was 14,838,759 bytes; profile removed.
- Two early attempts are retained: the sandboxed Chrome launch timed out before DevTools startup; the first escalated attempt exposed a probe serialization error. Both closeouts record profile cleanup. The corrected probe completed successfully; no attempt directory was deleted.

## Browser verification

The browser evidence and its limitations are documented in `interaction-accessibility.md` and the responsive section of `responsive-visual-review.md`. No P2 HUD clipping or tested modal/touch blocker remains in the sampled states. No source changes were made to engine, save, or balance behavior.
