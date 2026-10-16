# Phase10-R fix round 3 — journal coalescing with immutable persisted records (sol-medium-journal-coalesce)

Read `.scratch/20261016-phase10r/common.md` (rules apply). Previous attempt summary: `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r3-luna-high-journal-fix-summary.md`; current uncommitted diff in `src/stores/gameStore.ts` / `src/stores/gameStore.test.ts` is that attempt — build on it.
Owner of: `src/stores/gameStore.ts` (`record()` / compaction path only) and `src/stores/gameStore.test.ts`. No other files. No commit/push. No journal/save schema change. Escalated `npx.cmd vitest run <files>` and `npx.cmd vue-tsc --noEmit` are allowed.

## Problems with the current attempt (lead review)
1. Coalescing is effectively disabled: `save()` (gameStore.ts ~152) puts every pending id into `persisted` after each successful checkpoint, and normal play saves after advances, so `!persisted.has(previous.id)` almost never allows a merge. External review P2-01 requires consecutive `time` records to be coalesced to bound journal growth during archive outages; relying only on summary/gap compaction drops more detail.
2. The new marker test is vacuous: its summary/gap messages are mojibake (not the real `JOURNAL_SUMMARY_PREFIX` / `JOURNAL_GAP_PREFIX`), and the markers are loaded from a checkpoint so they are already `persisted`; the test passes even without the prefix guard.

## Required behavior
- Keep the safety property from the independent review: never mutate in place a record whose id is already in a checkpoint (`persisted`) or in flight.
- Restore coalescing: when the previous pending record is a plain `time` record (same world, not in flight, not a summary/gap marker) but is already persisted, replace it with a NEW record (new id, merged `from`/`to`, merged events with the existing 128-event cap/gap rule) and remove the old one from pending. Unpersisted previous records may still be merged in place. Think through: old id already appended to IndexedDB but ack lost; checkpoint write failing after replacement; reload of an older checkpoint — document any residual duplicate-range risk.
- Never coalesce into summary/gap markers (keep the prefix guard).

## Tests (RED first, then GREEN; record both)
- Persisted-previous case: after a successful checkpoint, a further advance yields ONE merged time record with a new id covering both ranges, and the old id is no longer pending; checkpoint/reload consistency holds (simulate a failing next checkpoint write and reload the older checkpoint: no same-id/different-content conflict).
- Marker case: markers produced in-session by real compaction (or built with the real prefix constants and NOT persisted) are not overwritten by the next advance. Prove the test fails if the prefix guard is removed.
- Restore the original expectations where coalescing should hold (e.g. 25,000-advance test back to a small number of ranges covering from..to, pending ≤ 256; the "merges consecutive pending time records" test).
- Run `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` and `npx.cmd vue-tsc --noEmit`.

Output `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r4-sol-medium-journal-coalesce-summary.md` (changes, RED/GREEN, risks); reply with only that path.
