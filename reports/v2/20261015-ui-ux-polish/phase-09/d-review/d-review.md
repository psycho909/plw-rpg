# Phase9-D Review

- **Disposition:** RETURNED (one P3 fix requested)
- **Review scope:** D source diff `.scratch/20261015-phase9/d-src.diff`, ticket/spec acceptance, implementation reports, full-check log, and final production-browser evidence. No source files changed during review.
- **Reviewed revision:** `eb8ed8c8ebf51dcdf68e1781e41b319504c88a46` plus the current uncommitted D diff.

## Findings

### P3 — disabled controls can enter the modal Tab sequence through the generic tabindex selector

[`modalFocus.ts`](../../../../src/presentation/modalFocus.ts#L1) combines explicit enabled-control selectors with the broad `[tabindex]` selector. `orderModalFocusables` filters only `tabIndex >= 0` and the caller's visibility predicate ([`modalFocus.ts`](../../../../src/presentation/modalFocus.ts#L12), [`PixelWindow.vue`](../../../../src/components/PixelWindow.vue#L11)); that predicate does not reject `:disabled` elements. A disabled form control carrying a nonnegative tabindex can therefore be admitted through `[tabindex]`, despite the enabled-only selectors. The unit test covers hidden and negative-tabindex entries but has no disabled fixture ([`modalFocus.test.ts`](../../../../src/presentation/modalFocus.test.ts#L10)).

Please reject disabled controls in the shared focusable filter (including controls reached through `[tabindex]`) and add a regression case for a visible disabled candidate with a nonnegative tabindex. The current map buttons are authored with `tabindex="-1"`, so the reviewed browser run does not demonstrate this case; this is a focus-contract and regression-coverage gap, not an observed failure in the measured fresh-save route.

## Acceptance evidence checked

- Lead's `npm run check` log reports 40 files / 646 tests passed and a successful TypeScript/Vite production build (`d-runner/npm-run-check-d.log`).
- The final browser attempt is `d-runner/probe-20261016T010259948Z/`. Its JSON records all 20 width/height combinations at 320, 375, 768, 1280, and 1920 px by 667, 768, 900, and 1000 px. Independent aggregation confirms 0/20 horizontal overflow, 0/20 required controls outside the viewport, and 0/20 sampled targets under 24 px. The measured map height is at least 421 px on mobile and 445 px on desktop, above the 240 px / 380 px CSS minimums.
- I visually inspected `responsive-320x667.png`, `responsive-1280x768.png`, and `inventory-dialog.png`. HUD, recent-event/shortcut or mobile navigation, and the map remain within the emulated viewport; the inventory dialog body scrolls while its footer and dialog remain in bounds.
- The production browser evidence shows a native modal with focus inside, Tab moving to an enabled item with a visible 2 px focus outline, Enter and Space activating focused menu items, Escape restoring the trigger, and the mobile navigation responding to a hit-tested touch. The pure modal-focus tests cover forward/backward wrap and focus recovery. The selector retains `details > summary`.
- The D diff is limited to responsive layout allocation and modal focus handling; no engine/game-loop changes were found. The existing `--pixel-unit` and `--border-width` tokens and zero-radius button styling are unchanged.
- Earlier failed probe attempts remain retained; the successful attempt records its profile size before cleanup and reports the attempt-local profile removed.

No P0, P1, or P2 finding was identified. Re-review after the disabled-control filter and regression test are addressed.
