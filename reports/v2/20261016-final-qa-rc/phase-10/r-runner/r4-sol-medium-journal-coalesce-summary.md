# Phase10-R round 4 — Journal coalescing

## Result and scope

- Dispatch implementation and requested verification complete; parent Ticket acceptance and independent review remain with the lead.
- Changed only `src/stores/gameStore.ts`, `src/stores/gameStore.test.ts`, and this requested report. Built on the existing round-3 uncommitted changes. No commit/push, schema change, dependency, or balance change.
- Current HEAD observed: `99ae963bd57fbeafbb3a57bc4a783b5efe345cdf` (the dispatch common baseline named `0d86c50`; this task did not move HEAD).
- Applied `matt-skills-curated:tdd`, using the existing store/checkpoint/archive service seams.

## Changes

- `record()` retains the same-world, time-kind, not-in-flight and real summary/gap-prefix guards. When the previous record is checkpointed, replace its pending slot with a shallow copy with a fresh UUID before updating time, message or events. The prior object and event array remain unchanged; merged events are assigned a new array.
- Uncheckpointed plain time records can still merge in place. The existing 128-event cap, gap markers and bounded pending compaction remain in effect.
- Restored the consecutive-time merge expectations, including full event retention below the cap and a new ID after checkpointing.
- Added lost-acknowledgement regressions with an archive mock that commits before rejecting and checks same-ID content on retries. Both successful replacement checkpoint/reload and failed replacement checkpoint/older-checkpoint reload are covered. Tests assert the old archived object is unchanged, the replacement is the only pending time record, and the old ID is absent from pending.
- Replaced the vacuous mojibake marker fixture. Both real prefixes are tested independently using unpersisted marker fixtures injected at the public checkpoint-service boundary, after the prior checkpoint. Neither ID is persisted or in flight at the next advance.
- The 25,000-advance test now requires at most three time ranges (including summary/gap markers), coverage of the entire interval, pending <=256, resumable play and checkpoint size below 5,000,000 characters. The prior attempt's 120-second timeout is retained; the final requested suite took 58.33 seconds.
- Restored rejection-path pending-count and range-start expectations for coalescing; removed its obsolete expectation that a checkpointed merged time record retains its ID.

## RED / GREEN evidence

All commands ran from `D:\Codex\plw-rpg`.

1. RED before implementation: `npx.cmd vitest run src/stores/gameStore.test.ts -t "merges consecutive pending time records"` exited 1: one failed, 41 skipped. Expected one time record, received two.
2. GREEN after replacement implementation: the same command exited 0: one passed, 41 skipped.
3. Focused safety/marker check: `npx.cmd vitest run src/stores/gameStore.test.ts -t "replaces checkpointed|unpersisted marker"` exited 0: four passed, 40 skipped. An initial test-fixture write through PowerShell/Python converted the Chinese prefixes to question marks; that setup failure was corrected with a UTF-8 patch and is not counted as behavioral RED evidence.
4. Marker mutation RED: temporarily removed only the prefix guard, then ran `npx.cmd vitest run src/stores/gameStore.test.ts -t "unpersisted marker"`. Exit 1: both real-prefix cases failed because the marker's time range, message and events were overwritten. Restored the guard before final verification. The final suite below includes both restored GREEN cases.
5. Final GREEN: `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` exited 0: **3 files / 51 tests passed**, duration 58.33 seconds. Includes legacy checkpoint compatibility and IndexedDB journal tests.
6. `npx.cmd vue-tsc --noEmit` exited 0.
7. `git diff --check` exited 0 before report creation; final scope/report whitespace check recorded below.

## Review and residual risks

- Self-review only, not independent audit. Reviewed unstaged scope with `git diff -- src/stores/gameStore.ts src/stores/gameStore.test.ts`; the matching cached diff was empty. Standards: minimal record-path change, preserved schema and immutable persisted/in-flight records. Spec: restored coalescing, marker exclusion, cap/gap behavior and reload consistency. No unresolved finding within the dispatch scope.
- **Lost acknowledgement can still yield overlapping ranges under different IDs.** If IndexedDB committed A but its acknowledgement was lost, replacement B contains A's range plus the new advance. Later appending B preserves immutable A and avoids same-ID/different-content conflicts, but both rows may describe some of the same minutes/events. Without a supersession/deduplication contract or schema change, this is a residual duplicate-range risk. Consumers must not assume all archived ranges/events are disjoint or sum them as unique elapsed time.
- **Failed replacement checkpoint:** B remains only in memory and is not eligible for append because its new ID is not persisted. Immediate reload recovers older checkpoint A and its older world time; replay of A agrees with already archived A. The latest unsaved advance is lost on closing, consistent with the existing save-failure warning. If the page stays open and a later save succeeds, B becomes eligible and the overlap risk above applies.
- **In flight:** the guard prevents changing or replacing the record currently being appended. A later advance receives a separate new record. Subsequent eligible tail records may coalesce after they leave flight; no in-flight object is mutated.
- This does not bound total IndexedDB archive history or eliminate duplicate ranges after lost acknowledgements. Existing pending compaction can intentionally discard detail while retaining explicit summary/gap markers.
- No browser, full `npm.cmd run check`, deployment, or independent audit was performed by this worker; those are outside this dispatch and remain lead responsibilities.

Final scope/report whitespace check: `git diff --check -- src/stores/gameStore.ts src/stores/gameStore.test.ts` and explicit new-report trailing-whitespace inspection passed.
