# Phase8 — Balance & Progression Tuning

- Status: accepted — PASS WITH FINDINGS（Phase8 工程交付完成 2026-10-15；等待 Owner 審閱；Human Product DEFERRED；不自動進入 Phase9）
- Owner: 本專案使用者，沿用 README 已確認身份（2026-10-02）。
- Approver: 同 Owner。
- Approval evidence: 2026-10-14 Owner 於目前 Session 提供正式規格 [V2X-PHASE8-BALANCE-TUNING](../docs/specs/V2X-PHASE8-BALANCE-TUNING.md)，§0 明確「正式授權進入 Phase8 — Balance & Progression Tuning」並授權必要程式修改、測試、獨立審查與目前工作分支 commit／push。
- Risk: L3（沿用 Phase7 治理等級；最終需 Independent Review 與 Owner 審閱）
- Updated: 2026-10-14
- Branch: v2x/reward-core
- Git / Remote authority: 沿用 README 現工作分支 commit/push 授權；Root-only Git，explicit refspec。不 PR／merge／main／force／deploy。

## Goal

回答「玩家透過正常世界行為接觸 Phase7 內容時，Oakvale 是否具有合理的難度、獎勵、成長、經濟與世界演化節奏」，並以 `Baseline → Hypothesis → Controlled Comparison → Change → Regression → Natural Validation` 修正有證據支持的平衡問題。原則：Balance is about meaningful choices, not equal numbers.

## Scope

正式規格原文保留於 `docs/specs/V2X-PHASE8-BALANCE-TUNING.md`。優先 Findings P8-F01（Natural Encounter／Boss Progression）、P8-F02（Reward／Goal Drought）、P8-F03（Life／Economy Full Cycle）、P8-F04（Combat／Equipment）、P8-F05（World／Crisis）、P8-F06（Storage／Performance Risk）。依 A→F 順序逐階段局部驗收：

- [A — Baseline & Measurement](20261014-v2x-08a-baseline.md)
- [B — Combat & Equipment](20261014-v2x-08b-combat-equipment.md)
- [C — Life & Economy](20261014-v2x-08c-life-economy.md)
- [D — World & Crisis](20261014-v2x-08d-world-crisis.md)
- [E — Reward & Pacing](20261014-v2x-08e-reward-pacing.md)
- [F — Full QA & Independent Review](20261014-v2x-08f-qa-review-delivery.md)

Evidence 位置：`reports/v2/20261014-balance-tuning/phase-08/`。

## Out of Scope

規格 §13 全部項目（新 Monster／Boss Families、大量新 Items、新 Crisis 系統、新 Combat／Economy Engine、Skill Trees、新 Profession、NPC Employment／Worker Automation、Offline Progress、Housing、Faction、Multiplayer、V3）；Daily Quest／Login Reward／FOMO／離線收益；第二套模擬引擎；大型 Persistence 重構（除非證據顯示資料遺失／Quota Failure 並另開針對性修復）；Phase9／10；PR／merge／deploy／`main`。允許的少量 Data／UX／Domain 修改必須寫明對應 Finding。

## Acceptance

- [x] 規格 §16 十一項 Gate 分別以 `PASS / PASS WITH FINDINGS / FAIL` 判定，沒有正式數值 Target 的指標只保留觀察分布與設計理由，不事後發明門檻。
- [x] 規格 §17 十七份報告完整，含 Raw Evidence、Seed／Sample／Scenario、Before／After、Source Fingerprint、Tested Source／Delivery Commit Correlation、Historical Failures。
- [x] 每個平衡修改回答規格 §4 五問並有 Before／After 證據；controlled fixture 與 normal fresh-save 分開標示。
- [x] §18 DoD 15 項與 §19 Q1–Q7 以證據回答；Human Product = DEFERRED。
- [x] 未參與施工的 Independent Review 完成，Engineering Gate 阻擋缺陷已修正；commit／push 並遠端核對；停止等待 Owner 審閱，不自動進入 Phase9。

## Constraints and Decisions

- 基準：HEAD `a66427ce80d41ecbbfffb8a15f5ab8ac194e00c7`（= `origin/v2x/reward-core`，clean）；`src/` 與 Phase7 交付 `b71201e8…` 相同（`git diff` 空，112 files），受測 fingerprint `585f5e66…ef58`。
- Routing 依 `docs/agents/agent-routing.md`：Low＝extraction／runner／simulation／browser QA；Medium＝一般平衡修改／test design／UX；Max＝complex combat／RNG／Save／Director／cross-system／deep review；Root（Orchestrator）＝criteria／scope／tradeoff／gate。每個共用數值檔同一時間僅一位 owner。
- 本 Session Orchestrator runtime：Claude Code（Claude Opus 5.5）於 Herdr pane `w3:p1`，透過 Herdr 指揮 Codex worker panes。Worker 的 requested model／effort 於委派時記錄，observed 以 Codex UI 可見資訊為準，無法確認時記 Unknown；不以名稱推定。
- 長時間工作 runner-driven（run → JSON/CSV/log → finish），LLM 不陪跑 polling。
- Human Product Gate：DEFERRED / NOT APPLICABLE AT THIS STAGE。

## Dependencies and Blockers

- Dependency satisfied：Phase7 Parent accepted（Owner L3 approval 2026-10-14）。
- B–E 依 A 的 baseline 與 Finding 優先順序；F 依 B–E 局部驗收。

## Evidence

- Verification: Phase8-A accepted PASS WITH FINDINGS 2026-10-14 (see A ticket); Windows baseline check PASS 37/627; A-F1 long-world test timeout flake carried to F. Phase8-B accepted PASS WITH FINDINGS 2026-10-14 (no product value change; B-F1→E, B-F2→F); A-F1 resolved (long-world test timeouts), check PASS 38/629. Phase8-C accepted PASS WITH FINDINGS 2026-10-14: C-F1 farming yield uncapped (77,580 G/seed) resolved by Owner-approved V4 `min(2, floor((level-1)/2))` (src/engine/crops.ts), Before/After same seeds 15/15 valid, check PASS 38/631; merchant stock/restock NOT MODELED kept as product finding; long-world verification of V4 → D. Phase8-E accepted PASS WITH FINDINGS 2026-10-15: E2 NO CHANGE; instrumented lane 9/9 valid, loot 100,008 rerun; E-F1..E-F3 → F/Human gate; independent Max review findings resolved. Phase8-D accepted PASS WITH FINDINGS 2026-10-15: 54 checkpoints valid, succession, corrected time accounting, D2 controlled comparison; Owner KEEP V0 for D-F1 threat saturation (High product finding); no src change.
- Review / Audit: D、E 由未施工 Max 審查並修正；Phase8 整體最終獨立審查 `reports/v2/20261014-balance-tuning/phase-08/f-review/`（無 P0/P1，FMAX-01..03 已解決）。Phase8-F accepted PASS WITH FINDINGS 2026-10-15：browser lanes 0 errors，final-review.md 11 Gates（Engineering／Combat／Boss／Equipment／Reward／Life／Economy／World／Pacing／Stability = PASS WITH FINDINGS；Human Product DEFERRED）。
- Commit / PR: 無 PR；branch commits 記錄於各子票。
