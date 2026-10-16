# S-02 Defender Equipment Ledger（S2-A）

- Status: accepted — S-02 VERIFIED_FIXED（S2-A）；Owner final sign-off 2026-10-17；沒有待決事項
- Owner: 本專案使用者，沿用 README 已確認身份。
- Approver: 同 Owner。
- Approval evidence: 2026-10-17 Owner 於 session 正式授權實作 S2-A：有效／保留分配額 16、歷史 ledger 32；`CrisisEquipmentAllocation` 形狀不變；允許修改 save validation 長度上限；新版必須能讀舊存檔；Owner 接受超過 16 筆的新存檔可能無法由舊版讀取（不保證降版）。永久失格：死亡、被選為接班人、`NpcLife.career === 'retired'`；暫時：轉職離開 guard／mercenary、受傷。**Owner final sign-off（2026-10-17）**：訪客離開 `state.npcs` 後永久失去本場危機防衛資格並釋放保留額度；不退還、不轉交、不複製；效果停止；ledger、物品來源與聲望紀錄保留；不重新發獎；32／16／16 上限不變；受傷、轉職、加入隊伍仍保留額度；若新增訪客回歸或 NPC id 重用機制須重審。Owner 接受 S-02 VERIFIED_FIXED 與 ENGINEERING RC READY WITH FINDINGS。不授權改裝備數值、危機平衡、聲望公式。Parent [Final data integrity](20261016-v2x-final-data-integrity.md)。
- Risk: L3（Save validation／Data integrity）
- Updated: 2026-10-17
- Branch: v2x/reward-core
- Git / Remote authority: Root-only commit/push 至目前工作分支（explicit refspec）；worker 不 commit／push。不 PR／merge／main／deploy／force push；不開始 V3／Phase11／Human Playtest。

## Lead 契約（2026-10-17）

- **Historical ledger**：`crisis.contributions.equipment` 全部列，≤ 32（`REGIONAL_CRISIS_CONTRIBUTION_LIMITS` 新增歷史上限常數）。
- **Reserved**：防衛者仍在 `state.npcs`、`isAlive`、且 `life.npcs[id].career !== 'retired'` 的列，≤ 16（沿用 `equipmentAllocations: 16`）。其餘列為永久失格：
  - 死亡：當天 `isAlive=false`，每日結算時從 `npcs` 移除。
  - 接班：從 `npcs` 移到 `characters`（`chooseSuccessor`）。
  - 退休：career 只會單向變成 retired，不會改回。
  - **移除路徑已經完整列舉**（`simulation.ts:287` 訪客離開、`:313` 死亡清除、`:503` 接班）；NPC id 由 `nextNpcId++` 單調配發，被移除的 id 不會回到 `npcs`。死亡和訪客離開在每日結算移除後，狀態完全相同、無法區分；但兩者都**不可逆**，所以都視為永久失格。我們不會把它推定為「死亡」或「退休」，而是依程式證明它永遠不會再回到名單。Owner 已於 2026-10-17 確認為產品規則。
  - 暫時失格的列仍算保留：受傷、轉職、目前在玩家隊伍中。
- **Effective**：沿用 `deriveCivilDefense`，只計算 active slice 的列（≤ 8 人 × 2 = 16）。
- **交付**：歷史 ≥ 32、保留 ≥ 16，或 shortage = 0 時，用既有訊息「目前沒有可用的防衛裝備欄位。」拒絕。拒絕時物品、ledger、RNG、事件、獎勵都不變。
- **驗證**：`equipment.length ≤ 32`，載入時重新計算的保留數 ≤ 16；其餘每列的檢查（每個 `defenderNpcId:slot` 只能有一筆、`sourceItem` 唯一）保留。
- **Save version**：不升版。紀錄形狀不變，只放寬上限；舊存檔（≤ 16 列）照常讀取。依 `docs/specs/V2-LIFE-EMERGENCE.md:478`，只有新增 schema 欄位時才需要升版。
- **聲望**：繼續加總全部歷史列，不會重複跨過門檻。

## Acceptance

- [x] RED → 最小修正 → GREEN（Owner §5 的 14 項測試）。
- [x] `npm.cmd run check`；save 相容性（舊 ≤ 16 列可讀、17～32 列可讀、33 列拒絕、保留數 17 拒絕）。
- [x] 獨立 Luna Max review。
- [x] 報告、risk register、source／build fingerprint；commit／push 並遠端核對；停止等待 Owner。

## Evidence

- Baseline: HEAD = origin `c2cca17`，工作樹乾淨；`HEAD:src` `1a5e4e91…`。
- Verification: Codex `sol-medium-s02-ledger` RED（16/16 死亡補位 1 fail；17～32 列存檔 16 fail）→ GREEN 6 files／198 tests＋`vue-tsc`。Lead `npm.cmd run check` 50 files／770 tests PASS＋`vue-tsc`＋`vite build`；dist `da7f49e4…`（`sha256sum`），base `c2cca17` 為 `977d9883…`。Browser smoke 未執行（變更限 engine 交付規則與存檔驗證；既有 runner 無裝備交付操作），理由見報告 §6。
- Review / Audit: `luna-max-s02-review`（Codex GPT-6 Luna max，唯讀，未施工）**APPROVE**，無 P0／P1／阻斷 P2；「移出 npcs 即永久失格」判定合理，Owner 已於 2026-10-17 確認。
- Commit / PR: 本 Ticket 更新所在 commit，push 至 `origin/v2x/reward-core` 並核對遠端；不 PR／merge／deploy。
- Report: `reports/v2/20261016-final-qa-rc/s02-fix/s02-fix-report.md`。
