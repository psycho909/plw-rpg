# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/packs/mine-constructs.json
- Captured pack SHA-256: 7979aaedc58d52adca41c83bda658a765c024ae93e0de3cf98a797094d58c842
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/cases/mine-constructs/.qa-runs/2026-10-13T07-27-24.780Z-3aacda00-e2f7-4811-8152-e2eb1db59b59
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

- mine_constructs: controlled-witness (mine, level 4, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_shardling: controlled-witness (mine, level 4, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_sentinel: controlled-witness (mine, level 4, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_pylon: controlled-witness (mine, level 5, threat 2, hamlet, 春, hour 10, safety 0; already-accessible)
- mine_construct_crawler: controlled-witness (mine, level 5, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_mason: controlled-witness (mine, level 5, threat 2, hamlet, 春, hour 13, safety 0; already-accessible)
- mine_construct_veinwatcher: controlled-witness (mine, level 6, threat 2, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_ram: controlled-witness (mine, level 7, threat 3, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_warder: controlled-witness (mine, level 7, threat 3, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_architect: controlled-witness (unknown, level 8, threat 3, hamlet, 春, hour 8, safety 0; explore-to-unlock)
- mine_construct_bastion: controlled-witness (mine, level 8, threat 3, hamlet, 春, hour 6, safety 0; already-accessible)
- mine_construct_heart: controlled-witness (unknown, level 9, threat 3, hamlet, 春, hour 8, safety 0; explore-to-unlock)

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
   Start at  07:27:25
   Duration  285ms (transform 101ms, setup 0ms, import 120ms, tests 36ms, environment 0ms)
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
