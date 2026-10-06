# 獨立 forced-GC 效能診斷

- Source SHA：`c02b600c6f5f1533374d671b707d333c86d852d7`；凍結 build `/tmp/plw-v2-final-qa-dist`；唯讀確認 manifest 的全部 source hashes 相符。
- 執行：2026-10-05T04:18:17.678+00:00 → 2026-10-05T04:21:50.573+00:00，共 **212.895 真實秒**。Playwright＋`/usr/bin/chromium`，1440×1000、headless，與正式 soak 相同啟動參數。
- **本報告是另一個可丟棄 profile 的 forced-GC diagnostic，不是正式 soak 的 natural heap，也不是兩小時 PASS。** Profile：`/tmp/plw-astra-forced-gc-diagnostic-s2h0us8o`；browser root PID `160980`；world ID `5642a6b8-20f5-4893-99f0-9afbbc5d0532`。只建立並連接自己啟動頁面的 CDP session；結束時只關閉此 context。
- 判定：**存在可回收的記憶體／DOM counter 累積；仍有尚未解釋的回收後 DOM 數量。持續 leak 未證实，亦未排除 detached retention。列 P2 待追蹤效能疑慮，不是 P0／P1 correctness finding。** 不對正式 soak 的個別 retained objects 或 GC 原因作因果推斷。

## 方法與原始證據

正常新世界「起身」後 UI 點選 ×20；每30秒使用 `c/i/l/m/c/i` 開窗，再按 Escape 關窗，確認 dialog 已 detached。正常世界時間由480推進至8915，未修改時間、state、資源或使用 debug skip。每次量測僅回傳 DOM／localStorage 的數值與字串，不保留 DOM JSHandles。每一筆操作、UTC時間、量測及程序RSS都在 [raw JSON](forced-gc-diagnostic.json)，可重跑程式為 [diagnostic harness](forced-gc-diagnostic.py)。

前180秒不強迫GC，之後只對這個頁面呼叫 `HeapProfiler.collectGarbage` 並立即量測，再正常运行30秒，做第二次GC與量測。全部10份量測逐次以 `recorded_reports.write_recorded` 追加保存；原始錯誤未刪除。

served assets在開始與結束均與manifest完全一致：

| Asset | SHA-256 |
|---|---|
| `index.html` | `4bae8e855ffba8844b2b86db0c9ec18e1ea574feb53f2e35c212b6cb7c0f6d9c` |
| `assets/index-3j-oQD-G.js` | `69f6943b69d9ea376f9d11d4f62277656eea43e0173fa0d24374a76f4f6ff00c` |
| `assets/index-CEjw7W01.css` | `08f388b87104e268347571f8969f37e208908089fadf7f0bdd939866d76f569f` |

## 量測結果

MB為10⁶ bytes；RSS是此Chromium程序樹總和，共享記憶體可能重複計算。CDP nodes包含的節點種類與 `getElementsByTagName('*')` 的 live elements不同，不可直接把相減值當作 detached nodes。

| Sample | 真實秒 | Live elements | CDP nodes | Listeners | JS used MB | Embedder MB | Tree RSS MB |
|---|---:|---:|---:|---:|---:|---:|---:|
| natural-initial | 1.835 | 882 | 2165 | 434 | 5.208 | 6.989 | 820.875 |
| natural-30s | 32.497 | 887 | 2387 | 527 | 16.667 | 5.299 | 880.321 |
| natural-60s | 62.507 | 887 | 2782 | 784 | 26.143 | 9.014 | 882.954 |
| natural-90s | 92.457 | 876 | 3102 | 1048 | 11.567 | 10.548 | 881.943 |
| natural-120s | 122.526 | 882 | 4549 | 886 | 16.697 | 7.714 | 934.367 |
| natural-150s | 152.493 | 882 | 5083 | 1092 | 54.719 | 8.413 | 936.460 |
| natural-180s | 182.475 | 882 | 5439 | 1360 | 12.114 | 10.691 | 935.678 |
| forced-GC-1-immediate | 182.573 | 882 | 4864 | 881 | 5.194 | 4.803 | 842.908 |
| after-GC-recovery-30s-before-GC2 | 212.630 | 887 | 4888 | 940 | 6.049 | 5.248 | 851.853 |
| forced-GC-2-immediate | 212.721 | 887 | 4870 | 884 | 6.574 | 5.141 | 823.841 |

第一輪GC相較緊鄰的前一樣本：nodes減10.6%、listeners減35.2%、JS used減57.1%、embedder heap減55.1%、RSS減9.9%。因此「數值上升全部都是不可回收leak」不符合本次觀測；至少部分累積可被回收。

但第一次GC後nodes=4864，第二次GC後=4870，仍明顯高於初始2165，不能把結果寫成「完全回到基線」或「只是Oilpan延遲GC」。兩次GC間只有30秒，且没有再次開關同一視窗的反覆 post-GC 循環；這不能建立無界 retained growth 的斜率。第一次樣本尚有4個documents，其後為1，另有一次首次打開地圖造成的counter跳增；初始值並非預先GC後的可比基線。

自然段JS heap本身曾26.14→11.57MB、54.72→12.11MB下降，與DOM counters持續上升不同步，不能把V8某次自然回收當成所有embedder／DOM都已完成回收。第二次GC後JS used略高於緊鄰樣本；世界loop繼續运行、取樣順序也不原子，不據此斷言GC失敗或新leak。

## 錯誤、限制與解除條件

- page errors **0**，requestfailed **0**；console errors **1**（HTTP404）。原始console事件未含URL，不能單靠這份資料斷言一定是favicon，也不忽略它。
- pending大多為0，最後樣本為1；是持續运行時的單次讀取，未做flush守恆驗收，不能把它判為丟資料或宣稱完整journal已驗證。
- 沒有heap snapshot、retainer chain或detached tree分析；沒有低記憶體裝置／手機實機驗證；没有正式profile的forced GC或CDP控制。
- GC後仍保留的約4870節點原因未定：可能包含正常UI／framework保留、量測工具或未回收的detached節點；目前無法依數字分配原因。不因RSS没有回到初始值就判leak，瀏覽器可保留已配置記憶體。
- 正式soak需依自己的自然GC profile、liveDOM、後段回收低點、交互延遲、錯誤與完整120 checkpoints判讀，本報告只能補充機制風險。若正式後段仍有持續retained floor成長或操作劣化，下一個最窄診斷是在另個隔離context跑固定同款視窗多輪並比較每輪GC後基線，再以retainer chain定位；證實source錯誤才建立RED與窄修。
- 本次不改source、不造RED、不宣稱Engineering整體PASS；Human **PENDING**、Product **NOT YET APPROVED**。

## Artifact 指紋與發布驗證

- `forced-gc-diagnostic.py` SHA-256：`62f98b6439ead9ca2591de096856189c1e99fdb23b857914e23cceae64eeb978`。
- `forced-gc-diagnostic.json` SHA-256：`e4106af589529bd1bdb4215fb22003a9fe54101a66d8890af4918422a5b1951d`。

本Markdown及原始JSON透過writer追加版本；發布後解碼archive核對projection一致。
