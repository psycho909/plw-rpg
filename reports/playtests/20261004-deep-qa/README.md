# 最新 V1 八路線深度 QA（整合中）

起始來源為 `738bc0010c549fa3fb2420437d171f5aa2a043a0`。最終受測 production 快照包含 O1 保存復原修正，精確來源與資產 SHA-256 見 [final-manifest](baseline/final-manifest.json)；目前由 localhost 5193 提供相同固定資產。[source-commit.json](baseline/source-commit.json) 已核對後續提交 `c22de4e` 的 35 個來源 hash 完全相同。QA-01–07 的路線證據已完成；QA-08 的 Chromium／Firefox ESR smoke 通過，但原生 Safari 與 iPhone／Android 實機仍缺連線。整體仍待 root 完成最終整合 review／Git sync，不宣稱八路線全數通過。

- 授權與驗收正本：[Ticket](../../../tickets/20261004-deep-qa.md)。
- baseline：136 tests／7 files；修復後 143 tests／7 files、type check、production build 通過。見 [baseline](baseline/check.log)、[修復 build](baseline/final-build.log)、[Astra 修復](recovery/README.md)。
- O1：保存失敗後仍可恢復倍率／等待推進，已修正為先成功保存才允許下一次行動、時鐘或非零倍率；首次失敗的記憶體進度仍保留。真 Chromium [8/8 回歸](root-checks/recovery-browser.json) 通過。
- 最終乾淨 browser soak 已完成：2026-10-04 **07:22:33.511–09:22:33.730 UTC**（台灣時間 **15:22:33–17:22:33**），active **7,200.219 秒**、120 個分鐘 checkpoint、推進 **200.047 遊戲日**。完整結果、profile 與匯出鏈核對見 [clean-run](soak/clean-run/README.md)、[profile summary](soak/clean-run/profile-summary.json)、[export chain](soak/clean-run/export-chain-validation.json)。先前兩個未完成 run 均不抵扣。

| 項目 | 證據 | 實際結果 |
| --- | --- | --- |
| QA-01 真 browser soak／profile | [clean-run](soak/clean-run/README.md)、[profile](soak/clean-run/profile-summary.json) | 7,200.219 秒 active；120 samples；72,013 筆匯出紀錄；匯出鏈／fingerprint 驗證通過。 |
| QA-02 收益、裝備、傭兵平衡 | [balance](balance/README.md) | 126 個主案例、6 組配對；收支與 396 次引擎保存往返核對完成，未修改平衡。 |
| QA-03 Threat 三路線 | [world](world/README.md) | 5 seeds × 3 策略 × 1,440 日，15 runs／21,600 日資料；威脅、擊殺、預警、Boss 與安全結果完成。 |
| QA-04 人口極端 | [world](world/README.md) | 81 次引擎／fixture roundtrip；自然人口上限、1,001 人受控瀏覽器 fixture、零人口恢復與超限輸入拒絕均有結果。 |
| QA-05 死亡繼承 | [inheritance](inheritance/README.md) | 13/13 合法案例、40 保存 roundtrip 通過；4/4 非法存檔按預期拒絕。 |
| QA-06 ×20 競態／延遲 ACK | [cross-state](cross-state/README.md) | 最終 build 10 案例／42 checkpoint，加實際戰鬥延遲 ACK 2 案例／7 checkpoint；通過。 |
| QA-07 地城、隊伍、契約、保存 | [cross-state](cross-state/README.md) | 公開 UI 隊伍／三層地城流程及保存、reload、死亡、撤退、薪資／到期交叉矩陣通過。 |
| QA-08 瀏覽器／實機平台 | [platforms](platforms/README.md) | Chromium 12 + Firefox ESR 12＝24/24 通過；原生 Safari、iPhone／Android 實機仍 BLOCKED，沒有以模擬代替。 |
| O1 保存復原必要修復 | [recovery](recovery/README.md)、[browser regression](root-checks/recovery-browser.json) | Astra 最小 store/UI gate；143 tests 與 Chromium 8/8 回歸通過，修復 review 已接受並同步 work。 |
| 記憶體測試工具診斷 | [memory-diagnosis](memory-diagnosis/README.md) | selector wait 的 retained DOM 訊號定位為 Playwright 測試工具 ElementHandle；不宣稱整個遊戲沒有 memory leak。 |
正常 UI 時鐘、公開等待、headless 引擎模擬、邊界 fixture 與手機 viewport emulation 是不同證據。Linux WebKit 不代表原生 Safari，手機 viewport 不代表 iPhone／Android 實機。未取得裝置的項目不記 PASS。

每次報告 checkpoint 使用 `scripts/recorded_reports.py` 自動追加至資料夾的 `playlog.jsonl`，目前可讀報告只是最新投影；未製作伺服器或防止外部改檔／刪檔機制。一次性 QA 與一般 L2 review 採 GPT-6 Luna/max；依使用者最新指示，長時間例行監看採 GPT-6 Luna/low，重大疑慮採 Astra。這些是工具要求的路由設定，不等同後端模型遙測。
