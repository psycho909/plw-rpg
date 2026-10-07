# Phase 4-F simulation refresh preparation

This note prepares the final simulation refresh. It is not a run result. The Phase 4-A baseline remains the historical comparator; do not replace its current report paths or relabel it as final. The accepted three JSON artifacts are preserved byte-for-byte in `archive/phase4-a-baseline-loot-distribution.json`, `archive/phase4-a-baseline-combat-balance.json`, and `archive/phase4-a-baseline-run-status.json`; archive SHA256 values match their Phase 4-A originals. Their versions were also recorded through `scripts.recorded_reports.write_recorded` in the archive report log.

## Refresh gates

Do not edit or freeze the runners until Root releases the final-refresh step after both C and D source work is complete. Before that release, check the final API and catalog instead of coding against assumptions:

| Dependency | Required before runner edit | Runner consequence |
|---|---|---|
| B generation profiles | Final `awardWolfLoot` behavior and profile/rank configuration landed | Use real award calls for gray, scarred, alpha elite, pack leader mini-boss, and wolf king. Do not duplicate the new rarity tables in test code. |
| C penetration context | `playerAttackDamage` has the approved explicit optional armor-context API | Pass the actual enemy armor context to formula diagnostics and record it. Keep public `combatTurn` as the real combat path; do not alter source formulas or synthesize an armor-only damage metric. |
| D canonical boss reward | Wolf King award actually selects the boss-exclusive `moonFangSpear` at natural drop level 7 with its intrinsic penetration | Remove the synthetic hero-level+1 shortSword/chainArmor `boss` build. Include actual `awardWolfLoot` output in the canonical boss profile and compare it with a matched standard-body control. |
| Final source freeze | Root confirms B/C/D source frozen and supplies the source commit | Compute and record full `src` SHA256 manifest before and after the run; a changed source or runner hash invalidates the run. |

The current checkout has active B source changes, while the current `combatStats.ts` still exposes the pre-context `playerAttackDamage(state, monsterDefense, againstWolf?)` signature and the reward catalog has not yet added `moonFangSpear`. These are observations only; do not edit them from this task.

## Final loot metrics

Keep five rank cohorts and at least 20,000 awards per rank (100,000 total), fixed independent cohort seeds, first-50 exact replay, and per-award instance cleanup. Call the production `awardWolfLoot` path. For each rank retain gear/no-gear, rarity, affix count/id/tier, tier distribution, materials, gold, item sale values, and duplicate-like signature definition/denominator. Record the actual profile metadata from the engine rather than restating expected profile configuration as measured output.

Track three boss signals separately:

- **Exclusive base:** count actual `moonFangSpear` base drops, divided by all Wolf King awards; separately assert no non-Wolf-King rank awards this base.
- **Boss provenance:** count `provenance.bossSource === 'wolfKing'` on legendary items, with both all-award and legendary-item denominators shown.
- **Special trait:** record all Legendary weapon awards eligible for the engine special roll and the number that actually receive `moonHunter`. Publish the observed numerator and exact eligible denominator. Do not label an observed percentage as the configured 25% (or any other configured rate); material bonuses and random sampling affect observations.

Include the configured rate from the actual generation rules as a separately labeled configuration value if present, never substitute it for the observed rate. Re-run static screening only as a diagnostic and retain its explicit heuristic weights; it is not ECV. Combat Pareto remains the measured outcome classification.

## Final combat matrix and controls

Retain actual public `encounterWolf` / `combatTurn`, multiple fixed seeds, three progression bands (Early Lv1, Edge Lv4, Ready Lv5), six targets (natural normal, natural elite, controlled armored elite, and three pre-turn boss variants), and both attack/cue action policies. Ensure the Ready band is actually generated with engine progression and its metadata says Lv5/combat Lv5; do not copy the earlier run's label if setup changes. Use the same initial target snapshot, HP, pre-battle RNG, build, and actions for exact replay and save/reload assertions. Each paired build comparison shares target snapshot and starting RNG; different build RNG consumption remains a mechanic outcome.

Keep gross damage accounting with per-turn actual HP loss adjusted for actual potion healing; separate enemy healing from net HP removal. Retain public-formula damage diagnostics on cloned pre-turn state and assert against actual enemy HP change. Preserve exact uninterrupted vs reload-every-three-turn state and command equality. No manual `damageTaken` from initial/final net HP. Do not calculate economy ratio as zero when no combat gold is earned; report null plus numerator/denominator and unrecovered potion cost.

For C, compare a matched gear set with only the controlled affix/value change when measuring isolated penetration versus the armored elite. Also keep representative Common/Rare/Epic profiles so progression/build choice remains visible, with labels identifying whether gear came from generated rank profiles or detached fixture generation. Keep public-engine combat as the outcome source and mark all controlled snapshots in the report.

For D, make the canonical Boss profile from an actual `awardWolfLoot` Wolf King result at level 7, including `moonFangSpear` when awarded and its intrinsic penetration. Since reward RNG determines which body is awarded, report the sampled base distribution and avoid implying each fight shares a guaranteed spear. Pair comparisons should share a fixed legal target snapshot and compare the actual boss award item against an explicitly matched standard-body control; record item base, rarity, affixes, material, provenance, special trait, and seed for every pair. Do not silently replace the canonical award with hero-level+1 synthetic gear.

## Report outputs and validity

Keep distinct outputs for final loot distribution JSON, final combat balance JSON, run status JSON, uniquely named raw stdout/stderr, and analysis. Include source commit/full `src` hashes, both final harness hashes, start/end UTC, exit code, row/award counts, seed matrix, and `sourceStable`/`runnerStable`. Publish result and analysis reports through `scripts.recorded_reports.write_recorded` before replacing a current projection. Preserve the Phase 4-A archives and any failed final attempts; do not overwrite history.

The analysis should present Phase 4-A and final distributions side by side while keeping their schemas and source commits distinct. Summarize rank quality and economy, actual boss exclusive-base vs provenance vs special rates with true denominators, combat Pareto outcomes by powerband/build/target, armored-phase penetration utility, boss-variant difficulty, and potion burden. Recommend only small next-step directions for Root; do not alter source values or declare a pass percentage based on an arbitrary upgrade rate. Human play remains deferred and this work does not start Phase 5.
