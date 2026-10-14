# Phase8-B2 Pending Lead Commands

## Diagnosis and runner corrections

- The Boss reward errors are a runner detection defect, not an engine defect. On victory, awardWolfLoot and awardContentLoot choose the Boss exclusive equipment base, generate an ItemInstance, and append it to reward.instances. generateItem stores provenance only for legendary items; non-legendary Boss reward rarities have provenance null. The previous runner incorrectly required provenance.bossSource to be present.
- Boss acquisition now identifies the new owned instance by its unique exclusive base and instance ID, accepting absent provenance while checking an explicit bossSource when one exists. The first-kill exclusion also checks the target's exclusive base, so missing provenance cannot mask use of the target's own drop.
- A RUNNER_ERROR is retained on its cell and the job continues through remaining cells. The 14-minute hard stop still marks later cells not run.
- The mid Boss Gear attempt's wild_beast_apex death is a failed source acquisition candidate, not evidence of a victory without loot; the runner may try other Boss sources.
- No src files changed. All earlier timestamped attempts remain intact.

## Incomplete acquisition evidence retained as data

- Adventure Loot: 36 INCOMPLETE cells total — early 5 cells with 100/300 sample rows each; mid 18 cells (7 with 100/300 and 11 with 200/300); late 13 cells with 200/300. All reached the 18-candidate acquisition bound. The early group includes one candidate with no legal spawn witness; the remaining incomplete causes are missing a matching dropped style item.
- Masterpiece: 64 INCOMPLETE cells total — early 10, mid 28, late 26; every cell retained 200/300 sample rows. Each ended at the 16-craft bound because ironShortSword attempt 16 was not a matching masterpiece at Smithing 6.
- Do not rerun or raise these bounds: these observations are evidence about drop and masterpiece rarity, and retrying the 100 incomplete cells is not a cheap extension of the approved matrix budget.

## Already completed; not pending

- Lead reports all Phase8 node --check commands PASS, node --test 13/13 PASS, manifest PASS, and Boss save/reload 2/2 PASS.
- Legacy and Crafted jobs passed for all three bands. Route attempts, route-combat summary, and their inputs did not change.
- Only the three Boss Gear jobs need rerunning after the detection and cell-continuation fixes.

## Pending commands, in order

1. Syntax-check the three changed Phase8 scripts:

   node --check scripts/phase8/controlled-matrix-core.mjs
   node --check scripts/phase8/test-controlled-combat-matrix.mjs
   node --check scripts/phase8/run-controlled-combat-matrix.mjs

2. Run the focused controlled-matrix helper tests:

   node --test scripts/phase8/test-controlled-combat-matrix.mjs

3. Rerun only the affected Boss Gear band jobs sequentially; retain every new attempt:

   node scripts/phase8/run-controlled-combat-matrix.mjs --band early --source boss-gear
   node scripts/phase8/run-controlled-combat-matrix.mjs --band mid --source boss-gear
   node scripts/phase8/run-controlled-combat-matrix.mjs --band late --source boss-gear
