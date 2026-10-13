# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/e-content-validation-run/runs/2026-10-13T05-26-50.396Z-1a3aff87-cfb9-4da5-b251-9e943c61bc43/packs/slime.json
- Captured pack SHA-256: 007be15bf032cc266c36d4ee628b94a87a28840e3cb34a41c9c3e16f4bbc7f38
- Run evidence: reports/v2/20261008-content-expansion/phase-07/e-content-validation-run/runs/2026-10-13T05-26-50.396Z-1a3aff87-cfb9-4da5-b251-9e943c61bc43/cases/slime/.qa-runs/2026-10-13T05-26-52.308Z-dfa3a91b-8c19-4cff-b2b1-43437aac847a
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
- Authoring-qualified candidate new item IDs: 16
- Authoring-qualified usable new materials: 8
- Exact baseline monster IDs: 5; excluded legacy monster IDs: 4
- Exact baseline boss variant IDs: 3
- Exact baseline item IDs: 9; excluded legacy item IDs: 8; excluded procedural IDs: 0

## Reachability

- slime: controlled-witness (farmland, level 1, threat 1, hamlet, 春, hour 0, safety 0; already-accessible)
- slime_slick: controlled-witness (farmland, level 1, threat 1, hamlet, 春, hour 6, safety 0; already-accessible)
- slime_amber: controlled-witness (farmland, level 2, threat 1, hamlet, 夏, hour 8, safety 0; already-accessible)
- slime_bog: controlled-witness (forest, level 2, threat 1, hamlet, 春, hour 7, safety 0; already-accessible)
- slime_moss: controlled-witness (forest, level 3, threat 1, village, 春, hour 17, safety 0; already-accessible)
- slime_glass: controlled-witness (farmland, level 4, threat 2, hamlet, 秋, hour 10, safety 0; already-accessible)
- slime_spring: controlled-witness (forest, level 3, threat 1, hamlet, 春, hour 5, safety 0; already-accessible)
- slime_bulwark: controlled-witness (farmland, level 4, threat 2, village, 春, hour 7, safety 0; already-accessible)
- slime_cinder: controlled-witness (forest, level 5, threat 2, hamlet, 夏, hour 11, safety 0; already-accessible)
- slime_matriarch: controlled-witness (forest, level 5, threat 2, village, 春, hour 6, safety 0; already-accessible)
- slime_tidecaller: controlled-witness (forest, level 6, threat 2, hamlet, 春, hour 17, safety 0; already-accessible)
- slime_heart: controlled-witness (forest, level 7, threat 3, hamlet, 夏, hour 18, safety 0; already-accessible)

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
   Start at  05:26:53
   Duration  264ms (transform 100ms, setup 0ms, import 119ms, tests 30ms, environment 0ms)
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
