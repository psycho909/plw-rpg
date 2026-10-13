# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/d-remediation-run/work/derived-negative-resin-keen.json
- Captured pack SHA-256: 581f68018aaa0a8a358d7bc2935015aa6b3e66ea8488adddb7961ceb4ebd8a75
- Run evidence: reports/v2/20261008-content-expansion/phase-07/d-remediation-run/work/.qa-runs/2026-10-13T01-49-32.580Z-519a3c38-a9a0-434c-8a4b-4d95bd33849a
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
- Counts cover unique qualifying IDs in this supplied authoring batch only.

## Counts

- Qualifying new monsters: 8
- Authoring-qualified candidate new item IDs: 7
- Authoring-qualified usable new materials: 6
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

## Diagnostics

- ERROR orphan-material [cave_insect_resin]: Material has no recipe input or legal generator bias consumer.
- ERROR affix-ineligible [cave_insect_resin]: Material biases an affix with no compatible authored equipment.

## Child checks

### targetedTests

Exit: 0

stdout:
```text

 RUN  v4.1.11 /workspace/plw-rpg


 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  01:49:33
   Duration  232ms (transform 81ms, setup 0ms, import 96ms, tests 25ms, environment 0ms)
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
