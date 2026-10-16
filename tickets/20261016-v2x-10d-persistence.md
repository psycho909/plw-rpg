# Phase10-D — Persistence & Long-world Stability

- Status: accepted — PASS（2026-10-16）
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

- [x] `save-migration-determinism.md`、`long-world.md`。

## Constraints and Decisions

Feature Freeze：只有具體證據的缺陷才改產品 source（Feature Freeze → Risk-Based Verification → Minimal Fix → Regression → Final Review）。保留 Owner 決策（Phase8 V4 farming、D-F1 KEEP V0）；merchant stock/restock NOT MODELED 不得宣稱解決；不新增遊戲系統、Daily Quest／Login Reward／Battle Pass／FOMO／Offline Income；不換存檔格式。Normal fresh-save 與 controlled fixture 分開計算；不以 fixture 冒充正常遊玩。QA artifacts 有界、無損壓縮、manifest＋hash，清理 chrome-profile／可重建暫存，不重存數百 MB。Human Product = DEFERRED；External Code Review = NOT STARTED。

## Dependencies and Blockers

依 Phase10 A→F 順序；前一子階段局部驗收後開始（無資料相依者可並行，由 Orchestrator 決定）。

## Evidence

- Routing（requested → observed）：施工 `g6-luna-max-core-engineer`（gpt-6-luna max；UI GPT-6-Luna max fast）；審查 `g6-luna-med-engineer-2`（gpt-6-luna medium；只建 C，未參與 D）。D 自行委託的 `d-runner/d-audit.md` 視為施工者自我檢查，不作為獨立審查。
- Save／Migration／Determinism：`phase-10/save-migration-determinism.md` 將 §8 各契約點對應既有測試（file:line）並補 `src/services/phase10Persistence.test.ts`（NPC-linked request／arc round trip 等）、`src/engine/phase10Determinism.test.ts`（同 seed＋同初始狀態＋同合法 Boss 行動重播 → 相同相關狀態；排除欄位附理由）。未改存檔格式。
- Long-world：`phase-10/long-world.md`；Phase8-D1 核心證據可重用（`5e223be..HEAD` engine／domain／data／services 只有 wolfFamily presentation refactor）；目前來源 No Intervention 3 seeds × 10／50／100 年確認 `d-runner/attempt-20261016T034911258Z/`：9/9 checkpoints、save/reload 9/9、continuation 9/9、orphan references 0、save payload 245,272–608,331 B（`scripts/phase10/d-long-world.mjs`）。100 年模擬 ≠ 真人 100 年遊玩。
- Verification：targeted vitest 10 files／238 tests；`npm.cmd run check` PASS 45 files／658 tests＋vue-tsc＋build（`a-check-run/npm-run-check-bcd-tests.log`）。
- Review / Audit：`phase-10/d-review/d-review.md` 無 P0–P3 findings。
- Commit / PR：本次 commit；無 PR。
