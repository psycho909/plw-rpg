# Phase 10-B — Adventure, Life and Hybrid Route

## Normal fresh-save attempt A — COMPLETED — NORMAL PROGRESSION (optional influence-material path)

- Outcome: **COMPLETED — NORMAL PROGRESSION (optional influence-material path)**.
- Scenario: `createGame(20261016)`, fresh world seed `20261016`; world time starts at 480 minutes (08:00). No state overrides or injected resources were used.
- Goal: obtain an adventure-sourced material, use it as an optional recipe influence, equip the result, then return to an adventure encounter. This is weaker evidence than a recipe requiring an adventure-sourced input.
- Visible source and condition: at the forest route, the canonical wolf encounter projection showed `grayWolf`, `eligible=true`, with no block reason. Initial `wolfFang` count was 0.
- Route: walk from the starting settlement to the forest → start the eligible gray wolf using `encounterWolf` → resolve combat with ordinary `combatTurn` actions → obtain 1 guaranteed `wolfFang` at world time 519 → legally gather recipe wood in the forest and stone in the mine → walk to the configured store workstation → craft `starterSpear` using `wolfFang` as influence material → equip the created item → return to the forest and start another legal gray wolf encounter.
- Conditions observed: smithing level 1; store recipe/station was reachable; material was consumed by the craft (`wolfFang` 1 → 0); the later adventure produced another wolf drop. No XP formula or game rule was changed.
- Time: route completed at world time 1035, **555 in-game minutes / 0.39 game days** after start. Character remained alive. The bounded window was 30 game days; this attempt did not approach the limit.
- Evidence: final targeted run output begins `[phase10-b-normal] COMPLETED — NORMAL PROGRESSION (optional influence-material path)` in `b-runner/normal-attempt.log`; executable route is in `src/engine/phase10Integration.test.ts`.

This is an automated engine-action fresh-save attempt, not a human playtest and not a browser/UI usability result. The route used the canonical encounter eligibility projection and public action functions; no direct game-state edits occurred in the normal-attempt test.

## Normal fresh-save attempt B — COMPLETED — NORMAL PROGRESSION (required adventure-input path)

- Target: `slime_resin_guard_recipe`, whose registered recipe requires 3 `slime_resin` plus 2 wood, Smithing Lv.2, and the blacksmith during its open hours. The required material comes from the visible `slime_slick` encounter source in farmland; this is a required input, not an influence-only material.
- Bound: **2 game years (240 days) or 7,000 public action calls**, whichever comes first. Oakvale uses 120 days per game year (`lifeIntegration.test.ts`); fresh seed `20261017`; no state overrides or injected resources. The route completed at 69.12 days / world time `100015`, well inside the bound.
- Route: legally gathered wood and stone; crafted two `starterSpear` items for Smithing Lv.1→2; used the visible farmland `slime_slick` source (`eligible=true`) to obtain 3 `slime_resin`; gathered additional recipe wood after the starter crafts; then used legal 60-minute village rests while remaining alive for settlement growth. At world time `99405` (day 68.70), the first post-daily-tick observation showed growth `85.50`, stage `village`, and the blacksmith built. At world time `99900` (day 69.04), after legally waiting for station hours and walking to it, `planCraft` reported the target blacksmith station `available=true`; the recipe preview passed. The route crafted the required-input recipe at world time `99960`, consumed the 3 resin, equipped it, and started an eligible `grayWolf` adventure encounter at world time `100015`.
- Outcome: **COMPLETED — NORMAL PROGRESSION (required adventure-input path)**.
- Settlement trace: day 0.00 `hamlet`, growth 0.00, no blacksmith → day 30.03 `hamlet`, growth 34.57 → day 60.03 `hamlet`, growth 73.32 → day 68.70 `village`, growth 85.50, blacksmith built. The exact `planCraft` station availability time was world time `99900`, 69.04 days after start; craft preview also reported `ok=true` at that time.
- Alternative station check: the Home workbench does **not** bypass this recipe's blacksmith requirement. `planCraft` substitutes an owned nearby Home only for recipes whose registered station is `store`; the existing `crafting.test.ts` case “keeps advanced recipes at the blacksmith when the crafter owns a nearby home” verifies an advanced blacksmith recipe stays at the blacksmith. This matches the `docs/UI.md` crafting row: the UI shares the workstation interaction, while actual station/site are engine-plan facts.
- Phase8 long-world context: [`long-world.md`](../../20261014-balance-tuning/phase-08/long-world.md) reports 54/54 D1 long-world checkpoints valid at 10/50/100 years; the raw life-policy checkpoint [`checkpoints.json`](../../20261014-balance-tuning/phase-08/d-runner/attempt-20261015T012826267Z/checkpoints.json) records seed `40131` at day `3600` (10 years) in `town`, player alive, with save/reload and continuation parity. This supports long-run settlement continuity, but does not determine the early-stage timing measured in this normal attempt.
- Evidence: final `npx.cmd vitest run src/engine/phase10Integration.test.ts --silent=false` output is saved in `b-runner/required-attempt.log`; the earlier 30-day stop is preserved in `b-runner/required-attempt-30d.log`; executable route is in `src/engine/phase10Integration.test.ts`.
- Test: `attempts a required adventure-input recipe from a fresh save using public actions only` in `src/engine/phase10Integration.test.ts`.

## Controlled integration fixture — passed separately

- Seed: `62732`.
- Route: walk to forest → start canonical `grayWolf` encounter → one-hit combat fixture to isolate the handoff from combat balance → confirm guaranteed adventure material → provide recipe inputs and move the character to the configured store workstation → craft `starterSpear` with wolf-fang influence → assert craft provenance and material consumption → equip → serialize and deserialize → compare touched world time, RNG state, active character, inventory, reward materials, item instances, equipment, history and events → return to forest and start a second legal encounter.
- Fixture-only preparation: combat HP/character strength, recipe stock, gold, stamina, character location and workstation time were controlled to keep this integration test deterministic. Those values do not count as natural progression evidence.
- Result: save/reload equality for all compared touched state; equipped item identity and craft provenance persisted; the subsequent adventure action started successfully.
- Test: `preserves adventure-sourced material through craft, equip, save/reload, and another adventure action` in `src/engine/phase10Integration.test.ts`.

## Existing junction evidence

`contentFamilies.test.ts` independently verifies a real selected content-family loot table through loot → craft → equip → save/reload. `caveInsects.integration.test.ts` and `remainingFamilies.integration.test.ts` cover additional selected family recipes. `itemGeneration.test.ts` checks item reward provenance; `contentBosses.integration.test.ts` covers boss-only materials and cooldown/persistence. These controlled witnesses complement but do not replace the fresh-save attempt above.

## P10-F02 engineering observations

- `crafting.test.ts` verifies previewed/earned XP, zero-XP graduation at recipe caps, masterpiece eligibility and saved crafted item metadata.
- `contentFamilies.test.ts` verifies canonical source eligibility and actionable/blocking reasons without mutating state; crafting preview tests verify station, skill and resource blockers.
- `actions.test.ts`, `ownership.test.ts` and `rewardActions.test.ts` cover farm yield, gathering, supply/storage, item sale/use and transaction guards.
- No XP formula was changed. This run verifies engine rules and reachable actions; whether repetition feels like a chore remains a Human Product question. B did not independently perform the Phase 10-E visual check of how those reasons render in the UI.
