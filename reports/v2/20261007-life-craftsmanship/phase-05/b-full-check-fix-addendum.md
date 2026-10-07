# Phase5-B full-check repair and identity addendum

## Diagnosis and delta

The original full regression remains unchanged at reports/v2/20261007-life-craftsmanship/phase-05/b-full-check-20261007T022236Z. It recorded 335/340 passing and five failures; build/typecheck were short-circuited. The two alleged V1 test builders serialized the current createGame(88), then deleted only life/reward and changed saveVersion. They retained the new Smithing skill and event tier, so the strict V1 validator correctly rejected the malformed fixtures.

Test-only fixture corrections: src/services/playJournal.test.ts and src/stores/gameStore.test.ts now remove skills.smithing from all actors and event tier from events/history when constructing V1. The playJournal title now says valid rather than real because this builder is synthetic. Existing V1 migration/reset expectations were updated from saveVersion 2 to 3. No save validator was relaxed.

Root separately resolved the provenance identity contract: craftProvenance.createdBy is the original crafter, independent of the item's current ownerId. validCraftProvenance now requires createdBy to be a persisted character ID and validates the current owner independently through the existing instance owner check. A regression keeps a dead original crafter distinct from a valid current owner; nonexistent creators remain rejected. No transfer or succession behavior was added.

## Focused verification

- npm test -- src/services/playJournal.test.ts: 6/6 passed.
- npm test -- src/stores/gameStore.test.ts: 32/32 passed.
- npm test -- src/services/saveService.test.ts: 82/82 passed.
- npm test -- src/services/rewardSave.test.ts: 33/33 passed.
- npx vue-tsc --noEmit: exit 0.
- No full suite was rerun; Root has routed that runner after this targeted repair.
- Raw outputs: b-identity-playJournal.txt, b-identity-gameStore.txt, b-identity-save-service.txt, b-identity-reward-save.txt, b-identity-typecheck.txt. Earlier focused fixture-only runs are preserved as b-post-fullcheck-fix-playJournal.txt and b-post-fullcheck-fix-gameStore.txt.

## Current changed-file hashes

94a17d9de5df2bcdc87a4584e7fbb021a021b4aa0e61de97519288b70ba765b9  src/services/playJournal.test.ts
ac3414ec7018440f89d0e4a546c6f54d8509e9da7c462d5d400b48e693201370  src/stores/gameStore.test.ts
9133f7da96b47feec99efaf73e69b2ecaa835abf48aaa4655d02f15b4e0e1875  src/services/rewardValidation.ts
9e884e47d17cceb712a5a5351b7d62455ec73a437a308a66518de1900e2ae87c  src/services/saveService.test.ts
