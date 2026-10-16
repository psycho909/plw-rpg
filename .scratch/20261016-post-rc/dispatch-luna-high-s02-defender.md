# Task C — S-02 defender equipment (luna-high-s02-defender)

You ARE the assigned worker `luna-high-s02-defender`. Read `.scratch/20261016-post-rc/common.md` (rules apply).

## Finding (external review S-02)
"已交付給防衛者的裝備，只在該防衛者仍位於 `slice(0, targetDefenders)` 時計分。對方受傷、退休、死亡或被選為接班人後，裝備效果消失，但仍佔用分配上限。" Source: `reports/v2/20261016-final-qa-rc/phase-10/Oakvale-V2x-External-Code-Review.md` (S-02).

## Read
`src/engine/crisisContributions.ts`, `src/engine/civilDefense.ts`, `src/engine/regionalCrisis.ts`, related types in `src/domain/types.ts`, existing tests `crisisContributions.test.ts`, `civilDefense.test.ts`, `crisisResolution.test.ts`, and any spec/contract text about defender equipment allocation (search `docs/` for 防衛/民防/defender/equipment allocation).

## Do
1. Build a minimal reproduction as a NEW test file `src/engine/postRcS02Defender.test.ts` (you own only this file):
   legal crisis state → deliver equipment to a defender through the existing contribution API → record `equipmentEffect` and allocation slots/count → move that defender into an existing legal state (injured / retired / dead / chosen successor — whichever the engine supports via existing functions) → recompute → compare effect, used slots, remaining allocatable slots, persisted data → `deserialize(serialize())` and compare again.
2. Write the test to assert the CURRENT behavior factually (it must pass on current source) and document which observations are: legitimate effect loss, unreasonable permanent slot occupation, a spec violation, or an undefined design question. Do not "fix" anything.
3. If you believe there is a clear spec violation, describe the minimal fix (file:line, what changes, risk) in your summary — do NOT implement it.
4. Run `npx.cmd vitest run src/engine/postRcS02Defender.test.ts src/engine/crisisContributions.test.ts src/engine/civilDefense.test.ts` and `npx.cmd vue-tsc --noEmit`.

Output `reports/v2/20261016-final-qa-rc/post-rc/luna-high-s02-defender-summary.md`: repro steps, observed numbers, classification (CONFIRMED DEFECT / VERIFIED SAFE IN TESTED SCOPE / PRODUCT DECISION REQUIRED / NOT TESTED) with the spec evidence (quote file:line), proposed minimal fix if any, test results. Reply with only that path.
