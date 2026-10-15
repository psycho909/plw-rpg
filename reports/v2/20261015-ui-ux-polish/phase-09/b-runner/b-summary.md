# Phase9-B Summary — Goal & Information Architecture

## Changed files

- `src/presentation/goalHints.ts` — pure, read-only contextual hint projection from open requests, crisis phase, seasonal crop projection, and currently eligible encounter projections; maximum five items.
- `src/presentation/goalHints.test.ts` — trigger, expiry/blocker, eligible encounter, crop, crisis, empty-state, max-count, and purity coverage.
- `src/components/WorldRecords.vue` — added “此刻可留意” to the existing Traveler Notes pane with a destination button for each hint.
- `src/components/PlaceWindow.vue` — native expandable preparation details for high-rank authored encounters, wolf ranks, and the present Goblin Chief; factual levels, discovery-gated mechanics/loot, retreat effect, and configured Boss cooldowns.
- `docs/UI.md` — documented the new canonical owner, sources, behavior and test entry.
- `reports/v2/20261015-ui-ux-polish/phase-09/goal-information-architecture.md` — before/after findings, exact information sources, spec compliance and screenshot status.
- `reports/v2/20261015-ui-ux-polish/phase-09/adventure-ux.md` — Boss preparation before/after and source notes.
- `scripts/phase9/b-probe.mjs` — focused, fresh-save production-dist probe using system Chrome CDP, elementFromPoint-verified clicks, per-detail screenshots/text, Notes hint activation, and scoped Chrome-profile cleanup.

Base HEAD at dispatch start: `6f9ecb62d9406f99d0eb9c5e3b35e7d8ab916bb8` on `v2x/reward-core`. No engine rule, config number, save schema, balance formula, commit, or push was changed.

## Verification completed

- `npx.cmd vitest run src/presentation/goalHints.test.ts` — **10/10 PASS**.
- `git diff --check` — PASS for tracked changes.
- Trailing-whitespace scan across changed source and documentation files — PASS.

## Pending Lead execution

## After-evidence probe

Lead confirmed `dist` was rebuilt before the probe. The generic A audit at `a-runner/attempt-20261015T091143175Z-ux-audit` did not expand B's details or surface a Notes hint, so B's focused probe captured those states directly. The pre-fix attempt remains retained at [`probe-20261015T092502858Z`](probe-20261015T092502858Z/); the authoritative post-fix attempt is [`probe-20261015T093111935Z`](probe-20261015T093111935Z/). All earlier attempts, including failures, remain preserved.

- `node --check scripts/phase9/b-probe.mjs` — PASS.
- `node scripts/phase9/b-probe.mjs` — **PASS**; fresh save, 16/16 visible high-rank preparation details captured by keyboard and verified pointer click; all expanded text is in `probe-results.json`. Three wolf ranks and 13 content rows were present; Goblin Chief was not present in this fresh-save state.
- Traveler Notes at the village showed the empty-state screenshot. After normal UI travel to the farmland, the current-season pea hint appeared (expected harvest 4); the destination button was verified with `elementFromPoint`, activated, and the resulting map state was captured.
- Lead finding/fix: `PixelWindow`'s focus-trap selector omitted `<summary>`, so native Tab skipped the preparation details. Lead added `details > summary` at `src/components/PixelWindow.vue:11` and rebuilt `dist`. The final probe does not set `tabIndex`.
- Post-fix keyboard evidence: Tab reached each of the 16 summaries while focus remained inside the modal. Shift+Tab from the first modal control wrapped to the last (`暫停時間`); Tab wrapped back to the first (`×`). Enter was sent as keyDown with `key`, `code`, `text`, and `unmodifiedText`, plus char and keyUp; it opened and closed all 16 rows. Space also opened, closed, and reopened all 16. Exact per-row key outcomes, focus checks, expanded text, and screenshots are in the final attempt's `probe-results.json`.
- Chrome profile size before cleanup: **57,738,782 bytes**; the final attempt-local profile was removed after recording size.

1. `npm.cmd run check` — pending Lead execution.

The existing goal-hint unit verification remains `npx.cmd vitest run src/presentation/goalHints.test.ts` — **10/10 PASS** from the implementation pass. This agent did not rerun Vitest, the full A audit, build, or `npm.cmd run check`. Human comprehension/goal clarity remains unmeasured and no product-experience claim is made.


## Review fixes

- P2(a): village hint destinations now read `LIVING_EVENT_LIMITS.deliverySquare`; the projection test asserts the returned destination position against that canonical value.
- P2(b): wolf fixed-core preparation copy now comes from `wolfCorePresentation` in `src/engine/wolfFamily.ts`, the same projection used to form combat cue wording. The wolf family test asserts both preparation and combat cue phrases from the shared projection.
- P3: `docs/UI.md` records the completed focused probe and final evidence path `reports/v2/20261015-ui-ux-polish/phase-09/b-runner/probe-20261015T093111935Z/`.
- Verification: `npx.cmd vitest run src/presentation/goalHints.test.ts` — **10/10 PASS**; `npx.cmd vitest run src/engine/wolfFamily.test.ts` — **12/12 PASS**. The first run exposed an incorrect import module; both goal hint imports now use the canonical `src/data/livingEvents.ts` export and the rerun passed.
