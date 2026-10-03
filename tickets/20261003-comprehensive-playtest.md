# 大範圍完整性與長時間遊戲測試

- Status: in_progress
- Owner: 本專案使用者；沿用 README 的已確認身份
- Approver: 同 Owner
- Approval evidence: 2026-10-03 使用者要求「在進行一輪大範圍，完整性，長時間的遊戲測試」；沿用多 sub agent 遊玩及「如果有重大bug需要修復或者疑慮時分配給astra 去解決」授權。
- Risk: L2（跨系統整合驗證，必要的已確認 Bug 修復）
- Updated: 2026-10-03
- Branch: work
- Git / Remote authority: 沿用 README，只 commit/push work；不合併 main、不部署、不建立外部 Issue。

## Goal

以現行世界地圖 UI 完成多路線、長時間及資料完整性測試，保存可重現的遊玩紀錄、失敗證據、修復與限制。

## Scope

- 五個互斥路線：生活經濟、冒險戰鬥、存檔故障、多 seed 長期世界、連續瀏覽器 soak。
- 固定基準 build，獨立本機 Chromium context；生活／冒險走公開 UI，注入與加速模擬另行標示。
- 至少 20 分鐘實際瀏覽器運行；至少 8 個 seed 各 500 遊戲年，包含自然死亡與多代繼承。
- 對照 SPEC AC-01～20、docs/UI.md 與引擎／存檔契約。主 Agent 重現疑慮，重大問題由 Astra 解決並補回歸證據。
- reports/playtests/20261003-comprehensive 保存 scripts、JSON、必要 screenshot、完整報告及 Bug 清單。
- 必要修復同步正式回歸測試與 CHANGELOG；不因廣測而調整無關玩法。

## Out of Scope

- 正式網站與真實玩家存檔、依賴升級、玩法重設計、未經證據的平衡調整。
- 把加速或受控 fixture 說成正常遊玩；把有限測試說成所有平台零 Bug。

## Acceptance

- [x] 五條路線都有實際執行證據、起訖時間、版本、遊戲時間、檢查與限制。
- [x] 20 分鐘連續瀏覽器測試完成，記錄錯誤、保存、互動及效能觀察。
- [x] 至少 8 seed × 500 年世界模擬完成，檢查數值、ID、存檔往返及多代繼承。
- [x] AC-01～20 有證據映射；確認 Bug 有重现、影響、處置及狀態，不强求找到 Bug。
- [x] 重大 Bug／疑慮依使用者指示交 Astra；必要修復通過回歸及適用 check。
- [ ] 主 Agent 整合驗收、風險相稱 review、文件與 Git diff 檢查完成，提交並同步 work。

## Constraints and Decisions

- 基準：694c6d76df67e3d3dd4da5aa98feba8581ecc2ba。
- 測試 worker 使用 collaboration.spawn_agent，明確指定 gpt-6-luna/max；checkout 無 luna_worker.toml，依 README 與 docs/SUBAGENTS.md。
- Astra 僅承接重大 Bug／疑慮，依明確使用者要求覆寫專案預設模型。
- 各 worker 只寫指定路線目錄，不能改 src、歷史報告、其他 worker 檔案或執行 Git；主 Agent 擁有 Ticket、整合報告與 shared helpers。
- 基準 build 固定於 /tmp，不受後續修復 HMR 影響；所有 context 都可丟棄，服務只 bind localhost。
- 2026-10-03追加要求「也要測試boss,整個世界觀，模擬測試遊玩時間至少一個月時長」；使用者已明確回覆指遊戲內至少30天。正常UI路線須超過30日並實際驗證森林Boss及地下城首領；世界觀以現行SPEC實作的區域、居民職業／日程、生命週期、聚落、威脅、歷史與繼承為範圍。

## Dependencies and Blockers

- 既有 Node、npm、Chromium、Python Playwright、Vue/Vite/Vitest；不新增依賴。
- managed environment 可用；cloud status 的 network policy state 為 unknown，本輪測試只需本機服務。
- 無已確認阻塞。

## Evidence

- Verification: 五路線完成；正常生活181日、冒險155.4868日，地下城守衛與自然森林Boss均實際擊敗；20分鐘瀏覽器soak、8seed×500年、多代繼承與AC-01～20映射完成。修復快照124 tests/6files、types/build、107項UI及四项ID/费用回歸通過；原始raw保護已驗證。證據：[整合報告](../reports/playtests/20261003-comprehensive/README.md)、[Bug清單](../reports/playtests/20261003-comprehensive/BUGS.md)、[世界演化](../reports/playtests/20261003-comprehensive/WORLD.md)。
- Review / Audit: 一般L2獨立review（GPT-6 Luna Max，未參與施工）完成；[休息修復](../reports/playtests/20261003-comprehensive/rest-fix-review.md)、[ID修復](../reports/playtests/20261003-comprehensive/id-fix-review.md)、[最終證據review](../reports/playtests/20261003-comprehensive/final-review.md)。四項證據finding全修正，無未解阻擋項。Astra承接重大疑慮並完成四項修復；主Agent整合接受，OBS-001 favicon與OBS-002人工極限counter限制保留明示。
- Commit / PR: 待驗收；不建立 PR。
