# Phase7-K — Full QA & Independent Review

- Status: accepted — PASS WITH FINDINGS (Development Engineering QA complete)
- Risk: L2
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-08 使用者上傳 Phase7 規格並明確要求「開始進行Phase7的開發」。
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git。不PR/merge/main/force/deploy。
- Updated: 2026-10-13（UTC）

## Goal / Scope

最新source全量/type/build/save/determinism、Chromiumregression、7200s stress/3600s content-agent、效能、獨立review、17reports/finalgates及外部reviewhandoff。

## Authority / Constraints

Parent [20261008-v2x-07-content-expansion](20261008-v2x-07-content-expansion.md)及正式Phase7規格為權威；沿用既有skills適配/QA recorded_reports；不額外擴產品scope。

## Acceptance

- [x] 本 stage 的完整 QA 目標已執行；全量 Regression、內容驗證、Browser lanes、三種子長期模擬、migration/save 與 route 證據均有明確結果與限制。
- [x] 原始 failure、source SHA/fingerprint、runner/build identity 與 raw artifacts 保留；獨立 QA dossier review 通過，Root 接受 K 為 PASS WITH FINDINGS。
- [x] 未開始 Phase8/V3 或其他未 release scope；Phase7 父票仍等待 Owner 完成 L3 最終審閱／核准。

## Dependencies

Cleared: [Phase7-J](20261008-v2x-07j-balance-coverage.md) was accepted PASS WITH FINDINGS on 2026-10-13; Root released K for frozen-source final QA and delivery.

## Root QA preparation release — 2026-10-13

Owner requests entire Phase7 completion. Independent browser harness preparation may start now in the existing Phase7 report directory only, reusing Phase6 production launcher/telemetry and recorded report writer. No app/persistence/renderer edits during preparation. Formal regression/stress/content-agent runs use the final frozen production build and begin only after Root release; stress duration 7200s, content-focused Agent Exploratory acceptance duration 3600s. A 60s content-agent run is smoke-only; the default remains 3600s. The launcher records stale heartbeat stage/age and terminates/reaps the runner process group after 120s without a runner heartbeat. Agents are never human testers; Human remains DEFERRED. Capture one-minute checkpoints, actual errors/heap/DOM/listeners/save/IndexedDB, separate controlled-context content smoke from ordinary UI play. No raw state/time injection in normal stress/agent runs. Medium adapts action policy; Low runs without model polling.

## Root final acceptance — 2026-10-13

**ACCEPTED / PASS WITH FINDINGS.** Engineering QA and the requested two real-Chromium duration lanes are complete on test-time HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3` with recursive `src/` fingerprint `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`. Delivery source commit: `b71201e84ff6b78035f8b6ef9b845dbb831451c5`; it contains this tested `src/` fingerprint. No source/build/runner changes occurred during either final Browser lane or the current-source long-world run. These are Development Engineering results, not product or human-fun approval.

- Gate summary and evidence index: [`final-review.md`](../reports/v2/20261008-content-expansion/phase-07/final-review.md) and [`README.md`](../reports/v2/20261008-content-expansion/phase-07/README.md).
- Required Phase7 deliverables: `content-baseline.md`, `content-plan.md`, `monster-catalog.md`, `item-catalog.md`, `content-coverage.json`, `content-validation.md`, `monster-balance.md`, `loot-analysis.md`, `crafting-economy.md`, `world-integration.md`, `long-world.md`, `browser-regression.md`, `browser-stress.md`, `agent-content-playtest.md`, `bugs.md`, `content-findings.md`, and `final-review.md`; the package also includes three route reports, performance, the blank Human Fun Gate packet, and the external-review handoff.
- Two-hour Chromium soak: raw run `qa-browser-runs/20261013T152918Z-pid405218/`, actual duration 7,200.66s, 115 checkpoints, 1,646 actions, 23 verified reloads, zero recorded Browser errors. Runner status remains `COMPLETE_STRESS_REVIEW_REQUIRED` because 496 actions were classified no-progress.
- One-hour content-agent Browser lane: raw run `qa-browser-runs/20261013T173052Z-pid410744/`, actual duration 3,603.84s, 58 checkpoints, 840 actions, 11 verified reloads, zero recorded Browser errors. Runner status remains `COMPLETE_STRESS_REVIEW_REQUIRED` because 247 actions were classified no-progress. It was a heuristic automation lane, not deliberate strategy or human play.
- Current-source long-world: three seeds at 10/50/100 years, 9/9 save/reload and continuation comparisons equal; no player encounters or natural content-Boss defeats were simulated.
- Full regression: 37 files / 627 tests, typecheck, production build, seven-pack content validation, 41 Browser-runner contracts, production Chromium selector smoke 42/42, and the 11-test long-world suite passed. Save tests cover V1 field/RNG/world-time preservation and round-trip migration; no external V1 save was imported into Browser.
- Archive integrity: all 207 `playlog.jsonl` records decode successfully and the 76 latest published report views match their recorded hashes; the two Browser wrapper manifests and current-source long-world manifest verify from their recorded working directories. Staged source, tickets, and project-level docs pass scoped `git diff --cached --check`. The unscoped report-tree check flags trailing blank lines in captured stdout/stderr and intentional Markdown hard breaks; those archived bytes were left intact.
- Oversized J combat attempts 04/05 are stored as lossless gzip JSONL after two GitHub LFS uploads returned HTTP 503; both decompressed streams matched the original 142,980,038 / 157,980,184 bytes and original SHA-256 values. Per-attempt sidecars and `SHA256SUMS` preserve reconstruction and stored-file verification. This is packaging transport only; no QA rows were edited.
- Bugs: no open P0/P1; P2 historical auditability limitation P7-D-HIST remains documented with its accepted compensating-evidence disposition; P3 wolf drop-eligibility duplication remains open. Product/evidence findings stay separate in `content-findings.md`.
- Human Fun Gate: `DEFERRED / NOT APPLICABLE AT THIS STAGE`; V2 Product Gate: `NOT APPROVED`. External code-review packet is prepared for the Owner; external review has not been performed.

Independent QA dossier review was completed by an existing reviewer context (`/root/g6_luna_med_standards_reviewer`) and found no inconsistent gate labels, metrics, or limitations across the final reports and external-review handoff. Runtime model/effort identity was not available from tool metadata and is not inferred from the agent name. The review covered the QA dossier and evidence consistency; it is not an independent full-code audit or the Owner's L3 approval.
