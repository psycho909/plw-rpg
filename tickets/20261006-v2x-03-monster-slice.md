# V2.x Phase 3 — Wolf Family Controlled Variants

- Status: approved
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
- [ ] normal 0–1、elite 1–2 traits、mini 固定核心加 traits、boss 固定 archetype + controlled variant。
- [ ] trait/boss variant 實際影響 combat rhythm/outcome，不僅文字/HP 變化；world context formation 持久化/reload 不重抽。
- [ ] family boss loot 有目的；normal/elite/mini/boss deterministic simulation 與 UI 顯示通過。
- [ ] 完整 regression、20–30 分鐘 browser stress、100-cycle modal/gear checks、多 seed 10/50/100 年與獨立 review 通過。

## Constraints and Decisions
- 正式規格：[V2X-REWARD-RETENTION](../docs/specs/V2X-REWARD-RETENTION.md)。原 spec 全文保留，§77 限本輪；later-phase requirements 不算本輪已完成。
- root 統籌，施工/review GPT-6 Luna max；runner-driven 長測可由 GPT-6 Luna low 啟動，不 LLM 陪跑。
- 現有 V2 Engineering Freeze；所有 RNG 使用 engine/random.ts，Vue 只投影不決定規則。
- 採 matt-skills-curated:to-tickets / implement / tdd；依 docs/agents/skill-workflows.md 調整為 repository tickets 與現有 test seams，不發布外部 issue/PR、不建立 worktree。
- 單機紀錄以 scripts.recorded_reports.write_recorded 追加版本，原始 failures 永久保留。

## Dependencies and Blockers
Blocked by: [20261006-v2x-02-equipment-slice](20261006-v2x-02-equipment-slice.md)

## Evidence
- Verification: 待執行；baseline ac144ef4759d14570bf686e6a0e6b2983075fa9b，實際 V2 app 441e3c2。
- Review / Audit: 每個 Phase gate 後更新，獨立 Luna max reviewer。
- Commit / PR: 待交付；無 PR 授權。
