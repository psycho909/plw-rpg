# Browser and regression evidence index (interim)

**Evidence index; overall disposition and scope are summarized in Root's [final review](final-review.md).** H and I results remain accepted for their recorded scopes. The full regression remains recorded. Five prior browser attempts remain actual **FAILED** results; the prior paired Life invocation is **INTERRUPTED / NO RESULT**, with no canonical UI totals. The latest source-correlated stress/Life pair completed both runtime requirements. Human validation remains **DEFERRED / NOT APPLICABLE AT THIS STAGE**.

## H accepted short browser route

The current H run is accepted for the short normal fresh-save route: acquired wolfFang → targeted craft → equip → save/reload → return gray-wolf victory. It recorded 6.26 seconds, 70 UI operations, two reloads, three checkpoints, and 326 in-game minutes. `item-2` records wolfFang provenance and one actual material debit. The run does not establish causal combat benefit because actor level, HP, time, RNG, and other state changed between encounters. Common/no-affix after consuming the influence material is a product finding, not a bug. Human validation remains **DEFERRED / NOT APPLICABLE AT THIS STAGE**.

See [H report](hybrid-loop.md), [canonical acceptance](hybrid-acceptance.json), [actual result](browser-runs/hybrid-short-20261007T085056Z-pid83657/hybrid-short-result.json), and [bugs/history](bugs.md). The earlier provenance-deficient false PASS remains qualified in the ledger.

## Full regression record

The recorded `npm run check` exited 0: Vitest **425/425 tests across 22/22 files**, `vue-tsc --noEmit`, and Vite 7.3.6 production build passed. Its recursive source fingerprint was `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`. That run establishes test/type/build evidence only; it did not run browser stress or Life exploration.

See [regression.md](regression.md), [full-check status](j-full-check-status.json), and [raw full-check artifacts](j-full-check-runs/20261007T053450Z-58555c07/).

## I accepted controlled distribution and combat run

Run `20261007T085736Z-fdeec6dd` is recorded with **100,000 craft-context generated outputs over 30 profiles and 0 full transactions**, plus a 6,624-row / 13,248-fight controlled combat matrix. This is seeded simulation evidence and does not represent browser play, completed craft transactions, or normal-player prevalence.

See [I crafting analysis](crafting-analysis.md), [distribution projection](crafting-distribution.json), [material-bias projection](material-bias.json), [economy analysis](economy-analysis.md), and [actual result](i-20261007T085736Z-fdeec6dd-results.json). The result has SHA-256 `7b6de2655b2ff670eb2500bc817df4756ae2ae2e728f48f153636e0395c92ef8`; its raw observation JSONL has SHA-256 `37451e2c0a0c8b6e63be5d4dad6b3d89e16bb97a24a77d201c941ccaaad53629`.

## J browser attempts and correction scope

The first full-duration attempts remain failed and are preserved unchanged:

- Stress run [`stress-20261007T090400Z-pid84623`](browser-runs/stress-20261007T090400Z-pid84623/stress-result.json) failed after **3.59 seconds / 27 UI operations** while probing optional tavern availability. The tile was present on the map, but no built tavern existed; the runner incorrectly required one built interaction target.
- Life run [`life-20261007T090400Z-pid84624`](browser-runs/life-20261007T090400Z-pid84624/life-result.json) failed after **16.49 seconds / 108 UI operations / one reload**. A pixel-window dialog intercepted the visible pause button because the runner tried to pause before closing that modal.

The first harness correction is pinned by driver SHA `fbb1af096b0b83b7d14f6da20a88e02ac264298183ec93ec15dc4a66375c0f12`; it feature-detects optional buildings and closes dialogs before pausing. A later reviewed selector correction is pinned by driver SHA `82d73b11f54f68929f7730ddb07ca0e4f65345729ac81ddae3249395ca7ccdfa`. Independent focused review records **23 driver tests + 3 support tests passing** (26 total), plus `py_compile`; a short static-dist smoke recorded 83 visible operations and 3 native reloads, including two normal rests while the recent-event text was present. These checks verify helper/short-smoke behavior only; they are not long-run evidence. See [selector diagnosis and correction](j-long-selector-diagnosis.md) and [independent QA delta review](j-qa-delta-independent-review.md).

The subsequent fresh attempts also **FAILED** well before their requested durations:

- Stress retry [`stress-20261007T091332Z-pid999`](browser-runs/stress-20261007T091332Z-pid999/stress-result.json): **36.02 seconds / 349 UI operations / 4 reloads / 4 checkpoints**, requested 1,200 seconds. It stopped on strict-mode ambiguity: `get_by_role("button", name=/^休息/)` matched both a recent-event button and the primary rest action.
- Life retry [`life-20261007T091332Z-pid997`](browser-runs/life-20261007T091332Z-pid997/life-result.json): **39.88 seconds / 388 UI operations / 5 reloads / 5 checkpoints**, requested 1,800 seconds. It stopped on the same ambiguous rest locator.

Both retries recorded stable application source and retained their operation/result artifacts. These failures remain **FAILED** and provide no product finding. The latest pair outcome and limitations are recorded in the section below.

### Previous source/build-correlated pair outcome

The reviewed selector correction was followed by a source/build-correlated pair, started 2026-10-07 09:38:01 UTC. Invocation records pin source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, release-manifest SHA-256 `9fa982feaeb324bcd09b1397c40a9b5aa2ae23c003743420ffb56cc842c3a7c5`, and runtime versions Node v24.19.0, npm 11.9.0, Python 3.12.14, Chromium 151.0.7922.173. Build/dist pins remain the release values above. The [stress invocation](browser-runs/j-invocations/20261007T093745Z-stress/execution.json) has a canonical [FAILED result](browser-runs/stress-20261007T093801Z-pid3466/stress-result.json): 1,165.81s of the 1,200s target, 8,930 UI operations, 118 reloads, and 120 checkpoints. It timed out reading nearby interactions at `dialog.pixel-window .interaction-list button.nth(10)`; this is a dynamic nearby-interaction list failure, not a shop failure. The result records `sourceStableDuringRun: true`. Watcher data recorded 12,568 raw operation-log records and 1,089.52s last-checkpoint elapsed; these are not formal UI totals or terminal duration.

The paired [Life invocation](browser-runs/j-invocations/20261007T093745Z-life/execution.json) was **INTERRUPTED / NO RESULT**; see [interruption diagnosis](browser-runs/j-invocations/20261007T093745Z-life/life-interruption.json) and [runtime note](browser-runs/j-invocations/20261007T093745Z-life/j-runtime-interruption.md). It has no terminal result, exit code, end time, exact duration, or canonical UI/reload totals. Last checkpoint: 1,271.64s at 09:59:15 UTC (133 records); last raw operation: 1,273.75s at 09:59:17 UTC. Its 14,343 operation-log records are not a canonical UI count. Diagnosis found zombie process handles and no cgroup OOM evidence (32 GiB limit, 4.58 GB peak, oom/oom_kill counters zero), but historical exit cause is undetermined. Do not infer Life post-run source stability from invocation metadata. The later detached pair below completed and supersedes this interruption for current runtime evidence; this historical record remains intact.

### Latest detached full-duration pair

The stress invocation [20261007T103239260559Z-stress-a8502ac0](browser-runs/j-invocations/20261007T103239260559Z-stress-a8502ac0/execution.json) completed **PASS / 1,202.14s**, with 8,899 visible UI operations, 103 native reloads, 1,638 dialog cycles, and 108 checkpoints. Its canonical result is [stress-result.json](browser-runs/stress-20261007T103239Z-pid7428/stress-result.json); detailed memory/DOM profiling and limitations are in [browser-stress.md](browser-stress.md).

The paired Life invocation [20261007T103239259277Z-life-ea3f9138](browser-runs/j-invocations/20261007T103239259277Z-life-ea3f9138/execution.json) completed **PASS / 1,803.22s**, with 13,936 visible UI operations, 155 native reloads, 2,755 dialog cycles, and 158 checkpoints. Its canonical result is [life-result.json](browser-runs/life-20261007T103239Z-pid7426/life-result.json). Its runner-policy wall candidate and provenance/ownership details are in [agent-life.md](agent-life.md) and [life-reward-findings.md](life-reward-findings.md). These outcomes satisfy their specific duration requirements on the pinned source/harness; human fun and retention remain untested. See Root's final review for aggregate gate disposition.

Both invocations pin source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, source fingerprint `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`, build-status SHA-256 `29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442`, and release marker SHA-256 `2dd6dae695aa8628343af1778a7552cb84a70987f328e921d214016c5a7d61e4`. Driver SHA-256 is `5c20b23c7f1bf93ae4dbc55f5bfe902a31ee2022785d8ddf8a6dce7845f31b0c`; supervisor SHA-256 is `7c603a12380a4e0829983effb092c4f13ae933871117aeecd69dbbec620c6657`. Independent review accepted 29 helper tests and 12 supervisor fake-child tests. These validate harness logic at test seams and are not long-run browser evidence.

Execution arguments are `gpt-6-luna` / `low`; backend runtime is unverified. The runner uses a deterministic visible-UI policy with no model inference. Human validation remains **DEFERRED / NOT APPLICABLE AT THIS STAGE**. Overall Phase 5 disposition belongs to Root's final review.

### Preserved RED source-body gap

The original failed-run release marker records the prior driver SHA `7adf619295c44935daf1900e5744cd01145930554fef23a912660d17bfde0c15`, but the exact driver body for that pre-fix hash is unavailable in the current snapshot archive. The failure result, operation trace, and their hashes remain preserved; the older driver SHA alone is insufficient to reconstruct the exact source body. Do not treat the current `fbb1...` driver as the source used in those original failures.

## Required QA artifact inventory (Phase 5 spec §72)

The Phase 5 spec requires 15 named artifacts. **15 of 15 exist**; `final-review.md` is present and Root-owned:

| Required artifact | Current state |
|---|---|
| [baseline.md](baseline.md) | Present |
| [crafting-model.md](crafting-model.md) | Present |
| [crafting-distribution.json](crafting-distribution.json) | Present |
| [crafting-analysis.md](crafting-analysis.md) | Present |
| [material-bias.json](material-bias.json) | Present |
| [skill-analysis.md](skill-analysis.md) | Present |
| [masterpiece-analysis.md](masterpiece-analysis.md) | Present |
| [economy-analysis.md](economy-analysis.md) | Present |
| [hybrid-loop.md](hybrid-loop.md) | Present |
| [browser-regression.md](browser-regression.md) | Present |
| [bugs.md](bugs.md) | Present |
| [life-reward-findings.md](life-reward-findings.md) | Present |
| [browser-stress.md](browser-stress.md) | Present; prior failures and latest completed stress run |
| [agent-life.md](agent-life.md) | Present; prior failures/interruption and latest completed Life run |
| [final-review.md](final-review.md) | Present; Root-owned final gate synthesis |

At this inventory update, the phase-05 directory contains **471 files** and occupies about **147 MiB**; report artifacts are untracked pending delivery commit. No file exceeds 50 MiB. A generated `__pycache__` directory exists and is left untouched. Current invocation records, terminal results, prior failures, Life interruption diagnosis, and raw traces are linked above. `final-review.md` is present and Root-owned.

## Remaining status

The five prior failed browser results and prior Life interruption remain unchanged as history. The latest detached stress and Life results completed their separate duration targets; their runner scope and product-finding limits are documented in their reports. The 29 helper tests and 12 supervisor fake-child tests remain narrow harness checks. Root's final review owns aggregate gate disposition. Human validation remains **DEFERRED / NOT APPLICABLE AT THIS STAGE**; automation does not substitute for human fun or retention evidence.
