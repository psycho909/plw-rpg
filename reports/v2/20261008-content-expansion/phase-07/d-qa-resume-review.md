# Phase 7-D QA Continuation Review

- Date: 2026-10-13 (Asia/Taipei).
- Scope: review the QA continuation artifacts and test-runner configuration at working-tree state based on HEAD `fd6b5e84bef73d5dc429201c903d4a867976cd0a` on `v2x/reward-core`.
- Reviewer: requested GPT-6 Luna / medium (`g6_luna_med_qa_reviewer`); runtime model telemetry unavailable, so the actual backend model is unknown. Reviewer did not participate in implementation.
- Method: read-only review of the listed uncommitted files and artifacts; no tests, source changes, or mutating Git operations performed.

## Scope and integrity

Reviewed `vite.config.ts`; `d-timeout-diagnosis.md`, `d-timeout-diagnosis-run/`, `d-evidence-recovery-20261013.md`, `d-root-closeout.md`; the latest D and parent tickets; `.scratch/20261013-phase7-d-qa/handoff.md`; and the appended `playlog.jsonl` records. Working-tree inventory also showed the D module, registry integration and tests as uncommitted; these were checked by frozen SHA-256 against the prior review, not re-reviewed for D semantics.

- Base and HEAD: `fd6b5e84bef73d5dc429201c903d4a867976cd0a` (same commit).
- Git scope inspection: `git rev-parse HEAD`, `git status --short`, and `git diff -- vite.config.ts`; base and HEAD both resolve to `fd6b5e84bef73d5dc429201c903d4a867976cd0a`, so there is no committed branch delta to review. No staged paths. Untracked review artifacts were read in full; raw logs and maps were inspected directly.
- `vite.config.ts`: SHA-256 `becf40818c32c8a55aea3c51276d1a6be6e4c7243b06fad512ece24b7a10a771`. Its diff only sets `test.maxWorkers: 1`; `include: ['src/**/*.test.ts']` is preserved. `src/services/saveService.test.ts` still contains the same 500-year test and explicit `15000` ms timeout. No simulation, assertion, timeout, package, or production implementation edit is part of this runner correction.
- Canonical run maps contain 103 path hashes; `before.sha256` and `after.sha256` compare byte-identically, and both fingerprint files read `9849349e05bf490b369fa0b011bb68e90fa0ccc6c04ebb958b886fb17a5a32c0`. Run metadata records base HEAD, `npm run check`, exit 0, and 2026-10-13 01:10:56–01:11:37 UTC. Raw stdout records 31 files / 570 tests passed and the typecheck/build; it does not report the individual 500-year test duration.
- Controlled probe stdout and metadata agree with the diagnosis table: default run exited 1 with the 500-year test at 15,661 ms and 569/570 tests; two-worker run exited 0 with 570/570; verbose default exited 0 with the target at 14,938 ms; verbose two-worker exited 0 with target at 13,863 ms. Runs are recorded sequentially. The evidence supports a borderline timeout and possible scheduling contribution, but does not prove root cause.
- Frozen prior-review hashes match: `caveInsects.ts` `20d7d07e7780caf8c199a9c041eeae96a67e30da5bc1c0b34763d1ef9ce39468`; `contentRegistry.ts` `b92ef40d3351ac6a9b873d64ce109147b58c3942a730915a164a615001855bd5`; integration test `39cb92540977d7efd5030018725f063e528409cff1b761459f3e4c52731e9747`; crafting test `031cda43d2b6ad37a164510386bbf0f749bb5272bd71d95def7425d7373586ad`; projection test `df6440ddcc2320ee7193027daae866cf86b4cacf6bdf26efb131e7b36e008a92`.
- Latest archive records for `d-timeout-diagnosis.md` and `d-root-closeout.md` decode to the recorded byte counts and matching SHA-256 values (`5b482ac1…c11c87d` and `6a4ed8ba…a0039479`). `playlog.jsonl` SHA-256 is `73948565825d6949ca32c64ba4d926811605bd183a83c8690629da94d150451f` at review time. Earlier entries also passed the same content-length/hash check. Parent confirmed the 103-source-map `sha256sum --check`, before/after comparison and whitespace check passed; this review did not rerun them.

## Standards

**PASS for the QA continuation.** The config change is narrow and test-only; retained logs, metadata, source maps, and append-only capture records make the diagnosis auditable. The documents consistently distinguish observed results from hypotheses. No continuation-specific standards finding.

## Spec

**PASS for the authorized QA continuation; D acceptance remains BLOCKED.** The continuation records the requested controlled worker comparison, canonical one-worker check, bounded evidence-recovery result, and WIP handoff. Its claims match the logs, hashes, and tickets. It does not recast a later pass as erasing the earlier failure or assert a proven timeout cause.

The original D acceptance condition remains unmet: the failed authored source fingerprint and original pack bytes were not recovered. The Owner's no-waiver instruction remains explicit, and both D and parent records keep D blocked and E unreleased. The WIP handoff is authorized by the standing working-branch authority in `README.md` and `docs/HANDOFF.md`; preserving unfinished source does not satisfy D acceptance. Prior D semantic review remains at the frozen hashes above: Standards PASS; Spec PASS WITH FINDINGS, including this unresolved historical-evidence gap.

## Disposition and limits

The QA continuation and its blocked WIP handoff are acceptable to preserve. This review does not accept D, waive its evidence requirement, release E, or evaluate the Phase 7 final gate. No runtime command was run as part of this review; canonical verification is established from the retained raw output and matching source maps.
