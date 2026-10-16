# B1 implementation — safe archive transfer before first checkpoint write (sol-medium-b1-transfer)

You ARE the assigned worker `sol-medium-b1-transfer`. Read `.scratch/20261016-final-data/common.md`.
Read the approved design FIRST and implement exactly it: `reports/v2/20261016-final-qa-rc/final-hardening/b1-retention-design-review.md`.
Do NOT reuse `reports/v2/20261016-final-qa-rc/post-rc/b1-retention-proposal.patch` (rejected: it lets a written checkpoint exceed the pending cap).
Owner of: `src/stores/gameStore.ts` (writer acquisition path + one new transfer helper; keep `compactPending()` algorithm, `record()`, `flushJournal()` unchanged; KEEP the unconditional `compactPending()` in `save()`) and `src/stores/gameStore.test.ts`.

## Behavior to implement
- Only when, after `loadCheckpoint(true)` in the writer-acquired callback, `journal.pending` exceeds the cap (> MAX_PENDING_RECORDS or size+1 > MAX_PENDING_CHARS, same measure as `compactPending`): keep `writerReady=false`/`writerPending=true` (existing UI state), transfer pending to the archive with `repository.appendBatch` in batches of 64 (original ids/content), removing acknowledged ids from `journal.pending` after each successful batch; on failure retry up to 3 attempts total with 1 s then 2 s delays, each attempt bounded by a 5 s timeout. Then set ready exactly as today and call `save()` (which compacts whatever remains). Otherwise keep today's synchronous path byte-for-byte.
- No checkpoint write of any kind before the transfer ends. If the store is disposed during the transfer, stop: no save, no ready.
- Do not touch `persisted`/`inFlight` semantics for the normal flush; the transfer runs before flush can run (flush requires `writerReady`).

## Tests (RED first; record failing output, then GREEN)
Cover the matrix (fake timers + mocked `createPlayJournal`, like existing tests):
1. Archive healthy + oversized legacy pending that fits quota → `appendBatch` received the original `legacy-large` intact; first written checkpoint pending ≤ 256 / ≤ 256,000 chars; no write happened before the transfer finished. (RED on HEAD.)
2. Oversized legacy pending that does NOT fit quota + archive healthy → archived intact, then save succeeds within cap, world continues (no reset).
3. Archive failing for all attempts → after retries, compaction markers saved within cap, world continues; total wait bounded.
4. Archive fails once then recovers within the retry window → archived intact, no markers.
5. Lost ack: first appendBatch commits (record the ids) but rejects; retry resends the same records; mock that skips identical ids → no duplicate ids, no different-content conflict, archived intact.
6. Multi-world legacy pending (two worldIds incl. existing markers) → transferred as-is; checkpoint `worldId` unchanged.
7. Reload after transfer → same world; nothing re-sent beyond identical skips.
8. Reset after transfer works and persists under quota (existing reset test intent).
9. Read-only (writer lock not granted) → no transfer, no writes.
10. Normal-size pending → path unchanged (no transfer call before ready).
Existing O-01 tests must keep their intent; adjust only async timing and explain each adjustment.
Run `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` and `npx.cmd vue-tsc --noEmit`.
