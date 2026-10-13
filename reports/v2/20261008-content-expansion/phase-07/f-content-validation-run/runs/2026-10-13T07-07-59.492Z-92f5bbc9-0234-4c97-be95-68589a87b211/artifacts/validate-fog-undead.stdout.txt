# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-07-59.492Z-92f5bbc9-0234-4c97-be95-68589a87b211/packs/fog-undead.json
- Captured pack SHA-256: 670c48ef4937a950ef6bf0ca537414e3cabee70f9081ef7f9c2b0873e781c03f
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-07-59.492Z-92f5bbc9-0234-4c97-be95-68589a87b211/cases/fog-undead/.qa-runs/2026-10-13T07-08-27.311Z-ddb46e4b-1733-48b1-8314-b67036f80155
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

- fog_undead: controlled-witness (forest, level 4, threat 2, hamlet, 春, hour 18, safety 0; already-accessible)
- fog_undead_bonewalker: controlled-witness (forest, level 4, threat 2, hamlet, 春, hour 20, safety 0; already-accessible)
- fog_undead_lantern_wisp: controlled-witness (unknown, level 5, threat 2, hamlet, 春, hour 20, safety 0; explore-to-unlock)
- fog_undead_gravehound: controlled-witness (forest, level 5, threat 2, hamlet, 秋, hour 20, safety 0; already-accessible)
- fog_undead_crypt_guard: controlled-witness (unknown, level 6, threat 2, hamlet, 春, hour 20, safety 0; explore-to-unlock)
- fog_undead_mourner: controlled-witness (forest, level 5, threat 2, hamlet, 冬, hour 20, safety 0; already-accessible)
- fog_undead_bellkeeper: controlled-witness (unknown, level 6, threat 2, town, 春, hour 20, safety 0; explore-to-unlock)
- fog_undead_wight: controlled-witness (forest, level 7, threat 3, hamlet, 春, hour 20, safety 0; already-accessible)
- fog_undead_blackguard: controlled-witness (unknown, level 7, threat 3, hamlet, 春, hour 20, safety 0; explore-to-unlock)
- fog_undead_crypt_knight: controlled-witness (unknown, level 8, threat 3, hamlet, 春, hour 21, safety 0; explore-to-unlock)
- fog_undead_hollow_bell: controlled-witness (forest, level 8, threat 3, hamlet, 春, hour 20, safety 0; already-accessible)
- fog_undead_cryptlord: controlled-witness (unknown, level 9, threat 3, hamlet, 春, hour 20, safety 0; explore-to-unlock)

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
   Start at  07:08:28
   Duration  295ms (transform 115ms, setup 0ms, import 133ms, tests 42ms, environment 0ms)
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
