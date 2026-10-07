# Phase 5 UI plan — Craftsmanship

狀態：C 正常閉環、D 素材偏向、E UI 已驗收；F/G UI focused checks、型別、build 與 audit 通過，browser gate 待後續 QA。Home、雜貨店與鐵匠鋪共用同一工作台；F 傑作呈現沿用既有裝備列、詳情與成功回饋。

## 產品切片與視覺方向

- 第一個可用入口是現有雜貨店及鐵匠鋪視窗中的「工作台」區塊：沿用 `PlaceWindow`、`game.act` 與 engine plan。配方選擇涵蓋木石長矛、野外長矛、鏈甲與鐵短劍；欄位、費用、技能門檻、工作台時段及解鎖 denial 由 registry／plan 提供。狼牙、狼皮、月石選項完全依各 recipe allowlist 顯示，預設不使用素材。營業時間來自公開 plan metadata，和店鋪交易時段分開呈現；不新增場景或 modal。
- 仍以地圖為主視覺。工作台的辨識記憶點是店內既有像素風水平分隔下，一個精簡的「材料 → 成品」recipe 卡：材料以圖示加名稱／持有數量列出，成品沿用 gear 名稱與品質文字；不用儀表板、卡片牆、漸層或額外強調色。現有 `src/style.scss :root` tokens 和零圓角像素規則維持唯一視覺來源。
- 配方區使用原生按鈕群組與 `aria-pressed` 選取；細節區清楚列 recipe、輸入材料、金幣、體力、遊戲時間、技能需求、輸出基底及不可製作原因。Craft 按鈕只依公開 plan 結果啟用；忙碌／不可用維持固定按鈕尺寸，以 inline 狀態說明原因。
- 完成後顯示成功／拒絕訊息和明確成品名稱。透過 App 的一次性 instance-id 導覽橋接既有 `InventoryWindow` 的 gear 分類與選中項目，讓使用者在原有能力／詞綴比較、裝備與出售流程中檢查；不做第二個 inspector，也不複製 compare、affix 或賣價計算。
- 只有 registry 宣告允許的 influence materials 才顯示原生選項，並以相同區塊顯示一份素材成本、持有量及實際權重方向。狼牙影響裂傷／穿透詞綴抽選權重；月石影響銳利權重，並在成品已是傳說武器時提高月下獵手特性機率。素材不改變稀有度機率，也不保證指定詞綴或特性出現；不把狼牙、狼皮或月石折成無差別成本。
- E 配方可選取檢視；未解鎖時顯示 plan denial 並停用製作。成功練習 XP、配方畢業上限、熟練度品質下限／權重及下一解鎖目標直接讀 public plan；不在 UI 重算 gate 或機率、不呈現原始能力加成，不加入 F masterpiece 或 G ownership 內容。
- F 只把 engine 成功結果的 masterpiece flag 與既有 `craftProvenance` 呈現為「鍛造傑作」；裝備詳情保留原製作者、遊戲時間和 recipe 名稱，傑作標記不取代既有稀有度或宣稱通用最佳裝備。仍沿用現有檢視裝備導覽；不新增 inspector、稀有度或 G ownership UI。
- G 在既有 Home、雜貨店和鐵匠鋪 PlaceWindow 共用同一工作台區塊。實際站點、時段和服務費全部顯示 plan 值；Home 的使用利益說明只在至少一項 recipe plan 實際解析到家中工作台時顯示。`IdentityWindow` 只把 engine 形成的鍛造師／傑作匠師 ID 映射成 label，不重算身分或聲望門檻。
- Smithing 等級加入現有 `CharacterSheet` 熟練度列表；配方解鎖／能力以 engine projection 的條件文字呈現。Crafted provenance creator、時間、recipe 與 Masterpiece 身分在既有 Inventory gear detail 顯示，後續 IdentityWindow 再以既有 character-life projection 呈現 crafter 身分。UI 不先推測尚未釋出的 E/F identity 規則。

## UI ↔ public preview / craft contract

UI 需要 engine 提供下列穩定、唯讀可投影契約（名稱可由 core owner 調整，但語意需一致）：

1. `planCraft(state, { recipeId, influenceMaterial? })` 回傳帶 discriminant 的 preview：`allowed`、拒絕 reason code／本地化訊息、recipe 身分與輸出基底、所選材料及其來源／需求／持有量、gold／stamina／minutes、skill requirement/current level、station/access status、工作台時段與已知結果品質資訊。UI 不讀內部 RNG，也不自行重算費用或可行性。
2. `craft(state, sameRequest)` 回傳 typed success/failure；成功結果含已建立 `instanceId`、base／recipe 與必要呈現 provenance，失敗含明確原因。拒絕必須符合核心契約：不消耗 RNG、ID、材料、金幣、體力、時間或事件。UI 在呼叫時只提供 recipe 與合法選取，不可供應 caller-forged creator/time/quality。
3. Recipe registry 的 UI-safe projection 可列出角色目前可見／可解鎖 recipe、`station`、input source（角色 inventory 或 reward materials）、cost、skill requirement、output base、allowed bias materials 及方向性說明。解鎖條件、recipe eligibility 和站點 guards 由 engine 決定；UI 只翻譯展示。
4. Public contract 必須允許 `PlaceWindow` 使用同一個現有 `game.act`/journal/autosave 路徑，並保留結果回傳給 UI（若目前 `game.act` 只回傳 void，請 core/UI owner 提供經確認的 minimal result bridge；UI 不應在 action 外再呼叫 craft 或自行推斷成功）。
5. Inventory 必須有受控的暫時 `focusInstanceId` 輸入或等價公開選取方式，讓 App 從工作台導覽到既有 gear detail。此選取屬視窗暫態，不寫入 save；無效／已消失 instance 回到 InventoryWindow 原本預設選取。

## 公開 selectors / 投影

- `projectCrafting(state, recipeId?, influenceMaterial?)`（建議置於 `src/presentation/craftingProjection.ts`，UI owner）：回傳可見配方列、選定 recipe preview、材料／金幣／體力差額、站點與活動狀態、禁用理由及可執行狀態。以 `planCraft` 作唯一合法性來源；不得在 `PlaceWindow` 複製 domain 條件。
- `projectCraftResult(state, result)`（若結果回傳資料不足）：只把 engine success 映射成 UI 可讀名稱／instance id，不生成或改寫 provenance。
- `CharacterSheet` 直接讀既有 `game.character.skills.smithing`，僅待 core schema release 後增加欄位；當前不得用 fallback 補造技能 state。
- Existing `projectGearPage`／`projectGearComparison` 是裝備列表、選中裝備與比較的唯一 owner；僅擴充以顯示已驗證的 craft provenance／quality，保留 rarity、affix 和舊裝備顯示。

## 建議檔案所有權與次序

C public contract release 後，UI owner 可改：

- `src/components/PlaceWindow.vue`：雜貨店工作台、recipe 選取、preview、提交與完成訊息。
- `src/App.vue`：一次性的 craft result → inventory focus 導覽橋接，保持既有單 modal／Esc／焦點復原行為。
- `src/components/InventoryWindow.vue`、`src/presentation/rewardProjection.ts`：使用既有 gear detail 顯示 crafted creator／時間／recipe／quality；支援受控 focus instance。
- `src/components/CharacterSheet.vue`：Smithing projection。
- `src/presentation/craftingProjection.ts`（或核心 owner 已提供同等公共 projection 時沿用，不另造 duplicate）：配方 UI projection。
- `src/style.scss`：少量新增工作台／preview／材料狀態樣式，僅使用既有 tokens，新增樣式遵守全域 scrollbar、focus、reduced-motion 和窄螢幕規範。
- 必要的 presentation/component tests 只在 C public API 穩定且 UI implementation 被 Root 釋出後新增；此設計工作不執行 UI tests 或改 `premium-ui.json`。

不改核心 owner 正在寫的 `src/domain/*`、`src/engine/*`、`src/data/*`、`src/services/*`、save schema、core tests。C API 不穩或未確認時，只回報 contract request，不開工 UI。

## 驗收行為（UI 開工後）

- 390px 及桌面下工作台可讀；地圖／PixelWindow 的 World First、canonical Escape、觸發焦點還原、對比與 reduced-motion 延續既有實作。
- 配方選擇是鍵盤可操作的 native button group，`aria-pressed` 正確；disabled recipe 有原因，不只靠顏色區別。
- 依實際 preview 驗證缺材料、缺金、體力不足、錯誤站點／未營業、戰鬥／死亡／礦坑等拒絕畫面，不自行編造前端規則；狼牙／月石選擇只呈現 registry allowlist，缺素材時保留 plan 拒絕原因；通過 craft 後顯示真實產物並能從 Inventory 比較、裝備、保存／重載。
- 選取／導航不持久化；失敗不污染 World state。稀有素材選擇在 D 釋出後用 engine projection 的 bias copy 和擁有量驗收。
- Identity / masterpiece 欄位只在對應 E/F/G 公共資料釋出後顯示，與現有 life/gear projection 一致。
