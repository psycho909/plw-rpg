# Phase 8 最終獨立審查

**審查結論：RETURNED；有 3 項 P2 證據／交付紀錄問題須在 Owner 審閱前修正。** 本次未發現 P0/P1 正確性、存檔／遷移、決定性或回歸阻擋。C-F1 V4 與 D-F1 KEEP V0 的 Owner 決策均有忠實記錄；本結論不重開 D-F1 的產品決策。

審查 session 標籤為 `g6_luna_max_final_reviewer`；目前 Codex runtime 未提供可獨立核實的後端模型標籤，因此本報告不以 session 名稱推定模型身分。標準與規格兩軸的獨立子審查結果已納入。

## 審查範圍與方法

- 依 Phase8 主 Ticket、08F Ticket、Spec §0、§4、§13、§16–§20，檢視 17 項報告、既有 A–E 審查與當前 Git 狀態。逐一核對 `final-review.md` 的 11 Gates、15 項 DoD、Q1–Q7、source correlation 和待辦處置。
- 分開檢視標準／工程與規格符合性；就目前 `a66427c..HEAD` 的 `src/` diff 檢查產品邏輯範圍。變更共 7 個檔案：`src/engine/actions.ts`、`src/engine/crops.ts` 與五個測試檔。產品邏輯只有 V4 farming yield cap 及未知作物／wheat fallback 使用該 cap；其餘是測試或 timeout 調整。未見 §13 禁止的新系統、怪物族群或大型物品變更。
- 當前 HEAD 與 `origin/v2x/reward-core` 同為 `35bfee6`；tracked staged／unstaged diff 為空。Phase8 F 報告、runner artifacts、腳本及本審查輸出仍是 untracked。瀏覽器 build 的 source HEAD 是 `9118454`；`9118454..35bfee6` 的 `src/` 無差異，足以確認產品 source 相同，但不等於 F 交付已提交。
- 未重跑測試。現有 `f-check-run/npm-run-check-9118454.log` 記錄 `npm.cmd run check`：38 個 test files／631 tests、vue-tsc 與 build 通過。原始 gzip 僅抽查部分：C 的 local-only 原始檔解壓 SHA-256 與 `local-only-raw-manifest.sha256` 相符，且由 `c-runner/.gitignore` 排除；E 最終 `102419801` 原始 actions 檔解壓 SHA-256 與 `raw-compression-manifest.sha256` 相符，且檔案受 Git 追蹤。未逐一解壓所有 A–F 嘗試檔。歷史失敗／無效嘗試仍保留在 runner artifacts、manifest 與 `bugs.md`，未當成有效結果。

## 規格與工程判斷

- 17/17 項 §17 報告存在。`final-review.md` 的 Gates 與 DoD 沒有把 runner policy 當成玩家行為，也沒有發明數值門檻；normal routes、measured routes、controlled fixtures、長世界情境分開解讀。Human Product 維持 **DEFERRED**，符合 §16–§20。
- Q1–Q7 均提供對應報告或原始證據位置，並保留樣本、runner 與 human evidence 限制；DoD #1 的 PARTIAL 及各項 PASS WITH FINDINGS 沒有被整體改寫成無條件通過。
- C-F1 記錄 Owner 核准 V4；D-F1 記錄 Owner 選擇 KEEP V0。World crisis 報告也說明受測參數有限，不能推論不存在中間平衡點。E 的 1,276/1,423 仍標為低信心分類，147 筆標為 runner cap，未推導人類目標理解結論。
- Standards 軸未發現本次 source diff 造成的 correctness、save/migration、determinism 或 regression blocker。這是依現有 diff 與報告的 review 判斷，不是本次重新執行測試的結果。

## 必須在 Owner 審閱前修正

| ID | 嚴重度 | 發現與證據 | 必要處理 |
|---|---|---|---|
| FMAX-01 | P2 | `final-review.md:90` 聲稱容量清理後又跑一次相同的 check 並通過，但目前只找到 `npm-run-check-9118454.log` 一份執行紀錄。 | 補上第二次執行的可核對 log，或刪除「清理後再跑」的聲稱；不得以單一 log 支持兩次執行。 |
| FMAX-02 | P2 | `final-review.md:90` 將 delivery commit 指向 F Ticket；但 `tickets/20261014-v2x-08f-qa-review-delivery.md:39–43` 的 Verification、Review/Audit、Commit/PR 仍空白，Acceptance 也未勾選。F 證據在目前工作樹未追蹤；雖然 `src/` 與 `9118454` 相同，最終報告／artifact 的交付 commit 與 remote 狀態尚未證實。 | 完成獲授權的交付 commit/push 後，將實際 commit、驗證與 remote 證據填回 F Ticket，更新 final review 的交付關聯；完成前不得宣稱 Phase8 已交付或 Owner-ready。 |
| FMAX-03 | P2 | `final-review.md:86` 的 B correlation 只列 normal measured routes。`combat-balance.md:45–47` 與 `equipment-build-analysis.md:64` 明載 controlled matrix manifests 缺 HEAD、runner fingerprint、source fingerprint，且無法從 artifacts 確認 tested source 與 delivery commit 的逐位元關聯。 | 在 final correlation 明確列出 controlled matrix 的 provenance 缺口，並與 normal-route fingerprint 分列。若無可靠 artifact 可補證，保留「未能確認」；不可借用 normal-route fingerprint 填補。 |

## 可帶入後續追蹤的限制

- D-F1 Threat 飽和仍是 High product finding；依 Owner 決定 Phase8 保留 V0，後續設計階段再評估。這是已記錄且獲 Owner 決策的取捨，不是本次審查要求改數值。
- Human fun／retention／goal clarity、Safari／實體裝置驗證、UI timing instrumentation 缺口、IndexedDB 歷史成長，以及 F-F1 runner overlay 點擊缺陷，維持原報告所列的限制與追蹤狀態。
- B controlled matrix 的來源 provenance 是報告層需明示的證據限制；目前沒有足夠證據要求重跑產品矩陣。若無法追回原始執行來源，應保留限制，不把它包裝成已驗證的 source correlation。

**最終處置：退回修正 FMAX-01–03 後，再提交 Owner 審閱。** 沒有要求 Phase9 工作，也沒有在本次審查中修改產品 source、重跑測試、commit 或 push。
