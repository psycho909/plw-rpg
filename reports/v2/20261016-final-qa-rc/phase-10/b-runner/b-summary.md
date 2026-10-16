# Phase 10-B Runner Summary

**Disposition: PASS.** Cross-system engine coverage passed. Both normal fresh-save routes completed: the explicitly labelled optional influence-material path, and the stronger required adventure-input path. No product defect was reproduced and no product source was changed.

## Commands and results

1. Targeted Phase 10-B regression:

   ```powershell
   npx.cmd vitest run src/engine/phase10Integration.test.ts src/engine/contentFamilies.test.ts src/engine/contentBosses.integration.test.ts src/engine/remainingFamilies.integration.test.ts src/engine/caveInsects.integration.test.ts src/engine/actions.test.ts src/engine/bossSaveReload.test.ts src/engine/lifeIntegration.test.ts src/engine/crisisAdventure.test.ts src/engine/crisisContributions.test.ts src/engine/crisisResolution.test.ts src/engine/identity.test.ts src/engine/crafting.test.ts src/engine/crops.integration.test.ts src/engine/ownership.test.ts
   ```

   Result: **exit 0; 15 test files passed; 255 tests passed**; 28.13 seconds. Runtime: Windows 10.0.22621 x64, Node v22.14.0, Vitest 4.1.11. Full console output: `targeted-vitest.log`.

2. Final B route/test file after fixing test-only TypeScript errors (`WolfEncounterOption.label`; `console.log`; discriminated `CraftResult` failure branches). No product source or dependencies changed:

   ```powershell
   npx.cmd vitest run src/engine/phase10Integration.test.ts --silent=false
   ```

   Result: **exit 0; 1 file / 3 tests passed**. Attempt A: **COMPLETED — NORMAL PROGRESSION (optional influence-material path)**; seed 20261016; initial wolf fang 0; material acquired, used as an optional `starterSpear` influence, equipped and followed by another eligible adventure at world time 1035 (0.39 days). Attempt B: **COMPLETED — NORMAL PROGRESSION (required adventure-input path)** under a 2-game-year / 7,000-action cap; fresh seed 20261017; settlement first observed at village, growth 85.50, at day 68.70; blacksmith built at world time 99405. After legal station-hour waiting, `planCraft` reported it available at world time 99900 (day 69.04). The route crafted `slime_resin_guard_recipe` at 99960, equipped it, and started an eligible gray-wolf encounter at 100015 (day 69.12); total 1,675 public action calls. Route evidence is in `required-attempt.log`; the earlier 30-day stop is retained in `required-attempt-30d.log`.

3. Vue and TypeScript check after the test-only typing fixes:

   ```powershell
   npx.cmd vue-tsc --noEmit
   ```

   Result: **exit 0; no diagnostics**.

4. Baseline reference only (performed by Phase 10-A lead; not rerun by B): `npm.cmd run check` — 41 files / 650 tests plus typecheck and build passed, recorded in `a-check-run/npm-run-check-baseline-2c93a08.log`.

## Failed attempts retained in this summary

- Initial new test incorrectly required the guaranteed wolf material drop to create an equipment instance with item provenance. The assertion failed; the contract is material provenance via the material source plus craft provenance on the created item. Existing `itemGeneration.test.ts` and `contentBosses.integration.test.ts` cover generated item provenance. This was a test assumption error, not a product defect.
- The first controlled workstation setup used `(12, 8)` and was rejected as too far from the store. It was corrected to `BUILDINGS.store.position`, matching the canonical station contract. The first normal-route harness also used that incorrect coordinate; after correcting the route to the configured workstation, the fresh-save attempt completed. No product defect was filed.
- The first in-sandbox aggregate Vitest invocation failed before test startup with esbuild `spawn EPERM`. The approved elevated retry ran the same aggregate command and passed. This is recorded as runner/environment evidence, not a product failure.

## Scope and findings

- New allowed test file: `src/engine/phase10Integration.test.ts`.
- Reports: `../cross-system-integration.md` and `../adventure-life-hybrid.md`.
- Product `src/` behavior was not modified. No reproducible P0–P2 defect was found; no before/after product fix exists.
- Browser rendering, modal/navigation, mobile layout and performance remain Phase 10-E scope.
- Merchant stock/restock remains **NOT MODELED**. Threat saturation remains Owner decision **KEEP V0**. Human goals/fun/retention remain **DEFERRED**. Normal fresh-save and controlled fixture counts remain separate.
- Phase10-A validator portability/publisher limitation remains open as described in the baseline and risk register; B does not claim to resolve it.

## Pending lead commands

- Fold these reports into Phase 10-F synthesis and carry forward P10-F01 as two distinct completed normal routes: optional influence-material path and required adventure-input path. Note that the latter waits for natural settlement growth; Home workbench does not replace the blacksmith for that recipe.
- Carry forward P10-F03 / F04 / F05 dispositions and the validator tooling limitation.
- Continue the planned C–E work, then run final lead-owned `npm.cmd run check` and `npm.cmd run build` against the final source, followed by the specified internal independent review and handoff.
- No B-owned defect fix or additional B verification command is pending.
