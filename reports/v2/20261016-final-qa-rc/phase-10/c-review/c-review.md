# Phase10-C Review

## Scope and snapshot

- Ticket: `tickets/20261016-v2x-10c-reward-signals.md`; request: `.scratch/20261016-phase10/review-c-med.md`; governing spec: `docs/specs/V2X-PHASE10-FINAL-QA-RC.md` §§4, 7.
- Baseline: Phase10-A HEAD `baa2a2947be643fc847a2a731e3479d6287a6150`; review HEAD `4a71d3599cdf17ac3dab189d88e16fabcebe5033`, branch `v2x/reward-core`.
- Reviewed deliverables: `reward-retention-signals.md`, `content-coverage.md`, `c-runner/c-summary.md`, `c-runner/evidence-summary.json`, `scripts/phase10/c-reward-retention.mjs`, and `src/engine/phase10GoalContinuity.test.ts`; relevant source and Phase8 trace evidence were read for correlation/spot-check.
- Commands: `git diff --cached -- reports/v2/20261016-final-qa-rc/phase-10/reward-retention-signals.md reports/v2/20261016-final-qa-rc/phase-10/content-coverage.md reports/v2/20261016-final-qa-rc/phase-10/c-runner scripts/phase10/c-reward-retention.mjs src/engine/phase10GoalContinuity.test.ts`; the same paths with `git diff --`; and `git diff baa2a2947be643fc847a2a731e3479d6287a6150...HEAD --` with those paths. Also `git ls-files --others --exclude-standard` to identify new files. The diffs are empty because the C deliverables are new untracked files; they were read in full. No files were changed by this review.
- Reviewer: requested Luna Medium reviewer role; runtime identity is not independently observable. This reviewer handled Phase10-A and did not participate in C implementation. Standards and Spec were checked in separate sections. The project review fallback was used without spawning two additional agents; no Independent Audit was requested.

## Standards

No confirmed implementation defect in the report-generation script or test organization. The script reads the fixed Phase8 instrumented run, records its source manifest/fingerprint and hashes `analysis-summary-r9.json`; it does not rerun the large simulation. The reports correctly disclose that Phase10-A semantic validation passed while the validator wrapper's child checks and publication were incomplete.

One verification limit: the C runner summary records `npx.cmd vitest run src/engine/phase10GoalContinuity.test.ts` as 3 tests passed, but `c-runner/` contains no raw command log. This review inspected assertions but did not rerun tests under the review-only request.

## Spec

### P2 — Goal-continuity test does not verify hint destination legality

`src/engine/phase10GoalContinuity.test.ts:199-216` checks emitted hint IDs and some eligibility/state predicates, but never checks `hint.position` or `hint.where` against the canonical destination for the suggested action. For example, the crop branch at lines 208-211 verifies only farmland plus an available crop. If a future change kept the crop ID/status but routed its button to the mine, this test would still pass. The report's characterization that each hint is backed by a legal current action (`reward-retention-signals.md:82`; `content-coverage.md:11`) is therefore broader than this assertion set.

Current source uses canonical `REGION_DESTINATIONS` values in `src/presentation/goalHints.ts`, and this review found no misrouted hint; this is a regression-coverage gap, not a reproduced product defect. Before treating the requested illegal-action coverage as satisfied, assert the destination/position for each hint kind against its canonical projection (and include a deliberately invalid destination case or equivalent assertion contract).

**Disposition:** P2 verification finding; C goal-continuity acceptance needs this assertion follow-up. No P0/P1 defect evidenced.

### Verified checks

- Reward metric definition explicitly excludes plain gold (`reward-retention-signals.md:11, 21-37`). Gold high-water bands are separately labeled descriptive analysis, not meaningful reward cadence or a game threshold (`:41-61`).
- First meaningful reward numbers are reproducible from the cited Phase8 traces. Spot-check: `gear-upgrades.csv` first `meaningful=true` row for Adventure/61101 is `at=555`; the first skill snapshot is 1,440. The reported first meaningful reward is 555, matching the minimum. The report explains the skill snapshot's coarser time bound.
- Source correlation holds: `git diff 5e223beb2ef056968861bc4c7125c1fb41da8728 c0a377b50e09b67664bc07b65d4e81a382daa53f -- src` contains presentation/components/style and wolf-family test changes; no reward, progression, loot, crafting-rule or source data changes. Phase10-A independently reports current `src/` identical to Phase9 tested source.
- Dead-end language is appropriately qualified: runner no-progress categories are not called proof of a real dead end; normal routes and controlled witnesses are separated; untested complete legal-action closure is explicitly listed as not run (`reward-retention-signals.md:65-85`).
- No daily quest, login reward, fixed reward cadence or retention mechanic is proposed. Human Product remains **DEFERRED**, and merchant stock/restock remains **NOT MODELED** (`reward-retention-signals.md:87-89`).
- Phase10-A content-validator limitation is disclosed consistently in C reports: semantic PASS, wrapper INCOMPLETE because child `npm` spawn and `python3` publication failed. C did not claim a complete validator run.

## Disposition

**Needs follow-up for the P2 goal-hint destination assertion before Phase10-C is accepted.** The reward calculations, Phase8/9 source correlation, dead-end qualifications, no-feature boundaries and Human Product status pass this review. No tests were run as part of this review; no source or C deliverable was edited.
