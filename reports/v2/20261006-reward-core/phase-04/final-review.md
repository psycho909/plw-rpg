# Phase4 — Adventure Reward Loop 最終交付審查

狀態：ACCEPTED（Phase4 工程範圍）；最終獨立審查接受，來源已提交，QA 文件與完整封存隨本工作分支交付。範圍僅 Phase4；不開始 Phase5–10 或 V3。

## Source

- Branch: `v2x/reward-core`。
- 測試基準 HEAD：`d3c689985e7e4553a85148ba2a5ea3be7685cb1f`；這個舊 commit 本身不包含本輪未提交功能。
- 實際測試來源：全 74 個 src 檔案，canonical SHA256 `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`；完整逐檔表見 [source-freeze.json](source-freeze.json)。交付 source commit `39621ec9b5833f24c4105d5bf705ff2b984da3a2` 已以 [delivery-source.json](delivery-source.json) 逐檔比對，不改寫原始測試 metadata。
- 原始規格 SHA256：`9e5cced00eb8db215f27e88fc7494db6efc3d0c69d918039d897aa28666f0a25`。

## 完成功能

新生成裝備依狼族 rank 區分品質、等級與素材機率；灰狼規則及既有裝備數值保留。穿透在實際硬皮防線啟用時有額外作用，其他戰鬥公式與七詞綴數值保留。狼王掉落限定月牙獵矛及既有保底月石。

物品視窗加入同部位七項能力差值、詞綴與機制比較；追蹤／戰鬥顯示條件式品質期待，首次發現及下一個冒險目標。沒有新增伺服器、crafting、存檔 schema、離線收益或大量內容。

## 實際驗證

| 項目 | 結果與範圍 |
| --- | --- |
| 全量 regression | 330 tests／20 files；typecheck、production build 通過，含核心、save/migration/determinism regression。 |
| Loot | 100000 次實際 award、五組各 20000；deterministic replay 通過。不是勝率條件化取得率。 |
| Combat | 15 builds × 3 power bands × 6 targets × 2 policies × 8 seeds＝4320 paired rows；每組正常及每三回合 save/reload，共 8640 場實戰。不是 8640 個獨立 seed。 |
| Chromium regression | 本輪同來源 20／20 checks；受控 fixture 與正常 fresh-save 部分分開。 |
| 正常 browser stress | 1200.691 秒，1499 gear/modal cycles、17043 操作、19 checks、7 次 save/reload；五種狼及狼王勝利。 |
| Agent Exploratory Playtest | 1800.857 秒，30 checkpoints、1918 決策、20229 操作；正常 Lv1／45 gold 起步，未注入資源，五種狼均擊敗。不是真人遊玩。 |
| 受控出售補測 | 8／8 checks，取消／Escape 不變動資產、出售 28／40 金、穿戴時禁止出售、收藏保留、無幽靈引用、一次 save/reload 保持結果。不是正常進度取得 village 的證據。 |

正常探索的 actual final worldTime=70887（初始480，進展70407遊戲分鐘，約48.89日）；最後角色 Lv11，gold=989，獵裝26件。壓測 actual final worldTime=13376（進展12896分鐘，約8.96日）。效能 last checkpoint 與 actual final state 分開；沒有編造 final heap。

兩個正常長跑皆無 page error、unhandled rejection 或 storage error；各有一筆 favicon 404 console error，不能宣稱全部 console errors 為零。壓測 heap 6.34→峰值29.92→最後 checkpoint9.69 MB，DOM2174→峰值3729→2242、listeners449→峰值587→462，皆有回落；storage2398→472706 bytes，save78928→105707 bytes（last checkpoint）。save latency P95 0.6ms，UI responsiveness P95 51.48ms。短跑不關閉既有 C01–C03；未出現 §41 的新持續記憶體增長／核心生命週期變更，因此不延長60／120分鐘。

原 whole run `final-qa-20261006T131724842089Z-c00e4d82` **永久保留 FAILED**：原 stress 在關閉視窗後讀取卸載 DOM 而 timeout。以上接受的是相同 source／production HTTP assets 的獨立重試組件，不是假稱原 aggregate PASS。原30分鐘探索亦保留，目標 substring policy 缺陷使其反覆選灰狼；修正版實測另列。其他原始 startup／port／report-path／fixture-selector failures 見 [bugs.md](bugs.md)。

## §61 驗收問題

1. **Loot 是否改變下一步？工程證據支持。** 正常角色先取得、查看、比較及穿戴裝備，再追蹤更高 rank；探索紀錄包含實際可讀目標及候選選項，最後主動追蹤精英以比較品質／詞綴，追蹤狼王以取得限定裝備／觀察變種。這證明 Agent 正常流程可成立；不證明真人偏好或單一裝備造成目標選擇的因果。
2. **有理由找 Elite／Boss？工程證據支持。** 精英保證獵裝並提高品質／等級期待，狼王保證 rare+ 限定月牙獵矛與月石；實戰矩陣保留 early 風險及變種差異，正常探索確實追蹤／擊敗。取得率、真人風險意願及長期經濟平衡仍有限制。
3. **有不同 Build 而非只看 ATK？系統證據支持。** 實際 combat outcome、同詞綴穿透／裂傷 control、boss base counterfactual、Defense tradeoffs 與 visible 七項比較顯示機制差異。硬皮 phase 單次命中穿透14 vs裂傷12，其他敵人15 vs16；某些高 power 全戰結果等價，不能宣稱每場有優勢。Agent 選裝啟發式仍有反覆換裝，不代表真人策略建構已驗收。

## 未修的產品觀察與限制

- Lv5 Ready fixture 所有 build 皆可全勝：目前 slice 高進度風險天花板，後續精英／boss grind 動機需要真人資料，不擅自加內容。
- 普通裝備常弱於滿配 legacy；不是實測 junk／出售率。材料目前用途與支出有限，不增加 crafting 來掩蓋。
- 正常 hamlet 下 blacksmith／出售未開放；正向出售以明示受控 village fixture 覆蓋。人口歸零時追蹤受阻與恢復等待保留 pacing finding。
- Agent 根據能力差值選裝會在少量物品間反覆替換，屬於 runner 策略限制；沒有據此宣告產品為 chores。
- 390px 截圖顯示同窗能力比較且無橫向 overflow；詞綴位於內部捲動區下方，由 DOM assertion 驗證，截圖未直接拍到該清單。
- 20／30分鐘不取代歷史兩小時 stability 證據，不宣告真人樂趣、retention 或完整產品完成。

## Gates

| Gate | 結論 |
| --- | --- |
| Engineering Gate | PASS WITH FINDINGS |
| Browser Stability Gate（本輪20m範圍） | PASS WITH FINDINGS |
| Reward System Gate | PASS WITH FINDINGS |
| Risk / Reward Gate | PASS WITH FINDINGS |
| Build Gate | PASS WITH FINDINGS |
| Adventure Loop Gate | PASS WITH FINDINGS |
| Human Gate | DEFERRED / NOT APPLICABLE AT THIS STAGE |
| Full product／retention readiness | NOT DECLARED |

核心變更已有獨立 Luna Max review；UI／runner／出售補測已有獨立 Luna Medium review。最終組件及文件審查見 [final-runtime-results-independent-review.md](final-runtime-results-independent-review.md)。Phase4 工程可交付，真人驗證不阻擋本開發阶段；不進下一 Phase。

## Evidence

[Regression](browser-regression.md) · [Stress](browser-stress.md) · [Agent](agent-adventure.md) · [Loot](loot-analysis.md) · [Build](build-analysis.md) · [Boss](boss-reward.md) · [Reward findings](reward-findings.md) · [Bugs](bugs.md) · [Controlled sale](controlled-gear-sale/controlled-gear-sale.json)。完整自動版本紀錄採無損封存；恢復及校驗見 [evidence-archive/README.md](evidence-archive/README.md)，原 JSONL 保留本機，封存不是防止本機檔案被刪改的保證。

封存驗證：4263筆既有record完整decode，原raw1046545043 bytes/SHA256fe8539bb6d9b49d57cb28e2cabb0b5d758c00d28bd712f6984c54e50874ec7bf，XZ102145656 bytes拆50MB／50MB／2145656 bytes三片，解壓逐位元組roundtrip通過。Latestprojection27/28吻合；唯一driver歷史自動記錄缺口QA4-R8以保留manifest及當下supplement披露，不假裝追溯填補。完整current8412261b driver已有runtimehash／獨立review／Git檔案，另補capture；原紀錄不改。
