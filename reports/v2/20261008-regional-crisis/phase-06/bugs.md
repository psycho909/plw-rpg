# Phase6 Bug register

Source base: `b82de85fb251697fca3e4331c5bb44945349a387`; uncommitted Phase6 source identified by per-stage hashes. Human: DEFERRED / NOT APPLICABLE AT THIS STAGE.

## P2-B01 — Current save accepts coerced crisis severity

- Finding: strict V4 validation accepted severity string `"2"` and array `[2]`, preserving wrong runtime types. Public deserialize reproduction: `b-review-repro-raw.json`; initial source fingerprint `85b0cdb5eb05a9ab650b083e6d962bbd44554e18f5ba79e7af87a091b5a6b663`.
- Root cause: `Number(value.severity)` membership check. Boolean true rejected in original severity-2 fixture; matching severity-1 regression demonstrates its coercion acceptance separately.
- Impact: malformed saves cross numeric schema boundary; not proof of spontaneous corruption during normal play.
- Fix: strict safe integer range 1–3; numeric controls preserved, coercible types rejected.
- Evidence: original bug RED, subsequent test RED, six-case GREEN, 92 save tests and typecheck preserved in `b-fix-*`; independent Standards/Spec review PASS, 207 focused tests; `b-core-independent-review.md/json`.
- Status: FIXED / INDEPENDENTLY VERIFIED / B ACCEPTED.

## Harness failures (not product bugs)

- Initial reproduction Vite config resolved outside project. Original raw `b-review-repro-initial-failure.json` retained; corrected absolute project/config paths produced valid reproduction.
- Added regression first failed typecheck because union severity access lacked narrowing. Original `b-fix-typecheck.txt` retained; test assertion corrected, green typecheck recorded separately.

This register was updated after the J formal runs; prior slice findings remain preserved below.

## P1-D01 — Allocated defender death makes generated save unloadable

- Source: D uncommitted development snapshot on parent `bd4901c`; exact pre-fix source/log hashes in `d-red-pruned-defender-source-hashes.txt`.
- Reproduction (CONTROLLED FIXTURE/public seams): contribute owned equipment → `die` defender → normal `simulate` crosses daily boundary and prunes nonfeatured dead NPC/life records → `deserialize(serialize(state))` rejects generated save. Original failing regression `d-red-pruned-defender-reference.txt` SHA256 `654503e39a596e3378b98d558fa4df0c30f00d5da2e82073d23070a72d54d04d`. Independent reviewer also observed this before patch; its later attempted second capture raced with fix and was not misreported as RED.
- Root cause: validator required current `s.npcs` membership for retained crisis allocation. Legitimate historical NPC IDs below monotonic nextNpcId must survive lifecycle pruning.
- Severity: P1, ordinary lifecycle cleanup can render internally generated saves unloadable. Does not claim observation in a normal browser playthrough.
- Fix underway: accept bounded legitimate historical references and keep actual action→death→daily prune→reload regression. Prior over-strict test/RED/GREEN evidence retained and explicitly superseded.
- Status: FIXED / INDEPENDENTLY VERIFIED / D ACCEPTED.

## P2-D02 — Over-request incorrectly advises more farmers

Oversized food submission with a negative raw forecast that could become positive gave zero-effect farmer advice. Asset guards still rejected the request atomically. Distinct over-request and actual zero-effect messages now covered by retained `d-red-food-feedback.txt`/`d-green-food-feedback.txt`, independentDreview confirmed; FIXED.

## Additional harness/test failures retained

- Authentic archivedV4 fixture runner emitted a Vite log before JSON. Parser failure retained in d-v4-fixtures/generation-failure.json; corrected parsing produced authenticatedsame-sourceV4 fixtures.
- FirstD fullcheck: 473/475 passed, two testfailures from staleV4 version expectations; three assertions corrected toV5. Originald-fullcheck.txt kept, separategreen475/typecheck/build.

## P2-E01 — Camp victory exceeds valid event-sequence budget

E uncommitted snapshot on source parent `dfdc816`. Controlled public startRegionalCampRaid at MAX_SAFE_INTEGER−2 then successful combatTurn produced a save rejected by deserialize; original `e-red-event-capacity.txt` SHA256 `68e72137d92e6b5d0e20b7118f7839b1f667c5231d9b285aafd9a324fde8ccf1` records exact pre-fix source/test hashes and failure. Source test hash `5b3c72ed449f7f2b29e56cf511f1cc2bab07680be7dcf2e0aba3fc8a0268f59f`. Natural play cannot practically reach this counter; classified P2 integrity edge, not P1 normal-save loss. FIXED / INDEPENDENTLY VERIFIED / E ACCEPTED. Exact isolated camp-combat clone preflight rejects before real state changes; 505 full tests and independent 29 tests PASS. Original RED retained. Full-history clone cost remains an I/J profiling risk.


## P2-F01 — Canonical resolution, recovery, and V7 migration incomplete before F

- Public REDs: `f-red-resolution-recovery.txt` shows that the active crisis never reached a measured outcome and a zero-population world with the Goblin Chief alive had no recovery immigrant after 31 days; `f-red-v6-v7-migration.txt` shows an authentic V6 save remained at V6; `f-red-event-capacity.txt` shows a near-limit resolution boundary changed state without rejecting atomically.
- Fix in frozen F candidate: one canonical world-RNG outcome draw with bounded consequences and a measured summary; due-date recovery rechecks population/Chief and uses one adult immigration; validated V6 migration to V7 adds nullable legacy summaries; exact isolated daily-boundary preflight rejects unsafe capacity/time before mutating the public state. Craft event/NPC allowance includes these bounded effects.
- Additional transient implementation/test issues and fixture corrections are preserved in `f-development-regressions.md`; the original three RED files remain unchanged. Final focused tests, typecheck, and production build pass as recorded in `f-source-freeze.json`.
- Status: FIX IMPLEMENTED / INDEPENDENT REVIEW PENDING. This is not an F acceptance or G-release claim.


## P2-F02 — Public action can partially apply before a crisis boundary rejects

- Reproduction: at the active-crisis resolution boundary with near-maximum event capacity, paid inn rest deducted gold before `simulate` rejected; a lethal ordinary combat turn applied XP, gold, loot, world changes, and events before the same rejection. A multi-step `walkTo` committed its first step before its later step failed. At due recovery, `homeRest` could emit its final event after simulation and leave `eventSequence` unsaveable. Retained REDs: `f-red-public-action-atomic.txt`, `f-red-combat-reward-atomic.txt`, `f-red-walkto-atomic.txt`, `f-red-home-rest-trailing-event.txt`, and `f-red-legacy-resolution-atomic.txt`.
- Root cause: canonical simulation preflight ran after public wrappers had already mutated costs/rewards, and the boundary preflight did not include action effects that followed `simulate` or historical V6 saves already in `resolution`.
- Fix: at only the scheduled crisis resolution/legacy-resolution/recovery days inside an action’s duration, run the complete internal action on a cloned state before live mutation. Check the clone after trailing action effects; then execute the live action once. Composite walking previews its full path. The original rest RED source hashes are retained in `f-red-public-action-source-hashes.txt`.
- Severity: P2 integrity edge around counters practically unreachable through normal play; the affected output is a partially changed or unsaveable world, not routine player progression.
- Status: FIXED IN CANDIDATE / INDEPENDENT REVIEW PENDING.

## P2-F03 — Unsafe world-time end can charge a public action before rejection

- Reproduction: with a paid inn rest beginning at `Number.MAX_SAFE_INTEGER - 100`, the public action deducted 8 gold before `simulate` rejected the unsafe resulting time. The retained RED is `f-red-world-time-atomic.txt`; pre-fix source/test hashes are in `f-red-world-time-source-hashes.txt`.
- Fix: `preflightRegionalCrisisAction` now validates the requested duration and safe resulting world time before checking for a crisis boundary or running any action body. This is an O(1) guard and does not add a clone on normal actions.
- Severity: P2 integrity edge at an impractical world-time limit; it is distinct from ordinary progression.
- Verification: the current 14-file directed set passes 411/411, `vue-tsc --noEmit` passes, and the production build passes (`f-green-safe-world-time-focused.txt`, `f-typecheck-final.txt`, `f-build-final.txt`). A transient craft validation-order regression found by that run is preserved and fixed in `f-development-regressions.md`.
- Status: FIXED IN CANDIDATE / INDEPENDENT REVIEW PENDING.


## J — Browser harness failures and correction (QA defects, not product bugs)

All findings below came from `j_browser_runner.py` / its dry-policy automation against the unchanged production build at HEAD `bd316cb326e5fbc20087c0154d6e3f294a5daac7`. The failures were harness selector or result-gate defects. They do **not** reproduce an application defect, and the failure artifacts are retained unchanged.

- **Two formal-run selector failures, 186.14s / 186.29s.** Run IDs `20261008T004137Z-pid49256` (agent-crisis) and `20261008T004137Z-pid49257` (stress) failed while seeking `等待 1 日` in a `dialog.pixel-window`. The policy opened `查看地圖`, which selects World Records `kind=world`; that pane has no wait button. The actual existing legal wait action is under the menu item `旅人筆記` (`kind=notes`). The failure screenshot and Playwright accessibility snapshot show the world map behind the paused HUD; neither run reached its requested soak duration, and neither is counted as a product failure or a passing run. Exact error is retained in each run's `j-browser-result.json` and `failure.png`.
- **First corrected-policy dry, 66.83s.** Run `20261008T004921Z-pid50387` reached the long-policy runner but failed final accounting with `AttributeError: 'dict' object has no attribute 'phase'`; the app save's `regionalCrisis` is a JSON object and harness code incorrectly used attribute access. Fixed by using `.get(...)`. Original artifact and traceback remain retained.
- **Second corrected-policy dry, 71.03s total / 65.10s normal.** Run `20261008T005042Z-pid50642` exercised the legal `旅人筆記` wait path, reached three checkpoints, and passed every controlled lane, but final gate evaluation read `browserErrors` before that field was initialized in cleanup (`KeyError`). Fixed by computing the browser/storage/unhandled-error gate before acceptance evaluation. This run remains FAILED and is not counted as pass.
- **Verified replacement dry.** Run `20261008T005346Z-pid51533`, status `PASS_DRY`: 65.31s of fresh normal-policy time (controlled fixtures excluded); 46 visible policy turns with an append-only per-turn normal phase/world trace; 3 durable checkpoints at 2.14s, 63.99s, and 66.35s, each recording CDP DOM counters, heap usage, and performance metrics; one periodic visible save/reload; all six required isolated controlled lanes passed; no browser errors; source/build/harness provenance remained stable. The normal world remained dormant during this short dry, so this is explicitly **not** a natural-crisis arc claim. The full artifact and trace live in `j-browser-runs/20261008T005346Z-pid51533/`.
- **Narrow fixes in the frozen QA runner.** The wait policy now opens Menu → `旅人筆記` and clicks the existing visible `等待 1 日` control; saves and time still advance through ordinary UI. Phase tracking records each visible policy turn while screenshots are taken only on observed phase transitions. Acceptance status distinguishes `PASS_J_BROWSER_NORMAL_ARC`, `PASS_STABILITY_WITH_NORMAL_ARC_UNREACHED`, and failure; a complete arc requires ordered warning → preparation → active → aftermath, a real visible crisis action, and verified aftermath save/reload. Stress/agent soak minima use normal-run elapsed time only. No app source, state, clock, RNG, or debug API was changed.
- **Initial J execution interruption (superseded by final runs below).** The two early 20-minute-class formal runs were interrupted by the harness selector defect before completion. Their original failures remain preserved and are not counted as passing runs.


### Additional J execution interruptions (QA/environment, not product bugs)

- **Detached-run termination at 339s.** Runs `20261008T005555Z-pid52117` and `20261008T005555Z-pid52118` stopped with observed `/proc` exit code 9 (SIGKILL); the last durable policy-trace writes were at 338.90s / 339.53s and checkpoints at 307.15s / 307.98s. They have no result file, launcher-status, final cleanup, or provenance-after record; stderr is empty. Cgroup OOM/pids counters were zero. This establishes abrupt process termination only; its cause is unknown. The run is incomplete infrastructure evidence, not a browser/app failure and not a passing stability result. Raw trees are preserved.
- **Foreground-run modal interception at 493s.** Runs `20261008T011247Z-pid52917` and `20261008T011247Z-pid52916` ended at 492.99s / 493.03s with Playwright timing out because `.context-action` was clicked while a non-dismissible successor-selection dialog owned the surface. The retained failure screenshot explicitly says the fresh normal character died “因戰鬥傷勢” at age 17; the same ordinary successor UI lists existing residents aged 19 and older. This is a policy/modal-routing defect in the QA harness, not evidence of an application bug. No cause beyond the visible “battle injuries” text is inferred. Both runs remained below requested soak minima and are not accepted.
- **Runner correction and verified short dry.** The main policy now handles the visible dead-character successor flow and closes only dismissible dialogs through their own visible close buttons. Dead-character recovery selects a visible 18+ existing NPC, then checks worldSeed, rngState, worldTime, regional-crisis/threat/settlement/map fields, and unrelated NPC roster preservation. `j_browser_runner.py` SHA256 is `578fec5903bcc5ee8bfec3f6316dd1a1d638e62ff539e784cf116c10d59c61ec`. Dry `20261008T012711Z-pid54221` is `PASS_DRY` with 75.09s fresh normal time, 3 CDP/storage checkpoints, one periodic save/reload, six controlled lanes passed, and zero browser errors. It verified Notes dialog closure, visible PlaceWindow context interaction, result dialog closure, then a legal one-day UI wait. This short run observed only dormant crisis and makes no natural-arc claim.


### Additional isolated J successor / recorder evidence

- **Controlled successor UI attempt 1 (QA gate defect).** `20261008T013057Z-pid55017` used a separately labeled current-source controlled dead save and selected visible adult NPC `npc-1` (18). Seed `20261008`, `rngState` `875340395`, `worldTime` `480`, regional crisis, threat, settlement, map and unrelated NPC roster were preserved; the dead character remained and successor UI/action was visible. It was marked FAILED because the QA assertion assumed the action would emit exactly one event; actual current behavior emitted the selected NPC’s `identity.formed` event followed by `character.successor`. Raw full-save evidence is retained. The gate now ties the appended event sequence to appended history and requires the `character.successor` event.
- **Controlled successor UI attempt 2 (local-server defect).** `20261008T013147Z-pid55335` passed the visible adult choice, paused-world check, seed/RNG/time/world and roster invariants, and successor event checks, but was marked FAILED because the helper’s local static server returned 404 for the browser’s automatic `/favicon.ico` request. The helper now returns 204 for that path; original status and failure artifact remain unchanged.
- **Controlled successor UI verified.** `20261008T013254Z-pid55581` is `PASS_CONTROLLED_SUCCESSOR_UI`. It selected the visible 18-year-old existing NPC `npc-1`; seed/RNG/time were identical before/after (`20261008` / `875340395` / `480`); crisis, threat, settlement, tiles and regions matched; unrelated NPC roster was preserved; the dead character remained; the expected successor event was observed. Page/console/request/HTTP/storage/rejection errors were all zero; source/build/helper provenance remained stable. This is explicitly a controlled UI fixture lane, not normal play. Independent reviewer approved the helper SHA256 `5fe5e205f5141658b663538e3536ee1310e6270b73975c0ed7229b66b41538f3`.
- **Supplemental fresh normal recorder dry.** `20261008T013300Z-pid55756` is `PASS_DRY` (1.38s) and verified recorder launch/telemetry with a fresh save. It saw only dormant phase, no crisis action, and no natural arc; it is not arc evidence. Artifact: `j-normal-arc-runs/20261008T013300Z-pid55756/`.
- **20k history profile.** The separate controlled profile passed with exactly 20,000 engine-emitted history events, active controlled save/reload, 3 UI scenarios, and zero page/console/request/HTTP/storage/rejection errors; history SHA256 `171c50e5e5f09f9fdf78e1a2708cb1f75d212153a642dcdab06e1f238ec0bb26`. This profile measured history serialization/reload but did not report actual IndexedDB journal record counts/bytes. The main runner’s periodic checkpoints do query existing IndexedDB databases read-only and record per-store row counts; no database is created for profiling.
- **Classification.** These recorded attempts and fixes are test-harness or local test-server issues only. No application-source changes were made for these J corrections.


### J final formal runs and supplemental fresh-arc evidence

- **Stress formal run:** `20261008T013358Z-pid56003`, 1,201.08 seconds of fresh normal UI play, 20 valid durable checkpoints, 5 visible save/reloads, all six controlled lanes passed, and zero browser/storage/unhandled/snapshot errors. Offline acceptance passed. Its observed normal phase sequence contains warning → preparation → active → aftermath and a real visible crisis action; aftermath save/reload and outcome/summary were verified. The frozen trace does not include `regionalCrisis.id`, so same-instance identity is **inferred** from the uninterrupted monotonic canonical phase chain, not directly verified. The raw runner disclosed no world seed.
- **Agent-crisis formal run:** `20261008T013358Z-pid56004`, 1,800.20 seconds of fresh normal UI play, 30 valid checkpoints, 5 visible save/reloads, all six controlled lanes passed, and zero browser errors. Its final raw runner label is `PASS_J_BROWSER_NORMAL_ARC`, but `normalArcAssessment.complete` is false: it observed a first arc and then entered another warning/preparation/active sequence without aftermath save/reload before budget end. This label is a runner gate defect; the offline validator reports its run evidence separately and does not count it as the required complete arc. The raw runner disclosed no world seed.
- **Independent offline acceptance:** `review/j_browser_acceptance_validator.py` returned `PASS` for the formal pair: distinct runs, same frozen HEAD/build, stability minima met, all required controlled lanes and checkpoint telemetry valid, and at least one complete fresh normal arc across the pair. It explicitly records inferred crisis continuity for stress because the frozen trace omits the crisis ID; do not describe this as direct ID equality. Stress and agent artifact trees are retained under `j-browser-runs/20261008T013358Z-pid56003/` and `...pid56004/`.
- **Supplemental one-day recorder drys:** `20261008T013300Z-pid55756` and `20261008T020901Z-pid57988` each verified a lawful visible `旅人筆記 → 等待 1 日` action and full-save trace on a fresh dormant world; neither observed a crisis arc. They are smoke/dry evidence only.
- **Supplemental natural arc attempt:** `20261008T020907Z-pid58138` reached fresh crisis ID `goblin-regional:0000038d:1` (world seed 909), recorded a visible camp raid tied to that ID, and reached active phase. The separate recorder then encountered repeated protagonist deaths and visible adult succession choices; it stopped when no visible 18+ successor remained, refusing to select a minor or recreate the world. The artifact status is `FAILED` at 92.35 seconds; no complete arc or aftermath reload is claimed. This is a limitation of the supplemental action policy/world succession sequence, not evidence of a product defect. Full-save, action, screenshot, and status files are retained in `j-normal-arc-runs/20261008T020907Z-pid58138/`.
- **Final J interpretation:** overall Phase 6-J formal acceptance is supported by the independent validator and the stress run's complete phase chain; crisis identity continuity remains inferred. The supplemental recorder did not produce stricter same-ID/full-save aftermath proof. No app source was changed for J, and prior harness errors remain classified as QA defects rather than product bugs.
