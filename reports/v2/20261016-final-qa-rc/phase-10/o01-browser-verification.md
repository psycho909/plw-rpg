# O-01 — Browser Persistence Verification

- Source `76595c5`（product src unchanged）; production `dist` `9ce31ea5…`; Chrome 155.0.8059.82 headless over CDP; disposable profile per attempt（deleted after run）.
- Runner: [`scripts/phase10/rc-o01-browser.mjs`](../../../../scripts/phase10/rc-o01-browser.mjs). Evidence: [`rc-runner/attempt-20261016T141453639Z-o01/`](rc-runner/attempt-20261016T141453639Z-o01/)（`results.json`, `manifest.json` with SHA-256, 6 screenshots）.
- **Result on HEAD: 28/28 checks PASS**; 0 page/console errors in every scenario.
- **Pre-fix RED（`b21ce0c`, same runner, outside the repo）:** A3/A4/A5 and **C1/C2/C3 FAIL** — under the injected 1,000,000-char quota the 1,182,071-char legacy checkpoint cannot be re-saved: 「存檔失敗…時間已暫停」, worldTime stuck at 480, 3,000 pending. This is the O-01 reproduction; HEAD passes the same checks. Evidence: [`rc-runner/prefix-b21ce0c-red/results.json`](rc-runner/prefix-b21ce0c-red/results.json)（sha256 `457e4a28…`）. Caveat: in that temp-folder profile Chrome could not open IndexedDB at all（`Internal error opening backing store`）, so pre-fix C ran with the archive unavailable and the runner stopped before C4/B; this does not affect the HEAD run, where IndexedDB worked.
- Fixtures are controlled legacy checkpoints generated from `createGame(seed)` + `packCheckpoint` with an oversized `playJournal.pending`（no player data）. Each scenario runs on a fresh origin（own server port）.

Lanes:

- **REAL BROWSER OBSERVATION** — real Chrome localStorage quota, real IndexedDB, real Web Locks.
- **CONTROLLED FAILURE INJECTION** — page-start hooks that throw `QuotaExceededError` from `localStorage.setItem` above an injected size, or throw from `IDBDatabase.transaction(..., 'readwrite')` while an outage flag is set.

## A. Legacy Save Recovery（REAL BROWSER OBSERVATION, real quota）

Probed real quota for `oakvale-v1`: **5,242,870 chars**. Fixture: one 5.24M-char legacy record, checkpoint 5,242,806 chars（64 chars headroom）. fixture sha256 `a8296557…`.

Scope of A: compatibility and no regression at the real quota. A does **not** prove the fix is necessary — pre-fix code also compacts inside `record()` and can re-save a same-size checkpoint, so only A3/A4/A5（compaction at the first save）distinguish pre/post fix（confirmed by the pre-fix RED run）. The O-01 reproduction is C1/C3.

| # | Check | Result | Evidence |
|---|---|---|---|
| A1 | Legacy checkpoint loads | PASS | writer acquired, `saveBlocked=false` |
| A2 | No reset needed | PASS | no opening/rebuild dialog; same `worldSeed` |
| A3 | Pending compacted | PASS | first save 79,728 chars（from 5,242,806）; `legacy-large` dropped |
| A4 | Within cap | PASS | 2 records / 401 chars ≤ 256 / 256,000 |
| A5 | Summary / gap markers | PASS | `summary` + `gap`, `worldId=legacy-world` |
| A-state | Compaction did not touch game state | PASS | first-save game state byte-equal to fixture（`serialize(state,0)`） |
| A6 | Normal action | PASS | 4 keyboard moves returned「已到達。」（the check itself only asserts saves occurred, which time ticks also cause; position not captured） |
| A7 | Time advances | PASS | worldTime 480 → 508 |
| A8 | Save succeeds | PASS | manual 存檔 →「世界已儲存。」, 0 failed writes |
| A9 | Reload = same world | PASS | same seed, journal `worldId=legacy-world`, loaded state byte-equal to first save after reload |
| A10 | Continue after reload | PASS | 508 → 520, no save error |
| A-det | Legal RNG continuation | PASS | 4-minute time-only browser segment（100 ms ticks）equals one Node `simulate()` replay byte-for-byte（tick sizes not measured, short segment: supporting evidence; primary determinism evidence is the Vitest suite） |

## B. IndexedDB Failure / Recovery（CONTROLLED FAILURE INJECTION）

Fixture: 400,000-char legacy record `legacy-dropped` + small `legacy-kept`; archive outage from first load.

| # | Check | Result | Evidence |
|---|---|---|---|
| B1 | Outage does not block the world | PASS | `saveError=''`, speed 1, time advances |
| B2 | Retry bounded | PASS | readwrite attempts at 5/10/15/20/25/30 s: 3/4/4/5/5/5 — rules out retry-per-save; consistent with the 1→2→4→8→16 s backoff in code（inferred; not distinguished from a fixed ~5 s retry） |
| B3 | Journal error shown | PASS | 「injected archive outage 遊玩紀錄尚待補寫。請重試存檔，或匯出保留。」 |
| B4 | Save/reload during outage | PASS | all marker ids present after reload; `worldId=legacy-world` |
| B5 | Read-only preview（REAL BROWSER） | PASS | 2nd tab: 0 checkpoint writes, 0 IndexedDB writes, `writerReady=false`, shows「另一個遊戲頁面正在使用此存檔…」 |
| B6 | Recovery drains pending | PASS | outage lifted + manual save → pending 0, journal error cleared |
| B7 | Markers appended after recovery | PASS | 2 `legacy-world` markers in archive |
| B8 | Dropped record never sent | PASS | `legacy-dropped` absent from archive |
| B9 | No same-id / different-content | PASS | each archived record equals the sampled checkpoint snapshots of its id（sampled every 5 s and after reload, not every save; unique ids are also enforced by the IndexedDB index）. Stronger evidence is B6: a mismatch would abort the append and pending would not drain |

## C. Negative / Boundary

| # | Check | Lane | Result | Evidence |
|---|---|---|---|---|
| C1 | Many small records | INJECTION（quota 1,000,000） | PASS | 3,000 records / 1,182,071-char checkpoint → 256 records / 93,790 chars |
| C2 | Per-world attribution | INJECTION | PASS | markers for `older-world` and `legacy-world` |
| C3 | World continues under injected quota | INJECTION | PASS | move + time advance, no save error |
| C4 | Reset after legacy recovery（injected 1M quota, no real pressure） | INJECTION | PASS | rebuild via UI; new worldId; `reset` record + legacy markers kept（checkpoint + archive）. Pending was already 0 and the reset checkpoint 79,327 chars, so this is not a storage-pressure test; reset under pressure is covered by `gameStore.test.ts`（[O-01 ticket](../../../../tickets/20261016-v2x-10r-o01-load-compaction.md)） |
| C5 | Normal pending not compacted | INJECTION（archive outage keeps pending visible） | PASS | 8 records / 1,629 chars, 0 markers（the no-over-limit-message clause is weak: the outage message replaces journal errors） |
| C6 | Failed write keeps previous save | INJECTION（all writes fail） | PASS | checkpoint byte-identical and loadable; 「存檔失敗…時間已暫停」; speed 0 |
| C7 | Recovery after storage returns | INJECTION | PASS | manual save succeeds, error cleared |

## NOT TESTED（and substitute evidence）

- Lost IndexedDB acknowledgement（commit succeeds, promise rejects）: not injectable safely in the browser → covered by `phase10rJournal.test.ts` / `gameStore.test.ts` and external fuzz（24 seeds × 900 steps）.
- Real IndexedDB quota exhaustion / storage eviction, Safari ITP, Firefox, physical mobile devices.
- Pre-fix（`b21ce0c`）browser reproduction was not rerun; RED evidence is the unit test in [r7 summary](r-runner/r7-luna-medium-o01-fix-summary.md) and the external reviewer's reproduction.

## Runner attempts

- `prefix-b21ce0c-red/` — pre-fix RED run described above（only `results.json` kept）.

- `attempt-20261016T141319436Z-o01` — 27/28: C4 asserted markers in checkpoint pending although the healthy archive had already flushed them（pending legitimately 0）. Runner assertion defect; fixed to check checkpoint + archive. Retained.
- `attempt-20261016T141453639Z-o01` — 28/28（authoritative）.
