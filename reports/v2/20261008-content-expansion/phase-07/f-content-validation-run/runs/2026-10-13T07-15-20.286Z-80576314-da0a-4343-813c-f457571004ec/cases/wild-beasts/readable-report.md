# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-15-20.286Z-80576314-da0a-4343-813c-f457571004ec/packs/wild-beasts.json
- Captured pack SHA-256: c3db36c659b713a63bfd0e7f6614ce88044c16293b2c5038b9e3836218555c64
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-15-20.286Z-80576314-da0a-4343-813c-f457571004ec/cases/wild-beasts/.qa-runs/2026-10-13T07-15-35.147Z-86ae94d5-8a25-401f-b93b-83a3fd308348
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

- wild_beasts: controlled-witness (farmland, level 1, threat 1, hamlet, 春, hour 0, safety 0; already-accessible)
- wild_beast_brush_hare: controlled-witness (farmland, level 1, threat 1, hamlet, 春, hour 5, safety 0; already-accessible)
- wild_beast_stonehorn: controlled-witness (forest, level 2, threat 1, hamlet, 春, hour 0, safety 0; already-accessible)
- wild_beast_redtail: controlled-witness (forest, level 3, threat 1, hamlet, 春, hour 0, safety 0; already-accessible)
- wild_beast_fernback: controlled-witness (forest, level 3, threat 1, hamlet, 春, hour 15, safety 0; already-accessible)
- wild_beast_marshstag: controlled-witness (forest, level 3, threat 1, hamlet, 春, hour 0, safety 0; already-accessible)
- wild_beast_amberfox: controlled-witness (farmland, level 4, threat 1, hamlet, 春, hour 12, safety 0; already-accessible)
- wild_beast_bristleback: controlled-witness (forest, level 5, threat 2, hamlet, 春, hour 0, safety 0; already-accessible)
- wild_beast_galehorn: controlled-witness (forest, level 6, threat 2, hamlet, 春, hour 0, safety 0; already-accessible)
- wild_beast_old_matriarch: controlled-witness (forest, level 6, threat 2, hamlet, 春, hour 0, safety 0; already-accessible)
- wild_beast_ironhide: controlled-witness (farmland, level 7, threat 2, hamlet, 春, hour 0, safety 0; already-accessible)
- wild_beast_apex: controlled-witness (forest, level 8, threat 3, hamlet, 秋, hour 16, safety 0; already-accessible)

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
   Start at  07:15:35
   Duration  240ms (transform 93ms, setup 0ms, import 109ms, tests 29ms, environment 0ms)
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
