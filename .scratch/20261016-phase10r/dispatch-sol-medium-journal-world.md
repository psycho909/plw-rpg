# Phase10-R fix round 5 — compaction must not cross worldId (sol-medium-journal-world)

You ARE the assigned worker `sol-medium-journal-world`. Do the work yourself; do not delegate and do not use herdr.
Read `.scratch/20261016-phase10r/common.md` (rules apply). Context: `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r4-sol-medium-journal-coalesce-summary.md`; current uncommitted diff is accepted work — build on it.
Owner of: `src/stores/gameStore.ts` (`compactPending()` and directly related marker detection only) and `src/stores/gameStore.test.ts`. No other files. No commit/push. No journal/save schema change. Escalated `npx.cmd vitest run <files>` and `npx.cmd vue-tsc --noEmit` allowed.

## Independent review finding (confirmed by lead)
P2 `src/stores/gameStore.ts:63` — `compactPending()` builds summary/gap markers with the current `journal.worldId`, but `reset()` (`gameStore.ts:170`) switches to a new world id while keeping the old world's pending records. Over-cap old-world records can therefore be compacted into markers attributed to the NEW world, losing the source of the old world's history gap. Existing reset test (`gameStore.test.ts:344`, builds oversized `legacy-world` pending) never checks marker `worldId`.

## Required behavior
- Compaction never merges records across worldIds: dropped records produce summary/gap markers per source worldId (from/to computed per world), placed so pending order stays chronological; existing markers are only merged with markers of the same worldId. Marker detection must not assume exactly one leading pair.
- Pending cap (≤256 records, size cap) still holds; reset under quota still persists; coalescing from round 4 unchanged.

## Tests (RED first, record both)
- Reset with oversized legacy-world pending: every marker covering legacy records has `worldId: 'legacy-world'`; no marker for the new world claims legacy ranges; cap holds; reset checkpoint persists.
- Mixed worlds over cap: markers per world with correct from/to.
- Run `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` and `npx.cmd vue-tsc --noEmit`.

Output `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r5-sol-medium-journal-world-summary.md` (changes, RED/GREEN, risks); reply with only that path.
