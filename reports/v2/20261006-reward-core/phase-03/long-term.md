# Phase3 long-term engine validation

Source base `6568b466390d06e6be0af2585e7524b9415204b8` + exact 74-file sourceSha256 in simulation-status.json; source/harness stable during run.

**PASS:** seeds17/909/2026, each10/50/100 game years;9 save/load checkpoints. Same world seed, exact elapsed world time, finite numbers, retained500 unique canonical equipment IDs/original owners, bounded current events/history, unique NPC IDs, retained boss root form and exact reload/idempotence. Natural death and chosen living successors are part of the simulation.

| Seed | Years | Population | History | Save bytes | Save ms | Load ms | Generations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 17 | 10 | 80 | 94 | 359715 | 2.87 | 12.27 | 1 |
| 17 | 50 | 79 | 291 | 414301 | 1.93 | 5.29 | 1 |
| 17 | 100 | 78 | 614 | 478580 | 2.52 | 5.87 | 2 |
| 909 | 10 | 80 | 97 | 363093 | 2.05 | 5.06 | 1 |
| 909 | 50 | 78 | 297 | 426135 | 2.39 | 4.55 | 1 |
| 909 | 100 | 80 | 610 | 477187 | 2.51 | 6.84 | 2 |
| 2026 | 10 | 80 | 103 | 375816 | 2.06 | 3.96 | 1 |
| 2026 | 50 | 80 | 287 | 448164 | 2.97 | 4.50 | 1 |
| 2026 | 100 | 80 | 644 | 518204 | 4.75 | 5.37 | 2 |

The fixture supplies500 canonically generated items and controlled pre-existing family progression/location; it then forms/flees a boss through production engine commands. It is a data-volume/save-stability test, not100 years of active-player looting and not elapsed browser play. The500-item inventory remains fixed across years, so it does not prove a bound on indefinite loot accumulation. Load/save timings are individual observations on this cloud environment, not an SLA.

240 repeated controlled family fights also passed:120 unique scenarios (12 seeds ×5 definitions ×2 policies), same-actions replayed twice with exact state equality and mid-combat saves. Allthree boss variants occurred (24 boss scenarios:14 wellFed,6 starved,4 moonlit). Fixture outcomes are120/120 wins; this does not approve normal-play balance.

The100-year saves are0.48–0.52MB in these fixtures. Existing append-journal/export scalability findings C01/C02 and browser retention finding C03 are not cleared by this engine test. Browser metrics are documented separately after the actual timed run.

Human play/Fun Gate/Retention Survey: **DEFERRED / NOT APPLICABLE AT THIS STAGE**; not an engineering blocker.
