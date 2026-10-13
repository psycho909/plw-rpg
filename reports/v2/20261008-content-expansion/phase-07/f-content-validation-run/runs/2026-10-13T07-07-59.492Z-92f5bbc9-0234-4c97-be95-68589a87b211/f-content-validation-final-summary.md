# F Six-Family Standard Validator Evidence

- Run: 2026-10-13T07-07-59.492Z-92f5bbc9-0234-4c97-be95-68589a87b211
- HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3 before / e05cc78f1ef452e2672df223f2febf48444dcbd3 after; branch: v2x/reward-core
- Source/config/package map unchanged: true (117 files before, 117 after; excludes __pycache__ and .pyc)
- Raw merged counts: {"families":6,"monsters":66,"materials":48,"equipment":48,"recipes":24,"crops":0,"cropGoods":0}
- Extracted pack sizes and SHA-256: {"slime":{"file":"slime.json","bytes":18959,"sha256":"d19dfd481895035bda12bbf4c0b59d5c83e04292156c9065d8b31aa0b1317b06"},"cave-insects":{"file":"cave-insects.json","bytes":19886,"sha256":"47ba20f7e55a031a4a9634bd33e60bac70f16a95a4cea10e9e5c8a89a48851fc"},"wild-beasts":{"file":"wild-beasts.json","bytes":19750,"sha256":"c3db36c659b713a63bfd0e7f6614ce88044c16293b2c5038b9e3836218555c64"},"frontier-goblins":{"file":"frontier-goblins.json","bytes":20682,"sha256":"eea9f6ef749e0aa0108aafa0050f7be1a4f91dbdfcbcd6f5ee1b882d831646dc"},"fog-undead":{"file":"fog-undead.json","bytes":19847,"sha256":"670c48ef4937a950ef6bf0ca537414e3cabee70f9081ef7f9c2b0873e781c03f"},"mine-constructs":{"file":"mine-constructs.json","bytes":19830,"sha256":"7979aaedc58d52adca41c83bda658a765c024ae93e0de3cf98a797094d58c842"},"six-family-combined":{"file":"six-family-combined.json","bytes":118349,"sha256":"6d64837fa99225bd2c9e7b13faacdf17664658db2c10a52108c5a2877f3d4f76"}}

## Validator outcomes

| Pack | CLI exit | Content | Targeted tests | Typecheck | Errors | Warnings |
| --- | ---: | --- | ---: | --- | ---: | ---: |
| slime | 0 | PASS | 23 | PASS | 0 | 0 |
| cave-insects | 0 | PASS | 23 | PASS | 0 | 0 |
| wild-beasts | 0 | PASS | 23 | PASS | 0 | 0 |
| frontier-goblins | 0 | PASS | 23 | PASS | 0 | 1 |
| fog-undead | 0 | PASS | 23 | PASS | 0 | 0 |
| mine-constructs | 0 | PASS | 23 | PASS | 0 | 0 |
| six-family-combined | 0 | PASS | 23 | PASS | 0 | 2 |

All seven CLI invocations independently passed their 21 targeted tests, typecheck, and report publisher. Five packs had Content PASS; Fog Undead and the combined pack exited 1 on the same content error below.

## Qualified content counts

- slime: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- cave-insects: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- wild-beasts: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- frontier-goblins: {"qualifyingNewMonsters":11,"candidateNewItemIds":14,"usableNewMaterials":8}
- fog-undead: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- mine-constructs: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- six-family-combined: {"qualifyingNewMonsters":66,"candidateNewItemIds":92,"usableNewMaterials":48}

## Gear functional-equivalence audit

- Canonical profile: slot, attack, defense, penetration, and effective affix eligibility; excludes sale, names, descriptions, and equipment IDs from the grouping key. Authored affixes resolve to stat/slots/tiers; baseline affixes preserve their stable ID.
- Functional clone groups: 2; all group members excluded: 4 raw items (4 are qualified gear).
- Raw equipment remaining after excluding all clone-group members: 44 / 48.
- Validator-qualified gear candidates: 44; after excluding 4 qualified clone members: 40.
- Exact clone groups: [{"semantic":{"slot":"armor","attack":0,"defense":6,"penetration":0,"affixes":[{"id":"blocking"},{"id":"sturdy"}]},"members":[{"id":"cave_insect_plate_vest","sell":31},{"id":"frontier_goblin_plate_vest","sell":25}]},{"semantic":{"slot":"weapon","attack":7,"defense":0,"penetration":2,"affixes":[{"id":"keen"},{"id":"piercing"}]},"members":[{"id":"frontier_goblin_scrap_spear","sell":29},{"id":"frontier_goblin_duelist_pike","sell":32}]}]

## Errors

- None.

## Warnings

- frontier-goblins: - WARNING duplicate-like-equipment [frontier_goblin_duelist_pike, frontier_goblin_scrap_spear]: Equipment definitions have the same effective slot, stats, and affix eligibility.
- six-family-combined: - WARNING duplicate-like-equipment [cave_insect_plate_vest, frontier_goblin_plate_vest]: Equipment definitions have the same effective slot, stats, and affix eligibility.
- six-family-combined: - WARNING duplicate-like-equipment [frontier_goblin_duelist_pike, frontier_goblin_scrap_spear]: Equipment definitions have the same effective slot, stats, and affix eligibility.

Each CLI retained its exact JSON bytes and source snapshots before parsing. Raw command streams, exits, UTC/Taipei times, manifests, and maps are in `artifacts/` and each `cases/<pack>/.qa-runs/` directory. No source edits, full suite, or Phase 7-G/100-item acceptance occurred in this run.
