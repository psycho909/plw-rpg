# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/packs/slime.json
- Captured pack SHA-256: 007be15bf032cc266c36d4ee628b94a87a28840e3cb34a41c9c3e16f4bbc7f38
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/cases/slime/.qa-runs/2026-10-13T07-26-51.284Z-2b941daa-c717-4f14-b7b5-197abe651ffb
- Current run HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3
- Current run branch: v2x/reward-core
- Current captured-source fingerprint: 792f6c00733e2416d250b6fd2e15b3444d59165930d92410b229edb62b2eab6e
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
      Tests  23 passed (23)
   Start at  07:26:52
   Duration  253ms (transform 98ms, setup 0ms, import 114ms, tests 32ms, environment 0ms)
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
