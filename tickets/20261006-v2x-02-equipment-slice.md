# V2.x Phase 2 — Procedural Equipment Vertical Slice

- Status: accepted
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
- [x] 同 seed/actions item generation/loot deterministic；rarity/affix eligibility/tier/material bias 都有測試。
- [x] 程序裝備實際影響戰鬥、保留既有固定裝備效果；不可 duplicate、裝備引用不存在 instance。
- [x] 真 Browser 完成擊殺掉落、檢視比較、裝備、正常保存/重載；10–15 分鐘 targeted regression。
- [x] 10,000 seeded loot rolls 與 bounded inventory rendering/stat summary；phase tests/build/review 通過。

## Constraints and Decisions
- 正式規格：[V2X-REWARD-RETENTION](../docs/specs/V2X-REWARD-RETENTION.md)。原 spec 全文保留，§77 限本輪；later-phase requirements 不算本輪已完成。
- root 統籌，施工/review GPT-6 Luna max；runner-driven 長測可由 GPT-6 Luna low 啟動，不 LLM 陪跑。
- 現有 V2 Engineering Freeze；所有 RNG 使用 engine/random.ts，Vue 只投影不決定規則。
- 採 matt-skills-curated:to-tickets / implement / tdd；依 docs/agents/skill-workflows.md 調整為 repository tickets 與現有 test seams，不發布外部 issue/PR、不建立 worktree。
- 單機紀錄以 scripts.recorded_reports.write_recorded 追加版本，原始 failures 永久保留。

## Dependencies and Blockers
Dependency satisfied: [20261006-v2x-01-data-model](20261006-v2x-01-data-model.md)

## Evidence
- Verification: 最新284tests/19files、typecheck/build、20Chromium smoke、10k+10k loot及多seed100年通過；602.915秒正常Save targeted／205cycles／4reloads通過。精確source hashes與所有原failure見 [acceptance](../reports/v2/20261006-reward-core/phase-02/acceptance.md)。
- Review / Audit: 獨立Luna max fullreview原FAIL保留，fixed delta三項finding已關閉；P3canVisit cohesion與Product Findings非阻擋，R1仍待Phase3。
- Commit / PR: 本次verified commit/push此工作分支；source correlation另存QA artifact；無PR。

## Current Gate Findings

- Latest working-tree snapshot: 281 tests / 19 files、typecheck + build、20 Chromium V2 core checks、10k normal awards + 10k boss gear rolls、多 seed100年已通過；精確 source/harness hashes 與原始失敗見 `reports/v2/20261006-reward-core/phase-02`。
- P2 blocking: 新 wolf payout 仍額外添加 legacy generic material，需依規格 §23 改為 wolf family payout；既有 generic stack 不遷移、不刪除，非狼舊路徑保留在首輪單一家族範圍外。
- P3: 獵獲裝備成功穿戴／卸下缺乏當次事件，通知與 action journal 可能重播前次戰鬥文字；需最小 factual event 與 store integration regression。
- Armour wolf loot 的 material affinity 需沿已有 wolfHide registry 實際套用，與武器 wolfFang 區分；不增加 crafting、消耗流程或新素材。
- Targeted首次 disabled hunt locator failure永久保留；測試腳本改以正常UI休息取得真實資格，最新600秒run仍待完成。任何修正後皆重新驗證最新source，不把修正前Browser結果當作修正後gate。

以上原始findings保留；三項修正已完成，最新602.915秒run及全量gate通過。Human Gate維持PENDING；不宣稱完整V2.x產品完成。
