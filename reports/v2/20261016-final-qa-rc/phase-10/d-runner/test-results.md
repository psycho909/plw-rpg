# Phase10-D 定向測試結果

執行時間：2026-10-16。下列命令皆在 D scope 內執行。

```text
npx.cmd vitest run src/services/saveService.test.ts src/stores/gameStore.test.ts src/engine/simulation.test.ts src/engine/regionalCrisis.test.ts src/engine/crisisResolution.test.ts src/engine/bossSaveReload.test.ts src/engine/itemGeneration.test.ts src/engine/contentFamilies.test.ts src/services/phase10Persistence.test.ts src/engine/phase10Determinism.test.ts
```

結果：**10/10 test files、238/238 tests passed、0 failed**（34.82 秒）。

```text
node --check scripts/phase10/d-long-world.mjs
```

結果：exit code 0。

```text
node scripts/phase10/d-long-world.mjs --seeds=40131,40132,40133 --years=10,50,100
```

最後一次完整執行：[`attempt-20261016T034911258Z`](attempt-20261016T034911258Z/summary.json)，PASS；9/9 預期檢查點完成，save/reload 9/9、continuation 9/9、孤兒參照 0，序列化 payload 245,272–608,331 bytes。Attempt 的 `manifest.sha256` 列出其餘 runner artifact 雜湊與長度。

runner 需呼叫 Git 讀取 HEAD／`src/` 指紋。沙盒內初次執行在 `spawnSync git EPERM` 結束，未進入模擬；依核准的升權命令完成最後兩次完整 run。第一個 smoke 與修正 horizon 前的完整 attempt 均保留在 `d-runner/`，不作為最終結果。全專案 check/build 依共同規則交由 Phase10 lead 執行。
