# Paid rest cross-midnight fix — L2 review

## Scope and review snapshot

- Ticket: `tickets/20261003-comprehensive-playtest.md`; this review covers only the paid-rest wage/save defect and the two frozen source files. It does not assess the other in-progress playtest routes or acceptance of the comprehensive ticket.
- Base and HEAD: both `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`.
- Reviewed working-tree patch: `git diff -- src/engine/actions.ts src/engine/actions.test.ts`. `git status --short` showed both source files unstaged (` M`); there is no committed base-to-HEAD change under review.
- `src/engine/actions.ts` SHA-256: `005e2a7f59ab076178e843d2021e5cbf3315b3ee9d07122358c76c6943313c6c`.
- `src/engine/actions.test.ts` SHA-256: `3aff2bf73da6044dc271a8285dbeaaaf354f11a3f8262716b9b4600c32b4b1b8`.
- Reviewer: independent general L2 reviewer, not a contributor to the fix; not an L3 audit. Assignment route: GPT-6 Luna Max / max. `.codex/agents/luna_worker.toml` is absent as specified; the repository README and `docs/SUBAGENTS.md` set that route. Runtime telemetry is unavailable, so this records the requested route rather than independently asserting backend execution.
- Read repository `AGENTS.md`, `README.md`, `docs/SUBAGENTS.md`, `docs/agents/review.md`, `docs/agents/skill-workflows.md`, the ticket, save/simulation contracts, and the full available `matt-skills-curated:code-review` entry (version not exposed). Findings are separated below by Standards and Spec.

## Standards

**No finding.** In `src/engine/actions.ts:12-19`, the helper validates the requested fee, deducts it, then advances time. The default fee is zero for existing farm, gathering, and dungeon callers; for all valid/savable player states, `saveService.ts:27` enforces `gold >= 0`, so the zero-fee check accepts balances of zero or greater. I found no supported state in which the added default changes those callers' behavior. At midnight, `simulation.ts:178-182` charges a wage only when the remaining balance covers it; otherwise it ends that contract without taking the balance negative.

The transaction order is explicit in the code comment and matches existing paid operations that deduct before simulation (`trade` and `hire`). The tests make that order observable across the wage boundary. The test's save-service import is justified by the regression: the defect was that an action left an otherwise ordinary state that could not reload.

The only state in which a zero-fee caller would now return “金幣不足” is a negative-gold state. That state violates the existing save contract and is no longer reachable through the reviewed supported economy paths; I do not consider it a supported-state regression.

## Spec

**No finding.** The defect and result match the authorized rest repair and existing contracts: the wage model removes an unaffordable party member (`simulation.ts:178-182`), while the save validator rejects negative character gold (`saveService.ts:25-28`). The lodging fee is applied before the daily wage rule evaluates the remaining balance; if it no longer covers wages, the existing contract-ending rule runs instead of a later lodging debit leaving gold negative. Save validation remains intact.

The baseline reproduction is concrete and independent of the new test setup: `artifacts/reproduce_rest_wages.mjs` pins the base commit, uses the public engine route without state-field injection, and checks the pre-rest balance, post-rest balance, and deserialize failure. `astra-rest/red.log` records the targeted regression failing because the balance became `-4`; `green.log` records the same targeted suite passing after the fix. The new public-route regression in `actions.test.ts:35-52` performs the hire and purchases first, then confirms the player has 8 gold immediately before the overnight rest; it verifies the unpaid contract ends with gold at zero and round-trips the resulting state through `serialize`/`deserialize`.

The edge tests in `actions.test.ts:55-99` cover inn, tavern, and free rest at the 23:30 wage boundary with enough and insufficient balances; each checks resulting funds, party state, elapsed time, and save round-trip. Separate cases verify that an unaffordable paid rest leaves the full state unchanged and that a free rest rejected for a dead player does not charge or advance time. A controlled new-year case verifies the stated transaction policy when death interrupts recovery: the fee is charged once, time advances, recovery and the success event do not occur, and the state remains reloadable. This policy is consistent with the existing pre-simulation purchase/hire charging order.

## Evidence and disposition

- Astra's `REPORT.md` documents its RED/GREEN sequence and the stated limits. `edge-cases.log` records 28 passing cases; `check.log` records `npm run check` succeeding with 6 test files / 101 tests, `vue-tsc`, and production build. The report's two source hashes match the reviewed files.
- I did not rerun the full check because the recorded run matches the reviewed hashes and no finding or new failure warrants repetition.
- No Standards or Spec finding needs remediation, so no解除 condition remains. Code-level disposition: **acceptable**. This is not a review of UI evidence or the other playtest routes.
