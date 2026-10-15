# Phase8-D — World & Regional Crisis Balance

- Status: accepted — PASS WITH FINDINGS（D-F1 Threat saturation：Owner 2026-10-15 KEEP V0，記錄為 High product finding）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-14 Owner 正式規格 [V2X-PHASE8](../docs/specs/V2X-PHASE8-BALANCE-TUNING.md)；Parent [Phase8](20261014-v2x-08-balance-tuning.md)。
- Risk: L2（World Director／Crisis 互動由 Max 審查）
- Updated: 2026-10-14
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支；worker 不 commit／push。

## Goal

處理 P8-F05：驗證並調整怪物生態、危機頻率、NPC 自治與長期世界穩定性，不破壞「玩家不是唯一救世主，生活玩家也不應被迫戰鬥」。

## Scope

規格 §8：No Intervention／Life／Adventure／Mixed／Prosperous／Struggling 六情境；NPC 自治、Food／Equipment Readiness、Threat Growth、Crisis Probability／Outcome、Aftermath Recovery、Settlement Continuity；檢查 Monster Flood、Boss Spam、Threat Spiral、Crisis Overfrequency、Population Death Spiral、Permanent Decline、Resource Inflation。

## Out of Scope

新 Crisis 系統；固定危機；NPC 永遠自動勝利；Game Over／World Reset。

## Acceptance

- [x] `world-crisis-balance.md` 完成，至少 3 Seeds × 10/50/100 年；不穩定時增加 Seed。
- [x] 多數測試世界可恢復；無廉價捐贈完全取代其他貢獻。
- [x] 修改有 Before／After；full check 通過；Max review（Director／Crisis 互動）。

## Constraints and Decisions

每項修改回答規格 §4 五問並保存 Before／After；僅修改證據指出的參數；共用數值檔同時僅一位 owner；controlled fixture 與 normal play 分開報告；不事後發明數值門檻。

## Dependencies and Blockers

Depends on [Phase8-A](20261014-v2x-08a-baseline.md) accepted；建議在 B／C 數值穩定後執行長世界驗證。

## Evidence

- Routing（requested → observed）：`g6-luna-high-engineer`（gpt-6-luna high，Codex UI GPT-6-Luna high）單一 owner；Lead 退回一次（玩家死亡未接班使 50/100 年情境退化、飽和根因、捐獻與 V4 未量測），依獨立 review 修正一次。
- Normal／controlled matrix：6 情境（No Intervention、Life、Adventure、Mixed、Prosperous controlled、Struggling controlled）× seeds 40131–40133 × Year 10/50/100 = 54 checkpoints，54/54 save/reload 與續跑一天相等；危機 200–203 場／3-seed 百年（≈67／seed-century），四種 outcome 皆出現，平均 readiness 82.45–83.86；人口 79–80、food／prosperity ≈100；無 Game Over／World Reset。Attempts 見 `phase-08/d-runner/d1-summary.md`。
- Succession：Life／Adventure／Mixed 死亡後以 App.vue 等價清單呼叫公開 `chooseSuccessor`；389 次死亡＝389 次接班（Adventure 12、Mixed 11 次戰鬥死亡，其餘老化）；無接班即 INVALID。Life 0 次戰鬥。
- 時間帳本修正：每一分鐘模擬（含 action 內部 simulate）記帳，108,000 ticks／3 seeds 閉合，crisis Δ 與 crises.json 對帳（`d-runner/d1-budget-corrected/`）。
- Saturation：growth +0.65／日 vs guard ≈ −0.30／日；現值 Threat 3 約 99.6–99.7% 全期、Safety 常貼 25；Adventure 僅小幅改善。
- D2 controlled comparison（runner 記憶體覆寫，src 未改）：V0／G1 growth .2993／G2 .4747／K1 guard .0760 × No Intervention／Life／Adventure × 3 seeds × 10/50/100（`d-runner/d2-controlled/comparison-summary.json`）：G2 仍飽和；G1 怪物近零、危機 ≈15／seed-century、Adventure 0 危機（INVALID）；K1 NoInt／Life 中間結果、Adventure ≈7 危機。
- Owner 決策 2026-10-15：**D-F1 KEEP V0**，Phase8 不改數值，記錄為 High product finding；後續 Phase 評估穩定回饋設計。
- Contribution（controlled deficit）：等量單次 Readiness Δ 食物 +0.87、金幣 +0.40、裝備 +0.39、守衛 +3.75、混合 +5.34；需求邊界混合 +25.83 高於任一單項 → 無單一廉價捐贈取代其他貢獻。
- V4 長期：低頻季節作物出售 10 年 45→1,241 G（18 harvest／seed）；正式金幣比較以 Phase8-C（22,315 G／seed／3 年）為準。
- Verification：`node --test scripts/phase8/test_world_crisis_core.mjs` 3/3 PASS（Lead 重跑，含 continuation false 拒絕案例）；D 無 `src/` 變更，full check 沿用 5e223be PASS 38/631。
- Review / Audit：未參與施工的 Max（`g6-luna-max-core`）`phase-08/d-review/d-max-review.md`（P1 分母、P2 時間帳本、P2 續跑 gate、2×P3）→ follow-up `d-max-review-followup.md` 5/5 RESOLVED；新增 P2（Owner 決策敘述把有限受測值寫成「不存在中間平衡點」）由 Lead 改寫敘述解決（K1 中間結果已列入）。
- Raw storage：d-runner 全部 >256KB 檔案 gzip -9 -n（113 檔，`d-runner/raw-compression-manifest.sha256`，round-trip 113/113），108MB→13MB，全部提交。
- Commit / PR：本次 commit；無 PR。
