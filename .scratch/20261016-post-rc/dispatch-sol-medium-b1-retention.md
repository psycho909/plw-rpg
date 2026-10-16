# B1 fix — keep legacy pending archivable; compact only when the save does not fit (sol-medium-b1-retention)

You ARE the assigned worker `sol-medium-b1-retention`. Read `.scratch/20261016-post-rc/common.md` (rules apply).
Owner of: `src/stores/gameStore.ts` (`save()` only) and `src/stores/gameStore.test.ts`. No other files. No schema change. Do not change `compactPending()`'s algorithm, `record()`, `flushJournal()`, or `loadCheckpoint()`.

## Confirmed defect (Lead RED, 2026-10-16)
O-01 (`76595c5`) added `compactPending()` unconditionally before serialization in `save()`. Since the writer's first save happens synchronously on lock acquisition, an oversized legacy pending record is now discarded into summary/gap markers BEFORE any archive flush, even when IndexedDB is healthy and the checkpoint would have fit. Pre-fix (`b21ce0c`) the first save rewrote the pending and `requestJournalFlush` archived the legacy record.
Lead probe (scratch, deleted): load a legacy checkpoint with one 400,000-char pending record `legacy-large`, healthy mocked `appendBatch` collecting ids, advance fake timers → HEAD appends only 2 marker ids (FAIL); `b21ce0c` appends `legacy-large` (PASS).

## Required minimal fix
In `save()`: first try the existing write of the uncompacted checkpoint. Only if `localStorage.setItem` throws a quota error (`DOMException` name `QuotaExceededError`, or legacy codes 22 / 1014 / name `NS_ERROR_DOM_QUOTA_REACHED`), call the existing `compactPending()` and retry the write ONCE. Any other failure, or a failing retry, keeps the existing failure branch unchanged. `persisted` must still be rebuilt only after a successful write, from the pending actually written. Keep a short code comment explaining why compaction is a fallback (archive retention vs O-01).
Must keep O-01: an oversized legacy pending that does NOT fit the quota still compacts and the world continues without reset.

## Tests (RED first, record both outputs)
1. New: healthy archive + legacy 400,000-char pending that fits quota → after load and timers, `appendBatch` received `legacy-large` (fails on current HEAD, passes after fix).
2. Existing O-01 tests (`compacts oversized legacy pending on load and continues the same world under quota`, the reset-under-quota test) must still pass unchanged in intent; adjust only if the observable sequence legitimately changes, and explain.
3. New: non-quota setItem error (e.g. `new Error('disabled')`) does NOT compact pending (pending ids unchanged) and reports the existing save failure.
Run `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` and `npx.cmd vue-tsc --noEmit`.

Output `reports/v2/20261016-final-qa-rc/post-rc/sol-medium-b1-retention-summary.md` (diff summary, RED/GREEN output, risks). Reply with only that path.
