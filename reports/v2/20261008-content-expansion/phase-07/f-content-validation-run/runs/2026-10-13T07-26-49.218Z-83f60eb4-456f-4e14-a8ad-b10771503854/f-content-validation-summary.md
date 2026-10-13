# F Six-Family Standard Validator Runs

- Run: 2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854
- HEAD before/after: e05cc78f1ef452e2672df223f2febf48444dcbd3 / e05cc78f1ef452e2672df223f2febf48444dcbd3
- Branch before/after: v2x/reward-core / v2x/reward-core
- Full source/config/package SHA maps unchanged: true (117 / 117 files; excludes __pycache__ and .pyc)
- Measured six-family actual counts: {"families":6,"monsters":66,"lootTables":72,"equipment":48,"materials":48,"crops":0,"cropGoods":0,"recipes":24,"affixes":0}
- Six-family target counts: {"monsters":66,"materials":48,"equipment":48,"recipes":24,"crops":0,"cropGoods":0}; matched: true
- Functional gear after excluding all members of clone groups: 48 / 48
- Functional clone groups: []

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
- fog-undead: exit 0
- mine-constructs: exit 0
- six-family-combined: exit 0

Each CLI captures its exact input bytes and source snapshots before parsing through the validator evidence helper. Raw stdout/stderr and UTC/Taipei timestamps are retained under artifacts/. Each readable report has its own case directory and archive.
- Content/check PASS across all seven invocations: true
- Input and source retention integrity: true
This is scoped F content/validator evidence. It does not run the canonical full suite, accept F, or claim final Phase 7 product gates.
