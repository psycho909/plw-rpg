# Remaining D Corrected Validation

Status: all four frozen family packs and the combined six-family pack passed the repaired validator. This is current content validation evidence; it does not itself accept D or make a final Phase 7 50/100 gate claim.

## Frozen run and counts

- Run: `2026-10-13T02-18-13.159Z-6acc43b8-e9e8-42d8-a689-89b3d08be6bb`
- HEAD before/after: `75140d1aa0b40bc00e246cec8253daab524720ad`; source/config/package full SHA map unchanged.
- Frozen hashes matched at start and end: Wild Beasts `feca558d…bbd71af5`; Frontier Goblins `c3950522…bb268411`; Fog Undead `df8fe7cb…4d54dd35`; Mine Constructs `e8ee847c…c0ccc1abdd`; registry `e2c61d97…09b851fb8`; integration test `0e2d68b0…065d11c`.
- Each new family pack measured 8 monsters / 7 materials. Wild Beasts measured 3 equipment / 3 recipes; Frontier Goblins 4 / 4; Fog Undead 2 / 2; Mine Constructs 2 / 2.
- Combined six-family measured **51 monsters / 43 materials / 20 equipment / 16 recipes / 0 crops / 0 crop goods**, matching Root’s corrected target.
- The original `artifacts/final-integrity.json` was generated with stale harness target constants (17 equipment / 13 recipes) and records `allSixCountTargetsMatched: false`. Preserve it as run-time evidence. `artifacts/owner-target-reconciliation.json` records the target correction issued before this run: measured 20 / 16 exactly matches Root’s target. The harness constants are now corrected; no validator scenarios were rerun.
- Pack byte lengths and SHA-256: Wild Beasts 12,838 / `6a410ed8…d7b9b4de`; Frontier Goblins 14,307 / `8e6ba738…dbcc2fed`; Fog Undead 11,939 / `64adf29c…57536168`; Mine Constructs 12,054 / `68c270b4…e276d672`; combined 80,136 / `f0dff4ff…75b411bf`.

## Sequential CLI results and qualification counts

All five CLI invocations exited 0 with content PASS and overall PASS. Their targeted test check passed (1 file / 16 tests per invocation) and `vue-tsc --noEmit` passed. Qualification counts are reported separately from raw pack totals:

| Pack | Qualifying monsters | Candidate new item IDs | Usable new materials | Warnings |
| --- | ---: | ---: | ---: | --- |
| Wild Beasts | 8 | 10 | 7 | None |
| Frontier Goblins | 8 | 9 | 5 | `duplicate-like-material` for `frontier_goblin_ironbits` / `frontier_goblin_slingcord` |
| Fog Undead | 8 | 9 | 7 | None |
| Mine Constructs | 8 | 7 | 5 | `duplicate-like-material` for `mine_construct_binding` / `mine_construct_shard` |
| Six-family combined | 51 | 33 | 15 | 11 warnings: 1 duplicate-like-equipment group and 10 duplicate-like-material groups |

Combined warning groups:

- Duplicate-like-equipment: `cave_insect_chitin_spear`, `wild_beast_tendon_spear`.
- Duplicate-like-material groups: `fog_undead_shroud` / `mine_construct_binding` / `mine_construct_shard` / `slime_amber_gel`; `cave_insect_leg` / `frontier_goblin_scrap` / `slime_bog_mucus`; `frontier_goblin_signalcloth` / `slime_spring_ichor`; `cave_insect_sac` / `fog_undead_bone` / `mine_construct_resonant_stone` / `slime_pool_salt` / `wild_beast_horn`; `cave_insect_resin` / `wild_beast_hide`; `cave_insect_plate` / `fog_undead_cryptstone` / `mine_construct_plate`; `cave_insect_core` / `fog_undead_bellmetal` / `mine_construct_ironvein`; `frontier_goblin_plate` / `wild_beast_tendon`; `frontier_goblin_ironbits` / `frontier_goblin_slingcord`; `fog_undead_tendon` / `mine_construct_joint`.

## Retained evidence and limits

The Vite SSR extraction manifest records current exports, pack counts, byte lengths, and hashes. Before/after full source maps are in `artifacts/before.json` and `artifacts/after.json`; all five input hashes match their run manifests and all captured source snapshots match their declared hashes. Raw stdout/stderr, commands, exit codes, and UTC/Asia-Taipei times are under `artifacts/`. Each run's exact pack bytes, source snapshots, child status/output, and report version are under `.qa-runs/` and `playlog.jsonl`.

The harness exited 1 after the five CLI calls, during Markdown summary formatting. That postprocessing error is separately preserved in `artifacts/harness-postprocess-failure.txt`; the harness expression is corrected now. This report was assembled from the already-retained artifacts; no validator reruns occurred. The earlier pre-fix run remains untouched in the adjacent prior run directory. No source was changed in this QA pass. Full `npm run check` awaits Root’s next gate decision.
