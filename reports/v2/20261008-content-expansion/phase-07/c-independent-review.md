# Phase 7-C Core Independent Review — Initial Findings

Status: two blocking source findings captured; the broader core audit remains in progress.

## Scope and provenance

Reviewed the frozen Phase 7-C/B source snapshot on branch v2x/reward-core, HEAD a1307d220a68213be6465bc40e0a85af8ec605a3. The source map in c-core.md has SHA-256 b7c04fbc837c246319016d588a8a94a4ec632ed4e40ab0e0a0ef4ce445791346; all 26 mapped files still match their recorded SHA-256 values. The four separately reviewed fixture-correction tests are outside this 26-file map.

This is a read-only review. I did not modify source or run tests. The implementer reported 365 targeted tests and vue-tsc passing on the freeze. The later full npm check record reports 552/557 passing; its final retry remains pending, and the long-world timing margin still requires Phase 7-J profiling.

## Blocking findings

**C1 — P1: A boss victory can omit its cooldown and retain a reusable form when the director cooldown map fills during the encounter.**

The generic save validator accepts up to 100 cooldown entries with arbitrary short string keys and safe-integer values (src/services/saveService.ts:455-465). At 99 entries, boss eligibility permits a new form because it blocks only at 100 (src/engine/contentFamilies.ts:107-115). During a day boundary, the living-event tick writes director:lastDailyTick as another key (src/engine/livingEvents.ts:409-425; reached through src/engine/simulation.ts:349-355,414-426). With 99 entries before the boundary, this can leave exactly 100 entries in a valid save while the boss form remains persisted.

On later victory, recordContentBossDefeat returns false when the boss key is absent and the map already has 100 entries; it exits before applying the world consequence, writing cooldown, or deleting the saved form (src/engine/contentFamilies.ts:274-291). The victory caller ignores that return value after awarding loot/experience and clearing combat (src/engine/actions.ts:295-312). The form remains. Boss eligibility bypasses cooldown while a form exists, and re-encounter resumes that form (src/engine/contentFamilies.ts:80-89,225-239). The reward validator accepts the form and the generic save validator accepts exactly 100 entries (src/services/rewardValidation.ts:202-223, src/services/saveService.ts:455-465).

Source-derived reproduction path (not executed): create a valid Save 8 / Reward 3 state with 99 unique non-content-boss cooldown keys and a quiet period; meet Slime boss predicates and form slime_heart; preserve the form while crossing midnight so director:lastDailyTick becomes key 100; save/reload; at a later eligible spawn time defeat the boss; then query/start it again. The defeat recorder refuses key 101, but combat still reports success and leaves the form, which bypasses cooldown and is reused without a new formation draw.

A related boundary variant can exceed the save cap: if defeat writes key 100 immediately before the daily boundary, the tick writes key 101. serialize does not validate before returning JSON, while reload rejects maps over 100 entries. Cover both paths in the same capacity fix.

**C2 — P1: Every outdoor authored-family victory advances dungeon progress, eventually granting a false clear and producing an unloadable state.**

The victory branch applies outdoor threat/reputation handling only when both not a dungeon and not an authored-family payout (src/engine/actions.ts:313). The else branch then increments dungeon.stage and, at the configured three encounters, increments dungeon.runs, grants iron, and emits dungeon.cleared (lines 332-339). An outdoor Slime win sets contentFamilyPayout=true, so it enters that dungeon branch despite monster.dungeon=false.

Source-derived reproduction path (not executed): the normal authored encounter flow creates a Slime fight in the forest; a victory through combatTurn then increments dungeon.stage from its current value. Starting from stage 0, the third outdoor content victory reaches DUNGEON.encounters.length and grants a dungeon clear/reward despite never entering the mine. The fourth outdoor content victory increments stage beyond that length. saveService.ts:119 rejects such a state on reload because stage must not exceed the configured encounter count. The existing closure test performs one real Slime victory but checks only threat/crisis state (contentFamilies.test.ts:51-62), so it misses dungeon stage/runs/iron changes.

Required resolution: keep outdoor family victories out of both Goblin-threat and dungeon branches (while actual dungeon wins retain existing progression). Add assertions that content wins leave the entire dungeon state and legacy inventory rewards unchanged, including after enough wins to hit the former boundary; confirm the resulting save reloads.

## Current assessment

Standards review: no separate code-standard finding identified in audited paths so far; review remains in progress.

Specification review: **BLOCKED** by C1 and C2. The content plan requires boss defeat/cooldown to end the frozen form and preserves the 100-key boundary (content-plan.md:26-28); it describes spawn through region/progression/threat/season/time predicates without adding dungeon-depth progression (content-plan.md:28,49). The formal spec requires boss defeat/escape/reload and cooldown behavior (V2X-PHASE7-CONTENT-EXPANSION.md:250-262).

Disposition: **do not accept or release C until both findings are resolved and the complete core audit and required gates finish.**
