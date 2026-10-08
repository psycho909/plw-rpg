# Phase 7 C validation transcript excerpts

This artifact preserves the command output still available in the agent tool transcript at the time of capture. It is not a rerun. The `vue-tsc` command was silent; because the shell used `&&` and Vitest started, it exited successfully, but its separate raw output and exit record were not emitted by the tool.

## Initial combined gate with the authored-economy assertion

Command:

```text
./node_modules/.bin/vue-tsc --noEmit && ./node_modules/.bin/vitest run src/engine/contentFamilies.test.ts src/engine/itemGeneration.test.ts src/engine/wolfFamily.test.ts src/services/saveService.test.ts src/engine/crafting.test.ts src/engine/actions.test.ts src/engine/crisisAdventure.test.ts src/presentation/worldUI.test.ts src/engine/rewardActions.test.ts src/services/rewardSave.test.ts src/engine/simulation.test.ts
```

The first returned test-run excerpt was:

```text
 RUN  v4.1.11 /workspace/plw-rpg

 ❯ src/engine/rewardActions.test.ts (24 tests | 1 failed) 69ms
     × keeps maximum-premium expected proceeds below bought-input costs for all recipes and material modes 4ms
```

The final returned Vitest output was:

```text

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/engine/rewardActions.test.ts > procedural equipment sales > keeps maximum-premium expected proceeds below bought-input costs for all recipes and material modes
AssertionError: slime_moss_coat_recipe with influence material none: expected 60.918000000000006 to be less than 57
 ❯ src/engine/rewardActions.test.ts:152:12
    150|         const materialOpportunityCost = material ? MATERIALS[material]…
    151|         expect(expectedAtMaximumPremium, `${recipe.id} with influence …
    152|           .toBeLessThan(boughtInputCost + materialOpportunityCost)
       |            ^
    153|       }
    154|     }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 363 passed (364)
   Start at  05:33:56
   Duration  14.44s (transform 1.01s, setup 0ms, import 1.65s, tests 17.25s, environment 4ms)
```

The unified exec result reported `exit_code: 1`. Earlier polling chunks and the silent `vue-tsc` stdout are not separately recoverable beyond the excerpts above. The failure is a bounded expected-value finding from earned-only Slime materials, as documented in `c-core.md`, not evidence of a repeatable purchase cycle.

## Final combined gate after changing the economy test to purchase-cycle eligibility

Command:

```text
./node_modules/.bin/vue-tsc --noEmit && ./node_modules/.bin/vitest run src/engine/rewardActions.test.ts src/engine/contentFamilies.test.ts src/engine/itemGeneration.test.ts src/engine/wolfFamily.test.ts src/services/saveService.test.ts src/engine/crafting.test.ts src/engine/actions.test.ts src/engine/crisisAdventure.test.ts src/presentation/worldUI.test.ts src/services/rewardSave.test.ts src/engine/simulation.test.ts
```

The returned Vitest output was:

```text
 RUN  v4.1.11 /workspace/plw-rpg

 Test Files  11 passed (11)
      Tests  365 passed (365)
   Start at  05:36:23
   Duration  15.11s (transform 1.15s, setup 0ms, import 1.82s, tests 18.06s, environment 4ms)
```

The subsequent unified exec poll reported `exit_code: 0` with empty output. The silent `vue-tsc` stage has no raw text artifact; its success is evidenced by Vitest launching after `&&` and by the combined command's zero exit status.

## Other economy evidence

The earlier resin-guard bound `32.782` expected sale versus `31` full replacement cost was summarized in the contemporaneous task report and Low's recorded Slime validation report, but its original Vitest failure block is not present in the retained tool transcript. Therefore no raw block for that run is reproduced here. Root approved fee 8→11; the final pack/validator and exact hashes remain in `c-core.md` and `slime-content-validation.md`.
