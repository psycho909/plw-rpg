# Phase 7-C4 Corrective Diff — Independent Follow-up Review

## Scope and provenance

- Ticket: `tickets/20261008-v2x-07c-first-content-batch.md` (L3; Root acceptance required).
- Review compares the corrective working-tree snapshot against source commit `9b13e7b9f45a60e175d8a278a822e951b1f46f9d`; repository HEAD during review was `f0c9171faf7eb45528e627e3a0d3fde3a1b4dc81`.
- Exact reviewed source files: `src/data/contentRegistry.ts`, `src/engine/contentFamilies.ts`, `src/engine/itemGeneration.ts`, `src/engine/rewardState.ts`, and `src/services/saveService.test.ts`.
- Compact path→SHA-256 map fingerprint before and after review: `fc27dd89b3791d702e877cf9b3bb6ec7d5161d95a88fba2bb076c51d3ad0c9b1`.
- Reviewer: independent of implementation; requested model/effort `gpt-6-astra/max`. Runtime telemetry is unavailable, so this records the request, not a claim about the backend model actually used.
- Reviewer made no file changes and did not rerun the full suite.

## Standards — PASS

- Removed the two unused boss-classification helpers identified as P3 in the initial review; no generation behavior changed.
- Removed the two reported extra EOF blank lines.
- Independent `git diff --check` against the reviewed source and fixed baseline both exited 0.

## Spec — PASS

- `normalizeRewardV3MaterialKeys` now constructs the owner map with `Object.fromEntries`, preserving `__proto__` as an enumerable own property rather than mutating the object prototype.
- Existing known-owner validation can now see and reject a special-key owner when it is not a known character.
- Independent memory verification passed: a valid Save7 special owner survived migration and five Save8 save/reload cycles with the own key, material values, RNG state, and world time preserved; an unknown special-key owner was rejected.
- Reviewer verified `c4-proto-owner-red.md` against its captured archive byte-for-byte; SHA-256 `1c16da05637c83d876b6719349171f994d58f8465719a1214ae9cbd22b8cd2c8`.

## Verification evidence supplied by Root

- Test-first RED: `npm run test -- src/services/saveService.test.ts -t special` — exit 1, both new assertions failed against the pre-fix implementation; exact output is preserved in `c4-proto-owner-red.md`.
- Focused GREEN: same command — 1 file, 2 matching tests passed (105 skipped).
- Full check after the correction: `npm run check` — 30 test files / 567 tests passed, `vue-tsc --noEmit` passed, and production Vite build passed.
- Source whitespace check: `git diff --check -- src/` — exit 0.
- These are Root-provided run records; the independent reviewer did not rerun them.

## Disposition

**Standards PASS; Spec PASS; no remaining finding in this corrective diff.** This closes the initial P2 data-loss finding and P3 cleanup finding for the reviewed source snapshot. It does not by itself accept or release C, accept D, or claim Phase7 / product / human validation; those decisions belong to Root and the relevant Owner gate.
