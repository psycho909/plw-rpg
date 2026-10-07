# Phase5 slice release decisions

## A accepted / B design

Baseline HEAD1a56cd3 source ALL74 matches Phase4 delivered bytes71d8cc68; fresh npmcheck330 tests/20files/typecheck/build exit0, source pre/poststable. Reuse measured Phase4 100000awards/4320pairedrows/8640fightsonlyaftersourceequality; no new economics simulation claimed. Baseline tables correctedGray moon3% and exact sellformula(base×rarity). Original incorrectNone-count/static2%copy versions preserved.

B design coreMax proposedcontract pending Root approval. Earlyordinarycraft mustuse existing ordinaryresources and existinghouse/store/blacksmith ratherthanforce lifeplayer combat or changegrowth thresholds. Scope: oneinitialrecipe model/save first, C workingitem pipeline/inspect/equip/save then release Dmaterial/Eskill/Fmasterpiece/Gminimalintegration. No sourceBimplementation beforebaselinepass (nowpassed). No newbuilding/productionautomation/craftgenerator duplication/legacynerf. HumanGate DEFERRED.

## B release — Root product / contract decisions

A accepted. Adopt core proposal: single generateItem craft context, existing Character.skills.smithing Lv1/0, version-aware V1/V2→saveVersion3 migration and Reward schema2. Product still V2.x Phase5 (save format version3 is not productV3). Preserveoldworld/RNG/time/characters/history/rolledStats/equipment; inputsavevalidatedbeforedefaults, migrationidempotent. No lifecycle/IDB/journal architecture change.

Basic workbench usesexistingstore08:00–18:00/proximity/alive/noCombat/noDungeon guards, no newbuilding/growthbuff. C initialrecipe: wooden-stone spear/outputexisting spear, inputswood3＋stone2, service4gold, 10stamina/45gameminutes, SmithingLv1; initialoutputLv2/noqualityfloor/olddefaultweights, optionalmonsterinfluence heldforD. New playerscanacquireallresourcesnoncombat. Advancedmetal/moonrequiresexistingblacksmith aftervillage, createslongerlifeGoal. E mayaddintermediatebasicbenchrecipe to avoidonlystarteruntilvillage.

BcraftProvenance includes recipeId/createdBy/createdAt/influenceMaterial and masterpiece:boolean defaultfalse fromoutset, to avoidsecondmigrationlaterF; optionalsmithingLevel snapshot onlyifvalidation/simplicity benefit. Masterpiecefunctionality/roll/history disableduntilF; no6thrarity. OldinstancesreceivecraftProvenance:null withoutrecalculatingstats orbossprovenance. Newcontextgeneratedmetadata fromknownrecipe/state, notfree caller-suppliedforgedidentity. RejectbeforeRNG/IDs/resource/time/events, capacity/safeinteger guards.

E two capabilities recipeunlock＋boundedqualityprobability/floor usingexistingrarity/affixstats, no rawstatmodifier. F eligiblehighskilladvancediron ORmoonrecipe seeded25% chance, supportsnoncombatLifegoalwithoutmandatoryboss; skill/material/recipecontrolsprobability, Masterpiecepropertyidentitynotuniversallybestgear. OnlyMasterpiece/Legendarycraftimportantpersistenthistory. Gcrafted-onlyboundedaffix/masterpiecepricefactor keepsalloldgearprices, measuredlowestlegitimatebuy/discount/ownershipcost bound; no stable riskfreebuycraftsellprinter. No newmaterialbuyservice/dailyquests/automation/fullbusiness.

B writeownerMax schema/model/save/generator/tests; no appUI edits yet. ReleaseC onlyafterB targetedmigration/generation tests＋typecheckpass androotcheck. D–G notimplementedbeforeCpublictransaction/normalflow seam.

## B review correction decision

Fullcheck335/340 failedfive existingtests: strictoldshape validator exposed syntheticV1 fixtures retainingnewsmithing/tier, plusold saveVersion2 expectation; realhistoricalV1/V2 migrationtests passed. Correct testfixtures toactualoldshape/versionexpectations; retainoriginalfullFAIL andrerunrelated/fullverificationafterfix, do notloosencorruptsavevalidation.

craftedcreatedBy isoriginalcrafter, ownerId currentholder, independentfacts. B validator torequire both IDs referencepersistedcharacters, notequalID; historical/dead crafter canremainknown. CurrentchooseSuccessor leavesrewardownerunchanged, so no existingtransferbugclaimed andno newtransferfeature/successionrewrite authorized. ProactiveBidentityschema test withknownnewowner andknownoldcreator is valid; unknowncreatorreject. IndependentMaxreview followsdelta.

## C agreed public seam (implementation still gated on final B verification)
CraftRequest contains recipeId only; optional influence arrives in D. Engine owns pure planCraft and atomic craft. Preview exposes input source and required/current counts, exact gold/stamina/minutes, current/required Smithing, station/access and discriminated allowed/denied result. Denial returns reasonCode plus Traditional Chinese message. Success returns ok:true, instanceId, recipeId, baseId; metadata derives internally. UI owns generic game.act callback-result bridge, invoked exactly once, preserving old string/boolean behavior and using explicit succeeded/message policy for typed results. Do not save or log failed unchanged transactions. Core owns engine/action contract; UI owns store bridge/components/projections.

## B ACCEPT / C released
Final fullretry02 342/342,typecheck/build79modules,75source stable; independent Max b-core-independent-review ACCEPT. Both provenance findings resolved with minimum targeted tests. Root released C only: Core planner/atomictransaction/actiondispatch and UI existingworkbench/Inventory/singlecallbackbridge. Next gate fresh legal Browser acquire→craft→inspect/equip→save/reload before D.

C basic successful practice plumbing authorized: 10 Smithing XP through existing gainExp/recordLifeAction only on success, safe integer and event reserve guards. This matches existing gather10XP/10stamina; E quality/recipe capability and low-tier graduation remain unreleased. One normal pilot craft should preserve XP10 through reload.

## C ACCEPT / D released
ActualnormalcompleteCpilot c-normal-20261007T040512Z-pid65042 PASS2.71s,79sourcefingerprint16b862ee.. stable,exactprodassets,one reload preservesworldtime/RNG/sequence/gold/stamina/10SmithingXP/instance/equip; reloaded detail verified, zero errors. Original harness failures retained; source unchangedthroughdebug. Root accepts Cnormalpipeline, notlongsoak/human. Released Dstarter optionalFang/Moon only, no newrecipes/qualityskill/MP yet.

## D ACCEPT / E design pending
Core/planner/generator/material cost/preflight/same-seed roundtrip andmatchedraritybiascontrol tests57/57/typecheck PASS. UIproject4/build81modules/strictpremiumaudit0 aftersingle-no-oprecipebutton removed. First DfreezePlaceWindowhash captured beforelastlabelchange; explicitcurrenthash addendum required, notpretendoldfreeze coveredit. Currentmodelneutral/Fang/Moon sourcegenunchangedrarity; Fang5/3 weights, Moonkeen5 andLegendaryweaponspecialconditional10→25%. NoDnormalBrowserclaimed; H/J currentfinalsourceUIworkflow willverifyselectedownedmaterial. RootacceptDsystemunit/control+UIchecks, releasesEdesignONLY beforeexactrecipe/skillquality/XPcap approval.

## E approved / released — four recipes, two capability effects
Starter remainswood3/stone2 fee4/sta10/min45/Lv2/Smith1/store, XPcap3. FieldSpear wood4/stone3 fee6/sta12/min60/outputSpearLv3/Smith2/store XPcap5. FieldArmor iron2/wood1 fee8/sta12/min60/outputchainArmorLv3/Smith2/store XPcap5, optionalwolfHide bias; ordinaryiron supportsnoncombat path and avoidsunexplainedwoodstone→兽皮衣 materialfantasy. IronShortSword iron3/wood1 fee18/sta16/min90/outputshortSwordLv6/Smith5/blacksmith XPcap6, laterF highSmith6 ordinaryiron candidate. Four meaningful recipes, countnotgate.

Two capabilities: recipeunlock + boundedcraft-onlyqualityfloor. BelowSmith3 existingdefault100-weight pool60/27/10/2.8/.2. Smith3+ basic/intermediatefloorUncommon shiftsCommonmass intoUncommon (0/87/10/2.8/.2); highskills cannotpushstarter/intermediatespastUncommonfloor. AdvancedironSmith5+floorRare shiftsCommon+Uncommonmass intoRare (0/0/97/2.8/.2). HigherEpic/Legendary probability unchanged; no rawstats modifier ordefaultloot/context-freeRNG change. This replaces proposed5/10-pointshift so capabilityclearlychangesresultswithoutguaranteeingEpic/Legendary.

Successfulpractice10XP existinggainExp onlybelowrecipegraduation cap; capskipsbothgeneralandSmithingXP whileactioncounterstillrecords. ExistingSmithingthresholdlevel×20 gives2craft→Lv2,6total→Lv3 atinitialconstant10XP. PlannerreadonlyXPaward/graduation/floor/weights makesnextgoallegible. Derivedinternalgenerationcontrols, no request-suppliedskill/quality/provenance. FMP/Gprice/ownership notyetreleased. UIcaninspectlockedfuture recipes butCraftdisabledbyengineplan; resetunsupportedmaterialwhenrecipechanges.

## E ACCEPT / F released
E final154/154 targeted tests and production build/typecheck81modules PASS, UIaudit0, recorded e-source-freeze. Original153/154 copy mismatch retained; no Ebrowser claim. Root accepts E.
F release: existingironShortSword Smithing>=6 with ordinaryironinputs sufficient, seeded25% masterpiece roll; optionalFang/Moon useexistingbias unchangedrarity/MPchance. Flag notnewrarity/statbuff. Snapshotoriginalcrafter/time beforeduration, retainimportantMP/Legendarycraft milestone even ifcrafterdiesduringcompletion; no successionrewrite. Existingboundedhistorymechanism and capacitypreflight beforemutation; ordinarycraftnotimportanthistory. Engine-derivedsuccessflag; existingInventory row/detail textual鍛造傑作 plusmaker/time/recipe. G notyetreleased.

## F ACCEPT / G design
Fcore154/154/typePASS sourcefreeze2a9c046a; UI13/13/type/build81/audit0/diffPASS reportae6ba58f. Faccepted systemchecks, BrowserpendingH/J. G pricing revisedformula affixPremium=min(floor(base*.15), affixcount+tierexcess); totalPremium=min(floor(base*.25),affixPremium+(MP?ceil(base*.15):0)), craftedonly oldpricesunchanged. Staticconservativebound remainsnegativeEV evenmaxpremiumand1goldownershipfee reduction; actualdistributionpendingI. Ghome/identity/reputationcoreproposalawaited beforeimplementationrelease.

## G pricing subtask released
AfterFaccepted, releaseMediumsingleowner rewardActions.ts/rewardActions.test.ts refinedcrafted-onlypremium above. Oldnoncraftedformulaexact, sameRareironShortSwordMPpremium+2gold. Bounded25%staticupperbound allfourrecipe negativeboughtinputEV even1golddiscount. No corehome/identitychanges releasedyet; coreproposalpending. No newbuyservices/loot/inputpricechanges.

## G core/UI released
Coreproposalaccepted: basic/intermediate store recipes auto-resolve ownedvalidhome proximity<=1 tositehome/0–24hours, fee=max(3,rawfee-1), otherwiseexistingstore. AdvancedironShortSword blacksmithonly. Publicplanactualsite/hours/cost authoritative; transactiondebitplan.cost, no newrequestsite/building/persistedstation/saveversion. Derivedsmith identity actions>=10+skill>=3 label鍛造師. FirstengineconfirmedMP adds permanent masterpieceCrafter identity label傑作匠師 and +3reputation exactlyonce beforeduration, guard survivesboundedmilestones/rephistoryeviction/sale/rep100. Existingidentity allowlistextended, no manualclass. CoreMaxowns crafting/identity/domain/data/savevalidation/tests; Mediumpricingowner separate. UIexistinghouseworkbenchpublicplan, existingidentitylabels andownershipbenefit explanation, no newpanel. Validateatomicpreflight/eventreserves/saverepeat/deathboundary; finalcombinedregressionlaterJ.

## G system ACCEPT / H pending fresh build and harness correction
G core180focused/typePASS freeze7dfe2d3c; pricing24/24; UI14/14/type/build81/audit0/diffPASS reportcbf78a44/freeze55ab211d. All79src UIcomputedfingerprintddc9946a captured; rootnormalbrowserpending. Gsystemaccepted pendingindependentreview/finalJ. Lowreleasedlatestfullnpmcheck (alltests/type/build) underfrozenproduction source; browser scripts currentlycorrecting independentreviewLifeQA first/secondnote bugs, originalfinding retained. Hbrowserrelease waits successfulfreshbuildandharnessfreeze.

## H accepted — 2026-10-07

Fresh normal-UI run `hybrid-short-20261007T085056Z-pid83657` passed with actual wolfFang debit 1, crafted item-2 provenance, equip, two native save/reloads, and resolved return combat. Source f9f969c9d3dfa3cbf1c379bec98eafab765b11cc; 6.26 seconds, 70 UI operations, 3 checkpoints, 326 game minutes. Root acceptance is `hybrid-acceptance.json`. This is short integration evidence, not soak or a causal gear-effect claim. Historical neutral-material false PASS remains unaccepted. I may now be released with a freshly computed manifest.

## I / J engineering ACCEPT — 2026-10-07

I100000 generated outputs/30profiles/0transactions、6624rows/13248fights，Source f9，全guards穩定，i-runtime-acceptance.json。J全425tests/type/build及core/generalreviews接受；detached Stress1202.14s/8899ops/103reload/108CP，Life1803.22s/13936ops/155reload/158CP，各 COMPLETE_PASS/sourceStable/zeroerrors，j-runtime-acceptance.json。§56未觸發；原fiveFAIL/Lifeinterrupted/falsePASS照舊保留。Life後段低金幣／publicbench重複屬觀察及policy限制，產品finding不暗改設計。七Gates見final-review；HumanDEFERRED，不開始下一Phase。最終文件delta獨立ACCEPT、Ticket結案；QA交付commit/push與遠端核對由Root完成並回報。
