# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67/packs/fog-undead.json
- Captured pack SHA-256: 05ed32cd5b22700a636989b8c92e0907d57c588cc9489808c3a929dff6512bd4
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67/cases/fog-undead/.qa-runs/2026-10-13T07-04-41.370Z-2c9222d7-ef1a-475e-86b2-341878c792f0
- Current run HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3
- Current run branch: v2x/reward-core
- Current captured-source fingerprint: aefd51af8739823acd672162810574fc0edeae10513aaf28a1bf4342b77b3345
- Historical Phase 7-B contract anchor: 11980b796f88173cf05ef83ac41510a0d44a53b1
- Content validation status: FAIL
- Overall validator + child-check outcome: FAIL
- targetedTests: PASS (exit 0)
- typecheck: PASS (exit 0)
- Natural spawn exposure: not-measured
- Crop goods evidence: declared-food-binding-only-runtime-integration-unverified
- Save compatibility evidence: stable-id-addition-only-runtime-migration-unverified
- Counts cover unique qualifying IDs in this supplied authoring batch only.

## Counts

- Qualifying new monsters: 11
- Authoring-qualified candidate new item IDs: 14
- Authoring-qualified usable new materials: 6
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

- ERROR affix-ineligible [fog_undead_cryptstone]: Material biases an affix with no compatible authored equipment.
- ERROR affix-ineligible [fog_undead_bellmetal]: Material biases an affix with no compatible authored equipment.

## Child checks

### targetedTests

Exit: 0

stdout:
```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  07:04:42
   Duration  256ms (transform 96ms, setup 0ms, import 112ms, tests 31ms, environment 0ms)
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
