# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67/packs/mine-constructs.json
- Captured pack SHA-256: 673317e8c8c84804e8ac727e6d4537eebe28fee548229985eb3334613baad778
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67/cases/mine-constructs/.qa-runs/2026-10-13T07-04-47.800Z-9575adc2-8782-483a-b378-12da58349e61
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
- Authoring-qualified candidate new item IDs: 15
- Authoring-qualified usable new materials: 7
- Exact baseline monster IDs: 5; excluded legacy monster IDs: 4
- Exact baseline boss variant IDs: 3
- Exact baseline item IDs: 9; excluded legacy item IDs: 8; excluded procedural IDs: 0

## Reachability

- mine_constructs: controlled-witness (mine, level 4, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_shardling: controlled-witness (mine, level 4, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_sentinel: controlled-witness (mine, level 4, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_pylon: controlled-witness (mine, level 5, threat 2, hamlet, 春, hour 10, safety 0; already-accessible)
- mine_construct_crawler: controlled-witness (mine, level 5, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_mason: controlled-witness (mine, level 5, threat 2, hamlet, 春, hour 13, safety 0; already-accessible)
- mine_construct_veinwatcher: controlled-witness (mine, level 6, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_ram: controlled-witness (mine, level 7, threat 3, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_warder: controlled-witness (mine, level 7, threat 3, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_architect: controlled-witness (unknown, level 8, threat 3, hamlet, 春, hour 8, safety 0; explore-to-unlock)
- mine_construct_bastion: controlled-witness (mine, level 8, threat 3, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_heart: controlled-witness (unknown, level 9, threat 3, hamlet, 春, hour 8, safety 0; explore-to-unlock)

## Diagnostics

- ERROR affix-ineligible [mine_construct_binding]: Material biases an affix with no compatible authored equipment.

## Child checks

### targetedTests

Exit: 0

stdout:
```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  07:04:48
   Duration  255ms (transform 93ms, setup 0ms, import 109ms, tests 31ms, environment 0ms)
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
