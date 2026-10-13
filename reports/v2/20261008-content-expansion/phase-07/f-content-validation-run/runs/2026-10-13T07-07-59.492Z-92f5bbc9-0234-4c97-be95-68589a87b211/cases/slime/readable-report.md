# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-07-59.492Z-92f5bbc9-0234-4c97-be95-68589a87b211/packs/slime.json
- Captured pack SHA-256: d19dfd481895035bda12bbf4c0b59d5c83e04292156c9065d8b31aa0b1317b06
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-07-59.492Z-92f5bbc9-0234-4c97-be95-68589a87b211/cases/slime/.qa-runs/2026-10-13T07-08-01.481Z-ecad1867-4d35-4948-8195-96b29179f7a5
- Current run HEAD: e05cc78f1ef452e2672df223f2febf48444dcbd3
- Current run branch: v2x/reward-core
- Current captured-source fingerprint: ddcb9ae07f372c963535c306e9db5337f48d9e58302a7f8e8a936f1efd727ab2
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
   Start at  07:08:02
   Duration  267ms (transform 100ms, setup 0ms, import 117ms, tests 32ms, environment 0ms)
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
