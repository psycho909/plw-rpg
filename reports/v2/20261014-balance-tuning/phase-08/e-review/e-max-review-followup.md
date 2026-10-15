# Phase8-E Max Review Follow-up

## Disposition

**RESOLVED — all four findings from `e-max-review.md` are addressed by the revised analysis, provenance record, and report wording.** The original review remains unchanged. No game source changes are implicated.

Review basis: current HEAD `5e223beb2ef056968861bc4c7125c1fb41da8728`; instrumented attempt `e-runner/instrumented-attempt-20261014T102419801Z/`; corrected `analysis-summary-r9.json`; E1 revision 2 notes; current pacing/loot reports and runner scripts. Historical failed/intermediate analysis artifacts remain retained.

## Finding checks

### P1 — Runner encounter-cap no-ops mislabeled as world wait: RESOLVED

`analyze-pacing-instrumented.mjs` now identifies a consumed v3 daily encounter cap with eligible Normal targets as `runner-policy-limited`, explicitly distinguishing the runner limit from a world wait. The r9 summary records 147 such cases (Adventure 114, Hybrid 33, Life 0), zero `legitimate world wait`, and zero generic runner-policy defects. `reward-pacing.md` reports the same split and says the cap does not establish a game defect. This corrects the §9 classification issue.

### P1 — Zero-XP craft alternatives joined to the wrong decision: RESOLVED

`pacing-analysis-core.mjs` now joins each zero-XP craft event to the unique craft-action decision interval containing the event timestamp; it throws if the event matches zero or multiple decisions. The analyzer uses that join for alternatives, and E1 revision 2 corrects the count to 676 total / 670 zero-XP crafts per Life seed.

Raw-data spot-check: in `seed-life-61101.json`, items 1–6 occur at minutes 1965, 2538, 3756, 4845, 5270, and 6285, each with 10 practice XP. Item 7 is the first zero-XP craft at minute 6853. Applying the analyzer's interval join yields exactly one craft decision: `life/61101/4/13/6808`, whose chosen action is `craft`. The r9 row reports 670 zero-XP events, zero other legal recipes, and 670 moments with another legal action projected. `test_pacing_analysis.mjs` contains the six-prior-XP-crafts regression. E1 revision 2 records `node --test scripts/phase8/test_pacing_analysis.mjs` PASS 4/4. I attempted that command during this follow-up, but Node's test runner failed at process creation with `spawn EPERM` before any test ran; no fresh pass is claimed here.

### P2 — Historical loot attempt missing seed and runner provenance: RESOLVED

The historical `loot-attempt-20261014T100851766Z` manifest was not rewritten, but `loot-reward-distribution.md` now backfills its cohort seed formula (`40131 + cohortIndex`), mirror seed formula (`99001 + cohortIndex * 100 + mirrorIndex`), and historical runner SHA-256 (`4e07af5ad54bf4d97fa977316fae57e97e6a7f1d2336ffe1497e883f2c3fc90b`). That hash matches the `run-loot-pacing.mjs` hash captured in the original review, so the historical runner is not confused with the updated file. The updated runner computes its own SHA-256 and writes it, each cohort's seed and monster IDs, and the mirror-seed formula into future manifests. The report explicitly identifies this as historical provenance and says the existing sample was not rerun.

### P3 — Boss route interval could be mistaken for a single fight: RESOLVED

`reward-pacing.md` now calls Adventure 61103's 145,469-minute figure route-level elapsed game time from first Boss engagement to first Boss win, not a continuous battle or time-to-kill. The r9 summary confirms the interval runs from `wild_beast_apex` at minute 116,195 to `frontier_goblin_warlord` at minute 261,664. The raw seed summary records 18 retreats, consistent with the report's explanation.

## Final review result

All findings are **RESOLVED** in the revised evidence and report text. The craft-join test's 4/4 PASS is recorded by E1 revision 2 but could not be independently rerun in this review because process creation returned `spawn EPERM`; raw-event, join-code, and corrected-summary checks passed by inspection. No commit or push was made.
