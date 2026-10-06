# Subagent Delegation

本文件只在準備委派工作時載入。直接選擇最低總成本且可可靠完成的角色：Low 負責機械任務，Medium 是一般工程預設，Max 只接手複雜／高風險核心，Sol 決策與整合。不得固定逐級試用、重複委派同一問題，或重做 Subagent 已可靠完成的工作；一次合理嘗試不足或已確認高風險時升級。完整路由及角色命名以 [Agent Routing & Naming Rules](agents/agent-routing.md) 為準。

## 1. 責任

- **Orchestrator：** 負責需求澄清、風險判斷、拆分、整合、最終驗證與 Acceptance 建議。
- **Subagent：** 處理 Scope、限制及驗收條件已確定的工作單位，並回報實際修改與證據；角色與模型須符合路由規則及工具實際能力。

## 2. 是否委派

工作可拆成獨立驗收、寫入範圍互不重疊且每單位只有一個 owner 時才平行委派。需求歧義、架構或安全取捨、破壞性操作、權限擴張、外部發布，以及協調成本高於直接施工的工作，由 Orchestrator 先處理。

## 3. 執行入口與命名

- 委派前確認工具支援的 agent type、requested model 與 effort；直接按 [Agent Routing & Naming Rules](agents/agent-routing.md) 選擇最低且可靠足夠的固定角色。
- 工具限制 task name 時，採小寫英數與底線；例如 `g6_luna_med_engineer` 對應顯示名稱 `g6-luna-med-engineer`（Medium 設定）；實際顯示名稱與工具 task name 都須反映所選模型與 effort。不得把工具限制下的 task name 誤報成 runtime 模型證據。
- 若工具不支援所需角色或設定，記錄可觀察到的實際入口與限制；不得只憑名稱、TOML 或請求接受推論後端實際執行模型。
- 每次委派明確交代目標、允許修改範圍、單一 owner、禁止事項、已確認契約、Acceptance、驗證方式、必要證據、預期輸出及 blocking edges。

## 4. 驗收與整合

Subagent 回報不是最終結果。Orchestrator 必須檢查實際 diff 與證據、處理衝突、執行整體驗證，並把接受的結果寫回正式 Ticket、PR 或適用 handoff。

入口不可用、停止或失敗時，Orchestrator 自行完成安全且 Scope 明確的工作；無法安全完成時記錄具體阻塞。未執行的委派不得視為完成。一般 review／必要 Independent Audit 的 fallback 以 [Review 規範](agents/review.md)為準；施工者的整合驗收不算獨立 Audit。

完成條件：每個委派單位都有單一 owner、互斥 Scope、明確 Acceptance 與可重現驗證；Orchestrator 已獨立驗收所有接受的結果。
