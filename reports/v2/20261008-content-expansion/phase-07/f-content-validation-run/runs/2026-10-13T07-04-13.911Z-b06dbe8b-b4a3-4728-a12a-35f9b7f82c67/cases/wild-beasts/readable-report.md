# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67/packs/wild-beasts.json
- Captured pack SHA-256: f9bd5cde17ab43eafed0583bce533ffe907dd8860c4f7b48f97276f4810b248a
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-04-13.911Z-b06dbe8b-b4a3-4728-a12a-35f9b7f82c67/cases/wild-beasts/.qa-runs/2026-10-13T07-04-28.677Z-fe385d30-1275-4f76-bd57-41107e1ab48c
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
- Authoring-qualified candidate new item IDs: 14
- Authoring-qualified usable new materials: 6
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

- ERROR affix-ineligible [wild_beast_hide]: Material biases an affix with no compatible authored equipment.
- ERROR affix-ineligible [wild_beast_fur]: Material biases an affix with no compatible authored equipment.

## Child checks

### targetedTests

Exit: 0

stdout:
```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  07:04:29
   Duration  270ms (transform 105ms, setup 0ms, import 125ms, tests 31ms, environment 0ms)
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
