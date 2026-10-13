# F Six-Family Standard Validator Runs

- Run: 2026-10-13T06-57-07.657Z-30ab2581-db8e-426b-b6a8-1e4834246e70
- HEAD before/after: e05cc78f1ef452e2672df223f2febf48444dcbd3 / e05cc78f1ef452e2672df223f2febf48444dcbd3
- Branch before/after: v2x/reward-core / v2x/reward-core
- Full source/config/package SHA maps unchanged: true (117 / 117 files; excludes __pycache__ and .pyc)
- Measured six-family actual counts: {"families":6,"monsters":66,"lootTables":72,"equipment":48,"materials":48,"crops":0,"cropGoods":0,"recipes":24,"affixes":0}
- Six-family target counts: {"monsters":66,"materials":48,"equipment":48,"recipes":24,"crops":0,"cropGoods":0}; matched: true
- Functional gear after excluding all members of clone groups: 29 / 48
- Functional clone groups: [{"semantic":{"slot":"armor","attack":0,"defense":4,"penetration":0,"affixes":[{"id":"blocking"},{"id":"sturdy"}]},"members":[{"id":"slime_resin_guard","sell":18},{"id":"wild_beast_hide_coat","sell":22}]},{"semantic":{"slot":"armor","attack":0,"defense":5,"penetration":0,"affixes":[{"id":"blocking"},{"id":"warding"}]},"members":[{"id":"slime_moss_coat","sell":27},{"id":"cave_insect_resin_coat","sell":29},{"id":"fog_undead_shroudcoat","sell":31},{"id":"mine_construct_bindingmail","sell":32}]},{"semantic":{"slot":"weapon","attack":7,"defense":0,"penetration":0,"affixes":[{"id":"bleeding"},{"id":"keen"}]},"members":[{"id":"slime_spring_blade","sell":28},{"id":"cave_insect_leg_blade","sell":34}]},{"semantic":{"slot":"armor","attack":0,"defense":7,"penetration":0,"affixes":[{"id":"blocking"},{"id":"sturdy"}]},"members":[{"id":"slime_matriarch_cuirass","sell":38},{"id":"fog_undead_guardmail","sell":36},{"id":"mine_construct_plateguard","sell":37}]},{"semantic":{"slot":"weapon","attack":7,"defense":0,"penetration":2,"affixes":[{"id":"piercing"},{"id":"striking"}]},"members":[{"id":"cave_insect_chitin_spear","sell":28},{"id":"frontier_goblin_scrap_spear","sell":29}]},{"semantic":{"slot":"weapon","attack":8,"defense":0,"penetration":0,"affixes":[{"id":"keen"},{"id":"striking"}]},"members":[{"id":"wild_beast_resin_axe","sell":32},{"id":"frontier_goblin_ironaxe","sell":33}]},{"semantic":{"slot":"weapon","attack":6,"defense":0,"penetration":3,"affixes":[{"id":"piercing"},{"id":"striking"}]},"members":[{"id":"wild_beast_antler_pike","sell":30},{"id":"fog_undead_cinderpike","sell":35}]},{"semantic":{"slot":"weapon","attack":10,"defense":0,"penetration":0,"affixes":[{"id":"bleeding"},{"id":"striking"}]},"members":[{"id":"fog_undead_wightcleaver","sell":42},{"id":"mine_construct_ramhammer","sell":43}]}]

## Individual packs

- slime: {"families":1,"monsters":11,"lootTables":12,"equipment":8,"materials":8,"crops":0,"cropGoods":0,"recipes":4,"affixes":0} (family plan target where applicable: {"monsters":11,"materials":8,"equipment":8,"recipes":4})
- cave-insects: {"families":1,"monsters":11,"lootTables":12,"equipment":8,"materials":8,"crops":0,"cropGoods":0,"recipes":4,"affixes":0} (family plan target where applicable: {"monsters":11,"materials":8,"equipment":8,"recipes":4})
- wild-beasts: {"families":1,"monsters":11,"lootTables":12,"equipment":8,"materials":8,"crops":0,"cropGoods":0,"recipes":4,"affixes":0} (family plan target where applicable: {"monsters":11,"materials":8,"equipment":8,"recipes":4})
- frontier-goblins: {"families":1,"monsters":11,"lootTables":12,"equipment":8,"materials":8,"crops":0,"cropGoods":0,"recipes":4,"affixes":0} (family plan target where applicable: {"monsters":11,"materials":8,"equipment":8,"recipes":4})
- fog-undead: {"families":1,"monsters":11,"lootTables":12,"equipment":8,"materials":8,"crops":0,"cropGoods":0,"recipes":4,"affixes":0} (family plan target where applicable: {"monsters":11,"materials":8,"equipment":8,"recipes":4})
- mine-constructs: {"families":1,"monsters":11,"lootTables":12,"equipment":8,"materials":8,"crops":0,"cropGoods":0,"recipes":4,"affixes":0} (family plan target where applicable: {"monsters":11,"materials":8,"equipment":8,"recipes":4})

## Standard CLI outcomes

- slime: exit 0
- cave-insects: exit 0
- wild-beasts: exit 0
- frontier-goblins: exit 0
- fog-undead: exit 1
- mine-constructs: exit 0
- six-family-combined: exit 1

Each CLI captures its exact input bytes and source snapshots before parsing through the validator evidence helper. Raw stdout/stderr and UTC/Taipei timestamps are retained under artifacts/. Each readable report has its own case directory and archive.
- Content/check PASS across all seven invocations: false
- Input and source retention integrity: true
This is scoped F content/validator evidence. It does not run the canonical full suite, accept F, or claim final Phase 7 product gates.

## Qualification counts and warnings

| Pack | Qualifying monsters | Candidate item IDs | Usable materials | Warnings |
| --- | ---: | ---: | ---: | ---: |
| slime | 11 | 16 | 8 | 0 |
| cave-insects | 11 | 16 | 8 | 0 |
| wild-beasts | 11 | 16 | 8 | 1 |
| frontier-goblins | 11 | 16 | 8 | 0 |
| fog-undead | 11 | 15 | 8 | 0 |
| mine-constructs | 11 | 16 | 8 | 0 |
| six-family-combined | 66 | 91 | 44 | 3 |

Warnings are reported independently from content/check status. See each measured F warning below; individual families and the combined pack can expose different duplicate-like groups. Error count is measured independently for every report.

Exact warning text and per-case error records are in `artifacts/quality-warning-summary.json`.

## Qualification counts and warnings

| Pack | Qualifying monsters | Candidate item IDs | Usable materials | Warnings |
| --- | ---: | ---: | ---: | ---: |
| slime | 11 | 16 | 8 | 0 |
| cave-insects | 11 | 16 | 8 | 0 |
| wild-beasts | 11 | 16 | 8 | 1 |
| frontier-goblins | 11 | 16 | 8 | 0 |
| fog-undead | 11 | 15 | 8 | 0 |
| mine-constructs | 11 | 16 | 8 | 0 |
| six-family-combined | 66 | 91 | 44 | 3 |

Warnings are reported independently from content/check status. See each measured F warning below; individual families and the combined pack can expose different duplicate-like groups. Error count is measured independently for every report.

Exact warning text and per-case error records are in `artifacts/quality-warning-summary.json`.
