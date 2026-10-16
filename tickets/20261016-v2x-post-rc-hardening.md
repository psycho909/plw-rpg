# V2.x Post-RC Technical Hardening

- Status: accepted — HARDENING COMPLETE WITH FINDINGS（產品 Source 未變；B1 修正提案、S-02、SEC-01..03 待 Owner 決策）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-16 Owner 於 session 正式啟動「Post-RC Technical Hardening — 發布前技術收尾」（非 Phase11；Human Playtest DEFERRED；Evidence Review → Targeted Verification → Minimal Fix (if confirmed) → Focused Regression → Independent Review）；同日 Owner 追加「這一輪可以啟動 Codex worker」。Parent [RC](20261016-v2x-rc-final-acceptance.md)。
- Risk: L3（Persistence／Security review）
- Updated: 2026-10-16
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不開始 V3／Human Playtest；不修改 `~/.codex` 全域設定。

## Goal

確認 V2.x 是否仍有值得在發布前修復的實際工程問題；只修已確認、低風險、不改產品契約的缺陷。

## Scope

- A：Codex hooks security audit（SEC-01／02／03，唯讀）。
- B：Journal／IndexedDB 資料保護（B1 舊 pending 保留、B2 長期成長；受控資料）。
- C：S-02 defender equipment 重現與分類。
- D：G-05 跨系統 determinism 測試（Craft → Crisis → Save → Reload → Succession → Continue）。
- E：S-03 x1／x20 存檔效能（production Chromium，有界場景）。

## Out of Scope

Save／journal schema、migration、歷史刪除／截斷、retention policy、平衡、crisis／defender 規則、存檔相容性變更、大型 refactor、新 UI；以上需另開 Ticket 由 Owner 授權。保留 Threat KEEP V0、S-01 KEEP CURRENT VALUES、Farming V4、Merchant NOT MODELED、Human Product DEFERRED。

## Acceptance

- [x] A–E 每項分類：CONFIRMED DEFECT／VERIFIED SAFE IN TESTED SCOPE／PRODUCT DECISION REQUIRED／NOT TESTED。
- [x] 已確認缺陷：RED → 最小修正 → GREEN → `npm.cmd run check` → 必要 browser smoke → 獨立 review。
- [x] `reports/v2/20261016-final-qa-rc/post-rc/post-rc-hardening-review.md`；risk register 對齊。
- [x] commit／push 並遠端核對；停止等待 Owner。

## Evidence

- Baseline: HEAD = origin `6a15a2b`，工作樹乾淨；`HEAD:src` `b1a1ff20…` = RC 受測 `76595c5`。
- Verification: 最終 `npm.cmd run check` 50 files／721 tests PASS＋`vue-tsc`＋`vite build`；dist `a018b478…` 與 RC 相同。B2／E：`post-rc/runner/attempt-20261016T151529894Z-storage-perf/`。B1：Lead probe RED（HEAD 丟棄、`b21ce0c` 歸檔）；提案 patch 套用後 723 tests PASS、瀏覽器 O-01 28/28（`post-rc/runner/b1-proposal-attempt-20261016T151101010Z-o01/`）。
- Workers（Codex，經 Herdr）：`luna-high-s02-defender`（S-02 → PRODUCT DECISION REQUIRED）、`luna-medium-g05-determinism`（G-05 → VERIFIED SAFE；Lead 退回一次：存讀檔改用新物件接續）、`sol-medium-b1-retention`（B1 修正提案）。
- Review / Audit: `luna-max-hardening-review`（唯讀，未施工）：B1 **CHANGES REQUIRED**（與 P2-01 上限衝突）→ 修正未套用，存成 `post-rc/b1-retention-proposal.patch`；G-05 VERIFIED SAFE；S-02 PRODUCT DECISION REQUIRED 成立。
- Commit / PR: 本 Ticket 更新所在 commit（測試＋runner＋報告；產品 src 未改），push 至 `origin/v2x/reward-core` 並核對遠端；不 PR／merge。
- Report: `reports/v2/20261016-final-qa-rc/post-rc/post-rc-hardening-review.md`。Engineering RC 結論仍有效（產品 Source 與 dist 未變）。
