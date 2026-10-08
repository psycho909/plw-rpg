# Phase 7-B Content Batch Validation

- Pack: reports/v2/20261008-content-expansion/phase-07/b-run/minimal-valid-pack.json
- Pack SHA-256: 2f67710c47cbd5a7a548ffc16d852b95005c5a1e4d5e7f6fa4c7adb9bac48161
- B source revision anchor: 11980b796f88173cf05ef83ac41510a0d44a53b1
- B source fingerprint (domain + validator + tests + runner): bc09c3d50f16aa9d7c5c9f56adf28f607f470cbd63735747be60fcd298a03480
- SHA-256 src/domain/content.ts: dd9d3eedac08df9b47af1e16d6f0610190378450e90a768079b574e0aa2408ba
- SHA-256 src/engine/contentValidation.ts: cf1f883c95fa337d09225335feddf869c7eae3cc5b7226c400f8b767062f5066
- SHA-256 src/engine/contentValidation.test.ts: 34912052b51ccbcf00e5db3a8f46f749647fc9abca8efc0b0ecbc62247e5aaa7
- SHA-256 scripts/validate_content_batch.mjs: a703128d5a670e3cf4b26544b60aaa417ef645855e9e8ff22af8ebbb8319ee16
- Baseline source fingerprint: c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb
- Validation: PASS
- Targeted tests: PASS
- Typecheck: PASS
- Natural spawn exposure: not-measured
- Crop goods evidence: declared-food-binding-only-runtime-integration-unverified
- Save compatibility evidence: stable-id-addition-only-runtime-migration-unverified

## Counts

- Qualifying new monsters: 1
- Authoring-qualified candidate new item IDs: 2 (equipment + usable materials + crop goods; unique IDs)
- Authoring-qualified usable new materials subset: 1
- Existing exact monster IDs: 5; excluded legacy monster IDs: 4
- Existing exact boss variant IDs: 3
- Existing exact item IDs: 9; excluded legacy item IDs: 8; excluded procedural IDs: 0
- This is a tiny validation fixture. Its IDs never count toward the approved 50-monster / 100-item targets.

## Reachability

- bog-beasts: controlled-witness (forest, level 2, threat 1, 夏, hour 0, safety 0; already-accessible)
- mire-hunter: controlled-witness (forest, level 2, threat 1, 夏, hour 0, safety 0; already-accessible)

## Diagnostics

- No validation errors.
- No warnings.

## Authoring bounds and qualification

- Phase 7 validator guardrails: ecosystem material and crop-good sell are integers 1..50; each material bias is 0..4; crop-good foodValue is an integer 1..4; recipe input amounts are positive safe integers up to 1000; crop growth is 1..43200 whole minutes and yield is 1..100; recipe gold is 0..1000, stamina 0..100, duration 1..43200 minutes, and output/skill levels 0..100.
- These are conservative Phase 7 authoring and balance bounds informed by current Reward values; they are not runtime formula limits. Raising them requires an explicit balance review.
- Required contract fields and finite enums are checked before reference graphs grant consumer evidence, including recipe station/category/affix rules and inputs, monster loot profiles/mechanics, and boss variant structure.
- Crop-good qualification records an authored food binding only. Final item qualification still requires C/G verification of runtime food/supply/source consumers.

## Targeted test output

```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  05:08:21
   Duration  239ms (transform 94ms, setup 0ms, import 109ms, tests 24ms, environment 0ms)
```

## Typecheck output

```text
vue-tsc --noEmit completed with no diagnostics.
```

Controlled witnesses prove bounded predicate satisfiability only (player level 1..100, threat 1..3, supported stages/seasons, hours 0..23, safety 0..100). This report does not estimate natural encounter rates or assert that all content appears in a long simulation.
