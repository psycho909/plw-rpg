# C3 director-capacity regression RED

These are the pre-fix outputs from the three focused RED runs. The unified executor returned combined command output; it did not expose separate stdout and stderr streams. Each command returned exit code 1. C1 and C2 first-failure evidence remains in `c1-cooldown-race-red.md` and `c2-outdoor-dungeon-red.md`.

## Full map without daily marker

Command:

```text
./node_modules/.bin/vitest run src/engine/livingEvents.test.ts -t 'skips a daily event pass|does not add hunt progress'
```

Combined stdout/stderr:

```text

 RUN  v4.1.11 /workspace/plw-rpg

 ❯ src/engine/livingEvents.test.ts (14 tests | 2 failed | 12 skipped) 17ms
     × skips a daily event pass when the cooldown map is full and has no daily marker slot 10ms
     × does not add hunt progress when the daily marker used the last cooldown slot 5ms

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/engine/livingEvents.test.ts > world-driven requests > skips a daily event pass when the cooldown map is full and has no daily marker slot
AssertionError: expected [ 'held:0', 'held:1', 'held:2', …(98) ] to have a length of 100 but got 101

- Expected
+ Received

- 100
+ 101

 ❯ src/engine/livingEvents.test.ts:244:56
    242|     dailyLivingEvents(state)
    243|
    244|     expect(Object.keys(state.life.director.cooldowns)).toHaveLength(10…
       |                                                        ^
    245|     expect(state.life.director.cooldowns['director:lastDailyTick']).to…
    246|     expect(deserialize(serialize(state)).state).toEqual(state)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/engine/livingEvents.test.ts > world-driven requests > does not add hunt progress when the daily marker used the last cooldown slot
AssertionError: expected 1 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 1

 ❯ src/engine/livingEvents.test.ts:267:31
    265|     expect(state.life.director.cooldowns['director:lastDailyTick']).to…
    266|
    267|     expect(recordHunt(state)).toBe(0)
       |                               ^
    268|     expect(request.progress).toBe(beforeProgress)
    269|     expect(arc.outcome).toBe('pending')

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 12 skipped (14)
   Start at  05:56:04
   Duration  481ms (transform 278ms, setup 0ms, import 338ms, tests 17ms, environment 0ms)
```

Executor result: `exit_code: 1`.

## Candidate filtering when midnight uses the final slot

Command:

```text
./node_modules/.bin/vitest run src/engine/livingEvents.test.ts -t 'filters new daily event candidates'
```

Combined stdout/stderr:

```text

 RUN  v4.1.11 /workspace/plw-rpg

 ❯ src/engine/livingEvents.test.ts (15 tests | 1 failed | 14 skipped) 13ms
     × filters new daily event candidates when the marker consumes the final cooldown slot 11ms

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/engine/livingEvents.test.ts > world-driven requests > filters new daily event candidates when the marker consumes the final cooldown slot
AssertionError: expected 3245714981 to be 2409744990 // Object.is equality

- Expected
+ Received

- 2409744990
+ 3245714981

 ❯ src/engine/livingEvents.test.ts:266:28

    264|     expect(Object.keys(state.life.director.cooldowns)).toHaveLength(10…
    265|     expect(state.life.arcs.filter(arc => !arc.resolved)).toHaveLength(…
    266|     expect(state.rngState).toBe(rngBefore)
       |                            ^
    267|     expect(deserialize(serialize(state)).state).toEqual(state)
    268|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 14 skipped (14)
   Start at  05:56:18
   Duration  468ms (transform 280ms, setup 0ms, import 333ms, tests 13ms, environment 0ms)
```

Executor result: `exit_code: 1`.
