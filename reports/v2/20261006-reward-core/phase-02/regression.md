# Phase 2 Regression（Browser gate 尚待）

Base source commit: f89c2c292aaadb6c22bc0453188661f22e4f15b2。此次 working-tree source fingerprints 以各 status.json 為正本，不能將 base commit 當作尚未提交的新 source。

- 全量最新 `npm run test -- --maxWorkers=1`：19 files / 281 tests PASS。保留所有 V1/V2 suites；見 full-regression-final-status.json。
- 最新 `npm run build`：vue-tsc + Vite PASS（77 modules）；見 build-status.json 最新追加版本。
- 額外 report config 明確執行 10,000 normal awards + 10,000 boss gear rolls，以及 seeds 17/909/2026 各100年：2 files / 4 tests PASS；見 loot-long-world-final-status.json。
- Strict premium UI static audit PASS，0 findings；見 premium-audit-stdout.txt。
- 上述 sourceStableDuringRun / harnessStableDuringRun 均為 true；新 Browser gate 執行後另列。

## 原始失敗不可覆蓋抹除

首次 build 有7個 TS compile errors：六個 template map callback 的 catalog indexing 解析與一個 material bias union indexing。原始 build-stdout.txt 第一追加版本及 UTC in-progress stdout 保留。修復使用 typed script name helpers／MaterialDefinition.bias 寬化，不用不安全 assertion；最新 build已通過。首次 full281及早期simulation本身通過，但修復後仍重新驗證最新source。

各引擎與UI RED及修復見 engine-worker.md、ui-independent-review.md／ui-followup-review.md；Phase1 latent family validation followup R1留待Phase3，在consumer啟用前關閉。

## Review-fix validation（最新source）

三項新RED failures先保存於engine-worker-red-three-findings.txt（72pass/3fail），修正後定向75pass。首次修正版全量283pass/1fail，原因是新combatStats test仍期待舊wolf generic+1（fixed-full-stderr.txt保留）；修正為wolf0及強化nonwolf／dungeon legacy+1覆蓋，定向82pass。

最新fixed-full-final-status.json：19files／284tests PASS。最新build-status.json typecheck+Vite77modules PASS，strict premium-audit-final 0findings。fixed-loot-world4PASS／10k+10k+3seed100y與最新source仅一個test檔差異，無production變更；完整hash correlation見fixed-simulation-source-correlation.json，舊source證據不会冒充新logic。

最新fixed-browser-regression-status.json exit0，20項V2 production smoke通過；此套smoke包含已標注的save/migration/property reachability與失敗注入fixture，不能當作正常玩家或無注入soak。另行600秒targeted script以全新正常Save、真UI狩獵／交易／裝備／重載，未修改worldTime/wealth/RNG，仍待最終時長。
