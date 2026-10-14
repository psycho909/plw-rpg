# Phase 7 Controlled Combat Raw Extraction

Input rows: 118800; grouped rank × progression band × build cells: 72; distinct row seeds: 100.
Sample counts vary by rank because each cell aggregates the catalog definitions of that rank. Percentiles use nearest-rank ordering.
Total damage taken, potion use, and fight cost are NOT AVAILABLE: raw rows contain no turn-wise incoming damage, potion count/use, or spend ledger. Net HP loss is shown only as a separate proxy; it can be affected by healing.

| Rank | Band | Build | N | Wins / deaths | Turns P10 / P50 / P90 | Remaining HP P10 / P50 / P90 | Net HP loss P50 |
|---|---|---|---:|---:|---|---|---:|
| boss | early | attack | 600 | 0 / 600 | 9 / 9 / 13 | 0 / 0 / 0 | 142 |
| boss | early | crafted | 600 | 100 / 500 | 9 / 9 / 12 | 0 / 0 / 38 | 142 |
| boss | early | defense | 600 | 100 / 500 | 18 / 23 / 26 | 0 / 0 / 84 | 142 |
| boss | early | generated | 600 | 100 / 500 | 9 / 9 / 11 | 0 / 0 / 53 | 142 |
| boss | early | legacy | 600 | 0 / 600 | 9 / 9 / 13 | 0 / 0 / 0 | 142 |
| boss | early | masterpiece | 600 | 100 / 500 | 9 / 9 / 11 | 0 / 0 / 44 | 142 |
| boss | late | attack | 600 | 600 / 0 | 5 / 9 / 10 | 24 / 55 / 86 | 100 |
| boss | late | crafted | 600 | 315 / 285 | 8 / 10 / 11 | 0 / 4 / 88 | 162 |
| boss | late | defense | 600 | 600 / 0 | 10 / 17 / 23 | 55 / 83 / 95 | 83 |
| boss | late | generated | 600 | 483 / 117 | 8 / 10 / 11 | 0 / 25 / 83 | 141 |
| boss | late | legacy | 600 | 100 / 500 | 10 / 11 / 12 | 0 / 0 / 72 | 166 |
| boss | late | masterpiece | 600 | 462 / 138 | 8 / 10 / 11 | 0 / 20 / 83 | 146 |
| boss | mid | attack | 600 | 100 / 500 | 9 / 9 / 11 | 0 / 0 / 69 | 148 |
| boss | mid | crafted | 600 | 100 / 500 | 9 / 9 / 11 | 0 / 0 / 69 | 148 |
| boss | mid | defense | 600 | 237 / 363 | 14 / 23 / 25 | 0 / 0 / 76 | 148 |
| boss | mid | generated | 600 | 100 / 500 | 9 / 9 / 10 | 0 / 0 / 74 | 148 |
| boss | mid | legacy | 600 | 100 / 500 | 9 / 9 / 14 | 0 / 0 / 6 | 148 |
| boss | mid | masterpiece | 600 | 100 / 500 | 9 / 9 / 10 | 0 / 0 / 74 | 148 |
| elite | early | attack | 1200 | 1100 / 100 | 7 / 8 / 15 | 30 / 62 / 83 | 65 |
| elite | early | crafted | 1200 | 1200 / 0 | 4 / 5 / 9 | 61 / 69 / 86 | 58 |
| elite | early | defense | 1200 | 1200 / 0 | 6 / 7 / 13 | 61 / 71 / 97 | 60 |
| elite | early | generated | 1200 | 1200 / 0 | 4 / 5 / 9 | 64 / 80 / 91 | 55 |
| elite | early | legacy | 1200 | 1100 / 100 | 7 / 8 / 15 | 30 / 62 / 83 | 65 |
| elite | early | masterpiece | 1200 | 1200 / 0 | 4 / 5 / 9 | 66 / 81 / 94 | 54 |
| elite | late | attack | 1200 | 1200 / 0 | 2 / 3 / 4 | 127 / 138 / 156 | 18 |
| elite | late | crafted | 1200 | 1200 / 0 | 3 / 3 / 5 | 109 / 135 / 146 | 27 |
| elite | late | defense | 1200 | 1200 / 0 | 3 / 4 / 6 | 118 / 137 / 150 | 25 |
| elite | late | generated | 1200 | 1200 / 0 | 3 / 3 / 4 | 114 / 138 / 146 | 27 |
| elite | late | legacy | 1200 | 1200 / 0 | 3 / 4 / 6 | 92 / 122 / 138 | 37 |
| elite | late | masterpiece | 1200 | 1200 / 0 | 3 / 3 / 5 | 114 / 138 / 146 | 27 |
| elite | mid | attack | 1200 | 1200 / 0 | 4 / 5 / 9 | 61 / 69 / 96 | 55 |
| elite | mid | crafted | 1200 | 1200 / 0 | 4 / 5 / 9 | 61 / 75 / 103 | 55 |
| elite | mid | defense | 1200 | 1200 / 0 | 5 / 7 / 13 | 61 / 73 / 112 | 59 |
| elite | mid | generated | 1200 | 1200 / 0 | 4 / 5 / 9 | 66 / 80 / 103 | 54 |
| elite | mid | legacy | 1200 | 1100 / 100 | 5 / 8 / 15 | 30 / 69 / 93 | 60 |
| elite | mid | masterpiece | 1200 | 1200 / 0 | 4 / 5 / 9 | 66 / 81 / 103 | 53 |
| miniBoss | early | attack | 1200 | 800 / 400 | 9 / 12 / 15 | 0 / 21 / 77 | 112 |
| miniBoss | early | crafted | 1200 | 1108 / 92 | 5 / 9 / 12 | 28 / 74 / 81 | 62 |
| miniBoss | early | defense | 1200 | 1200 / 0 | 8 / 12 / 16 | 60 / 74 / 91 | 56 |
| miniBoss | early | generated | 1200 | 1200 / 0 | 5 / 8 / 11 | 46 / 74 / 80 | 62 |
| miniBoss | early | legacy | 1200 | 800 / 400 | 9 / 12 / 15 | 0 / 21 / 77 | 112 |
| miniBoss | early | masterpiece | 1200 | 1187 / 13 | 5 / 8 / 11 | 46 / 71 / 80 | 65 |
| miniBoss | late | attack | 1200 | 1200 / 0 | 3 / 3 / 5 | 91 / 127 / 138 | 36 |
| miniBoss | late | crafted | 1200 | 1200 / 0 | 4 / 4 / 7 | 89 / 109 / 118 | 57 |
| miniBoss | late | defense | 1200 | 1200 / 0 | 5 / 5 / 9 | 93 / 107 / 124 | 53 |
| miniBoss | late | generated | 1200 | 1200 / 0 | 4 / 4 / 7 | 90 / 114 / 127 | 51 |
| miniBoss | late | legacy | 1200 | 1200 / 0 | 5 / 6 / 10 | 78 / 94 / 103 | 66 |
| miniBoss | late | masterpiece | 1200 | 1200 / 0 | 4 / 4 / 7 | 91 / 114 / 122 | 51 |
| miniBoss | mid | attack | 1200 | 1100 / 100 | 5 / 9 / 12 | 28 / 78 / 85 | 59 |
| miniBoss | mid | crafted | 1200 | 1108 / 92 | 5 / 9 / 12 | 28 / 80 / 85 | 59 |
| miniBoss | mid | defense | 1200 | 1200 / 0 | 6 / 12 / 16 | 60 / 76 / 93 | 55 |
| miniBoss | mid | generated | 1200 | 1200 / 0 | 5 / 8 / 11 | 46 / 80 / 86 | 59 |
| miniBoss | mid | legacy | 1200 | 800 / 400 | 7 / 12 / 15 | 0 / 21 / 69 | 112 |
| miniBoss | mid | masterpiece | 1200 | 1187 / 13 | 5 / 8 / 11 | 46 / 75 / 86 | 62 |
| normal | early | attack | 3600 | 3600 / 0 | 3 / 4 / 7 | 70 / 91 / 104 | 24 |
| normal | early | crafted | 3600 | 3600 / 0 | 2 / 3 / 4 | 91 / 100 / 110 | 16 |
| normal | early | defense | 3600 | 3600 / 0 | 3 / 4 / 7 | 95 / 106 / 114 | 10 |
| normal | early | generated | 3600 | 3600 / 0 | 2 / 3 / 4 | 94 / 100 / 112 | 14 |
| normal | early | legacy | 3600 | 3600 / 0 | 3 / 4 / 7 | 70 / 91 / 104 | 24 |
| normal | early | masterpiece | 3600 | 3600 / 0 | 2 / 3 / 4 | 94 / 102 / 112 | 12 |
| normal | late | attack | 3600 | 3600 / 0 | 1 / 2 / 2 | 115 / 158 / 166 | 3 |
| normal | late | crafted | 3600 | 3600 / 0 | 2 / 2 / 3 | 113 / 157 / 163 | 6 |
| normal | late | defense | 3600 | 3600 / 0 | 2 / 2 / 3 | 116 / 160 / 165 | 2 |
| normal | late | generated | 3600 | 3600 / 0 | 2 / 2 / 2 | 113 / 158 / 163 | 6 |
| normal | late | legacy | 3600 | 3600 / 0 | 2 / 2 / 3 | 109 / 150 / 162 | 6 |
| normal | late | masterpiece | 3600 | 3600 / 0 | 1 / 2 / 2 | 113 / 158 / 163 | 6 |
| normal | mid | attack | 3600 | 3600 / 0 | 2 / 3 / 4 | 94 / 109 / 119 | 12 |
| normal | mid | crafted | 3600 | 3600 / 0 | 2 / 3 / 4 | 94 / 110 / 119 | 11 |
| normal | mid | defense | 3600 | 3600 / 0 | 2 / 3 / 6 | 95 / 116 / 122 | 4 |
| normal | mid | generated | 3600 | 3600 / 0 | 2 / 2 / 4 | 97 / 113 / 119 | 10 |
| normal | mid | legacy | 3600 | 3600 / 0 | 2 / 3 / 6 | 71 / 104 / 118 | 16 |
| normal | mid | masterpiece | 3600 | 3600 / 0 | 2 / 2 / 4 | 100 / 114 / 119 | 10 |

Source: reports/v2/20261008-content-expansion/phase-07/j-formal-20261013/combat-attempt-05/combat-raw.jsonl.gz; seeds: 7471104, 7471105, 7471106, 7471107, 7471108, 7471109, 7471110, 7471111, 7471112, 7471113, 7471114, 7471115, 7471116, 7471117, 7471118, 7471119, 7471120, 7471121, 7471122, 7471123, 7471124, 7471125, 7471126, 7471127, 7471128, 7471129, 7471130, 7471131, 7471132, 7471133, 7471134, 7471135, 7471136, 7471137, 7471138, 7471139, 7471140, 7471141, 7471142, 7471143, 7471144, 7471145, 7471146, 7471147, 7471148, 7471149, 7471150, 7471151, 7471152, 7471153, 7471154, 7471155, 7471156, 7471157, 7471158, 7471159, 7471160, 7471161, 7471162, 7471163, 7471164, 7471165, 7471166, 7471167, 7471168, 7471169, 7471170, 7471171, 7471172, 7471173, 7471174, 7471175, 7471176, 7471177, 7471178, 7471179, 7471180, 7471181, 7471182, 7471183, 7471184, 7471185, 7471186, 7471187, 7471188, 7471189, 7471190, 7471191, 7471192, 7471193, 7471194, 7471195, 7471196, 7471197, 7471198, 7471199, 7471200, 7471201, 7471202, 7471203. All rows are CONTROLLED_LEGAL_FIXTURE_NOT_NATURAL_PLAY.
