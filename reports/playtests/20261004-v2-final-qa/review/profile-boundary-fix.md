# Profile boundary correction verification

狀態：**VERIFIED**。僅調整 profile helper 的文件分段；Attempt 06 原始資料未變。

- Source commit：`441e3c2b435f199a50cb78ee5b19521bcc084593`；manifest 的 58 個 source fingerprint 全部相符。
- Harness reload 在 CP30 樣本建立前執行。原始 CDP 證據：CP30 `{'cdpDocuments': 2, 'cdpDomNodes': 32399}`、CP31 `{'cdpDocuments': 2, 'cdpDomNodes': 34063}`、CP32 `{'cdpDocuments': 1, 'cdpDomNodes': 4637}`；CP60 `{'cdpDocuments': 1, 'cdpDomNodes': 2127}`、CP90 `{'cdpDocuments': 1, 'cdpDomNodes': 2123}`。
- CP30/31 仍報告兩個 document，故只從 per-document stats 排除；新區間為 `1–29`、`32–59`、`60–89`、`90–120`。
- 全部 120 個 checkpoint 仍保留在 CSV 與整體 metrics。整體 metrics 與前一個同 source summary 一致；CSV bytes 也與前一個 recorded version 一致。
- 新圖 SHA-256：`a4b715214c82fc2a35bb8552026784dc0994075365f029e2663300594a7f4bed`（PNG `1920×1600`，metadata：`Matplotlib version3.10.8, https://matplotlib.org/`）。原圖保留為 `profiling/trends-before-boundary-correction.png`，符合原保存紀錄。
- 圖中的點線只標示 reload control checkpoints，不能證明 GC 發生或不存在 leak。

逐 checkpoint 原始證據、segment counts、previous/current output hashes 與 helper archive proof 見本目錄的 `profile-boundary-fix.json`。
