# Phase 7 simulation runner preparation

Preparation only. Do not run a full lane until Root freezes Phase 7-I and releases the frozen source snapshot. The runner calls public engine APIs; it does not mutate production source or content.

Current formal source identity for the Phase 7-J preparation-only witness preflight: commit `e05cc78f1ef452e2672df223f2febf48444dcbd3`, recursive `src` fingerprint `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`. The `fbce7f...` fingerprint below belongs to the earlier static-typecheck preparation snapshot and is retained as historical evidence, not the current formal identity.

## Entrypoint

Run from the repository root with Vitest:

```sh
npx vitest run --config reports/v2/20261008-content-expansion/phase-07/qa_simulation.config.ts
```

The default `inventory` lane records the actual registry counts and family/rank cohorts. Formal lanes require exact frozen source identity:

```sh
PHASE7_QA_LANE=loot PHASE7_QA_EXPECT_COMMIT=<frozen-head> PHASE7_QA_EXPECT_FINGERPRINT=<src-fingerprint> npx vitest run --config reports/v2/20261008-content-expansion/phase-07/qa_simulation.config.ts
```

Set `PHASE7_QA_OUT` to a new, empty path for each run. Output files use exclusive creation for the run manifest and completion record, append-only JSONL for raw samples, and a failure JSONL containing the original error and stack. Preserve the entire run directory and Vitest stdout/stderr/exit status. Publish the compact human report through the existing `scripts/recorded_reports.py` flow after the run; do not treat the runner output alone as a published report.

## Lanes and evidence boundaries

- `inventory`: actual distinct registry definitions and family/rank cohort assignment; no simulation.
- `loot`: 100,000 calls to `awardContentLoot`, divided evenly across family/rank strata and balanced among actual definitions in each stratum. It records the individual award, materials, equipment, rarity and affixes. A parallel state mirrors the first 50 awards in each cohort to check equality and RNG/item ID advancement.
- `combat`: all actual authored monster definitions across early/mid/late and legacy/attack/defense/generated/crafted/masterpiece-eligible labels. The runner searches finite world-time values for a legal authored spawn witness, then invokes the public encounter and combat actions. `crafted` calls the public craft action; `masterpiece` uses craft-provenance generation at the recipe's smithing gate and records the actual roll, so eligibility does not imply a masterpiece result. These are controlled fixtures and do not represent ordinary natural play. Results are not encounter rates. Rejected fixture setup is a failure and is retained.
- `combat-preflight`: preparation-only witness validation for every actual monster × early/mid/late band (198 cells in the frozen catalog). It finds a shared family/monster spawn-profile context and confirms it through public `contentEncounterOptions`, without starting combat. It prefers the default spring 08:00 when legal; otherwise it records each context adjustment and its reason, including season/hour requirements. The lane still requires the frozen source identity and writes a new evidence directory.
- `economy`: actual equipment/material catalog prices and recipes, plus `planCraft` and public `craft` calls against explicitly seeded controlled fixtures. Each selected bias material is seeded in addition to recipe inputs; planned inputs must be accepted and consumed in the exact amounts. Standalone `catalogResaleOpportunityMargin` values use resale prices and recipe costs only. Actual merchant purchase prices and content-input source availability are unverified, so this is not an arbitrage result and field-economy verification remains pending Phase 7-J.
- `long`: three seeded worlds each advance continuously for 100 years, with 10/50/100-year checkpoints on the same state. Each checkpoint records population, threat, boss/crisis/cooldowns, ID sequences, event/history lengths, save bytes, save/reload equality, and one-day post-checkpoint determinism. It does not restart a world at milestones.

Content reachability is not the same measure as natural encounter exposure. The finite catalog and controlled spawn witnesses belong in a separate validator/reachability lane. Long worlds do not simulate browser/player encounter actions, so they cannot estimate authored monster encounter exposure; they report actual content-boss defeat records if any occur through background simulation. Zero natural sightings in these three seeds are still just an observation, not proof of unreachability.

## Run controls

| Variable | Default | Meaning |
| --- | --- | --- |
| `PHASE7_QA_LANE` | `inventory` | `inventory`, `loot`, `combat-preflight`, `combat`, `economy`, or `long` |
| `PHASE7_QA_OUT` | `.../qa-simulation-preparation/active-run` | Must be unique and empty for each run |
| `PHASE7_QA_EXPECT_COMMIT` | unset | Required for formal lanes |
| `PHASE7_QA_EXPECT_FINGERPRINT` | unset | Required for formal lanes |
| `PHASE7_QA_LOOT_AWARDS` | `100000` | Total awards; must divide evenly across family/rank cohorts |
| `PHASE7_QA_COMBAT_PER_CELL` | `100` | Samples for each definition × band × build cell |
| `PHASE7_QA_SEEDS` | `40131,40132,40133` | Three long-world seeds |

All formal lanes require exactly three distinct unsigned 32-bit seeds. The combat sample count and loot award count must each be positive safe integers. A failed lane records `laneSucceeded: false`; it cannot leave a success-shaped completion record. The long lane advances all three validated seeds continuously through all checkpoints.

`inventory` is not a dry execution of the large simulations. It exists to capture the frozen registry inventory before the Low executor chooses its run IDs and output directories. The source-guarded `combat-preflight` has run as a preparation check; full combat, economy, and long lanes remain unrun.

## Preparation validation

The corrected runner-only TypeScript check passed with `./node_modules/.bin/tsc -p reports/v2/20261008-content-expansion/phase-07/qa_simulation.tsconfig.json --pretty false` (exit 0, no stdout/stderr). At that earlier preparation snapshot, the full recursive `src` fingerprint was `fbce7f42289b5990b8fa68445a45cdef487277b182e0840b7ae3970b7cd6f312` before and after; raw output, exact command and full file hashes are under `static-typecheck-corrected/`. The current frozen Phase 7-J identity is recorded above and in each current preflight manifest.

A bounded Vitest run of only the harness configuration guard passed: `./node_modules/.bin/vitest run --config reports/v2/20261008-content-expansion/phase-07/qa_simulation.config.ts --reporter=verbose -t 'runner configuration guards'` (1 passed, 1 skipped; exit 0). It verified that zero/NaN combat samples and duplicate, missing, or invalid seeds are rejected and valid positive samples plus three unique uint32 seeds are accepted. Its stdout/stderr, command, exit code, and source hashes are retained under `harness-config-validation/`. This filtered run did not execute the inventory lane or any simulation sample.

Earlier static check attempts remain retained under `static-typecheck-run/`, `static-typecheck-attempt-02/`, and `static-typecheck-attempt-03/`, with their original outputs and fingerprints. The final corrected check is kept separately and is not substituted for those records.
