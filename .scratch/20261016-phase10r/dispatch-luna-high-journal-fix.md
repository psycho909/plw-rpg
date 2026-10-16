# Phase10-R fix round 2 ??journal coalescing (luna-high)

Read `.scratch/20261016-phase10r/common.md` (rules still apply; HEAD is now 99ae963 + lead edits; full check baseline PASS 48 files / 703 tests).
Owner of: `src/stores/gameStore.ts` (the `record()` coalescing path only) and `src/stores/gameStore.test.ts` (add tests). Do not touch other files. No commit/push. No save/journal schema change.

Independent review findings (confirmed by lead):
1. P2 `src/stores/gameStore.ts:73` ??coalescing mutates a pending `time` record in place even when its id is already in `persisted` (already written into a checkpoint). A later flush can append the mutated content to IndexedDB while the checkpoint still holds the old content for the same id; if the next checkpoint write fails and the old checkpoint is reloaded, the same id with different content conflicts and blocks flushing. Fix: only coalesce into a record that is not yet persisted (and not in flight); otherwise push a new record.
2. P2 `src/stores/gameStore.ts:73` ??summary (`JOURNAL_SUMMARY_PREFIX`) and gap (`JOURNAL_GAP_PREFIX`) marker records are also `kind: 'time'`; the next advance coalesces into the gap marker and overwrites its message. Fix: never coalesce into summary/gap marker records.

TDD: write each failing test first (record RED output), then fix. Existing coalescing / 25,000-advance stress / retry tests must still pass.
Verify: `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` and `npx.cmd vue-tsc --noEmit`.
Output `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r3-luna-high-journal-fix-summary.md` (changes, RED/GREEN, risks); reply with only that path.
