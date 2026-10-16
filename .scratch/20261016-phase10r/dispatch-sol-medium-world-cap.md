# Phase10-R fix round 6 — bounded multi-world marker policy (sol-medium-world-cap)

You ARE the assigned worker `sol-medium-world-cap`. Do the work yourself; do not delegate and do not use herdr.
Read `.scratch/20261016-phase10r/common.md` (rules apply). Context: `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r5-sol-medium-journal-world-summary.md` (round 5, accepted; current uncommitted diff — build on it).
Owner of: `src/stores/gameStore.ts` (`compactPending()` / marker helpers only) and `src/stores/gameStore.test.ts`. No other files. No commit/push. No journal/save schema change. Escalated `npx.cmd vitest run <files>` and `npx.cmd vue-tsc --noEmit` allowed.

## Owner decision (2026-10-16)
When per-world summary/gap marker pairs would exceed the pending cap, merge the OLDEST worlds into one explicit combined marker pair (e.g. message `${JOURNAL_SUMMARY_PREFIX}較舊 N 個世界的紀錄缺口已合併…` / `${JOURNAL_GAP_PREFIX}…`). This is explicit, not silent: the message states how many worlds were merged. Newer worlds keep their own per-world markers.

## Required behavior
- Hard guarantee for ANY number of worlds: pending ≤ 256 records AND pending serialized size ≤ the existing 256,000-char cap after compaction, while still retaining the newest records it can.
- Combined marker: deterministic worldId choice documented in code comment (e.g. the oldest merged world's id, or a fixed sentinel string if the schema allows any string — do not change schema/types); merged count must be cumulative when an existing combined marker absorbs more worlds; must be recognized as a marker (prefix guard) so coalescing never writes into it.
- Round 4/5 behavior unchanged otherwise (coalescing, persisted replacement ids, per-world attribution while under cap, markJournalGap current-world only).

## Tests (RED first, record both)
- ≥129 distinct pending worlds (and a larger case, e.g. 1,000 worlds) under archive outage: pending ≤ 256, size ≤ cap, combined marker present with correct merged count, newest worlds keep per-world markers, newest records retained.
- Repeated compaction keeps the merged count cumulative; coalescing never targets the combined marker.
- Run `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` and `npx.cmd vue-tsc --noEmit`.

Output `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r6-sol-medium-world-cap-summary.md` (changes, RED/GREEN, risks); reply with only that path.
