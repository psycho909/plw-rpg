# Task Handoff

## Identity

- Task: Phase7-D Cave Insects and QA continuation.
- Authority / Ticket: `tickets/20261008-v2x-07d-monster-expansion.md`; parent Phase7 specification/ticket remain the scope authority.
- Status: blocked.
- Updated: 2026-10-13 (Asia/Taipei).
- Source environment: `/workspace/plw-rpg`, Linux cloud, Node 24.19.0 / npm 11.9.0.
- Branch: `v2x/reward-core`.
- Remote: `origin` (psycho909/plw-rpg).
- Base commit: `fd6b5e84bef73d5dc429201c903d4a867976cd0a`.
- Latest verified remote checkpoint before the current QA repair: `f026b6b4947d18aadc0f551c642c31750db5768c` (HEAD and explicit work-branch remote matched).
- Current delivery: completed preventive validator evidence-retention repair and its QA artifacts; D source/tests/config are preserved in the prior checkpoint and unchanged. The next commit preserves this blocked state; it is not D acceptance.
- Sync target: `origin/v2x/reward-core`.

## Goal and Acceptance

Complete only the approved Cave Insects D slice. D requires original failure/source/fingerprint evidence and independent review. E requires a later Root release. Owner earlier chose to maintain D blocked; latest 「把D的問題解決」 authorized a completed compensating-evidence dossier. The exact proposed exception still requires confirmation before replacing that earlier explicit decision.

## Completed

- D source/runtime changes were independently reviewed: six normal + two Elite mine encounters, level3+ AND (village OR threat2+) gate, selected useful loot, chitin spear craft/equip/save-reload closure, and actual guard combat turns. Frozen file hashes and prior review are in `reports/v2/20261008-content-expansion/phase-07/d-root-closeout.md`.
- Targeted 3 files / 73 tests passed. Initial default-suite failures remain in `d-full-regression-red.md`, `d-full-regression-red-2.md`, and the append-only local playlog archive.
- Bounded original-evidence recovery found no matching original failed pack bytes/source fingerprint; see `d-evidence-recovery-20261013.md`. Later packs are not substitutes.
- Timeout diagnosis preserved raw runs and complete source maps; the unchanged default target timed out once and passed another time near 15 seconds. Causality remains unconfirmed.
- `vite.config.ts` now uses one test worker; the 500-year loop, test assertions and 15-second timeout are unchanged. Canonical `npm run check` passed 31 files / 570 tests plus typecheck/build on 2026-10-13. Source/config fingerprint: `9849349e05bf490b369fa0b011bb68e90fa0ccc6c04ebb958b886fb17a5a32c0`.
- Latest raw evidence: `reports/v2/20261008-content-expansion/phase-07/d-timeout-diagnosis-run/maxworkers-1-check/`.
- Independent Medium continuation review: Standards PASS, Spec PASS for the QA continuation and blocked handoff; `reports/v2/20261008-content-expansion/phase-07/d-qa-resume-review.md`. D semantic hashes match the previous reviewed snapshot.

## Remaining

- Current D pack was freshly generated from the frozen source and exactly matches the retained passing pack. Real positive CLI passed; a new resin/keen negative fixture produces both historical diagnostics with input/source retained. Technical remediation is complete. The specific proposed revised acceptance and remaining historical finding are in `d-remediation-disposition.md`; independent evidence review is `d-remediation-review.md`.

- Preventive QA repair is done: 8 native tests, exact old CLI malformed baseline and four current CLI scenario types verified; five current invocations include the retained E harness error and corrected valid-input attempt. Independent Medium review has no open source findings. See `d-evidence-retention-engineering.md`, `d-evidence-retention-review.md` and `d-evidence-retention-run/d-evidence-retention-regression.md` beside the closeout. Initial RED/behavioral reproduction chronology is documented, not invented.
- One explicitly derived candidate failed to match the expected historical checksum; `d-evidence-reconstruction-check.md` is not original evidence recovery.

- D acceptance requires the authentic missing original artifact/provenance; E remains unreleased.
- Phase7 later stages, natural exposure/balance, browser soak and the final Phase7 gate are not completed by this QA continuation.

## Decisions

- Do not recreate a failed input and call it the original. Original expected failed-pack SHA-256: `5a03ea1f19fe78b1b7bd7cc8b96d189f95d36698bc407f9c929d2f7ca84a663d`.
- Archived original failure report SHA-256: `5b0062a838404bd4bd59229f795f1fbd60474ac5730345f34ff7d2588dd47d62`; it contains diagnostics and the failed pack SHA, not the missing pack bytes/module fingerprint.
- Human validation: DEFERRED / NOT APPLICABLE AT THIS STAGE.
- A blocked WIP Git checkpoint is permitted under the standing branch authority and repository handoff policy; it does not waive the acceptance condition.

## Changed Files

- D pack source, registry and runtime/legacy crafting tests; see the D closeout for exact file hashes.
- `vite.config.ts` (test workers only).
- D recovery/diagnosis/closeout reports, raw run directories, `playlog.jsonl`, D and parent tickets, this handoff.
- No production changes were added during the 2026-10-13 QA continuation.
- Current QA-only repair: `scripts/validate_content_batch.mjs`, new evidence helper and native tests, scripts README, source-linked repair/review/regression artifacts, D/parent tickets and this handoff. Product/test/config/package map remains unchanged; no full suite rerun claimed for the scripts-only repair.

## Verification

- Current repair delivery: both runner artifact checksum files pass; seven run input/source manifests and their fingerprints verify; original failure report and HEAD archive prefix remain intact. Frozen scripts match the reviewed hashes. The new unqualified staged whitespace check failed only on seven captured `targetedTests.stdout.txt` ending blank lines; strict non-exception paths and raw-only invocation-specific EOF exception both pass, with exact staged/raw bytes preserved. No raw evidence normalization or global Git setting changed.

- Latest canonical full check: PASS once, with raw evidence and matching 103-entry before/after source map.
- Prior failures remain retained. No claim of a product-performance root cause or full Phase7 acceptance.
- Final staged source check matched all 103 tested input hashes. Unqualified staged whitespace check failed only on five raw Vitest logs' ending blank lines; exact raw output is retained. Strict checking of all non-log files passed; the raw-log-only invocation with `-c core.whitespace=-blank-at-eof` passed. Independent Medium verification accepted this scoped EOF exception; no global Git setting changed. The original failure is recorded in the D closeout.
- Remote tracking defaults cover only main in this checkout. Use the explicit refspec to refresh the work branch:
  `git fetch origin refs/heads/v2x/reward-core:refs/remotes/origin/v2x/reward-core`

## Blockers

Original failed authored-source SHA/fingerprint and failed pack bytes are unavailable. A concrete alternative has now been prepared after Owner's resolve-D request; the exact replacement clause is awaiting Owner confirmation. Do not reinterpret D as accepted or release E before that decision.

## Suggested Skills

- `matt-skills-curated:code-review` for any new correction, under `docs/agents/review.md`.
- `matt-skills-curated:diagnosing-bugs` only if a new reproducible failure appears; do not repeat already passed checks without a new change or concern.
- `cloud-environment:cloud-environment-runtime` at cloud resumption.

## Next Action

Obtain Owner's decision on the exact replacement clause in `d-remediation-disposition.md`. If explicitly approved, record that authority in the D ticket, retain the historical P2 finding and mark D accepted with findings, then separately decide E release under the existing plan. If declined, keep D blocked; authentic newly supplied original artifacts remain another route. Do not repeat the already-negative search or completed tests without new evidence/change.

Exact resume prompt: `Read .scratch/20261013-phase7-d-qa/handoff.md, the D ticket and d-remediation-disposition.md. Technical remediation and current-source validation are complete; verify whether Owner explicitly approved the proposed replacement clause before changing D/E gates.`
