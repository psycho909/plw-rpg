# Oakvale V2.x Reward Core — Phase0–3 delivered scope

依正式規格§77完成第一個施工範圍；**Development / Engineering Gate: PASS WITH FINDINGS**。本頁為最新投影，歷史版本在playlog.jsonl。

- Branch: `v2x/reward-core`；Phase3 accepted app source `4780c0a22af20c0a3b5b5bf950453fed1b106f02` 已push並核對remote一致，74source與實際受測snapshot相同。Source與遠端交付見[最終報告](final-review.md)及[Phase3 correlation](phase-03/source-commit-correlation.json)。
- [baseline](baseline.md)、[architecture](architecture.md)、[UI plan](ui-plan.md)、[正式spec](../../../docs/specs/V2X-REWARD-RETENTION.md)。
- Phase0：baseline229tests＋typecheck/build＋20Chromiumchecks；原harness failure保留。
- Phase1：[verification](phase-01/verification.md)，sourcef89c2c2；typed registry／compatible migration，243tests／15files＋build＋20Chromiumchecks。
- Phase2：[acceptance](phase-02/acceptance.md)，source6568b46；real gear loot/equip/save loop，284tests／19files、602.915秒／205cycles／4reloads。
- Phase3：[regression](phase-03/regression.md)、[browser stress](phase-03/browser-stress.md)、[performance](phase-03/performance.md)、[long term](phase-03/long-term.md)、[bugs](phase-03/bugs.md)。314tests／20files＋typecheck/build78＋20Chromiumchecks＋5simulationtests；最新1200.610秒／41CP／1425cycles／7reloads真productionChromium PASS。三個report regression tests通過。
- 五狼族進展、實際traits／core cues、三boss variants與持久form；Phase1 R1 tagged combat crossguard已完成。source74個fingerprints一致，原始失敗與修正版本全留；初始未執行draft封存缺口仍明示。
- [分離Standards review](phase-03/standards-review.md)、[Spec review](phase-03/spec-review.md)、[independent compatibility/harness review](phase-03/independent-review.md)、[final evidence review](phase-03/final-evidence-review.md)、[metrics review](phase-03/metrics-fix-review.md)及root表格修正驗證。

## Findings and stage policy

PF rawstats／forest recovery與later材料用途見[reward findings](phase-03/reward-findings.md)。C01/C02/C03仍OPEN；不以短stress清除journal／retainer疑慮，也不將舊V2 soak冒充新source。新2小時soak未執行、不列通過；本first-slice依spec§57–62完成targeted/stress。原生Safari／手機實機排除。

Human play / Fun Gate / Retention Survey: **DEFERRED / NOT APPLICABLE AT THIS STAGE**，不阻擋工程QA。當前任務不宣告Human Product Testing ready；Agent不代填真人答案。Phase4–10、Crafting／Workshop／Masterpiece、完整content budget與V3未開發／驗收。

[Agent routing](../../../docs/agents/agent-routing.md)已按Owner最新政策同步：Low機械執行、Medium一般工程、Max高風險核心、Sol決策；固定role名稱，runner-driven長測與最少必要Context。原版／中間版保存於Phase3。
