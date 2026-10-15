# Phase8-F — Full QA & Independent Review

- Status: in_review — final independent review fixes pending verification
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-14 Owner 正式規格 [V2X-PHASE8](../docs/specs/V2X-PHASE8-BALANCE-TUNING.md)；Parent [Phase8](20261014-v2x-08-balance-tuning.md)。
- Risk: L3
- Updated: 2026-10-14
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支；worker 不 commit／push。

## Goal

整合 Regression、Simulation、Browser、Save、Performance 與最終 Findings，完成 Phase8 Final Gate、獨立審查與交付。

## Scope

規格 §10–§12、§16–§20：Full Regression、Save／Migration／Determinism、Combat Matrix、≥100,000 Loot（可重用未變更參數之已驗證證據）、Craft／Economy、3 Seeds × 10/50/100 年、Production Chromium Regression、20–30 分鐘 Browser Stress、30–60 分鐘 Life／Adventure／Hybrid 分路 Automated Exploration、IndexedDB／Quota 原生指標與 JSON 估算分開。僅在明確 regression 時加 60–120 分鐘 Soak。

## Out of Scope

Phase9、部署、PR／merge。

## Acceptance

- [x] §17 剩餘報告（long-world、browser-regression、browser-stress、agent-role-playtests、performance-storage、bugs、balance-findings、final-review）完成並含 Source Correlation。
- [x] 十一項 Gate 判定、DoD 15 項、Q1–Q7 以證據回答。
- [ ] 未參與施工的 Independent Review（Max）完成；阻擋 Engineering Gate 的缺陷已修正。
- [ ] commit／push 並遠端核對；停止等待 Owner 審閱。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on B–E 局部驗收。

## Evidence

- Routing（requested → observed）：F1 browser lanes `g6-luna-high-engineer`（gpt-6-luna high；UI GPT-6-Luna high）；F2 consolidation `g6-luna-med-engineer`（gpt-6-luna medium；UI GPT-6-Luna medium）；final independent review `g6_luna_max_final_reviewer`（requested gpt-6-luna max；UI GPT-6-Luna max fast；fresh session w3:pA，因原保留 reviewer w3:p3 pane 已不存在；Max w3:p8 曾為 B owner 故不採用）。Lead／Orchestrator：Claude Code（Claude Opus 5.5）。
- Verification：`npm.cmd run check` PASS 38 files／631 tests＋vue-tsc＋build at `9118454`（`phase-08/f-check-run/npm-run-check-9118454.log`），容量清理後同工作樹再跑 PASS 38/631（`npm-run-check-post-cleanup-9118454-worktree.log`）；`src/` 自 `9118454` 未變。`node --test scripts/phase8/browser-helpers.test.mjs` 2/2（F1）。
- Browser（production `dist/` of 9118454；system Chrome 153 headless via CDP，無新增依賴）：regression smoke 9/9、0 errors；stress 1,203.9 s／3,602 actions／3/3 reload equal／0 errors；Life／Adventure／Hybrid 各 ≈1,804 s，0 errors；heap < 20 MB、DOM／listeners 有界 → 不需 Extended Soak；IndexedDB 原生 usage 與 JSON 估算分開，實體 IDB 0.1–2.2 MB。Raw `phase-08/f-browser/`（13 檔 gzip，manifest round-trip 13/13；Chrome profiles 已刪除，磁碟用量記於 `chrome-profile-disk-usage.tsv`）。
- Findings：F-F1 runner 座標點擊穿透 overlay（runner defect，Life lane 05:41:46 後的「無戰鬥」不成立）；reload 重開進行中戰鬥視窗（預期行為）；UI timing instrumentation 缺口；IDB rows 隨歷史成長（C02）。
- Reports：17/17 §17 報告；Gates／DoD／Q1–Q7 於 `phase-08/final-review.md`（Human Product DEFERRED）。
- Review / Audit：`phase-08/f-review/f-max-final-review.md` — 無 P0/P1；FMAX-01（清理後 check log）、FMAX-02（交付 commit 回填）、FMAX-03（B controlled matrix provenance 缺口）已修正，待 reviewer follow-up 確認。
- Commit / PR：待回填；無 PR、無 merge、無 deploy。
