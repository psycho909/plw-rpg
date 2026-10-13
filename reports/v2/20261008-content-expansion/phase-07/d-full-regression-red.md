# Phase 7-D Full Regression — Initial RED

- Branch: `v2x/reward-core`
- Source HEAD: `fd6b5e84bef73d5dc429201c903d4a867976cd0a`
- Run: `npm run check`
- Start / end: 2026-10-12 06:56:07–06:56:27 UTC
- Exit: 1 during `npm run test`; build and typecheck did not run.
- Vitest: 31 files, 28 passed / 3 failed; 570 tests, 567 passed / 3 failed; duration 17.07 s (reported per-test aggregate 34.18 s).

## Original failures

### 1. Legacy recipe exact-list assertion includes the new D recipe

Test: `crafting skill capabilities > defines the four approved recipes with their exact costs, outputs, unlocks, stations and practice caps` in `src/engine/crafting.test.ts:233`.

The test filters only `!recipe.id.startsWith('slime_')` and then expects the original four recipes. Runtime registration now also contains `cave_insect_chitin_spear_recipe` (14 gold, 15 stamina, 90 min, chitin spear output, smithing 4, blacksmith), so the exact legacy list has one additional item. This is a test-scope mismatch from the intended D registry expansion; no runtime crafting assertion was reported failing.

### 2. Crafting projection legacy-row assertion includes the new D recipe

Test: `crafting UI projection > lists legacy recipes unchanged and projects the exact Slime recipes with their denials` in `src/presentation/craftingProjection.test.ts:78`.

The legacy-row filter excludes `slime_` only, so it now includes `{ id: 'cave_insect_chitin_spear_recipe', name: '鍛造甲質穿刺矛', unlocked: false }` while comparing against the four original rows. This is a test-scope mismatch from the intended D registry expansion.

### 3. 500-year deterministic save test exceeded its configured timeout in the full suite

Test: `versioned saves and deterministic continuation > round trips 500 years of history, natural deaths and successors and continues deterministically` in `src/services/saveService.test.ts:708`.

Vitest reported `Test timed out in 15000ms`; observed test duration was 15,268 ms. The original stack identified the test at line 708 and its loop begins at line 710. No timeout was changed.

## Controlled follow-up

The same test was run in isolation once, without code/config changes:

```text
npm test -- --run src/services/saveService.test.ts -t 'round trips 500 years of history, natural deaths and successors and continues deterministically'
Exit 0; 1 passed, 106 skipped; Vitest duration 9.95 s; wall duration 11 s.
```

This isolated pass does not erase the original full-suite timeout. Root cause of the timing difference is not confirmed; likely suite contention remains a hypothesis, not a verified conclusion. The full `npm run check` must be rerun after the intended test-scope fixes; do not increase the timeout merely to hide the original result.

Raw stdout was not written to a file by the runner. Failure excerpts above are transcribed from the runner's returned tool result; no secret-bearing output was involved.
