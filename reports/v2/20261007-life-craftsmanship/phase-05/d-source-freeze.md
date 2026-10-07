# Phase 05 D source freeze

- Captured: 2026-10-07T04:11:34+00:00
- Scope released by Root after C normal Chromium pilot acceptance: optional starter-spear influence materials and material-biased generation only.
- Request: `influenceMaterial?: MaterialId | null`; omitted/null is neutral. Starter spear accepts wolfFang or moonStone. wolfHide remains for the later armor recipe stage; no new recipes, skill quality changes, rarity changes, or masterpiece behavior were added.
- Preview: selected allowed material adds one `source: material` input with the active owner’s current count. Plan also returns recipe station opening/closing hours. Unsupported material and missing owner material fail in preflight; rejected craft leaves the whole game state unchanged, including RNG, IDs, resources, time, and events.
- Success: passes the selected material through the shared `generateItem` path, consumes exactly one active-owner unit, and persists item material/craft provenance through save/reload.
- Direction contract: Fang adds +4 bleeding and +2 piercing weight (spear weights 5/3 vs 1/1). Moonstone adds +4 keen weight (5 vs 1) and +0.15 special bonus: default 10% becomes 25% conditional on a Legendary weapon. The default rarity pool is unchanged; these are biases, not guarantees or quality floors.
- Validation: focused crafting, generator control, and UI projection tests passed 57/57; `npx vue-tsc --noEmit` passed. Full 100k distribution study remains deferred to I. No full regression, build, or D browser pilot was run in this slice.
- RED evidence captures the missing request/preview cost, neutral generated item/no material persistence, and absent planner hours before their fixes. Final C pilot artifacts remain unchanged.

## Source hashes (SHA-256)

- `src/data/crafting.ts` — `6e51bfeb5cca2588408fea99d05ba439f932815df401b58bd3b1c938c02fa136`
- `src/data/rewards.ts` — `9631e0ae3a8b885e416cdfe66b01db931a7c3c4ab78abaa7e518319c5465458f`
- `src/engine/crafting.ts` — `d41867472599f132cb1b207061820c0ea3a140b3a3ed9e83237c6f05b792eb4c`
- `src/engine/crafting.test.ts` — `54f71182ce23a7e8816f20b467208dceed5b3245509c4d74c50ad23ba9cfa7a9`
- `src/engine/itemGeneration.test.ts` — `8b70e97f4af1a08b46118291d200229cd59160f7f5fa24cc1b3b593b022668af`
- `src/stores/gameStore.ts` — `b5d18a378cf4b05d05a37a2825e7eff045fd1ef68ac0714076b8f7c049bf5ac2`
- `src/presentation/craftingProjection.ts` — `eed898a4ab557354c1fcd40a62470f9209fadcd717a4de69d7dc2184452797ea`
- `src/presentation/craftingProjection.test.ts` — `2cd820c925d3a863c447424339fc9d6a93f570d8ae17469699a4120a9f9cdf11`
- `src/components/PlaceWindow.vue` — `4a72db8efb55e1169be5b9ff872ba87659221b3b99f9b3b14a9d9e29f6e97781`
- `src/components/InventoryWindow.vue` — `edf43938d7c1463dd7e222c0aee4577bada8203fe675a5c28f50e5833bc4035e`

## D RED/GREEN evidence hashes (SHA-256)

- `d-red-influence-preview.txt` — `028098bbd5fd55a6ea903ecb2c5ecf011b7810745e1dbd331820e67f4137b089`
- `d-red-influence-consume.txt` — `77b2d909fae23e3e6247bfba4789790d7ac1a07755dc562abfcd644bf97b8924`
- `d-red-station-hours.txt` — `565be26d0da46a5acc25647144e94c1b9694e2e276fe8b6877d214766d61d0d5`
- `d-green-targeted-tests.txt` — `7596288786977257430a37f3a9473fec8452e09ec21039100411ab9397723329`
- `d-green-typecheck.txt` — `fe9afb1fab4569e0220b335723046c19ed95952ae68cf8437d543d66bbd657be`
