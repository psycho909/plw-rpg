# Phase 2 Targeted Browser（修正前 snapshot）

Source base f89c2c292aaadb6c22bc0453188661f22e4f15b2，完整 working-tree source SHA256見 targeted-pre-fix-summary.json。此報告永久保留修正前結果，不冒充後續修正版證據。

- Chromium151.0.7922.173、正常production runtime、真UI、沒有注入worldTime/wealth/state。
- 台北2026-10-06 09:50:09→10:00:12；real602.503秒。
- 205cycles／1,025operations；53個profile checkpoints，4次save→reload。
- 正常kill→drop→inspect→equip→save→reload，以及store素材交易、390px鍵盤/視窗檢查完成。
- gameTime480→7465（+6,985minutes，包含正常休息操作）；巡迴操作x1，先pause逐步狩獵／交易。
- pageErrors0、unhandled rejection0；console保留1筆favicon.ico404（不列應用程式錯誤）。
- DOM nodes4885→2516，範圍2118–4885；JS heap16.9→34.6MB（自然GC下5.9–42.5MB波動）。不將短測視為長期leak clearance。
- local save99647→99731bytes；origin storage估值47760→286331bytes，包含正常追加journal。
- wrapper exit0，source/harnessStable true。

## Original failure and disposition

首輪37.9秒在disabled hunt locator逾時，原始資料保留。重跑eligibility顯示清怪後0附近的monsterPopulation需超過30game-hours正常休息才到1.02，確認原等待上限不足；修正僅測試等待／診斷。

獨立審查仍提出wolf generic duplicate payout P2 blocking、equip通知P3與armor material affinity followup。此runtime PASS不會將Phase2 Gate寫成accepted；修正後需再做完整最新source gate與600秒Browser。

## Latest fixed-source run

修正版602.915秒／53profile checkpoints／205cycles／1,025operations／4reloadsPASS，來源／harness全程穩定；詳細trend與console原文見targeted-fixed-summary.json。最新source以fixed-targeted-browser-status.json為正本，不覆蓋前輪證據。
