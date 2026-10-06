# Agent Routing & Naming Rules

本專案以整體 Token 成本為準，直接選擇一次可可靠完成工作的最低成本 Agent。Low 負責機械執行，Medium 是一般工程的預設，Max 解決複雜／高風險核心問題，Sol 負責決策與 Gate。不要把明顯屬於 Medium 或 Max 的工作先交給 Low，也不要為保險預設 Max；避免重複委派同一問題或讓主 Agent 重做 Subagent 已可靠完成的探索、測試與分析。

## 1. 固定身份與命名

- `g61-sol-med-orchestrator`：GPT-6.1 Sol，medium。負責 Spec、產品／架構／Scope／Phase 決策、委派、跨系統取捨、整合及最終 Gate。
- `g6-luna-low-explorer`、`g6-luna-low-bug-reproducer`、`g6-luna-low-qa-runner`：GPT-6 Luna，low。負責機械探索、bug reproduction、測試／Browser QA／模擬／benchmark／長時間 runner。
- `g6-luna-med-engineer`、`g6-luna-med-bug-fixer`、`g6-luna-med-reviewer`：GPT-6 Luna，medium。負責一般功能、一般 bug、局部重構、測試設計及一般 code review。
- `g6-luna-max-core-engineer`、`g6-luna-max-bug-fixer`、`g6-luna-max-deep-reviewer`：GPT-6 Luna，max。只負責複雜或高風險核心工程、困難 bug 與深度獨立審查。

顯示名稱格式為 `[model]-[effort]-[role]`，名稱須反映實際請求的模型與 effort；Medium 的縮寫 `med` 對應設定值 `medium`。若工具只接受小寫英數及底線，將顯示名稱轉成 task name，例如 `g6_luna_med_engineer` 對應 `g6-luna-med-engineer`，並維持一致的 model／effort／role。工具 task name、請求設定或設定檔都不能單獨證明後端實際執行模型；runtime 遙測不可用時記錄未知。既有歷史名稱保留為歷史紀錄，不推論為目前身份。

## 2. 直接路由與最低總成本

每項工作在開始時判斷所需推理能力與風險，直接交給最低且可靠足夠的角色；整體成本包含重試、升級與重複工作的 Token。這不是固定 Low → Medium → Max → Sol 流程：

- **Low：** 機械性探索、資料／內容／fixture 建立、明確 bug reproduction、既定測試與 Browser QA、simulation、benchmark、長時間 runner。
- **Medium（一般工程預設）：** 一般 feature、一般 bug fix、局部重構、test design、一般 code review。不要先讓 Low 嘗試這些工作。
- **Max：** 複雜或高風險核心 state、跨模組根因、Save／Migration、RNG／Determinism、Race／Concurrency、複雜演算法、難解核心 bug、深度審查。明確屬於此類的工作直接給 Max，不先經 Low 或 Medium。
- **Sol Medium：** Spec／產品／架構／Scope／Phase 決策、重大取捨、委派、整合與最終 Gate。

一般 bug 若重現需要機械探索，可由 Low 單獨負責 reproduction；已定位的一般修復直接由 Medium 負責。只有一次合理的較低成本嘗試已證明不足、無法可靠定位原因，或證據確認屬核心／高風險問題時才升級。升級一次後不可重複相同失敗的低階嘗試；Max 遇到 Spec／Scope 衝突、產品方向或重大架構取捨，回交 Sol 決策。

## 3. 執行、委派與 Context

每一個問題指定一位施工 owner，明確交代 Scope、已確認契約、Acceptance、必要 context 與證據。只有確實獨立的工作才能平行；不得為同一問題重複開 Agent。Main Agent 不重做 Subagent 已可靠完成的探索、測試或分析，只做必要整合與驗收。依任務提供最少必要 context：Low 取得任務／相關規則／路徑；Medium 或 Max 取得 Ticket、Acceptance、相關探索與檔案；QA runner 取得 source SHA、範圍、命令及判準；Reviewer 取得 Spec 節錄、diff、受影響檔案與測試證據。

長時間工作必須 runner-driven：runner 自行 `run → write JSON/CSV/log → finish`。不得讓 LLM 長時間 polling、陪跑或反覆讀相同 log。模型只在開始、failure、完成與 summary 時介入；成功回報 compact summary，失敗保存完整 evidence。

## 4. Review 與驗收

一般 code review 使用 Medium。複雜／高風險核心修改使用未參與施工的 Max deep reviewer；施工者不得自我審查並認證為獨立 review。Reviewer 只回報 findings、evidence、severity 與 recommendation，不暗中實作；沒有問題時明確回報 PASS。Orchestrator 檢查結果並負責整體 Gate。

## 5. 核心分工

> Low 執行機械任務；Medium 開發一般工程；Max 解決複雜核心問題；Sol 做決策與最終 Gate。
>
> 以最低總 Token 成本，一次可靠完成為目標。只在合理嘗試已證明不足或工作本身屬高風險核心時升級。
