# Phase 6-H History and Identity Implementation

Status: H source candidate frozen after focused regressions, typecheck, and production build; independent review pending. Base source commit is `ec7bd32b5f81c433ecd07bbbcd43c1a51af6ea70`. Workflow used `cloud-environment-onboarding:setup` and project-adapted `matt-skills-curated:implement` / `matt-skills-curated:tdd`.

## Recognition rules

- Supply recognition is per donor and current crisis. The existing ledger metric is `food credits / 4 + gold credits / 5`; only a public contribution changing the total from below 5 to at least 5 awards +3 reputation and one major history event. Food and gold remain ordinary gameplay events. A loaded ledger already above the threshold does not receive a retroactive award.
- Craft recognition sums `civilDefenseGearEffect(sourceItem.rolledStats, slot, 10)` across equipment allocations grouped by original `craftProvenance.createdBy`. Only a crossing from below 1.0 to at least 1.0 awards the craft recognition. The current owner can be a different character. A deceased original crafter retains the major history attribution by name and ID; existing `changeReputation` ignores the dead character, so the reward is not transferred to a successor.
- Adventure recognition runs only when the existing camp objective changes the current crisis fact from `campRaidAt: null` to a timestamp. It records +3 reputation and one major history event. Ordinary Goblin hunts, Chief defeats, late victories, failed attempts, and death during an in-flight raid do not enter this path. The Chief's existing +12 reputation stays unchanged.

Recognition uses existing bounded reputation history, milestones, and `emit(..., true)` major history. Monotonic contribution credits, craft allocations, and the camp fact provide once-only behavior. No new identity, Smithing action, reward ledger, save field, migration replay, or Save8 was added. Existing identity requirements and history caps remain in force.

## Atomic event capacity

A threshold crossing reserves up to three event IDs before any asset, gold, contribution ledger, or reputation mutation: ordinary gameplay contribution, a possible first reputation-rank event, and the major event. The capacity check requires the resulting sequence to remain below `Number.MAX_SAFE_INTEGER`. A crossing at `MAX_SAFE_INTEGER - 3` is rejected with the complete state unchanged; at `MAX_SAFE_INTEGER - 4`, all three events emit and the resulting state saves and reloads at `MAX_SAFE_INTEGER - 1`. Equipment contribution uses the same preflight before consuming its item.

Camp recognition is emitted inside the existing canonical combat resolver. The E full-state preflight therefore includes the new reputation and major-history events. A public start→victory projection test measures the complete event count, then verifies a successful last-saveable boundary and save/reload. The clone performs no real-world journal or RNG work.

## Evidence

- Original supply RED and pre-fix hashes: `h-red-supply.txt`; broader supply/camp/capacity RED and hashes: `h-red-contribution-recognition.txt`.
- Craft fixture calibration attempt retained separately in `h-attempt-craft-effect-fixture.txt`; the initial effect assumption was wrong, and the test was corrected to use a valid starter-spear crafted snapshot where two items cross the 1.0 threshold.
- Focused regression: 211 passed across 7 files, `h-green-regression.txt`. Covered supply food/gold normalization, reload/no replay, separate creator aggregation, dead creator/successor attribution, Chief's unchanged +12, ordinary hunt exclusion, camp victory credit, and supply/equipment/camp capacity boundaries.
- `npm run build`: passed `vue-tsc --noEmit` and Vite production build, `h-build.txt`.
- `git diff --check`: passed.

Source and evidence hashes, including the canonical source fingerprint, are in `h-source-freeze.json`. This is a frozen candidate for independent review, not an H acceptance claim.

## Test-only follow-up

Independent review found that the H supply and craft public-seam tests should assert that recognition does not advance `worldTime` or `rngState`. Those assertions were added without production-source changes. `crisisContributions.test.ts` passed 24/24 (`h-green-rng-followup.txt`), and `npx vue-tsc --noEmit` passed (`h-typecheck-rng-followup.txt`). The earlier 211-test focused regression and production build remain the final evidence for unchanged product source.
