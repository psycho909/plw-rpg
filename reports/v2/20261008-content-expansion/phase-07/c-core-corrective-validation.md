# C1/C2/C3 corrective validation

Base source HEAD remains Root-reported `a1307d220a68213be6465bc40e0a85af8ec605a3`; no Git metadata was queried. The first-failure C1 and C2 artifacts are `c1-cooldown-race-red.md` and `c2-outdoor-dungeon-red.md`. C3 pre-fix outputs are in `c3-director-capacity-red.md`. They remain separate from this post-fix run.

The Slime loot-to-craft-to-equip-save witness now earns its four resin through four canonical `encounterContentMonster` / `combatTurn` victories. It uses a deterministic controlled fixture with the combat HP reduced to 1 for each fight; it does not claim natural encounter exposure or call the loot award helper to pad inventory.

## Focused post-fix tests

Command:

```text
./node_modules/.bin/vitest run src/engine/contentFamilies.test.ts src/engine/livingEvents.test.ts src/services/saveService.test.ts src/services/rewardSave.test.ts src/engine/actions.test.ts src/engine/simulation.test.ts src/engine/itemGeneration.test.ts
```

Combined stdout/stderr:

```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  7 passed (7)
      Tests  252 passed (252)
   Start at  06:03:39
   Duration  14.78s (transform 1.25s, setup 0ms, import 1.72s, tests 17.93s, environment 3ms)
```

Executor result: `exit_code: 0`.

## Type check

Command:

```text
./node_modules/.bin/vue-tsc --noEmit
```

The executor returned empty combined stdout/stderr and `exit_code: 0`.

The broad 531-test regression baseline was not rerun by this core owner; Root assigned the post-review full retry to Low.
