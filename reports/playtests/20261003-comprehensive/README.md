# 大範圍完整性與長時間遊戲測試

Work Authority：[測試 Ticket](../../../tickets/20261003-comprehensive-playtest.md)。五條路線已完成；正常生活到第181日，正常冒險到第156日，森林自然Boss與地下城守衛均已實際擊敗。修復快照的引擎／UI回歸及兩項一般獨立L2 review完成；整份證據經獨立L2最終核對通過，見[final review](final-review.md)。

基準為 `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`，本機固定 production build 在 `http://127.0.0.1:5180/`；各路線使用獨立可丟棄存檔，不操作正式網站。版本與 source 雜湊在 [baseline.json](artifacts/baseline.json)。五條測試路線由 GPT-6 Luna Max 執行（明確路由；沒有後端模型遙測）。重大疑慮依使用者要求交 Astra，修復驗證另行標示基準與修復版本。

## 路線與實際驗證

| 路線 | 方法 | 驗收與目前狀態 |
| --- | --- | --- |
| 生活／經濟 | 正常 UI 新世界、公開等待操作；必要 fixture 分列 | [五條正常UI情境](life/report.md)PASS；181日、176項操作、159 checkpoint（158次reload）、0 page errors |
| 冒險／戰鬥 | 正常 UI 成長、同行、地下城；必要 fixture 分列 | [正常UI](adventure/report.md)155.487日；37 checkpoint、7場勝利、同run三層守衛及自然森林Boss擊敗、日薪／到期、0 page errors |
| 存檔／故障 | 正常往返與受控損毀／儲存故障注入 | [13案](persistence/report.md)：11 PASS、2 baseline損毀資料風險；修復另行驗證，離線／配額／raw保護通過 |
| 長期世界 | 公開引擎加速模擬，不是實時 UI 遊玩 | [8 seed各500年](longevity/report.md)；484,000日步、4,000年度檢查、56自然死亡／繼承、4,056精確往返全部通過 |
| 連續瀏覽器 | 真實時間 ×20；無 clock／worldTime 注入 | [實際1200.293秒](soak/report.md)完成；20 checkpoint、自然跨季、3次reload、0 page errors、1 favicon console error |
| UI 回歸 | [verify_ui.py](verify_ui.py)，保留前輪受控 fixture 分類 | baseline及[修復快照](artifacts/final-ui/results.json)各107 checks／6 viewport PASS，page errors0；[final log](artifacts/final-ui.log) |

基準 `npm run check`：90 個測試、6 個測試檔、TypeScript 與 production build 通過，詳見 [baseline-check.log](artifacts/baseline-check.log)。

## SPEC 驗收映射

| 條件 | 本輪主要證據來源 | 方法與待核對內容 |
| --- | --- | --- |
| AC-01 玩家只控制主角 | UI 回歸／生活／引擎現有單元測試 | 主角移動；NPC 依日程自動移動 |
| AC-02 NPC 移動、工作、休息、衰老 | 長期世界／連續瀏覽器／simulation tests | 多時段觀察與多年生命週期 |
| AC-03 年季日推進 | 長期世界／soak／calendar tests | 實時跨季與加速跨年 |
| AC-04 玩家衰老 | 長期世界 | 多代自然年齡增長／壽終 |
| AC-05 NPC 出現、衰老、死亡 | 長期世界 | 多 seed 出生、移民、自然死亡 |
| AC-06 耕作、採礦、伐木 | 生活／UI 回歸 | 正常資源與重複收成 |
| AC-07 探索、戰鬥、等級／skill | 冒險／UI 回歸 | 正常成長與戰鬥各指令 |
| AC-08 地下城 | 冒險／UI 回歸 | 三層正常 clear；回歸的高 stats fixture 分列 |
| AC-09 酒館傭兵 | 冒險／UI 回歸 | 解鎖、聘用與薪資 |
| AC-10 Player + 2 上限 | 冒險／actions tests | 第三位拒絕及同行者作用 |
| AC-11 Hamlet→Village→Town | 長期世界／生活 | 兩次自然成長與設施解鎖 |
| AC-12 Threat 自動成長 | 長期世界／冒險 | 多 seed 沒有玩家治理的演化 |
| AC-13 Camp 升級 | 長期世界 | camp/threat 與歷史 |
| AC-14 Threat 觸發 Boss | 長期世界／simulation tests | 警告先於生成；現有不同成長率測試排除固定日期 |
| AC-15 不直接 Game Over、負面影響 | 長期世界／冒險 | 安全／傷勢與後續世界存續 |
| AC-16 History | 長期世界／UI 回歸 | 重大事件、排序、保存；存檔接受上限 20,000，本輪檢查不超出 |
| AC-17 Save/Reload 一致 | 存檔／長期世界／soak | 各生命與行動狀態往返 |
| AC-18 Offline Progress | 存檔／UI 回歸 | 正常差值、上限、農田／NPC／聚落／Threat |
| AC-19 Domain 無 Vue 依賴 | 主 Agent 靜態核對／引擎 headless | src/engine 未引入 Vue/Pinia；Vite SSR 只作現有 TS 載入器 |
| AC-20 核心有自動測試 | 基準 check／各路線 harness | 六個正式測試檔與保存的可重現測試脚本 |

## 限制

只涵蓋此版本、所選 seeds 與本機 Chromium；不推論其他瀏覽器、實體手機、所有玩家策略或無限時間的可靠性。正常 UI、公開等待、引擎加速、存檔 fixture／故障注入各自記錄；不以 fixture 取代正常玩法成果。長時間效能是單機觀察，不是洩漏不存在的證明。

## 修復與重驗

[Astra修復清單](BUGS.md)：正常住宿跨午夜導致負金幣／拒絕載入，以及三項受控損毀存檔的ID連續性／作物唯一性風險。沒有修改遊戲平衡。兩項來源差異均完成一般獨立L2 review：[休息](rest-fix-review.md)、[ID](id-fix-review.md)。極端整數耗盡仍是明示低優先級限制。

修復快照完整check為124 tests／6files、TypeScript及production build PASS，見[log](artifacts/final-check.log)；之後只有review提出的測試fixture隔離修正，定向57 tests與type check通過，见[定向log](artifacts/review-fixtures-check.log)與[明確含exit0與source指紋的type重驗](artifacts/review-fixtures-type-recheck.json)。107項UI回歸在修復快照執行，不包含後續新增的單機即時保存與紀錄功能。

最終引擎另以8 seed各500年重验4,000次年度存檔與56次自然死亡／繼承；正常四田逐一收割、三項ID損毀拒絕，見[結果](artifacts/final-integrity-results.json)。Chromium確認四項坏raw不被覆寫，及自然500年世界在1440／390 viewport載入居民與1785筆歷史，見[結果](artifacts/final-browser-results.json)。另[8-seed全圖](artifacts/movement-results.json)逐格走遍308內陸格、每seed84项拒絕與狀態不變檢查。

## 重跑方式

`npm run check` 驗證目前來源；歷史baseline與修復快照的版本／檔案指紋以各JSON為準。baseline script自行從固定git commit建立來源快照；UI scripts需要先建置並以localhost固定服務提供對應來源，依[helpers](ui_helpers.py)使用`PLW_UI_URL`選擇網址。五條路線的完整起訖時間與可執行harness在各路線報告，不把公開等待或headless加速當成實際瀏覽器運行時長。

本輪目前紀錄保存於repository；使用者已取消伺服器範圍、改為單機，並明確先不處理檔案被修改或刪除的情況。單機追加紀錄另由[新Ticket](../../../tickets/20261003-local-autosave-journal.md)處理，不能追溯宣稱先前所有中間版本均已保存。

五條主要 harness 已於測試完成後接入[本機自動報告writer](../../../scripts/README.md)。各路線 `playlog.jsonl` 的 `initial-capture` 只表示封存時版本；後續重跑才會逐次發布自動追加，不能追溯聲稱已保存先前所有中間版本。新單機保存驗證從執行開始記錄，見[新驗證入口](../20261003-local-autosave/README.md)。
