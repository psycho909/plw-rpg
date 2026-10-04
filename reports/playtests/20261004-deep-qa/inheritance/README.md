# QA-05：死亡繼承極端矩陣

## 執行結果

最終完整回合於 **2026-10-04 02:53:30.094Z–02:53:32.919Z** 執行，**13/13 個合法死亡／繼承案例通過**，另有 **4/4 個非法存檔 fixture 按預期遭拒**。40 個序列化檢查點都由 `serialize()` 後立即 `deserialize()`，並以完整 state 深比較確認相等；死後待選與繼承後存檔均可讀。

每個案例 JSON 都保存完整 checkpoint state、world time、人口、actor reference 數、舊角色死亡欄位、party／契約、作物、地城與戰鬥狀態、序列化 byte 數及 SHA-256。`cases/playlog.jsonl` 保存每次案例 checkpoint 與完成狀態的追加版本；根目錄 `playlog.jsonl` 保存 harness、結果、非法 fixture 與 README 版本。

## 重現方式

從 repo root 執行；依賴使用現有 Node、Vite、Python 與 `node_modules`，不需網路或新安裝：

```bash
QA05_SOURCE_ROOT=/tmp/plw-rpg-qa-source-738bc00 \
  node reports/playtests/20261004-deep-qa/inheritance/qa05-inheritance.mjs
```

Harness 使用 Vite SSR 的 `configFile:false` 從固定來源快照載入純 engine、actions 與 save validator，不啟動瀏覽器。每次輸出都呼叫 `scripts/recorded_reports.py` 的 `write_recorded` CLI；可重跑以追加新版本。

## 案例與實際結果

| Seed | 案例 | 結果 |
| ---: | --- | --- |
| 73005 | 自然老化 | 在第 2 年邊界實際觸發 `自然老化`；死亡待選與繼任後均可 round-trip。 |
| 73006 | 只有 14 歲候選人 | 29 位 NPC 全設為 14 歲／`child` 的合法受控 fixture；死亡後選兒童回傳 `false`，state 不變且存檔可讀。 |
| 73007 | 沒有存活居民 | 對 29 位居民呼叫 engine `die()` 後再死亡玩家；人口為 0，選已死 NPC 回傳 `false`，存檔可讀。 |
| 73008 | 唯一候選人年齡邊界 | 唯一候選為 15 歲、life stage `young`；活著時選擇被拒，玩家死亡後接續成功。 |
| 73009 | 受傷候選人 | `injuredUntil` 在未來的成人候選人可接續，傷勢時間戳保留；存檔可讀。 |
| 73010 | 最低金幣 | 候選人 `gold=0` 可繼承，序列化與繼任後數值不變。 |
| 73011 | 最高安全整數金幣 | 候選人 `gold=9007199254740991` 可繼承，序列化與繼任後數值不變。這是 validator 接受的數值邊界 fixture，不代表一般遊玩可自然取得。 |
| 73012 | 同行傭兵成為繼任者 | 先以 100 日正常演化解鎖酒館，再呼叫實際 `hire()`；死者待選時契約仍指向 NPC，該 NPC 接續後由 `chooseSuccessor()` 清空 party，actor id 唯一。 |
| 73013 | 契約跨午夜 | 23:50 呼叫 `hire()`，10 分鐘後到午夜仍保有契約；村莊聘用費 25、午夜日薪 4，玩家金幣 45→16。傭兵成為繼任者後 party 清空，存檔前後相等。 |
| 73014 | 戰鬥死亡 | 實際森林遭遇 `wolf`，玩家 1 HP 防禦後因 `戰鬥傷勢` 死亡；戰鬥清除，死亡待選存檔可讀，繼任不推進時間。 |
| 73015 | 地城戰鬥死亡 | 實際通過地城第 0 階並進入第 1 階菁英戰；死亡退出地城並保留 `stage=1`，繼任後再次進入時 engine 重設為 `stage=0`。各階段存檔可讀。 |
| 73016 | 種田行動遇新年死亡 | 一株成熟作物與一塊整地保留；跨年播種回報角色離世，時間仍前進 10 分鐘、體力 68→64，未新增作物；繼任後原作物與整地數不變。 |
| 73017 | 旅店休息遇新年死亡 | 旅店休息前 16:00、金幣 8、HP 10；操作回報角色離世但時間仍前進 480 分鐘、金幣 8→0、HP→0，沒有 `player.rested` 事件；死後與繼任存檔都可讀。 |

上述成功繼任均驗證：舊角色持續為 `dead`；繼任者在 `characters` 僅一筆、`npcs` 不再有同 ID；位置／背包／技能及其值繼承，`currentRegion` 依位置重算；總人口與死亡待選時一致；選擇不推進時間；party 清空；作物不變；地城死亡後狀態符合引擎輸出。自然死亡案例及年齡 15 唯一候選案例在玩家仍存活時先試選，兩次都回傳 `false` 且 state 不變。

另有 4 個獨立非法輸入 fixture：缺少 active actor、NPC／character 重複 ID、party 指向不存在 NPC、地城進行中使用終止 stage；四者皆由 `deserialize()` 拒絕並保留原始存檔錯誤。

## 契約與解讀

引擎 `chooseSuccessor()` 僅接受玩家死亡後存活且 `age >= 15` 的 NPC，並清空 party／combat；死亡會清 combat 並退出地城。介面候選 predicate 也是 `isAlive && age >= 15`。因此 15 歲角色雖標為 `young`，仍符合實際介面與引擎邊界；本 QA 依來源行為記錄，沒有把年齡命名差異當成 bug。受傷候選也未被引擎或介面過濾。

旅店與播種案例的失敗回覆仍伴隨已扣費用／已消耗時間，符合 action cost 先付款並推進時間、之後才回報死亡的現行流程；本次確認失敗後狀態仍能保存，未推定為需要回滾的缺陷。地城死亡先保留 stage 計數、下次進入才歸零，也是實測的引擎流程。

## 來源、環境與限制

- 基準 manifest：`../baseline/manifest.json`，來源 commit `738bc0010c549fa3fb2420437d171f5aa2a043a0`。
- 本路線實際載入 `/tmp/plw-rpg-qa-source-738bc00`。`results.json` 列出的 config、types、engine 與 save validator 八個 SHA-256 均與 baseline manifest 及目前工作樹一致。
- Repo 工作樹另有未提交的 O1 存檔復原修改；它不在此來源快照內。本路線只驗證 hash 相同的純 engine/save 路徑，**不代表 O1 UI、browser build 或完整 738bc00 工作樹測試**。
- 環境實測 Node `v24.19.0`、Python `3.12.14`；使用既有 `node_modules`，沒有安裝套件、連外、啟動瀏覽器或修改產品檔。
- 受控候選人年齡／死亡人口與最高金幣是精確邊界 fixture，證明來源 validator 接受及繼承結果，不用來估算玩家遇到頻率。
- 最初 writer 路徑 guard 曾拒絕 `cases/` 子目錄，當時沒有執行產品案例；其後修正 harness。其餘三項初次案例失敗均為 harness 時段／費用／NPC 排程位置假設，已修正後完整重跑；沒有把那些結果列為產品失敗，追加歷程保留在兩份 `playlog.jsonl`。
- 依目前證據，QA-05 未發現需交 Astra 診斷的引擎／存檔 bug；無產品程式修改。

來源規則位置：`src/engine/simulation.ts` 的 `die()`／`chooseSuccessor()`、`src/engine/actions.ts` 的行動費用與死亡中斷、`src/services/saveService.ts` 的 `valid()`／`deserialize()`、`src/App.vue` 的候選 predicate。精確來源 hashes 與各狀態完整證據見 `results.json`、`cases/*.json`、`invalid-fixtures.json`。
