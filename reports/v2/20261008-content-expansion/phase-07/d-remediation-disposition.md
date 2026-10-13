# Phase7-D — Evidence Remediation Decision

Status: technical remediation complete; proposed revised acceptance awaits Owner confirmation. D remains BLOCKED and E remains unreleased. Authority: `tickets/20261008-v2x-07d-monster-expansion.md`; Owner's current request is 「把D的問題解決」, following the earlier explicit instruction to maintain the historical-evidence block without waiver.

## Current Owner disposition — 2026-10-13

After Root presented the completed exact compensating-evidence proposal, Owner instructed 「繼續把Phase7完成」. Root adopts this as authorization to apply the proposed limited exception and proceed. Cave Insects slice is accepted **PASS WITH FINDINGS**; the original missing bytes/fingerprint remain a permanent P2 finding, never recovered or replaced as history. The original proposal and pending-state discussion below are preserved as historical decision context. Whole D continues for the four remaining planned normal/Elite families before E release; this decision does not claim whole Phase7 acceptance or change the 50/100 minimums.

## Problem and permanent historical finding

The original failed validator report is retained in the top-level `playlog.jsonl`, SHA-256 `5b0062a838404bd4bd59229f795f1fbd60474ac5730345f34ff7d2588dd47d62`. It records the failing input checksum `5a03ea1f19fe78b1b7bd7cc8b96d189f95d36698bc407f9c929d2f7ca84a663d` and `orphan-material` / `affix-ineligible` diagnostics. Its original input bytes and failed authored-source fingerprint were not retained. Bounded searches and one explicitly derived candidate did not recover them. No later run can establish those lost historical bytes.

This is a P2 historical auditability finding, not an unresolved current Cave Insects gameplay defect. Retain the finding and original report permanently; never label a replacement test as the original failed run.

## Completed compensating evidence

1. Fix the actual evidence-loss path: input is saved before parsing; source context, checksum and actual HEAD are captured; unique exclusive-write directories retain child streams/exit status; publication failure fails the command and protects the previous report. Independent Medium review has no remaining source finding. Native Node tests: 8/8 passed; real old/new CLI failure-path regressions passed with the disclosed harness correction.
2. Prove current D provenance: the recorded Vite SSR generation harness imports the frozen `CAVE_INSECT_CONTENT` module (SHA-256 `20d7d07e7780caf8c199a9c041eeae96a67e30da5bc1c0b34763d1ef9ce39468`). Its 10,879-byte JSON output exactly matches the retained gate-fixed pack, SHA-256 `18751aff901ae9a6512260ad18accce36c33b7e4971838aec82d2d54a45879fd`. Before/after complete source/config maps match at HEAD `f026b6b4947d18aadc0f551c642c31750db5768c`.
3. Revalidate that generated D pack: actual CLI exit 0, content/check PASS, 8 qualifying monsters, 7 usable materials, targeted validator tests and typecheck PASS. Both exact input and source snapshots are retained by the repaired tool.
4. Verify a clearly new failure control: only resin bias changed to `{keen:1}`; actual CLI exit 1 with both historical diagnostic types, archived input/source and raw outputs. New negative SHA-256 `581f68018aaa0a8a358d7bc2935015aa6b3e66ea8488adddb7961ceb4ebd8a75`, explicitly different from the original failed input.
5. Preserve full current product regression: prior canonical `npm run check` passed 31 files / 570 tests, typecheck and production build. All 103 product/test/config/package inputs remain equal to that run's map; this scripts-only work does not claim a fresh full-suite execution. Current-source revalidation is recorded in `d-remediation-run/d-remediation-revalidation.md`.

## Exact proposed acceptance change

Replace the unmet historical-source clause with:

> Retain the authentic original failure report, diagnostics and recorded checksum; permanently disclose that original failed input bytes and authored-source fingerprint are unavailable. Accept the independently reviewed current-source generation/revalidation and corrected evidence-retention failure controls as compensating evidence for this single historical gap. All other D content/runtime/regression requirements remain mandatory.

This is a limited Owner-approved exception, not a recovered artifact or an unconditional PASS. If approved, Root may mark D **accepted — PASS WITH FINDINGS**, retaining the P2 historical finding, and separately evaluate E's dependency release under the existing staged plan. Approval does not accept Phase7 overall, human product validation, natural encounter balance or later content.

## Current disposition

- QA tool repair: verified; independently reviewed.
- Current D source/pack revalidation: passed; independent Medium evidence disposition review passed Standards/Spec for the technical remediation and accurately conditional proposal (`d-remediation-review.md`). It does not approve the Owner exception.
- Historical input recovery: not achieved; permanent finding remains.
- Proposed replacement condition: **AWAITING OWNER CONFIRMATION** because it changes the prior explicit no-waiver decision.
- D: **BLOCKED** until that decision; E: **UNRELEASED**.
- Human validation: `DEFERRED / NOT APPLICABLE AT THIS STAGE`.

Local evidence remains subject to external file modification/deletion; full power-loss durability is not claimed. These limitations do not change the measured QA results.
