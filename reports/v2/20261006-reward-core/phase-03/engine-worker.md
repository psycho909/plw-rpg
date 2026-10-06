# Phase 3 Wolf Family Engine Worker

Producer: `[GPT6Luna][max][Wolf Engine]` (requested profile from the task; actual runtime model telemetry is unavailable).
Status: implementation complete and `src/` source-frozen at 2026-10-06 06:21 UTC. Root integration gates remain pending; this report does not claim Phase 3 acceptance.

## Delivered

- Added the five-definition forest track with pure eligibility projection, collection progression, stamina/threat/location guards, deterministic normal and elite traits, fixed mini-boss howl plus both traits, and a context-weighted persisted wolf-king form with a seven-game-day defeat cooldown.
- Added snapshot-only canonical combat stats and effective combat phases. Fast wolves rush on their role cadence; swift trait rushes are canceled by defending; armored turns add armor that penetration can reduce while bleed remains direct damage; bruisers use periodic heavy strikes; pack leaders howl; wolf-king variants alter charge timing, charge strength, or recovery. Player and companion attacks use the same effective armor. Presentation cues are projections of those combat phases.
- Tagged outdoor family fights while preserving untagged wolf and dungeon paths. Tagged victories award against the actual family definition. Wolf-king victory clears the saved form and records the defeat time without clearing the goblin boss or creating goblin-chief memories.
- Tightened R1 save guards for exact derived combat stats, `hp <= maxHp`, safe fractional HP, legal howl phase and turn age, and boss active-form identity/traits/variant/formation-time/context matching against the canonical root form. Rendering and save loading consume no RNG or world time.
- Added focused tests for no-mutation blocked actions, deterministic formation, rank trait bounds, progression and cooldown, combat outcomes/cues, boss loot and goblin-crisis isolation, flee/death/successor form reuse, fractional companion damage reload, and malformed saves.

## Verification

- RED: the first test run found the expected missing `wolfFamily` module and collected zero tests; output is archived at [engine-worker-red.raw.txt](engine-worker-red.raw.txt), with the recorded summary at [engine-worker-red.txt](engine-worker-red.txt). A later focused run exposed a fractional-HP fixture that did not overcome the minimum-damage floor; that fixture was corrected to use odd companion strength. The original command output remains at [engine-worker-focused-first.txt](engine-worker-focused-first.txt). This was a test setup issue, not an application defect.
- GREEN: `npm test -- --maxWorkers=1 src/engine/wolfFamily.test.ts src/services/rewardSave.test.ts src/engine/actions.test.ts src/engine/combatStats.test.ts` — 4 files, 79 tests passed. Raw output is [engine-worker-focused-green.txt](engine-worker-focused-green.txt).
- Build: `npm run build` — passed `vue-tsc --noEmit` and Vite production build (78 modules). Raw output is [engine-worker-build-green.txt](engine-worker-build-green.txt).
- The test and build outputs were published through `scripts.recorded_reports.write_recorded` and are preserved in the Phase 3 `playlog.jsonl`.
- Full regression, runner simulations, production UI/browser stress and independent review are root-owned and were not run by this worker. Their results remain open until the root gates finish.

## Frozen source fingerprints

| File | SHA-256 |
| --- | --- |
| `src/data/rewards.ts` | `f98cd1bd30004deb13154fd5266274733f1e2c8a8a72d682d2cd8343ac3baf87` |
| `src/engine/actions.ts` | `9ded93363336f0d8cdeea1e475453740a3fab3aaf002277b4b8ea2c8f5ae488a` |
| `src/engine/wolfFamily.ts` | `1c1c18f12926a13f804ae215e60349e0c69e2dcb0e5c8d26518b11eeb7197ed7` |
| `src/engine/wolfFamily.test.ts` | `3683ff513d7ceaed4397279d9cd57fc4f48cca5eedfd0a0f4a692d3f5ab6194b` |
| `src/services/rewardValidation.ts` | `ee5a658aa6664baceb34cce9714d8d186e7201b6a2861766760bcadc5ee48f84` |
| `src/services/rewardSave.test.ts` | `06574352794efdb1cb37a17b20607c4146aabe84190d355ce9f2459015eb7a92` |
