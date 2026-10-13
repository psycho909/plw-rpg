# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-15-20.286Z-80576314-da0a-4343-813c-f457571004ec/packs/cave-insects.json
- Captured pack SHA-256: 4325ffed23b48adac6e08911f77a9ac52998ade0c269e1f063d16c4c9130b82f
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-15-20.286Z-80576314-da0a-4343-813c-f457571004ec/cases/cave-insects/.qa-runs/2026-10-13T07-15-29.000Z-1c27b063-9211-411e-a1af-fd8abbd67b38
- Current run HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3
- Current run branch: v2x/reward-core
- Current captured-source fingerprint: fc21925ce01db6ef4cf4c04d3bcf1f4f0620b101e0cb73a2226a9202b8e1dfb3
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
   Start at  07:15:29
   Duration  260ms (transform 87ms, setup 0ms, import 105ms, tests 32ms, environment 0ms)
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
