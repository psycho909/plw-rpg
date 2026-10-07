# Phase5-A baseline — economy, materials, access

Captured at `1a56cd3eeb2ea65114a5dcf03c0e00504b69239f` on 2026-10-07T02:03:03.616930+00:00. This is a static source baseline: action rates/prices are defined behavior, not a newly run economy simulation.

## Verification

`npm run check` exited 0; 20/20 test files and 330/330 tests passed; `vue-tsc --noEmit` and production `vite build` passed (78 modules transformed). Complete raw output is in [`reports/v2/20261007-life-craftsmanship/phase-05/baseline-check-20261007T020303Z/stdout.log`](reports/v2/20261007-life-craftsmanship/phase-05/baseline-check-20261007T020303Z/stdout.log) and [`reports/v2/20261007-life-craftsmanship/phase-05/baseline-check-20261007T020303Z/stderr.log`](reports/v2/20261007-life-craftsmanship/phase-05/baseline-check-20261007T020303Z/stderr.log); environment versions are in [`reports/v2/20261007-life-craftsmanship/phase-05/baseline-check-20261007T020303Z/environment.json`](reports/v2/20261007-life-craftsmanship/phase-05/baseline-check-20261007T020303Z/environment.json).

All 74 tracked `src` file hashes match Phase4 delivery manifest `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245` (delivery commit `39621ec9b5833f24c4105d5bf705ff2b984da3a2`). The full current hash map is recorded in `baseline.json`. Reused Phase4 loot/combat evidence only after this equality check: 100,000 loot awards, 4,320 combat rows, and 8,640 actual fight runs; no identical large simulation was rerun.

## Ordinary material and gold income

Normal noncombat material gathering already exists. At skill level 1, forest gathering yields 2 wood and mine gathering yields 2 stone or 2 iron; each action spends 10 stamina and 43 world minutes, grants 4 gold, and awards 10 skill XP. Higher skill adds one material per two levels. Forest and mine stocks regenerate by 10 and 8 daily respectively. Approximate deterministic starting rates per gather action are therefore 2 units and +4 gold, before travel/rest/time constraints.

| Material | Gather location | Gathered/action at Lv1 | Store buy | Store sell |
|---|---|---:|---:|---:|
| Wood | Forest | 2 | 8 | 4 |
| Stone | Mine | 2 | 6 | 3 |
| Iron | Mine | 2 | 16 | 8 |

Wolf loot provides a separate resource track: wolf fang is guaranteed per wolf kill; hide chance is 25%; moonstone is profile-chance loot (3%, 4%, 8%, 15% by gray wolf through pack leader); Phase 4 measured 601 moonstones from 20,000 gray-wolf awards (3.005%) and a guaranteed boss material. Their sale values are 5, 5, and 25 gold. Material definitions already include affix biases/special bonus, but source copy says workshop crafting is later. Generic legacy `material` is a store item (buy 20/sell 10), distinct from these typed wolf materials.

## Sells and sinks

Procedural equipment sale value is `max(1, floor(base sell × rarity multiplier))` (common 1×, uncommon 1.5×, rare 2×, epic 3×, legendary 5×). Current source adds no value for affixes, quality, or provenance. Exact base/rarity values are in `baseline.json`. Normal sinks include stamina/time for gathering, inn (8 gold), tavern (3 gold), store purchases, and hiring companions (stage/reputation-dependent hiring fee plus 4 gold daily wage for a three-day contract). Farm actions consume stamina/time; harvesting yields food and +1 reputation, not gold. No crafting material or service sink currently exists.

## Smith access and life state

A fresh save starts in hamlet; blacksmith is added only when settlement growth reaches 85 and village stage begins. The shop runs 08:00–18:00 and requires proximity, living player, and no combat/dungeon. Current blacksmith UI sells/buys legacy sword/armor and procedural item sales; no player crafting action or crafting skill exists. Skills are combat, farming, mining and woodcutting. Mining actions can develop miner/skilled-miner identity; general character reputation, history and ownership/property data already persist, but no crafting identity/reputation hook is present.

Exact source references and all prices are indexed in [`exploration.md`](exploration.md).

## J environment recheck

Checked 2026-10-07T09:32:58.277273+00:00: Node v24.19.0, npm 11.9.0, Python 3.12.14, system Chromium 151.0.7922.173 (Debian 13), Linux 6.18.44. After transient executor reconnection, versions and source HEAD f9f969c9d3dfa3cbf1c379bec98eafab765b11cc remain unchanged. Production source/build/helper provenance checks remain required before each browser run.
