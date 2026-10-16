# Phase9-F1 瀏覽器回歸

## 執行環境與可重現證據

- production dist 的 Chromium headless UI 操作；Node 內建靜態伺服器提供 `dist/`，操作以 CDP 可見點擊、鍵盤與畫面文字完成。Chrome `153.0.8010.53`、Node `v22.14.0`、Windows x64。
- HEAD：`c0a377b50e09b67664bc07b65d4e81a382daa53f`。src 指紋 `d312c8b3a95f96ba6609d2531fd770d2b19df3ac64a7796905c2c1fa29ecd305`；演算法為遞迴列出 `src/` 相對路徑並排序，逐檔 SHA-256，將正規化相對路徑與檔案雜湊串接後再做 SHA-256。dist 指紋 `72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04`，同一樹狀雜湊方法。
- 最終正常路線與受控情境紀錄：`f1-runner/attempt-20261016T022825574Z-regression/`（manifest、results、closeout、`actions.ndjson.gz`、51 張截圖與受控 checkpoint）。200 action records、123 clicks、0 遮擋點擊拒絕、0 browser errors。壓力證據另見 `f1-runner/attempt-20261016T015258432Z-stress/`。

## 正常新存檔路線

- **Life：通過。** 可見 UI 伐木兩次、採石兩次、選擇並製作木石長矛、於物品視窗比較並穿戴，再查看角色鍛造熟練度。點擊經 elementFromPoint 確認命中目標；沒有誤入戰鬥。木石長矛製作成功，角色面板顯示鍛造熟練度。
- **Adventure：通過。** 開啟森林怪物清單並以「黏怪」搜尋，顯示 7/28 個目標；查看狼族戰前資訊，尋找怪物後以兩次攻擊結束戰鬥，查看戰利品與後續目標。掉落比較、素材分頁及下一個冒險目標均有截圖與文字紀錄。
- **Hybrid 自然路線：受進度條件限制。** Fresh save 的一般冒險掉落未提供樹脂護衣配方所需材料，配方/站點/鍛造技能等條件不能在本次 bounded 路線中自然達成；一般路線只記錄當時可見的材料來源提示與阻擋狀態，不將它描述成完整自然製作流程。另用明確標記的受控起始存檔，提供合法登錄的 `slime_resin ×3`、木材、Smithing Lv.2、村莊及鐵匠鋪條件，使用可見 UI 完成樹脂護衣製作、裝備能力比較、穿戴及返回森林。受控流程成功；其起始材料與進度不是一般遊玩取得的證據。
- **Crisis：一般新存檔未自然觸發。** 分離的受控 fixture 透過遊戲引擎建立事件狀態，UI 依序檢視警示、準備、支援食物與後勤、結果。結果畫面顯示北方局勢惡化與不需額外救援。此為受控 UI 覆蓋，不代表自然發生率。

## 輔助受控 UI 與通用操作

- **鍛造熟練上限 fixture：** 引擎連續製作 starterSpear 六次到 Smithing Lv.3；工作台明示「本配方已達熟練上限 Lv.3」。因受控存檔材料已耗盡，提交鈕停用且顯示「鍛造材料不足。」；改選鎖甲時同樣只呈現可見材料阻擋及停用按鈕。截圖 `craft-cap-workbench.png`、`craft-cap-advanced-recipe-blockers.png`。這次 UI 沒有顯示可用的進階配方，因此不據此判斷所有進階配方均無法製作。
- **Succession fixture：** 死亡由引擎 `die()` 建立並打包成受控 checkpoint，未用 UI 偽造死亡。接班對話為原生 modal，初始焦點位於對話內第一位候選人，Escape 後仍開啟，Tab 焦點留在對話中；候選清單 29 人。選擇後回到一般 HUD：米拉、Lv.1、生命 100、體力 84、45 金，對話關閉。受控流程截圖 `succession-dialog-open.png` 與 `succession-post-choice-hud.png`。
- 鍵盤路徑包含 modal 開啟、Tab、Enter、Space、Escape 及焦點返回；375px 手機 viewport 使用可見手機導覽開啟物品（CDP 合成 mouse click，非實體觸控輸入）。額外指定尺寸驗證：1280×768 物品視窗開啟且未超界；375×667 手機導覽開啟物品、視窗未超界且沒有水平溢位。15 組寬高量測（320/375/768/1280/1920 × 768/900/1000）皆未發現水平溢位、超界按鈕或小於 24px 的互動目標。
- 手動存檔後重載；角色 HUD、所在位置與玩家格座標一致。遊戲時鐘可能在頁面重載期間前進一分鐘，因此不將時鐘納入持久狀態相等判定。

## 對照、判讀與限制

Phase8-F 在 1,203.915 秒壓力測試後有 3/3 相等重載、0 errors；其 Life lane 後段因 overlay 點擊缺陷而不能主張無戰鬥。本次 regression 使用遮擋命中檢查，最新 attempt 0 次拒絕點擊，Life lane 未進入 combat。Phase8-F 的 inventory/collection checkpoint selector 曾逾時；本次壓力 runner 有取得兩項 UI 時間樣本，詳見 `performance.md`。兩個版本 action 記錄粒度和路線不同，不以 action 數推算速度。

只有單一 headless Chrome/production dist；未測 Safari、實體裝置、真人遊玩感受或留存。Crisis、接班、練習上限及完整 Hybrid 分別是受控 fixture，不作自然進度或遊戲平衡結論。一般路線 Hybrid 內容材料與站點進度限制仍應在正常玩家路線上另行觀察。
