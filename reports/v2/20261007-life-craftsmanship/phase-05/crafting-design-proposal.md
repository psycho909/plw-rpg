# Phase 5 核心 Craft / Save 提案

狀態：設計完成，未修改 src。Root 已接受 Phase5-A（330 checks、type/build、全 74 檢查及 source 對應完成）。最新 baseline：100k awards、4,320 rows／8,640 fights，重用同一組 74 checks；灰狼月石 3% 實測 601/20,000。舊裝備售價仍是 base × rarity，沒有 affix／quality 加價。

## B/C 核心契約

- Recipe 用唯讀 `CRAFTING_RECIPES` registry（新 `src/data/crafting.ts`）：`id, outputBase, inputs, goldCost, requiredSmithing, station, unlockCondition, allowedBiasMaterials, qualityRules, affixRules`。Input 區分角色 inventory 的 `wood/stone/iron` 和 RewardState 的狼素材；解鎖由技能／世界條件推導，不存重複清單。
- 延用單一 `generateItem`。新增明確 `context:{kind:'craft', recipeId}`；舊 Loot 呼叫與未指定 context 的 RNG draw、權重、stats 和舊 provenance 語意保持一致。Craft 仍由現有 rarity/affix/tier/stats/instance ID 管線產生。
- `ItemInstance.craftProvenance` 建議固定為 `{recipeId, createdBy, createdAt, influenceMaterial, quality}`；`quality` 先只有 `standard`，F 可設 `masterpiece`，品質與既有 rarity 分開。保留現有 legendary `provenance` 和所有舊 roll 原樣。
- C 的純 `planCraft(state, request)` 回傳完整可行計畫或拒絕原因；`craft(state, request)` 只在 preflight 通過後呼叫生成器一次。拒絕不得消耗 RNG、材料、金幣、體力、時間或 instance ID；成功生成後不再有拒絕條件。
- Smithing 接入既有 `Character.skills / SkillId / gainExp / life.actions`，避免平行技能系統。技能能力只建議兩項：解鎖配方；在 Craft context 提高 rarity/quality floor 或權重。避免原始 stat multiplier。XP 只在成功 craft 後給，低階 recipe 對高技能者降值。

## Save 與相容性

Smithing 進入角色技能／life action，建議 top-level save v3；新 provenance 使 RewardState schema 升 v2。遷移先按舊版嚴格驗證，再純增補：舊角色／NPC 預設 smithing Lv1/0，life action 預設 0；舊 item 保留所有欄位，只加 `craftProvenance:null`。V1/V2 → V3 不重建世界、不呼叫 random/simulate；保留 seed/RNG/time/history、材料、instances/IDs/equipment、世界經濟與 succession。V3 validator 驗新 shape，再載入存檔不重複遷移。

## Root 可接受的最小產品選項

- **Access/C：** Fresh save 已有 store，basic workbench 放在既有 store；第一條 recipe 用現有 `spear` 底材與 wood+stone，能正常採集後 craft。既有 blacksmith 要 growth 85 才開、一般 30 分鐘約到 58；進階 iron/moon recipe 再用 blacksmith。無新建築、無 growth buff、無戰鬥前置。
- **Recipes/D/E：** 先 1 條 C recipe，再用現有 fang/hide/moon bias 做 2–3 個材料選擇；E/F 加 1 條可用普通 iron 追求的進階 recipe。總共約 3–5 條底配方足夠，6–12 只當建議上限。
- **Masterpiece/F：** high Smithing + eligible advanced recipe + 合適 iron 或 moon input + seeded roll；建議 eligible 機率起點 25%（可在 20–30% 校準），不能變第六種 rarity。品質標記沿用 `craftProvenance.quality`；記 creator/time/recipe，只有 Masterpiece/Legendary Craft 寫 major history。這讓非戰鬥玩家也能經生活技能追求。
- **Economy/G/I：** crafted item 才加固定上限的 affix/quality sell premium；所有舊 item 價格不變。以最低合法材料買價與 town/trade/ownership 最大折扣後的最低 craft fee，對照最高 rarity+affix+Masterpiece payout；費用下限須阻止保證正利潤 buy→craft→sell。保留材料消耗與服務費，I 用完整價格路徑 simulation 定值。既有 property 沒有 blacksmith business；G 可用 home property 提供 basic craft-at-home access，若有折扣必須納入上述下限。
- **Identity：** 用 smithing practice/level 形成 crafter identity；只有首次 Masterpiece 給一次小聲望／里程碑，不加 daily quest 或 NPC order。

## 單一 write owner / B→C readiness

- **B Max core/save owner：** `src/domain/types.ts`, `src/domain/reward.ts`, 新 `src/data/crafting.ts`, `src/data/config.ts`, `src/engine/simulation.ts`, `src/engine/lifeState.ts`, `src/engine/itemGeneration.ts`, `src/engine/rewardState.ts`, `src/services/saveService.ts`, `src/services/rewardValidation.ts`，以及直接受影響的 save/generation tests。
- **C 同一 Max core owner：** 新 `src/engine/crafting.ts` 的純 plan/preflight＋成功 transaction，接 B generator seam；UI 可在 engine API 穩定後由一般工程 owner 實作。
- A 已接受；B 的 registry、v1/v2 migration、deterministic save/reload contract 可開始。B 驗收後，C 的 interface 與 one-spear slice 已具體；basic store workbench 是建議產品決定，Root 可在釋出 B 時定案。D–G 仍按階段另行釋出，不提前施工。