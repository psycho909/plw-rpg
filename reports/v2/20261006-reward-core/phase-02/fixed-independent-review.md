# Phase 2 Reward Core — Fixed-Source Independent Delta Review

Disposition: **The three implementation findings are closed in the reviewed source. The Phase 2 gate remains pending completion of the fresh 600-second targeted browser run.**

The original full review at reports/v2/20261006-reward-core/phase-02/full-independent-review.md and its JSON companion remain unchanged as the initial review record. This report is a separate follow-up against the same base commit, f89c2c292aaadb6c22bc0453188661f22e4f15b2. HEAD remains at that commit; the reviewed files are working-tree changes.

## Scope and disposition

This read-only follow-up reviewed the authorized wolf-payout guard, material selection, factual equip/unequip journal event, and the associated regressions. The stale combatStats test expectation was also checked against the fixed production behavior. No additional Phase 2 implementation defect was found in this delta.

**P2-01 — Generic material added on the new wolf reward path: CLOSED.** In src/engine/actions.ts:175-182, only a non-dungeon legacy wolf kill takes the family payout path, and that path skips the old generic increment. src/engine/actions.test.ts:165-182 confirms a pre-existing generic stack remains unchanged for a wolf while wolfFang is awarded, and a goblin still increments its generic stack. src/engine/combatStats.test.ts:84-126 further checks zero generic payout for an outdoor wolf, +1 for a goblin, and preservation of the dungeon wolf legacy path. Existing legacy inventory is not reconstructed or cleared. Non-wolf and dungeon generic payouts remain deferred outside this first family slice.

**P3-02 — Wolf-hide affinity absent from generated armor rewards: CLOSED.** src/engine/itemGeneration.ts:148-153 selects MoonStone for boss rewards, wolfHide for armor, and the guaranteed wolfFang for weapons. src/engine/itemGeneration.test.ts:99-105 retains the boss MoonStone assertion; lines 124-135 exercise both armor and weapon awards and verify the slot-specific material.

**P3-03 — Equip/unequip journal repeats a prior event: CLOSED.** src/engine/rewardActions.ts:33-40 now emits player.equipped with the actual 穿戴 or 卸下 action. src/stores/gameStore.test.ts:45-66 calls through game.act and verifies the saved journal message matches the new event in each direction and does not reuse prior combat text.

The standards-axis subreview found no new standards issue in these fixes. **STD-P3-01 remains a non-blocking P3 cohesion follow-up:** the general building-access predicate canVisit is still owned by rewardActions and used by general actions. No broad refactor is warranted for this delta. The acknowledged Phase 3 R1 remains pending and out of this Phase 2 finding set.

## Verification evidence

I did not run tests, build, or browser checks. My read-only git diff --check passed. The repository’s existing package manifest, lockfile, and dependencies were present; no environment configuration or repository source was changed by this review.

Root-recorded evidence for the current frozen source:

- Focused follow-up: 3 files / 75 tests passed; vue-tsc and git diff --check passed. Evidence: reports/v2/20261006-reward-core/phase-02/engine-worker-green-three-findings.txt.
- Full regression: the first fixed-source run recorded 283/284 tests because combatStats.test.ts:90 still expected the old generic wolf payout. The raw failure is preserved in fixed-full-stderr.txt: expected 1, received 0. The test was corrected to expect 0 and now also checks the non-wolf +1 and dungeon legacy +1 paths. A subsequent run against the current combatStats.test.ts hash passed 19 files / 284 tests; source and harness were stable. Evidence: fixed-full-final-status.json and fixed-full-final-stdout.txt.
- Build: npm run build passed vue-tsc and Vite (77 modules); source and harness were stable. Evidence: build-status.json and build-stdout.txt.
- Strict premium audit: passed with 0 findings. Evidence: premium-audit-final-status.json and premium-audit-final-stdout.txt.
- Fresh browser regression: 20 checks passed against the current source hashes; source and harness were stable. Evidence: fixed-browser-regression-status.json and fixed-browser-regression-stdout.txt.
- Seeded loot-world checks: 4/4 passed. That run predates the combatStats.test.ts-only expectation update; the production hashes match the reviewed production code, and the updated test is included in the later 284/284 full run. Evidence: fixed-loot-world-status.json and fixed-loot-world-stdout.txt.
- A separate fresh targeted browser run was still in progress when this report was written. Its current log showed the initial kill, drop, inspect/equip, material, save/reload, and responsive keyboard checks passing, but the 600-second run had not finished. No completion or gate approval is inferred from those partial checkpoints.

The reviewed-source hashes are in the JSON companion. This follow-up accepts the three code fixes; final Phase 2 gate disposition remains with the root reviewer after the pending targeted browser run completes.
