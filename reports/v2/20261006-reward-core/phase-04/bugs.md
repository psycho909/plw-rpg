# Phase4 bugs / QA failures ledger

Status: ACCEPTED for Phase4 engineering with findings; source committed and QA evidence delivery follows on the same branch. Historical chronology below is retained, including earlier pending statements. Base HEAD d3c689985e7e4553a85148ba2a5ea3be7685cb1f plus per-artifact working source fingerprints; final F/G still pending. No production P0/P1 bug has been confirmed by the completed B/C/D checks and independent core review. This statement does not imply unexecuted browser QA passed.

## QA / engineering issues (separate from product findings)

| ID | Severity | Original evidence | Disposition |
| --- | --- | --- | --- |
| QA4-A1 | P2 | First formal baseline runner changed during execution; baseline-run-status retains INVALID version and original unique logs. | Repeated once with frozen harness/source; accepted baseline-20261006T114305162114Z, 100000 awards and 3168 rows/6336 fight runs. |
| QA4-A2 | P2 metrics | Early sanity weighted slot score labelled ECV; gross/net damage and cross-build RNG setup needed correction. | Replaced by actual combat outcome metrics, detached generation RNG and damage assertions before accepted baseline. Static screens remain diagnostics, not junk/sell rates. |
| QA4-B1 | P3 | b-tdd-green.txt floating projected probability comparison. | Projection rounding corrected; original diagnostic remains in b-engineering-verification.json. |
| QA4-D1 | P3 | d-typecheck-build.txt TS2339 for optional intrinsic base penetration. | Typed ItemBaseDefinition local variable; d-typecheck-build-green.txt passed. |
| QA4-P1 | P2 | Three archive browser scripts initially resolved ROOT to /workspace. | Shared marker finder resolves checkout and rejects missing package/src; pure tests pass. Original runner versions retained; no browser runtime had started. |
| QA4-P2 | P2 | qa-runner-independent-review: targeted browser lacked matching successful build preflight. | Fixed and independently closed statically; actual runtime pending. |
| QA4-P3 | P2 | qa-runner-independent-review: simulation fixed git-listed source map omitted new/untracked files. | Dynamic recursive ALLsrc map at each snapshot; independently closed statically. |
| QA4-P4 | P2 | qa-runner-independent-review QA-3: browser reports omitted imported helper hashes/end-stability. | Helper maps/end guards added and independently closed statically; runtime still pending. |
| QA4-F1 | P2 harness | f-refresh-attempt-01..05 captured tool excerpts: invalid stat-only fixture, duplicate swapped affix, wrong Ready metadata, source changed during UI work. | Candidate fixes implemented. No valid final sanity/formal run yet; source-guard failure not accepted as PASS. |
| QA4-F2 | P3 traceability | f-refresh-verification.md/json: complete stdout/stderr, precise exit codes and full source map were not preserved for preparation attempts. | Available original excerpts saved, gaps explicitly disclosed. Cannot retrospectively recover missing evidence; final driver will capture unique raw logs, timestamps/exit and full fingerprints. |

Expected TDD RED for missing feature/API is not a production regression. Original failures are retained and final results will be appended, not used to erase them.

## Inherited findings

PF02 raw-slot comparison is not a junk-item rate. C01 export/interleaving, C02 journal growth and C03 detached DOM/listener observations remain open in original V2 reports; a short Phase4 stress does not close historical long-run findings. Recovery pacing/material spending/retention belong to product findings, not silently reclassified bugs.

Human validation: DEFERRED / NOT APPLICABLE AT THIS STAGE. No Phase5/V3 or human/product readiness claim.

## Formal startup failure (preserved)

QA4-R1 / P2 QA harness: first launch 2026-10-06T12:48:11.917080Z (Asia/Taipei20:48) exited during FinalRunner initialization: ModuleNotFoundError scripts, because absolute Python entrypoint did not add checkout root to sys.path before importing the report writer. No npm check/build, simulations, production server or Chromium ran. Unique full raw: final-runs/launch-20261006T124811917080Z/launcher-output.log. Launcher metadata retains source freeze74files fingerprint71d8cc68...7ec245 and driver4fa911a...4108c0. Low stopped on failure; Medium import/startup-regression fix and independent delta review pending. No blind retry; old static acceptance is not a runtime-pass claim.

Driver QA4/QA5 original findings (matrix truncation and absent/empty browser checks) were repaired with exact Cartesian/count and essential named-check guards, six pure validation tests and independent static closure. UI-1 conditional rarity wording is also independently closed. These earlier closures do not remove the newly discovered startup failure.

## Subsequent runtime orchestration failures (original evidence retained)

- QA4-R1 correction: validate checkout and expose its Python import path before initialization; isolated startup regression and independent delta review passed. Original launch remains failed.
- QA4-R2 / P2 environment orchestration: `final-qa-20261006T125323945890Z-738fb3a5` passed all 330 tests/typecheck/build, then production server bind on 5202 failed with `Errno 98 Address already in use`. Original server stderr and exit status remain under that unique final-runs directory. Ownership of the pre-existing process could not be verified, so it was left untouched. Driver moved its own server and all browser URLs/readiness checks to free port 5214; port/startup/validator tests and independent review passed. No application change.
- QA4-R3 / P2 producer/consumer contract: `final-qa-20261006T125931691915Z-15b87f3a` passed full regression/build, production readiness, final 100000-award simulation (4320 paired rows / 8640 fights), and the actual 20-check Chromium regression. Driver then attempted `phase-04/browser.json`, although helpers publish `phase-04/archive/browser.json`; `FileNotFoundError` stopped the aggregate run before either long browser test started. Original raw logs/status remain. Its own production server was stopped in `finally`; the pre-existing service was untouched.
- QA4-R3 correction: all three consumer paths now use `BROWSER_REPORT_DIR=PHASE/archive`, matching actual helper publication paths. Ten pure checks passed, including AST checks of all three producers and consumption of the actual successful targeted browser report. Frozen driver SHA: acd712046522f9bd693726be5dad43ed5f92039ef9e81ed6564410bd070d0795. Independent runtime review and a fresh complete run remain required.

These are QA orchestration defects, separate from production bugs and product findings. Successful component artifacts do not change the historical aggregate FAILED statuses.

## Final frozen-run progress

Final run `final-qa-20261006T131724842089Z-c00e4d82` passed full330 tests/typecheck/build, sanity,100000-award simulation (4320 rows /8640 fights), and20 targeted browser checks on unchanged ALL74 source71d8cc68. This closes QA4-F1's final-run requirement; preparation failures and missing-log gaps QA4-F2 remain disclosed. QA4-P2/P3/P4 are now covered by real source/build/helper-stable simulation and targeted-browser outputs; longer runtime evidence is still in progress.

- QA4-R4 / P2 false-pass contract: independent Max review found that the consumer could accept a1800s Adventure PASS with an empty decisionLog. Frozen driver8412261b now requires a nonempty list of records with nonblank wanted/why/decision;3 focused tests plus6 existing validators passed and independent delta review accepted. Original driveracd712 remains archived. This was a QA evidence gap, not evidence that the default normal route actually produced no decisions.
- QA4-R5 / P3 nonblocking coverage: the report-path pure test checks producer names/directory joins but does not directly execute/assert the two long-run consumer reportPath constructions. Independent review directly verified the frozen paths; this note does not block the present run. No speculative test expansion during the source freeze.

No original aggregate failure is erased by these corrected-run component passes.

## QA4-R6 — stress UI lifecycle failure and independent retry

Severity P2 QA harness; no production defect established. Original stress started2026-10-06T13:19:31.122Z and failed after31.919 measured seconds (end13:20:04.144Z), before required1200s/100cycles. `wolf_tracking_ui_checks` successfully checked the visible boss row, then Escape dismissed/unmounted the dialog, then the check metadata attempted another `inner_text()` read from the detached row. The timeout was not caused by escaped CSS quotes; that initial hypothesis was corrected by inspecting the call order. The original file, FAIL JSON, raw stdout/stderr, and aggregate FAILED run remain unchanged.

Adventure separately completed1800.677 measured seconds, end2026-10-06T13:49:33.243Z, with unchanged source/harness; its independent PASS does not change the aggregate FAILED status.

Repair is isolated in `archive/phase04_stress_browser_retry01.py` SHA9c3524bed787729051e79a0d08e23950943e1637b09cdbfa38440b3fb2a78218: capture reward text before closing, then report the captured value. Five selector/lifecycle tests and compile passed, independent Medium review accepted. New output `stress-browser-retry01.json` preserves the original failed report. A separate durable launcher SHA b0b0dd53cb0c6a3594ce9c6cc222e9db3eacfc54bc95e09469509e16c6152e97 serves unchanged original production index/JS/CSS on its own5215 server, compares stored build/HTTP hashes, source74/head/helper/self fingerprints and owns cleanup. Full1200s retry has been authorized; no runtime PASS is yet claimed.

A5bf2016 author verification fingerprint uses a different JSON serialization than canonical71d8cc68. Independent review compared all74 path/digest pairs: identical maps, no source delta. The final delivery uses the canonical algorithm and full maps.

## QA4-R7 — Adventure target-name substring collision

P2 QA policy: `select_target` matched the first eligible label contained in the visible goal. `灰狼` is a substring of `傷痕灰狼`, so a goal naming the scarred wolf selected the earlier gray-wolf row. Original decisionLog index91 (fourth TRACK), elapsed40.603688712s, has grayWolf formed while grayWolf was already defeated, population1.02, stamina84, HP106. Frozen product eligibility and UI projection reconstruct scarredWolf as eligible and the goal as `追蹤傷痕灰狼，繼續認識北林狼族。`; the original artifact does not persist that exact goal/options text, so this part is reconstructed evidence, not an original screenshot/text claim. A pure test with actual labels reproduces the wrong choice; original RED is retained.

Original1800.677s run remains a completed exploration with limited target-selection validity, not evidence that the product has no higher targets. Its504 EQUIP decisions represent policy churn between a few items, not504 genuine build changes or proof of product chores. Final procedural equipment remains item3/item8; fixed character equipment slots null are a different field and must not be compared with procedural slots. The initial summary's field mismatch was corrected in the current report while historical versions remain.

Repair uses new policy `adventure_policy_retry01.py` SHA7fb84e751ce04a223a26fa488a55727dd66f26e7b0c0116df40f375741418e7d: prefer the longest eligible name actually present in the visible goal, retaining exclusive-reward and collection fallback. New runner SHAf7a07237ce9712285723e687544943d8cce94eada6b115faa942edcb2a6d536e logs exact explicit goal and eligible option rows, writes `adventure-agent-playtest-retry01.json`, and preserves1800s/normalfresh/noinjection/source-build/error guards. Two pure GREEN tests/compile passed; independent Medium review accepted runner/policy and launcher8609d6f8c6546a010496c37f208af00e5253891fdca9efe0a2fc40ac1dc81175. Independent30m retry is authorized on own5216 server and same production bytes. No product change, original helper/runner/PASS artifact/aggregate FAILED remain untouched.

## 最終組件驗證（2026-10-07，前文為保留歷程）

330tests/typecheck/build、100000loot/8640combat、20targetedbrowser均通過；stressretry1200.691s與correctedAgent1800.857s source/HEAD/harness/helpers/HTTPassets穩定並exit0。QA4-P2/P4/F1/R1/R2/R3/R4/R6/R7 已以實際matching-source組件結果封閉；QA4-F2缺少preparation完整raw的歷史證據缺口、QA4-R5非阻塞測試覆蓋仍保留。原wholeaggregateFAILED及原policy-confoundedAgent不覆寫。沒有已確認的productionP0/P1。

QA4-S1/P2：出售harness獨立staticreview發現HTTPassets未綁build及pageerror未阻止PASS；補guard後reviewaccepted，actualcontrolledretry8checks通過。QA4-S2/P2：首次sale browser在首個gear locator失敗，實際相鄰span textContent没有必要空白；ARIA名稱存在。不是regex雙跳脫或CSSscope缺失（初始假設已撤回）。原FAIL完整保留controlled-gear-sale/attempt-01-20261007T014036Z-full-failure-raw.json及獨立rawrun；三處\s+改\s*、2puretests及compile通過，reviewaccepted，唯一重試014332PASS。這些為QA工具缺陷，沒有以此改產品。

唯一新runtimeconsole問題為本機favicon404（P3）；page/rejection/storage0。產品pacing／高進度風險天花板／材料用途／runner換裝限制詳見reward-findings.md，與Bug分開。HumanGate DEFERRED；不宣告產品或retentionPASS。

QA4-R8/P3 historical traceability：封存4263筆record全部decode/checksum及XZroundtrip通過；currentprojection27/28吻合，唯一final-runtime-driver.py最新published仍4fa911a4，而reviewed／runtime self-hashed8412261b沒有該JSONL的同步更新紀錄。完整currentdriver檔案、runtimehash、independentreview都保留並交付；evidence-archive另以當下時間補capture，不能回填聲稱歷史中途版本自動記錄。原raw／XZ不改，manifest保留差異；非application來源／runtime結果缺失，工程PASS WITH FINDINGS。
