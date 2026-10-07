G Core source freeze

Released behavior implemented:
- The engine resolves an active character's owned, walkable, nearby home for store recipes at any hour; other store recipes continue to use the store, and advanced recipes continue to require the blacksmith.
- CraftPlan.station preserves the recipe station in `id`, exposes the derived physical `site` and actual hours, and `gold.required` is the exact fee used by the debit. Home fees are `max(3, recipe.goldCost - 1)`.
- `smith` identity forms at 10 Smithing actions and Smithing level 3. First engine-confirmed masterpiece forms `masterpieceCrafter` and awards the bounded +3 reputation once before duration simulation. The identity remains the idempotence record if the item is sold or the milestone window evicts its history.
- Save validation accepts the two new identity IDs without changing save version or data shape. Craft preflight validates identity/reputation and owned-home records and reserves the maximum expected four events for first-masterpiece plus threshold completion.

Verification: 180 targeted tests passed across crafting, identity, save service, NPC dialogue, ownership, and life integration; `npx vue-tsc --noEmit` passed. Full build/browser validation remains external to this core freeze.

Frozen core source hashes:
- `src/engine/crafting.ts`: 7f21ace672d084174e11ba5a9662e2e5c0e8c2a344955f7cc2769783cf3d0832
- `src/engine/crafting.test.ts`: bbd9ab0ee920f47996918e181c72de0f747fe9e5190b08fd81c63364c5646a49
- `src/engine/identity.ts`: 2d7596a712c16940a590bdf47edd288fc965f429304889e0be3b09969d61119e
- `src/domain/life.ts`: db2eff0c1eb6d3ae310f39d8df5a6bf40b125193741a25b9bbe652c4640de72a
- `src/data/identity.ts`: 0acc09bbd1f9d9c4e057b2bdca01fa202730e868325cb873286c5c31a809dae0
- `src/services/saveService.ts`: 4f6f98015c67e7b3b7ce09d8e6435b9e1ef77ea480a767fbe47c8ffa7f4c1627
- `src/engine/npcLife.ts`: 7f2fe08b29c5ee145a06c3623b19b663fcd7251bdfa5c3a7bfe19bc393bf5c28
