# Review request — Phase9-B (g6-luna-high-engineer as reviewer; did not build B)

Review only; do not modify files; no commit. Write `reports/v2/20261015-ui-ux-polish/phase-09/b-review/b-review.md`; reply with only that path.

- Spec `docs/specs/V2X-PHASE9-UI-UX-POLISH.md` §3 P9-01/P9-02, §4, §8. Ticket `tickets/20261015-v2x-09b-goal-ia.md`. Baseline `phase-09/ux-baseline.md`.
- Diff: `.scratch/20261015-phase9/b-src.diff` (PlaceWindow.vue, WorldRecords.vue, PixelWindow.vue focus-trap fix by lead, docs/UI.md, new src/presentation/goalHints.ts + test). Focused probe evidence: `phase-09/b-runner/probe-*` (final attempt per b-summary.md).
Check: every hint/detail line is backed by real state/projection data (no invented danger score, recommended level or numbers; constants read not copied — flag hard-coded strings/coords such as the wolf core descriptions and village {x:10,y:10}); discovery gating correct (undiscovered → 情報不足); no quest/daily/checkbox semantics; hint projection pure and tested (would tests fail if a trigger were removed?); keyboard accessibility of the expandable details (native details/summary or button with aria-expanded; inside modal focus trap); no change to engine rules/save schema/balance; visual stays retro B/W per docs/UI.md; performance of computed lists. Severity P0–P3 and explicit disposition.
