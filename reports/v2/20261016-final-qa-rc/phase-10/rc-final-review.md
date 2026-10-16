# V2.x Engineering RC — Final Review

- Date: 2026-10-16. Source commit `76595c5`（product src unchanged this round）; dist `9ce31ea5…`（runner convention）.
- Ticket: [20261016-v2x-rc-final-acceptance](../../../../tickets/20261016-v2x-rc-final-acceptance.md). Claude-only flow（Owner decision, no Codex worker）.
- Reports: [baseline](rc-baseline.md) · [O-01 browser](o01-browser-verification.md) · [regression](rc-regression.md) · [risk register](rc-risk-register.md).

## Gates

| Gate | Result | Basis |
|---|---|---|
| Source Integrity | PASS | HEAD = origin `76595c5`, clean tree, O-01 included, src tree `b1a1ff20…` |
| Engineering Regression | PASS | 48 files / 719 tests, `vue-tsc`, `vite build` on current HEAD |
| O-01 Recovery | PASS | O-01 reproduced and fixed: C1/C3（injected quota）FAIL on pre-fix `b21ce0c`, PASS on HEAD; at the real quota the legacy checkpoint loads, compacts on first save, plays, saves and reloads to the same world without reset（A1–A10） |
| Persistence | PASS WITH FINDINGS | IndexedDB outage/retry/recovery, no resend of dropped records, no same-id conflicts, read-only preview writes nothing, failed write keeps previous save（B1–B9, C1–C7）; lost-ack, real IndexedDB quota and reset under real storage pressure not browser-tested（unit tests cover） |
| Determinism | PASS | Primary: Vitest determinism suites + external 238-case byte-identical crafting check. Supporting: compaction leaves game state byte-identical; short browser segment = Node replay |
| Gameplay Integration | PASS | Life / Adventure / Hybrid browser smoke + controlled crisis, craft-cap, succession fixtures |
| Browser UX | PASS WITH FINDINGS | 0 refused clicks, 15 viewports no overflow, keyboard/modal OK; Safari/Firefox/devices NOT TESTED |
| Performance | PASS WITH FINDINGS | ≤0.83 ms extra per save at full cap; no stress rerun（by scope）; chunk-size warning pre-existing |
| Risk Register | PASS | S-01 KEEP CURRENT VALUES recorded; findings and Owner decisions aligned |
| Human Product | **DEFERRED** | [human-playtest-packet](human-playtest-packet.md) blank protocol ready; no human feedback simulated |
| Release Engineering | PASS WITH FINDINGS | Reproducible runners + manifests; 2 runner-tooling defects fixed and retained as evidence; hooks follow-up SEC-01..03 open |

## New QA artifacts

`rc-runner/`: 4 attempts + pre-fix RED results, 91 files, **4,397,729 bytes**（authoritative O-01 734,474; authoritative smoke 2,524,246; two retained failed attempts 1,125,634）. Interaction trace gzip'd; every file < 256 KiB; Chrome profiles（~58–59 MB each）deleted after each run.

## Independent review

Fresh Claude Opus 5.5 reviewer（read-only, not involved in this round）: **AGREE WITH CHANGES**, no blocker. Major: A did not prove the fix was necessary; C4 was not a pressure test. Minor: wording of A6/B2/B9/C5/A-det, undisclosed smoke locator misses, failed-attempt explanation, missing journal-retention consequence, full S-01 formula. All addressed in these reports; a pre-fix RED run was added for the O-01 gate.

## Verdict

**ENGINEERING RC READY WITH FINDINGS**

The core engineering gates pass on the current source and no release blocker is open. The remaining items are recorded, non-blocking risks（untested browsers/devices, lost-ack and real IndexedDB quota not browser-tested, unbounded archive history, journal-marker semantics）, plus a separate hooks security follow-up. This is an engineering recommendation only; release, deploy, merge and human playtest are Owner decisions.
