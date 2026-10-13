# Phase 7-D Remaining Families — Preliminary Content Review

## Scope and status

Preliminary review of the four isolated authored modules against the current D ticket, approved remaining-family plan, and `ContentPack` schema. Frozen input hashes at review:

- `src/data/content/wildBeasts.ts`: `d3a16ffeed4c776a3d1fc7022015c0f412827e8d18b3fe7c2d944c9e13d9e54c`
- `src/data/content/frontierGoblins.ts`: `25c51207236be252624afb8898c1cc2e53a04fa81e62086ef23b6d41f2151de0`
- `src/data/content/fogUndead.ts`: `fb741cfec7306cd57137b26223156135edd8a9b81a65abe4e580532106787fd3`
- `src/data/content/mineConstructs.ts`: `e8ee847c72618d6ccb02343aa01fde443e61541b2e69ba413e8676c0ccc1abdd`

Each module declares the planned six normal and two Elite IDs (32 new definitions total) and empty mini-boss/boss lists. I did not run tests. Shared registry and integration-test work is still in progress, so this is not a final acceptance review.

## Findings to fix before batch validation

**R1 — Medium: Frontier Goblin slingcord has no effective consumer and an ineligible bias.** In `frontierGoblins.ts:44`, `frontier_goblin_slingcord` biases `keen` and `bleeding`. The only current weapon output at line 39 allows `piercing` and `striking`; the only armor output at line 40 allows `sturdy` and `blocking`. The spear recipe does list slingcord as an allowed bias material (`:53`), but neither of its affixes can be applied to that output, and neither recipe consumes slingcord as an input (`:53–54`). It therefore has no useful path in this D slice and conflicts with the schema's “useful material” contract; the content validator's source graph would reject its bias as ineligible and its material as orphaned. Align the material bias with an affix on an existing output, add a compatible D-scope use, or make it a recipe input while preserving the approved two-output budget.

**R2 — Low: Fog bellkeeper spawn predicate is broader than its approved roster.** `fogUndead.ts:68` permits `unknown`, level 6+, threat 2+, night, with no settlement-stage restriction. The plan at `remaining-family-plan.md:70` requires town **or** threat 3 at night. After the unknown region is discovered, the current predicate admits a hamlet/threat-2 witness. Encode the plan as disjunctive profiles: one town profile at the planned threat floor and one threat-3 profile, both retaining level/night/unknown restrictions.

**R3 — Low: Wild redtail prose claims unsupported positioning.** `wildBeasts.ts:20` says the redtail circles behind prey before its pounce, while its only implemented mechanic is generic `heavyStrike` at that same line; there is no positioning/flanking state. Keep the telegraphed pounce identity and remove the unsupported circling claim from the description.

**R4 — Low: three planned rare materials are guaranteed by Elite loot.** The plan calls `wild_beast_amber_sinew` rare (`remaining-family-plan.md:27`), `frontier_goblin_forgecore` rare (`:53`), and `mine_construct_corechip` rare (`:101`). Yet each is in `guaranteedMaterialIds` for both Elite tables: `wildBeasts.ts:35–36`, `frontierGoblins.ts:35–36`, and `mineConstructs.ts:95–96`. Fog Undead models its planned rare cinderbone through `rareMaterials` chances. The guaranteed drops do not express the approved rare tier. Use a rare-material chance for these materials (retaining a normal guaranteed family material/source where needed), or record an explicit approved tier interpretation before changing the plan.

**R5 — Low: Mine Pylon's bias differs from the approved roster.** The plan at `remaining-family-plan.md:91` specifies keen bias for `mine_construct_resonant_stone`; `mineConstructs.ts:105` authors striking bias. Striking is compatible with the current weapon output and has a meaningful consumer, so this is not a closure failure. Align it to keen as planned or document the deliberate roster adjustment.

## Coverage reviewed

The four source files contain 24 normal and 8 Elite definitions, each with one of the five supported mechanics and a telegraph. The declared family, selected loot-table, and material IDs are family-prefixed; every normal/Elite row has its own selected loot table with a reachable family material source. No boss or mini-boss placeholder IDs are declared. Wild Beasts uses the plan-approved farmland/forest boundary; the other families stay in forest/mine/unknown as planned, and no new family declares village. Unknown-region uses remain subject to the existing discovered-region witness rule.

Each family has seven sourced materials and exactly two recipe outputs (one weapon, one armor). Material sources and most source/use/affix paths are closed; R1 is the exception. Equipment affixes match their weapon/armor slots. The eight recipes use distinct compatible inputs and current blacksmith/Smithing fields. A conservative nominal sale check also shows each output's listed `sell` is below `goldCost` plus the listed material-input sell values alone (before accounting for inventory inputs), so I found no obvious direct craft/sell arbitrage. This is a static price check, not a market simulation.

## Disposition

**Preliminary: needs the listed content corrections or explicit plan reconciliation, followed by Root's frozen registry/integration and serialized QA evidence.** No runtime-registration, test, or playability claim is made here. D remains in progress; this review does not accept D or release E. The separately adopted historical-evidence exception and its permanent P2 finding remain in force.


## Correction — Mine Construct rare-drop finding withdrawn

On the frozen snapshot `src/data/content/mineConstructs.ts` (SHA256 `e8ee847c72618d6ccb02343aa01fde443e61541b2e69ba413e8676c0ccc1abdd`), Elite loot rows 95–96 each guarantee an ordinary family material (`mine_construct_shard` for the Ram; `mine_construct_plate` for the Warder) and place `mine_construct_corechip` in `rareMaterials` at chances 0.1 and 0.12 respectively. The original R4 statement that Mine Corechip was guaranteed was incorrect and is withdrawn. R4 remains applicable to the Wild Beast and Frontier Goblin rare-material rows only. R5 about the Pylon's roster bias remains unchanged. This correction amends the review record without erasing its original text.


## Final delta review — 2026-10-13

### Frozen source and evidence identity

This delta review covers the corrected D modules, registry/runtime integration, the two unchanged-legacy crafting assertions, and the validator semantic-signature fix. The review did not rerun tests. Source hashes in the completed validation run match the reviewed files:

- `src/data/content/wildBeasts.ts`: `feca558da753a307c85605202fa4b1fe20870665a537f94ca2c810edbbd71af5`
- `src/data/content/frontierGoblins.ts`: `c3950522a5b44139757ec44c4c456737095e84a5233a40323df692d0bb268411`
- `src/data/content/fogUndead.ts`: `df8fe7cb13df56f82c4cd6111f3d0cac96d4bd253c85afee27ea81fc4d54dd35`
- `src/data/content/mineConstructs.ts`: `e8ee847c72618d6ccb02343aa01fde443e61541b2e69ba413e8676c0ccc1abdd`
- `src/data/contentRegistry.ts`: `e2c61d9747fc48409d1830f460baa5fbea7b8c7a1b7ae7423be8c0a09b851fb8`
- `src/engine/remainingFamilies.integration.test.ts`: `0e2d68b021f76b0e4f5f6f4f414057b0f3fb04b2e43492d919ece69cd065d11c`
- `src/engine/crafting.test.ts`: `b83e272a0a578b192040e26876057cd01bf8901fd687adea9e167a2471d60467`
- `src/presentation/craftingProjection.test.ts`: `3a76ca984cc1e857d8eb822b00b991d3153195c64bdb897cb815f55d4723abec`
- `src/engine/contentValidation.ts`: `aa8846776379da3d16627ddc8f4e7987c304b5bd78dda0680eb2a97f0ef6c8a7`
- `src/engine/contentValidation.test.ts`: `a6d6865cf017b778ee7cf2cadd46088b41cb703862603b4bd9d2b53a710532be`

The final combined pack was generated from current TypeScript source using the Vite SSR extraction harness and validated against that exact input: 80,136 bytes, SHA-256 `f0dff4ff5135bb750814fa8535b94d6cdae5a2da99764096381e076875b411bf`. Run `d-remaining-validation-run/runs/2026-10-13T02-26-33.804Z-7ce53b35-99fa-4595-bbdc-5f1403d230f6` records unchanged HEAD and source/config/package map, four individual pack snapshots, combined extraction manifest, CLI result, targeted tests, and typecheck. Its combined totals are 51 monsters, 43 materials, 20 equipment, and 16 recipes. Validation passed with 51 qualifying monsters, 50 candidate item IDs, and 30 usable new materials. Six `duplicate-like-material` warning groups remain; the 43 declared materials must not be represented as 43 usable materials. Warning groups are retained in `combined-six-family-summary.md`.

The one canonical `npm run check` passed at `d-remaining-full-check-run/runs/2026-10-13T02-27-05.314Z-c38536cf-de82-4601-8b75-6f99cb45f9d0`: exit 0, 32 test files / 585 tests passed, typecheck and production build passed, with unchanged HEAD and source/config/package map. The validator semantic-signature correction has its own retained RED/GREEN and focused typecheck evidence in `d-quality-validator-fix-run/summary.md`; it prevents baseline affix IDs with absent effect metadata from collapsing distinct equipment/material identities, while authored affixes continue to compare by effective stat/slot/tier metadata and identical authored clones remain detected. The original false-quality report and intermediate incorrect test expectation remain preserved in that run archive.

### Corrected findings and disposition

R1–R3 are resolved in the frozen source: Wild and Frontier now have compatible planned bridge outputs/recipes and loot selection; redtail prose no longer claims unsupported flanking; Fog Bellkeeper retains the approved town OR threat-three night routes. The integration test exercises all four family registrations, controlled supported mechanics, guaranteed sourced loot, recipe crafting, equipment, save reload, the additional Wild/Frontier bridges, their affix-compatible material biases, and both Fog Bellkeeper routes. The exact four legacy recipe assertions remain unchanged in `crafting.test.ts`, and the presentation test continues to assert the legacy listing.

The Wild Beast and Frontier Goblin Elite rare drops now use probabilistic `rareMaterials` while retaining ordinary guaranteed drops. The Mine Corechip portion of original R4 was previously withdrawn by correction: its frozen source already used rare-material probabilities. R5 is superseded by Root's explicit content choice approving Mine Pylon's striking bias; it is legal for its current pike output. The historical P2 evidence-retention finding remains permanent; no claim is made that missing original failure bytes/source fingerprint were recovered. The pre-fix false-quality-count report remains retained and is superseded only for current counts by the frozen validator-fix recalculation above.

**Independent Standards/Spec delta disposition: PASS WITH FINDINGS.** The corrected current D source, registry/integration and validator behavior are supported by the captured pack and test evidence. Findings are the six retained duplicate-like-material warning groups / 30 usable-material count and permanent historical P2. Root records local D acceptance for the 51 qualifying normal/Elite definitions under the Owner-approved historical-evidence condition; this review does not claim the full later 66/100 content budget is complete or accept E. E remains future work and unreleased.
