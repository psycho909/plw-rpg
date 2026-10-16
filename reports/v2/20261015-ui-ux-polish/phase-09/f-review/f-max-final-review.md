# Phase9 Final Independent Review

**Review result: PASS WITH FINDINGS. Final disposition: NOT OWNER-READY until the P2 status record is reconciled.**

## Scope and review method

- Work authority: Phase9 parent and F tickets; authoritative scope: docs/specs/V2X-PHASE9-UI-UX-POLISH.md, especially §§0, 3, 4, 8, 9, 11–14.
- Base: 97dd33c. Delivery HEAD and origin/v2x/reward-core: 369df60ab5e299c36f0f2b7430188cb73bc57e59.
- Reviewed source diff: git diff 97dd33c 369df60 -- src — 17 files, 538 insertions, 38 deletions. The working tree reports git diff --quiet c0a377b 369df60 -- src; both commits resolve to src tree 56aac189bc047c0b17a5b2c370f02ebbe388e0c1. F1's recorded check/build and production browser evidence therefore use the same source tree as the reviewed delivery.
- Before this report, the only untracked path was the review instruction .scratch/20261015-phase9/review-f-max-final.md. No source, ticket, or existing report was changed; no tests, build, or browser run was repeated, and no commit was created.
- Primary session: assigned as g6_luna_max_final_reviewer, with no Phase9 implementation or sub-phase review participation. The tool interface does not expose a verifiable primary-session model ID. Independent supporting reviews were requested as gpt-6-luna medium for Standards and gpt-6-luna max for Spec; both completed.

## Standards and scope

The Standards review found no P0–P3 source defect. The source changes map to P9-01–05: conditional Notes hints; factual, progressively disclosed encounter details; plan-derived crafting feedback and material search/origin labels; modal focus ordering; boss-result feedback; and the responsive shell adjustment. wolfFamily.ts changes presentation/cue wording only; inspected combat cue wording remains equivalent. The diff does not change encounter eligibility or resolution, Threat V0, Farming V4, combat/loot balance, save schema, or add a quest system, combat-power score, or UI framework.

projectGoalHints reads persisted requests/crisis state and the existing crop, content-encounter, and wolf-encounter projections. Suggestions are optional and capped at five. Content encounter choices are filtered to the discovered current region and the destination points within that region. Boss level comparisons use authored/current levels; known mechanics and loot are discovery-gated through existing state and knowledge projections. Retreat and cooldown text uses existing rules. No invented danger score or recommended level appears.

The Phase8 decision boundaries remain intact: D-F1 is **KEEP V0** for presentation only, and merchant stock/restock remains **NOT MODELED**. Normal Hybrid did not reach the resin recipe chain; the report explicitly separates that limitation from the controlled Hybrid UI fixture. Crisis, crafting cap, and succession are likewise identified as controlled fixtures.

## Gate assessment

The technical Gate statuses below are supported with the stated limits. The inaccurate pending statements in final-review.md are a separate finding and must be corrected before Owner review.

| Gate | Review assessment |
|---|---|
| Engineering | PASS WITH FINDINGS — existing check log records 41 files / 650 tests, TypeScript check, and Vite build at c0a377b; F1 browser evidence is present. Not rerun in this review. |
| Goal Clarity | PASS WITH FINDINGS — conditional, state-based hints are evidenced; human understanding remains DEFERRED. |
| Information Architecture | PASS WITH FINDINGS — search, labels, source/use, and progressive detail evidence is present. |
| Adventure UX | PASS WITH FINDINGS — rank, eligibility, factual level comparison, known mechanics/loot, retreat, and cooldown are represented; no unsupported risk rating. |
| Life / Craft UX | PASS WITH FINDINGS — plan details and the observed +10 award are supported. The notice omits the XP unit, and no normal post-cap craft was browser-tested. |
| World Feedback | PASS WITH FINDINGS — gather/craft and controlled boss feedback are observed; some NPC, settlement, and reputation paths are source-reviewed only. |
| Interaction | PASS WITH FINDINGS — modal focus, keyboard, disabled filtering, and hit-tested navigation have tests/probes; no physical device or Safari coverage. |
| Responsive | PASS WITH FINDINGS — D's 20-cell matrix and F1 viewport evidence show no measured overflow or out-of-bounds required controls; emulated Chromium only. |
| Visual Consistency | PASS WITH FINDINGS — sampled UI preserves the monochrome, zero-radius system. Evidence is not a pixel-diff study. |
| Performance | PASS WITH FINDINGS — the bounded 20-minute Chromium run has no reported error/resource runaway; not evidence for other browsers/devices or longer endurance. |
| Human Product | DEFERRED — no agent/browser run is treated as evidence of fun, retention, preference, or human comprehension. |

DoD 1–4 and 7–13 have traceable engineering evidence with the qualifications above; DoD 10 and 12 are supported by the source diff. DoD 14 has no unresolved P0/P1 product blocker in the reviewed source and retained QA evidence, but its current wording still says F1 integrated QA/review is outstanding. DoD 5, 6, and 15, plus Q4/Q6, also contain stale pending claims; see FMAX-P9-01. The seven Q answers distinguish engineering observations from untested human perception.

## Prior findings rechecked

| Prior finding | Status | Evidence |
|---|---|---|
| B P2 — duplicated destination/core presentation values | RESOLVED | goalHints.ts uses LIVING_EVENT_LIMITS.deliverySquare; PlaceWindow.vue uses shared wolfCorePresentation. |
| B P3 — UI contract left the B probe pending | RESOLVED | docs/UI.md now links the completed b-runner/probe-20261015T093111935Z/. |
| C P3 — visible material-origin labels were not searchable | RESOLVED | craftingProjection.ts adds the displayed origin label to the search index; focused test covers the Chinese label query. |
| C P3 — adventure report retained a superseded pending statement | RESOLVED | adventure-ux.md describes the completed C probe and its controlled-save boundary in past tense. |
| D P3 — disabled modal candidates could enter Tab order | RESOLVED | modalFocus.ts excludes native and aria-disabled controls; follow-up records 4/4 focused tests and the accepted full check. |
| E P3 — completion reports had stale pending statements | RESOLVED | E follow-up links the successful check log and post-build probe and preserves normal/controlled distinctions. |

## Evidence spot-checks

- All 13 required §13 reports are present. f1-runner/f1-summary.md, browser-regression.md, browser-stress.md, and performance.md qualify normal versus controlled routes and the limits of the measurements.
- Regression closeout.json records 123 clicks, zero obscured-click refusals, zero errors, 51 screenshots, 200 trace records, and a removed 74,352,923-byte Chrome profile. The gzip and raw SHA-256 values in the closeout match the decompressed actions.ndjson.gz.
- Stress closeout records 1,200.924 seconds, 6,467 action records, 21 checkpoints, 1,862 modal cycles, zero errors, 3/3 reload parity, and removal of the 92,308,119-byte Chrome profile. The gzip and raw SHA-256 values in artifact-sha256.json match the retained trace. The downloaded play-record export decompresses to the SHA-256 recorded in raw-compression-manifest.sha256.
- Failed F1 attempts remain in the runner evidence tree; the earlier profile cleanup failure has its own cleanup record. Final regression/stress cleanup records report that their profiles were removed.
- The F1 reports explicitly say the fresh-save Hybrid route did not naturally reach required recipe progress/materials. The controlled fixture does not get presented as natural progression. Mobile touch evidence is CDP/emulated, not a physical-device test.

## New findings

### FMAX-P9-01 — P2: final gate and bug-register status is stale

**Status: NOT RESOLVED.**

final-review.md still says F1 regression/performance is pending in DoD #5/#6/#15 and Q4/Q6 (29–30, 39, 62, 72), and the source-correlation row still says F1 work remains pending (100). bugs.md says the F1 reports are pending (3, 41). These claims contradict the completed F1 reports and raw artifacts linked by the same final review.

This leaves the required Gate/DoD record internally inconsistent at the Owner decision point. Update those statements to reflect completed F1 QA and the actual remaining review/Owner state; also update DoD #14 wording so it identifies the independent-review finding rather than describing all F1 QA as outstanding. Recheck the evidence links after the documentation change. No source change or test rerun is needed for this correction.

### FMAX-P9-02 — P3: regression action count differs from the raw trace

**Status: NOT RESOLVED.**

browser-regression.md:7, f1-runner/f1-summary.md:7, and final-review.md:9 say **195 actions** for attempt 022825574Z. Its closeout.json records actionCount: 200; decompression of actions.ndjson.gz yields 200 records, and scripts/phase9/f-regression.mjs:601 defines the count as audit.trace.length. The 123-click, zero-refusal, and zero-error figures agree.

Correct the report/ticket count to 200 action records, or define and evidence the narrower 195-action subset. This does not change the observed route outcome, but the current number is not reproducible from the declared attempt.

## Final disposition

**NOT OWNER-READY.** No P0/P1 source or product blocker was found, and the Gate evidence is generally qualified appropriately. Resolve FMAX-P9-01 before Owner review; reconcile FMAX-P9-02 in the same evidence update. After those report-only corrections are checked, the delivery can be presented to the Owner without rerunning unchanged source tests or browser flows. No original report or ticket was edited in this review.
