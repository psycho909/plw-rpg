# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/d-evidence-retention-run/work/minimal-valid-pack.json
- Captured pack SHA-256: 4e4f8984f46b93137c66d820a01f238363e8ee645368211e48df0f0d2ae0b5e3
- Run evidence: reports/v2/20261008-content-expansion/phase-07/d-evidence-retention-run/work/.qa-runs/2026-10-13T01-42-20.397Z-dbcd0565-95b8-43cd-b78a-dc7e69dfbd01
- Current run HEAD: f026b6b4947d18aadc0f551c642c31750db5768c
- Current run branch: v2x/reward-core
- Current captured-source fingerprint: 6591df2cb3488e3423e692c2eb5c2adccf16950e1b747e20e81553fa1b0911eb
- Historical Phase 7-B contract anchor: 11980b796f88173cf05ef83ac41510a0d44a53b1
- Content validation status: FAIL
- Overall validator + child-check outcome: FAIL
- targetedTests: PASS (exit 0)
- typecheck: PASS (exit 0)
- Natural spawn exposure: not-measured
- Crop goods evidence: declared-food-binding-only-runtime-integration-unverified
- Save compatibility evidence: stable-id-addition-only-runtime-migration-unverified
- Tiny validation fixture: fixture IDs do not count toward approved targets.

## Counts

- Qualifying new monsters: 0
- Authoring-qualified candidate new item IDs: 1
- Authoring-qualified usable new materials: 0
- Exact baseline monster IDs: 5; excluded legacy monster IDs: 4
- Exact baseline boss variant IDs: 3
- Exact baseline item IDs: 9; excluded legacy item IDs: 8; excluded procedural IDs: 0

## Reachability

- bog-beasts: controlled-witness (forest, level 2, threat 1, hamlet, 夏, hour 0, safety 0; already-accessible)
- mire-hunter: controlled-witness (forest, level 2, threat 1, hamlet, 夏, hour 0, safety 0; already-accessible)

## Diagnostics

- ERROR invalid-range [mire-hunter]: hp is outside its legal range.
- ERROR unreachable-material [mire-claw]: Material has no reachable loot or crop source.
- ERROR insufficient-identity-axes [mire-hunter]: Monster has 2 effective identity axes (combat, world) or an invalid source graph; at least two effective axes are required.

## Child checks

### targetedTests

Exit: 0

stdout:
```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  01:42:21
   Duration  244ms (transform 94ms, setup 0ms, import 110ms, tests 25ms, environment 0ms)
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
