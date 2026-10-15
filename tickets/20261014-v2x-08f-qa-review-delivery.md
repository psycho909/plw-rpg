# Phase8-F — Full QA & Independent Review

- Status: approved — ready（B–E accepted 2026-10-15）
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

- [ ] §17 剩餘報告（long-world、browser-regression、browser-stress、agent-role-playtests、performance-storage、bugs、balance-findings、final-review）完成並含 Source Correlation。
- [ ] 十一項 Gate 判定、DoD 15 項、Q1–Q7 以證據回答。
- [ ] 未參與施工的 Independent Review（Max）完成；阻擋 Engineering Gate 的缺陷已修正。
- [ ] commit／push 並遠端核對；停止等待 Owner 審閱。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on B–E 局部驗收。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:
