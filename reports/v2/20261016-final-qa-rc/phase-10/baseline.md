# Phase 10-A — Final Baseline & Feature Freeze

- Date: 2026-10-16
- Branch / HEAD: `v2x/reward-core` / `baa2a2947be643fc847a2a731e3479d6287a6150`
- Remote: `origin/v2x/reward-core`; initial checkout reported up to date. No commit or push performed.
- Scope: baseline and evidence inventory only. No `src/` files changed.
- Feature Freeze: only defects supported by concrete, reproducible evidence may change product source. No feature, balance, save-format, or merchant-economy expansion is authorized by this phase.

## Delivery inventory

- Formal specifications present: `V2-LIFE-EMERGENCE.md`; `V2X-REWARD-RETENTION.md`; `V2X-PHASE4-ADVENTURE-REWARD.md`; `V2X-PHASE5-LIFE-CRAFTSMANSHIP.md`; `V2X-PHASE6-REGIONAL-CRISIS.md`; `V2X-PHASE7-CONTENT-EXPANSION.md`; `V2X-PHASE8-BALANCE-TUNING.md`; `V2X-PHASE9-UI-UX-POLISH.md`; `V2X-PHASE10-FINAL-QA-RC.md`. Phase0–3 formal Specs were not found in `docs/specs/`; early phase work is represented by tickets and later consolidated specs/reports. This is an inventory gap, not evidence that the historical work did not occur.
- Accepted delivery parents: Phase7 `tickets/20261008-v2x-07-content-expansion.md` (PASS WITH FINDINGS); Phase8 `tickets/20261014-v2x-08-balance-tuning.md` (PASS WITH FINDINGS); Phase9 `tickets/20261015-v2x-09-ui-ux-polish.md` (PASS WITH FINDINGS, Owner review pending per final report). Their final reports are linked in the risk register.
- Contracts: `docs/UI.md` exists. `docs/API.md`, `docs/CONTEXT.md`, and `docs/adr/` are absent; no API/domain/ADR artifact is currently published at those paths. No scoped `AGENTS.md` exists below root.
- Content modules: `src/data/content/` contains 7 TypeScript modules (six monster packs plus farm crops). The accepted Phase7 extraction manifest records six expansion packs: 66 monster definitions, 72 loot tables, 48 equipment definitions, 48 materials, and 24 recipes. Phase7 validation reports 107 authoring-qualified candidate item IDs and 48 usable new materials. Its counts are historical accepted evidence; see current-source validator result below.
- Test coverage map (representative files): save/migration — `src/services/saveService.test.ts`, `src/stores/gameStore.test.ts`; deterministic simulation — `src/engine/simulation.test.ts`, `src/engine/gameLoop.test.ts`; succession/history — `src/engine/identity.test.ts`, `src/engine/npcLife.test.ts`; crisis — `src/engine/regionalCrisis.test.ts`, `src/engine/crisisResolution.test.ts`, `src/engine/crisisContributions.test.ts`, `src/engine/crisisAdventure.test.ts`; combat — `src/engine/combatStats.test.ts`; loot/equipment — `src/engine/itemGeneration.test.ts`; crafting/life — `src/engine/crafting.test.ts`, `src/engine/lifeIntegration.test.ts`. The complete current suite is the lead check log below.
- Browser runner families: `scripts/phase8/` simulation/browser suites and `scripts/phase9/` including `f-browser.mjs`, `f-regression.mjs`, and `audit-runner.mjs`. Phase9 accepted browser evidence is retained under its `f1-runner/` directory.

## Verification and source/build identity

- Lead-owned current check: `npm.cmd run check` PASS, 41 test files / 650 tests; `vue-tsc --noEmit` and Vite production build passed. Evidence: `a-check-run/npm-run-check-baseline-2c93a08.log`. This is the current run log supplied by the lead, not the historical Phase9 baseline.
- Content validator: `node scripts/validate_content_batch.mjs --pack reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/packs/six-family-combined.json --report reports/v2/20261016-final-qa-rc/phase-10/a-runner/content-validation.md`
  - Semantic content validation: **PASS** (zero validation errors), captured in `a-runner/.qa-runs/2026-10-16T03-25-11.678Z-0153933c-b29b-402a-a208-12e2ea87790a/outcome.json`.
  - Overall validator: **FAIL / incomplete**. Its child `targetedTests` and `typecheck` both failed before execution with `spawnSync npm ENOENT` because this Windows runner calls `npm` instead of `npm.cmd`. The script's final report publication also failed (exit 9009) because `python3` is unavailable. No report was published. The validator would need a Windows-aware npm executable invocation and Python 3 available (or its approved publisher path) for a complete PASS. Do not count child tests/typecheck as passed here; the lead check separately passed them.
  - Initial non-elevated invocation could not capture Git HEAD/branch. The approved elevated invocation captured them and ran the semantic check; its result is the evidence above.
- Source SHA-256 algorithm used by the Phase9 browser suite (sorted relative path + each file SHA-256, then SHA-256 of newline-joined `path:digest` rows): `d312c8b3a95f96ba6609d2531fd770d2b19df3ac64a7796905c2c1fa29ecd305` (119 tracked source files). Exact match with Phase9 F1 `manifest.json` and `closeout.json`.
- Lead fingerprint supplied by dispatch: `e4e86589…b51b` (119 files; the dispatch abbreviates the digest). Browser-suite fingerprint above is exact and independently reproduced.
- Source diff from Phase9 tested source `c0a377b50e09b67664bc07b65d4e81a382daa53f`: empty (`git diff c0a377b...HEAD -- src`). Working tree initially had only pre-existing untracked `.scratch/20261016-phase10/`; this task writes Phase10 reports only.
- Current `dist/` fingerprint (same sorted path/hash-row algorithm): `7f5efed239807081c82b1ba48d8b6c1befb24291642509deb32e29cf134d5e00` across 3 files. It differs from Phase9's `72dfd027170eb4a129fda4bc564ebff553138d2fbfbba4238c521d76a07b4d04`; `dist/` latest timestamp is 2026-10-16 03:19:12 UTC, and HEAD commit time is 03:20:08 UTC. The current directory's build provenance cannot be established from timestamps alone; the lead's check did build production output, but no corresponding output fingerprint was recorded. Lead should rebuild/capture the build fingerprint if a correlated production artifact is required downstream.
- Environment: Windows 10.0.22621 x64; Node v22.14.0; npm 11.11.1; PowerShell 5.1. No current browser test was run in Phase10-A.

## Baseline disposition

Phase9 tested source is unchanged and the lead's full check passes. Content semantics pass for the supplied six-family combined pack, while the validator's helper checks/publication are incomplete due Windows command availability. No current evidence indicates a P0/P1 defect. Product source is frozen pending risk-based Phase10 B–E verification; findings and owners are in `final-risk-register.md`.

