# Task Handoff

## Identity
- Task: 最新 V1 八路線深度 QA
- Authority / Ticket: [20261004-deep-qa](../../tickets/20261004-deep-qa.md)
- Status: blocked
- Updated: 2026-10-04（最新終點核對）
- Source environment: managed cloud Linux /workspace/plw-rpg
- Branch: work
- Remote: origin (https://github.com/psycho909/plw-rpg.git)
- Base commit: 738bc0010c549fa3fb2420437d171f5aa2a043a0
- Working tree: O1 source checkpoint c22de4e 已同步；QA reports、Ticket 更新、TODO、.gitignore 與本 handoff 尚待最終整合提交。
- Sync target: origin/work

## Goal and Acceptance

正本為 Ticket 的八項 QA；實際兩小時與原生 Safari／實機證據不可由加速模擬或 viewport 替代。

## Completed

- O1 已修復、143 tests／types／build、Chromium 8/8 回歸及獨立一般 L2 review 接受；來源提交 c22de4e636215b11057e2a37b0fc4eaf826a8234 已 push，remote 核對一致。
- 126 經濟模擬＋6 配對；15×1440 日 Threat 策略與人口極端；13 合法繼承＋4 非法輸入；最終 build 10/42 cross-state＋2/7 combat/ACK follow-up。
- Chromium 12＋Firefox ESR 12 smoke 全通過；viewport／controlled fixtures／Firefox process-local sandbox 相容設定均明示。
- Astra 確認舊 selector-wait memory 訊號是測試工具保留 artifact；主 run 不用該等待方式。
- 一般 L2 preliminary artifact review 接受已凍結路線；offline validator fingerprint gate 已修正、8 fault controls 通過。

## Remaining

- clean-run 已完成 active 7200.219 秒；離線 export chain 72013筆 PASS、profile已產出。文件審查與同步由 root 收尾。
- 原生 Safari、iPhone／Android 實機沒有已配置硬體或 callable tool，未通過；使用者的裝置／服務入口問題仍未回答。

## Decisions

- 使用者指定長時間環境測試採 GPT-6 Luna、低消耗 effort；本 run 監看是 Luna/low。一次性矩陣／L2 review 沿用 Luna/max；重大 bug／疑慮採 Astra。
- 單機資料，不做伺服器、防外部改檔／刪檔、付費服務或正式玩家存檔。授權 push work，不合併 main、不部署。
- baseline 168.834s incomplete 與 first patched run 1620.171s BrokenPipe failed 都不抵扣新run時長。
- 巨大的 balance raw JSON 原始投影保留本機且ignore；交付 lossless gzip＋checksum＋完整 playlog，不刪減歷史。

## Changed Files

- 已提交 O1 store、store tests、App、UI 契約與 CHANGELOG。
- reports/playtests/20261004-deep-qa/ 全部 QA 方法、raw、版本 archive、recovery／review／soak。
- Ticket、TODO、.gitignore、本 handoff；既有 V1 彙整文件已追加後續 QA 結果。

## Verification

- 精確來源／資產：[final-manifest](../../reports/playtests/20261004-deep-qa/baseline/final-manifest.json)、[c22de4e mapping](../../reports/playtests/20261004-deep-qa/baseline/source-commit.json)。
- [QA index](../../reports/playtests/20261004-deep-qa/README.md)、[preliminary review](../../reports/playtests/20261004-deep-qa/review/qa-artifact-review.md)。
- harness 已在台灣時間17:22:33.730結束；不需續跑。clean-run/results.json、export-chain-validation.json 與 profile-summary.json 是完成證據。
- Luna/low 原監看到90分鐘；root另核對120分鐘終點，見 monitor-low/terminal-reconciliation.json。

## Blockers

原生 Safari／iPhone／Android 實機缺連線；其他 runtime 測試已完成。整合 review／同步證據由 root 收尾。

## Next Action

取得可連線的 Mac Safari 與 iPhone／Android 實機或已授權裝置服務入口，依 platforms/README.md 在相同 c22de4e 固定 build 執行 QA-08；不得以 viewport 或 Linux WebKit 替代。
