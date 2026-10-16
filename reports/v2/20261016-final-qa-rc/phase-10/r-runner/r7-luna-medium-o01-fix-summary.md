# O-01 load/save pending compaction fix

## Changes

- `src/stores/gameStore.ts`: call the existing `compactPending()` in `save()` immediately before checkpoint serialization. This covers writable load recovery and all other save paths without changing the compaction algorithm. `persisted` is rebuilt from the compacted queue only after the checkpoint write succeeds; generated summary/gap markers therefore become pending for archive append, while dropped IDs are not resent. Read-only preview does not call `save()` and remains non-mutating.
- `src/stores/gameStore.test.ts`: add a 5,000,000-character `legacy-world` checkpoint regression. It confirms a public `advance(1)` progresses the existing world, saves with no quota error, and retains bounded summary/gap markers. Adjust the reset-under-quota test to assert load-time compaction succeeds first, then verify reset still persists and preserves the legacy range.

## RED / GREEN evidence

- RED: `npx.cmd vitest run src/stores/gameStore.test.ts -t "compacts oversized legacy pending on load and continues the same world under quota"` failed as expected: world time remained 480 instead of advancing to 481 because the initial over-quota save blocked progress.
- GREEN: `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` — PASS, 3 files / 63 tests.
- GREEN: `npx.cmd vue-tsc --noEmit` — PASS.
- The first combined run exposed test assertions that expected the compaction message to remain after the existing archive failure handler replaces it, plus a wrong fixture property name. Assertions were narrowed to required behavior and the property corrected; the final commands above passed.

## Risks / limits

- Compaction still discards old detailed pending records according to the existing algorithm and records summary/gap markers; archive unavailability can continue to delay appending those markers, but no longer blocks checkpoint persistence or world progress due to their oversized legacy payload.
- No schema change, commit, push, build, or broader suite run was performed. Changes are limited to the two assigned source/test files plus this required runner summary.
