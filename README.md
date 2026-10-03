# Persistent Living World RPG — Oakvale

<!-- Based on project-standards: <commit-or-release>. 複製後請完成所有必要欄位。 -->

## 目的

V1 瀏覽器原型。玩家控制一名居民，自由選擇耕作、工作、採集或冒險；NPC、人口、聚落、怪物與地下城沿同一時間軸自主演化。產品與驗收正本為 [SPEC.md](SPEC.md)。

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

## 正式網站與部署

遊戲網址：[plw-rpg.vercel.app](https://plw-rpg.vercel.app)。

Vercel 專案為 `psycho909s-projects/plw-rpg`，Git integration 連接 `psycho909/plw-rpg`，Production Branch 為 `main`。推送至 `origin/main` 後，Vercel 自動 build 並更新正式網址；其他分支使用 Preview deployment。[Vercel Git integration](https://vercel.com/docs/git)

部署使用 Node.js 22、Vite preset、`npm ci`、`npm run build` 與 `dist`。交付前在本機執行 `npm.cmd run check`；Vercel build 失敗時不會把失敗產物切換成正式版本。設定與驗證證據見 [部署 Ticket](tickets/20261003-vercel-production.md)。

存檔保存在該瀏覽器的 localStorage；正式網址與 localhost 的存檔各自獨立，不會自動跨裝置同步。`.vercel/`、`.env*` 保持 Git 忽略。

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

| 角色 | 預設允許模型／身份 | 權責 |
| --- | --- | --- |
| Orchestrator／Final Reviewer | 目前 Session 選用的主 Agent 模型；建議 GPT-6.1 Sol，仍可選用可用的 Astra 或 Luna | 需求、架構、風險、整合與最終驗收；重大例外仍由 Owner 決定 |
| Developer | GPT-6 Luna Max；以 `.codex/agents/luna_worker.toml` 為設定正本，入口依 [Subagent 規則](docs/SUBAGENTS.md) | 已授權且邊界明確的施工；不得自行擴權或發布 |
| Independent Auditor | 未參與施工的獨立 context；以 subagent 委派時同樣使用 GPT-6 Luna Max | 必要獨立稽核；L3 最終授權仍屬人類 Owner |

角色不是模型暱稱；一般 L1／L2 review 的執行者與 fallback 見 [Review 規範](docs/agents/review.md)。切換主 Agent 模型不改變 Ticket、安全與 Git 權限；所有 subagent（包含 review／audit）固定 GPT-6 Luna Max，不把工具內建的舊版 `luna_worker` 誤認為已升級。不以推測的單一模型能力刪掉共通保障。

Skill 首選來源與適配見 [Skill Workflows](docs/agents/skill-workflows.md)；若專案另選來源，在此記錄完整 Skill 名稱與理由，避免僅寫短名稱造成不同裝置選到不同流程。

### GPT-6.1 Sol 使用設定

官方來源核對日期：2026-10-02。主 Agent 可在目前 Codex Session 選用 GPT-6.1 Sol；需要明確設定時，以下為主 Agent 的設定範例，僅套用到目標專案／Session，不能覆寫 `luna_worker` profile：

```toml
model = "gpt-6.1-sol"
model_reasoning_effort = "medium"
```

GPT-6.1 Sol 支援 `low`、`medium`、`high`、`xhigh`、`max`；官方模型預設為 `medium`，不支援 `none`／`minimal`。目前用戶端可能有不同預設或更多選項，須確認實際可用設定；本範例不自動切換模型或降低已選用的推理設定。[官方模型說明](https://developers.openai.com/api/docs/models/gpt-6.1-sol)

沿用目前有效的推理設定；需要起點時一般工作採 `medium`，複雜資料流／回歸／安全 review 可比較 `high`，更高等級只在代表性任務證據顯示有必要時使用。這是專案選用建議，AGENTS 不要求每個任務都使用最高設定；較高推理設定可能增加時間及 token。[官方 Subagent 與推理設定指引](https://learn.chatgpt.com/docs/agent-configuration/subagents)

AGENTS 沿用按需讀取、授權內持續完成、G3 事件式更新、條件式委派與相稱驗證。官方 GPT-6 指南的五項提示主要描述 Astra 行為，可作家族方法起點，仍須用選定模型與實際工作評估；本規範更新不代表已完成 GPT-6.1 Sol 的 runtime、速度、成本或品質實測。[官方 GPT-6 指南](https://developers.openai.com/api/docs/guides/latest-model)

模型名稱、設定檔與請求被接受只代表選用／路由證據；未取得 runtime 遙測時，不推論後端實際執行模型。高風險工作由主 Agent 整合及最終驗證；必要 Independent Audit 仍依治理規範由未參與施工的獨立 context 執行。

## 驗證

<!-- 保留實際存在的變更類型；不適用時標記 N/A。 -->

| 變更類型 | 首選驗證 | 替代驗證或限制 |
| --- | --- | --- |
| 文件 | 根目錄 `git diff --check`、核對連結與 Ticket | 不證明執行行為 |
| 程式模組 | 根目錄 `npm.cmd run test`；Vitest exit 0 | 包含 1／10／50 年 headless；無 DOM |
| API | N/A（無後端） | 不呼叫外部 API |
| UI | `npm.cmd run build`＋本機實際瀏覽器操作；可重現流程 `python reports/ui/20261003-world-first/verify.py` | Python 流程需 Playwright、Chromium 與已啟動的本機 Vite；使用可丟棄 context，build 不能代替操作驗收 |
| 資料遷移 | N/A（V1 存檔 version 1） | 不支援版本明確拒絕並保留原始存檔 |
| 設定／依賴 | `npm.cmd ci`、`npm.cmd audit`、`npm.cmd run check` | `check` 執行 test＋type check＋build；未配置額外 lint runner |

單元測試使用可丟棄的記憶體世界，不讀正式存檔、不呼叫網路；可重複執行。瀏覽器驗收使用獨立工作階段的本機存檔。驗收證據保存在對應 `tickets/20261002-v1-*.md`。

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
- `src/services/saveService.ts`：版本／資料驗證、序列化與最多 8 小時離線模擬。
- `src/stores/gameStore.ts` → `src/App.vue`：Pinia 接上 engine，Vue 負責 DOM／CSS Grid 呈現；Emoji 只放在 presentation／UI。
- `src/components/`：世界地圖、情境內容與共用像素視窗／進度／訊息；`src/presentation/worldUI.ts` 從真實 state 產生附近互動與世界圖示。
- `src/style.scss`：黑白復古 UI 的執行期 token 與響應式樣式；視覺正本為 `docs/design/DESIGN.md`。

預設 30 日／季、120 日／年，真實每秒推進 2 遊戲分鐘，支援暫停／×1／×5／×20。離線固定使用 ×1 換算，最多 8 真實小時（40 遊戲日）；即使上次離開前暫停，重新開啟仍會處理離線演化。自動存檔每 10 秒，並於頁面隱藏／離開時存檔。損毀存檔禁止自動覆蓋；重建世界必須由介面確認。

固定使用 `tickets/` 保存 Work Authority。條件式目錄按需求建立：`docs/CONTEXT.md` 保存共享 Domain／架構語彙；`docs/adr/` 保存重大且難逆轉的決策；`reports/audit/` 只在觸發 Independent Audit 時建立；`.scratch/<task>/` 只保存未完成任務。

## 文件索引

- [AGENTS.md](AGENTS.md)：跨專案工程底線與條件式流程入口
- [AI Development Guide](docs/development/ai-development-guide.md)：Ponytail、Surgical Changes、Debugging、TDD 與 Silent DoD
- [AI Governance](docs/governance/ai-governance.md)：角色、Authority、風險、Audit 與 Acceptance
- [Work Authority](docs/agents/work-authority.md)／[Ticket Convention](tickets/README.md)／[Domain Docs](docs/agents/domain.md)：工作正本、固定格式與 Domain 文件位置
- [Skill Workflows](docs/agents/skill-workflows.md)／[Review](docs/agents/review.md)：來源適配、審查範圍及失敗處理
- [Handoff](docs/HANDOFF.md)：未完成任務跨環境接續
- [Subagents](docs/SUBAGENTS.md)：委派契約、邊界與整合驗收
- [TODO.md](TODO.md)／[CHANGELOG.md](CHANGELOG.md)：backlog 與已完成的重要變更
- [Design](docs/design/DESIGN.md)／[UI Contract](docs/UI.md)：世界優先設計與實際元件、操作、token 契約
- [UI 驗收紀錄](reports/ui/20261003-world-first/README.md)：桌機／平板／手機截圖、遊玩流程與限制

無後端 API；遊戲介面契約集中於 `docs/UI.md`。
