# Phase10-R Journal Fix Summary

## Changes

- `record()` now coalesces a time record only when it is not checkpointed, is not in flight, and is not a summary or gap marker.
- Added regressions proving a checkpointed time record stays unchanged and marker records remain intact.
- Updated persistence expectations so checkpointed advances remain separate records while retaining event data and bounded compaction coverage.

## RED / GREEN

- RED: `npx.cmd vitest run src/stores/gameStore.test.ts -t "does not coalesce"` failed both regressions before the fix: expected two time records but found one; expected summary and gap markers plus a new record but found only two records.
- GREEN: The same targeted command passed both regressions after the fix.
- GREEN: `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` passed: 3 files, 49 tests.
- GREEN: `npx.cmd vue-tsc --noEmit` exited 0.
- GREEN: `git diff --check` passed.
- The first sandbox Vitest launch failed with Windows `spawn EPERM`; the approved elevated retry produced the RED results above.

## Risks

- Checkpointed advances now retain separate journal rows instead of rewriting one row. This can increase journal row volume during archive outages; existing compaction still bounds pending checkpoint data, and the 25,000-advance regression passed with full time coverage.
- No journal or save schema changes were made. No commit or push was performed.
