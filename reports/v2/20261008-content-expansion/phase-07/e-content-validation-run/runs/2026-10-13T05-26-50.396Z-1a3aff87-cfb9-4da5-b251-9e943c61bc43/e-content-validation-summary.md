# E Six-Family Standard Validator Runs

- Run: 2026-10-13T05-26-50.396Z-1a3aff87-cfb9-4da5-b251-9e943c61bc43
- HEAD before/after: 3d15d2e479662cb74135bba8894290e054adaa6f / 3d15d2e479662cb74135bba8894290e054adaa6f
- Branch before/after: v2x/reward-core / v2x/reward-core
- Full source/config/package SHA maps unchanged: true (116 / 116 files; excludes __pycache__ and .pyc)
- Measured six-family actual counts: {"families":6,"monsters":66,"lootTables":72,"equipment":25,"materials":48,"crops":0,"cropGoods":0,"recipes":16,"affixes":0}
- Six-family target counts: {"monsters":66,"materials":48,"equipment":25,"recipes":16,"crops":0,"cropGoods":0}; matched: true

## Individual packs

- slime: {"families":1,"monsters":11,"lootTables":12,"equipment":8,"materials":8,"crops":0,"cropGoods":0,"recipes":4,"affixes":0} (family plan target where applicable: {"monsters":8,"materials":7,"equipment":2,"recipes":2})
- cave-insects: {"families":1,"monsters":11,"lootTables":12,"equipment":2,"materials":8,"crops":0,"cropGoods":0,"recipes":1,"affixes":0} (family plan target where applicable: {"monsters":8,"materials":7,"equipment":2,"recipes":2})
- wild-beasts: {"families":1,"monsters":11,"lootTables":12,"equipment":4,"materials":8,"crops":0,"cropGoods":0,"recipes":3,"affixes":0} (family plan target where applicable: {"monsters":8,"materials":7,"equipment":2,"recipes":2})
- frontier-goblins: {"families":1,"monsters":11,"lootTables":12,"equipment":5,"materials":8,"crops":0,"cropGoods":0,"recipes":4,"affixes":0} (family plan target where applicable: {"monsters":8,"materials":7,"equipment":2,"recipes":2})
- fog-undead: {"families":1,"monsters":11,"lootTables":12,"equipment":3,"materials":8,"crops":0,"cropGoods":0,"recipes":2,"affixes":0} (family plan target where applicable: {"monsters":8,"materials":7,"equipment":2,"recipes":2})
- mine-constructs: {"families":1,"monsters":11,"lootTables":12,"equipment":3,"materials":8,"crops":0,"cropGoods":0,"recipes":2,"affixes":0} (family plan target where applicable: {"monsters":8,"materials":7,"equipment":2,"recipes":2})

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
This is scoped E content/validator evidence. It does not run the canonical full suite, accept E, or claim final Phase 7 product gates.

## Qualification counts and warnings

| Pack | Qualifying monsters | Candidate item IDs | Usable materials | Warnings |
| --- | ---: | ---: | ---: | ---: |
| slime | 11 | 16 | 8 | 0 |
| cave-insects | 11 | 10 | 8 | 0 |
| wild-beasts | 11 | 12 | 8 | 1 |
| frontier-goblins | 11 | 13 | 8 | 0 |
| fog-undead | 11 | 11 | 8 | 0 |
| mine-constructs | 11 | 11 | 8 | 0 |
| six-family-combined | 66 | 60 | 35 | 7 |

Warnings are reported independently from content/check status. The combined pack has six duplicate-like-material warnings and one duplicate-like-loot-table warning; individual Wild Beasts validation has the matching loot-table warning. Error count is zero in every report.

Exact warning text and per-case error records are in `artifacts/quality-warning-summary.json`.
