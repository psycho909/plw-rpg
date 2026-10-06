# Phase 2 Product Findings（非擅自改設計）

Source: base f89c2c292aaadb6c22bc0453188661f22e4f15b2 + exact working-tree source hashes in loot-long-world-status.json.

## PF-02-01 — 固定裝備可能遮蔽早期掉落期待（P2）

10,000 normal wolf awards 產生 6,428 件裝備；97.09% 的主槽原始攻擊/防禦低於既有固定 sword +7 / armor +5。此比例未計入暴擊、穿透、流血、格擋等詞綴實效，不能推論 97% 裝備都無用。數據提示已買固定裝備的玩家可能長時間看不到直觀升級。

建議後續真人觀察「拾取後是否願意查看／比較」，配合實戰期望傷害與用途評估，再決定數值方向。本輪維持既有固定裝備與規格內容，未私自改平衡。

## 性能觀察（尚非 Browser Gate）

包含 6,428 裝備的 headless 存檔約 1.94 MB，serialize 約 13 ms／load 約 31 ms（單次平台量測）。物品視窗一頁投影20件，但完整所有權資料保留。這只是資料量壓力證據，不能代替真 Browser storage、DOM 或 heap 檢查。

## PF-02-02 — 早期清怪後的遭遇空窗（P2，既有威脅節奏）

第二次真 Browser正常路線 eligibility checkpoints：前3次worldTime495/497/499，monsterPopulation12→7→2；後續在2931/5783才透過正常休息恢復到1.02。即早期數次清怪就可用盡附近怪物，低威脅下重新具備狩獵資格需等待遊戲日成長。此觀察支持腳本30小時等待不足的診斷；不代表產品應直接提升威脅，也不能將UI休息點擊視為真人願意等待。

建議後續Fun Signal觀察非戰鬥目標與狼族路線是否能自然填補這段空窗；本輪不重設世界threat成長／NPC守衛。Phase3的明確狼族遭遇應遵守真實資格並保留原世界危機。

修正armor material affinity後，最新10k抽樣仍6,428件，raw slot below-fixed比例更新為96.50%。舊97.09%數字與其source evidence保留；新結果見loot-samples.jsonl／fixed-loot-world-status.json及test-only correlation。仍未計入詞綴效用，未擅自重平衡。
