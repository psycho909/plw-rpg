# Dispatch F2 — Phase8-F consolidation reports (g6-luna-med-engineer)

- Ticket `tickets/20261014-v2x-08f-qa-review-delivery.md`; spec §16–§19. HEAD `9118454`. Accepted sub-tickets 08a–08e (read their Evidence sections) and reports in `reports/v2/20261014-balance-tuning/phase-08/`.
- Write scope: `phase-08/long-world.md`, `phase-08/bugs.md`, `phase-08/balance-findings.md`, and a **draft** `phase-08/final-review-draft.md`. No src, scripts only if needed for counting, no commit. Browser reports are owned by another worker (F1) — do not write them; leave placeholders referencing them.

1. `long-world.md`: consolidate Phase8-D 54 checkpoints (+ D2 controlled), save/reload/continuation parity, save size/event retention where available, Phase7-K comparison; normal vs controlled separated; limits.
2. `bugs.md`: every defect found in Phase8 (engineering + runner/tooling + product), with severity, status (fixed in commit X / open), evidence path. Include historical failures (e.g. runner attempts, A-F1 long-world timeouts fixed, C-F1 fixed by V4, review findings).
3. `balance-findings.md`: one table of all findings A-F1, B-F1, B-F2, C-F1, merchant stock/restock NOT MODELED, craftsman profit observation, D-F1 (Owner KEEP V0), E-F1..E-F3, any others — severity, evidence, decision (fixed/kept/deferred), owner of next step.
4. `final-review-draft.md`: draft the 11 Gates (PASS / PASS WITH FINDINGS / FAIL, Human Product DEFERRED) with evidence links, DoD 15 items, Q1–Q7 answered with evidence only; mark browser-dependent items (Stability gate, browser parts) as PENDING F1. The lead finalizes it.
Reply with only the path of a short `phase-08/f-browser/../f2-summary.md` (put it at `phase-08/f2-summary.md`).
