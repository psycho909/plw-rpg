# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/packs/frontier-goblins.json
- Captured pack SHA-256: 818ffce336847bdc2beaa1f1f4bed496a38b67738ce62995a38a44ab8fa25c8c
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/cases/frontier-goblins/.qa-runs/2026-10-13T07-27-11.108Z-acb13f3d-75bb-4470-bbab-411d1dd0b106
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

- frontier_goblins: controlled-witness (forest, level 3, threat 2, hamlet, 春, hour 0, safety 0; already-accessible)
- frontier_goblin_scout: controlled-witness (forest, level 3, threat 2, hamlet, 春, hour 0, safety 0; already-accessible)
- frontier_goblin_slinger: controlled-witness (forest, level 4, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- frontier_goblin_tinker: controlled-witness (mine, level 4, threat 2, hamlet, 春, hour 0, safety 0; already-accessible)
- frontier_goblin_lookout: controlled-witness (forest, level 4, threat 2, hamlet, 春, hour 15, safety 0; already-accessible)
- frontier_goblin_hauler: controlled-witness (mine, level 5, threat 2, hamlet, 春, hour 0, safety 0; already-accessible)
- frontier_goblin_trapper: controlled-witness (forest, level 5, threat 2, hamlet, 春, hour 17, safety 0; already-accessible)
- frontier_goblin_breaker: controlled-witness (mine, level 6, threat 3, hamlet, 春, hour 0, safety 0; already-accessible)
- frontier_goblin_duelist: controlled-witness (forest, level 6, threat 3, hamlet, 春, hour 0, safety 0; already-accessible)
- frontier_goblin_standardbearer: controlled-witness (forest, level 7, threat 3, hamlet, 春, hour 0, safety 0; already-accessible)
- frontier_goblin_saboteur: controlled-witness (mine, level 7, threat 3, hamlet, 春, hour 0, safety 0; already-accessible)
- frontier_goblin_warlord: controlled-witness (forest, level 8, threat 3, hamlet, 春, hour 0, safety 0; already-accessible)

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
   Start at  07:27:11
   Duration  274ms (transform 99ms, setup 0ms, import 116ms, tests 40ms, environment 1ms)
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
