# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T06-57-07.657Z-30ab2581-db8e-426b-b6a8-1e4834246e70/packs/mine-constructs.json
- Captured pack SHA-256: 992bd86d7b181141ad189327873c5c4bff3fb640adf284bc2572e81982d8afad
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T06-57-07.657Z-30ab2581-db8e-426b-b6a8-1e4834246e70/cases/mine-constructs/.qa-runs/2026-10-13T06-57-41.457Z-690c96b5-8e4f-461e-b1c2-5cd02326b792
- Current run HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3
- Current run branch: v2x/reward-core
- Current captured-source fingerprint: 150396e746c4824c9ebf7119eb490dc0e637db321867e43af5028b93848ed328
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
- Authoring-qualified candidate new item IDs: 16
- Authoring-qualified usable new materials: 8
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

- No validation errors.

## Child checks

### targetedTests

Exit: 0

stdout:
```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  21 passed (21)
   Start at  06:57:42
   Duration  243ms (transform 91ms, setup 0ms, import 107ms, tests 29ms, environment 0ms)
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
