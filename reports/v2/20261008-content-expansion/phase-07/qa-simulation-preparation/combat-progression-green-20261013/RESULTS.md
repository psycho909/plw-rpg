# Combat fixture progression correction

Candidates are evaluated on fresh same-seed probe states. The selected level is applied once to the real fixture via exported `gainExp(state, character, 15 * L * (L - 1))`; the fixture no longer assigns `character.level` directly. Both the probe and final fixture are checked through `contentEncounterOptions`, and the public `encounterContentMonster` action starts the encounter.

The focused regression verifies slime_slick/mid reaches level 3 with 90 XP applied, exp 0, strength 12, vitality 10, maxHp 112, and hp 112. Applied XP and progression stats are included in witness preflight rows, combat raw samples, and controlled setup metadata.

Focused fixtures: 7 passed. Runner TypeScript check and `git diff --check` passed. The source fingerprint remains `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`. No formal combat, economy, or long lane was run.
