# Combat result HP projection correction

Raw `remainingEnemyHp` is now a three-state measurement: current combat HP while an encounter remains active, zero when combat is cleared and the player is alive (victory), and `null` when combat has been cleared because the active player died. Win/death counting is unchanged.

The RED test reproduced the prior `state.combat?.hp ?? 0` behavior after `die()` cleared combat: death was reported as enemy HP 0. The focused GREEN test covers active combat, cleared victory, and cleared death. No formal lane was run; completed attempt-04 artifacts were preserved.

Frozen source fingerprint was rechecked as `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`. Latest QA runner SHA256 is recorded in `runner-sha256.txt`.
