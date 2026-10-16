# V2.x Final Data Integrity & Defender Lifecycle Hardening

- Status: accepted — B1 VERIFIED_FIXED；S-02 OWNER DECISION REQUIRED（S2-A schema 授權與「永久失格」定義）
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-16 Owner 於 session 正式授權「Final Data Integrity & Defender Lifecycle Hardening」：B1 採方案 3（同時滿足資料保留與 pending 上限；不採用 `post-rc/b1-retention-proposal.patch`）；S-02 產品行為（永久失格→效果停止、釋放有效額度、補位可接受新裝備、不退還、不轉交、不重複獎勵、保留來源歷史；暫時受傷不永久釋放）。兩階段授權：設計滿足全部不變條件且不改資料契約、無新 Owner 決策時才實作；需 schema／migration／不可逆處置／新 UI 則停止回報。允許 Codex worker。Parent [Post-RC](20261016-v2x-post-rc-hardening.md)。
- Risk: L3（Data Integrity／Persistence）
- Updated: 2026-10-16
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不開始 V3／Phase11／Human Playtest；不修改 `~/.codex` 全域設定。

## Scope

- A：B1 legacy journal preservation（設計 → 符合條件才最小實作）。
- B：S-02 defender equipment lifecycle（先評估既有 schema 下是否可安全實現）。
- C：Targeted verification（B1／S-02 test matrix）。

## Out of Scope

Save／journal schema、ledger contract、migration、不可逆歷史處置、新 UI（需另行授權）；B2、S-03、G-05、S-01、Threat V0、Farming V4、Merchant NOT MODELED、Human Product DEFERRED、SEC-01..03。

## Acceptance

- [x] `final-hardening/b1-retention-design-review.md`、`s02-equipment-lifecycle-review.md`。
- [x] B1：RED → 最小修正 → GREEN → `npm.cmd run check` → browser O-01 → 獨立 Max review（若設計可行）。
- [x] S-02：既有 schema 可行性判定；test matrix 證據；需 schema 時停止並提出設計。
- [x] `targeted-regression.md`、`final-hardening-verdict.md`；risk register 對齊；commit／push 並遠端核對；停止等待 Owner。

## Evidence

- Baseline: HEAD = origin `037289d`，工作樹乾淨；`HEAD:src` `caaf37da…`（產品檔與 `b1a1ff20` 相同，另含 post-RC 兩個測試檔）。
- Baseline check @ `037289d`：50 files／721 tests PASS；dist `a018b478…`。
- Verification: B1（Codex `sol-medium-b1-transfer`）RED（第一份 checkpoint 已含 marker）→ GREEN 12 項；`npm.cmd run check` 50 files／738 tests PASS＋`vue-tsc`＋`vite build`；新 dist `977d9883…`（`sha256sum`）／`600255a7…`（runner）。Browser O-01 29/29（`final-hardening/runner/attempt-20261016T154532867Z-o01/`）；Phase10-E production smoke 與 RC 一致（`attempt-20261016T155213548Z-regression/`）。S-02 matrix（Codex `luna-medium-s02-matrix`）37 tests PASS，無產品變更。
- Review / Audit: `luna-max-final-review`（Codex GPT-6 Luna max，唯讀，未施工）**APPROVE**，無阻擋；4 files／81 tests、`vue-tsc` 通過。
- Commit / PR: 本 Ticket 更新所在 commit，push 至 `origin/v2x/reward-core` 並核對遠端；不 PR／merge／deploy。
- Reports: `final-hardening/b1-retention-design-review.md`、`s02-equipment-lifecycle-review.md`、`targeted-regression.md`、`final-hardening-verdict.md`。
