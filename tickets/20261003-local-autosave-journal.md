# 單機即時自動保存與追加遊玩紀錄

- Status: in_progress
- Owner: 本專案使用者；沿用 README 已確認身份
- Approver: 同 Owner
- Approval evidence: 2026-10-03 使用者要求遊戲進度／事件與測試紀錄兩者自動保存且不可透過應用程式調整；後續明確「先不用製作伺服器的部分，先以單機為止」，並「修改或刪除檔案先不理會」。本票以最新限制取代先前伺服器選項。
- Risk: L2（單機跨儲存補寫與紀錄契約；不新增身分驗證／伺服器安全邊界）
- Updated: 2026-10-03
- Branch: work
- Git / Remote authority: 驗證後 commit/push work，沿用 README；不推 main、不部署、不發布外部紀錄。

## Goal

單機每次有效操作與世界時間變更立即保存；遊玩事件與測試結果以應用程式只能追加的方式保留，介面可讀與匯出，不提供編輯或回退。

## Scope

- gameStore 即時保存，保留壞原檔保護與可見的儲存錯誤；10秒及離頁保存為補充。
- 同筆 localStorage checkpoint 保存 GameState 與 pending journal outbox，載入 adapter 分離純引擎資料與metadata。
- IndexedDB 追加journal，以固定record ID冪等去重，transaction完成後才清待送資料，不覆蓋期間新操作。
- 擷取完整引擎events；journal保存操作、前後世界時間、結果與事件，不逐筆複製整個世界。
- 重建新世界保留舊journal與未補送紀錄；唯讀匯出紀錄，儲存失敗可見且能重試。
- 測試checkpoint writer追加本機JSONL版本，現有測試結果初始版本明示，之後逐次發布自動追加。
- 回歸、type/build、真Chromium／IndexedDB、一般L2獨立review、README／UI／CHANGELOG。

## Out of Scope

- 伺服器、帳號、跨裝置同步、部署、簽章／WORM、檔案或開發工具防竄改。
- 回退／任意改寫已記錄內容、靜默丟棄outbox、舊壞存檔自動修復、玩法平衡调整。
- 宣稱localStorage與IndexedDB是同一個原子交易，或硬體斷電永不丟失。

## Acceptance

- [x] 有效操作、帶變更的失敗操作（如途中死亡）及advance立即保存；原始壞存檔不被覆寫。
- [x] 舊version1正常存檔可載入；journal metadata不混入GameState。
- [x] 進度與outbox同筆持久化，重載後補送；已寫紀錄重送不重複，不同內容同ID拒絕。
- [x] 追加紀錄包含超過UI150筆限制的完整事件；重建保留舊紀錄，提供唯讀匯出。
- [x] 無法追加或quota錯誤分開提示；不靜默丟紀錄，保存失敗暫停時間，保留重試／匯出。
- [x] 測試發布writer自動追加紀錄，清楚區分先前版本與本次開始追加的版本。
- [ ] 適用checks、實際browser與review完成，提交並同步work。

## Constraints and Decisions

- 不新增依賴；使用既有localStorage、瀏覽器IndexedDB、純引擎與本機Python報告writer。
- 重大完整性疑慮依使用者指示由Astra評估：持久outbox、固定ID及從最新記憶體清理已確認ID，避免非同步舊快照回寫。
- 本票可改原gameStore與新adapter／journal，不改已review的四檔Bug修復內容。
- 完整遊玩基準證據另見[Ticket](20261003-comprehensive-playtest.md)，不將後續保存改動說成先前已測。

## Dependencies and Blockers

- IndexedDB需瀏覽器支援；測試使用現有Chromium。記錄庫不可用時保留outbox並明示待補寫。
- 無伺服器或外部服務依賴。

## Evidence

- Verification: 全量 Vitest136/7、TypeScript／production build、Pythonwriter4 tests PASS；Chromium固定5186實測18/18 PASS（正常30日、一筆3自然事件；35.13秒×20、API故障／重載補寫／去重／內容衝突／匯出／rapid action／reset與1440/390），0page errors，1筆console404另列。超過UI150上限的220完整事件與rest途中自然死亡仍保存由正式回歸證明。root額外390雙故障恢復、紀錄庫故障期間reset保留原pending皆PASS。[來源指紋與check](../reports/playtests/20261003-local-autosave/source-checks.json)、[瀏覽器](../reports/playtests/20261003-local-autosave/results.json)、[雙故障](../reports/playtests/20261003-local-autosave/root-dual-failure.json)、[待補写reset](../reports/playtests/20261003-local-autosave/root-reset-pending.json)。
- Review / Audit: 一般L2獨立Standards／Spec review ACCEPTED，未參與施工的review context，明確gpt-6-luna/max委派；[最終報告](../reports/playtests/20261003-local-autosave/local-review.md)。Windows鎖定、雙故障提示、store原因保留、真IndexedDB error→abort競態四項finding全修復，無未解程式／規格finding。Astra承接兩次原因遺失修復及變更後失敗操作補證，主Agent接受結果；不觸發伺服器Independent Audit。
- Commit / PR: 待驗證；不建立PR。
