# Phase 4 QA runner independent review — initial frozen scope

## Disposition

**QA-1 through QA-5 and UI-1 are closed by static delta review.** This is a static review only. I did not run a browser, stress, adventure, simulation, build, or full check. The frozen UI and current final runtime driver are covered by the appended review delta; no runtime pass is claimed.

## Scope and snapshot

- Authority: [Phase 4 ticket](../../../../tickets/20261006-v2x-04-adventure-loop.md), [Phase 4 spec](../../../../docs/specs/V2X-PHASE4-ADVENTURE-REWARD.md), [metric contract](metric-contract.md), [phase README](README.md), root `AGENTS.md` / `README.md`, and `docs/agents/review.md` / `skill-workflows.md`.
- HEAD/base: `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`. Relevant reports/runners are untracked in the worktree; their content hashes below identify the reviewed snapshot. No Git mutation was made.
- Reviewed: `archive/verify_browser.py`, `phase04_stress_browser.py`, `phase04_adventure_playtest.py`, `adventure_policy.py`, `runner_paths.py`, `test_adventure_policy.py`, `test_runner_paths.py`, `loot_monte_carlo.test.ts`, `combat_simulation.test.ts`, `simulation.config.ts`, and the contract/ticket/spec above.
- Initially excluded but covered by later deltas: frozen UI E source and final-runtime-driver. Runtime evidence remains excluded; no runtime pass is claimed.
- Reviewer: `g6-luna-med-phase4-qa-reviewer`; requested GPT-6 Luna medium role, backend model/runtime telemetry unavailable; not a production implementer.

## Standards

**All current code-review findings are closed statically; runtime evidence remains pending.** `runner_paths.py` finds a checkout by `package.json` plus `src/` markers, and `test_runner_paths.py` encodes the archive depth expectation. Stress and Adventure require a successful build-status record whose full `src` fingerprint matches before startup; both use an isolated fresh Playwright context. Their normal paths assert Lv1 / 45 gold and no injected gear, use real UI rest and inventory decisions, enforce minimum real time (1200 / 1800 seconds), and capture first native save writes, save/storage/error telemetry, heap and DOM checkpoints. Adventure decisions inspect the rendered target/goal and current gear comparison across pages; the policy is not merely a fixed five-win script.

1. **Closed after delta — targeted browser build matching.** `archive/verify_browser.py:22-38` now requires an existing build status with `exitCode == 0`, `sourceStableDuringRun == true`, and `sourceSha256` equal to a freshly enumerated complete `src` hash map before launching Chromium. It records the matched build path and applies end-of-run source, harness, and `runner_paths.py` hash checks at lines 310-324. Static inspection closes the stale-build attribution finding; no runtime evidence is implied.

2. **Closed after delta — simulation source manifest coverage.** Both simulation runners now recursively enumerate on-disk `src` files at each snapshot, sort relative POSIX paths, hash each file, and hash the serialized map. The final snapshot comparison therefore detects changed hashes and added/removed paths, including untracked files. Formal runs still require the pinned expected commit and fingerprint. Static inspection closes the manifest gap; no simulation was run.

3. **Closed after delta — browser helper provenance.** Stress now records start/end hashes for `runner_paths.py` and `scripts/recorded_reports.py`; Adventure additionally records `adventure_policy.py`; each runner checks helper stability at completion. The final driver also includes these dependencies in its before/after harness map. This closes QA-3 statically; no runtime execution is implied.

## Spec

**Static pass; runtime behavior remains unverified.** The current reward catalog has five wolf definitions and the Phase 4 ticket explicitly scopes the existing five wolves; the five-row UI assumptions agree with that source snapshot. The combat matrix's six targets are scenarios (gray, alpha, controlled armored alpha, and three Wolf King variants), not six catalog entries. I found no old-five/new-six mismatch.

The loot runner allocates its requested total evenly across the five source profiles (100,000 total means 20,000 per rank), reports award/gear denominators separately, keeps static score labels explicitly heuristic, and distinguishes exclusive base, provenance, and eligible legendary-weapon special rates. The combat matrix has 15 builds × 3 powerbands × 6 target scenarios × 2 policies × 8 seeds = 4,320 metric rows and 8,640 total actual fight executions including replay pairs. It samples elite/mini-boss/boss gear through actual detached `awardWolfLoot` calls, asserts the Wolf King item is level 7 and exclusive-base, records the controlled standard-body clone separately, and compares same-seed paired outcomes using wins, survival, turns, gross damage, and potion count. Ready fixtures assert Lv5 / combat Lv6. These are static findings only; the new runners have not been executed.

The targeted browser script's controlled fixtures are clearly separated in its checks, and the stress/adventure scripts do not inject game state, clock, or gold into normal fresh-save runs. Actual UI selectors and final projection behavior were covered in the frozen UI delta below. Final raw reports still need a later review. Human Fun Gate / retention remain deferred and no product-readiness claim is implied.

## Verification and remaining work

- Executed: source/document inspection and SHA-256 snapshot only.
- Delta reviewed: targeted build/fingerprint preflight and end-of-run checks; recursive dynamic source manifests in both simulation runners. Findings QA-1 and QA-2 closed by static evidence.
- Not executed: pure unit tests, simulation sanity, build, browser, stress, adventure, full checks. Root explicitly deferred runtime execution; all reviews remained static.
- Required next review: review the final browser helper selector/provenance delta, then after Root release correlate actual final raw reports with their build/source/harness fingerprints and real elapsed-time evidence. No runtime pass is claimed here.

## Reviewed artifact hashes

```text
archive/verify_browser.py cb872c53961200a507405010f69e4eaca2e77f3c364595513f80b69fbe4209e8
archive/phase04_stress_browser.py 3970a59c0789d02efe58cfd8faf3e8a4b79d7adcd012310315e15aa6bd587f8c
archive/phase04_adventure_playtest.py 7278814b4ccc8ff1e2ac00d173e71400c6d27ff5ec33d5938d701cfd38bc4a6e
archive/adventure_policy.py 928b3e105b921b5bb96aefca3e02069dee4f406f8c2ea58d9ebabc5e5c849704
archive/runner_paths.py 8b823117dab98c4dad35f7da12f236cd6d06c6fd05b10bf8635cca5d54486491
archive/test_adventure_policy.py 3811bbbd7b101d857af3e40151b6964ebf4e79a47b9a6a6a71cdca1e224908b3
archive/test_runner_paths.py 71fe3a52810e2632e6f4c3ca4f9f3be3972b67366ea979ae216ec0bae7fd711f
loot_monte_carlo.test.ts 34219d07d7c6d09e95f5a981028f403f8c4b5319ee07c58698d5f9a76c2a46d3
combat_simulation.test.ts 96681f07ced48109c92db14a54d194ac282073ed4b1024137429b5edd0607160
simulation.config.ts 39ec78ab200ef30c3693a71b597a3301ac95ab30f3ad8688d4173fbacdead6ad
metric-contract.md e08a8eb218490ac1c124c3feb5842c00244c2948f5a2ac478741f92c3533fa64
ticket 20261006-v2x-04-adventure-loop.md d76b0a5238fc152bd0ed8e501356f44d44e98aea8d56ff60717f0435c294006d
spec V2X-PHASE4-ADVENTURE-REWARD.md 9e5cced00eb8db215f27e88fc7494db6efc3d0c69d918039d897aa28666f0a25
```

## Final runtime driver review delta

Reviewed `archive/final-runtime-driver.py` at SHA-256 `b052a3bafd6798f7dd68a47ea287612c5f09e6baff8ba0de4e24055841d7ebf0`. Static inspection confirms the explicit `--go` gate, repository/config/source preflight, all-source and declared harness/config fingerprints around commands, successful build gate, HTTP/index/bundle byte matching, exact stale-listener identity before SIGTERM, append-only raw stdout/stderr paths, simulation sanity before formal counts, separate long-run subprocesses, and reported real duration gates. No driver execution or mutation was performed.

The two P2 driver findings below are now closed by static delta review:

4. **Closed by static delta — the final simulation denominator gate accepted truncated combat matrices.** `validate_simulation_outputs()` at `archive/final-runtime-driver.py:542-567` only requires the row array to be nonempty and the seed count to match. `publish_final_simulation_copies()` at lines 498-503 checks `actualFightRuns == len(rows) * 2` but never requires the approved 4,320 metric rows / 8,640 actual fight runs for 8 seeds, 15 builds, 3 powerbands, 6 target scenarios, and 2 policies. A test matrix that silently omits a build/scenario can still be published as final. Assert the explicit dimensions and exact row/fight counts (and verify the report's build/target/policy sets) for both sanity and final outputs.

5. **Closed by static delta — targeted browser validation accepted an empty check list.** `archive/final-runtime-driver.py:787-800` parses the helper report and checks error count and freeze flags, but it never verifies that `checks` exists, is nonempty, or contains required regression names. A future accidental early-success/no-op helper could exit zero, produce stable hashes, and be accepted without exercising any browser assertions. Require a documented set of essential check names or a minimum explicit expected result set before writing browser-regression status.

Remaining limitation: these are code-path findings only; no runtime output exists to establish actual behavior or elapsed time. The driver is long but its current modular phases are reviewable; this review recommends only the two narrow guards above, not an architectural rewrite.

## Frozen UI and latest driver review delta

UI scope reviewed at these content hashes: `InventoryWindow.vue` `7852a1fedce6ac6a1c3aea4652ec8248ba0827d878358da0455e3417f8ca1f68`; `AdventureWindow.vue` `d4901efab46aeee41c04813369a94787fcf1b5f2a60128984e037f80bde851cd`; `PlaceWindow.vue` `46c761635ac960fc5b88a629c5940d6af842c8bc18aa19e6424c3594b069173e`; `rewardProjection.ts` `daed466cfa4de21067f56eb2450f3c68fe0b5bf8f1b7435b3dde6717b2b05d69`; `rewardProjection.test.ts` `0951dfc9dd456e0038818215aefc37e5f1e6ba6e31adc47a5a7b4b7679961309`; `style.scss` `75010f723d2597f2dfcb88a24ce63ddae090eb53c786fe4b8b19b080f94c7500`; `docs/UI.md` `7e761cff7c9d92307944d144ebd3ba12235245a54e16d0c9ac2184da43fa6aa7`; `premium-ui.json` `45dad140657a92c867c21dde2090ff102c0a25afa80ea72d326a82664a05ddf2`.

Static UI findings: same-slot comparison uses detached data and includes candidate/current rarity, per-stat signed differences, affixes and special traits without an aggregate score or RNG; combat and track expectations call `wolfRewardExpectation`; one visible goal follows existing unlock/defeat/cooldown state; first-discovery wording comes from the actual bounded `loot.item` event and vanishes after eviction. The CSS preserves the existing monochrome pixel tokens, wraps long expectation copy, stacks affix panels on narrow screens, and keeps numeric deltas readable without color. The docs and manifest point to Phase 4 evidence. No source or styling change was made in this review.

6. **P3 — rarity percentages need a conditional qualifier.** `src/components/PlaceWindow.vue:47-54` and `src/components/AdventureWindow.vue:20-27` display the overall gear-drop chance adjacent to rarity percentages, but the UI labels do not say that rarity percentages are conditional on gear dropping. The source API builds `rarityChances` by normalizing rarity weights to 100% (`src/engine/itemGeneration.ts:48-50`), while normal wolf `gearChance` may be below 100% (`:68`). A player can read e.g. “獵裝 65% · 品質 普通 60%” as two unconditional encounter chances. Label this as “品質（掉落裝備時）” or equivalent in both screens; this is a copy-only clarification and must not alter the rates.

The follow-up driver delta at SHA-256 `4fa911a46a92056946fd1dd6c68607821279a9239bdc5b1487dba9903d4108c0` closes QA-4 and QA-5. Static review confirms its pure validator enforces 540N metric rows / 1,080N fights for sanity and final, exact build/powerband/target/policy sets and full unique Cartesian scenario keys, and per-rank/boss-exclusive denominators. Browser validation requires 15 named core checks plus nonempty single-modal and responsive groups while permitting additional checks. The author archived six focused pure validation tests as passing; I did not rerun them. The original driver version remains preserved in the report archive.


## Final driver and copy-clarification delta

The driver guards are accepted by independent static review at `4fa911a46a92056946fd1dd6c68607821279a9239bdc5b1487dba9903d4108c0`. The test file `archive/test_final_runtime_driver_validation.py` at `3e11c7e11643c20000cc2b9c7ced304406d59ecc224612281b5e887732827113` covers the Cartesian-count pass cases and the truncated rows, incorrect rank denominator, duplicate key, missing checks, and permitted-extra-check cases. The archived author result records six tests passing; I relied on code inspection and did not rerun them.

UI-1 is closed by the copy-only delta: both `PlaceWindow.vue` and `AdventureWindow.vue` now say `品質（掉落裝備時）`; the displayed rates and projection behavior are unchanged. New hashes: PlaceWindow.vue `ba31a984e6936a940d8086ee14bd6e1387b2bba0112cf5940f5373bd3096f6d2`; AdventureWindow.vue `eb6167f033c2c871d0719fb3742319df591feace02bffabe8af5a4802ebfc087`.

These deltas close the static findings only. I have not run the driver, browser, app, build, simulations, or long-duration runs, and make no runtime or product-readiness claim. The browser helper selector/provenance delta and final raw reports still await their designated review.


## Final browser helper delta

Independent static delta review closes QA-3 at the current helper hashes: `phase04_adventure_playtest.py` `7278814b4ccc8ff1e2ac00d173e71400c6d27ff5ec33d5938d701cfd38bc4a6e`, `phase04_stress_browser.py` `3970a59c0789d02efe58cfd8faf3e8a4b79d7adcd012310315e15aa6bd587f8c`, and `verify_browser.py` `cb872c53961200a507405010f69e4eaca2e77f3c364595513f80b69fbe4209e8`. Their start/end guards compare all on-disk source files, commit/build-status fingerprints, each harness, and the imported helper hashes. The browser helper hashes `runner_paths.py` and `scripts.recorded_reports.py`; stress hashes those two; Adventure hashes those plus `adventure_policy.py`.

Static selector review found the runner queries match the frozen UI: one actual `[data-adventure-goal]`, five rendered `.wolf-track-row[data-wolf-track][data-rank]` rows, per-row reward expectation copy, current `[data-gear-comparison]`, and actual `[data-loot-feedback]` event text. The goal selector reads only the explicit goal node rather than treating the target list as a goal. Reward parsing accepts the conditional rarity label and the boss-exclusive forecast (“月牙獵矛”); the stress regression covers its 390px viewport, reduced-motion context, Tab focus and Escape close. No QA-3/selector P2 issue found.

The author records 13 pure tests and compilation checks as passing; I did not rerun them. No browser/runtime evidence exists yet. Final driver guards and UI-copy delta remain statically accepted; Root may proceed to the separately controlled final-QA release, but that release is not itself a runtime pass.


## Driver startup failure and recovery delta

The first formal driver invocation is preserved at `final-runs/launch-20261006T124811917080Z/`. It failed before `npm run check`, build, server, simulation, or browser startup: `FinalRunner.__init__()` called `publish()`, whose local import raised `ModuleNotFoundError: No module named 'scripts'`. This is a real launcher failure and remains in the raw launcher log; it is not represented as a product/runtime test failure or pass.

The fix at `archive/final-runtime-driver.py` SHA-256 `e4f6aa5a34398b33b27cb7127dbf5193490891230d194f031c7a0976dd7fe6b0` first confirms the repository root via cwd and `git rev-parse --show-toplevel`, then validates `scripts/recorded_reports.py` and inserts that confirmed root into `sys.path` during `repo_preflight()`. `main()` calls preflight before creating `FinalRunner`, so the initial status `publish()` now has the import path. The isolated startup test removes the repository root from `sys.path`, loads the absolute archived entrypoint from a temporary working directory, invokes the checked path exposure, and imports the writer; its author-reported pass is not a full driver run.

I also checked the three standalone browser entrypoints: each discovers the root from `runner_paths.py`, inserts the validated root before importing `scripts.recorded_reports`, and does so before its first writer call. No analogous startup import defect was found. This closes the startup defect statically with an isolated smoke test, but the full formal QA run remains unverified and must be attempted again from the corrected driver.


## Port-conflict environment failure and safe retry delta

A second formal attempt is preserved at `final-runs/final-qa-20261006T125323945890Z-738fb3a5/`. Its complete check/build phase passed (330 tests across 20 files; TypeScript check and Vite production build), then the production server could not bind the configured port 5202 (`OSError: [Errno 98] Address already in use`). The listener could not be attributed because `ss` exposed no PID details and `/proc/4506/cwd` was inaccessible. The driver did not stop or signal that process. This is recorded as an environment/readiness failure; simulation, targeted browser, stress, and Adventure did not run.

The port delta at `archive/final-runtime-driver.py` SHA-256 `ab97b1afdf0868280160e272661e8afab9fd377ad5ef19f403837d3f2d25cb06` consistently derives the local URL, HTTP Host/readiness requests, listener query, and `http.server` command from `PORT = 5214`. The targeted, stress, and Adventure subprocess environments all use the same `browser_url_environment()` value. The known-stale PID allowlist is now empty, so the uninspectable 5202 listener is outside the cleanup path and cannot be signaled. Static review and the author-reported port/startup/validation pure tests find no inconsistency in this focused change.

The original bind failure and completed check/build logs remain archived under the failed run; the port change does not convert that attempt into simulation or browser evidence. Root must authorize a fresh full run on 5214. Runtime pass remains false.
