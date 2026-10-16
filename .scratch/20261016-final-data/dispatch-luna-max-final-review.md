# Independent review — final data-integrity hardening (luna-max-final-review)

You ARE the assigned reviewer `luna-max-final-review`. Read-only: do not edit any file, do not delegate, do not use herdr, no commit/push. Read `.scratch/20261016-final-data/common.md`.

## Under review (uncommitted vs HEAD `037289d`)
1. **B1 implementation** — `git diff src/stores/gameStore.ts src/stores/gameStore.test.ts`; approved design `reports/v2/20261016-final-qa-rc/final-hardening/b1-retention-design-review.md`; worker summary `reports/v2/20261016-final-qa-rc/final-hardening/sol-medium-b1-transfer-summary.md`. A previous proposal was REJECTED because a written checkpoint could exceed the pending cap (`reports/v2/20261016-final-qa-rc/post-rc/b1-retention-proposal.patch`) — make sure this one cannot.
2. **S-02 characterization tests** — `git diff src/engine/postRcS02Defender.test.ts`; summary `reports/v2/20261016-final-qa-rc/final-hardening/luna-medium-s02-matrix-summary.md`. No product change; check the tests assert real behavior and the conclusion (only the 16-row ledger ceiling violates the Owner rule) is correct.

## Owner invariants for B1 (all must hold)
1 pending ≤ 256 records and 2 ≤ 256,000 chars in every written checkpoint; 3 archived data not archived twice; 4 no same-id/different-content; 5 no item/gold/world corruption; 6 save/reload continues the same world; 7 read-only preview writes nothing; 8 archive failure never blocks the world permanently; 9 no unconfirmed deletion of legacy records that could be fully preserved; 10 any unavoidable loss has an explicit, traceable policy.

## Check specifically
- No checkpoint write of any kind before the transfer ends (incl. pagehide/flush/loop/reset/startLife paths and `canProgress()`); writer readiness flips once; dispose mid-transfer.
- Retry/timeout bounds; a late-resolving `appendBatch` after timeout; partial batch success; mismatch abort; lost ack.
- `persisted`/`inFlight` unchanged for normal flush; normal-size pending path unchanged.
- Existing O-01 test timing adjustments keep their intent.
- Any rule silently changed? Any new release blocker?
You may run `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts src/engine/postRcS02Defender.test.ts` (escalation allowed).

Final message (≤ 50 lines): verdict APPROVE / CHANGES REQUIRED, findings by severity with file:line, failure scenario, suggestion; what you ran.
