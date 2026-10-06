# Task Handoff

## Identity
- Task: Oakvale V2 Life & Emergence
- Authority / Ticket: [20261004-v2-life-emergence](../../tickets/20261004-v2-life-emergence.md)
- Status: blocked
- Updated: 2026-10-06（Asia/Taipei）
- Source environment: managed Linux /workspace/plw-rpg
- Branch: work
- Remote: origin (psycho909/plw-rpg)
- Base commit: 2e8ad94132b0e1bff11c971f40185ce92afae06e
- Working tree: 受測app source441e3c2b435f199a50cb78ee5b19521bcc084593；最新QA-only交付位於work，其58個source hashes不變。最後交付會commit/push並明確fetch work核對HEAD=origin/work。接手仍須核對當時最新Git狀態，不把QA-only commit當另一版受測app。
- Sync target: origin/work
- Fetch command: git fetch origin work:refs/remotes/origin/work（目前remote.origin.fetch只追main，plain fetch不會更新work追蹤ref）

## Goal and Acceptance
正式規格、Scope與Acceptance以Ticket為正本。V2-0～V2-6已實作；V2-7真人Fun Gate未驗收，不宣告V2成功，不開始V3。

## Completed
Migration/Active Idle/首代與繼任、Identity/Reputation、NPC traits/career/memory/dialogue、Home/Land/Farm Business、3 arcs/requests/director/rare/news、World First UI/projection/LOD界線。Astra指出的shallowRef/computed stability重大bug等已修復。
README/docs/UI/CHANGELOG/TODO、正式規格、Ticket和完整QA紀錄已同步。沒有server、新依賴、main merge或deploy。

## Remaining
真正玩家1～2小時遊玩、八題Fun/Memory回答及新存檔／不同seed體驗比較，依回饋判定或修正V2體驗。

## Decisions
單機追加journal保留既有ACK/replay及匯出；忽略外部檔案修改／刪除防護。原生Safari和手機實機排除。長時間環境監看使用GPT-6 Luna/low；早期重大bug曾交Astra；最新使用者指示修BUG GPT-6 Luna/max、長測GPT-6 Luna/low。Luna/Astra使用額度限制使部分委派中止，root完成剩餘工程和L2允許的非獨立Standards/Spec fallback。

## Changed Files
src/domain、data、engine、services/saveService、stores/gameStore、presentation、components與App/style；README/docs/UI/CHANGELOG/premium-ui.json、docs/specs/V2-LIFE-EMERGENCE.md、Ticket/TODO、本handoff與reports/v2/20261004-life-emergence。

## Verification

最新[最終QA交付](../../reports/playtests/20261004-v2-final-qa/README.md)：source441，229tests／14files＋typecheck/build、Chromium28＋補驗11＋非空dungeon/party重載、Firefox8、7原生V1 migration、3seed×10/50/100y及非空ownership／NPC／RNG。單次真Chromium7204.975s／120CP／3reload／完整24.3MB UI journal export；Life3609.642s／Adventure3745.531s／Hybrid4384.601s有效Agent探索，未觀察／debug缺口不計時。

Engineering／Browser Stability／Agent Exploratory均PASS WITH FINDINGS。已修P1多分頁覆寫／P2開場復原，OPEN P2/P3與PF01～PF07詳見本輪文件；不能稱所有bugs已修。Human PENDING、Product NOT YET APPROVED。58source與3asset fingerprints、完整archives／gzip／integrity與獨立Standards/Spec review保存。舊[開發QA](../../reports/v2/20261004-life-emergence/README.md)仍為歷史證據，不冒充最新build。

## Blockers
真人Fun Gate無法由agent模擬、多年engine sim或自動tests代替。依使用者正式規格§48～49／§51 V2-7維持blocked。

## Next Action
請真正玩家使用origin/work候選版遊玩1～2小時，填寫[正式八題與觀察欄](../../reports/playtests/20261004-v2-final-qa/human-fun-gate.md)，再依實際回饋判定V2 Fun Gate或安排修正。
