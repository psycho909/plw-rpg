# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/e-content-validation-run/runs/2026-10-13T05-26-50.396Z-1a3aff87-cfb9-4da5-b251-9e943c61bc43/packs/cave-insects.json
- Captured pack SHA-256: 5512694273d4d66e2b3934ce106901e0eb85d340832b25bd6ab8470efa712192
- Run evidence: reports/v2/20261008-content-expansion/phase-07/e-content-validation-run/runs/2026-10-13T05-26-50.396Z-1a3aff87-cfb9-4da5-b251-9e943c61bc43/cases/cave-insects/.qa-runs/2026-10-13T05-26-58.597Z-d2f40375-57de-4616-b0e1-df7694bd94fe
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
- Authoring-qualified candidate new item IDs: 10
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
      Tests  18 passed (18)
   Start at  05:26:59
   Duration  234ms (transform 82ms, setup 0ms, import 98ms, tests 26ms, environment 0ms)
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
