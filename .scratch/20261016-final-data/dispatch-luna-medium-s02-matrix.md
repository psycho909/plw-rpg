# S-02 characterization matrix (luna-medium-s02-matrix)

You ARE the assigned worker `luna-medium-s02-matrix`. Read `.scratch/20261016-final-data/common.md`.
Owner of: `src/engine/postRcS02Defender.test.ts` only (extend it). NO product source changes. Tests must assert CURRENT behavior factually and pass on current source.
Context: `reports/v2/20261016-final-qa-rc/post-rc/luna-high-s02-defender-summary.md`; code `src/engine/crisisContributions.ts`, `src/engine/civilDefense.ts` (`eligibleWorkers` excludes injured NPCs), `src/services/saveService.ts:149-175` (ledger length ≤ 16 validated), `src/engine/regionalCrisisRecognition.ts` (craft recognition sums ALL ledger rows).

## Add cases (each with a short comment stating the observed rule)
1. Defender alive with gear: counted.
2. Defender temporarily injured (`injuredUntil` in the future via the engine path if one exists, else labeled fixture): effect paused, ledger row kept, slot not released.
3. Injured defender recovers (time passes): effect resumes from the same row.
4. Permanently dead at a LOWER severity (ledger < 16 rows): replacement defender CAN receive new gear now (does the current code already release capacity below the ledger ceiling?). Assert what happens.
5. Severity 3 with 16 rows: replacement cannot (existing case) — keep.
6. Duplicate contribution of the same `instanceId`: rejected, no item/gold change.
7. Craft recognition: a dead defender's row still counts toward the crafter's threshold; contributing again after a death does not award the major recognition twice (count `regional-crisis.contribution.major` events / reputation changes).
8. Save/reload at each step (`deserialize(serialize())`) equal.
9. Crisis resolution: run to resolution; record the outcome and that the dead defender's gear is not counted; same result after a mid-way reload.
10. Determinism: two identical runs produce identical serialized state.
11. Retired / successor-chosen defender (if reachable via engine functions): same as dead? Record.
Then in your summary give a precise table: case → observed behavior → matches Owner rule? (Owner rule: permanent loss → effect stops, effective capacity released, replacement may receive new gear, no refund, no transfer, no duplicate reward, history kept; temporary injury → paused, not released). Identify exactly which cases fail the Owner rule and why (e.g. 16-row ledger ceiling), and any undefined states (e.g. job change away from guard).
Run `npx.cmd vitest run src/engine/postRcS02Defender.test.ts src/engine/crisisContributions.test.ts src/engine/civilDefense.test.ts` and `npx.cmd vue-tsc --noEmit`.
