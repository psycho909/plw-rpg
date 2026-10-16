# Dispatch 9E — Visual Consistency & Feedback (g6-luna-med-engineer; requested gpt-6-luna / medium)

- Ticket `tickets/20261015-v2x-09e-visual-feedback.md`; spec §3 P9-05, §4 (visual identity — retro B/W, zero radius, existing tokens; no dashboard/colour cards/HUD bloat), §8. HEAD `25014bc` (A–D accepted; check 40/647). UI contract `docs/UI.md`, design `docs/design/DESIGN.md`.
- Single owner of: `src/components/StatusNotice.vue`, `src/stores/gameStore.ts` (message/feedback paths only), visual-only edits in `src/style.scss` (do not alter the D layout/height allocation rules), and small presentation-only edits in other components when a specific feedback gap is evidenced. No engine rules/balance/save schema; do not turn events into modals; avoid notification fatigue.
- Sandbox escalation allowed: `npx.cmd vitest run`, `node scripts/phase9/`. Single standalone commands. Lead builds dist and runs full check.

## Work (evidence first, then minimal fixes)
1. Feedback audit (P9-05) on the production build via a probe (`scripts/phase9/e-probe.mjs`, reuse audit/d-probe helpers; elementFromPoint; robust chrome-profile cleanup): for gather, craft (success + skill XP), combat reward, boss defeat (controlled fixture if needed, labeled), NPC state change, crisis preparation/outcome (fixture), settlement change, reputation/identity, property purchase, world history entry — record what the player sees immediately (toast/status/recent event/meter change) and where it is reviewable later (log/history). Classify each: clear / missing / ambiguous / too noisy.
2. Fix only evidenced gaps with the existing hierarchy: short message (StatusNotice/recent event) → state change → reviewable log. E.g. if skill-up or resource deltas are not surfaced after an action, include them in the existing message from real before/after state (no invented numbers).
3. Visual consistency pass: button states (default/hover/focus-visible/active/disabled/pressed), spacing rhythm (--space tokens), typography hierarchy in windows; fix inconsistencies using existing tokens only. Before/after screenshots.
4. Tests for any changed message/feedback logic (gameStore tests exist).
5. Reports: `phase-09/world-feedback.md` (action-feedback section) and visual part of `phase-09/responsive-visual-review.md`. `e-runner/e-summary.md`; reply with only that path.
