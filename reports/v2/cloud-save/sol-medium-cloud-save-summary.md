# Cloud Save MVP — worker implementation summary

- 日期：2026-10-17
- 派工：`.scratch/20261017-cloud-save/dispatch-sol-medium-cloud-save.md`
- Work Authority：`tickets/20261017-cloud-save-mvp.md` 的 Lead 設計契約；限指定前端施工範圍。
- Branch／HEAD：`feature/cloud-save`／`2613459dfe8ab16896858749b3fc43b049906a7c`。
- 結果：worker 範圍實作與本機驗證完成，交回 Lead 整合；不是整張 L3 Ticket 的 accepted，也不是獨立 Audit。
- 未委派、未使用 herdr、未 commit／push、未修改 Supabase 設定／Schema、未執行真實服務寫入，未讀取或記錄秘密。

## 檔案

| 路徑 | 修改 |
| --- | --- |
| `src/services/cloudSave.ts` | 注入 Supabase-like client；SHA-256、UTF-8 大小與 checkpoint 驗證；insert／revision 條件更新／fetch；錯誤與衝突分類。 |
| `src/services/cloudSave.test.ts` | 13 項 mock client 測試。 |
| `src/stores/cloudStore.ts` | Pinia：缺設定停用、GitHub PKCE/session、獨立同步 metadata、writer 與五分鐘同步限制、offline／401／衝突、備份及確認後載入。 |
| `src/stores/cloudStore.test.ts` | 14 項 store 與真實 `gameStore.adoptCheckpoint` seam 測試。 |
| `src/components/CloudSaveWindow.vue` | 既有 PixelWindow 內的雲端內容；帳號、時間、revision、上傳／載入、衝突選擇與明確確認。 |
| `src/stores/gameStore.ts` | 只新增並匯出 `adoptCheckpoint(raw)`：writer 檢查、既有驗證、停止寫入與速度、寫入 SAVE_KEY、reload。 |
| `src/App.vue` | 雲端視窗 id／標題／選單項／渲染；啟動 cloud store，讓同步不依賴視窗是否開啟。 |
| `src/vite-env.d.ts` | 兩個可選 Vite env 型別。 |
| `.env.example` | 只有 `VITE_SUPABASE_URL=`、`VITE_SUPABASE_PUBLISHABLE_KEY=`，沒有設定值。 |

既有 `package.json`、`package-lock.json`、Ticket 與派工檔在施工前已是修改／未追蹤狀態，本 worker 未改動。沒有修改 journal、migration、writer lock、樣式或其他遊戲行為。

## 設計與資料安全

1. 重用 `unpackCheckpoint` 與現有 client，沒有新依賴。首次只 INSERT revision 1；更新同時限定 user_id、primary slot 與 expected revision，要求 select 回傳一列、revision + 1 與 checksum 一致；沒有 upsert。
2. 23505／0 列都會重讀；重讀失敗仍保留 conflict，停止自動同步，同時呈現 offline／請重新登入。下載通過 checksum、checkpoint、列擁有者與世界資料一致性驗證後才可套用。
3. 同步 metadata 使用 `oakvale-cloud-sync-v1`，只恢復目前登入使用者的有效 metadata。遠端版本與 base 不一致會提示衝突；帳號切換後忽略舊請求結果。token 更新保留衝突，恢復登入後清除過期的重新登入提示。
4. 自動同步只監看成功本機寫入後的 `game.savedAt`，且要求 writer、已登入、上線、無衝突、未忙碌、距離上次成功同步至少五分鐘。世界 id 改變時先要求選擇；網路失敗保留本機並在後續成功本機存檔再試。
5. 載入先抓取並驗證雲端，再成功保存最新本機 checkpoint、觸發備份下載，要求使用者確認備份已保存以及兩個世界／世界時間／本機未同步進度。取消或備份失敗不呼叫 adopt。衝突的「以本機取代雲端」會先重讀最新 revision，再確認，再條件更新；第二次競態不自動覆寫重試。

## 實際驗證

| 命令／檢查 | 結果 |
| --- | --- |
| `npx.cmd vitest run src/services/cloudSave.test.ts`（初始 service slice） | 12／12 PASS，exit 0。後续增加一項衝突重讀失敗測試。 |
| `npx.cmd vitest run src/services/cloudSave.test.ts src/stores/cloudStore.test.ts src/stores/gameStore.test.ts` | 修正初始 fixture 後，3 檔、95／95 PASS，exit 0；56.04 秒。包含 service 13、cloud store 14、既有 game store 68。 |
| `npx.cmd vue-tsc --noEmit` | PASS，exit 0。 |
| `npx.cmd vitest run src/stores/cloudStore.test.ts`（最後 token 恢復提示修正後） | 14／14 PASS，exit 0；3.62 秒。 |
| `npm.cmd run build`（最終程式版本） | PASS，exit 0；包括 vue-tsc；150 modules，Vite build 3.74 秒。 |
| `git diff --check -- src/App.vue src/stores/gameStore.ts`，及新檔 whitespace 檢查 | PASS；既有檔實際 diff 為 App 7／3、gameStore 8／1 行增刪。 |

測試涵蓋 insert 成功、23505 競態、conditional update、0 列與重讀失敗、checksum／JSON／schema／owner／revision 毀損、UTF-8 超大存檔、network／401、回傳不符、設定缺漏、OAuth options／session 恢復、writer／登入／interval／offline gate、衝突停止同步、token 更新、備份及確認 gate、確認後再次 revision 衝突、帳號切換的舊結果，以及真實 adopt 的非法存檔／non-writer 拒絕、停寫與 reload。

初始驗證發現兩個測試問題並已修正：Session fixture 缺少必要型別欄位；真實 gameStore 取得 writer 時會先正常保存，故 adopt 拒絕測試應以初始化後內容為基準、確認沒有任何 adopt 写入。最後增加 token 恢復提示斷言時曾放錯測試，已移到 401 衝突測試並重新通過；沒有改放寬預期行為。沒有宣稱完整 TDD RED／GREEN 證據。

部分 sandbox 執行被 esbuild `spawn EPERM` 阻擋，使用核准的沙箱外 Vitest／build 執行完成；不是產品失敗。已通過且後续沒有受影響修改的既有 gameStore／service 檢查未重跑。

## 自查與適用流程

- 使用 `supabase:supabase` 0.1.2、`matt-skills-curated:implement`（安裝套件 1.1.0）、`ponytail:ponytail`（5.3.2）。按 `docs/agents/skill-workflows.md` 適配驗證單位及派工禁止 commit／push／委派；沒有新增批准關卡。
- Standards 自查：完整讀取新增程式與測試，檢查 tracked diff 與未追蹤清單；重用既有保存流程、沒有新依賴、沒有無關重構；原有 App／gameStore 換行正規化避免整檔格式 diff。
- Spec 自查：對照 Lead 契約確認 auth、CAS、checksum、8 MiB、metadata、writer／interval、offline／401、備份／確認與 UI；沒有發現本 worker 範圍的未解阻擋 finding。
- 本自查由施工者執行，不能代替 L3 獨立 reviewer、Owner 最終核准或 Task D 真實服務證據；Ticket 保持 in_progress，Lead 接續。
- API 查證參考：[Supabase OAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)、[Supabase update](https://supabase.com/docs/reference/javascript/update)，及已安裝 2.117.2 的 client 型別；changelog.md 的 web fetch 因不支援 text/markdown 未取得，不宣稱已完成 changelog 掃描。

## 未檢查與風險／Lead 下一步

- 未執行真實 GitHub OAuth、RLS 隔離、跨裝置、真實 token 過期、Preview 或瀏覽器實際下載；依派工由 Lead 驗收。沒有執行全 repo test suite／`npm.cmd run check`，本報告只有上述指定範圍與 build 證據。
- 瀏覽器只能觸發下載，無法知道使用者是否真正保存檔案；確認文字明確要求先確認備份已下載保存，Lead 須以實際瀏覽器驗證下載及取消流程。
- `adoptCheckpoint` 保存失敗時會維持停寫與暫停、原始 localStorage 未被清除；需要保留頁面並排除瀏覽器儲存錯誤後重新整理。沒有改寫既有 gameStore 的錯誤／journal 流程。
- `.env.example` 已存在於工作樹，但既有 `.gitignore` 的 `.env*` 會忽略它（`git check-ignore .env.example` 已確認）。Lead 整合時需對無值範例明確 force-add 或依專案授權新增例外；worker 未 staging、未改 `.gitignore`。
- build 有超過 500 kB 的 bundle 提示（最終 JS 738.65 kB／gzip 220.80 kB）。這是 warning，未擴張 scope 做 code splitting。
- Lead 下一步：讀取此報告與實際未提交檔案，完成 Task A／D、完整工程 Gate 與獨立 review，再依 Ticket 處理 Preview、commit／push。worker 的 Git／外部發布禁止仍有效。

## Follow-up — auth 狀態不得被同 token 重播清除

- 依據：`.scratch/20261017-cloud-save/followup-auth-status.md`；Lead 真實服務 E2E 發現 P3：無效 token 的 session 重播會誤清除「請重新登入」。
- 本次只改 `src/stores/cloudStore.ts`、`src/stores/cloudStore.test.ts`，並追加本節；沒有修改其他功能、委派、commit／push 或真實服務操作。
- 修正：auth 失敗當下僅在記憶體保存失敗的 access token，將 auth event 傳入 `acceptSession`。同使用者只有 `SIGNED_IN`／`TOKEN_REFRESHED` 且 token 與失敗 token 不同時才解除 auth；同 token 重播保留提示，`INITIAL_SESSION` 即使 token 改變也不解除。沒有持久化或輸出 token。
- 回歸：兩種有效事件的新 token 都能解除提示並繼續成功讀取雲端；衝突仍保留。既有衝突測試改用不同的測試 token，符合更新後的契約。
- 流程：使用 `matt-skills-curated:tdd`，先觀察以下預期原因的 RED，再修改正式程式；最後核對事件傳遞、auth 錯誤入口及成功讀取行為，未宣稱獨立 review。

### RED（修改正式程式前）

命令：`npx.cmd vitest run src/stores/cloudStore.test.ts -t 'keeps the re-login prompt'`

```text
INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED same-token replay:
AssertionError: expected 'ready' to be 'auth'
Expected: "auth"
Received: "ready"
Test Files  1 failed (1)
Tests       3 failed | 14 skipped (17)
Exit code   1
```

### GREEN（修正後）

命令：`npx.cmd vitest run src/stores/cloudStore.test.ts src/services/cloudSave.test.ts`

```text
Test Files  2 passed (2)
Tests       32 passed (32)
Duration    5.14s
Exit code   0
```

`npx.cmd vue-tsc --noEmit`：PASS，exit 0。本次兩個程式／測試檔與追加報告的 whitespace 檢查通過。

未重新執行真實 Supabase／GitHub E2E、完整 build 或獨立 Audit；這次只具備 mock 回歸及型別證據，Lead 須再驗證原本的真實服務重現流程。
