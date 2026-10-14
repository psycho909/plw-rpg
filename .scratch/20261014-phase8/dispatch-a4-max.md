# Dispatch A4 — normal-route harness root cause (escalated to Max)

- Role: `g6-luna-max-core-engineer` (requested gpt-6-luna / max). Escalated once per `docs/agents/agent-routing.md` §2 after three Medium attempts produced invalid route output (AGENTS 3-strike rule: re-evaluate assumptions, do not repeat the same approach).
- Single owner of: `scripts/phase8/run-normal-routes.mjs`, `scripts/phase8/route-validity.mjs`, `scripts/phase8/test_route_validity.mjs`, and new attempt dirs under `reports/v2/20261014-balance-tuning/phase-08/a-baseline-run/`. Medium engineer is paused on these files.
- Root-only Git: no commit/push/stash/reset. `git diff -- src` must remain empty (if a src hook is truly needed, STOP and propose). Never delete attempts.
- Your Codex sandbox cannot spawn child processes (`spawn EPERM`) or see full npm deps reliably; list commands needing that as **pending lead execution** — do not request escalation.

## Context

Read: `tickets/20261014-v2x-08a-baseline.md`, `.scratch/20261014-phase8/dispatch-a2.md`, `dispatch-a3.md`, `reports/v2/20261014-balance-tuning/phase-08/a-worker-summary.md` (A1–A3), `baseline.md`, and the harness files above. Phase7 harness patterns: `reports/v2/20261008-content-expansion/phase-07/qa_simulation.test.ts`, `g-economy-simulation/`.

Latest lead-executed attempt `a-baseline-run/attempt-20261014T032942232Z/` (policy v2) is still invalid:

| Route | Observation (per seed) |
|---|---|
| Life | Seeds 61101/61102/61103 produce byte-identical outcomes (gold 17,605, level 17, wood 14, mining 15, farming 1, smithing 1, crafts 0, noProgress 0). Gate says VALID. |
| Adventure | 2,366 encounters, **all Normal rank**, all wins, 0 deaths/retreats; Elite/MiniBoss/Boss never engaged (v1 engaged them). |
| Hybrid | Seeds 61101 and 61103 near-identical; 61102 diverges strongly. crafts 0. |

## Questions to answer from engine source first (before changing policy)

1. How does a fresh save's seed reach world/player RNG, and why would Life be seed-invariant? Is the runner actually applying the seed to the created state? Prove with a minimal check (two seeds → differing RNG-derived state).
2. Through which legal player actions/UI paths does a player encounter Normal vs Elite vs MiniBoss vs Boss (region selection, threat, spawn state, explicit Boss challenge)? Why did v2 lose them?
3. What makes crafting, smithing XP and farming progress legal for a fresh player (recipes known, materials, stations, seasons, crop selection)? Why does Life never craft or farm?
4. What per-day action/time/stamina budget does the real UI allow?

## Then

- Fix the policies so each route plays its domain like a plausible player using only legal public actions. Document each policy's decision rules and limits in the runner header and `baseline.md`.
- Strengthen validity gates (runner sanity, not balance targets): seed variance present where RNG is involved; Life shows farming AND crafting/smithing activity when legally possible (or records why impossible); Adventure engages ranks above Normal when legally available (or records why not); Hybrid executes both halves; all-win results carry the explanation evidence. Add node:test cases for each gate.
- Keep the 3 paired seeds 61101–61103 and the 3-year window unless evidence requires change (justify).
- Lead will run: `node --test scripts/phase8/test_route_validity.mjs` and `node scripts/phase8/run-normal-routes.mjs`. If you can run the runner directly in-process without child processes, you may; otherwise leave it pending.

## Output

Write `reports/v2/20261014-balance-tuning/phase-08/a4-max-summary.md`: answers to Q1–Q4 with source file:line evidence, changes, tests, pending-lead commands, remaining limitations. Reply with only that path.
