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

## Root QA evidence-retention repair — 2026-10-13 (Asia/Taipei)

The continued request authorizes fixing the current validator's evidence-loss path under the existing source/failure-retention requirement. This preventive correction does not recover the historical failed input or change D/E gates.

- Scope: `scripts/validate_content_batch.mjs`, a minimal local evidence helper if needed, meaningful native Node script tests, and `scripts/README.md`. No game source, content balance, schema, dependency, or later-stage work.
- Before parsing/validating a supplied pack, preserve its exact bytes plus snapshots/hashes of authoring modules, validator/runner inputs and baseline in a unique local run directory. Record actual HEAD/branch and source fingerprint. Do not assert that a captured module generated a pre-existing JSON pack unless verified; distinguish input capture from authored-source provenance.
- Retain input/source snapshots and failure outcomes when JSON is malformed, validation rejects content, or checks fail. Repeated runs may update the readable report through the existing recorded writer, but must retain prior evidence artifacts without overwriting them. Archive failures must fail the command.
- Record child-check status from process exit/error/signal and retain stdout/stderr, instead of inferring PASS from textual output. Show current source anchor separately from the historical Phase7-B contract anchor; include settlement stage in actual controlled witnesses.
- Verify with failing tests before the fix, then input-overwrite/failure/repeat-run tests and real positive/negative validator runs. Independent Medium review is required. The existing missing-original evidence remains an explicit blocker; no waiver or E release.

### Repair result

- Preventive repair verified: 8 native Node tests passed; real CLI QA covered the exact old-source malformed-input baseline and four current scenario types (five current invocations including one preserved harness input-selection correction). Valid content succeeds; rejected/malformed input retains exact input/source; controlled publisher exit 23 fails the CLI and preserves the prior report. See `d-evidence-retention-run/d-evidence-retention-regression.md`.
- The initial structural RED was a missing-helper import, not old-behavior reproduction. Old behavior was reproduced later against the exact Git blob; its timestamp and raw output are retained. No pre-fix chronology or original D recovery is claimed.
- Independent Medium review has no open Standards/source Spec findings; preliminary findings and their resolutions remain in `d-evidence-retention-review.md`. Product/test/config inputs match the prior successful 103-entry full-check map; the 570-test full suite was not rerun for this scripts-only repair.
- A single derived candidate did not match the original failed pack checksum; see `d-evidence-reconstruction-check.md`. D remains blocked on authentic historical evidence; E remains unreleased. The QA repair is complete and can be persisted under existing branch authority.

## Owner request to resolve D — 2026-10-13 (Asia/Taipei)

Owner now explicitly requested 「把D的問題解決」. Root will prepare a concrete evidence-remediation disposition: generate a new pack from the frozen current authoring module, capture its proven generation linkage, run the repaired validator on that pack and a clearly labeled new negative fixture, and request independent review of the resulting evidence. This verifies current D without fabricating the unavailable historical input. No game changes or E implementation are authorized by this preparation.

The prior explicit no-waiver decision remains effective until Owner approves a specific revised acceptance condition. Proposed resolution: retain the authentic original failure report/diagnostics/checksum and permanently disclose the missing historical bytes/fingerprint; accept current-source revalidation plus independently reviewed preventive retention as compensating evidence. Root will present the completed dossier for Owner's final decision, rather than mark the original requirement satisfied. D remains blocked during preparation; E remains unreleased.

- Current-source revalidation completed: generated D pack is byte-identical to the retained gate-fixed pack (`18751aff901ae9a6512260ad18accce36c33b7e4971838aec82d2d54a45879fd`), real positive validation PASS, 8 qualifying monsters / 7 usable materials. A clearly new resin/keen negative fixture emits both historical diagnostic types and retains its exact input/source. Before/after source maps are unchanged. See `d-remediation-run/d-remediation-revalidation.md`.
- Exact proposed exception and completed evidence: `d-remediation-disposition.md`. Root awaits Owner confirmation of that specific replacement clause, not confirmation to execute already-authorized QA. No original historical bytes are claimed recovered.
- Independent Medium delta review passed the technical evidence/proposal Standards and Spec, confirming current generation linkage, unchanged prior regression inputs and clearly labeled new negative; see `d-remediation-review.md`. Reviewer confirmed only seven raw stdout EOF blank lines justify a scoped invocation-only whitespace exception. D exception is still Owner-pending.
