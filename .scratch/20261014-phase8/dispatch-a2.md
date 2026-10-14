# Dispatch A2 — Phase8-A RETURNED (shared normal-route baseline)

Owner: `g6-luna-med-engineer` (same scope rules as `dispatch-a.md`; Root-only Git; `git diff -- src` must stay empty).

Lead review of A1: honest and well-labelled, but every normal-play metric is deferred. B, C and E all need one shared, reproducible normal-route "before" baseline; measuring it once here avoids three duplicate runs. Merchant stock/restock instrumentation moves to C, crisis-cycle distributions to D, physical storage to F — do NOT do those here.

Environment update: dependencies are now installed (`npm ci` by lead). Your Codex sandbox may still not resolve them; if a command needs `node_modules`, list it as pending lead execution instead of requesting escalation.

## Tasks

1. **Test convention fix.** `scripts/` tests use `node:test` + `node:assert/strict` run via `node --test` (see `scripts/test_validate_content_batch.mjs`, `scripts/README.md`); Vitest only includes `src/**/*.test.ts`, so your Vitest file never runs. Convert `classify-playtest.test.mjs` to `node:test` (rename to `scripts/phase8/test_classify_playtest.mjs` to match convention) and add the command to `scripts/README.md`.
2. **Raw combat extraction (P8-F01/F04).** From existing raw records under `reports/v2/20261008-content-expansion/phase-07/j-formal-20261013/combat-attempt-05/` (do not re-run), extract per rank × progression band × build: turns P10/P50/P90, damage taken, potion use, remaining HP, and fight cost where the records contain them. Mark fields absent from the raw data as NOT AVAILABLE.
3. **Deterministic normal-route baseline (P8-F01/F02/F03/F04).** Using the existing engine/public game APIs only — reuse the Phase7 harness pattern in `phase-07/qa_simulation.test.ts` / `qa_simulation.config.ts` (and `g-economy-simulation/`) rather than inventing a new engine — drive three explicit, documented fresh-save route policies: **Life** (gather/farm/craft/sell, no voluntary combat), **Adventure** (explore/fight/equip, minimal life), **Hybrid**. Each policy must choose only actions a player could legally take in that state. Run ≥ 3 seeds per route over a fixed in-game window you justify (e.g. several in-game years), staying ≤ 15 min wall time per run.
   Record time series / per-seed outputs for: encounters by family and rank (Normal/Elite/MiniBoss/Boss) and the progression band at first encounter; combat win/death/retreat; time to first meaningful gear upgrade and gaps between upgrades; gold and material income; crafting count and smithing/skill progression and unlock times; masterpiece eligibility/occurrence; crop yield; actions with no state progress, classified by your classifier's categories.
   Label everything **Normal fresh-save (scripted policy)**, distinct from controlled fixtures and from the Phase7 browser heuristic. Note policy limitations explicitly (a scripted policy is not a human).
   If the harness cannot run outside your sandbox, write it so the lead can run one command, and list that command as pending lead execution.
4. Runner writes into `reports/v2/20261014-balance-tuning/phase-08/a-baseline-run/attempt-<UTC>/` with manifest (HEAD, src fingerprint, seeds, route policy version, command). Never delete prior attempts.
5. Update `baseline.md`: fill the newly measured rows, keep NOT MEASURED rows that move to C/D/F with an explicit "owner lane" column, and refresh the B–E triage based on the new data.

## Output

Update `a-worker-summary.md` (append an "A2" section; keep A1 text) with changed files, commands and real results, pending-lead commands, open questions. Reply with only that path.
