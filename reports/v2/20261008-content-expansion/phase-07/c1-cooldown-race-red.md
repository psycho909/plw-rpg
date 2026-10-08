# C1 cooldown-capacity race RED

Captured from the original focused Vitest run; no rerun is represented here.

Command:

```text
./node_modules/.bin/vitest run src/engine/contentFamilies.test.ts -t 'keeps a boss defeat cooldown and save valid when combat crosses a full director-key boundary'
```

Raw tool output:

```text
 RUN  v4.1.11 /workspace/plw-rpg

 ❯ src/engine/contentFamilies.test.ts (7 tests | 1 failed | 6 skipped) 37ms
     × keeps a boss defeat cooldown and save valid when combat crosses a full director-key boundary 36ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/engine/contentFamilies.test.ts > authored family runtime > keeps a boss defeat cooldown and save valid when combat crosses a full director-key boundary
AssertionError: expected undefined to be defined
 ❯ src/engine/contentFamilies.test.ts:154:76

 Test Files  1 failed (1)
      Tests  1 failed | 6 skipped (7)
   Start at  05:48:42
   Duration  591ms (transform 366ms, setup 0ms, import 433ms, tests 37ms, environment 0ms)

    152|     expect(state.combat).toBeNull()
    153|
    154|     expect.soft(state.life.director.cooldowns['content-boss:slime_hear…
       |                                                                            ^
    155|     expect.soft(state.reward.bossForms.slime_heart).toBeUndefined()
    156|     const saved = deserialize(serialize(state, 123459)).state
       |                                                                            ^

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  src/engine/contentFamilies.test.ts > authored family runtime > keeps a boss defeat cooldown and save valid when combat crosses a full director-key boundary
AssertionError: expected { familyId: 'slime', …(5) } to be undefined

- Expected:
undefined

+ Received:
{
  "context": {
    "hunted": 0,
    "population": 12,
    "region": "forest",
    "safety": 88,
    "threatLevel": 3,
  },
  "definitionId": "slime_heart",
  "familyId": "slime",
  "formedAt": 87779,
  "turn": 0,
  "variantId": "slime_heart_surging",
}

 ❯ src/engine/contentFamilies.test.ts:155:53
    153|     expect.soft(state.life.director.cooldowns['content-boss:slime_hear…
    154|     expect.soft(state.reward.bossForms.slime_heart).toBeUndefined()
       |                                                     ^
    155|     const saved = deserialize(serialize(state, 123459)).state

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  src/engine/contentFamilies.test.ts > authored family runtime > keeps a boss defeat cooldown and save valid when combat crosses a full director-key boundary
AssertionError: expected undefined to be defined
 ❯ src/engine/contentFamilies.test.ts:157:76

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  src/engine/contentFamilies.test.ts > authored family runtime > keeps a boss defeat cooldown and save valid when combat crosses a full director-key boundary
AssertionError: expected { familyId: 'slime', …(5) } to be undefined

- Expected:
undefined

+ Received:
{
  "context": {
    "hunted": 0,
    "population": 12,
    "region": "forest",
    "safety": 88,
    "threatLevel": 3,
  },
  "definitionId": "slime_heart",
  "familyId": "slime",
  "formedAt": 87779,
  "turn": 0,
  "variantId": "slime_heart_surging",
}

 ❯ src/engine/contentFamilies.test.ts:158:53
    156|     const saved = deserialize(serialize(state, 123459)).state
    157|     expect.soft(saved.life.director.cooldowns['content-boss:slime_hear…
       |                                                     ^
    158|     expect.soft(saved.reward.bossForms.slime_heart).toBeUndefined()

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯⎯⎯⎯⎯
```

The unified exec result reported `exit_code: 1`. Raw output confirms the boss cooldown was not written and the frozen form remained after victory. Serialization/deserialization succeeded at 100 cooldown keys; the test's explicit saved-state assertion was collected as a soft failure for the same missing cooldown/form removal.
