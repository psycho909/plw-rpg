# G core event-capacity and V2 identity fix — source freeze

Frozen: 2026-10-07 05:25 UTC. This is a narrow bugfix addendum to the prior G core freeze; earlier source freeze and RED artifacts remain unchanged.

Workflow: read `cloud-environment-onboarding:setup` (existing checkout and dependencies needed no setup changes); applied `matt-skills-curated:tdd` through the project adapter, preserving focused RED and GREEN evidence.

## Changes

- `src/engine/crafting.ts`: replace the fixed 4/256 event reserve with a conservative BigInt upper bound computed before RNG or state mutation. Same-day craft bound is all current crops + 2 XP level events + up to every `IDENTITY_RULES` identity from the life action + masterpiece identity + reputation tier + completion. For each crossed day, the bound adds one possible death per character, five per NPC (visitor departure, death, career milestone, general XP, job-skill XP), plus 12 fixed events (new year 1, settlement growth 2, immigration/birth 2, threat 1, boss spawn/injury/dungeon 3, living events 3), every configured boss warning, and each party contract. It adds at most three NPCs per prior crossing day to the later-day population bound for traveler, immigration, and birth. Cross-day XP ranges are checked against the same canonical invariant used by save validation before relying on the one-level-per-award bound. The resulting sequence must remain strictly below `Number.MAX_SAFE_INTEGER`.
- `src/services/saveService.ts`: V2 life records accept only the eight identity IDs present in that schema; V3 additionally accepts `smith` and `masterpieceCrafter`. No save version or shape change.
- `src/engine/crafting.test.ts`: preserve the crop + general/Smithing XP overflow regression and add a round-tripped year-boundary case with 1,000 NPCs, two party slots, and four due crops; update the ordinary first-masterpiece boundary test to the new conservative bound.
- `src/services/saveService.test.ts`: retain the V2 forged `masterpieceCrafter` rejection regression alongside ordinary V2 migration coverage.

## Verification

- `npm test -- src/engine/crafting.test.ts src/services/saveService.test.ts` — PASS, 2 files, 143/143 tests, 2026-10-07 05:25 UTC.
- `npx vue-tsc --noEmit` — PASS, exit 0.
- Full suite and production build were not run by this scoped fix; Root owns the full regression/build gate before H.

## Preserved RED evidence

- Original composed crop + XP overflow: `g-core-eventreserve-red-exact.txt`, SHA256 `1d27d1befc1ec6e7dde98a8a4c02b28f5e5abb6474652aab6b9620345f893fa3`.
- Original V2 identity migration bug: `g-core-v2identity-red.txt`, SHA256 `d76b8ab7152af360341216894018134c24cddca43fa3fe4136b3192353f21eaf`.
- Added day-boundary / max-population RED: `g-core-dayreserve-red.txt`, SHA256 `ded9f14acb890ba6b3f47e40ead14c8f2a38e799819cf465091f77a43d1f631d`.

## Frozen source SHA256

- `src/engine/crafting.ts`: `5e6030597252c6d4c10a56bc9b39c5e77f4df9d6445fe9d1b5dda39afdacdf23`
- `src/engine/crafting.test.ts`: `b82367a944b0fd04c16e6c9c79fc686c4074797d5dc66129e5b6dd48922782ab`
- `src/services/saveService.ts`: `27af78b529a5f464d5ccafd13a0a187cacebfa3d962787a106c60821d10e068a`
- `src/services/saveService.test.ts`: `c0019a9e290787c10c31143d292a7ef78b1d460c6a22f5962dd0969782c71277`

Core source is frozen at these hashes pending Root's independent retarget/review and full build/regression gate.
