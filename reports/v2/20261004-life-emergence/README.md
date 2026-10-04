# Oakvale V2 — Life & Emergence 開發與測試紀錄

**V2-0～V2-6 工程候選版本已實作與驗證；V2-7 真人 Fun Gate 待驗收。** 本文件彙整本次新增功能、修復、遊玩紀錄與實際驗證，不能把自動化通過當作 V2 產品成功。

- 授權：[V2 Ticket](../../../tickets/20261004-v2-life-emergence.md)；完整 [正式規格](../../../docs/specs/V2-LIFE-EMERGENCE.md)。
- 基準：`2e8ad94132b0e1bff11c971f40185ce92afae06e`，交付分支 `work`；不 merge `main`、不部署、不開始 V3。
- 最終程式、build 與工具指紋：[verification-manifest.json](verification-manifest.json)。Git 提交包含本紀錄與待接續 handoff。
- 存檔仍限單機瀏覽器。沒有伺服器或跨裝置同步；使用者已排除原生 Safari 與手機實機測試。

## 完成／新增功能

| 切片 | 實際行為 |
| --- | --- |
| V2-0 Foundation / Migration | saveVersion 2；原生 V1 完整驗證後補 life metadata。世界 seed/RNG/time、角色、NPC、資源、歷史等舊欄位保持不變。存檔 key 保留 `oakvale-v1`。原檔不合法時保留，禁止自動覆寫。 |
| Active Idle | 單一 monotonic loop，×1／×5／×20、暫停、modal、同 session 分頁凍結／恢復。倍率改變前先 flush 舊倍率經過時間；關閉後不推進，重新載入不補 offline progress。 |
| Origin / Successor | 首代 OTHER_WORLD/gen1，開場按「起身」前暫停。死亡後選世界現有成年居民，LOCAL_WORLD/gen+1；世界、舊聲望、記事和所有權仍在，新角色不自動取得死者產業或 NPC 感謝。 |
| V2-1 Identity / Reputation | 依農作、採礦、戰鬥、技能、職涯、農場所有權自然形成多重身分。居民身分保留；人生里程碑與有界聲望變動歷史。聲望 -100～100 影響對話、產業資格與傭兵聘用。 |
| V2-2 NPC Life | 8 traits、7 career stages、6 位存活 featured NPC；職涯受年齡／技能／特質／職業／世界需求影響，退休停止工作。結構化重要記憶與脈絡對話，按距離、角色關係、職業或親歷分享，沒有全知或 LLM。 |
| V2-3 Ownership | 自宅：80 金、聲望≥0，8 小時休息及每種最多 99 件儲物。農地：140 金、聲望≥10、村莊。農場事業：220 金、聲望≥25、村莊、先有農地。每次手動供糧最多 10、每日 60，消耗實際食物、影響聚落與記憶。沒有 AFK 收入。 |
| V2-4 Living Events | 道路／食物／鐵礦 3 條 signal→development→reaction→outcome→consequence 完整事件鏈；幫助／忽略有不同持久後果。實際食物、戶外狩獵、鐵礦、照料傷者 4 種請求，不能用假完成取得回饋。 |
| V2-5 Director / Rare / News | 世界條件、玩家實際活動、stability、近期危機、quiet/recovery/cooldown 決定加權候選。少量精靈／法師／騎士旅人進出；具名 NPC 可自行挑戰 Boss，不給玩家假戰利品。消息分地方／區域／傳聞／重大。 |
| V2-6 World First UI | 選單新增「這一生」「住所與產業」「地方消息與委託」；居民詳情加入職涯、掛心事項與回憶。地圖以真 state 投影產業、居民、作物、威脅，迷霧保護未探索資訊。保留原 PixelWindow/PixelMeter/StatusNotice。 |

身分主要門檻：農民／礦工 10 次行為且技能 Lv2，熟練身分 40 次且 Lv4；冒險者 10 場且 Lv2，老練冒險者 50 場且 Lv5；職涯與所有權另有自然入口。傭兵基本聘金依聚落階段 20／25／30 金，低於 -25 聲望拒絕聘用，每 25 正聲望減 1 金、最多減 4 金。

## 優化與 bug 修復

- 世界使用 `shallowRef`；render 使用 detached character/NPC/life/property/world projection，避免原地更新與 Vue computed stability 使畫面停留在舊值。Astra 發現的 P1 已有 store regression 與真瀏覽器證據。
- engine 與 Vue／DOM 分離，新增 LOD 分類邊界。這是 active/simulated/abstract 分類接口，沒有宣稱已實作巨量 NPC 排程器。
- bounded 容量：近期世界 events 150、major history 20,000、news 60、arcs 12、requests 12、NPC 記憶與里程碑各 32。完整遊玩紀錄繼續追加到 IndexedDB。
- 修正真 V1 event 缺 tier 的 migration 拒絕、enum 錯誤 coercion、被裁切 arc 的孤立 request、首次 cooldown 排除、藥水請求聲望、自主 Boss actor、繼任 NPC 冒領死者恩情、退休 NPC 自主戰鬥及儲物回饋。
- 修正 QA 每日快照共用可變物件；重跑後第 1 日為 resident、最後一日才顯示累積身分。先前錯誤報告版本可由 playlog 追溯，沒有改寫歷史版本。

完整 finding / Standards / Spec 結果：[review.md](review.md)。Astra review 因使用額度中止；root 依 L2 契約完成 **非獨立 fallback**，不能稱為完整獨立稽核。

## 最終自動化驗證

| 驗證 | 結果與證據 |
| --- | --- |
| V1 baseline | 143 tests + build 通過，[baseline.log](baseline.log)。本次保留 V1 regression。 |
| `npm run check` | **14 files / 222 tests 全通過**，vue-tsc + production Vite build 通過，[check.log](check.log)。 |
| strict unused | `npx vue-tsc --noEmit --noUnusedLocals --noUnusedParameters` exit 0，[unused.log](unused.log)。 |
| production Chromium 151 | **20 checks**，零 uncaught exceptions。[browser.json](browser.json)／[browser.log](browser.log)。×1/×5/×20、modal、開場、reload、真 V1、即時 UI、退休跨日、quota/recovery、真 CDP freeze/resume、損毀原檔保護、完整 journal download。 |
| Firefox ESR 153.4 | **8 checks**，開場、單一 modal、鍵盤焦點/Esc、×20、自動保存、reload、IndexedDB ID、零 uncaught errors。[firefox.json](firefox.json)／[firefox.log](firefox.log)。 |
| V1 committed fixture | 舊基準 engine 真實產生雙角色／繼任、4880 遊戲分鐘的 V1 存檔；history 原本無 tier。比較全部舊欄位、RNG/time，migration 與後續 roundtrip 通過。[證明](native-v1.json)、[原始 fixture](fixtures/native-v1.json)。 |
| seeded/batch/save worlds | 3 seeds × 10／50／100 年共 **9 組**，one batch 與 30 日 batches deepEqual，save/reload 不變、ID 唯一、history/metadata 有界，[long-play.json](long-play.json)。 |
| 極長 regression | suite 中保留 **500 年含死亡繼任與完整歷史／續玩** 的實際測試；另有 minute/hour/day batching、180 日每日 event request 存檔、dialogue 新舊 actor 正反對照。 |
| UI strict audit | premium strict audit **0 findings**，[premium-audit.json](premium-audit.json)。沒有新增 framework/token owner。 |

曾失敗且修復後重新通過的 RED 證據：[projection-red.log](projection-red.log)、[integration-red.log](integration-red.log)、[native-migration-red.log](native-migration-red.log)。不能以它們聲稱全程嚴格 TDD；它們保留實際失敗回圈。

UI 截圖：[桌機住所](property-desktop.png)、[768×1024](property-768.png)、[390×844](property-390.png)。後兩者為 desktop Chromium viewport，**不是手機實機**。無 native Safari／實機結果。

## 30 遊戲日模擬遊玩紀錄

Seed 909，角色奧登，初始 480 分鐘 → 43,680 分鐘，實際經過 **43,200 分鐘＝30 個遊戲日**。共 **1,186 次** engine 操作，沒有注入金幣、物品、技能或戰鬥數值。每一天都 serialize/deserialize deepEqual。

路線使用實際移動、整地、播種、收割、每日採鐵、營業時間賣出、休息、與 featured NPC 交談、具備條件時照料傷者、買住所、主動等待。第 1 日為 resident／25 金；第 30 日為 resident、farmer、miner、skilledFarmer、skilledMiner／4,495 金，已取得自宅。逐日身分、NPC 人口、消息、每次行為與 major events 都存於 [long-play.json](long-play.json)。

**觀察：**積極農作＋賣礦路線收益高，這次沒有擅改 V1 經濟核心公式。它是特定最佳化生活路線的數據，不能推論正常玩家平均收入、Boss 平衡或「已經好玩」。後續真人 Fun Gate 若顯示取得產業太快，可依回饋做 V2 門檻調整。

這次 30 日路線未打 Boss／地下城；Boss、傭兵、地下城、Threat、戰利品等以保留／新增 unit regression 和歷史 V1 QA 作分別證據，沒有捏造本次自然長路線完成所有內容。V2 新 NPC 自主 Boss 與 request 狩獵有專門測試。

## 多年世界測試

遊戲日曆為 120 日／年。下列時間為 Node 真 engine 的兩種 batch 演化、序列化與比對耗時，**不是實際等待多年或長時間 browser soak**。100 年案例角色死亡後世界仍演化；自動繼任由獨立 500 年 regression 覆蓋。

| Seed | 遊戲年 | 驗證耗時 ms | save bytes | history | NPC life metadata | determinism / roundtrip |
| --- | --- | --- | --- | --- | --- | --- |
| 17 | 10 | 498 | 212,808 | 97 | 79 | PASS |
| 17 | 50 | 1177 | 314,316 | 307 | 80 | PASS |
| 17 | 100 | 2340 | 340,456 | 618 | 87 | PASS |
| 909 | 10 | 199 | 215,865 | 91 | 79 | PASS |
| 909 | 50 | 1203 | 300,383 | 298 | 81 | PASS |
| 909 | 100 | 2338 | 336,966 | 609 | 87 | PASS |
| 2026 | 10 | 247 | 232,932 | 103 | 79 | PASS |
| 2026 | 50 | 1151 | 322,209 | 303 | 80 | PASS |
| 2026 | 100 | 2333 | 338,346 | 618 | 87 | PASS |

每組 news≤60、arcs≤12；ids/history/reference 邊界與 save/load 一致。

## 短時段 browser profiling

- 單次 GC 後 JS used heap：4,263,332 bytes；DOM：2,293 nodes／463 listeners；該 fixture save：約 90,849 bytes。
- 新世界短 session IndexedDB estimate：27,762 bytes，31 條 journal、邏輯 JSON 7,425 bytes；origin-wide estimate 不等同檔案精準尺寸。
- localStorage `setItem` 寫入採樣：0.1～0.3 ms，**不包含完整 serialize 成本**。
- journal 匯出完成／下載：63.7 ms，164,814 bytes；包含 automation/download overhead。
- 60 個 requestAnimationFrame 的 frame interval p95：16.7 ms，短 session 採樣，不是忙碌世界的 FPS 保證。

這些是短 browser 操作／快照，**沒有執行 V2 最新 build 的 2～4 小時實際 soak**，沒有長期 leak 斜率證據。過去 V1 的 2 小時 soak 留在原報告，不能當成此 V2 的證據。若再跑長時間監看，遵照使用者設定委派 GPT-6 Luna/low；本次 Luna 長測 agent 因額度限制無法開始，最後命令由 root 執行，不冒稱 Luna 已完成。

## 可重跑方式

```bash
npm run check
npx vue-tsc --noEmit --noUnusedLocals --noUnusedParameters
# 另一個 terminal 啟動最新 dist 的本機靜態服務：
python3 -m http.server 5194 --bind 127.0.0.1 --directory dist
# 需要已安裝 Python Playwright + /usr/bin/chromium：
python3 reports/v2/20261004-life-emergence/verify_browser.py
```

Firefox 工具 [verify_firefox.py](verify_firefox.py) 重用雲端既有 Firefox ESR/geckodriver 路徑，換環境時需先供應相同 driver 能力；不會自行安裝或把缺少 browser 當成通過。

```bash
node --input-type=module - <<'JS'
import { build } from 'esbuild';
await build({entryPoints:['reports/v2/20261004-life-emergence/long_play.ts'],bundle:true,platform:'node',format:'esm',outfile:'/tmp/plw-v2-long.mjs'});
JS
node /tmp/plw-v2-long.mjs
```

驗證腳本使用可丟棄世界／瀏覽器 profile，沒有修改正式玩家資料。沒有新增 npm 依賴；不宣稱未配置的 lint、formatter、DOM runner 或 Storybook 通過。

## 紀錄保存與待驗收

遊戲 checkpoint localStorage + journal IndexedDB 延續單機自動追加、待補寫 ACK/replay 去重與匯出。介面沒有編輯／回退紀錄功能；依使用者設定，本次不處理外部檔案修改／刪除的防護。

QA 文字／JSON 的每次發佈先 append 完整壓縮版本及 SHA-256 到 [playlog.jsonl](playlog.jsonl)，再原子更新可讀檔；fixture 在自己的 [fixtures/playlog.jsonl](fixtures/playlog.jsonl)。完整版本可解碼校驗；這是本機追加紀錄，不是伺服器不可變儲存。

**唯一產品驗收阻塞：真人 Fun Gate。** [FUN-GATE.md](FUN-GATE.md) 保存 1～2 小時遊玩背景、8 題回答、新存檔／不同 seed 比較的空白表。正式規格 §49 不允許因 tests pass 宣告成功，§51 V2-7 指定真人遊玩；未取得證據前維持 Ticket blocked，不開始 V3。
