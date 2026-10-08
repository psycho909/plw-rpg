# Persistent Living World RPG — Oakvale

<!-- Based on project-standards: <commit-or-release>. 複製後請完成所有必要欄位。 -->

## 目的

單機瀏覽器生活世界 RPG。玩家自由選擇耕作、工作、採集或冒險；NPC、人口、聚落、怪物與地下城沿同一時間軸自主演化。V2 在 V1 世界上加入人生身分與聲望、NPC 職涯和有限記憶、自宅／農地／農場事業、地方消息與世界請求。V1 產品規則見 [SPEC.md](SPEC.md)，V2 正式規格見 [V2-LIFE-EMERGENCE.md](docs/specs/V2-LIFE-EMERGENCE.md)。

## 快速開始

### 前置需求

Node.js 22.20+、npm 10+ 與現代瀏覽器。資料儲存在本機瀏覽器，無後端或 AI API。

### 安裝與執行

```powershell
cd D:\Codex\plw-rpg
npm.cmd ci
npm.cmd run dev
```

開啟 Vite 顯示的本機網址（預設 http://127.0.0.1:5173）。正常遊玩以世界地圖為主；WASD／方向鍵或畫面方向鍵移動，Enter／「互動」開啟附近生活操作。點地圖或地圖視窗的目的地會逐格步行並推進時間。角色只操作自己，NPC 日程與聚落成長自動執行。

Esc 開選單／關閉視窗，C 查看角色、I 查看物品、L 查看日誌、M 查看地圖與世界；歷史、旅人筆記與重建確認也在選單中。手機提供底部選單與方向控制。開啟視窗不會暫停時間，可使用時鐘旁或視窗底部的暫停按鈕。

農田操作為整地、播種、等待兩日、收割。商店需走到建築旁並在營業時間交易。酒館與鐵匠鋪於聚落成長為村莊後解鎖。旅人筆記可等待一日、一季或一年，等待不會自動回血。角色死亡後選擇成年居民接續，世界不重置。

新世界會先顯示開場，按「起身」後才開始時間。選單中的「這一生」、「住所與產業」及「地方消息與委託」可查看身分、聚落聲望、名下產業、近期消息和待處理請求。

## V2 已實作內容與驗收狀態

- V1 存檔可遷移至 V2：驗證完整舊世界後新增人生資料，保留原有世界時間、seed、RNG 與其他世界欄位。無效或不支援的存檔會保留原始資料並阻止自動覆蓋；重建仍須明確確認。目前存檔版本由 `src/data/config.ts` 的 `CONFIG.saveVersion` 管理，值為 `2`。
- 世界只在目前遊戲 Session 中依所選倍率前進；開啟視窗不會暫停，瀏覽器背景計時延遲會在同一 Session 內補進。完整關閉頁面後世界凍結，重新載入不依據現實經過時間推進。
- 身分由生活行為、技能、職涯與產業形成，允許同時累積農夫、熟練農夫、礦工、熟練礦工、冒險者、資深冒險者及農場主人。聚落聲望會影響身分視窗的稱號、居民對話、產業資格與傭兵聘用。
- 傭兵聘金依聚落階段為 20／25／30 金；聲望低於 -25 時無法聘請，每 25 點正聲望折 1 金，最多折 4 金。契約為 3 日、日薪 4 金。
- NPC 保存有上限的職涯、性格、掛心事項和結構化重要記憶。個人回憶只對親身相關的當代角色顯示；居民依職業、特質、接觸與事件傳聞得知有限消息，對話會參考其所知的記憶、職涯、玩家身分與聲望。
- 自宅提供休息和儲物，農地與農場事業有聚落階段、金幣、聲望、位置及土地條件。農場事業由玩家親自供應食物：每次最多 10 份、每日最多 60 份；沒有 AFK 收入。
- 「地方消息與委託」依地方、區域、傳聞、重大分類顯示有界近期消息，並提供食物、狩獵、鐵礦與傷者照料請求。地圖透過 World First projection 顯示已探索區域的居民、產業、作物和威脅標記；標記是既有世界狀態的呈現，不新增模擬實體。

目前 V2.x 首輪仍屬開發工程驗證；真人遊玩、Fun Gate 與 Retention Survey 為 `DEFERRED / NOT APPLICABLE AT THIS STAGE`，不阻擋工程 QA。正式宣告穩定 Build 準備進入真人產品測試時，才啟用 1–2 小時實際遊玩與玩家回饋；Agent／自動化測試不代替真人答案。

## V2.x 首輪：Reward Core

依 [V2.x 規格](docs/specs/V2X-REWARD-RETENTION.md) §77 完成 Phase0–3：程序裝備的掉落／比較／穿戴／保存流程，以及森林五種狼族遭遇、實際戰鬥提示、traits與持久化狼王變種。狼族由灰狼逐步解鎖；未解鎖或暫不可挑戰時顯示原因。狼王逃跑／重載不重抽形態，勝利後冷卻7個遊戲日。

首輪 Engineering Gate：**PASS WITH FINDINGS**。314tests、typecheck/build、20項Chromium回歸、20分鐘正常UI壓力測試與多seed10/50/100年模擬通過；[交付報告](reports/v2/20261006-reward-core/final-review.md)保存原始失敗及限制。此首輪範圍只到Phase3；完整內容預算與產品／retention驗收未宣告完成；真人驗證在本開發階段為DEFERRED，不阻擋工程。

## V2.x Phase4：Adventure Reward Loop

本輪依 [Phase4 規格](docs/specs/V2X-PHASE4-ADVENTURE-REWARD.md)調整新掉落的風險回報、硬皮防線與穿透互動，以及狼王限定月牙獵矛；物品視窗同窗比較能力／詞綴，追蹤與戰鬥視窗顯示實際掉落期待、首次發現及下一個目標。既有裝備存檔數值保留。

Phase4 Engineering Gate：**PASS WITH FINDINGS**。330項全量測試、typecheck/build、10萬次掉落、8,640場戰鬥、20項Chromium回歸、20分鐘正常Browser壓測、30分鐘Agent探索及受控出售補測通過。[本輪交付紀錄](reports/v2/20261006-reward-core/phase-04/final-review.md)保留原始失敗及獨立重試，不將Agent紀錄當作真人產品驗收。此Phase4不包含Phase5–10／V3；Human Gate為DEFERRED。

## V2.x Phase5：Life Reward & Craftsmanship

Phase5 Engineering Gate：**PASS WITH FINDINGS**。四種鍛造配方、素材偏向、技藝能力、傑作、鍛造身份與既有住宅工作台已完成；425 項全量測試、typecheck/build、10 萬次裝備生成、13,248 場戰鬥、20 分鐘真 Chromium 壓測與30分鐘 Life Agent 探索通過。原始失敗、產品發現及測試策略限制見 [交付紀錄](reports/v2/20261007-life-craftsmanship/phase-05/final-review.md)；正式進度以 [Ticket](tickets/20261007-v2x-05-life-craftsmanship.md)為準。Human Gate：DEFERRED / NOT APPLICABLE AT THIS STAGE。Phase5 交付範圍不包含 Phase6–10／V3。

## V2.x Phase6：Regional Crisis & Civil Defense

Phase6 Engineering Gate：**PASS WITH FINDINGS**。單一 Goblin 區域危機、民防、生活／冒險介入、有限後果、恢復與歷史／聲望 UI 已完成 A–J 工程驗收；531 項全量測試、typecheck/build、11,000 次實際結算、3 seeds×100年世界驗證、20分鐘 Chromium Stress、30分鐘 Agent Playtest 與20,000筆歷史效能測試完成。正常 Stress 提供完整危機／餘波重讀；Agent 場結束時第二危機仍 active。原始 failure、同 ID 補測限制、產品發現及八項 Gate 見 [最終交付](reports/v2/20261008-regional-crisis/phase-06/final-review.md)；正式狀態以 [Ticket](tickets/20261008-v2x-06j-qa-delivery.md) 為準。Human Gate：DEFERRED / NOT APPLICABLE AT THIS STAGE。


## 正式網站與部署

遊戲網址：[plw-rpg.vercel.app](https://plw-rpg.vercel.app)。

Vercel 專案為 `psycho909s-projects/plw-rpg`，Git integration 連接 `psycho909/plw-rpg`，Production Branch 為 `main`。推送至 `origin/main` 後，Vercel 自動 build 並更新正式網址；其他分支使用 Preview deployment。[Vercel Git integration](https://vercel.com/docs/git)

部署使用 Node.js 22、Vite preset、`npm ci`、`npm run build` 與 `dist`。交付前在本機執行 `npm.cmd run check`；Vercel build 失敗時不會把失敗產物切換成正式版本。設定與驗證證據見 [部署 Ticket](tickets/20261003-vercel-production.md)。

進度保存在該瀏覽器的 localStorage，完整遊玩紀錄追加至 IndexedDB；正式網址與 localhost 的資料各自獨立，不會自動跨裝置同步。`.vercel/`、`.env*` 保持 Git 忽略。

## Work Authority 與 Git handoff

- Work Authority：Git 追蹤的 [`tickets/*.md`](tickets/README.md)
- Owner：本專案使用者；已於 2026-10-02 在本 Session 明確確認。
- Approver：同 Owner；任務明確指定不同核准者時另行記錄。
- L1 單一 Session 直接授權：allowed；限 Owner 在目前 Session 明確指定、低風險且可逆的工作
- Git commit／push：已核准且驗證通過的更新，預先授權 push 到目前工作分支；受保護分支與 PR 流程仍依 repository 規則。
- `.scratch` 持久化：未完成且需要跨環境接續時保存於工作分支；完成後將長期證據移回正式正本，並依專案政策保留或清理。

Owner 在初始化時確認一次；身份未變時不重填、不重問。Approver 預設同 Owner，除非任務明確指定不同核准者。Owner 已於 2026-10-02 在目前 Session 確認本專案身份，Agent 可沿用此設定；後續 Ticket 的身份繼承與核准來源依 [Ticket Convention](tickets/README.md#身份繼承與核准依據)。尚未確認 Owner 時不得推測核准者；可繼續唯讀分析與其他不需要該授權的工作，只阻塞需要核准的部分。

正式 Ticket 的觸發條件與最小契約見 [Work Authority Convention](docs/agents/work-authority.md)。跨 Session／裝置接續必須依 [Handoff Workflow](docs/HANDOFF.md) commit、push、pull 並核對遠端 commit。

## 角色與模型

| 角色 | 模型／effort | 固定顯示名稱 | 權責 |
| --- | --- | --- | --- |
| Orchestrator／Final Reviewer | GPT-6.1 Sol／medium（專案路由目標） | `g61-sol-med-orchestrator` | Spec、產品與架構決策、委派、整合及最終 Gate；實際 Session 身份依可觀測 runtime 資訊記錄 |
| Luna Low | GPT-6 Luna／low | `g6-luna-low-explorer`、`g6-luna-low-content-worker`、`g6-luna-low-qa-runner` | 機械探索、資料／內容建立、QA 執行與長時間 runner |
| Luna Medium | GPT-6 Luna／medium | `g6-luna-med-engineer`、`g6-luna-med-bug-fixer`、`g6-luna-med-reviewer` | 一般 feature／bug fix、測試設計、局部重構與一般 review |
| Luna Max | GPT-6 Luna／max | `g6-luna-max-core-engineer`、`g6-luna-max-bug-fixer`、`g6-luna-max-deep-reviewer` | 僅複雜核心／跨模組、Save／Migration／Determinism／Race 與深度 review |
| Independent Auditor | 未參與施工的獨立 context；依路由規則與工具能力選擇 | 依工作選用符合實際 effort 的 reviewer | 必要獨立稽核；L3 最終授權仍屬人類 Owner |

直接選一次可可靠完成工作的最低成本角色，整體成本包含重試與升級；不採固定 Low→Medium→Max→Sol pipeline，不先把明顯屬於 Medium／Max 的任務交給 Low，也不重做 Subagent 已可靠完成的工作。一般 bug 的修復由 Medium 負責；只有較低成本的合理嘗試已證明不足或確認核心／高風險時才升級。完整路由、context、長時間 runner 與獨立審查規則見 [Agent Routing & Naming Rules](docs/agents/agent-routing.md)；一般 L1／L2 review 的執行者與 fallback 見 [Review 規範](docs/agents/review.md)。工具 task name 轉換不得改變 requested model／effort／role；task name 不代表 runtime 身份。切換主 Agent 模型不改變 Ticket、安全與 Git 權限。

Skill 首選來源與適配見 [Skill Workflows](docs/agents/skill-workflows.md)；若專案另選來源，在此記錄完整 Skill 名稱與理由，避免僅寫短名稱造成不同裝置選到不同流程。

### GPT-6.1 Sol 使用設定

官方來源核對日期：2026-10-02。主 Agent 可在目前 Codex Session 選用 GPT-6.1 Sol；需要明確設定時，以下為主 Agent 的設定範例，作為主 Agent 的專案目標設定，供環境可用時選用：

```toml
model = "gpt-6.1-sol"
model_reasoning_effort = "medium"
```

GPT-6.1 Sol 支援 `low`、`medium`、`high`、`xhigh`、`max`；官方模型預設為 `medium`，不支援 `none`／`minimal`。目前用戶端可能有不同預設或更多選項，須確認實際可用設定；本範例不自動切換模型或降低已選用的推理設定。[官方模型說明](https://developers.openai.com/api/docs/models/gpt-6.1-sol)

沿用目前有效的推理設定；需要起點時一般工作採 `medium`，複雜資料流／回歸／安全 review 可比較 `high`，更高等級只在代表性任務證據顯示有必要時使用。這是專案選用建議，AGENTS 不要求每個任務都使用最高設定；較高推理設定可能增加時間及 token。[官方 Subagent 與推理設定指引](https://learn.chatgpt.com/docs/agent-configuration/subagents)

AGENTS 沿用按需讀取、授權內持續完成、G3 事件式更新、條件式委派與相稱驗證。官方 GPT-6 指南的五項提示主要描述 Astra 行為，可作家族方法起點，仍須用選定模型與實際工作評估；本規範更新不代表已完成 GPT-6.1 Sol 的 runtime、速度、成本或品質實測。[官方 GPT-6 指南](https://developers.openai.com/api/docs/guides/latest-model)

模型名稱、設定檔與請求被接受只代表選用／路由證據；本文件所列 `g61-sol-med-orchestrator` 是專案政策目標，不代表目前 Session 已切換。未取得 runtime 遙測時，不推論後端實際執行模型。高風險工作由主 Agent 整合及最終驗證；必要 Independent Audit 仍依治理規範由未參與施工的獨立 context 執行。

## 驗證

依使用者 2026-10-06 最新指示：開發、除錯與功能施工階段的真人遊玩／Fun Gate／Retention Survey 一律標記 `DEFERRED / NOT APPLICABLE AT THIS STAGE`，不阻擋 Development QA、Engineering QA 或 Release Candidate Engineering Gate。只有當前任務明確宣告穩定 Build 已準備好進入真人產品測試，才啟用真人產品驗證；Agent／Playwright 不能代填真人結果。

<!-- 保留實際存在的變更類型；不適用時標記 N/A。 -->

| 變更類型 | 首選驗證 | 替代驗證或限制 |
| --- | --- | --- |
| 文件 | 根目錄 `git diff --check`、核對連結與 Ticket | 不證明執行行為 |
| 程式模組 | 根目錄 `npm.cmd run test`；Vitest exit 0 | 包含 10／50／100 年整合及 500 年延續；無 DOM |
| API | N/A（無後端） | 不呼叫外部 API |
| UI | `npm.cmd run build`＋本機實際瀏覽器操作；可重現流程 `python3 reports/v2/20261004-life-emergence/verify_browser.py` | Python 流程需 Playwright、Chromium 與 build 靜態服務（預設 5194，可用 PLW_V2_URL 指定）；使用可丟棄 context，build 不能代替操作驗收 |
| 資料遷移 | `npm.cmd run test -- src/services/saveService.test.ts`；V1 遷移保留世界欄位、時間、seed 與 RNG | `npm.cmd run test -- src/stores/gameStore.test.ts` 覆蓋 V1 載入不補離線時間；無效或不支援存檔明確拒絕並保留原始存檔 |
| 設定／依賴 | `npm.cmd ci`、`npm.cmd audit`、`npm.cmd run check` | `check` 執行 test＋type check＋build；未配置額外 lint runner |

單元測試使用可丟棄的記憶體世界，不讀正式存檔、不呼叫網路；可重複執行。瀏覽器驗收使用獨立工作階段的本機存檔。V2 驗收與已知限制見[開發與測試紀錄](reports/v2/20261004-life-emergence/README.md)，V1 證據保留在原 Ticket 與報告。

每個實際存在的驗證入口須填寫工作目錄／命令、成功判準及必要環境；fallback 要說明不能證明的部分。若測試使用可丟棄 fixtures、無正式資料或外部副作用，可明確列為已授權的可重複執行檢查；未確認的安全條件不得先填為事實。驗證失敗先區分既有問題與本次回歸，必要證據無法取得時依 AGENTS 記錄阻塞。

## 三層 AI 規範

```text
AGENTS.md
  └─ 永遠載入：角色責任、工程底線、驗證與 workflow 路由
      ├─ 行為變更／跨模組／未知原因除錯 → docs/development/ai-development-guide.md
      ├─ 選擇 Skill／準備交付 → docs/agents/skill-workflows.md／review.md
      ├─ 多人／授權／風險／Audit → docs/governance/ai-governance.md
      ├─ 未完成任務接續 → docs/HANDOFF.md
      └─ 準備委派工作 → docs/SUBAGENTS.md
```

根規範保持精簡；條件式文件只在觸發對應流程時載入。Scoped `AGENTS.md` 可增加專案或技術棧限制，但不得降低根規範底線。

## 啟用設定檔

以協作複雜度與風險選擇最小設定檔；專案大小只作參考。任何 L3 工作即使位於微型專案，也必須升級採用中大型設定檔的治理與 Audit。

| 設定檔 | 適用情況 | 固定啟用 | 條件式啟用 |
| --- | --- | --- | --- |
| **微型** | 單一工具、prototype、一次性腳本；單一 Agent；以 L1 為主 | `AGENTS.md`、README 必要契約、最接近變更的驗證 | 行為工作讀取 Development Guide；backlog 或跨 Session 工作建立 Ticket；需要接續才建立 `.scratch` |
| **小型** | 持續維護的應用；存在 API、UI 或多模組；以 L1–L2 為主 | Root＋適用 scoped 規則、README 必要契約、相稱驗證 | 行為工作讀取 Development Guide 與受影響 API／UI 契約；正式工作讀目前 Ticket；委派／跨環境才讀 Subagents／Handoff；L2 依風險 Audit |
| **中大型** | 多服務、多團隊、敏感資料、production 或 L3 工作 | Root＋適用 scoped 規則、README 必要契約、相稱驗證 | 依任務觸發 Development Guide、Governance、Ticket、整合驗證；多 Agent／跨環境讀相應文件；L3 必須 Independent Audit 與 Owner 核准 |

設定檔只決定預設載入範圍，不降低 Root 的正確性、安全性、Scope 與驗證底線。條件未觸發時不預建空目錄、空契約或儀式性 Report。

選擇大型專案設定檔不代表每次錯字修正都讀取全套文件；以本次風險與受影響範圍決定。Root、scoped 與 README 的適用指示仍須掌握；不能用小任務分類避開正式 Ticket 或 L3 條件。

## 架構導覽

- `src/domain/types.ts`：可序列化人物、NPC、世界與戰鬥狀態。
- `src/data/config.ts`：日曆、地圖、物品、職業、怪物與建築資料。
- `src/engine/`：獨立於 Vue 的時間、RNG、移動、生活、戰鬥與每日演化；`gameLoop.ts` 提供單一排程。
- `src/services/saveService.ts`：依 `CONFIG.saveVersion` 驗證與序列化存檔；V1→V2 遷移新增人生資料，不消耗舊 RNG，也不補算離線時間。
- `src/services/playJournal.ts`：進度與待補寫紀錄一起保存；IndexedDB 追加、重送去重與完整紀錄讀取。
- `src/stores/gameStore.ts` → `src/App.vue`：Pinia 接上 engine，Vue 負責 DOM／CSS Grid 呈現；Emoji 只放在 presentation／UI。
- `src/components/`：世界地圖、情境內容與共用像素視窗／進度／訊息；`src/presentation/worldUI.ts` 從真實 state 產生附近互動與世界圖示。
- `src/style.scss`：黑白復古 UI 的執行期 token 與響應式樣式；視覺正本為 `docs/design/DESIGN.md`。

預設 30 日／季、120 日／年，真實每秒推進 2 遊戲分鐘，支援暫停／×1／×5／×20。新世界在開場按下「起身」前保持暫停；開始後只在目前 Session 依選定倍率推進。背景分頁的延遲會在同一 Session 補進，關閉頁面後不模擬離線時間。每次有效操作或世界時間推進立即存檔，每 10 秒及頁面隱藏／離開時再保存。損毀存檔禁止自動覆蓋；重建世界必須由介面確認。

遊玩紀錄保存操作結果、前後遊戲時間及完整事件，介面只提供追加與「匯出遊玩紀錄」，沒有編輯或回退。進度與待補寫紀錄一起存入 localStorage，紀錄庫交易完成後才清除待送資料；重載會補寫且同一筆不重複。舊 version 1 存檔可載入，啟用前被裁切的事件無法補回。重建世界保留舊遊玩紀錄。

紀錄庫暫時不可用時，介面提示待補寫並保留資料；進度保存失敗會暫停時間，可重試或匯出目前記憶體資料。紀錄庫無法讀取時匯出會明示只含待補寫紀錄與目前進度。此版本以單機為範圍，未製作伺服器。

固定使用 `tickets/` 保存 Work Authority。條件式目錄按需求建立：`docs/CONTEXT.md` 保存共享 Domain／架構語彙；`docs/adr/` 保存重大且難逆轉的決策；`reports/audit/` 只在觸發 Independent Audit 時建立；`.scratch/<task>/` 只保存未完成任務。

## 文件索引

- [AGENTS.md](AGENTS.md)：跨專案工程底線與條件式流程入口
- [AI Development Guide](docs/development/ai-development-guide.md)：Ponytail、Surgical Changes、Debugging、TDD 與 Silent DoD
- [AI Governance](docs/governance/ai-governance.md)：角色、Authority、風險、Audit 與 Acceptance
- [Work Authority](docs/agents/work-authority.md)／[Ticket Convention](tickets/README.md)／[Domain Docs](docs/agents/domain.md)：工作正本、固定格式與 Domain 文件位置
- [Skill Workflows](docs/agents/skill-workflows.md)／[Review](docs/agents/review.md)：來源適配、審查範圍及失敗處理
- [Handoff](docs/HANDOFF.md)：未完成任務跨環境接續
- [Subagents](docs/SUBAGENTS.md)：委派契約、邊界與整合驗收
- [Agent Routing & Naming Rules](docs/agents/agent-routing.md)：固定角色、模型／推理路由、升級與命名規則
- [TODO.md](TODO.md)／[CHANGELOG.md](CHANGELOG.md)：backlog 與已完成的重要變更
- [Design](docs/design/DESIGN.md)／[UI Contract](docs/UI.md)：世界優先設計與實際元件、操作、token 契約
- [V2 Life & Emergence Spec](docs/specs/V2-LIFE-EMERGENCE.md)：V2 產品規則、系統切片與 Fun Gate 驗收條件
- [V2 最終 QA](reports/playtests/20261004-v2-final-qa/README.md)：229 tests、最新2小時Chromium、三路Agent探索與長期世界驗證；工程／Browser／Agent PASS WITH FINDINGS，歷史產品測試的真人Fun Gate仍PENDING；目前V2.x開發階段為DEFERRED
- [真人 Fun Gate 測試包](reports/playtests/20261004-v2-final-qa/human-fun-gate.md)：1～2小時自由遊玩、八題及觀察欄；不以Agent代填
- [UI 驗收紀錄](reports/ui/20261003-world-first/README.md)：桌機／平板／手機截圖、遊玩流程與限制
- [完整遊玩測試](reports/playtests/20261003-comprehensive/README.md)：生活、Boss、世界演化、存檔故障與長時間驗證
- [單機保存驗證](reports/playtests/20261003-local-autosave/README.md)：即時保存、補寫、匯出與瀏覽器故障恢復
- [自動測試紀錄](scripts/README.md)：本機追加報告版本與重現命令

無後端 API；遊戲介面契約集中於 `docs/UI.md`。
