# V2.x Phase 3 — Wolf Family Controlled Variants

- Status: accepted
- Owner: 本專案使用者；沿用 README 2026-10-02 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-06 使用者提供 V2.x 規格並明確要求「繼續下一階段的開發」；規格 §77 限首輪 Phase 0–3。
- Risk: L2（可逆的跨模組擴充與存檔相容）。
- Updated: 2026-10-06
- Branch: v2x/reward-core
- Git / Remote authority: standing authorization commit/push 此工作分支；不得 main/PR/merge/deploy、force push、reset 或清除既有資料。

## Goal
完成狼族 normal/variant/elite/mini-boss/boss，可辨識且有真正不同機制。

## Scope
單一 wolf family 五個遭遇定義、兩個 trait、受世界/介入/RNG 影響的 boss variant，持久化遭遇狀態、family loot 與 lightweight discovery；既有 goblin crisis/boss/world core 保留。

## Out of Scope
Phase 4–10、50 monsters/100 items、V3、server、native Safari/手機實機、Human feedback 代填、Journal/renderer 大重構。

## Acceptance
- [x] normal 0–1、elite 1–2 traits、mini 固定核心加 traits、boss 固定 archetype + controlled variant。
- [x] trait/boss variant 實際影響 combat rhythm/outcome，不僅文字/HP 變化；world context formation 持久化/reload 不重抽。
- [x] family boss loot 有目的；normal/elite/mini/boss deterministic simulation 與 UI 顯示通過。
- [x] 完整 regression、20–30 分鐘 browser stress、100-cycle modal/gear checks、多 seed 10/50/100 年與獨立 review 通過。

## Constraints and Decisions
- 依使用者 2026-10-06 最新指示：開發、除錯與功能施工階段的真人遊玩／Fun Gate／Retention Survey 一律標記 `DEFERRED / NOT APPLICABLE AT THIS STAGE`，不阻擋 Development QA、Engineering QA 或 Release Candidate Engineering Gate。只有當前任務明確宣告穩定 Build 已準備好進入真人產品測試，才啟用真人產品驗證；Agent／Playwright 不能代填真人結果。
- 正式規格：[V2X-REWARD-RETENTION](../docs/specs/V2X-REWARD-RETENTION.md)。原 spec 全文保留，§77 限本輪；later-phase requirements 不算本輪已完成。
- 本輪前期施工/review 的已請求設定為 GPT-6 Luna max，長測為 GPT-6 Luna low；最新委派遵守 Owner [Agent Routing & Naming Rules](../docs/agents/agent-routing.md)，採最低足夠模型、固定角色名稱與 runner-driven QA，不 LLM 陪跑。
- 現有 V2 Engineering Freeze；所有 RNG 使用 engine/random.ts，Vue 只投影不決定規則。
- 採 matt-skills-curated:to-tickets / implement / tdd；依 docs/agents/skill-workflows.md 調整為 repository tickets 與現有 test seams，不發布外部 issue/PR、不建立 worktree。
- 單機紀錄以 scripts.recorded_reports.write_recorded 追加版本，原始 failures 永久保留。

### Frozen narrow implementation decisions（Phase2 dependency satisfied）

- 沿用 `combat.monsterId='wolf'`＋optional familyEncounter 作為新家族標記，未標記的legacy wolf／其他怪物／goblin boss／dungeon保留各自相容路徑。
- 純 `wolfEncounterOptions(state)`／`wolfCombatPresentation(state)` 提供資格、原因、名稱、traits、variant及下一回合提示；不得於render/read消耗RNG或形成boss。
- `encounterWolf(state,id)` 在合法forest／體力／monsterPopulation及collection進展資格成立後才形成遭遇；依灰狼→傷痕狼→精英→mini→boss提供可理解的追蹤目標。
- 共用 `resolveWolfCombatStats(snapshot)` 驅動形成與strict save guard；驗證derived stats／hp<=maxHp／active boss與根wolfBossForm的靜態一致性。不得以current world重新推導已保存fight。
- boss context.hunted使用現有人生combat勝利counter作為玩家介入proxy（不是狼族專屬計數），population/safety與seeded RNG影響形態；不增加schema counter或掃描unbounded journal。
- boss form首次合法挑戰形成一次，flee／死亡／reload後沿用；active turn/howl從combat保存。勝利才清除form及記defeatedAt；再次挑戰採data-driven7game-days cooldown，與goblin危機獨立。
- mini固定howl核心＋既有兩traits；boss固定moonCharge核心＋1–2traits及三controlled variants。角色role/trait/core須實際改變節奏，提示來自同一mechanics，不以增HP或改文字取代。
- Role 決策補充：role 描述戰鬥 archetype；fast/bruiser 以通用急襲／重擊實現，controller 以其 concrete core（howl／moonCharge）實現控制節奏。驗收要求可觀察的實際節奏，不要求再疊加額外 generic controller 數值 bonus；不得為 QA 新增未核准戰鬥設計。
- root負責既有PlaceWindow／AdventureWindow的最小UI投影；Luna max單一engine/validation/test owner。runner Luna low執行20–30分鐘最新build真Browser，不LLM陪跑，不使用舊snapshot充當修正版gate。

## Dependencies and Blockers
Dependency satisfied: [20261006-v2x-02-equipment-slice](20261006-v2x-02-equipment-slice.md)，source commit6568b46，已commit/push並核對remote一致。

## Evidence
- Verification: 最新 Phase3 source（base6568b466＋74檔fingerprints）已通過314tests/20files、typecheck/build78modules、20項production Chromium regression及5項simulation tests；見[regression](../reports/v2/20261006-reward-core/phase-03/regression.md)。真Chromium正常UI壓力測試1200.610秒／41CP／1425cycles／7reloads通過；另3個報表回歸測試通過。
- Review / Audit: strict UI audit0findings；獨立 Luna max application/harness review、分離 Standards/Spec review 與[visual review](../reports/v2/20261006-reward-core/phase-03/visual-review.md)；final runtime與metrics review通過，保留favicon404／既有C01–C03及排除檔案修改的optional-marker建議。
- Commit / PR: source與遠端交付依[最終報告](../reports/v2/20261006-reward-core/final-review.md)及source-commit-correlation.json核對；無 PR 授權。
