# G core transaction-capacity fix — complete source freeze

Frozen: 2026-10-07 05:34 UTC. This addendum supersedes the earlier J6/J7-only core freeze for the current source map. Earlier freeze and RED reports remain archived.

Workflow: read `cloud-environment-onboarding:setup` (existing checkout/dependencies required no setup changes); applied `matt-skills-curated:tdd` through the project adapter, preserving focused RED and GREEN evidence.

## Changes

- `src/engine/crafting.ts`: one preflight budget now covers all craft-induced safe-ID counters before RNG/resource/time mutation. Event IDs include all current crops, 2 active XP events, every potentially formed life identity, masterpiece identity, reputation-tier event, craft completion, and a conservative per-crossed-day bound: character deaths + 5 per NPC (visitor departure, death, career milestone, general XP and job-skill XP) + 12 fixed simulation events + boss-warning count + party count. It allows up to 3 new NPCs per crossed day for later-day event estimates. The same day count reserves 3 `nextNpcId` allocations per day (settlement immigration, birth, traveler) and 4 `life.director.sequence` allocations per day (medicine request/news or arc request/news). Existing reward instance capacity checks continue to reserve one item ID. XP checks use the canonical ranges already required by save validation.
- `src/engine/crafting.test.ts`: preserve event overflow and year-boundary/max-population tests; add round-tripped atomic-rejection cases for `nextNpcId = MAX_SAFE_INTEGER - 1` on an immigration day and for `life.director.sequence = MAX_SAFE_INTEGER - 1` when the daily medicine request/news path would allocate two IDs. Both tests assert planner and execution rejection, reload validity, and byte-equivalent state.
- `src/services/saveService.ts` and `src/services/saveService.test.ts`: retain the version-specific V2 identity allowlist fix and its migration regression.

All capacity failures use the existing `event_capacity` reason and generic safe-world-record message; this avoids UI/API changes. No allocator rewrite, event dropping, population-rule change, or UI/pricing/browser edit.

## Verification

- Focused `npm test -- src/engine/crafting.test.ts src/services/saveService.test.ts` — PASS, 2 files, 145/145 tests, 2026-10-07 05:33 UTC.
- `npx vue-tsc --noEmit` — PASS, exit 0.
- Full suite and production build were not run by this scoped fix; Root owns the current full regression/build gate before H.

## Preserved RED evidence

- Crop + active XP event overflow: `g-core-eventreserve-red-exact.txt`, SHA256 `1d27d1befc1ec6e7dde98a8a4c02b28f5e5abb6474652aab6b9620345f893fa3`.
- V2 G-only identity accepted before migration: `g-core-v2identity-red.txt`, SHA256 `d76b8ab7152af360341216894018134c24cddca43fa3fe4136b3192353f21eaf`.
- Year boundary, 1,000 NPC, party, and crop day-reserve RED: `g-core-dayreserve-red.txt`, SHA256 `ded9f14acb890ba6b3f47e40ead14c8f2a38e799819cf465091f77a43d1f631d`.
- NPC allocator overflow: `g-core-npcidcapacity-red.txt`, SHA256 `d1b636a923eaa9aca522cd5f7a4980b3d10230b020a6b28efcf275eb806288fe`.
- Living-event ID overflow: `g-core-directoridcapacity-red.txt`, SHA256 `e478cbb835f2be45ef0cf2869b926995e79168be2e1c44518522e8eb40cc90f7`.

## Frozen source SHA256

- `src/engine/crafting.ts`: `d5abd71325252cfad846680cbdd3d844b78ab326bffea14e3314f618737a3491`
- `src/engine/crafting.test.ts`: `240458a3586c98449282e388709af4b230d1301330f31c76dd53289d1875126c`
- `src/services/saveService.ts`: `27af78b529a5f464d5ccafd13a0a187cacebfa3d962787a106c60821d10e068a`
- `src/services/saveService.test.ts`: `c0019a9e290787c10c31143d292a7ef78b1d460c6a22f5962dd0969782c71277`

Core source is frozen at these hashes pending Root's independent retarget/review and full build/regression gate.
