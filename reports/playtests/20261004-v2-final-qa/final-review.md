# V2 最終 QA Review

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`；branch `work`。本次交付為QA-only，程式源碼與58檔build manifest一致。

| Gate | Status | Evidence / practical limits |
| --- | --- | --- |
| Engineering Gate | **PASS WITH FINDINGS** | 229tests／14files、typecheck/build、Chromium28＋補驗11＋非空dungeon/party重載、Firefox8、7migration、3seed×10/50/100y、RNG／ownership／arcs通過；OPEN P2／P3明示 |
| Browser Stability Gate | **PASS WITH FINDINGS** | 單次7204.975s／120CP／3reload／完整UI export；page0/unhandled0/saveError無；favicon404與3driver timeouts、journal growth／CDP retention保留 |
| Agent Exploratory Gate | **PASS WITH FINDINGS** | Life3609.642s／Adventure3745.531s／Hybrid4384.601s有效探索；扣除harness／unobserved／quota，3路皆有progress與下一目標，產品疑慮另列 |
| Human Fun Gate | **PENDING** | 尚無真人1～2小時與八題回饋，答案保持空白 |
| V2 Product Gate | **NOT YET APPROVED** | 必須等待真正Human Fun Gate；不能從Agent／tests判定好玩 |

## 已完成工程驗收

[Regression](regression.md)覆蓋V1核心世界時間、NPC、農作、採集、economy、combat、dungeon、party、settlement、threat／boss、death succession、save/load、event/history，以及V2identity／rep／ownership／events。原生V1保存7fixtures完整保留seed/RNG/time/NPC/character/history/threat/settlement/inventory/gear/dungeon/succession、合法default、idempotence与V2再次save/reload；沒有秘密重建世界。

[Active Idle](browser/extended-idle.json)實際freeze55s可合法catch-up；真正close55s的pre-app saved=loaded2727；開窗／x1/x5/x20/pause/resume及combat補驗通過。非空實戰中的[21root cross-check](review/active-dungeon-party-reload.md)保留combat/dungeon/gear/party/ownership後能正常攻擊。

[Soak](browser-soak.md)world481→290652（約201.508遊戲日），normalUI／worldloop／三次戰鬥死亡繼承至第4代，120checkpoints與正常save/reload。FullUI export24,313,993bytes，72,068archive＋5distinctpending。舊attempt失敗不能拼接時長。

[Long-term](long-term.md)多seed10/50/100y／daily-batch-reload determinism、finite numbers、IDs、bounded近期events及NPC death/retirement/skill/recovery、非空所有權與人生資料長期保存。自然road arcs與正常交易誘發iron scarcity確有state／price／NPC consequence；被動世界少見資源短缺、Life road crisis介入較弱，屬Product Finding。

## Bugs、Product Findings 與限制

[Bug總表](bugs.md)：P0未發現；P1B01多分頁覆寫與P2B02開場復原已修，RED→GREEN保留；P2C01受控export交錯（真IndexedDB待重現）、C02全journal成長、C03CDP retention觀察，及P3B03/B04提示與B05favicon仍OPEN。不可稱「所有BUG已修」。

[Fun Signal Audit](fun-signal-audit.md)：生活前期重複、Identity目標可見性、Life危機agency、NPC追蹤friction、Boss後低tier重複、資產繼承期待與糧倉cap文案，為PF01～PF07。Home免費休息／storage、land四格收成、Boss裝備／資本、Nora具體記憶對話是正向系統證據；不代表真人Attachment或retention已通過。傭兵與裝備／等級／threat的戰果存在confound，不能單獨歸因。

[Performance](performance.md)包含完整自然GC曲線，當前DOM元素穩定但CDP detached/listeners成長。Archive不截斷，Hybrid04gzip解壓／335versions檢查通過；100年engine checkpoint不包括完整browser journal。Safari原生／手機實機依使用者排除；Firefox為smoke而非2hsoak。

## 交付與真人驗收

**READY FOR HUMAN TEST**：[正式八題與觀察欄](human-fun-gate.md)。下一個產品判定只依真正玩家1～2小時與實際回答，不問是否跳過。Agent不是真人，沒有開發V3、增加自由功能、製作server或發布main。

原始failures、時間更正、technical limitations、初始publication gap、metadata與所有report versions保存。[獨立review](review/terminal-evidence-review.md)檢查Standards／Spec、實際工作樹／新檔與raw timing；[artifact integrity](artifact-integrity.json)核對source58、12文件與全部logical archives。最後結案仍須驗證Git remote同步，不以review取代push。

最終獨立Standards／Spec審查：PASS WITH FINDINGS；原始歷史provenance缺口保留並與最新受測結果分開，不能補標成最新source。完整artifact validation已有PASS，最後publication版本會再次核對後隨work提交。
