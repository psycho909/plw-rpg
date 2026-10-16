# Phase10-D — Persistence & Long-world Stability

- Status: approved — waiting on dependency
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-16 Owner 正式規格 [V2X-PHASE10-FINAL-QA-RC](../docs/specs/V2X-PHASE10-FINAL-QA-RC.md) §0「正式啟動 Phase10」；Parent [Phase10](20261016-v2x-10-final-qa-rc.md)。
- Risk: L3（Save／Migration／Determinism）
- Updated: 2026-10-16
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不執行外部 Claude Opus 5.5 Code Review；不開始 V3。

## Goal

Save／Reload／Migration／invalid／unknown version／no silent overwrite／request／cooldown／NPC／history／succession；determinism replay；3 seeds × 10/50/100 年（核心 world engine 未變可重用 Phase8 證據＋精簡確認）。

## Scope

規格 §8；沿用既有存檔契約，不換格式；Max 負責。

## Out of Scope

規格 §0 不授權項目；新功能（Feature Freeze）；平衡數值。

## Acceptance

- [ ] `save-migration-determinism.md`、`long-world.md`。

## Constraints and Decisions

Feature Freeze：只有具體證據的缺陷才改產品 source（Feature Freeze → Risk-Based Verification → Minimal Fix → Regression → Final Review）。保留 Owner 決策（Phase8 V4 farming、D-F1 KEEP V0）；merchant stock/restock NOT MODELED 不得宣稱解決；不新增遊戲系統、Daily Quest／Login Reward／Battle Pass／FOMO／Offline Income；不換存檔格式。Normal fresh-save 與 controlled fixture 分開計算；不以 fixture 冒充正常遊玩。QA artifacts 有界、無損壓縮、manifest＋hash，清理 chrome-profile／可重建暫存，不重存數百 MB。Human Product = DEFERRED；External Code Review = NOT STARTED。

## Dependencies and Blockers

依 Phase10 A→F 順序；前一子階段局部驗收後開始（無資料相依者可並行，由 Orchestrator 決定）。

## Evidence

- Verification:
- Review / Audit:
- Commit / PR:
