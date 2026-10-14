# Dispatch — Phase8-A Baseline & Measurement

- Role: `g6-luna-med-engineer` (requested gpt-6-luna / medium; observed Codex label "GPT-6-Luna default"; runtime effort Unknown)
- Single owner of: `scripts/phase8/**` (new), `tests/**` additions for those scripts only, `reports/v2/20261014-balance-tuning/phase-08/**` (new).
- Orchestrator: Claude Code lead in Herdr pane `w3:p1`. Root-only Git: **do not commit, push, branch, stash or reset.**

## Read first

1. `AGENTS.md`, `docs/agents/agent-routing.md` §3 (runner-driven rule).
2. `tickets/20261014-v2x-08a-baseline.md` (your Acceptance) and parent `tickets/20261014-v2x-08-balance-tuning.md`.
3. `docs/specs/V2X-PHASE8-BALANCE-TUNING.md` §3, §5, §9 (runner vs product), §10, §12.
4. Phase7 evidence to REUSE before measuring anything new: `reports/v2/20261008-content-expansion/phase-07/` — `content-coverage.json`, `content-findings.md`, `monster-balance.md`, `loot-analysis.md`, `crafting-economy.md`, `long-world.md`, `agent-content-playtest.md`, `agent-playtest-{life,adventure,hybrid}.md`, `browser-stress.md`, `baseline.md`, `final-review.md`, and existing runners under `scripts/` (e.g. `qa_simulation*`, `qa_browser*`).

## Task

Build the Phase8 balance baseline for the Phase7 delivery source WITHOUT changing balance values or game rules.

1. Inventory which §5 metrics (Combat / Reward / Life / World) Phase7 evidence already measures validly; cite path + sample/seed. Do not re-run those.
2. For gaps, write deterministic read-only runners in `scripts/phase8/` using the existing engine (no second simulation engine). Priority gaps: P8-F01 natural encounter / Elite / MiniBoss / Boss exposure and outcome per Early/Mid/Late on normal fresh-save routes vs controlled fixtures; P8-F03 merchant buy/sell/stock/restock cycle observability; P8-F02 a no-progress classification method (runner / UI / resource / world-wait / goal) applied to existing Phase7 playtest logs; P8-F05 world metrics from existing long-world output if sufficient.
3. P8-F06: only if cheap with existing Playwright tooling, record `navigator.storage.estimate()` usage/quota and IndexedDB record counts separately from JSON-estimated bytes; otherwise mark NOT MEASURED with reason (F will cover it).
4. Runners must run to completion on their own and write JSON/CSV/log plus a manifest (HEAD, src fingerprint method + value, seeds, command) into `reports/v2/20261014-balance-tuning/phase-08/a-baseline-run/`. Do not babysit long runs; keep any single run ≤ 15 min.
5. Write `reports/v2/20261014-balance-tuning/phase-08/baseline.md`: per metric — value/distribution, source (reused path or new run), sample size, seeds, Normal vs Fixture, uncertainty, or `NOT MEASURED` + reason. Then P8-F01..F06: evidence summary, current reading, recommended B–E priority. Never declare an ideal win/drop rate as a product requirement.

## Constraints

- `git diff -- src` must stay empty. If a metric truly needs a hook in `src/`, STOP and report the exact proposal instead of editing.
- No new dependencies. Phase7 baseline HEAD `a66427c`; current HEAD `eb4946c` (docs only after Phase7 delivery `b71201e`; src identical).
- Verification: tests for new script logic (`npx vitest run <your tests>`), then `npm run check` once at the end. Record actual results; do not claim unrun checks.

## Output

When done, write `reports/v2/20261014-balance-tuning/phase-08/a-worker-summary.md` (changed files, commands run with results, metrics measured / reused / NOT MEASURED, open questions, any src-hook proposal) and reply with only that file path. If blocked, write the same file with `BLOCKED:` and the reason, and reply with the path.
