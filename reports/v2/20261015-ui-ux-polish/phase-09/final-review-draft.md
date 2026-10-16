# Phase9 Final Engineering Review — Draft for F1 integration

**State: DRAFT; not the final Phase9 gate.** This consolidates accepted A–E engineering evidence at HEAD `c0a377b50e09b67664bc07b65d4e81a382daa53f`. F1 owns browser regression, browser stress and performance evidence; those report deliverables remain placeholders below until F1 supplies them. Human Product remains **DEFERRED**. This is not approval to start Phase10, deploy, or make product-balance changes.

## 11 Acceptance Gates

| Gate | Draft status | Engineering evidence and qualification |
|---|---|---|
| Engineering | **PASS WITH FINDINGS** | Accepted A–E check logs progress from 38 files / 631 tests to 41 files / 650 tests; E log includes successful TypeScript and Vite build. A–E source changes have focused coverage. F1's final integrated browser regression has not yet been supplied. No A–E review found a P0/P1 product blocker. |
| Goal Clarity | **PASS WITH FINDINGS** | Notes hints are condition-based, capped at five, use existing eligibility projections and show destinations/reasons. No human goal-understanding study exists; keep subjective clarity **DEFERRED**. |
| Information Architecture | **PASS WITH FINDINGS** | Progressive high-rank details, discovery-gated information, source/use rows and material/recipe search were verified by component tests and focused probes. Broad final-route regression awaits F1. |
| Adventure UX | **PASS WITH FINDINGS** | Rank, eligibility, factual level comparison, known mechanics/loot, retreat result/time effects and configured cooldown are shown. No explicit danger estimate/recommended level is supplied because the system has no supported value; adequacy is a human question. |
| Life / Craft UX | **PASS WITH FINDINGS** | Workbench shows plan-based ingredients, current/required amounts, price, stamina/time, skill, XP cap and next target; success exposes the actual +10 practice amount and item. Controlled cap evidence is separate; the normal E route did not craft after cap, and the success notice omits the `XP` unit. |
| World Feedback | **PASS WITH FINDINGS** | Gather/craft and controlled Goblin Chief reward feedback were observed immediately and in logs; crisis/history has retained A/C evidence. Several NPC, property, reputation and settlement transitions were source-reviewed rather than newly traversed in E. Human recognition of changes remains unmeasured. |
| Interaction | **PASS WITH FINDINGS** | A–E evidence covers native modal focus, details summary keyboard operation, disabled focus filtering tests, Escape restoration, and hit-tested mobile touch navigation. F1 final integrated browser regression remains pending. |
| Responsive | **PASS WITH FINDINGS** | D measured 20 combinations (320/375/768/1280/1920 × 667/768/900/1000), with 0/20 required controls outside and 0/20 horizontal overflow. Evidence is emulated Chromium viewport data, not physical-device or Safari testing. |
| Visual Consistency | **PASS WITH FINDINGS** | Black/white retro palette, zero-radius borders, typography and spacing tokens were observed; no visual-rule edits were needed for E's message-only changes. Screenshots are interaction before/after states, not a pixel-diff source change study. |
| Performance | **PENDING F1** | F1-owned performance report/measurement has not been supplied in this consolidation. Do not infer performance acceptance from unit checks or a successful build. |
| Human Product | **DEFERRED** | No agent/browser evidence substitutes for human goal clarity, fun, preference, retention or ease-of-use answers. |

## 15 Definition of Done checks

| # | Requirement | Draft assessment |
|---:|---|---|
| 1 | Player can find currently feasible actions through existing UI. | **PASS WITH FINDINGS** — state-driven Notes hints and existing place controls expose available actions; human discovery is untested. |
| 2 | Unavailable actions give a true reason. | **PASS** — eligibility reasons and quantified crafting blockers are projected from existing rules; tests/probes cover representative cases. |
| 3 | Boss risk and eligibility are no longer only vague information. | **PASS WITH FINDINGS** — eligibility and blocker reasons, authored rank/level, known mechanics/loot, retreat effects and cooldown are shown; no invented numeric danger/recommended level. Human adequacy is deferred. |
| 4 | Recipe, material gap and XP state are understandable in the UI. | **PASS WITH FINDINGS** — plan data and success award are visible; controlled cap view is documented, but no post-cap normal craft was browser-tested and human understanding is not measured. |
| 5 | Inventory / monster / recipe lists have reasonable operation efficiency. | **PASS WITH FINDINGS** — search, origin-label queries and recipe groups are covered by tests/probes. F1 performance and broad regression remain pending. |
| 6 | Main windows have no blocking modal/focus/keyboard issue. | **PASS WITH FINDINGS** — focus trap includes summary, excludes disabled candidates, and sampled keyboard cycles work. Final F1 regression pending. |
| 7 | Core mobile functions operate. | **PASS WITH FINDINGS** — 320×667 touch navigation and responsive matrix passed in emulated Chrome. Physical device/Safari not covered. |
| 8 | Important completed actions provide clear feedback. | **PASS WITH FINDINGS** — gather, craft award, and controlled boss result/reward were observed. Other events are partially source-reviewed. |
| 9 | Player can observe meaningful World / NPC / Crisis changes. | **PASS WITH FINDINGS** — A/C controlled crisis and history views and the event log are retained; E did not newly exercise every NPC transition. No human recognition test. |
| 10 | No Daily Quest or forced goal was added. | **PASS** — hints are optional, conditional, capped and have no completion/checklist semantics. |
| 11 | Adventure / Life / Hybrid freedom is preserved. | **PASS WITH FINDINGS** — hints add optional routes and do not force actions; overall sense of freedom/immersion has no human evidence. |
| 12 | Phase8 approved balance decisions are not changed without approval. | **PASS** — A–E work did not modify engine balance, threat, crop, combat, loot or save values. D-F1 remains KEEP V0. |
| 13 | Save / reload / migration / succession remain correct. | **PASS WITH FINDINGS** — A save/reload parity and controlled engine-generated succession evidence are retained; this is not a substitute for F1 full regression. |
| 14 | No unresolved P0/P1 engineering blocker remains. | **PASS WITH FINDINGS** — A–E reviews report no P0/P1 blocker and fixes are linked in `bugs.md`; F1's integrated QA/review remains outstanding. |
| 15 | Completion claims have traceable evidence. | **PASS WITH FINDINGS** — A–E source snapshots, tests, builds, probes and reviews are linked below; F1 browser/stress/performance artifacts are still pending. |

## Final questions Q1–Q7

Each answer separates engineering evidence from human perception.

### Q1. Can a player know what they can actually do now?

- **Engineering evidence:** Notes emits up to five conditional suggestions from open requests, current crisis phase, viable seasonal crops and currently eligible encounters. Text includes a reason and an existing destination action. Empty and populated states and one activated destination were observed. Existing place actions expose direct eligibility/blocker reasons.
- **Human perception:** Not tested. Whether people notice, understand or trust the suggestions is **DEFERRED to Human Product**.

### Q2. Can a player understand Boss risk and challenge conditions?

- **Engineering evidence:** Existing ranks, current eligibility/reason, actual authored monster/player levels, known/discovered mechanics and loot, retreat effects, and configured cooldown are exposed. The Chief remains gated by its existing live flag. No unsupported danger score or recommended level is invented. Controlled Phase8 difficulty evidence shows Boss ID/progression-band variation; it does not validate human interpretation.
- **Human perception:** Not tested. Whether the displayed comparisons are enough to choose a challenge is **DEFERRED**. Phase8 B-F1/E-F2 remains a qualified information gap.

### Q3. Is crafting clear about skills, materials, recipes and results?

- **Engineering evidence:** Workbench plans expose requirement/held amounts, fee, stamina/time, skill, XP practice/cap, quality and next unlock. A fresh-save browser route gathered inputs and made a `starterSpear`; the notice showed `鍛造熟練 +10`, matching the plan's `+10 XP`, and the log recorded it. A controlled cap fixture showed graduation/blocker/next target. The success notice omits the `XP` unit; no post-cap craft was browser-run.
- **Human perception:** Not tested. No claim about perceived grind or ease of identifying a next recipe. Phase8 E-F3 remains a qualified starterSpear chore-risk finding.

### Q4. Are large monster and equipment collections easy to find, understand and compare?

- **Engineering evidence:** Recipe/material search and displayed-origin label indexing have focused tests; A–E probes inspect high-rank details, source/use and post-craft comparison. F1's broader browser regression and performance evidence remain pending.
- **Human perception:** No user study or representative task-completion study was run; ease of discovery/comparison is **DEFERRED**.

### Q5. Can players observe changes in World, NPCs and Crisis?

- **Engineering evidence:** Existing event/status/log surfaces show gather, craft and boss outcomes. A1 controlled crisis warning/contribution/outcome and world-history screenshots are retained; C confirms the history view. Some NPC, settlement and reputation scenarios were source-reviewed rather than freshly traversed in E.
- **Human perception:** Whether players notice or interpret those changes is untested and **DEFERRED**.

### Q6. Are PC, Mobile, Keyboard and Modal interactions reliable?

- **Engineering evidence:** D's 20 emulated viewport cells passed the recorded bounds checks. Native modal focus, summary Tab/Shift+Tab traversal, Enter/Space toggling, focus restoration, disabled-control filtering, and a hit-tested mobile touch action are covered by browser evidence/tests. Safari and physical hardware were not tested; F1 regression is pending.
- **Human perception:** Comfort, accessibility for individual needs, and perceived responsiveness are not established by automation.

### Q7. Did convenience reduce Oakvale's free exploration or world immersion?

- **Engineering evidence:** No mandatory goal, Daily Quest, completion tracker, new quest system, forced action, or routine-event modal was added. Hints use existing state and optional destinations. No engine/world-rule change was made.
- **Human perception:** Immersion and freedom are subjective and untested; **DEFERRED**.

## F1-owned report placeholders

Do not treat these placeholders as findings or completed work; F1 owns their evidence and final reports.

- `browser-regression.md` — **PENDING F1** (production browser regression matrix and result).
- `browser-stress.md` — **PENDING F1** (normal browser stress run, retained attempts and result).
- `performance.md` — **PENDING F1** (instrumented performance findings and result).

## Source / build correlation

The SHA-1 `src` tree object is obtained with `git rev-parse <commit>:src`. Git's tree object recursively binds sorted directory entries, modes, paths and blob IDs; it is a stable source snapshot identifier, not a build-artifact digest. The `dist` output is generated and is not itself attested by these values. Build/test log and probe paths provide the operational correlation recorded by each accepted sub-phase.

| Sub-phase | Accepted source/docs commit | `src` tree OID | Build/check evidence | Production-browser evidence |
|---|---|---|---|---|
| Pre-A baseline | `e7c6595` (`e7c6595584126947ed80e5fbf9cbcd4785e8e7b7`; A acceptance docs commit `6f9ecb6`) | `c1547b127acf9f8fabb89d535a79e7e601fcafaa` | `a-check-run/npm-run-check-baseline-97dd33c.log`: 38 files / 631 tests; TypeScript/build pass. | A used production dist from the baseline source snapshot; final attempt `a-runner/attempt-20261015T085040840Z-ux-audit/`. |
| A accepted | `6f9ecb6` (`6f9ecb62d9406f99d0eb9c5e3b35e7d8ab916bb8`; documentation/runner audit acceptance, no `src` change) | `c1547b127acf9f8fabb89d535a79e7e601fcafaa` | Same baseline log; A records `git diff 9118454 HEAD -- src` clean. | `a-runner/attempt-20261015T085040840Z-ux-audit/`. |
| B accepted | `4afc604` (`4afc6040c28acfe8fdbca560fb9a60869269b5ec`) | `9ea7c8e3ec14d6b9d6fdd6f493dc2ac4603bb4c1` | `b-runner/npm-run-check-b-final.log`: 39 files / 641 tests; build pass. | `b-runner/probe-20261015T093111935Z/`; 16/16 details, native keyboard traversal and destination action. |
| C accepted | `4467fcc` (`4467fccc7f407d9998fbcce6bb0e7b743ca6681b`) | `03ad9527b36eeca6efa1b2a9e0ea426e389690a5` | `c-runner/npm-run-check-c-final.log`: 39 files / 643 tests; build pass. | `c-runner/attempt-20261016T003828476Z/probe-results.json`. |
| D accepted | `25014bc` (`25014bc00c36c1a96389df96b12fdd39345b8e61`) | `b09200f48d4fdeaf5a0b04108713a6ac556d676a` | `d-runner/npm-run-check-d-final.log`: 40 files / 647 tests; TypeScript/build pass. | `d-runner/probe-20261016T010259948Z/`: 20 viewport combinations; keyboard/touch evidence. |
| E accepted | `c0a377b` (`c0a377b50e09b67664bc07b65d4e81a382daa53`) | `56aac189bc047c0b17a5b2c370f02ebbe388e0c1` | `e-runner/npm-run-check-e.log`: 41 files / 650 tests; TypeScript/build pass. | `e-runner/attempt-20261016T013838256Z/probe-results.json`: normal fresh-save craft and separately labeled controlled Goblin Chief UI victory. |
| F2 consolidation | Current source snapshot unchanged from E at review HEAD `c0a377b`; F2 writes reports only. | `56aac189bc047c0b17a5b2c370f02ebbe388e0c1` | No build/test rerun for report-only work. | F1 browser/stress/performance work remains pending. |

Fingerprint note: A's `audit-runner` also records a custom SHA-256 fingerprint (`23d8f619f94b1d8296eb5f6ecf34cad22f0cf71f650e1a7d271280195a42cba2`) by sorting relative source paths, SHA-256 hashing each file, then SHA-256 hashing newline-joined `path:digest` rows; it matched Phase8-F's same source snapshot. A also records a separate lead fingerprint based on sorted `git ls-files src` / SHA-256-of-SHA-256 (`b2db22c9…058f`). Those algorithms produce different values by design; the table above consistently uses Git `src` tree OIDs.

## Final disposition for this draft

A–E provide traceable engineering evidence and resolve the documented blocking implementation defects. Remaining items are qualified product findings or work explicitly owned by F1/Human Product. Do not mark Phase9's final gate accepted until F1 fills and reviews its three owned reports and the final independent review is complete.
