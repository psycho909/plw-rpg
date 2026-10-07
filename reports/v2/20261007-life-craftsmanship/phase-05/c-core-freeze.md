# Phase 05 Core C source freeze

- Captured: 2026-10-07T03:35:26+00:00
- Scope: C starter-spear craft planner and atomic transaction; one shared item-generation instance, success-only 10 smithing XP and one smithing action, resource/time/event updates, plus rejection immutability.
- C RED: `c-red-craft-practice-xp.txt` records the focused assertion failing because expected smithing XP 10 was 0.
- C GREEN: `npm test -- src/engine/crafting.test.ts` passed; see `c-green-core-final.txt` and exit marker.
- Typecheck: `npx vue-tsc --noEmit` passed; see `c-green-typecheck-final.txt` and exit marker.
- Next gate: fresh normal Chromium acquire → craft → inspect/equip → save/reload pilot. D remains unreleased until Root accepts that evidence.

## Source hashes (SHA-256)

- `src/engine/crafting.ts` — `30e516a1cfde75b031d10934263298393b104ce84f24261734e494c26b35f5e0`
- `src/engine/crafting.test.ts` — `16c4f8d030f4989579dca980c7471a83a84520f5f6538847baaeecc33a5f1c21`
- `src/data/crafting.ts` — `e351f28ac02ab31a0c9390f1afc82195105972a1994d7bf466922ea236c03488`
- `src/domain/reward.ts` — `ab0205e8f286832ef4aa83d38685af163f2e193c245efadb4ea730bff93fe885`
- `src/domain/types.ts` — `7a06eb4f36d44561a3b13a0729800b1776583bc555680814931b59f6cb775400`
- `src/engine/itemGeneration.ts` — `0b568eb6ab1a6475402ada4c2627148dd7b4e8bff97fd8291112e4a5e4c730f2`
- `src/stores/gameStore.ts` — `b5d18a378cf4b05d05a37a2825e7eff045fd1ef68ac0714076b8f7c049bf5ac2`
- `src/presentation/craftingProjection.ts` — `9134a65ae3ab5287e012ff24e31904b244b44bef27b975d497c182e8b8030857`
- `src/components/PlaceWindow.vue` — `d717e3ae6806858a54bb097fcfa82f2e4973a91bc0012ff976b5efbc7a366876`
- `src/components/InventoryWindow.vue` — `edf43938d7c1463dd7e222c0aee4577bada8203fe675a5c28f50e5833bc4035e`

## RED/GREEN evidence hashes (SHA-256)

- `c-red-craft-practice-xp.txt` — `2b659be3a43d863f2e0d9629d06af3df26e91e0560127101d58a4fb3f1736e91`
- `c-green-core-final.txt` — `eed87023f263e51587297c0c9aba50c5c826776c585d3edb3738152477a93257`
- `c-green-core-final-exit.txt` — `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa`
- `c-green-typecheck-final.txt` — `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `c-green-typecheck-final-exit.txt` — `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa`
