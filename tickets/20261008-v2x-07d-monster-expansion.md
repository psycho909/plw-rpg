# Phase7-D — Monster Expansion

- Status: blocked
- Risk: L2
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-13（Asia/Taipei）

## Goal / Scope

分批普通／Elite資料接入；自動計數與至少兩項identity差異，明確檔案ownership，目標至少50合格新增定義的一部分。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [x] 本stage實作與合法來源／用途閉環完成；validator、targeted tests、full regression與build均有證據。2026-10-13測試runner改採單一worker後，正式`npm run check`通過31files/570tests、typecheck/build；先前並行timeout原始紀錄保留，故為PASS WITH FINDINGS。
- [ ] 原始failure/sourceSHA/fingerprint/report保留；適用Medium/Max獨立review及Root acceptance。
- [x] 下一階段僅在Root release後施工；E尚未release且未開始施工。

## Dependencies

Dependency released by Root on 2026-10-12 after local Phase7-C acceptance. D implementation/verification is complete with findings, but acceptance is blocked by the missing original failed authored-source SHA/fingerprint. Owner directed on 2026-10-12 to maintain the block without waiver; E remains unreleased.

## Evidence

`reports/v2/20261008-content-expansion/phase-07/d-root-closeout.md`；validator and default-regression RED evidence are archived in the adjacent `playlog.jsonl`.

## Root release — 2026-10-12

- C closeout: `reports/v2/20261008-content-expansion/phase-07/c-c4-closeout.md`.
- D content ownership is isolated to `src/data/content/caveInsects.ts`; follow the approved Phase7 content plan and existing pack/validator contracts. This stage covers ordinary/Elite expansion only. Do not add Mini Boss/Boss work (E), broaden shared core/runtime architecture, alter the product scope, or edit the shared registry concurrently. If the current schema/validator makes the staged D slice impossible without overlapping E/F or core work, report the exact blocker and stop rather than widening scope.
- Authoring should preserve two evidenced identity axes (implemented supported combat mechanic and real sourced/useful loot); use reachable existing mine/progression predicates, exclude village/farmland, and do not claim natural encounter frequency from controlled validator witnesses.
- Follow the already-approved Cave Insects closure as the minimum bridge: six normal + two Elite definitions, their family-local sourced/useful loot, and one `cave_insect_chitin` → `cave_insect_chitin_spear` recipe/equipment path. Do not expand to the remaining family equipment/recipes reserved for F. Resolve the plan's conflicting closure example by following its detailed roster table: `cave_insect_digger` sources chitin and `cave_insect_skitter` sources leg; preserve both listed identities.
- To avoid shared-registry contention, the worker authors/validates the isolated module only. Root owns subsequent shared-registry integration and the full D regression gate; no runtime availability claim until that integration passes.

## Root verification and blocker — 2026-10-12

- Content batch validation: final gate-fixed pack PASS (8 qualifying monsters, 7 usable materials, 0 errors/warnings); targeted runtime regression 3 files / 73 tests PASS; typecheck and diff check PASS.
- Full suite: default `npm run check` failed twice on the same 15-second 500-year save-continuation test. Whole Vitest suite passed with `--maxWorkers=1` (31 files / 570 tests); separate production build passed. Preserve both default failures; do not claim the default check passed.
- Independent Medium review: Standards PASS; Spec PASS WITH FINDINGS. The original first validator report/diagnostics, failing pack SHA and report SHA are in `playlog.jsonl`, but the failed pack bytes and failed authored-module SHA/fingerprint were not retained. This historical gap cannot be repaired by substituting a later passing source.
- D code/runtime verification: PASS WITH FINDINGS. D ticket acceptance remains BLOCKED on its explicit source-evidence condition; no D commit/push or E release. Owner direction received on 2026-10-12: maintain the block, no waiver.
- Complete evidence: `reports/v2/20261008-content-expansion/phase-07/d-root-closeout.md`.

## Root QA continuation — 2026-10-13 (Asia/Taipei)

- Owner's request to continue does not waive the 2026-10-12 decision: D stays blocked and E remains unreleased.
- Continue bounded original-evidence recovery and the existing default-suite timeout diagnosis. Preserve raw output, exit status, HEAD and hashes of the actual uncommitted source.
- Root authorizes a test-only scheduling correction in `vite.config.ts`: use one Vitest worker for the ordinary complete suite. Fresh default runs still vary around the unchanged 15-second 500-year test limit; a two-worker measured pass had only about 1.1 seconds of margin, while the earlier single-worker whole-suite run passed. Keep the 500-year simulation, assertions, timeout, and all production source unchanged. Re-run canonical `npm run check` with raw evidence and independent Medium review. This is a resource policy, not a proven product-performance fix.
- Result: canonical `npm run check` passed once (31 files / 570 tests, typecheck and production build), 09:10:56–09:11:37 Asia/Taipei. Raw logs and before/after 103-entry source fingerprint are in `d-timeout-diagnosis-run/maxworkers-1-check/`; no new assertion or timeout change.
- Evidence recovery did not locate the original failed pack/source; see `d-evidence-recovery-20261013.md`. D remains blocked. Independent Medium continuation review passed Standards and Spec; see `d-qa-resume-review.md`. It confirms the narrow scheduling change, unchanged D source hashes, raw run results and retained historical failures; it does not accept D or release E.
- The earlier no-commit statement described the initial hold; it is not a prohibition on preserving an unfinished checkpoint. Root will follow `docs/HANDOFF.md` and standing branch authority to retain a clearly blocked WIP snapshot with QA evidence. This does not accept D, waive evidence requirements, or release E.
