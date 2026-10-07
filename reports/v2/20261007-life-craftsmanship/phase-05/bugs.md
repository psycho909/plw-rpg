# Phase5 bugs / original failures

Status: A–J engineering/runtime evidence accepted on application source f9f969c9d3dfa3cbf1c379bec98eafab765b11cc. Latest full regression 425/425 across22files/typecheck/build PASS; normalH/I、20mStress／30mLife terminal evidence passed and independent reviews completed for their scope. Final document delta review ACCEPT; Ticket closed, QA evidence is committed/pushed as the final delivery bundle. Historical stage dispositions below remain as originally observed, including earlier420/423/B failures; all per-artifact source fingerprints are retained. Human DEFERRED.

| ID | Severity / class | Original evidence | Current disposition |
| --- | --- | --- | --- |
| QA5-A1 | P3 report facts | first baseline projection missingMCcounts(None), oldGrayMoon2% copy | correctedactual100000/4320/8640 and3% /601 observed; historyversionspreserved, no src change |
| QA5-B1 | P2 regression/testfixture | b-full-check-20261007T022236Z fullraw335/340 FAIL fivecases; checkshortcircuited, buildnotrun | independentreviewconfirmed syntheticV1retainnewSmithing/tier +resetexpected2; fixed true historical-shape fixtures and version expectations; retry01 341/341 + typecheck/build PASS; original failure retained; real V1/V2 targeted migration tests pass |
| CORE5-B2 | P2 schema overconstraint, forwardcompatibility | validCraftProvenance requiredcreatedBy==ownerId | Rootrequiresindependentknowncreator/owner semantics; noactualcurrenttransferrepro, existingSuccessionleavesrewardownership; fixed independent known creator/owner validation with focused round-trip test; independent B review ACCEPT |

TDD expectedmissing-feature REDs preservedb-red-v2-migration.txt/b-red-v2-forged.txt/b-red-generation-context.txt; notproductionbugs. Intermediateprojection/assertioncorrectionsinb-validation-correction-notes.txt remain. No human/fun/productPASS; HumanDEFERRED. Productpacing/recipeaccess/findingsseparatefrombugledger.

## CORE5-B3 — P2 mutually exclusive origin metadata
Independent review confirmed crafted Legendary saves could retain a non-null legacy bossSource, although the generator rejects that origin combination. Minimal failing test preserved in b-red-craft-legacy-boss-source.txt. Validator now rejects this combination only for crafted items; normal crafted Legendary and existing noncrafted wolfKing Legendary still round-trip. Targeted save83/rewardSave33/generation26 + typecheck PASS; independent B review ACCEPT and final B full-check retry02 342/342, typecheck/build PASS. This is serialization consistency, not protection against local file edits.

## QA5-C1 — P2 harness cleanup masked inner failure
First normal Chromium pilot: browser-runs/c-normal-20261007T033633Z-pid61803/. Exact current production build PASS, 79 recursive source files stable. Normal fresh acquisition (wood3/stone2, gold45→9), craft4gold/10stamina/45minutes/10SmithingXP and existing inspect/equip reached; save/reload unverified. Outer finally closed browser after sync_playwright had stopped, raising Event loop is closed and preventing final result/sourceAfter publication, masking the original inner exception. Low preserved raw action/server/diagnosis and independent post-run source evidence. Original inner cause cannot be claimed recovered. Classified QA harness defect, not established product bug. Medium owns minimal reproduction/error-preserving cleanup fix; retry requires new unique evidence and actual save/reload. C gate remains pending.

## QA5-C2 — P2 fresh-context timing guard / QA5-C3 — P2 cleanup API
retry01 browser-runs/c-normal-20261007T034143Z-pid62222/ preserved FAILED_RUNNER_FRESH_CONTEXT_GUARD. Isolated browser legitimately initialized and saved the normal opening state before navigation completed. Runner incorrectly checked storage remained empty after application start. Captured baseline proves openingSeen=false, worldTime480, eventSequence1, gold45, stamina84, wood/stone0, no instances. Check empty storage before application executes; keep normal automatic save. No established product failure.

The first cleanup repair also used unsupported PlaywrightContextManager.stop, now captured as AttributeError instead of masking the primary exception. Medium's initial repair was insufficient; user routing escalated narrow lifecycle/guard reliability to independent Luna Max QA fixer. Require actual Playwright lifecycle verification, not only mocked callback coverage. Specific favicon404 from default owned QAserver is a separate server artifact; supply204 for that path only, preserving all other error monitoring. Exact source79, dist and original successful build remained stable; no source/build rerun needed until actual drift. C save/reload and final browser gate remain pending.

## QA5-C4 — P2 self-introduced route truncation
Max QA fixer's authorized single full pilot browser-runs/c-normal-20261007T035615Z-pid63323/ preserved FAIL before store: path reconstruction returned inside its loop, omitting the start and truncating legal movement. This was introduced during the harness helper insertion, not a game navigation bug. One-line indentation correction plus deterministic start/full-adjacency/end contract and real Chromium visible movement smoke passed. Final focused suite3/3 also verifies before-app empty storage, legitimate initialized opening save, specific favicon204 and returned Playwright.stop. Final harness2d4de2a11c7360d60214f587f771f9eec34afe1d275def8c2821427598c64b08; current source79 fingerprint16b862ee6acd1090010cdedc17fbd22a658ad11fc87a1258fbcaaea5655ea287 unchanged. Low complete retry02 authorized; C still pending that actual result. Original masked post-equip exception remains unknown.

## QA5-C5 — P2 normal-route missing modal close
Low retry02 browser-runs/c-normal-20261007T040128Z-pid64116/ preserved FAIL (7.31s). Complete legal fresh acquisition/craft/inspect/equip succeeded: item-1 equipped, gold5, stamina74, SmithingXP10, worldTime565, eventSequence8. Explicit underlying save button was visible/enabled but active dialog.pixel-window correctly intercepted pointer events. Runner omitted canonical close before saving. Zero page/console/storage/rejection/cleanup errors, all source79/build/assets stable. Classified QA route defect, not native modal product defect. Medium UI owner now fixes only legal close/wait/reacquire/save flow and focused real-browser verification; no force-click or state injection. Original first masked post-equip exception still cannot be retrospectively identified. C remains pending complete actual save/reload.

## QA5-C6 — P3 stale Inventory accessible-name locator / QA5-C7 — P3 runner attribution
Medium modal-close fix passed and run c-normal-20261007T040350Z-pid64726 completed native save/reload invariants, then failed postreload exact Inventory opener because visible accessible name is 物品 I (not物品). Corrected only known locator; final c-normal-20261007T040512Z-pid65042 complete PASS with source/assets stable and zero runtime errors. All previous whole failures remain. Final generic raw template labels executing effort low although actual executor was requested Luna Medium UI engineer; c-browser-pilot.md supplies explicit attribution correction without modifying original raw PASS. This is metadata, not falsification of game/browser runtime results. Future harnesses must bind actual execution configuration.

## UX5-D1 — P3 noninteractive recipe button / QA5-D2 — P3 concurrent freeze metadata
Strict premium audit found single recipe button had no action. UI changed it to a semantic label; final strict audit0findings,projection4/4,type/build81modules PASS. Core Dfreeze timestamp04:11:34 predates this markup-only change; currentPlaceWindow d4f96333.. differs from firstcapture. Explicitfreezeaddendum preserves firstsnapshot andbinds finalUI source; no fakeoldbuild/reviewclaim. D57core/projectiontests/type remainactualevidence forunchangedengine/projection. LaterH/J browsercurrent-source required; noD BrowserPASS claimed.

## Independent final QA harness findings (product source unchanged)
- QA5-J1 / P2: Life timed_note referenced uninitialized last_recipe_choice, first10minnote would raiseAttributeError. Exactprefilehash andrawrepro preserved browser-driver-life-note-red.json; authorinitialized/assignedfield, first+secondnote tests GREEN andindependentrecheck.
- QA5-J2 / P2: Hybrid successfulreturn leftIN_PROGRESS, launcherwouldexitnonzero. Successfulterminalstatusfixed whileexplicitBLOCKEDretained, independentfocusedtestsPASS.
- QA5-J3 / P2: requiredSmithing regex missed rendered「鍛造熟練度需求」, lockedrecipe goal scoring ineffective. Parser/scoringfixed withfocusedregression andindependentGREEN.
- QA5-J4 / P2: post-equipcombat couldreachdeadline stillactive thencontinueasnormalreturn/PASS. Authoraddingobjectivecompletionguard+repro; HreleasehelduntilGREEN.
- Reviewcorrection: initialsecond-note priorstateshape suspicionwithdrawn; actualcodealready retainedrawstate, notstate_summary. No productionbug orfixclaimedforthatmisread. Reviewreportwillrecordcorrectionandfinalhashes.

QA5-J4 correctionverified: terminalguard requires resolvedcombat and post-startcombat.won; unfinished/noevent/win regressioncases and independentfocusedtestsPASS. Threebrowser scripts frozen; Rootreleased Honly underfresh420regression/build fingerprints. Jlongruns notyetreleased.

## QA5-J5 — P2 Chromium CDP startup compatibility
H originalbrowser-runs/hybrid-short-20261007T050755Z-pid73650 failed1.07s beforeanyUIoperation (operations0/reloads0). ActualChromium151 rejected Memory.enable command; validrelease/source/build/fresh-saveguards passed. Originalraw/result/launcherstatus retained; no H gameplayPASS. Mediumauthorrepairingmonitoringcompatibility withrealCDPsmoke and independentretargetreview; production source unchanged. Hretryrequiresnewharnessreleasefingerprints.

## CORE5-J6 — P2 event sequence budget
IndependentMax validV3save reproduction: sequence MAX_SAFE_INTEGER-5, four cropsaturing, characterXP29/SmithXP19. Same-daycraftreserve4 but7events emitted, unsafe9007199254740992+duplicateIDs, subsequentsaveinvalid. Rootrequiresminimalfailingtest then reliablepreflightbudget andatomicreject, notmerely4→7. Original420regression doesnotcoverthisedge; newsourcecheckrequiredafterfix.

## CORE5-J7 — P3 version-aware identity migration
IndependentMax version2validLife accepts new masterpieceCrafter identity via currentallowlist; migratedfirstMP suppressed+3. Rootrequiresoldversionallowlistcorrected andactualhistoricalV1/V2regression preserved. No worldsrecreated/olditemsrerolled. AuthorMaxfixing, independentretargetpending.

QA5-J5 CDPfix independentlyverified about:blank/metrics andfocusedtests; Hgameplayretrystillunrun. Hauthorizationrevoked whilecoreJ6/J7sourcechanges pendingfreshbuild.

## QA5-J8 — H material gathering route blocked, diagnosis pending
Original H retry hybrid-short-20261007T052830Z-pid76332 BLOCKED_HYBRID_INPUT_GATHER3.08s/25UIactions, zero runtime/storageerrors/source stable. ActualGraywolfwin Fang+1/Moon+1 and ordinarySpearloot (confound), selectedFangrecipe requireswood3stone2 butnoneowned; forestwoodactionVisiblefalse. No craft/equip/reload/returncombat occurred. AuthorMediumdiagnosing actualUI/location/locator before productbugclassification; rawunchanged.

CORE5-J6/J7 targeted143/type andfresh423fullregression/type/build PASS, independentcore retargetpending. Old420 and HCDPfailure retained.

## CORE5-J9 — P2 cross-day NPC ID reserve
Independentretarget confirmsJ6/J7 focused5casesGREEN, but validV3 nextNpcId MAX-1 plus day15immigration/ownedhome latecraft startslegal andincrements nextNpcIdtoMAX; postserialize/deserializeinvalid sinceallocatorvalidatorrequires<MAX. Seed7301, worldTime15*1440-30, population30capacity40, food/prosperityimmigrationready; actor8,10 home7,10. NewatomicpreflightallocationreservefixassignedCoreMax, samecraft/saveintegrityscope. Originalbefore/afterraw retainedbyreviewer; finalcoregatepending.

CORE5-J9 companion: authorisolated livingdirector.sequence MAX-1 crossingday increments beyondsafe/saveinvalid; secondRED retained. Latestcombinedpreflight budgets NPCalloc3/day andlivingsequence4/day alongsideeventbudget/itemIDguard. Target145/typePASS freeze f5c996f30, independentretarget andnewfullcheckpending.
QA5-J8 confirmedharness-only exact「伐木」 missed「🪵 伐木」; boundedregex knownwood/stone/iron actions plusvisible/enabledguard fixed. Realfreshgather smoke wood0→2 succeeded/errors0 butold-dist/buildSourceMatch=false explicitlyLIMITED (notHaccept). Independentreview support3/C3/driver7/pycompilePASS driver8a64c37. OriginalH3.08sblockedrununchanged.

## QA5-J10 — H mine interaction label mismatch / escalation
Originalhybrid-short-20261007T053640Z-pid77982 FAILED4.30s/45operations/6dialogs, zeroerrors/source64118ae0 stable. Wolfwinmaterialdelta andwood0→2→4 succeeded; mineexpected「礦區」 actual「⛰️ 灰石礦場 Enter 互動」; no craft/equip/reload/returnfight. Repeatednormal-routecontractdefects warrantMaxbrowsercontractfixer singlewriteowner andbatchauditfullnormalpath; Mediumauthorstopped. No prodgatherbugclaimed.
Coreindependentretargetclean: J6/J7/NPC/directoroverflow nowatomicrejection, V1/V2preservation4cases anditemIDguard verified; latestfull425/type/buildPASS. Corefinalrecordedreviewprojectionpending.

## QA5-J11 — H raw PASS lacks claimed material provenance
Normalrun hybrid-short-20261007T083533Z-pid81573 rawstatusPASS7.14s/71operations/2nativeReload/3checkpoints, zeroerrors/sourcef9f969c stable. WolfFangearned, wood/stonegathered, item2crafted/equipped/reloaded andsameGraywolfreturnvictory. But actualitem2craftProvenance.influenceMaterial=null despiteearlierFangselectionlog. RootdoesNOTacceptH; originalrawPASSretained withthisqualification, no Hacceptancefilecreated/noIauthorization. Maxinvestigatesselectionreset/preview/reopen vsproductpath andwillrequirefinalUIselection+actualprovenance+materialdebitguard. Characterlevel1→3/time/resources/lootconfounds preclude causalgearclaim.

QA5-J11 diagnosis: balancedrunnerpolicy intentionallypreserved onlyoneFang and chose neutral BEFOREcraft (notproductselectionreset). MaxfixedH-specificrequiredmaterial, exactlyonepressedrecipe/material andactualprovenance/materialledgerdebit guards; Lifegeneralpolicyunchanged. Helper22/22GREEN driver7adf619, independentdelta review/Hrealretry pending. No productionBugclaimed.

## QA5-J12 — P3 I preparation/config and fixture fidelity
PromisedpermanentIconfig wasmissing (previousauthoronlytemporarycollection); rootconfigexcludesreports runner. Mediumaddeddedicatedvitest.phase05-i.config.ts explicitmanifestpin/singleworker/exactentrypoint. Also replaced below-requiredSmithing profiles with30legalcells (starter1/3/6, fieldSpearArmor2/3/6, iron5/6), eachplanpreflightallowed; exact100k plannedgenerator-onlysamples3333/3334 percell, not100k actualtransactions. Inertcollection1file/1testSKIPPED only, noMCorcombatclaimed. Independentreviewpending; no Hacceptance orIrelease exists.

## QA5-J13 — Optional unbuilt tavern navigation (P3 harness)

Original Stress `stress-20261007T090400Z-pid84623`: FAILED at 3.59 seconds, 27 UI operations; no single built tavern. Long duration not satisfied. Runtime/browser error arrays empty. Reproduction retained in unique run folder; Medium runner correction pending.

## QA5-J14 — Pause button behind open modal (P3 harness)

Original Life `life-20261007T090400Z-pid84624`: FAILED at 16.49 seconds, 108 operations; visible modal intercepted underlying pause click. Long duration not satisfied. Runtime/browser error arrays empty. Raw timeout, failure save and operation log retained; Medium runner correction pending.

### QA5-J13/J14 correction accepted for retry

Medium runner correction independently accepted: 19 driver + 3 support tests and syntax check PASS. Required navigation and 1200/1800-second minima unchanged. Exact historical driver body was not archived; therefore focused tests have no reproduced pre-fix RED run. Original actual Browser FAIL evidence remains intact; this evidence gap is explicit, not replaced with invented history. Current released helper bodies are now archived for future reproductions. Full-duration runtime still outstanding.

## QA5-J15 — Rest operation matches recent-event button (P3 harness)

Stress `stress-20261007T091332Z-pid999`: FAILED 36.02s / 349 operations / 4 reloads / 4 checkpoints. Life `life-20261007T091332Z-pid997`: FAILED 39.88s / 388 operations / 5 reloads / 5 checkpoints. Global `^休息` matched both recent-event text and real rest action, causing strict-mode error. Empty runtime/network/storage error arrays, source stable, original failure saves/traces preserved. This is a runner selection issue, not evidence of a product error. After one ordinary Medium correction, task escalated to Max for consistent operative-selector contract review. Complete long durations remain unmet.

## QA5-J16 — Ownership checkpoint reads obsolete schema (P3 telemetry)

`state_summary` reads root/settlement ownership, while actual assets are `state.life.properties`. Consequently raw `ownership:null` does not prove absence of ownership. This does not alter gameplay or invalidate UI/profile execution. Preserve frozen current long-run driver; correct observability after terminal evidence is captured, with a targeted regression and separate exact-helper correlation. Full raw Life `lastLifeNoteState` may provide authentic point-in-time property data at terminal. Current policy contains no acquisition routine, so no purchase observation is not a product failure.

## QA5-J17 — Dynamic nearby-interaction list retains positional index (P3 harness)

Canonical Stress `stress-20261007T093801Z-pid3466` FAILED after 1165.81s / 8930 actual UI operations / 118 reloads / 120 checkpoints. `Locator.inner_text` waited for interaction-list button nth(10), which ceased to exist after list updates. Read-only diagnosis locates it in nearby() after opening nearby interactions, rather than the shop loop. Source stable. Preserve result and traceback; read-only diagnosis pending until independent Life terminates, so no frozen driver edits yet. Watcher CP time 1089.52s and all log record count12568 are not formal elapsed/UI totals.

## QA5-J18 — Watcher labels proxy counters as totals (P3 evidence)

Active watcher uses latest checkpoint elapsed and counts all operations.jsonl records. Those are checkpoint age/raw log counts, not total duration or actual UI operation count. Canonical terminal result.durationSeconds and result.operations supersede them. Original monitoring JSONL preserved; corrected projections must distinguish these measures, not rewrite old raw records. Gameplay and original test results unaffected.

## QA5-J19 — Life execution interrupted without terminal artifact (infrastructure, severity pending)

Life `life-20261007T093801Z-pid3464` has no terminal result. Launcher and Chromium processes are zombies; last raw operation at 09:59:17.195659Z, recorded elapsed1273.75s; last checkpoint1271.64s. No later valid activity or exact exit reason is known. Do not report thirty minutes or PASS from wall-clock waiting/stale RUNNING marker. Preserve stdout/stderr/raw/checkpoints; investigate process durability/host resource evidence before retry.

### QA5-J16/J17 verified corrections

Driver SHA5c20b23c7f1bf93ae4dbc55f5bfe902a31ee2022785d8ddf8a6dce7845f31b0c independently accepted. Actual RED reproduced with source-82 snapshots: stale nearby row, disappearing target fail-closed, and obsolete ownership aliases. Current 29 driver/support tests PASS and bounded real-UI smoke PASS; original full-duration failure/interruption remain unchanged.

## QA5-J20 — Supervisor trusted PASS without full terminal evidence (P3 QA acceptance)

Independent review BLOCK of original supervisor65bc16e7471cead42f97c965a1791287786ea811db08925332e7cf981393d8cd preserved. Eight deficient fake artifacts had been accepted before targeted fix (identity/duration/source pins). Corrected supervisor7c603a12380a4e0829983effb092c4f13ae933871117aeecd69dbbec620c6657 independently ACCEPTED with12 behavior tests, including actual supervisor monotonic elapsed, canonical identity/path and full frozen source/build/helper evidence. Fake tests are not real runtime minutes. Fresh detached runs authorized; no completed long result yet.

### Short nearby smoke setup failures retained

`nearby-selector-smoke-20261007T102046Z-pid6207` failed because bundled Playwright headless shell was missing; installed system Chromium151 was available. Subsequent probe attempted nearby before normal opening action; failed and retained. Corrected short probe `nearby-selector-smoke-20261007T102349Z-pid6557` PASS_SHORT_UI_SMOKE 1.611s/3 visible actions after normal 起身. These are probe setup failures, not product bugs or long soak evidence.

## QA5-J21 — 終端摘要將 planner 目標誤作當下可見狀態（P3 QA evidence，已修正）

Reproduction：Life 30m canonical note 的 longGoal 提及 ironShortSword／shortages None，但 information.visibleRecipe 實際 selectedRecipe=starterSpear、disabledReason=金幣不足，gold=1。初版 pair summary 混用兩者；不是遊戲狀態 Bug。Low 已以 write_recorded 修正摘要，原 b0f6f389… body 仍在 playlog 保存，canonical result 未改動。最後投影 5042500e… 分開 planner intent、visible UI 與實際資源，不能據 longGoal 宣告已使用進階工作台或沒有阻礙。

補充限制：Life note newInstances recipeId=None 是摘要讀取頂層欄位造成的缺項；真實 craft record item.craftProvenance.recipeId 以及 reward.instances 的 metadata 有保存。終端報告須使用真實 instance provenance；不改寫原始 notes，也不把投影 null 認定為存檔缺 metadata。

## 最終 runtime disposition

新的 reviewed detached Stress/Life 均 COMPLETE_PASS；j-runtime-acceptance.json 接受 1202.14s／1803.22s 的正常 browser runtime。先前五個 FAILED、Life INTERRUPTED_NO_RESULT、setup smoke 失敗、原 helper RED gap／false PASS 均維持原始歷史狀態。無未解 P0／P1 product defect；P2 core fixes 與 P3 harness fixes 以各自定向 regression／獨立 review 驗證。產品感受／重複操作／policy 覆蓋限制另見 life-reward-findings.md。
