# Phase 7-C4 — Special material-owner normalization RED

## Provenance

- Initial failing source: committed source `9b13e7b9f45a60e175d8a278a822e951b1f46f9d`, with only the two new tests in `src/services/saveService.test.ts` added in the working tree.
- Changed-file base: `a1307d220a68213be6465bc40e0a85af8ec605a3`.
- Bug location: `src/engine/rewardState.ts:65-72`, where ordinary-object assignment to the special key `__proto__` did not create an enumerable own owner entry.
- Public seam: `deserialize`, including Reward3 validation/normalization and save/reload round-trip.
- The initial independent reviewer separately compared the pre-C and post-fix committed loaders in memory: an accepted Save7 owner named `__proto__` survived the first migration but was omitted after a subsequent V8 load/serialize; unknown same-named owners were accepted. No files were written by that harness.

## RED command and result

```text
npm run test -- src/services/saveService.test.ts -t special
```

Exit code: `1`.

```text
❯ src/services/saveService.test.ts (107 tests | 2 failed | 105 skipped) 27ms
  × preserves special known material owners during Reward3 normalization and reload
  × rejects special unknown material owners during Reward3 normalization

FAIL ... preserves special known material owners ...
AssertionError: expected false to be true
src/services/saveService.test.ts:133:68
expect(Object.hasOwn(loaded.reward.materials, specialOwnerId)).toBe(true)

FAIL ... rejects special unknown material owners ...
AssertionError: expected [Function] to throw an error
src/services/saveService.test.ts:144:65
expect(() => deserialize(JSON.stringify(unknownOwnerSave))).toThrow('原始存檔已保留')

Test Files  1 failed (1)
Tests 2 failed | 105 skipped (107)
```

Both failures match the reviewed behavior, not a fixture/setup failure. The test source is now present, and the production fix has not yet been applied in this evidence snapshot.
