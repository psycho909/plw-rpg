# C2 outdoor-content dungeon-branch RED

Captured from the original focused Vitest run; no rerun is represented here.

Command:

```text
./node_modules/.bin/vitest run src/engine/contentFamilies.test.ts -t 'does not advance dungeon state or award dungeon-clear iron for an outdoor content win'
```

Raw tool output:

```text
 RUN  v4.1.11 /workspace/plw-rpg

 ❯ src/engine/contentFamilies.test.ts (8 tests | 1 failed | 7 skipped) 17ms
     × does not advance dungeon state or award dungeon-clear iron for an outdoor content win 16ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/engine/contentFamilies.test.ts > authored family runtime > does not advance dungeon state or award dungeon-clear iron for an outdoor content win
AssertionError: expected { discovered: false, threat: 1, …(4) } to deeply equal { discovered: false, threat: 1, …(4) }

- Expected
+ Received

  {
    "discovered": false,
    "inDungeon": false,
    "progress": 0,
-   "runs": 0,
-   "stage": 2,
+   "runs": 1,
+   "stage": 3,
    "threat": 1,
  }

 ❯ src/engine/contentFamilies.test.ts:101:32
     99|     expect(combatTurn(state, 'attack')).toBe('')
    100|
     101|     expect.soft(state.dungeon).toEqual(dungeonBefore)
       |                                ^
     102|     expect.soft(player(state).inventory.iron).toBe(ironBefore)

 FAIL  src/engine/contentFamilies.test.ts > authored family runtime > does not advance dungeon state or award dungeon-clear iron for an outdoor content win
AssertionError: expected 3 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 3

 ❯ src/engine/contentFamilies.test.ts:102:47
    100|
    101|     expect.soft(state.dungeon).toEqual(dungeonBefore)
    102|     expect.soft(player(state).inventory.iron).toBe(ironBefore)
       |                                               ^
    103|   })
    104|
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 Test Files  1 failed (1)
      Tests  1 failed | 7 skipped (8)
   Start at  05:51:29
   Duration  572ms (transform 351ms, setup 0ms, import 418ms, tests 17ms, environment 0ms)
```

The unified exec result reported `exit_code: 1`. Both focused invariants failed: the outdoor Slime victory advanced the final dungeon stage and run count, then awarded 3 iron.
