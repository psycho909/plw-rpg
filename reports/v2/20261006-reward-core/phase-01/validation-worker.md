# Phase 1 Reward Validation Worker Report

狀態：**Validator 實作完成，等待 root 重跑 typecheck／整合驗證；本 worker 不宣告 gate 通過。**

## 修改範圍

本 worker 唯一 source 寫入為 `src/services/rewardValidation.ts`。新增兩個 export：

- `validateReward(value: unknown, state: GameState): value is RewardState`
- `validFamilyEncounter(snapshot: unknown, state: GameState): snapshot is FamilyEncounter`

`validateReward` 驗證 exact reward shape（含必填 `wolfBossForm`）、schema 1、`item-N` 全域唯一／counter 前進、角色 owner 範圍、物品／材料／怪物 registry IDs、level 1–100、rarity affix count、base/slot eligibility、重複 affix、依 level+rarity 限制的 tier/value、special trait 與 legendary weapon 規則、rolled stats 對 `rolledItemStats` 的精確相等、legendary-only provenance 與合法 actor/material/boss source、materials 三鍵安全整數、裝備 owner/slot/ref 唯一性與 legacy 同槽衝突、有限 collection arrays，以及 wolf boss defeated timestamp。

Maps 可 sparse，但 owner keys 只接受 `state.characters`（含保留的歷代角色，不接受 NPC）；巢狀 maps 與 instance/provenance/affix/collection object 都拒絕未知欄位。函式使用 unknown guards，不修改 state，也不讓畸形資料錯誤外洩。

`validFamilyEncounter` 驗證 exact snapshot、狼定義與 rank、trait cardinality/unique IDs、boss-only variant、turn、formedAt、context bounds、howl 狀態，並要求所驗證 snapshot 與目前 `combat.familyEncounter` 相符、`monsterId='wolf'`、`dungeon=false`、elite flag 與 rank 一致。

持久化 `reward.wolfBossForm` 獨立以 encounter shape 驗證；非 null 時限定 `wolfKing`、有效 boss variant、turn=0、howlActive=false 與合法形成時間/context，不要求當前 combat 存在，以支持逃跑後保留既有形態。

## 驗證狀態與限制

本 worker 沒有執行 tests 或 typecheck。root 提供的初始 runner 結果為定向 123 tests PASS、typecheck exit 2；記錄指出 4 個 TS errors（兩個 typed union `includes`、trait index narrowing、encounter comparator narrowing）。已將這些位置改為 typed `.some` 與經 guard narrowing 的 `FamilyEncounter` 比較，但尚待 root 重跑確認。

現行 wolf encounter snapshot 沒有共用的 derived combat stat resolver；本 validator 不猜測 variant 對 maxHp/attack/defense 的轉換公式。`validBase` 的通用數值範圍仍由 saveService 負責。Phase 3 定義唯一 resolver 後，應追加 combat derived-stat 與 snapshot 的精確交叉驗證；目前不得把這一項視為已完成。
