# PT-001 存檔田地數完整性修復

- Status: accepted
- Owner: 本專案使用者，繼承 README 2026-10-02 已確認身份
- Approver: 同 Owner
- Approval evidence: 2026-10-03 使用者「如果有重大bug需要修復或者疑慮時分配給astra 去解決」；既有 PT-001 有可重現存檔完整性疑慮
- Risk: L2
- Updated: 2026-10-03
- Branch: work
- Git / Remote authority: README standing authorization；主 Agent review／驗證後一併 commit／push origin/work

## Goal
排除 PT-001：非整數 preparedPlots 載入後可造成不能重載的存檔。

## Scope
src/services/saveService.ts／saveService.test.ts 的最小驗證修復與回歸證據；Astra 確認真實影響，再於此 Ticket 保存結果。

## Out of Scope
不修改 Simulation、存檔版本、經濟／農作規則；不遷移或覆蓋使用者存檔，不全面重寫 validator。

## Acceptance
- [x] 原有重現案例拒絕非整數田地數，原始存檔保持保護。
- [x] 合法整數田地數與正常農作存檔可 round-trip。
- [x] meaningful RED／GREEN 回歸、全套 unit／build、主 Agent 審查與分支同步。

## Constraints and Decisions
- 使用者這次明確指定疑慮／重大 bug 由 Astra 處理，覆寫 README 的預設 Luna subagent 模型，僅限此 bug 工作者。
- 證據：reports/playtests/20261003/BUGS.md 的 PT-001、verify_bugs.py 與既有 payloads。
- UI 重製仍由 tickets/20261003-world-first-ui.md 管理；本票不改其遊戲呈現範圍。

## Dependencies and Blockers
無；可丟棄 fixture，不接觸正式瀏覽器存檔。

## Evidence
- Root cause: `valid` 原本只限制田地數非負與總田數上限，讓 `preparedPlots=0.5` 通過；`farm('prepare')` 在總量小於 4 時加 1，故可累積至 4.5，下一次載入才遭拒。沒有證據顯示正常 UI 會自行產生起始小數。
- Change: `src/services/saveService.ts` 增加唯一的 `Number.isSafeInteger(s.preparedPlots)` 輸入條件；未改版本、schema、simulation 或農作規則。
- Workflow: 使用 `matt-skills-curated:tdd`，公開測試 seam 為 `deserialize(serialize(...))`；先 RED 再修改 production code。
- RED: 根目錄 `npm run test -- src/services/saveService.test.ts -t 'fractional prepared plots'`，exit 1，1 failed／27 skipped；0.5 未拋錯而使 `toThrow('原始存檔已保留')` 斷言失敗，非 setup 或語法問題。
- GREEN: 同命令於修正後 exit 0，1 passed／27 skipped。補充合法 0–4 整數，以及實際整地至四田、播種、載入後繼續播種並再次 round-trip 的回歸。
- Verification: 根目錄 `npm run test` exit 0，6 test files／89 tests passed；`npm run build` exit 0，vue-tsc 與 Vite 打包通過；指定兩個 service 檔案及本票執行 `git diff --check` exit 0。
- Protection / limits: 唯讀確認 gameStore 載入失敗會設定 `saveBlocked`，既有 save 路徑因此不寫入 localStorage；本次單元測試驗證首次拒絕與錯誤訊息，未另行執行瀏覽器防覆寫測試或變更 runtime server。無新增重大疑慮，已損毀的小數存檔仍需依既有保護流程處理，本修正不自動修復或覆寫。
- Worker review: 以 HEAD `ec0240bdfc056649f71cb4fd837233690116fb6a` 的指定 service unstaged diff 自查 Scope／契約，修改僅一個驗證條件與七個回歸案例；未 commit／push，待主 Agent 整合。
- Integration verification: 主 Agent 核對完整 service diff 與原 PT-001 payload；最終整合 `npm run check` exit 0，90 tests、type check、build PASS。UI [verify.py](../reports/ui/20261003-world-first/verify.py) 的受控 0.5 fixture 首次拒絕、手動存檔與移動後原文字保持不變；[results.json](../reports/ui/20261003-world-first/artifacts/results.json) 共 107 browser checks PASS、零 page errors，source 指紋逐檔一致。沒有自動修補／遷移已損毀資料。
- Review / Audit: 主 Agent 已核對最小一行修復、RED／GREEN 與 browser 防覆寫證據；未參與施工的 Luna／max Standards、Spec reviewer 完成 service 與最終 staged 內容檢查，兩者無剩餘 blocker。最終 32 source hashes 與保存的 90 tests／107 browser checks 相符，包含 0.5 初次拒絕／原文防覆寫。一般 L2 review，未擴充版本／schema／simulation。
- Final review: Acceptance 的首次拒絕、合法 round-trip、RED／GREEN、整合檢查與分支同步均已成立，主 Agent 判定 accepted。
- Commit / PR: 整合於 `d9d2b4d553441025a2f63ac16662978774837c19`，已 push origin/work 並以 `git ls-remote` 確認一致。結案狀態另保存於本票所在後續文件 commit；沒有 PR 或 main merge。
