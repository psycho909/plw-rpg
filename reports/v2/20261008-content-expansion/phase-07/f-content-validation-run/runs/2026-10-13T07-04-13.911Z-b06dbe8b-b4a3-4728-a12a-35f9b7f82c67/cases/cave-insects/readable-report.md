# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67/packs/cave-insects.json
- Captured pack SHA-256: 47ba20f7e55a031a4a9634bd33e60bac70f16a95a4cea10e9e5c8a89a48851fc
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67/cases/cave-insects/.qa-runs/2026-10-13T07-04-22.293Z-a8c38ffa-589c-4e42-b561-98f75c83fc11
- Current run HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3
- Current run branch: v2x/reward-core
- Current captured-source fingerprint: aefd51af8739823acd672162810574fc0edeae10513aaf28a1bf4342b77b3345
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

- cave_insects: controlled-witness (mine, level 3, threat 1, village, 春, hour 0, safety 0; already-accessible)
- cave_insect_digger: controlled-witness (mine, level 3, threat 1, village, 春, hour 0, safety 0; already-accessible)
- cave_insect_skitter: controlled-witness (mine, level 3, threat 1, village, 春, hour 6, safety 0; already-accessible)
- cave_insect_spitter: controlled-witness (mine, level 4, threat 1, village, 春, hour 0, safety 0; already-accessible)
- cave_insect_carrier: controlled-witness (mine, level 4, threat 1, village, 春, hour 5, safety 0; already-accessible)
- cave_insect_shellback: controlled-witness (mine, level 4, threat 1, village, 春, hour 0, safety 0; already-accessible)
- cave_insect_lurker: controlled-witness (mine, level 5, threat 2, village, 春, hour 18, safety 0; already-accessible)
- cave_insect_razor: controlled-witness (mine, level 5, threat 2, village, 春, hour 0, safety 0; already-accessible)
- cave_insect_warden: controlled-witness (mine, level 6, threat 2, village, 春, hour 7, safety 0; already-accessible)
- cave_insect_broodguard: controlled-witness (mine, level 7, threat 2, village, 春, hour 0, safety 0; already-accessible)
- cave_insect_tunnelstalker: controlled-witness (mine, level 7, threat 2, village, 春, hour 18, safety 0; already-accessible)
- cave_insect_queen: controlled-witness (mine, level 8, threat 3, village, 春, hour 0, safety 0; already-accessible)

## Diagnostics

- No validation errors.

## Child checks

### targetedTests

Exit: 0

stdout:
```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  07:04:23
   Duration  271ms (transform 99ms, setup 0ms, import 119ms, tests 36ms, environment 0ms)
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
