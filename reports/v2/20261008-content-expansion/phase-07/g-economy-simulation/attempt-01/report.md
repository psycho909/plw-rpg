# Phase 7-G runner-driven crop economy simulation

**Result:** The released crop data does not produce one crop that leads both food throughput and sale-gold throughput. It does make four-plot farming a low-input activity: all 12 crops, including wheat, planted and harvested with zero gold input cost; new crop goods can be converted to food or sold through existing APIs. Spring pea leads measured food throughput at all tested levels. Marsh rice leads sale gold per day at levels 1 and 3; orchard apple leads at level 6. The ticket and approved plan state “no risk-free arbitrage” as a goal, but set no numeric balance threshold, so these observations support a balance review rather than a numeric pass/fail claim.

## Runner and evidence

- HEAD: `e05cc78f1ef452e2672df223f2febf48444dcbd3`.
- Final runner result: exit 0; 108 measured scenarios (12 crops × 3 fresh world seeds × farming levels 1, 3, and 6). All three seeds reproduced the same observations for each crop and requested level.
- The runner loaded public engine exports with Vite SSR and called `createGame`, `walkTo`, `farm`, `simulate`, `convertCropGoodToFood`, `tradeMaterial`, and `trade`. It ran four plots per crop in each scenario. It also checked an unavailable season for every new crop across all 99 corresponding scenarios; each planting was rejected without state mutation. Wheat was checked in its all-season availability.
- Each four-plot farm batch used 180 action minutes and 56 stamina: four prepares, four plants, and four harvests. Required farm world time was growth time plus those 180 minutes. The API charged zero gold for planting or other farm inputs; no seed or fertilizer inputs exist on this path.
- Wheat harvests inventory food directly; the runner sold that food through `trade(state, 'food', false)` at the configured 5 gold per unit. New crop goods were sold one unit at a time through `tradeMaterial`, at their registered sell prices. Crop goods were also converted on a cloned post-harvest state through `convertCropGoodToFood`; observed food matched `harvest amount × foodValue` in all 108 rows. Conversion used no world time or stamina.
- Per-day values below are four-plot batch projections from measured four-plot yield and actual elapsed world time. Food/day divides by the prepare-to-fourth-harvest time. Gold/day additionally includes store travel, any wait for store opening, and the measured five-minute-per-unit trade actions. Each rate extrapolates one crop cycle and does not simulate seasonal reseeding over a year.

## Four-plot cycle observations

The two skill columns show the requested starting farming level. The farm actions grant experience during the batch: actual harvest levels were `2|2|2|3` from level 1, `3|3|3|4` from level 3, and `6|6|6|6` from level 6. Cycle food is food-equivalent; cycle gold is observed proceeds from selling the full output stack. Every row reproduced identically across the three seeds.

| Crop | Planting seasons | Growth (h) | Farm elapsed (min) | Food-equivalent / batch (L1 / L6) | Sale gold / batch (L1 / L6) |
|---|---|---:|---:|---:|---:|
| Legacy wheat | Spring, summer, autumn, winter | 48 | 3,060 | 25 / 40 | 125 / 200 |
| `spring_pea` | Spring | 12 | 900 | 21 / 36 | 42 / 72 |
| `field_turnip` | Spring, autumn | 24 | 1,620 | 29 / 44 | 87 / 132 |
| `summer_barley` | Summer | 48 | 3,060 | 37 / 52 | 148 / 208 |
| `sun_pepper` | Summer | 36 | 2,340 | 42 / 72 | 105 / 180 |
| `forest_bean` | Summer, autumn | 48 | 3,060 | 58 / 88 | 174 / 264 |
| `autumn_pumpkin` | Autumn | 96 | 5,940 | 90 / 120 | 315 / 420 |
| `orchard_apple` | Autumn | 48 | 3,060 | 50 / 80 | 200 / 320 |
| `winter_cabbage` | Winter | 72 | 4,500 | 87 / 132 | 261 / 396 |
| `frost_root` | Winter | 96 | 5,940 | 75 / 120 | 250 / 400 |
| `marsh_rice` | Summer, autumn | 96 | 5,940 | 111 / 156 | 407 / 572 |
| `cave_mushroom` | Spring, autumn, winter | 72 | 4,500 | 63 / 108 | 252 / 432 |

## Measured four-plot rates per day

| Crop | Food-equivalent/day (L1 / L6) | Sale gold/day (L1 / L6) |
|---|---:|---:|
| Legacy wheat | 11.8 / 18.8 | 55.8 / 87.3 |
| `spring_pea` | 33.6 / 57.6 | 39.1 / 64.0 |
| `field_turnip` | 25.8 / 39.1 | 69.4 / 101.1 |
| `summer_barley` | 17.4 / 24.5 | 64.9 / 89.1 |
| `sun_pepper` | 25.8 / 44.3 | 50.7 / 84.7 |
| `forest_bean` | 27.3 / 41.4 | 77.2 / 114.5 |
| `autumn_pumpkin` | 21.8 / 29.1 | 73.1 / 96.3 |
| `orchard_apple` | 23.5 / 37.6 | 89.3 / 139.6 |
| `winter_cabbage` | 27.8 / 42.2 | 80.2 / 119.8 |
| `frost_root` | 18.2 / 29.1 | 59.0 / 93.2 |
| `marsh_rice` | 26.9 / 37.8 | 95.1 / 132.0 |
| `cave_mushroom` | 20.2 / 34.6 | 78.1 / 131.8 |

## Supply path and interpretation

An additional public-API run bought land and a farm business (360 gold total), harvested 21 spring-pea goods from four plots, converted them into 21 food, then supplied two food through `supplyFarmFood`. The inventory fell from 24 to 22 food, settlement food rose from 86 to 88, and the business recorded two supplied food. This confirms the crop output can feed the existing ownership supply path after conversion; it is a separate setup scenario with stage, reputation, and starting gold set to make the purchase eligible.

Measured facts are that the farming loop charges time and stamina, has no gold input cost, and makes the new output both convertible and saleable. Spring pea leads food/day under this batch method; orchard apple leads sale gold/day at starting levels 1 and 6; no crop leads both measures. Season locks constrain repeated planting, and the sale-rate procedure includes the actual wait and travel in each batch. Recommendation: retain this as balance evidence and decide the acceptable rate against the intended game economy before calling the “no risk-free arbitrage” goal met. Neither the G ticket nor the approved crop plan provides a numeric cutoff. This run did not execute the broad test suite or a browser/user smoke test.

## Source and raw artifacts

The requested HEAD was unchanged. SHA-256 hashes for the runtime, registry, authored crop pack, pricing, and configuration files are in `source-sha256-before-selected.txt` and `source-sha256-after-selected.txt`; the selected hashes match before and after the run. The tracked source-file hashes present at runner start are preserved in `source-sha256-before-working-tree.txt`.

Raw evidence is in `raw-rows.csv`, `raw-rows.json`, `summary.json`, `stdout.txt`, `stderr.txt`, and `exit-code.txt`. `runner.mjs` is the reproducible runner. Earlier corrected runner outputs and the first store-hours failure are retained in their `superseded-*` and `runner-failure-01` folders; use only the parent directory’s final raw rows for this result.
