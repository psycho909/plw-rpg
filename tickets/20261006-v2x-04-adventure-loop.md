# V2.x Phase4 — Adventure Reward Loop

- Status: accepted
- Owner: 本專案使用者；沿用 README 2026-10-02 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-06 使用者提供 Phase4 規格並要求「閱讀完此規格後，直接進行下一輪的開發」及「繼續開發」。
- Risk: L2（可逆的 reward/combat 跨模組行為與存檔相容）。
- Updated: 2026-10-07
- Branch: v2x/reward-core
- Git / Remote authority: README standing authorization commit/push 此工作分支；無 main/PR/merge/deploy/force/destructive 授權。

## Goal
用真實遊戲及實戰證據驗證 Fight → Loot → Decision → Build → Harder Target，而非僅生成隨機裝備。

## Scope
Phase4-A baseline → B risk/reward → C affix/build utility → D boss reward → E UX → F balance → G QA/review，逐 slice 驗證。現有五狼、七詞綴、五稀有度優先；必要且有數據依據才微調 generation/combat。Loot anticipation、boss exclusive、same-window compare、最小 goal/collection feedback。

## Out of Scope
Phase5–10、craft/workshop/masterpiece、全新life/crisis、內容擴張、大區域、V3、server、offline rewards/gacha/FOMO、原生 Safari/手機實機；不重構 journal/IndexedDB/renderer。

## Acceptance
- [x] A: 最新 baseline 完整 regression 與 ≥100000 deterministic loot rolls、代表 build 的真 engine combat outcome。
- [x] B–D: rank reward 區分、boss exclusive identity、affix/trait/variant 真實互動；以 measured distribution 驗證決策用途，不硬設任意升級率。
- [x] E: 可讀 loot/rarity/traits、同窗 current/new 含詞綴差異、collection/next target，保留 World First retro 契約。
- [x] F: loot Monte Carlo、Legacy/Common/Rare/Epic/Boss 與 Raw/Crit/Bleed/Defense 戰鬥指標、economy/drought/dominance 分析。
- [x] G: full tests/typecheck/build/determinism/save/legacy/browser regression、20–30m 真 production browser stress、Adventure-focused Agent Exploratory Playtest、獨立 review。
- [x] 至少一条正常角色、未注入資源的 Adventure loop；三題 §61 各有證據與限制；Engine/Reward/Risk/Build/Adventure gates 分開。

## Constraints and Decisions
- 本輪正式規格：[V2X Phase4](../docs/specs/V2X-PHASE4-ADVENTURE-REWARD.md)；原文 SHA256: 9e5cced00eb8db215f27e88fc7494db6efc3d0c69d918039d897aa28666f0a25。
- Human Gate: DEFERRED / NOT APPLICABLE AT THIS STAGE，不阻擋工程；Agent 不冒充真人，不宣告 retention/product readiness。
- 遵守 docs/agents/agent-routing.md：Low runners、Medium一般工程/分析/UI、Max僅core/Save/Determinism或deep review；single owner互斥write scopes。
- 原始 baseline/failed attempts 保留；authored QA 使用 scripts.recorded_reports.write_recorded append，再投影current。
- 不改既有 instance rolledStats/affix values；不得用更改全體舊 save 的 gear formula 取代新 generation balance。
- 依專案適配採 implement/to-tickets/tdd/frontend-design + frontend-design-premium/code-review；已授權規格不另加 granularity approval。正式 phase 下工作單位在本票維護，無平行 tracker。
- Stress 20–30m；只有 §41 的新證據觸發延長，舊 C01–03不自動大重構。探索遊玩建議30–60m，記實際持續時間、動機與 decision，機械 stress 不代稱探索。

### Measured Phase4 decisions (A → B → C → D → E)

- B: gray rates/level unchanged; scarred C/U/R/E/L45/35/16/3.6/.4, elite20/45/28/6.5/.5(level5), mini0/35/50/14/1(level7). Source-specific pools affect new awards only; rank gold and drop certainty retained. Boss85/14/1, level7 retained because paired baseline did not justify global boss buffs.
- C: retain seven affix values and legacy generation definitions; controlled equal-affix baseline then armor-phase penetration×2 interaction, only explicit family hard-skin context. Other fights use existing formula. Preserve crit/block variance and defense choices; no extra affix system.
- D: one boss-only moonFangSpear (月牙獵矛), attack5/defense0/sell20, intrinsic penetration2, keen/piercing/bleeding eligibility, MoonStone material; actual WolfKing loot exclusively this base. Old five bases remain normal pools. Optional base stat defaults0; old instance snapshots/formula stay identical. Legendary special chance remains existing rule.
- E: pure same-slot comparison with current/new rarity+affix+special+delta, mechanic descriptions and data-driven reward expectations/goals; canonical windows/tokens preserved.
- New baseline evidence: frozen100000awards/8seeds/3168 paired combat rows, each uninterrupted+reload =6336actualfights. First concurrent-edit attempt INVALID retained; no source changes during accepted baseline. Profile rarity screens are not ECV; real paired outcome categories in combat report.

## Dependencies and Blockers
Blocked by: tickets/20261006-v2x-03-monster-slice.md (accepted)。Baseline HEAD d3c689985e7e4553a85148ba2a5ea3be7685cb1f，src application4780c0a不變。無外部 blocker。

## Evidence
- Verification: reports/v2/20261006-reward-core/phase-04/（本輪獨立，source fingerprints與run UTC，顯示Asia/Taipei）。
- Review / Audit: B/C/D/E 核心獨立審查及 runner runtime deep review 已完成；最終長測輸出與分開 Gate 經獨立 Medium 審查接受；Human DEFERRED。
- Commit / PR: source 39621ec9b5833f24c4105d5bf705ff2b984da3a2；QA 文件與完整封存接續 commit/push 同工作分支，不建立 PR。

### Final runtime in progress

- Application freeze: ALL74 source fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`; base HEAD remains d3c6899 until runtime finishes.
- Final simulations: 100000 real loot awards; 4320 combat rows / 8640 uninterrupted+reload fights, eight seeds. Actual current-source Chromium regression:20 checks passed. Prior aggregate startup/port/report-path failures remain archived and are not aggregate PASS.
- Runtime driver final freeze: `8412261b32ce1b1cb02a509b820d50916f90b701b1e6ded5f29f90e3dbda6555`, independent Max delta accepted after decision-evidence guard. Fresh whole final run `final-qa-20261006T131724842089Z-c00e4d82`, starting2026-10-06T13:17:24.842Z (Asia/Taipei21:17), includes production stress1200s and separate Agent exploratory1800s. These durations are requirements, not completion claims.

### Separate runtime component evidence

- Original aggregate final-qa-20261006T131724842089Z-c00e4d82 remains FAILED due QA stress dialog-lifecycle timeout; do not reinterpret or overwrite it.
- Independently reviewed stress retry source/build identical:1200.691s,1499gear/modalcycles,7save/reloads,17043UIoperations,19checks, five wolf ranks including boss won; source/helpers/self/HEAD/storedproductionassets stable, runner/launcherexit0. `archive/stress-browser-retry01.json` and `runtime-results-independent-review.md/json`. Only console issue is favicon404; page/rejection/storage errors0. Memory/DOM/listeners fluctuate and fall from peaks; §41 extension not triggered.
- Original Agent1800.677s is complete but target-choice policy-confounded (gray vs scarred substring). Specific-name policy fixed only in new helper/runner; RED→2GREEN and independent review accepted. Corrected30m retry started2026-10-07T01:14:52Z (Asia/Taipei09:14), newoutput `archive/adventure-agent-playtest-retry01.json`; still in progress. No early30mPASS.
- Positive equipment sale is blocked in normal hamlet. Short controlled-village browser smoke is being prepared to distinguish feature coverage from normal progression; no product/world edits or claims of natural village progression.

### Final acceptance（前文 in-progress 為保留歷程）

2026-10-07：330tests／typecheck／build、100000loot／8640combat、20targetedbrowser；stress1200.691s／1499cycles／7reloads，correctedAgent1800.857s／30CP／1918decisions／20229operations，controlledsale8checks／1reload。Normalfresh無資源或時間注入，五狼及boss全部獲勝；所有source/helper/harness/HEAD／production HTTPbytes穩定、runner/launcherexit0。正常探索finalworldTime70887/Lv11/gold989；最後裝備item16/item14。

獨立Max core與Medium UI／runtime／finalresults接受；§61三題有systemic simulation/browser/agent evidence與human因果／retention限制。Engineering／Reward／Risk／Build／Adventure Gates PASS WITH FINDINGS；Human DEFERRED，不阻擋。原aggregate永久FAILED、原31.919sstressFAIL、舊Agentpolicyconfound與controlledsale第一輪FAIL全保留。歷史C01–03／產品pacing與風險天花板不偷偷修；不開始Phase5–10/V3。

測試全74source與sourcecommit39621ec逐檔GitblobSHA256吻合；完整source map／metadata／報告／raw及無損QA版本封存都隨同工作分支交付。詳见phase04/final-review.md、delivery-source.json、final-runtime-results-independent-review.md與evidence-archive/manifest。正式工程驗收完成。
