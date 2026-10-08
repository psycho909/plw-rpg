# Phase 7-B Loot Selection Contract — Independent Delta Review

- Scope: delta review of monster-selected `lootTableId`, actual loot identity/source/utility graph, selected-table unused warning, and final report provenance. Prior B review remains in `b-independent-review.md`.
- Base anchor: `11980b796f88173cf05ef83ac41510a0d44a53b1`; final B source is a shared-worktree snapshot.
- Final reviewed fingerprint (domain + validator + tests + runner): `59d1d8b358e2d25e15bb0fec52cb82f1775fa8ffeeff24fc416f20610e6b32de`.
- Reviewer: requested role `g6-luna-med-reviewer`; runtime model unknown; not involved in implementation.
- Method: targeted read-only delta audit; no full suite rerun.

## Standards

**Result: PASS.** The final report provenance matches the reviewed files and correctly includes the selected-table unused-warning adjustment and 16-test result. Family defaults and explicit per-monster selections both count as references for the unused-table diagnostic.

## Spec

**Result: PASS for the approved B/C handoff contract.** The family `lootTableId` remains the default reference; a reachable monster's own resolved `lootTableId` drives its actual material/equipment source evidence and monster effective-loot fingerprint. Missing monster-selected table IDs are rejected by reference validation. A table selected by monsters from different families does not establish a family-specific loot identity for qualifying those monsters. Selected tables remain valid source evidence and are not incorrectly reported unused.

The focused regression fixture splits two same-family monsters across separate selected tables, verifies each table's material reaches a consumer, verifies both monsters qualify, and verifies the selected table is not warned as unused. A separate negative fixture verifies an unresolved selected table produces `unknown-reference`.

## Provenance and verification

- Recomputed file hashes match `content-validation.md`: `src/domain/content.ts` `dd9d3eedac08df9b47af1e16d6f0610190378450e90a768079b574e0aa2408ba`; `src/engine/contentValidation.ts` `1c44bfa79e0e37f3fa601a5e3832925a8c0b63e2cd2c6dec30176586aab7565e`; `src/engine/contentValidation.test.ts` `484c9e8e528311574ba21139bc9c68b7ab74377da3cbc1893ecac71c65a08226`; `scripts/validate_content_batch.mjs` `c40e157d2c3395cf2b7179c99aa26aa4fb5364a026e4575358626ef23cf06164`.
- Recomputed aggregate `59d1d8b358e2d25e15bb0fec52cb82f1775fa8ffeeff24fc416f20610e6b32de` matches the regenerated report.
- Recorded validation: 16/16 focused tests, batch PASS, typecheck PASS. Reviewer did not rerun tests or typecheck; no full suite rerun.
- Runtime loot integration remains outside B; C must independently verify the runtime consumer path.
- No changes made by reviewer.
- **Disposition: ACCEPT this B/C contract delta for Root's release decision.**
