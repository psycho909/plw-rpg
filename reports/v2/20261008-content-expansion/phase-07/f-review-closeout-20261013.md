# Phase 7-F independent review closeout — 2026-10-13

Disposition: **F is eligible for Root acceptance with a retained P2 evidence-history finding.** The current frozen source meets the approved F content, validator, material-use, recipe/loot, and regression criteria. The two earlier P1s are fixed. The Phase 7 cross-stage 100-item gate is not yet closed: current F contributes 96 unique qualified items, and the approved plan's 11 unique G crop goods would yield 107 only after G is implemented and validated. No F implementation blocker remains in the reviewed snapshot.

## Scope and snapshot

Authority: `tickets/20261008-v2x-07f-item-recipe-expansion.md`, approved `reports/v2/20261008-content-expansion/phase-07/f-content-plan.md`, parent Phase 7 ticket/spec, root `AGENTS.md`, and scoped review contract `docs/agents/review.md`.

Base and HEAD are `e05cc78f1ef452e2672df223f2febf48444dcbd3`. This review covers the live unstaged working-tree source, including the final goblin bias correction; it does not rely on HEAD alone. The working-tree SHA-256 values below match both before/after source maps in the 07:26 F validator run (117 files, no drift). Relevant staged diff was empty. No source, tests, or prior review files were changed by this review; no tests were rerun.

| File | Current SHA-256 |
| --- | --- |
| `src/data/content/caveInsects.ts` | `dcc14c74cfd9ce50803af7645fa0c52beb22288b15d29925cbf801ba1bde3bf3` |
| `src/data/content/wildBeasts.ts` | `bbae4d9882708fa77c200f6810db0c02b943d027f186ff5d89af7f62e5de785b` |
| `src/data/content/frontierGoblins.ts` | `61b109a69611743f6b4d3983fb252a40dc8a8d1758a4154af034fa2d91c9bb13` |
| `src/data/content/fogUndead.ts` | `ef0d2c7b071193acb26803128c9041874d9f763a4e929a7030c1cd0b68653e5e` |
| `src/data/content/mineConstructs.ts` | `ac24251494d94acc8a6acdb4d7349372ba9c212c17424d8a58864bb63ee32c00` |
| `src/data/content/slime.ts` | `334c031aa75c09e7612dd426d9d58284a1093efb5b773fcf5c8011640739edd2` |
| `src/engine/contentValidation.ts` | `0b716843cf23664c6bfc057043655b660979ab38ba8be3b3f3fdf7c433ed956f` |
| `src/engine/contentValidation.test.ts` | `cf14cadc9459f0e35d0469663160981432986ebeb0c55c5a8e80bbbfa96ea06a` |
| `src/engine/contentItems.integration.test.ts` | `0be844b6bb8f7dd6c1d762463d48982b0d4402d396dcf10b56ba5cc165f77f64` |
| `src/engine/remainingFamilies.integration.test.ts` | `38cdfcea7b9a029f529af2e8382fdc2f792f74f97dc5f4d559a399140909d913` |

Primary evidence:
- F validator run: `f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854`. Final-summary SHA-256: `dcdd3919f922f463d62a2261c83623dae7ee8422c6a99e297b2f1d5cd3dee6d6`.
- Focused goblin correction and full suite: `f-regression-run/attempt-03-goblin-bias-validation`. Report SHA-256: `2cdbb081aca767a9f1cff3429efe10bb5a2591f3f01d0e79b2722324417325e`.
- Integration scenario source is independently covered by the matching source-map hash above.

## Standards and spec findings

**Standards — pass.** The validator change is scoped to authoring QA and preserves generation, crafting runtime, persistence, and RNG behavior. Material duplicate comparison adds canonical mandatory recipe-output consumer functions, deduplicates those functions, and ignores invalid outputs; equipment comparison uses slot, combat stats, penetration, and effective affix eligibility while omitting sale price and prose/IDs. Tests cover consumer function distinctions, price-only non-distinction, invalid/duplicate consumer handling, clone exclusion, and real stat sidegrades.

**Spec — pass for F.** Each of six families has 11 monsters, 8 materials, 8 equipment, and 4 recipes; combined totals are 66/48/48/24. Slime's source SHA is restored to the HEAD baseline and remained unchanged in the final run. No save/RNG/core change is in scope. Materials, recipes, and equipment have validated real-use closure; the integration suite checks crafting from selected loot, consumption, generated/equipped item identity, save/reload, and sale. The controlled checks establish reachable links, not natural encounter rates or balance.

The corrected `frontier_goblin_scrap` bias is `piercing`, and the recipe output `frontier_goblin_scrap_spear` has `piercing`/`keen` eligibility. The attempt-03 focused regression exercises this compatibility together with planned gear's positive selected-loot exposure. Its targeted test passed, followed by a passing typecheck. This resolves the previously observed incompatible `striking` material bias.

### Prior P1 findings: fixed

1. `fog_undead_bellstaff` is a weapon with legal `piercing` and `keen` affixes; the selected `fog_undead_loot_lantern` table retains a positive drop weight. The final validator reports no errors.
2. Equipment semantics no longer distinguish items by `sell`; exact functional clone groups are rejected from qualification, while real combat-stat/affix sidegrades remain eligible. The final semantic audit reports 48 equipment, zero functional clone groups, and all 48 retained as qualified. The validator quality result is 48 usable materials plus 48 qualified gear; this is **96 unique F item IDs**, not an unfiltered count and not a count that subtracts clone groups twice.

The latest run reports zero warnings and zero errors in each of the seven cases. The old clone groups are absent from this current source snapshot, rather than being treated as passing warnings.

### P2 evidence-history finding remains

The first integration RED attempt's original raw artifact was overwritten by a retry. The archived reconstruction preserves diagnostics that were visible in the original tool output, with exact pre-run source snapshots and failure metadata, but the original raw bytes cannot be independently recovered or byte-verified. Attempts 02–03 and the final successful integration evidence are retained. This remains a historical evidence-retention limitation; it is not a current code or test failure and must not be described as recovered original raw output.

## Verification and gates

- Seven CLI invocations (six individual packs plus combined): 7/7 exit 0, content PASS, zero errors/warnings; each records 23 validator tests, typecheck and publisher pass. The run retains exact inputs, before/after source maps, and input/source fingerprints with no mismatch.
- Combined content counts: 66 monsters, 48 materials, 48 equipment, 24 recipes. Semantic gear audit: 0 clone groups; 48/48 qualified gear.
- Focused integration regression: 1 selected test passed (12 sibling tests skipped by the name filter); `vue-tsc --noEmit` passed.
- Full `npm run check`: 605/605 tests across 34 files and production build passed. The report explicitly records no browser/E2E scenario, so UI/browser behavior is not established here.
- Quantity: F = 48 materials + 48 non-clone gear = 96. The approved G plan's 11 distinct crop goods project to 107, margin 7. Because G implementation and runtime use evidence are still outstanding, the cross-stage ≥100 acceptance must remain open until those goods are actually validated.

## Recommendation

Root may accept **Phase 7-F with findings**, retaining the P2 history limitation in the ticket/evidence. There is no current F blocker. Do not mark the overall Phase 7 ≥100-item gate complete based on planned G goods; require G's implemented, unique goods and runtime paths to pass their own validation first.

