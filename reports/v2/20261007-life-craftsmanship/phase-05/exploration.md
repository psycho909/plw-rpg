# Phase5-A source exploration

All references are relative to repository root `/workspace/plw-rpg`. Prices and behavior below are from current HEAD `1a56cd3eeb2ea65114a5dcf03c0e00504b69239f`; check and source SHA evidence is in `baseline.json`.

## Normal noncombat resource path

- `src/components/PlaceWindow.vue:69-75` renders forest/mining actions; it labels the operation as 10 stamina, materials plus 4 gold, with daily regeneration.
- `src/engine/actions.ts:51-60` implements `gather`: wood routes to forest/woodcutting; stone and iron route to mine/mining; amount is `2 + floor((skillLevel-1)/2)`; action uses the shared stamina/time cost helper; it decrements regional stock, adds inventory and 4 gold, grants 10 XP, records life action. At skill 1 the time expression gives 43 minutes (`max(15,45-2)`).
- `src/engine/simulation.ts:77-85` shows fresh state starts at hamlet, no blacksmith, and forest/mine stocks 100/80 with daily regeneration 10/8. `src/engine/simulation.ts:216` applies regeneration, capped at 100.
- `src/data/config.ts:27-31` defines ordinary item buy/sell values: wood 8/4; stone 6/3; iron 16/8; food 10/5; generic material and potion 20/10; sword 70/35; armor 55/27.
- `src/engine/actions.ts:72-91` gates buys/sells by store/blacksmith and stage; sells at listed fixed value, town buys receive 20% discount before `tradePriceMultiplier`; each transaction advances 5 minutes. `PlaceWindow.vue:92-97` displays products and prices.

## Adventure material path and sell value

- `src/data/rewards.ts:32-35` defines wolf fang/hide/moonstone values (5/5/25), affix bias, special bonus, and descriptions.
- `src/data/rewards.ts:69-80` defines hide chance 25%, wolf loot profiles and rare material rates (gray 2%, scarred 4%, alpha 8%, pack leader 15%, boss 0); boss guarantees moonstone through the loot table.
- `src/engine/itemGeneration.ts:51-62,180-200` builds guaranteed and chance materials, grants wolf loot and caps stack overflow. `src/engine/itemGeneration.ts:212-225` generates a material-bearing item and adds material stacks to owner state.
- `src/engine/rewardActions.ts:76-87` sells one typed monster material at `MATERIALS[id].sell` from the store. `src/engine/rewardActions.ts:43-45` defines procedural equipment sale as base value times rarity multiplier, floored. `src/engine/rewardActions.ts:58-73` sells unequipped owned gear at the blacksmith.
- `src/engine/rewardActions.ts:10-18` says trade access requires building exists, player alive, not in combat/dungeon, within one tile, and opening hours.

## Blacksmith availability and current function

- `src/engine/simulation.ts:83` starts a new world at hamlet with `house`, `farm`, `store`, `inn`; `src/engine/simulation.ts:180-183` adds `tavern` and `blacksmith` when growth reaches `CONFIG.stageGrowth.village` (85).
- `src/data/config.ts:19-25` places the blacksmith at `(12,8)` with hours 08:00–18:00.
- `src/components/PlaceWindow.vue:20-22,92-97` makes blacksmith product list only legacy sword/armor; UI offers buy/sell. There is no recipe selection or craft action.
- `src/engine/actions.ts:72-75` sends legacy sword/armor commerce to the blacksmith; `src/engine/rewardActions.ts:58-73` also sells procedural instances there.
- `src/domain/types.ts:5-8` has `combat/farming/mining/woodcutting` skills and `blacksmith` as an NPC job/building, but no smithing/crafting skill. `src/engine/simulation.ts:109-116` grows one of the existing skills by XP level thresholds (`current skill level * 20`).

## Current sinks, identity, ownership and reputation seams

- `src/engine/actions.ts:15-25` common action cost deducts stamina/time and optional gold; `:63-70` rest costs 8 gold for inn or 3 for tavern; `:112-122` hiring deducts fee and schedules 4 gold daily wages for three days.
- Store purchases and farm effort are detailed above. `farm` in `src/engine/actions.ts:27-49` spends stamina/time; harvest adds food and calls `changeReputation(state,1,...)`.
- `src/engine/identity.ts:61-70` records life actions and refreshes identity; `src/data/identity.ts:14-19` has farmer, miner, skilled miner, adventurer and veteran action/skill thresholds. There is no crafter identity.
- `src/domain/life.ts:7-14` includes character reputation/history, milestones, properties, memories and ownership state. `src/engine/identity.ts:72+` exposes reputation changes and milestones. These are reuse seams; no craft callback exists today.

## Interpretation for Phase5-A (not a proposal)

Ordinary material acquisition is already a repeatable, noncombat loop with a small positive gold wage. It is not yet a crafting economy: basic resources can be bought/sold at static prices, typed wolf materials can only be sold or used by existing item generation, and there is no craft cost/material sink. Blacksmith access is gated behind hamlet→village growth. Preserve these as the baseline when Phase5 later designs new costs, recipe access, or typed-material use.
