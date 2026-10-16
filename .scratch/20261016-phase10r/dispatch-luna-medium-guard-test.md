# Phase10-R fix round 2 ??P3-02 guard test strength (luna-medium)

Read `.scratch/20261016-phase10r/common.md` (rules still apply). Owner of: `src/engine/phase10rSaveInvariant.test.ts` only. Do not touch other files. No commit/push. Do not change production code.

Independent review finding (confirmed by lead):
P3 `src/engine/phase10rSaveInvariant.test.ts:118` ??the dead/combat/dungeon guard test for `convertCropGoodToFood` gives the actor no convertible crop good, so the call already fails for "not enough material"; removing the new guard would not fail the test. Fix the test: give the actor enough `spring_pea_good` (or the correct crop good) so that the same call succeeds for an available actor (add a positive control), then assert each blocked mode is rejected with the action-blocker reason/message (not the shortage one) and state is unchanged.
Prove strength: temporarily disable the guard in `src/engine/rewardActions.ts` locally, show the new test fails, then restore the file exactly (`git diff -- src/engine/rewardActions.ts` must be empty against HEAD). Record that RED output.
Verify: `npx.cmd vitest run src/engine/phase10rSaveInvariant.test.ts src/engine/rewardActions.test.ts` and `npx.cmd vue-tsc --noEmit`.
Output `reports/v2/20261016-final-qa-rc/phase-10/r-runner/r3-luna-medium-guard-test-summary.md`; reply with only that path.
