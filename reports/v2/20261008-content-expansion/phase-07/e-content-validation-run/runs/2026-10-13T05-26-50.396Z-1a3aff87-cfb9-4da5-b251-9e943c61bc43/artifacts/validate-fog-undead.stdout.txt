# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/e-content-validation-run/runs/2026-10-13T05-26-50.396Z-1a3aff87-cfb9-4da5-b251-9e943c61bc43/packs/fog-undead.json
- Captured pack SHA-256: 8af5a81dbd588615611c7312aa627121f179326564a7dc6a4d7ad7d509b60dd5
- Run evidence: reports/v2/20261008-content-expansion/phase-07/e-content-validation-run/runs/2026-10-13T05-26-50.396Z-1a3aff87-cfb9-4da5-b251-9e943c61bc43/cases/fog-undead/.qa-runs/2026-10-13T05-27-16.459Z-b2276d51-45d3-4a37-97de-73fa067be451
- Current run HEAD: 3d15d2e479662cb74135bba8894290e054adaa6f
- Current run branch: v2x/reward-core
- Current captured-source fingerprint: 507afe24b6e6b492b127f0e1179d92bf9ebe1f43fa9c7b9c5ca5d14ed247f9d9
- Historical Phase 7-B contract anchor: 11980b796f88173cf05ef83ac41510a0d44a53b1
- Content validation status: PASS
- Overall validator + child-check outcome: PASS
- targetedTests: PASS (exit 0)
- typecheck: PASS (exit 0)
- Natural spawn exposure: not-measured
- Crop goods evidence: declared-food-binding-only-runtime-integration-unverified
- Save compatibility evidence: stable-id-addition-only-runtime-migration-unverified
- Counts cover unique qualifying IDs in this supplied authoring batch only.

## Counts

- Qualifying new monsters: 11
- Authoring-qualified candidate new item IDs: 11
- Authoring-qualified usable new materials: 8
- Exact baseline monster IDs: 5; excluded legacy monster IDs: 4
- Exact baseline boss variant IDs: 3
- Exact baseline item IDs: 9; excluded legacy item IDs: 8; excluded procedural IDs: 0

## Reachability

- fog_undead: controlled-witness (forest, level 4, threat 2, hamlet, 春, hour 18, safety 0; already-accessible)
- fog_undead_bonewalker: controlled-witness (forest, level 4, threat 2, hamlet, 春, hour 20, safety 0; already-accessible)
- fog_undead_lantern_wisp: controlled-witness (unknown, level 5, threat 2, hamlet, 春, hour 20, safety 0; explore-to-unlock)
- fog_undead_gravehound: controlled-witness (forest, level 5, threat 2, hamlet, 秋, hour 20, safety 0; already-accessible)
- fog_undead_crypt_guard: controlled-witness (unknown, level 6, threat 2, hamlet, 春, hour 20, safety 0; explore-to-unlock)
- fog_undead_mourner: controlled-witness (forest, level 5, threat 2, hamlet, 冬, hour 20, safety 0; already-accessible)
- fog_undead_bellkeeper: controlled-witness (unknown, level 6, threat 2, town, 春, hour 20, safety 0; explore-to-unlock)
- fog_undead_wight: controlled-witness (forest, level 7, threat 3, hamlet, 春, hour 20, safety 0; already-accessible)
- fog_undead_blackguard: controlled-witness (unknown, level 7, threat 3, hamlet, 春, hour 20, safety 0; explore-to-unlock)
- fog_undead_crypt_knight: controlled-witness (unknown, level 8, threat 3, hamlet, 春, hour 21, safety 0; explore-to-unlock)
- fog_undead_hollow_bell: controlled-witness (forest, level 8, threat 3, hamlet, 春, hour 20, safety 0; already-accessible)
- fog_undead_cryptlord: controlled-witness (unknown, level 9, threat 3, hamlet, 春, hour 20, safety 0; explore-to-unlock)

## Diagnostics

- No validation errors.

## Child checks

### targetedTests

Exit: 0

stdout:
```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  05:27:17
   Duration  254ms (transform 90ms, setup 0ms, import 105ms, tests 28ms, environment 1ms)
```

stderr:
```text

```

### typecheck

Exit: 0

stdout:
```text

```

stderr:
```text

```

Controlled witnesses prove bounded predicate satisfiability only. This report does not estimate natural encounter rates.
