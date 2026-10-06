# Oakvale V2.x Reward Core — First Slice

本次依正式規格 §77 只完成 Phase0–3；本頁是當前進度投影，先前版本由 playlog.jsonl 保存。現在 **Phase0/1/2 已驗證，Phase3準備施工**。這不是完整V2.x內容預算或真人好玩驗收。

- 工作分支：`v2x/reward-core`。
- 原規格：[V2X-REWARD-RETENTION](../../../docs/specs/V2X-REWARD-RETENTION.md)。
- [baseline](baseline.md)：Node/npm/OS/framework/browser、原附件hash、V2原source441e3c2與deliveryac144ef。
- [architecture](architecture.md)、[UI plan](ui-plan.md)：小量registry、單一RNG、additive migration、既有UIowner；不是後續Phase4+完成聲明。
- Phase0：229tests、typecheck/build、20Chromiumchecks，原harness失敗與修正均保留在baseline-run。
- Phase1：[verification](phase-01/verification.md)、[independent review](phase-01/independent-review.md)，243tests/15files、typecheck/build、20Chromiumchecks通過。已交付source `f89c2c292aaadb6c22bc0453188661f22e4f15b2`，exact source fingerprint correlation另存JSON。
- Phase2：生成器／掉落／裝備操作與戰鬥接線、物品視窗；定向RED/GREEN與worker證據位於phase-02。281 tests /19files、typecheck/build77modules、10k普通掉落＋10kBoss生成、20項production Chromium回歸均通過。獨立審查的狼族duplicate payout、material affinity與裝備訊息已修復並重驗；最新284tests、602.915秒／205cycles／4reloads通過，見phase-02/acceptance.md。
- Phase3：狼族辨識／實際機制／boss形態與R1戰鬥存檔crossguard；未啟用。
- long-term：seeds 17/909/2026 各10/50/100年＋500件canonical生成裝備已通過；見 long-term/samples.jsonl 與 phase-02/loot-long-world-final-status.json，屬headless資料量測，不代替Browser。

## Findings and limits

R1 P2：family encounter的derived combat stats、hp<=maxHp與根bossformation一致性必須在Phase3啟用前關閉；Phase1尚無consumer，故Phase1 accepted with follow-up。生成器首版傳說loot.createdBy將拾取者當製作者，已修復createdBy=null＋定向regression；素材交易誤用鐵匠條件與高防禦吞掉額外裂傷／狩月傷害也已修復並保存RED。原始expected RED、首次validator4個TS errors、report JSON中間版格式錯誤、raw log whitespace diagnostics均保存，不因修正刪除。

V2既有C01匯出interleaving、C02journal資料成長、C03 detached DOM/listener觀察與P3warnings仍追蹤；本輪沒有大型journal/IDB/renderer改造。原生Safari與手機實機不在scope。短browser targeted/stress依V2.x規格執行，不把舊V2 soak當作新source測試；本輪已變更增量save schema/guard，但未改Save/Journal I/O循環；依§57–62先執行targeted／stress，2小時soak未執行、不列通過。若短測呈現疑似線性heap/DOM growth再升級長soak。

Human Fun Gate: **PENDING**。工程／Agent驗證不代填真人答案；V2 Product Gate未獲真人核准。Crafting、Workshop、Masterpiece、完整content budget、V2.x retention判定與V3均不在首輪已完成範圍。
