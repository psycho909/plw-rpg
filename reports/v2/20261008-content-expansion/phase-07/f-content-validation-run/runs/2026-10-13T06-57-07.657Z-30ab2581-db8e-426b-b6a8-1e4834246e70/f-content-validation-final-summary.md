# F Six-Family Standard Validator Evidence

- Run: 2026-10-13T06-57-07.657Z-30ab2581-db8e-426b-b6a8-1e4834246e70
- HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3 before / e05cc78f1ef452e2672df223f2febf48444dcbd3 after; branch: v2x/reward-core
- Source/config/package map unchanged: true (117 files before, 117 after; excludes __pycache__ and .pyc)
- Raw merged counts: {"families":6,"monsters":66,"materials":48,"equipment":48,"recipes":24,"crops":0,"cropGoods":0}
- Extracted pack sizes and SHA-256: {"slime":{"file":"slime.json","bytes":18895,"sha256":"007be15bf032cc266c36d4ee628b94a87a28840e3cb34a41c9c3e16f4bbc7f38"},"cave-insects":{"file":"cave-insects.json","bytes":19887,"sha256":"ecd764dccaf811e8d6ba357942706edae915f9f43d0084ae23e86099099a81ef"},"wild-beasts":{"file":"wild-beasts.json","bytes":19684,"sha256":"22121079cf75fcfbde2568ef5d85a9ced04b87f0b30203e453b71dec10c4a04b"},"frontier-goblins":{"file":"frontier-goblins.json","bytes":20742,"sha256":"00146899333a90f459b7000601ea3764866d82acc16b04536806b0fe6b5a96ea"},"fog-undead":{"file":"fog-undead.json","bytes":19825,"sha256":"3b0b3f90247ae3c1433c77630ffe716e91d3bf52f074d4e9784ffbe72fb59f96"},"mine-constructs":{"file":"mine-constructs.json","bytes":19842,"sha256":"992bd86d7b181141ad189327873c5c4bff3fb640adf284bc2572e81982d8afad"},"six-family-combined":{"file":"six-family-combined.json","bytes":118270,"sha256":"3a0752be73790818b8e3db23b64c12e8af3a99ee5be6bfc1fdaa9ef60cd22b7c"}}

## Validator outcomes

| Pack | CLI exit | Content | Targeted tests | Typecheck | Errors | Warnings |
| --- | ---: | --- | ---: | --- | ---: | ---: |
| slime | 0 | PASS | 21 | PASS | 0 | 0 |
| cave-insects | 0 | PASS | 21 | PASS | 0 | 0 |
| wild-beasts | 0 | PASS | 21 | PASS | 0 | 1 |
| frontier-goblins | 0 | PASS | 21 | PASS | 0 | 0 |
| fog-undead | 1 | FAIL | 21 | PASS | 1 | 0 |
| mine-constructs | 0 | PASS | 21 | PASS | 0 | 0 |
| six-family-combined | 1 | FAIL | 21 | PASS | 1 | 3 |

All seven CLI invocations independently passed their 21 targeted tests, typecheck, and report publisher. Five packs had Content PASS; Fog Undead and the combined pack exited 1 on the same content error below.

## Qualified content counts

- slime: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- cave-insects: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- wild-beasts: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- frontier-goblins: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- fog-undead: {"qualifyingNewMonsters":11,"candidateNewItemIds":15,"usableNewMaterials":8}
- mine-constructs: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- six-family-combined: {"qualifyingNewMonsters":66,"candidateNewItemIds":91,"usableNewMaterials":44}

## Gear functional-equivalence audit

- Canonical profile: slot, attack, defense, penetration, and effective affix eligibility; excludes sale, names, descriptions, and equipment IDs from the grouping key. Authored affixes resolve to stat/slots/tiers; baseline affixes preserve their stable ID.
- Functional clone groups: 8; all group members excluded: 19 raw items (19 are qualified gear).
- Raw equipment remaining after excluding all clone-group members: 29 / 48.
- Validator-qualified gear candidates: 47; after excluding 19 qualified clone members: 28.
- Exact clone groups: [{"semantic":{"slot":"armor","attack":0,"defense":4,"penetration":0,"affixes":[{"id":"blocking"},{"id":"sturdy"}]},"members":[{"id":"slime_resin_guard","sell":18},{"id":"wild_beast_hide_coat","sell":22}]},{"semantic":{"slot":"armor","attack":0,"defense":5,"penetration":0,"affixes":[{"id":"blocking"},{"id":"warding"}]},"members":[{"id":"slime_moss_coat","sell":27},{"id":"cave_insect_resin_coat","sell":29},{"id":"fog_undead_shroudcoat","sell":31},{"id":"mine_construct_bindingmail","sell":32}]},{"semantic":{"slot":"weapon","attack":7,"defense":0,"penetration":0,"affixes":[{"id":"bleeding"},{"id":"keen"}]},"members":[{"id":"slime_spring_blade","sell":28},{"id":"cave_insect_leg_blade","sell":34}]},{"semantic":{"slot":"armor","attack":0,"defense":7,"penetration":0,"affixes":[{"id":"blocking"},{"id":"sturdy"}]},"members":[{"id":"slime_matriarch_cuirass","sell":38},{"id":"fog_undead_guardmail","sell":36},{"id":"mine_construct_plateguard","sell":37}]},{"semantic":{"slot":"weapon","attack":7,"defense":0,"penetration":2,"affixes":[{"id":"piercing"},{"id":"striking"}]},"members":[{"id":"cave_insect_chitin_spear","sell":28},{"id":"frontier_goblin_scrap_spear","sell":29}]},{"semantic":{"slot":"weapon","attack":8,"defense":0,"penetration":0,"affixes":[{"id":"keen"},{"id":"striking"}]},"members":[{"id":"wild_beast_resin_axe","sell":32},{"id":"frontier_goblin_ironaxe","sell":33}]},{"semantic":{"slot":"weapon","attack":6,"defense":0,"penetration":3,"affixes":[{"id":"piercing"},{"id":"striking"}]},"members":[{"id":"wild_beast_antler_pike","sell":30},{"id":"fog_undead_cinderpike","sell":35}]},{"semantic":{"slot":"weapon","attack":10,"defense":0,"penetration":0,"affixes":[{"id":"bleeding"},{"id":"striking"}]},"members":[{"id":"fog_undead_wightcleaver","sell":42},{"id":"mine_construct_ramhammer","sell":43}]}]

## Errors

- fog-undead: - ERROR affix-ineligible [fog_undead_bellstaff]: Affix is not eligible for this equipment slot.
- six-family-combined: - ERROR affix-ineligible [fog_undead_bellstaff]: Affix is not eligible for this equipment slot.

## Warnings

- wild-beasts: - WARNING duplicate-like-loot-table [wild_beasts_loot_ironhide, wild_beasts_loot_matriarch]: Loot tables have identical effective item and material distribution.
- six-family-combined: - WARNING duplicate-like-material [fog_undead_cryptstone, mine_construct_plate]: Material definitions have the same effective economy, generation influence, and recipe consumer functions.
- six-family-combined: - WARNING duplicate-like-material [fog_undead_shroud, mine_construct_binding]: Material definitions have the same effective economy, generation influence, and recipe consumer functions.
- six-family-combined: - WARNING duplicate-like-loot-table [wild_beasts_loot_ironhide, wild_beasts_loot_matriarch]: Loot tables have identical effective item and material distribution.

Each CLI retained its exact JSON bytes and source snapshots before parsing. Raw command streams, exits, UTC/Taipei times, manifests, and maps are in `artifacts/` and each `cases/<pack>/.qa-runs/` directory. No source edits, full suite, or Phase 7-G/100-item acceptance occurred in this run.
