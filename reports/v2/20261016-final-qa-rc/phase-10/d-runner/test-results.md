# Phase10-D 定向測試與長跑結果

執行時間：2026-10-16。下列定向 Vitest 在本次曆法修正前執行，結果仍是原測試程式的證據；本次修改未觸及 `src/`。

```text
npx.cmd vitest run src/services/saveService.test.ts src/stores/gameStore.test.ts src/engine/simulation.test.ts src/engine/regionalCrisis.test.ts src/engine/crisisResolution.test.ts src/engine/bossSaveReload.test.ts src/engine/itemGeneration.test.ts src/engine/contentFamilies.test.ts src/services/phase10Persistence.test.ts src/engine/phase10Determinism.test.ts
```

結果：**10/10 test files、238/238 tests passed、0 failed**（原執行紀錄 34.82 秒）。

本次曆法修正後執行 runner 語法檢查：

```text
node --check scripts/phase10/d-long-world.mjs
```

結果：exit code 0。

修正後完整長跑命令：

```text
node scripts/phase10/d-long-world.mjs --seeds=40131,40132,40133 --years=10,50,100
```

最新 attempt：[`attempt-20261016T065808351Z`](attempt-20261016T065808351Z/summary.json)，PASS；9/9 指定遊戲年檢查點完成，save/reload 9/9、continuation 9/9、孤兒參照 0，JSON payload 211,769–379,777 bytes。Manifest 記錄 120 天／遊戲年及執行 source fingerprint；各 attempt 檔案的 SHA-256 與位元組數列於 `manifest.sha256`。

先前 attempt [`attempt-20261016T034911258Z`](attempt-20261016T034911258Z/summary.json) 的 360 天／年換算已由 [`calendar-correction.json`](attempt-20261016T034911258Z/calendar-correction.json) 更正為實際 30／150／300 個遊戲年。該 attempt 保留作為更長 horizon parity 證據，不作為精確指定年數的結果。

全專案 check/build 依 Phase10 common rules 由 Phase10 lead 執行。
