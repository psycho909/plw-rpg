# Phase 5 CORE independent review

Disposition: **ACCEPT** for the current frozen CORE implementation. The earlier `ACCEPTWITHFINDINGS` review is retained in this report's recorded history; its two findings and the two later capacity findings are resolved in the current source. This closes the independent CORE engineering gate only. H, other release gates, and Human validation remain separate.

## Scope and source pin

Reviewed ticket `tickets/20261007-v2x-05-life-craftsmanship.md`, spec `docs/specs/V2X-PHASE5-LIFE-CRAFTSMANSHIP.md`, `slice-decisions.md`, the B/C/D/E/F/G freeze reports, and the current CORE capacity freeze `g-core-capacity-fix-freeze.md` (SHA-256 `f5c996f30cb957f59a708ced6c9bb7b2f4529a0d2e3517c796c622eba2fea0c5`). The checked-out HEAD remains `1a56cd3eeb2ea65114a5dcf03c0e00504b69239f`; implementation changes are working-tree sources.

All four current CORE files match the freeze manifest:

- `src/engine/crafting.ts`: `d5abd71325252cfad846680cbdd3d844b78ab326bffea14e3314f618737a3491`
- `src/engine/crafting.test.ts`: `240458a3586c98449282e388709af4b230d1301330f31c76dd53289d1875126c`
- `src/services/saveService.ts`: `27af78b529a5f464d5ccafd13a0a187cacebfa3d962787a106c60821d10e068a`
- `src/services/saveService.test.ts`: `c0019a9e290787c10c31143d292a7ef78b1d460c6a22f5962dd0969782c71277`

The current recursive `src/` map has 79 files and fingerprint `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`. I compared every current path/hash with both source maps from the recorded full check; both match exactly.

## Retargeted findings

**Event ID reservation — resolved.** The previous same-day reserve undercounted crop maturity and XP events. `craftCapacityBudget()` now uses `BigInt` for the upper bound, counts every due crop plus general and Smithing level events, all potentially formed identities, masterpiece identity, reputation tier and completion, and adds a conservative crossed-day budget for characters, NPCs, settlement, threat, living events, boss warnings and party slots. It checks canonical XP before relying on the one-level-per-award bound. `transactionFailure()` rejects before generation or simulation when the final `eventSequence` could reach the value the save validator rejects. The original crop + both XP level-up overflow RED remains preserved as `g-core-eventreserve-red-exact.txt` (SHA-256 `1d27d1befc1ec6e7dde98a8a4c02b28f5e5abb6474652aab6b9620345f893fa3`). Its GREEN regression confirms preview and execution reject atomically. The 1,000-NPC/year-boundary test also confirms the full crossed-day reserve rejects before mutation.

**V2 identity allowlist — resolved.** `validLife()` now accepts only legacy identities for source V2; V3 accepts the Smithing and masterpiece identities. This prevents an impossible V2 `masterpieceCrafter` claim from suppressing the first-masterpiece reputation award. The original forged-identity RED is retained as `g-core-v2identity-red.txt` (SHA-256 `d76b8ab7152af360341216894018134c24cddca43fa3fe4136b3192353f21eaf`). The focused regression rejects the forged record, while migration tests preserve historical V1/V2 world fields, RNG, item rolls and idempotent round trips.

**NPC sequence capacity — resolved.** A crossed day can allocate up to three NPC IDs (immigration, birth and traveler). The budget reserves `3 * crossedDays` and rejects a result that would make `nextNpcId` reach the strict upper bound in `saveService.ts`. The earlier day-15 immigration reproduction is preserved as `g-core-npcidcapacity-red.txt` (SHA-256 `d1b636a923eaa9aca522cd5f7a4980b3d10230b020a6b28efcf275eb806288fe`). Its regression verifies planner and execution rejection, valid reload before the attempt, and byte-equivalent state after rejection.

**Living-director sequence capacity — resolved.** A crossed day can allocate living request/news/arc IDs; the preflight reserves four IDs per day and rejects unsafe sequence growth before mutation. The preserved medicine-request/news overflow RED is `g-core-directoridcapacity-red.txt` (SHA-256 `e478cbb835f2be45ef0cf2869b926995e79168be2e1c44518522e8eb40cc90f7`). Its GREEN regression confirms atomic rejection.

**Reward item sequence — no defect found.** Craft preflight and `generateItem()` both reject `nextInstanceId >= Number.MAX_SAFE_INTEGER - 1`. The reward validator permits a persisted counter through `MAX_SAFE_INTEGER - 1`; therefore the last valid allocation starts at `MAX_SAFE_INTEGER - 2`, creates that item ID, and advances to the validator's valid `MAX_SAFE_INTEGER - 1` counter. The existing exhaustion regression rejects the next allocation without mutation. This boundary is consistent across transaction preflight, generation, and save validation.

The counter audit also checked daily emission sites in simulation, NPC life, identity and living-event paths against the budget. I found no remaining confirmed CORE defect. The event reserve is deliberately conservative: a craft can be rejected near exhaustion even when a particular seeded day would emit fewer events, preserving atomicity and save integrity.

## Verification

Independent focused retarget: 11 selected tests passed, covering same-day crop + XP overflow, first-masterpiece budget and idempotence, year-boundary/full-population reserve, both crossed-day numeric ID counters, item-ID exhaustion, forged V2 identities, and archived V1/V2 migration preservation. Command:

```text
npm test -- src/engine/crafting.test.ts src/services/saveService.test.ts -t 'awards first-masterpiece reputation once and keeps its identity after sale and milestone eviction|allows a first masterpiece when the conservative same-day event budget fits|crop and XP events exceed|year-boundary event budget|crossed day could exhaust the NPC id allocator|crossed day could exhaust the living-event id allocator|after exhausting item ids|migrates a complete V2 world|migrates the archived historical V1 save|migrates the archived Phase4 V2 stress save|rejects G-only identities in a V2 save'
```

Root's current recorded full check is **425/425 tests, 22/22 files**, with `vue-tsc --noEmit` and the production build passing. The exact run, raw output and unchanged before/after source maps are in `j-full-check-runs/20261007T053450Z-58555c07/` and summarized in `regression.md`. I did not rerun the full suite or production build; I independently verified its source maps match the current 79-file tree.

All pre-fix RED artifacts remain unchanged. The original B full-check failure (335/340, five failures) also remains preserved as historical evidence; later successful checks do not overwrite it.
