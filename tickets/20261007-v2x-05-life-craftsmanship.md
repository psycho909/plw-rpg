# V2.x Phase5 — Life Reward & Craftsmanship Vertical Slice

- Status: in_progress
- Owner: 本專案使用者，沿用 README 2026-10-02 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-07 使用者提供 Phase5 規格，要求「閱讀完Phase5的開發規格，就直接進入開發階段」。
- Risk: L2（核心生成／craft state／增量migration／資源交易）。
- Updated: 2026-10-07
- Branch: v2x/reward-core
- Git / Remote authority: README standing authorization commit/push 本工作分支；不建立PR，不merge/main/force/manualdeploy。

## Goal
建立 Gather/Acquire → Material → Craft → Useful Product → Skill/Mastery → Better Decisions → Identity/Ownership → NewLifeGoal，以及 Adventure → Life → Adventure 正常流程。

## Scope
嚴格A baseline → B data/model/migration → C 一件武器完整normalcraftflow → D 2–3素材bias → E skill capability/graduation → F 最小masterpiece → G economy/既有ownership最小接入 → H hybrid → I distributions/economy/combat → J regression/browser/長測/review。共用既有generateItem／instance／save／compare；6–12recipes為建議上限而非數量Gate。

## Out of Scope
Phase6–10、V3、crisis、monster/itemmasscontent、automation/offlinecraft、fullbusiness/employees/production/orders、farming/cooking/alchemy擴張、server、nativeSafari/mobile實機；不重構journal/IDB/renderer/succession。

## Acceptance
- [x] A：最新baseline經濟／素材收入、售價、sinks、skill/state與完整check有source證據，先baseline再調economy。
- [x] B：data-drivenrecipes/context/provenance；合法defaults、migrationidempotence、deterministic保存，不重建世界。
- [x] C：一件正常資源craft→instance→inspect/equip→save/reload；再release後續recipes。
- [x] D：fang/hide/moon等2–3material實際概率bias與control統計差異。
- [x] E：practice→skill→capability（2–3項可理解效果），低階XPgraduation不無限刷。
- [x] F：高skill＋合適material/recipe正常有機會masterpiece；crafter/time/recipeidentity、持久化、重要historyonly。
- [x] G：費用／素材sink；非無限無風險buycraftsell套利；最小ownership/identity/reputation接入。
- [ ] H：正常wolf/bossmaterial→targetedcraft→equip→returncombat；actualoutcome差異、death/succession保留item/history/ownership現行規則。
- [ ] I：100000crafts成本合理時執行、材料control、低中高skill、sell/economy、實際combatmatrix含Legacy/Adventure/Crafted/Boss/Masterpiece。
- [ ] J：全量tests/typecheck/build/save/migration/determinism/browser；20–30m integratedstress＋30–60m LifeAgent探索＋Hybridplaytest＋獨立coreMax與一般Mediumreview。
- [ ] 七engineering/systemgates分開，§76五題有實際證據；HumanGate DEFERRED不阻擋；sourcefreeze/deliverycommit精確correlation。

## Constraints and Decisions
- 正規規格 [Phase5](../docs/specs/V2X-PHASE5-LIFE-CRAFTSMANSHIP.md)，SHA256 `5deacafc9774361a9a6c8939a641e80fdc19b6eaf1432e96e3c7bf9faf4db6af`。
- 原Phase4 sourcecommit39621ec、QA HEAD1a56cd3；Gates PASSWITHFINDINGS，原wholeaggregateFAILED保持原樣。
- 單一generationauthority；不nerflegacy，不改既有saveinstance數值／原loot分布以掩蓋craft价值。
- Low機械exploration/runner、Medium一般工程/UI/分析、Maxcorecraft/save/determinism/deepreview；Root決策整合。單一writeowner，stage受依賴約束，不一次施工全部。
- 采用matt-skills-curated:implement/to-tickets專案適配，不新建平行tracker或granularity批准關卡；測試依工作單位，不每檔重跑全套。
- QA用scripts.recorded_reports.write_recorded，原failures完整保留；大量操作rawJSONL追加、checkpoint60s，避免每次動作投影完整累積trace。
- 短測新regression／明確惡化才處理C01–03；§56條件觸發才延長60/120m。

## Dependencies and Blockers
Blocked by: tickets/20261006-v2x-04-adventure-loop.md（accepted）。目前無外部blocker；A–G實作與定向驗證通過。最新425全量tests/type/build與獨立核心review ACCEPT，原始容量／migration及QA失敗保留。H正常Browser因互動名稱契約待Max統一修正；I與J長測尚未通過。

## Evidence
- Verification: reports/v2/20261007-life-craftsmanship/phase-05/
- Review / Audit: pending incremental independent reviews.
- Commit / PR: pending; commit/push現工作分支，不建立PR。
