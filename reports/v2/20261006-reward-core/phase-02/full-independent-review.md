# Phase 2 Reward Core — Independent Full Review

Disposition: **FAIL for the Phase 2 gate**. One P2 loot-contract defect blocks acceptance. Two P3 follow-ups remain for action feedback and material-affinity integration. The acknowledged Phase 3 family-stat/root-boss-form R1 is out of Phase 2 scope.

## Scope

Reviewed the working-tree Phase 2 integration against ticket 20261006-v2x-02 and the Phase 0–3 contract: rewards catalog, generation, reward actions, combat stats/actions, projection and tests, plus the already-reviewed inventory/character UI. HEAD and base are f89c2c292aaadb6c22bc0453188661f22e4f15b2. The staged diff is empty; reviewed changes are unstaged or new files. Unrelated report/harness changes are excluded. Tracked diff check passed. No source, test, harness, or Git metadata was changed; only this report and its archive were written. File hashes and verification references are in the JSON companion.

Reviewer context was independent of Phase 2 implementation. Orchestration explicitly requested gpt-6-luna/max; runtime model telemetry is unavailable and .codex/agents/luna_worker.toml is absent. Spec and standards axis subreviews also used explicit gpt-6-luna/max requests.

## Standards

Result: **PASS WITH FOLLOW-UP**. The reviewed engine import graph has no production cycle; generation uses the shared engine RNG; owner/catalog/slot checks, ID/material preflight, legacy slot fallback, correct store/blacksmith routing, and persisted reward validation are present.

**STD-P3-01 — Generic building-access predicate lives in the reward module.** rewardActions.ts:14–18 owns canVisit, which actions.ts re-exports and uses for existing rest/trade/hire operations. The Phase 2 architecture map at reports/v2/20261006-reward-core/architecture.md:13–18 assigns rewardActions to equipment and reward trading. This is a low-severity cohesion follow-up, not a runtime defect or gate blocker.

## Spec findings

**P2-01 — New wolf kills still receive the legacy generic material reward (blocking).** actions.ts:175–180 calls awardWolfLoot for a non-dungeon wolf, then unconditionally increments MONSTERS[monsterId].loot. config.ts:33–37 maps every current monster to the generic material stack. Thus a wolf kill grants family rewards and generic material +1. combatStats.test.ts:84–92 and actions.test.ts:165–175 assert that extra grant. This leaves the old pattern active in the new wolf path despite V2X-REWARD-RETENTION.md §23, lines 745–776, which says to remove “all monsters → monster material +1” as the primary loot mode. Guard the new wolf branch from the generic increment; preserve saved generic quantities and leave unported non-wolf families to their later slices.

**P3-02 — Generated armor never receives wolf-hide affinity in the award path.** itemGeneration.ts:143–148 passes table.guaranteed[0] (wolfFang) to every non-boss generated item, regardless of slot. Both armor bases can drop (rewards.ts:4–8,56), but wolfFang biases bleeding/penetration while armor permits sturdy/blocking/warding; wolfHide’s sturdy/blocking bias is never used for awarded armor despite its 25% material drop. generateItem itself supports a supplied material, so this is a live-loop follow-up, not a missing generator API. Use wolfHide for this wolf award’s armor and wolfFang for weapons (retain boss moonStone) and add a focused integration assertion; no crafting system is needed.

**P3-03 — Successful equip/unequip replays the previous event.** rewardActions.ts:26–37 changes the equipment ref but returns an empty success string without emitting an event. gameStore.ts:102–108 uses the last world event as the status/journal message for empty-string success. A gear toggle can therefore show and record a prior combat/loot message. Emit a truthful equip/unequip event or return the current action message, and test both toggle directions. This is UX/journal fidelity, not a persistence or combat blocker.

No wrong shop or creator was found: material sales use the store, gear sales use the blacksmith and reject equipped instances, and legendary provenance uses createdBy:null rather than naming the looter as creator. Phase 1 migration remains previously accepted. Phase 3 R1 is excluded.

## Verification evidence

I did not rerun tests/build/browser. Root-recorded evidence on matching frozen source hashes:

- Full regression: 19 files / 281 tests passed; production build passed vue-tsc and Vite (77 modules).
- Seeded simulation: 4/4 passed, including 10,000 normal-wolf awards, 10,000 boss gear rolls, and three 100-year seeds. Strict premium audit: 0 findings.
- Fresh browser regression: exit 0; root reports 20 checks.
- Targeted browser: finalized PASS in 602.5 seconds, 1,025 operations, with 100+ repeated gear/modal cycles. Kill/drop, inspect/equip, store trade, exact save/reload, and 390px keyboard/modal checks passed; source/harness stable, 0 page errors and 0 unhandled rejections. One console message was a missing favicon.ico 404. The earlier disabled-hunt locator timeout is preserved in targeted-original-failure.md.

The targeted, regression, build and simulation gates are complete. Overall Phase 2 remains **FAIL pending P2-01**.