# 最新 V2 Browser Soak（執行中）

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`。Chromium production app runtime（headless 真 DOM/JS/IndexedDB/UI；非純 engine simulation）。

最新 attempt-05 正式開始 **2026-10-05T14:08:55.868Z**（台灣2026-10-05 22:08:55），7200秒最早截止 **2026-10-05T16:08:55.868Z**（台灣2026-10-06 00:08:55）。每60秒checkpoint，正常UI倍率與活動，不修改worldTime/state/資源、不用debugskip。尚未完成，不宣稱PASS。

- [正式結果](soak/attempt-05/results.json)；[checkpoints](soak/attempt-05/checkpoints.json)。
- [完整啟動與限制](soak/attempt-05/README.md)；[normal UI preflight](soak/attempt-05/preflight.json)。
- 正式harness SHA256 `a4b4f853e862d7ce4ae2479b2b8e953433b96fa90db4323f48781b62446562e0`，啟動後固定。

## 舊版原始嘗試保留

舊source `c02b600c6f5f1533374d671b707d333c86d852d7` attempt04真實7204秒／120CP，但rawstatus failed：末端menu匯出locator找不到含副文案的按鈕；新freshprobe以parentbutton has_text正常下載，不能追回已刪除舊profile/endexport。中段2個reloadguard以初始actor對合法死亡繼承後actor，屬harness比對錯誤；新版本改用保存時actor與document-start readonly state。所有原failure與raw不改。舊版本2h不能當作P1修復後最新版本測試。

尚待end time、duration/game-time、120CP、errors、reloads、initial/finalpopulation/threat/boss/events/history、DOM/heap/storage trends、save/UIlatency與exportvalidation。完成後由實際raw填入。Human Fun Gate仍PENDING。
