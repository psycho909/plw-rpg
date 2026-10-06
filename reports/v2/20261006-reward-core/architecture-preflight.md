# V2.x Reward Core Architecture Preflight

狀態：**可行，需按下列存檔與戰鬥隔離契約施工**。這是 Phase 1–3 的架構 preflight，不是實作審查、最終獨立 implementation review 或 runtime 驗收。

## 範圍與證據

- Repo：`/workspace/plw-rpg`，branch `v2x/reward-core`；基準與目前 HEAD 均為 `ac144ef4759d14570bf686e6a0e6b2983075fa9b`。
- 依據：根 `AGENTS.md`、`README.md`、`docs/SUBAGENTS.md`、`docs/agents/review.md`、`docs/specs/V2X-REWARD-RETENTION.md`、Phase 1–3 tickets，以及 `src/domain/types.ts`、`src/engine/actions.ts`、`simulation.ts`、`saveService.ts`、ownership、gameStore、playJournal、物品／戰鬥／地點 UI 與相關 tests。
- 初次檢查時 source 位於基準 HEAD；檢查為唯讀。沒有執行測試、build 或瀏覽器，亦不主張 runtime 通過。
- 2026-10-06 更新範圍快照：目前 HEAD 為 `468a4923d3e847dbd04a5b7edeff6cf5be21a9d5`；工作樹已出現 root-owned Phase 1 source 變更（`src/domain/types.ts`、`src/engine/simulation.ts`、`src/services/saveService.ts`、`src/services/saveService.test.ts`，以及新增 `src/domain/reward.ts`、`src/engine/rewardState.ts`、`src/services/rewardSave.test.ts`）。這些後續變更不屬於本次 preflight review 範圍，也未被我審查；以下結論只針對基準 HEAD 契約與整合風險。

## 建議 Phase 1 契約

`CONFIG.saveVersion` 保持 2；在 `GameState` 加必填的 `reward: RewardState`，內含 `schemaVersion: 1`。原 `Character.inventory: Record<ItemId, number>`、`Character.equipment.weapon/armor` 與其 sword/armor 效果保持原形及既有行為；不把程序裝備塞入 `ItemId` stack，也不轉換舊裝備。舊 `inventory.material` 繼續代表既有通用怪物素材，不改名、不搬移、不當成新 Family 素材。

~~~ts
interface RewardState {
  schemaVersion: 1
  nextInstanceId: number
  instances: ItemInstance[]                 // 全域集合；ownerId 表達各角色持有
  materialsByCharacter: Partial<Record<CharacterId, Partial<Record<MaterialId, number>>>>
  equippedByCharacter: Partial<Record<CharacterId, {
    weapon: ItemInstanceId | null
    armor: ItemInstanceId | null
  }>>
  collection: {
    monstersSeen: MonsterEncounterId[]
    monstersDefeated: MonsterEncounterId[]
    itemBasesFound: ItemBaseId[]
    materialsFound: MaterialId[]
    bossesDefeated: BossArchetypeId[]
  }
}
interface ItemInstance {
  instanceId: number
  ownerId: CharacterId
  baseId: ItemBaseId
  rarity: RarityId
  rolledStats: Partial<Record<ItemStatId, number>>
  affixes: AffixRoll[]
  specialTrait: SpecialTraitId | null
  provenance?: ItemProvenance
}
~~~

這是序列化邊界的最小形狀建議，不預先選定內容數量或產品掉落規則。各 registry 使用穩定 ID；材料維持 stack map、程序 gear 才有 instance。`collection` 用無重複 ID arrays，驗證 ID 必須屬於有限 registry 且各陣列長度不超過該 registry 數量。`instances` 以 `instanceId` 全域唯一；`nextInstanceId` 為正整數且大於所有現存 ID，移除 instance 不倒退或重用 counter。`ownerId` 必須指向 `state.characters` 中角色；裝備 ref 必須指向同一 owner 的 instance、base slot 相符，且同一 instance 不可被兩個 slot／角色重複引用。Sparse per-character maps 可省略空角色，未知角色鍵拒絕。材料數量為有限非負安全整數。

既有 sword／armor slot 與新 instance slot 使用相同兩個槽位，不新增 slot。為避免同槽雙重加成，instance 裝備操作需要求舊 `equipment[slot]` 為 null；使用者先用原 `equip` 卸下固定裝備，再選程序裝備。原欄位仍保留並由舊 API 管理；instance API 與 effective-stat projection 分開讀取。`transferStorage` 只接受既有 `ItemId`，Phase 1–2 不把新 instance/material 混入舊房產倉儲。

Phase 1 建議建立 typed registry（例如 `src/data/rewardCatalog.ts`）與 `RewardState` 型別／純初始化 helper；Phase 2 再由單一 engine API 負責 `generateItem(base, source/context, materials, state RNG)`，loot 只透過共用 table resolver 呼叫；裝備／卸下走 `equipItemInstance(state, instanceId, slot)`／`unequipItemInstance(state, slot)`。所有隨機只用 `engine/random.ts` 的世界 RNG；migration／empty-state 初始化不得呼叫 RNG 或改時間／世界。

## Save 相容性與 fail-closed

目前 `validBase` 用 `createGame()` 建 template 再 `matches`；template 的物件鍵都必需存在。新增 `createGame().reward` 後若不特別處理，原生 V1/V2 缺 reward 存檔會被誤判損毀。建議 `validBase` 對 legacy world template 同時剝除 `life` 與 `reward`，保留現有 V1/V2 判斷；reward 由獨立 strict validator 驗證。

- V1/V2 原生存檔沒有 `reward`：先完整驗證原 world/life contract，再附加純空 `RewardState`；V1 照既有 `initializeLife(state, true)`、saveVersion=2 流程。保留 worldTime、worldSeed、rngState、世界／居民／life/history 欄位，不重建世界、不補離線時間。
- 存檔已含 `reward`：只接受精確 `schemaVersion: 1` 且完整通過 nested shape、ID、owner、slot、counter、collection 驗證的 extension；畸形／未知 schema 必須拒絕，不能當作缺欄位重設。
- `serialize`／`packCheckpoint` 已序列化整個 GameState，因此 reward extension 會隨 localStorage checkpoint 保存。`unpackCheckpoint` 抽出 `playJournal` 後仍呼叫 `deserialize`，無須為 checkpoint 另做副本或改 journal version。
- legacy V1/V2 test fixture 必須明確刪除 `reward`，代表真的 native save；V1 migration equality 應在比對原 world 時只排除新增的 `life`、`reward`、saveVersion，不能放寬舊世界欄位 assertions。加上 V2-native 缺 extension、有效 extension round-trip／續跑、缺／錯 schema、未知 nested key、重複／倒退 ID、dangling owner/equipped refs、錯 slot、collection 超界與 `gameStore` fail-closed tests。

存檔拒絕後現有 `gameStore.loadCheckpoint` 會設 `saveBlocked`，停止寫入並保留原值；App 的重建確認是明確覆蓋路徑，與本擴充相容。不要以 `CONFIG.saveVersion=3` 取代內部 reward schema；這避免把獨立 additive domain migration 擴大為全世界版本遷移。

## Wolf family / combat 邊界

保留目前 `encounter(state, boss?)`、`DUNGEON.encounters` 和 `MONSTERS.chief` 路徑。新增獨立 `encounterWolf(state, request?)` 與原生森林入口；狼 family 定義放 typed reward/monster registry，不將 wolf boss 設成舊 `MONSTERS[*].boss=true`。建議 `GameState.combat` 接受可選 inline discriminator，例如 `familyEncounter`；舊存檔 combat 仍是原 9 欄 legacy shape，新家族戰鬥則用 tagged variant 保存 definition/family ID、rank、variant ID、trait IDs 及必要 turn/phase counter。這把 active battle metadata 放在 combat 的唯一真相處，避免 `reward.encounter` 與 `combat` 不同步。

新 variant 建立時就將選定 trait/variant 與需要的戰鬥節奏狀態寫入 combat；save/load 直接續用已形成的遭遇，不重抽 RNG。驗證要求 base monster 為 wolf、family tag/definition/rank/elite flag/dungeon flag一致、traits 數量及候選 ID 符合 rank、variant 屬於該 definition、回合 counter 為安全整數、hp 不超 maxHp，並檢查保存的 resolved stats 與 encounter snapshot 一致。若統計值會由 world context 導出，將該次 encounter 所需 context/resolved snapshot 一併持久化，不能只靠載入當下 threat 重算。

`combatTurn` 對 tagged family encounter 走獨立 resolver；legacy combat resolution 保持原路徑。尤其不能讓 wolf boss 進入 `MONSTERS[monsterId].boss` 的哥布林酋長結算：目前舊勝利路徑會減少 `threat.monsterPopulation`／`bossProgress`，且 monster boss=true 會清除 `threat.bossAlive`、重設 warning、寫 `GOBLIN_CHIEF_DEFEATED` 記憶並發出 `boss.defeated`。family resolver 不呼叫這些 goblin crisis side effects；具體是否連帶影響一般 threat 應在產品規則另定，不要靠 monsterId 隱式觸發。

~~~ts
export function encounterWolf(state: GameState, request?: WolfEncounterRequest): string
export function resolveFamilyCombatTurn(state: GameState, command: CombatCommand): string
~~~

`AdventureWindow` 現在直接以 `MONSTERS[combat.monsterId]` 投影名字，需改成依 combat discriminator 投影；`PlaceWindow` 有既有尋找怪物與挑戰哥布林酋長入口，新增狼入口應只呼叫獨立 API。物品 UI 的 `InventoryWindow` 現以 `ITEMS`/`ItemId` 顯示固定 stack，程序 instances 應作同視窗內獨立投影、呼叫 instance API，不擴充 `ItemId` 來假裝可堆疊。Vue 不抽 RNG 或計算戰鬥規則。

## Journal 與差分風險

`src/services/playJournal.ts` 沒有 state-diff/replay 格式。IndexedDB `PlayRecord` 僅記 action/time、文字與 `captureEvents` 事件；無 gear/material/collection before-after。完整可用進度來源仍是 localStorage checkpoint，含完整 GameState，因此 reward extension 不會漏存於真正 game save。Journal 本身不能用於重建 extension，也不應被描述為逐欄位 state journal。Reward 掉落／裝備／collection 變更應由 engine emit 有意義的事件讓既有 action record 可讀，但事件只是稽核摘要，不代替 checkpoint。

## 最小必要整合與風險

1. `src/domain/types.ts` 加 Reward 型別及 GameState.reward；不改 Character 舊 inventory/equipment。
2. `src/data/` 加最少 registry/types；`src/engine/` 加純初始化、生成／loot、instance equip helpers；phase 1 不做完整 crafting、額外 slots 或大重構。
3. `src/services/saveService.ts` 將 reward 從 legacy template 驗證分離，獨立 schema validate/default 與 fail-closed；確認不碰時間／RNG。
4. `src/engine/actions.ts` 的舊 combat path 維持原樣；wolf 使用獨立 API 與 tagged combat resolver，保存其 turn state，獎勵以獨立 materials/instances 入帳。
5. `src/components/InventoryWindow.vue` 與 `AdventureWindow.vue` 依新資料投影；`PlaceWindow.vue` 加獨立 encounter 入口；不改 World/Succession/Life 核心。

主要風險是把新型別加進 `createGame()` 後忘記 V1/V2 native template 相容、把程序 gear 與 legacy sword/armor 疊加、或狼 boss 經共享勝利路徑修改哥布林 crisis。這三項是 Phase 1–3 gate 的必要 review 點。此報告未驗證實作／runtime，也不宣告 acceptance。


## 範圍更正

`ac144ef4759d14570bf686e6a0e6b2983075fa9b` 是架構檢查的基準，不是目前工作樹 HEAD。root 已開始 Phase 1，故本文件不作 source 全無差異、Phase 1 完成或 gate 通過的結論。