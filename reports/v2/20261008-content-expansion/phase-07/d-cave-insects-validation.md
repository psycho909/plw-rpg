# Phase 7-D Cave Insects Content Batch Validation

- Source module: `src/data/content/caveInsects.ts` (`CAVE_INSECT_CONTENT` export)
- Source module SHA-256: `20d7d07e7780caf8c199a9c041eeae96a67e30da5bc1c0b34763d1ef9ce39468`
- Pack: `d-cave-insect-pack-gatefix.json` (retained beside this report)
- Pack SHA-256: 18751aff901ae9a6512260ad18accce36c33b7e4971838aec82d2d54a45879fd
- Pack generation: Vite SSR imported the source module export and `JSON.stringify` serialized it:

  ```sh
  node --input-type=module -e 'import { createServer } from "vite"; import { writeFile } from "node:fs/promises"; const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [], entries: [] }, server: { middlewareMode: true }, appType: "custom" }); try { const { CAVE_INSECT_CONTENT } = await server.ssrLoadModule("/src/data/content/caveInsects.ts"); await writeFile("/tmp/cave-insect-pack-gatefix.json", JSON.stringify(CAVE_INSECT_CONTENT)); } finally { await server.close(); }'
  ```
- Validator contract source revision anchor (Phase 7-B): 11980b796f88173cf05ef83ac41510a0d44a53b1
- Validator contract fingerprint (domain + validator + tests + runner): 59d1d8b358e2d25e15bb0fec52cb82f1775fa8ffeeff24fc416f20610e6b32de
- SHA-256 src/domain/content.ts: dd9d3eedac08df9b47af1e16d6f0610190378450e90a768079b574e0aa2408ba
- SHA-256 src/engine/contentValidation.ts: 1c44bfa79e0e37f3fa601a5e3832925a8c0b63e2cd2c6dec30176586aab7565e
- SHA-256 src/engine/contentValidation.test.ts: 484c9e8e528311574ba21139bc9c68b7ab74377da3cbc1893ecac71c65a08226
- SHA-256 scripts/validate_content_batch.mjs: c40e157d2c3395cf2b7179c99aa26aa4fb5364a026e4575358626ef23cf06164
- Baseline source fingerprint: c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb
- Validation: PASS
- Targeted tests: PASS
- Typecheck: PASS
- Natural spawn exposure: not-measured
- Crop goods evidence: declared-food-binding-only-runtime-integration-unverified
- Save compatibility evidence: stable-id-addition-only-runtime-migration-unverified

## Counts

- Qualifying new monsters: 8
- Authoring-qualified candidate new item IDs: 8 (equipment + usable materials + crop goods; unique IDs)
- Authoring-qualified usable new materials subset: 7
- Existing exact monster IDs: 5; excluded legacy monster IDs: 4
- Existing exact boss variant IDs: 3
- Existing exact item IDs: 9; excluded legacy item IDs: 8; excluded procedural IDs: 0
- Counts cover only unique qualifying IDs in this supplied authoring batch; existing, legacy, and procedural IDs are excluded.

## Reachability

- cave_insects: controlled-witness (mine, level 3, threat 1, 春, hour 0, safety 0; already-accessible)
- cave_insect_digger: controlled-witness (mine, level 3, threat 1, 春, hour 0, safety 0; already-accessible)
- cave_insect_skitter: controlled-witness (mine, level 3, threat 1, 春, hour 6, safety 0; already-accessible)
- cave_insect_spitter: controlled-witness (mine, level 4, threat 1, 春, hour 0, safety 0; already-accessible)
- cave_insect_carrier: controlled-witness (mine, level 4, threat 1, 春, hour 5, safety 0; already-accessible)
- cave_insect_shellback: controlled-witness (mine, level 4, threat 1, 春, hour 0, safety 0; already-accessible)
- cave_insect_lurker: controlled-witness (mine, level 5, threat 2, 春, hour 18, safety 0; already-accessible)
- cave_insect_razor: controlled-witness (mine, level 5, threat 2, 春, hour 0, safety 0; already-accessible)
- cave_insect_warden: controlled-witness (mine, level 6, threat 2, 春, hour 7, safety 0; already-accessible)

## Diagnostics

- No validation errors.
- No warnings.

## Authoring bounds and qualification

- Phase 7 validator guardrails: ecosystem material and crop-good sell are integers 1..50; each material bias is 0..4; crop-good foodValue is an integer 1..4; recipe input amounts are positive safe integers up to 1000; crop growth is 1..43200 whole minutes and yield is 1..100; recipe gold is 0..1000, stamina 0..100, duration 1..43200 minutes, and output/skill levels 0..100.
- These are conservative Phase 7 authoring and balance bounds informed by current Reward values; they are not runtime formula limits. Raising them requires an explicit balance review.
- Required contract fields and finite enums are checked before reference graphs grant consumer evidence, including recipe station/category/affix rules and inputs, monster loot profiles/mechanics, and boss variant structure.
- Family lootTableId supplies the family default; the monster’s selected lootTableId supplies actual reachable drop/source evidence. A table shared across families does not establish family-specific loot identity.
- Crop-good qualification records an authored food binding only. Final item qualification still requires C/G verification of runtime food/supply/source consumers.

## Targeted test output

```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  06:59:19
   Duration  260ms (transform 105ms, setup 0ms, import 124ms, tests 24ms, environment 0ms)
```

## Typecheck output

```text
vue-tsc --noEmit completed with no diagnostics.
```

Controlled witnesses prove bounded predicate satisfiability only (player level 1..100, threat 1..3, supported stages/seasons, hours 0..23, safety 0..100). This report does not estimate natural encounter rates or assert that all content appears in a long simulation.

## Review and authoring history

- The first module revision (`f908c3b386ae3d4ff9ffa72976c466adb55beebc2d2b139d351b3753dd46ec4d`) and pack (`382665d4cc23d5e87c0848faff6a8a291ead28ad5de9d2a87847e5d472496a7e`) remain preserved as superseded evidence in `d-cave-insect-pack.json` and earlier `playlog.jsonl` report versions.
- Independent review by requested `g6-luna-med-content-reviewer` (GPT-6 Luna, medium; runtime telemetry unavailable) first found a P2 traceability issue in the B-labelled report; Root retained the exact pack, added the D module SHA, and the reviewer confirmed that P2 resolved. A later Spec recheck then found a P1 progression-gate mismatch: Hamlet + threat 1 could reach some insects despite the approved level 3+ and (village stage OR threat 2+) rule. Low corrected the module using existing spawn predicates and regenerated the retained gate-fix pack above. Independent review of this changed module is pending; do not treat the prior review as covering this newer hash.
- The current validator report's compact witness text omits `settlementStage`. The source profile includes the village-stage OR branch; a displayed threat-1 witness must not be interpreted as Hamlet + threat 1. Root's runtime integration test now asserts both branches and the early-route exclusion; integration evidence is summarized in `d-root-closeout.md`.
- The first authoring attempt used `cave_insect_resin` bias `keen` and was rejected by the validator with `orphan-material [cave_insect_resin]` and `affix-ineligible [cave_insect_resin]`. Its initial D validation report remains archived in `playlog.jsonl` (record SHA-256 `5b0062a838404bd4bd59229f795f1fbd60474ac5730345f34ff7d2588dd47d62`); that report preserves the diagnostics and failing pack SHA-256 `5a03ea1f19fe78b1b7bd7cc8b96d189f95d36698bc407f9c929d2f7ca84a663d`. The failed pack bytes and failed source-module SHA/fingerprint were not retained, so they cannot be independently reconstructed. The later accepted pre-gate-fix module/pack (`f908c3b...` / `382665d...`) are different artifacts and are not claimed as the failed input. The accepted source uses compatible `piercing` bias.
