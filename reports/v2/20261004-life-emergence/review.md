# V2 Standards / Spec Review

- Authority: [V2 Ticket](../../../tickets/20261004-v2-life-emergence.md)
- Base / pre-delivery HEAD: `2e8ad94132b0e1bff11c971f40185ce92afae06e`；branch `work`。
- Scope: 本次 V2 的 tracked diff、新增 src/data/domain/engine/presentation/components、正式規格、報告、README/docs/UI/CHANGELOG/TODO/Ticket 與 handoff；不包含既有 V1 QA 的重新改寫。
- Snapshot: [verification-manifest.json](verification-manifest.json) 固定全部 src、production dist 與三支驗證工具的 SHA-256；最終 staging 核對內容一致。
- Commands: `git diff -- <本次 tracked 路徑>`、`git ls-files --others --exclude-standard` 後讀取本次新模組與測試；最後 `git diff --cached --check` 及 staged paths 核對。基準到提交前 HEAD 無已提交 V2 差異，故不能以 `git diff base...HEAD` 取代 working-tree review。
- Reviewer: root 主 Agent，參與施工；完整 review 是 **非獨立 fallback**。依 [L2 Review Contract](../../../docs/agents/review.md) 分開檢查 Standards 與 Spec。
- Delegate limitation: 已委派 GPT-6 Astra/high 檢查重大疑慮；其提出 shallowRef/computed stability 的真實 P1 finding 並完成部分修正，之後因模型使用額度限制中止。其他 Luna worker 亦遇到相同限制，無法完成完整獨立 review。不能把部分結果稱為已完成獨立稽核。

## Standards

檢查 simulation→state→save/journal→store→projection→Vue 資料流。engine 不依賴 Vue/DOM，世界用 seeded RNG；trait migration 用獨立 seed/id stream，不消耗舊 world RNG。單一 monotonic loop 在換倍率前 flush，background 與 reload 的契約分離。新增 UI 沿用 PixelWindow/PixelMeter/StatusNotice 與既有黑白 token，沒有新增 UI framework、依賴、server 或 AI API。

存檔先驗證原世界再 migration，V2 enum 嚴格驗證字串和 reference；壞檔、quota、journal ACK/replay 走既有保護。UI 讀 detached bounded projection，所有行為呼叫 engine，沒有為 UI 偽造 NPC、資源或委託成功。

檢查自己新增 unused code 並移除；`vue-tsc --noEmit --noUnusedLocals --noUnusedParameters` exit 0。`npm run check` 的 222 tests/typecheck/build 通過；premium strict audit 零 findings。未配置 lint、formatter、Storybook 或 DOM runner，沒有把它們列為通過。

## Spec

逐項對照 Ticket / 正式規格 V2-0～V2-6：V1 原生存檔、Active Idle/無 offline、首代 OTHER_WORLD/繼任 LOCAL_WORLD、自然多重 identity/聲望、8 traits/7 careers/6 位存活 featured NPC、有限記憶/對話、自宅/農地/一種農場事業、3 條完整事件鏈/4 種實際請求、加權 director/quiet/cooldown/rare travelers/news、World First projection/LOD 邊界。

交叉證據包括：三條事件鏈 helped/ignored 後果、供糧與人口/聲望、實際狩獵/藥水消耗、退休停止工作/自主 Boss、死亡後舊產業保留/新角色不冒領舊幫助、minute/hour/day/batch 一致、9 個多年世界及 500 年繼任 regression。參見測試與 [開發紀錄](README.md)。

LOD 是距離／地域／featured 分類邊界，尚未實作大規模 NPC 排程優化；規格未授權擴張地圖或巨量實體。短瀏覽器 profiling 不能推論長期無 memory leak；2～4 小時 V2 真 browser soak 未執行。新存檔比較／不同 seed 的真人體驗仍須玩家 Fun Gate。

## Findings 已修復

| Finding | 影響與解除證據 |
| --- | --- |
| P1：shallowRef 世界原地更新、computed 回傳同一 actor | Vue 消費端可能停留在舊 HP/裝備/職涯；改成 detached projection，watchEffect regression + 真 Chromium 開啟視窗藥水／裝備／跨日退休通過。Astra 提出。 |
| P1：native V1 history 沒有 V2 tier | 真 V1 存檔被拒；validator 不要求舊 event tier，使用 committed V1 engine 產生 fixture，所有舊欄位/RNG/time 不變。 |
| 舊 arc 裁切後 request 仍引用被刪 arc | 長期存檔不合法；聯動裁切 request，180 日每一天 roundtrip + 多年測試通過。 |
| enum 被 String coercion 接受 array/object | 嚴格字串 enum guard，4 個錯誤型別 regression 通過；原檔保護。 |
| 未設定 cooldown 與 now 比較為 false | 初次 minor/medium/rare 候選被錯誤排除；使用 0 預設，seeded director 測試覆蓋。 |
| 藥水請求未走聲望、NPC 自主戰勝錯記玩家、繼任者被當作舊恩人 | 聲望/活動記錄移出 arc 分支；自主事件用實際 NPC actor；PLAYER_* 記憶對目前 actor 篩選，正反對照 dialogue regression 通過。 |
| retired NPC 還可能加入自主 Boss 行為 | career gate 排除退休者，專門 regression 通過。 |
| 儲物成功回饋沿用先前事件 | 存取 emit 專屬事件，真 UI 存取守恆與即時更新通過。 |
| 測試報告每日快照共用可變物件 | 僅影響 QA 紀錄；structuredClone 每日 snapshot 後重跑，日 1 身分為 resident，日 30 為實際累積身分；舊報告版本保留在 playlog。 |

## Disposition

工程候選版本可交付到 `work`，本次未留未修復阻擋性程式 finding。完整 review 使用規範允許的非獨立 fallback，限制如上。**V2 產品驗收仍 blocked：正式規格 §51 V2-7 要求 1～2 小時真人遊玩，§48 八題回饋與 §49 人生故事 Fun Gate 尚無真人證據。** 不宣告 V2 成功，不開始 V3，不 merge main 或 deploy。
