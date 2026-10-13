# Phase 7-D Root Closeout — Cave Insects

## Disposition

**D acceptance: BLOCKED on one P2 evidence gap; no E release.** The implementation and runtime checks pass with findings, but the ticket explicitly requires the original failure, source SHA/fingerprint, and report to be retained. The first authoring failure's report/diagnostics and failing pack SHA were archived; its pack bytes and authored-module SHA/fingerprint were not. Those historical bytes cannot be recreated or substituted with a later successful source version. On 2026-10-12, the Owner directed Root to maintain the block rather than waive this condition; Phase 7-E remains unreleased.

This is not a product/runtime bug finding and does not invalidate the successful current content pack. It is an auditability/acceptance limitation.

## Baseline and source

- Branch: `v2x/reward-core`
- HEAD: `fd6b5e84bef73d5dc429201c903d4a867976cd0a`
- Verification used the HEAD above plus D working-tree changes; the 2026-10-13 canonical run's complete source map also records the test-runner configuration. A later blocked WIP checkpoint preserves these changes without D acceptance.
- Node / npm: Node 24.19.0, npm 11.9.0.
- Current Cave Insects module SHA-256: `20d7d07e7780caf8c199a9c041eeae96a67e30da5bc1c0b34763d1ef9ce39468`
- Runtime registry SHA-256: `b92ef40d3351ac6a9b873d64ce109147b58c3942a730915a164a615001855bd5`
- Runtime integration test SHA-256: `39cb92540977d7efd5030018725f063e528409cff1b761459f3e4c52731e9747`
- Legacy crafting test SHA-256: `031cda43d2b6ad37a164510386bbf0f749bb5272bd71d95def7425d7373586ad`
- Crafting projection test SHA-256: `df6440ddcc2320ee7193027daae866cf86b4cacf6bdf26efb131e7b36e008a92`

## Implemented D scope

- Added six normal and two Elite Cave Insects, with mine-only profiles and the approved `level 3+ AND (village stage OR threat 2+)` family gate.
- Added family-local selected loot tables and seven usable sourced materials.
- Added one intended equipment loop: two normally earned `cave_insect_chitin` plus existing wood/iron inputs craft the `cave_insect_chitin_spear`; the item can be equipped and survives save/reload.
- Added combat mechanics for the roster and connected the authored pack through the existing runtime registry. No Boss, Mini Boss, shared combat architecture, or broader recipe expansion was added.

## Verification

- Content batch validator on the final gate-fixed pack: **PASS**, 8 qualifying monsters, 8 candidate item IDs, 7 usable materials, 0 errors / 0 warnings. Pack SHA-256: `18751aff901ae9a6512260ad18accce36c33b7e4971838aec82d2d54a45879fd`; retained at `d-cave-insect-pack-gatefix.json`.
- Targeted runtime regression, run by Root after final test edits: `npm test -- --run src/engine/caveInsects.integration.test.ts src/engine/crafting.test.ts src/presentation/craftingProjection.test.ts` — **3 files / 73 tests passed** (2026-10-12 07:03:57 UTC; Vitest 1.12 s).
- `npx vue-tsc --noEmit`: **PASS**, no diagnostics.
- `git diff --check`: **PASS**.
- Default full check `npm run check`: **FAIL twice**, both times during test stage on the existing 500-year deterministic save continuation test (`src/services/saveService.test.ts:708`), configured for 15,000 ms and observed at 15,268 ms on the first run and 15,074 ms on the second. Attempt 1 also exposed two stale legacy exact-list test expectations; both were corrected and targeted-tested. Build did not run through either default check because the test stage exited nonzero. Original failures remain in `d-full-regression-red.md` and `d-full-regression-red-2.md`; the first red report was captured in `playlog.jsonl` before this closeout.
- Controlled whole-suite diagnostic `npm test -- --run --maxWorkers=1`: **PASS**, 31 files / 570 tests, 38.14 s (2026-10-12 07:05:33–07:06:14 UTC). This is consistent with contention in default parallel execution, but does not prove that cause or change the two recorded default-check failures.
- Separate `npm run build`: **PASS**, `vue-tsc --noEmit` clean and Vite 7.3.6 built 91 modules (2026-10-12 07:06:28–07:06:37 UTC).

## Independent review and finding disposition

- Reviewer: `g6-luna-med-content-reviewer`, independent of implementation; GPT-6 Luna / medium was requested, runtime telemetry unavailable. Reviewed current D source, registry, tests, validation report, and red-regression evidence at HEAD above.
- Standards: **PASS** — registry addition remains narrow; no shared runtime/catalog architecture changes; legacy recipe assertions and new D projection assertion have explicit scope; integration tests use actual encounter/combat operations, award selected loot, and exercise craft/equip/save-reload.
- Spec: **PASS WITH FINDINGS** — the progression OR gate, actual guard effect, mine-only scope, and family loot/crafting bridge match the approved D slice. The unresolved P2 is the original authoring failure source evidence described in Disposition. The reviewer explicitly advised not to reconstruct or mislabel later content as the original input.
- Earlier findings resolved before this review: P1 Hamlet+threat1 reachability mismatch; P2 stale recipe expectations; P2 combat mechanic test not traversing real `combatTurn`; missing D-specific recipe projection assertion; direct combat HP test manipulation. All current fixes are in the hashes above and targeted tests pass.

## Evidence limits and remaining work

- The initial failed validator report is archived in `playlog.jsonl` with report SHA-256 `5b0062a838404bd4bd59229f795f1fbd60474ac5730345f34ff7d2588dd47d62`; it records `orphan-material` and `affix-ineligible` diagnostics and failing pack SHA-256 `5a03ea1f19fe78b1b7bd7cc8b96d189f95d36698bc407f9c929d2f7ca84a663d`. The failed pack bytes and failed authored-module SHA/fingerprint were not retained. Later successful hashes are not substitutes.
- Natural spawn frequency and long-duration exposure were not measured; controlled validator witnesses only prove bounded predicate reachability. D does not include Boss content; that belongs to E.
- Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`; agent/test evidence is not human product validation.
- Root may preserve the unfinished implementation and QA evidence as a blocked WIP checkpoint under the standing working-branch Git authority and `docs/HANDOFF.md`. Preserving a checkpoint does not change the D acceptance or E dependency gate.

## QA continuation — 2026-10-13 (Asia/Taipei)

- Bounded original-evidence recovery did not locate the expected failed pack bytes or original authored-module SHA/fingerprint. See `d-evidence-recovery-20261013.md`. The Owner's decision to maintain D blocked remains in effect; E remains unreleased.
- A fresh unchanged default-worker run timed out at 15,661 ms. A subsequent verbose default run passed at 14,938 ms; a verbose two-worker run passed at 13,863 ms. The small sequential sample does not prove the cause of the timeout. Raw logs and source maps are retained in `d-timeout-diagnosis-run/worker-probe/`.
- Root selected the minimal runner resource policy `test.maxWorkers: 1` in `vite.config.ts`. The 500-year simulation, all test assertions, the 15,000 ms timeout, and production source are unchanged. The tradeoff is longer total suite wall time; it is not a product-performance fix or guarantee.
- Latest canonical `npm run check`: **PASS**, 31 files / 570 tests, `vue-tsc --noEmit` and Vite production build passed, 2026-10-13 09:10:56–09:11:37 Asia/Taipei (01:10:56–01:11:37 UTC). Vitest reported 34.08 s; this standard output did not report the target test's individual duration.
- Exact config SHA-256: `becf40818c32c8a55aea3c51276d1a6be6e4c7243b06fad512ece24b7a10a771`. Before/after 103-entry source/config/package maps matched with fingerprint `9849349e05bf490b369fa0b011bb68e90fa0ccc6c04ebb958b886fb17a5a32c0`; raw stdout/stderr and metadata are in `d-timeout-diagnosis-run/maxworkers-1-check/`.
- Diagnosis and the later runner correction are documented in `d-timeout-diagnosis.md`; all previous RED reports remain unchanged. Independent Medium review of the continuation passed Standards and Spec, with unchanged D source hashes and validated raw/archive evidence; see `d-qa-resume-review.md`. This review accepts the QA continuation and blocked handoff, not the missing D acceptance evidence.
- Delivery whitespace check: the first unqualified `git diff --cached --check` exited 2 on five raw worker-probe logs with `new blank line at EOF`: `default-workers.stdout.log`, `default-workers.stderr.log`, `maxworkers-2.stdout.log`, `verbose-default.stdout.log`, and `verbose-maxworkers-2.stdout.log`. Preserve the exact runner bytes. Strict staged checking excluding only raw `d-timeout-diagnosis-run/**/*.log` passed; checking those logs with the invocation-only `-c core.whitespace=-blank-at-eof` also passed. No global Git configuration changed. Independent Medium verification confirmed precisely these five diagnostics, identical staged/worktree raw bytes, and no additional standards/data-integrity finding. All 103 staged test inputs matched the successful canonical source map.

## Preventive evidence-retention repair — 2026-10-13 (Asia/Taipei)

- Baseline HEAD: `f026b6b4947d18aadc0f551c642c31750db5768c`, branch `v2x/reward-core`. Only QA scripts/documentation/artifacts changed. All 103 current product/test/config/package inputs still match the successful canonical check map; that 570-test check was not rerun for this scripts-only change.
- The validator now captures exact input before parsing, independent authoring/validator/baseline source snapshots and a source fingerprint in unique exclusive-write run directories. It retains raw child stdout/stderr and actual exit/error/signal, distinguishes content from aggregate validation/check status, and fails the command on publisher failure while preserving the previous report. These local captures do not prove that source generated a supplied pack, prevent file deletion/tampering, or guarantee complete power-loss durability.
- Native Node tests: **8/8 PASS**; both module syntax checks passed. Previously recorded publisher Python tests: **4/4 PASS**, unchanged publisher. Real CLI regression: **five scenario types passed**, with one old-source invocation and five current invocations. The first current E fixture erroneously reused the semantic-negative input; its raw failure is retained, and one corrected valid-input E invocation passed the intended QA assertion. Intentional nonzero CLI exits are not QA failures.
- Old immutable CLI malformed-input run reproduces failure without a report/run directory. Current valid input exits 0; semantic-negative and malformed input exit 1 with preserved evidence; publisher mock exit 23 yields CLI exit 1 and unchanged prior report. Current `outcome.json` summarizes validation/checks before publication; publication status is recorded separately. Exact streams, timestamps, five manifests and integrity checks are in `d-evidence-retention-run/`.
- The initial test-first RED was `ERR_MODULE_NOT_FOUND` for the introduced helper; retrospective tool-history transcription and initial test reconstruction are labeled accordingly. Behavioral reproduction of old code occurred later, not before the fix. See `d-evidence-retention-engineering.md` and `d-evidence-retention-red/`.
- Frozen SHA-256: validator `79f390fad5a706955b1f2546c6065191e52e556d4c6297587d2a11cc8859c989`; helper `574343415da3524deb7092cc1288ce8e602eae8aa9eb41be9b998c62d8dd6bc4`; focused tests `0d071a6a405b2121f5360a0af2c737a17f403d60f61b460ef4dc1cc842a393ba`; scripts README `d50ca95bb9180265b7844e25ccb9ab6c488f3283003229e691867e24e2565b0d`.
- Independent Medium review: **no open Standards/source Spec findings**. Initial durability/status-label findings were resolved and remain recorded with the review delta. See `d-evidence-retention-review.md`; reviewer inspected evidence without rerunning tests.
- One explicitly derived resin-bias candidate produced checksum `06806ef8363c4992ff942b2c43a998469dba0d570811ace1ef14d23a59fa22c0`, not the original expected checksum; no candidate file was supplied as historical evidence. See `d-evidence-reconstruction-check.md`.
- **Repair complete; D acceptance remains BLOCKED; E unreleased.** Historical failed bytes/source provenance remain unavailable. Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`.

## Owner-requested D resolution — 2026-10-13 (Asia/Taipei)

- Owner requested 「把D的問題解決」. Completed fresh source-linked revalidation under the repaired tool: recorded SSR generation from the frozen D module yields exactly the retained 10,879-byte gate-fixed pack; actual positive CLI PASS with 8 qualifying monsters / 7 usable materials. A clearly derived resin/keen negative produces both original diagnostic types and retains its new bytes/source. Exact source/pack linkage, positive/negative runs and before/after maps are in `d-remediation-run/d-remediation-revalidation.md`.
- Technical repair and present-source validation are complete. The remaining historical P2 finding cannot be closed by pretending a later negative fixture is original. A specific compensating-evidence clause is ready in `d-remediation-disposition.md`; independent Medium delta review passed technical Standards/Spec in `d-remediation-review.md`, with Owner's exception decision still pending. It confirms current-source linkage, distinct negative fixture, unchanged 103 prior product regression inputs and the scoped raw-output whitespace exception.
- Root will present that concrete clause for Owner confirmation because the earlier explicit decision was to keep D blocked without waiver. Until confirmed, D remains BLOCKED and E unreleased. The proposed eventual status is D accepted with findings, not a recovered historical artifact or full Phase7/product acceptance.
- Delivery whitespace: first unqualified staged check exited 2 on exactly seven `work/.qa-runs/*/targetedTests.stdout.txt` files (five retention-regression runs, two current-D revalidation runs), each with a final blank line at EOF. Exact stdout bytes are preserved. Strict staged checking excluding only those seven paths passed; a raw-path-only check with invocation-specific `-c core.whitespace=-blank-at-eof` passed. All seven staged blobs match the working-tree bytes. No global Git configuration or raw evidence was changed.

## Current gate summary

- D content/runtime verification: **PASS WITH FINDINGS**.
- Latest canonical `npm run check`: **PASS** with the one-worker test policy; prior default-worker failures remain recorded and the underlying performance cause is unconfirmed.
- Independent review: **Standards PASS; Spec PASS WITH FINDINGS**.
- D ticket acceptance: **BLOCKED** by the historical source-evidence gap; no false reconstruction is claimed.
- Phase 7 final gate / product gate: **not evaluated**.
- Owner direction (2026-10-12): **Maintain D blocked; do not waive the evidence requirement or release E.**
