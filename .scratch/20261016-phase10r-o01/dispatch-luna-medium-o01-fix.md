# Phase10-R O-01 fix (luna-medium-o01-fix)

You ARE the assigned worker `luna-medium-o01-fix`. Do the work yourself; do not delegate and do not use herdr.
Ticket: `tickets/20261016-v2x-10r-o01-load-compaction.md`. Finding: `reports/v2/20261016-final-qa-rc/phase-10/Oakvale-V2x-External-Code-Review-Verification.md` §E O-01 (read it).
Owner of: `src/stores/gameStore.ts` and `src/stores/gameStore.test.ts` only. No commit/push. No schema change. Do not change `compactPending()`'s algorithm.
Escalation allowed: `npx.cmd vitest run <files>`, `npx.cmd vue-tsc --noEmit` (single standalone commands).

## Problem
`compactPending()` runs only inside `record()`. A loaded checkpoint whose journal pending exceeds the cap (256 records / 256,000 chars) is re-saved as-is; if that exceeds quota, `save()` keeps failing and `canProgress()` blocks the world until `reset()`.

## Required fix (minimal)
Apply the existing `compactPending()` before the checkpoint is serialized in `save()` (preferred: covers load, flush and every save path), or in the writable `loadCheckpoint` path. Keep `persisted`/`inFlight` semantics correct: records dropped by compaction must not be resent, markers are new pending records. Read-only preview (`loadCheckpoint(false)`) must not mutate/write.

## Tests (RED first; record failing output, then passing)
- Load a legacy checkpoint with oversized pending (e.g. one 5,000,000-char record like the existing test at `gameStore.test.ts:339`), localStorage quota 5M, archive unavailable; then a public action such as `advance(1)` (or whatever the store exposes): save succeeds without reset, `saveError` empty, saved pending within cap, contains summary/gap markers for `legacy-world`, world not rebuilt (same world/time progression).
- Existing test `compacts oversized legacy pending data so reset persists under quota` may now not observe an initial save failure; adjust minimally so it still proves reset under quota works, and say what you changed.
- Run `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` and `npx.cmd vue-tsc --noEmit`.

Output `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r7-luna-medium-o01-fix-summary.md` (changes, RED/GREEN output, risks); reply with only that path.
