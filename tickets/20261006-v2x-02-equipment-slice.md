# V2.x Phase 2 — Procedural Equipment Vertical Slice

- Status: in_progress
- Owner: 本專案使用者；沿用 README 2026-10-02 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-06 使用者提供 V2.x 規格並明確要求「繼續下一階段的開發」；規格 §77 限首輪 Phase 0–3。
- Risk: L2（可逆的跨模組擴充與存檔相容）。
- Updated: 2026-10-06
- Branch: v2x/reward-core
- Git / Remote authority: standing authorization commit/push 此工作分支；不得 main/PR/merge/deploy、force push、reset 或清除既有資料。

## Goal
完成 kill → drop → inspect → equip → save → reload 閉環。

## Scope
3 weapon bases、2 armor bases、five rarity、少量 eligibility/tier affixes/material bias、single generateItem/loot API、引擎 actions/combat 與既有物品視窗；不實作完整 crafting 系統。

## Out of Scope
Phase 4–10、50 monsters/100 items、V3、server、native Safari/手機實機、Human feedback 代填、Journal/renderer 大重構。

## Acceptance
- [ ] 同 seed/actions item generation/loot deterministic；rarity/affix eligibility/tier/material bias 都有測試。
- [ ] 程序裝備實際影響戰鬥、保留既有固定裝備效果；不可 duplicate、裝備引用不存在 instance。
- [ ] 真 Browser 完成擊殺掉落、檢視比較、裝備、正常保存/重載；10–15 分鐘 targeted regression。
- [ ] 10,000 seeded loot rolls 與 bounded inventory rendering/stat summary；phase tests/build/review 通過。

## Constraints and Decisions
- 正式規格：[V2X-REWARD-RETENTION](../docs/specs/V2X-REWARD-RETENTION.md)。原 spec 全文保留，§77 限本輪；later-phase requirements 不算本輪已完成。
- root 統籌，施工/review GPT-6 Luna max；runner-driven 長測可由 GPT-6 Luna low 啟動，不 LLM 陪跑。
- 現有 V2 Engineering Freeze；所有 RNG 使用 engine/random.ts，Vue 只投影不決定規則。
- 採 matt-skills-curated:to-tickets / implement / tdd；依 docs/agents/skill-workflows.md 調整為 repository tickets 與現有 test seams，不發布外部 issue/PR、不建立 worktree。
- 單機紀錄以 scripts.recorded_reports.write_recorded 追加版本，原始 failures 永久保留。

## Dependencies and Blockers
Dependency satisfied: [20261006-v2x-01-data-model](20261006-v2x-01-data-model.md)

## Evidence
- Verification: 待執行；baseline ac144ef4759d14570bf686e6a0e6b2983075fa9b，實際 V2 app 441e3c2。
- Review / Audit: 每個 Phase gate 後更新，獨立 Luna max reviewer。
- Commit / PR: 待交付；無 PR 授權。
