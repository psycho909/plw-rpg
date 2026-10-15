# Phase8-E1 Worker Summary

## Work completed

- Added `scripts/phase8/pacing-analysis-core.mjs` and `scripts/phase8/run-pacing-drought.mjs` to summarize gaps, route chore risks, and cautious no-progress categories from retained A v3 compressed seed evidence.
- Added `scripts/phase8/test_pacing_analysis.mjs` (3 tests).
- Added `scripts/phase8/run-loot-pacing.mjs`; current controlled sample: `reports/v2/20261014-balance-tuning/phase-08/e-runner/loot-attempt-20261014T100851766Z/` (100,008 award calls, 24 cohorts, 1,200 deterministic mirror checks PASS).
- Wrote `reports/v2/20261014-balance-tuning/phase-08/reward-pacing.md` and `loot-reward-distribution.md`.
- The pacing report uses the latest route analysis artifact `route-pacing-attempt-20261014T101557311Z.json`, including low-confidence nearest-daily-snapshot context for no-progress markers; stale snapshots are not treated as contemporaneous action state. Property acquisition is marked NOT MEASURED.
- Kept normal scripted-route findings separate from controlled loot generation. No `src/` changes, no commit/push, no prior attempts deleted.

## Verification run

- `node --check scripts/phase8/pacing-analysis-core.mjs` — PASS.
- `node --check scripts/phase8/test_pacing_analysis.mjs` — PASS.
- `node --check scripts/phase8/run-pacing-drought.mjs` — PASS.
- `node --check scripts/phase8/run-loot-pacing.mjs` — PASS (including after metadata fix).
- `node --test scripts/phase8/test_pacing_analysis.mjs` — PASS, 3/3. Initial sandbox attempt returned `spawn EPERM`; rerun completed with approved command permission.
- `node scripts/phase8/run-pacing-drought.mjs` — PASS, analyzed all 9 A v3 route/seed samples.
- `node scripts/phase8/run-loot-pacing.mjs` — PASS, 100,008 awards / 24 cohorts / 1,200 determinism mirrors. Initial sandbox attempt returned Vite Windows-helper `spawn EPERM`; rerun completed with approved command permission.

## Pending Lead execution

- `npm.cmd run check` — pending Lead execution (full project verification was not run by this worker).

## E1 revision 2 — instrumented policy-v3 lane

- Added `scripts/phase8/run-pacing-instrumented.mjs`, reusing the validated normal-route policy v3 for Life, Adventure, Hybrid, seeds 61101–61103, three years, and gated all 9 route/seed cases through route validity. No route-policy replacement was introduced.
- Passing evidence: `instrumented-attempt-20261014T102419801Z/` — PASS, 9/9 valid; 3,240 daily rows, 50,931 actions, 50,889 decision snapshots, 1,138 encounters. Original analyzer artifact `analysis-summary-r6.json` and intermediate r7/r8 are retained; corrected analyzer output is `analysis-summary-r9.json`. Detailed per-Boss timings are in `boss-visibility.json`, with per-seed decision JSONL alongside it. This ran at current V4 crop-yield-cap HEAD `5e223beb2ef056968861bc4c7125c1fb41da8728`.
- Updated `reward-pacing.md` to retain the A v3 tables as the original baseline lane and report the new instrumentation separately. No Elite or MiniBoss was OBSERVED under v3, but Phase8-B's measured normal route reached 64 Elite / 1,103 MiniBoss encounters; B attributes v3's zero to runner over-clearing plus grayWolf tie-break, so that zero is runner-policy-defect evidence, not player exposure. Corrected no-progress classes: 1,276 low-confidence no-understandable-next-goal, 147 runner-policy-limited by the daily cap, and 0 legitimate world-wait cases.
- Craft alternatives were recomputed after timestamp joins from each craft event to its unique decision interval. Each Life seed has 676 total starterSpear craft events and 670 zero-XP crafts; Hybrid has 452/451/449 zero-XP crafts per seed. At each zero-XP moment, the only legal recipe projected was the starterSpear itself; no alternate legal recipe was available, while trade actions were projected. E-F3 reports this evidence rather than treating 676 total crafts as zero-XP crafts.
- Corrected B-F1 UI reading: PlaceWindow exposes pre-engagement rank and eligibility reasons, plus wolf reward expectation. Explicit danger estimate/recommended level was not present in inspected lines. The engine projection is not evidence that a player noticed or understood an option. E2 remains NO CHANGE based on missing human visibility/comprehension evidence.
- Lead follow-up: corrected the v3 Elite/MiniBoss zero interpretation against Phase8-B's measured normal route (`combat-balance.md`; `b-runner/normal-route-attempts/measured/attempt-20261014T045339779Z/`), which recorded Elite 64 and MiniBoss 1,103. B attributes v3's zero to runner over-clearing plus grayWolf tie-break; this is runner-policy-defect evidence, not player exposure evidence. The drought classification keeps this separate from the 1,423 no-progress marker classes.
- Added E-F1..E-F3 findings to `reward-pacing.md`: 1,276/1,423 only low-confidence no-understandable-next-goal with human clarity deferred to Human gate; visible Boss eligibility reasons but no inspected explicit danger estimate/recommended level; and no XP-yielding legal recipe alternative during zero-XP capped crafts.
- Boss interval wording now identifies the measure as route-level elapsed game time from first Boss engagement to first Boss win; Adventure 61103 includes 18 retreats and crosses from `wild_beast_apex` to `frontier_goblin_warlord`.
- `run-loot-pacing.mjs` now emits per-cohort seed/monster mappings, the mirror-seed formula, and the executing runner SHA-256 in future manifests. The existing loot attempt provenance is documented in `loot-reward-distribution.md`: cohort seed `40131 + cohortIndex`, mirror seed `99001 + cohortIndex * 100 + mirrorIndex`, historical runner SHA-256 `4e07af5ad54bf4d97fa977316fae57e97e6a7f1d2336ffe1497e883f2c3fc90b`. The existing loot run was not repeated.
- No source changes, no D files touched, no attempts deleted, no commit/push. Previous failed attempts remain preserved.

## Verification status

- `node scripts/phase8/analyze-pacing-instrumented.mjs reports/v2/20261014-balance-tuning/phase-08/e-runner/instrumented-attempt-20261014T102419801Z` — PASS (standalone command; final corrected output saved as `analysis-summary-r9.json`; r6–r8 retained).
- `node --check scripts/phase8/run-pacing-instrumented.mjs` — PASS.
- `node --check scripts/phase8/analyze-pacing-instrumented.mjs` — PASS.
- `node --check scripts/phase8/pacing-analysis-core.mjs` — PASS.
- `node --check scripts/phase8/test_pacing_analysis.mjs` — PASS.
- `node --check scripts/phase8/run-loot-pacing.mjs` — PASS.
- `git diff --check -- reports/v2/20261014-balance-tuning/phase-08/reward-pacing.md reports/v2/20261014-balance-tuning/phase-08/loot-reward-distribution.md reports/v2/20261014-balance-tuning/phase-08/e-runner/e1-summary.md scripts/phase8/analyze-pacing-instrumented.mjs scripts/phase8/pacing-analysis-core.mjs scripts/phase8/test_pacing_analysis.mjs scripts/phase8/run-loot-pacing.mjs` — PASS.
- `node --test scripts/phase8/test_pacing_analysis.mjs` — PASS, 4/4, including the regression for six XP-yielding crafts preceding the first zero-XP event.
- `npm.cmd run check` — pending Lead execution; not run by worker.
