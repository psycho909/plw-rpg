# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/packs/wild-beasts.json
- Captured pack SHA-256: c3db36c659b713a63bfd0e7f6614ce88044c16293b2c5038b9e3836218555c64
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/cases/wild-beasts/.qa-runs/2026-10-13T07-27-04.444Z-141727b6-2246-4270-8231-05a06c5fd9e5
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
   Start at  07:27:05
   Duration  289ms (transform 97ms, setup 0ms, import 117ms, tests 35ms, environment 0ms)
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
