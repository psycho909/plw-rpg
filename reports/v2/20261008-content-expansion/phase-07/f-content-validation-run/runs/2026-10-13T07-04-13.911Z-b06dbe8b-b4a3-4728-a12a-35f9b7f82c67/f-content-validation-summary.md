# F Six-Family Standard Validator Runs

- Run: 2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67
- HEAD before/after: e05cc78f1ef452e2672df223f2febf48444dcbd3 / e05cc78f1ef452e2672df223f2febf48444dcbd3
- Branch before/after: v2x/reward-core / v2x/reward-core
- Full source/config/package SHA maps unchanged: true (117 / 117 files; excludes __pycache__ and .pyc)
- Measured six-family actual counts: {"families":6,"monsters":66,"lootTables":72,"equipment":48,"materials":48,"crops":0,"cropGoods":0,"recipes":24,"affixes":0}
- Six-family target counts: {"monsters":66,"materials":48,"equipment":48,"recipes":24,"crops":0,"cropGoods":0}; matched: true
- Functional gear after excluding all members of clone groups: 37 / 48
- Functional clone groups: [{"semantic":{"slot":"weapon","attack":7,"defense":0,"penetration":0,"affixes":[{"id":"keen"},{"id":"striking"}]},"members":[{"id":"slime_spring_blade","sell":28},{"id":"fog_undead_bellstaff","sell":32}]},{"semantic":{"slot":"weapon","attack":8,"defense":0,"penetration":0,"affixes":[{"id":"bleeding"},{"id":"striking"}]},"members":[{"id":"slime_amber_mace","sell":25},{"id":"wild_beast_resin_axe","sell":32},{"id":"frontier_goblin_ironaxe","sell":33}]},{"semantic":{"slot":"armor","attack":0,"defense":5,"penetration":0,"affixes":[{"id":"blocking"},{"id":"sturdy"}]},"members":[{"id":"cave_insect_resin_coat","sell":29},{"id":"frontier_goblin_plate_vest","sell":25}]},{"semantic":{"slot":"armor","attack":0,"defense":4,"penetration":0,"affixes":[{"id":"blocking"},{"id":"warding"}]},"members":[{"id":"wild_beast_hide_coat","sell":22},{"id":"frontier_goblin_signal_coat","sell":27}]},{"semantic":{"slot":"weapon","attack":6,"defense":0,"penetration":3,"affixes":[{"id":"keen"},{"id":"piercing"}]},"members":[{"id":"wild_beast_antler_pike","sell":30},{"id":"frontier_goblin_duelist_pike","sell":32}]}]

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
- wild-beasts: exit 1
- frontier-goblins: exit 0
- fog-undead: exit 1
- mine-constructs: exit 1
- six-family-combined: exit 0

Each CLI captures its exact input bytes and source snapshots before parsing through the validator evidence helper. Raw stdout/stderr and UTC/Taipei timestamps are retained under artifacts/. Each readable report has its own case directory and archive.
- Content/check PASS across all seven invocations: false
- Input and source retention integrity: true
This is scoped F content/validator evidence. It does not run the canonical full suite, accept F, or claim final Phase 7 product gates.
