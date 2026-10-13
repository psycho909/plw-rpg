# F Six-Family Standard Validator Evidence

- Run: 2026-10-13T07-15-20.286Z-80576314-da0a-4343-813c-f457571004ec
- HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3 before / e05cc78f1ef452e2672df223f2febf48444dcbd3 after; branch: v2x/reward-core
- Source/config/package map unchanged: true (117 files before, 117 after; excludes __pycache__ and .pyc)
- Raw merged counts: {"families":6,"monsters":66,"materials":48,"equipment":48,"recipes":24,"crops":0,"cropGoods":0}
- Extracted pack sizes and SHA-256: {"slime":{"file":"slime.json","bytes":18895,"sha256":"007be15bf032cc266c36d4ee628b94a87a28840e3cb34a41c9c3e16f4bbc7f38"},"cave-insects":{"file":"cave-insects.json","bytes":19901,"sha256":"4325ffed23b48adac6e08911f77a9ac52998ade0c269e1f063d16c4c9130b82f"},"wild-beasts":{"file":"wild-beasts.json","bytes":19750,"sha256":"c3db36c659b713a63bfd0e7f6614ce88044c16293b2c5038b9e3836218555c64"},"frontier-goblins":{"file":"frontier-goblins.json","bytes":20677,"sha256":"0f179a51289b7a7d0edba43ef29a98126bf7b4536e71567e1dffc8411dc0b5b7"},"fog-undead":{"file":"fog-undead.json","bytes":19826,"sha256":"1a3be290d71d022af688236498f10a367b34fcee5439517b49a406a7765927f3"},"mine-constructs":{"file":"mine-constructs.json","bytes":19830,"sha256":"7979aaedc58d52adca41c83bda658a765c024ae93e0de3cf98a797094d58c842"},"six-family-combined":{"file":"six-family-combined.json","bytes":118274,"sha256":"7237f2117c7ccd4e9bcde075559166c2f457b588fcf7313c31ce989ad1980337"}}

## Validator outcomes

| Pack | CLI exit | Content | Targeted tests | Typecheck | Errors | Warnings |
| --- | ---: | --- | ---: | --- | ---: | ---: |
| slime | 0 | PASS | 23 | PASS | 0 | 0 |
| cave-insects | 0 | PASS | 23 | PASS | 0 | 0 |
| wild-beasts | 0 | PASS | 23 | PASS | 0 | 0 |
| frontier-goblins | 0 | PASS | 23 | PASS | 0 | 0 |
| fog-undead | 0 | PASS | 23 | PASS | 0 | 0 |
| mine-constructs | 0 | PASS | 23 | PASS | 0 | 0 |
| six-family-combined | 0 | PASS | 23 | PASS | 0 | 0 |

All seven CLI invocations independently passed their 21 targeted tests, typecheck, and report publisher. Five packs had Content PASS; Fog Undead and the combined pack exited 1 on the same content error below.

## Qualified content counts

- slime: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- cave-insects: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- wild-beasts: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- frontier-goblins: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- fog-undead: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- mine-constructs: {"qualifyingNewMonsters":11,"candidateNewItemIds":16,"usableNewMaterials":8}
- six-family-combined: {"qualifyingNewMonsters":66,"candidateNewItemIds":96,"usableNewMaterials":48}

## Gear functional-equivalence audit

- Canonical profile: slot, attack, defense, penetration, and effective affix eligibility; excludes sale, names, descriptions, and equipment IDs from the grouping key. Authored affixes resolve to stat/slots/tiers; baseline affixes preserve their stable ID.
- Functional clone groups: 0; all group members excluded: 0 raw items (0 are qualified gear).
- Raw equipment remaining after excluding all clone-group members: 48 / 48.
- Validator-qualified gear candidates: 48; after excluding 0 qualified clone members: 48.
- Exact clone groups: []

## Errors

- None.

## Warnings

- None.

Each CLI retained its exact JSON bytes and source snapshots before parsing. Raw command streams, exits, UTC/Taipei times, manifests, and maps are in `artifacts/` and each `cases/<pack>/.qa-runs/` directory. No source edits, full suite, or Phase 7-G/100-item acceptance occurred in this run.
