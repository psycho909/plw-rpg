# 問題與處置

Work Authority：[Ticket](../../../tickets/20261003-comprehensive-playtest.md)。本清單包含4項已修復問題及2項觀察；正常玩法與受控損毀存檔分列，未將harness錯誤算成遊戲Bug。

## CPT-001：付費休息跨午夜導致負金幣與存檔失效

- 嚴重度：高；正常公開遊戲操作可達成，影響重新載入與世界接續。
- 基準：`694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`。
- 重現：seed909 新世界；公開等待讓聚落成長為 village；17時走到酒館聘一位傭兵（45→20金）；商店買兩份石頭（20→8金）；18:40走到旅店，住宿8小時跨午夜。
- 預期：服務費只花一次、不透支；日薪依餘額支付或正常解約；保存後可載入。
- 實際：午夜先付4金日薪，休息結束再扣8金，餘額8→-4。save可寫入，但deserialize因負金幣拒絕，UI保護原檔並要求確認重建。
- 根因：rest 在 cost 推進時間後才扣費，同一筆餘額被兩項支出先後使用。
- 證據：[固定基準公開引擎腳本](artifacts/reproduce_rest_wages.mjs)、[baseline JSON](artifacts/rest-wages-baseline.json)、[UI 重現腳本](artifacts/reproduce_rest_wages_ui.py)、[UI JSON](artifacts/rest-wages-ui-baseline.json)、[負金幣畫面](artifacts/rest-wages-negative.png)、[拒絕載入畫面](artifacts/rest-wages-reload-blocked.png)。UI 重現從完全由公開引擎操作產生的原始存檔續玩；不宣稱前段路線也由瀏覽器走完。
- 修復：依使用者指示交 GPT-6 Astra；費用在服務開始、時間推進前收取，日薪只看剩餘額。未放寬存檔驗證。見 [Astra 報告](astra-rest/REPORT.md)。
- 回歸：單元 RED 明確expected0/actual-4；GREEN與邊界測試通過。完整check為101 tests＋型別＋build；主Agent在修復build確認旅店8/12金及酒館6/7金四例，保存重載一致、page errors0，見 [修復UI JSON](artifacts/rest-wages-ui-fixed.json)。
- 狀態：修復、引擎／UI回歸及獨立一般L2 review完成；待整輪結果提交。見 [review](rest-fix-review.md)。
- 限制：既已生成的負金幣存檔仍會被保護性拒絕；本修復不擅自改寫舊資料。尚未合併main或部署正式網站。

## CPT-002：下一位 NPC 編號碰撞，載入後續存檔失效

- 嚴重度：高（受控損毀存檔）；非正常遊玩生成的狀態。
- 重現：正常seed909存檔僅將nextNpcId改為1。首次deserialize接受；公開simulate經過第15日移民，產生第二個npc-1，下一次存檔重載拒絕。
- 預期：不安全的生成編號在首次載入拒絕，原始raw保留，不讓世界繼續產生衝突。
- 根因：現有ID唯一性檢查未驗證nextNpcId生成序列。
- 主Agent獨立確認：[固定基準注入腳本](artifacts/reproduce_id_integrity.mjs)、[JSON](artifacts/id-integrity-baseline.json)；worker UI證據位於persistence/artifacts。
- 狀態：Astra已補生成編號guard；最終引擎、UI原raw保護與[獨立review](id-fix-review.md)均完成。

## CPT-003：重複作物 ID 造成未領取的作物消失

- 嚴重度：中（受控損毀存檔）；非正常種植產生的狀態。
- 重現：公开操作種兩塊田並等成熟，存檔只把第二塊田ID改成第一塊；首次deserialize接受。一次收割只領5份食物，但刪除兩塊田，原應剩1塊可收割。
- 預期：首次載入拒絕重複作物ID並保留raw，不能接受再讓收割丟失資料。
- 根因：未驗證作物ID唯一性；harvest按ID移除作物。
- 主Agent獨立確認：與CPT-002共用 [腳本](artifacts/reproduce_id_integrity.mjs) 與 [JSON](artifacts/id-integrity-baseline.json)。
- 狀態：Astra已補作物ID唯一性guard；正常四格逐格收割、UI原raw保護與[獨立review](id-fix-review.md)均完成。

## CPT-004：事件序號回退會在正常播種時生成重複作物

- 嚴重度：中（受控損毀存檔）；非正常遊玩自然生成的狀態。
- 重現：公開操作準備两格並種一格，只將eventSequence從5改為3。首次載入接受；正常播種第二格得到crop IDs [4,4]，成熟後收割刪兩格、僅得到單格食物。
- 證據：[Astra固定基準重現](astra-id/reproduce-event-sequence.mjs)、[JSON](astra-id/event-sequence-baseline.json)。主Agent亦以公開操作生成回退sequence fixture確認修復版首次拒絕，見 [最終引擎結果](artifacts/final-integrity-results.json)。
- 修復：eventSequence須為安全整數且不得落後events/history/crops已有ID；不修改輸入raw。與CPT-002／003同一ID連續性修復，見 [Astra報告](astra-id/REPORT.md)。
- 狀態：修復、引擎回歸、UI原raw保護與[獨立review](id-fix-review.md)均完成。

## OBS-001：本機 static server 的 favicon 404

連續瀏覽器出現一筆 console resource error，HTML沒有宣告favicon，server log顯示 `/favicon.ico` 回404。這項是缺少圖示資源的觀察，與JavaScript pageerror分列；原始錯誤計數保留。[HTTP log](soak/http-404-evidence.txt)在相同時間記錄favicon404，JS／CSS為200；原ConsoleMessage未保存URL，依時間與服務請求做關聯，不聲稱原訊息URL已直接捕捉，不把console數據改成零。

## OBS-002：極端安全整數上限仍有耗盡限制（未修）

- 低優先級、僅受控極端值；正常遊玩與本輪500年世界沒有達到。
- counter為MAX_SAFE_INTEGER−1時首次載入接受，一次NPC／事件生成後等於MAX_SAFE_INTEGER，仍屬安全整數但被strict上限拒絕重載。
- 獨立review提出後依使用者偏好交Astra；[實測與評估](astra-id/COUNTER-LIMIT.md)確認限制。把上限改MAX−2只會移動失敗點，完整耗盡處理需要runtime allocation／交易政策。
- 主Agent接受為本輪L2交付的已知低風險限制，保留目前防護，不宣稱任意極端損毀值或無限未來均可接續；未私自改存檔schema或加入世界終止規則。

## 測試工具修正

主Agent UI重現初版以精確文字比對視窗裝飾標題、以pagehide之前的timestamp比對之後raw，以及預期reload始終暫停，均修正為實際契約：標題包含文字、pagehide會再保存timestamp、reload起始×1並推進少量時間。這些是harness斷言錯誤，非新增遊戲Bug。

soak最初runner移動採樣的Playwright arg傳法不正確，造成position_changed錯誤取樣；實際鍵盤移動照常執行。保留原始樣本並另做補充驗證，不將其失敗算成遊戲移動失效。詳見soak最終報告。

完整修復原raw保護與四項UI證據：[final-browser-results.json](artifacts/final-browser-results.json)。source files內容指紋與驗證版本在各review／runtime JSON，後續單機保存與紀錄功能另票驗證。
