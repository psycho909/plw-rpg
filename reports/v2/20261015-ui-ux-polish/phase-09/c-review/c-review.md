# Phase9-C 獨立審查

**結果：PASS WITH FINDINGS**（2 項 P3）

範圍：spec §3 P9-03／P9-04／P9-05、§4、§8；C 票據、來源差異、三份 UX 報告與 `attempt-20261016T003828476Z` controlled probe。審查期間未修改既有檔案，也未重跑測試；現有 9/9 component test 與 39 檔／642 tests、production build 結果依 C summary 記載。

## 發現

### P3 — 素材搜尋索引內部 origin enum，無法搜尋畫面顯示的中文標籤

[InventoryWindow.vue:57](../../../../src/components/InventoryWindow.vue#L57) 將 `origin` enum（`registered`／`wolf`／`harvest`／`other`）放入搜尋字串；畫面則在 [InventoryWindow.vue:210](../../../../src/components/InventoryWindow.vue#L210) 顯示「區域登錄素材」「狼族素材」「作物收成品」「其他素材」。因此以畫面可見標籤搜尋，無法命中對應列；雖然註記已被加入搜尋索引，但只有輸入內部英文 token 才會匹配。建議共用一個 origin 顯示標籤投影，並將該中文標籤加入搜尋索引；補一項以畫面標籤搜尋的元件測試。

### P3 — adventure UX 報告仍留有被後續證據覆蓋的 pending 語句

[adventure-ux.md:51](../adventure-ux.md#L51) 寫著 C probe「must remain pending until」Lead rebuild；同段雖已附上 probe 結果，下一節也說明後續證據已取代 pending 文字，但原句未清除。請移除或改寫這句，避免報告同時宣稱待跑與已完成。C summary 及 `life-crafting-ux.md` 的 after-evidence 更新則已清楚標示最終狀態。

## 驗收檢視

- **素材來源分類：** `projectMaterialOrigin` 依 `CONTENT_MATERIALS`、`CONTENT_CROP_GOODS`、`LEGACY_MATERIALS` 登錄項判別。檢視的 legacy 集合目前正是狼牙、狼皮、月石；故三類中文來源標籤與現有 registry 相符。C probe 的受控起始存檔明確包含 `wolfFang`、`slime_resin`、`spring_pea_good`，畫面分別呈現狼族素材、區域登錄素材、作物收成品。普通 `material` 仍留在日常用品並說明它是通用怪物掉落，沒有和登錄 recipe materials 混為一談。
- **發現狀態：** Inventory 素材列來自已持有或 collection 中記錄的 ID；來源／用途沿用 `contentKnowledgeCatalog`。Workbench 缺料來源也沿用同一知識投影。受控 probe 使用已探索森林／農田與已記錄來源，故它證明的是已知來源能顯示；未探索區域維持一般提示的行為由既有投影負責，差異未新增第二套來源規則。
- **既有流程與範圍：** 已檢視的來源確認工作台要求／持有數與缺料來源仍來自既有 crafting plan 和 `contentKnowledgeCatalog`；製作成功的 `檢視裝備` handler 透過 `focusInstanceId` 開啟 Inventory 並選取新裝備。probe 的 `postCraftCompare` 記錄選取 `item-1` 與比較內容。C 差異未改動危機貢獻或世界歷史；`world-feedback.md` 將危機 evidence 標為受控 fixture、歷史畫面標為一般 UI，並有對應 A1 截圖路徑，未把受控流程說成一般新存檔路線。
- **測試、無障礙與視覺：** 新測試涵蓋三種已用 registry 驗證的 origin 分類，但未覆蓋上述中文搜尋標籤行為。新徽章沿用黑白文字、既有邊框 token，未見改變像素視覺規範；本次範圍只增加來源標記與通用素材說明，未新增互動控制。C probe 以 elementFromPoint 驗證互動，並保留結果及 controlled fixture manifest。未見 P0–P2 問題，也未見新增大型百科、第二套 collection、任務系統或 engine/balance/save 規則。

## 處置

C 的核心改動與受控證據可接受。建議修正中文來源標籤搜尋索引及清理已過時的 pending 句；兩項均為資訊一致性與文件維護等級，不要求重跑 C probe。危機／歷史流程只依既有 A1 evidence 判定；沒有真人理解度資料，仍不宣稱主觀體驗通過。
