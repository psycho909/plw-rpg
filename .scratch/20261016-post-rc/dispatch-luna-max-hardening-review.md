# Independent review — Post-RC hardening (luna-max-hardening-review)

You ARE the assigned reviewer `luna-max-hardening-review`. Read-only: do not edit any file, do not delegate, do not use herdr, no commit/push. Read `.scratch/20261016-post-rc/common.md` for context rules.

## Under review (uncommitted, vs HEAD `6a15a2b`)
1. **B1 fix (product source):** `git diff src/stores/gameStore.ts src/stores/gameStore.test.ts`. `save()` now writes the uncompacted checkpoint first and calls the existing `compactPending()` + one retry only on a quota DOMException. Summary: `reports/v2/20261016-final-qa-rc/post-rc/sol-medium-b1-retention-summary.md`. Background: O-01 (`76595c5`) compacted unconditionally before every save, so an oversized legacy pending record was discarded before any archive flush even with healthy IndexedDB; pre-fix `b21ce0c` archived it. O-01 requirement still applies: an oversized legacy pending that does NOT fit the quota must compact and the world must continue without reset (`tickets/20261016-v2x-10r-o01-load-compaction.md`, external review §E O-01 in `reports/v2/20261016-final-qa-rc/phase-10/Oakvale-V2x-External-Code-Review-Verification.md`).
2. **New test files (no product change):** `src/engine/postRcDeterminism.test.ts` (G-05) and `src/engine/postRcS02Defender.test.ts` (S-02) with summaries in `reports/v2/20261016-final-qa-rc/post-rc/`.

## Check
- B1: root cause really removed; O-01 still holds; no new data-integrity issue: `persisted`/`inFlight`/flush semantics, partial failure between the two writes, retry failure path, non-quota errors, IndexedDB same-id/different-content, pending cap behavior (pending may now exceed the cap in the checkpoint until the next `record()` — is that acceptable vs the Phase10-R P2-01 contract in `tickets/20261016-v2x-10r-external-review-fixes.md`?), read-only preview, reset path. Tests meaningful (would fail on HEAD)? Any existing rule silently changed?
- G-05 test: does it really compare continuous vs save/reload replay without masking (state replaced by the restored object, all listed fields compared)? Are fixture edits legitimate preconditions?
- S-02 test/summary: is "PRODUCT DECISION REQUIRED" justified by the cited spec, or is there a clear spec violation? Is the test asserting current behavior honestly?
You may run `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts src/engine/postRcDeterminism.test.ts src/engine/postRcS02Defender.test.ts` (escalation allowed).

Final message (≤ 50 lines): verdict APPROVE / CHANGES REQUIRED, findings by severity with file:line, failure scenario and suggestion; what you ran.
