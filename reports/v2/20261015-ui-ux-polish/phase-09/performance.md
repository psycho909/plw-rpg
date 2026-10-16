# Phase9-F1 效能與儲存基準

## 測量邊界

此報告使用 `browser-stress.md` 所述約 20 分鐘 production dist 壓力 run：Chrome 153.0.8010.53 headless、Windows x64、Node v22.14.0；HEAD `c0a377b50e09b67664bc07b65d4e81a382daa53f`。src SHA-256 `d312c8b3a95f96ba6609d2531fd770d2b19df3ac64a7796905c2c1fa29ecd305`；以排序的相對檔案路徑和逐檔 SHA-256 串接後再次 SHA-256。production dist SHA-256 `72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04`。原始資料位於 `f1-runner/attempt-20261016T015258432Z-stress/`。

## 指標

| 項目 | Phase9-F1 | 判讀 |
|---|---:|---|
| 點擊至可見文字改變 | n=4,238；P50 42ms；P95 55ms；max 200ms | 最多 1.2 秒、20ms 間隔輪詢；只納入可見文字改變點擊 |
| Inventory 開啟 | P95 63ms | 選單至 inventory 內容可見 |
| Collection 分頁 | P95 56ms | 分類點擊至 `aria-pressed` 選取 |
| DOM nodes | 2,113–3,433；median 2,656 | 21 次 checkpoint |
| JS event listeners | 411–540；median 466 | 21 次 checkpoint |
| JS heap | 3.35–9.72 MB；median 5.34 MB | 單一 Chrome session 的 checkpoint 值 |
| IndexedDB journal | 2→330 rows；JSON projection 1,369→101,164 B | projection 不等於資料庫檔案大小 |
| navigator.storage usage | 4,349→300,981 B | Chrome storage estimate，不是磁碟實際用量 |
| IndexedDB errors / unhandled rejections | 0 / 0 | 21 checkpoints；壓力 run errors 為空 |
| 重載持久狀態 parity | 3/3 equal | 比對 HUD、所在位置與玩家格座標 |

## Phase8-F 對照

Phase8-F 的點擊及路線 action 使用不同粒度，不能用 3,602 對 6,467 推論快慢。可對照的穩定性資料：兩次均約 20 分鐘、21 checkpoints、3/3 重載 parity、0 run errors。Phase8 heap median 4.40 MB、DOM median 4,140、listeners median 815；F1 分別為 5.34 MB、2,656、466。兩個 run 的操作流與記錄方式不同，不能把這些差距歸因於產品改善或退化。

Phase8-F 的 inventory/collection UI selector 每次 checkpoint 都逾時，當時沒有有效延遲值；F1 修正為直接等待可見內容與分類選取狀態後，取得上述 P95。此差異反映測量有效性改善，不是兩版本 UI 延遲的直接比較。

## 決策與限制

資源數據、錯誤數、重載 parity 與 modal lifecycle 沒有顯示需要加跑 60 或 120 分鐘的跡象，因此本輪止於 1,200 秒要求。此判斷僅涵蓋單一 headless Chrome production-dist session；不代表實體裝置或其他瀏覽器表現。點擊至文字變化不是端到端輸入延遲；storage usage 與 JSON projection 也不是磁碟用量。沒有做真人遊玩、Fun Gate 或效能歸因結論。
