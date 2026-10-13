# Phase 7 Content Batch Validation

- Supplied pack: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/packs/fog-undead.json
- Captured pack SHA-256: 1a3be290d71d022af688236498f10a367b34fcee5439517b49a406a7765927f3
- Run evidence: reports/v2/20261008-content-expansion/phase-07/f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854/cases/fog-undead/.qa-runs/2026-10-13T07-27-17.793Z-bf1db11f-29c6-4135-ac09-b31672404c7b
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
   Start at  07:27:18
   Duration  292ms (transform 119ms, setup 0ms, import 139ms, tests 32ms, environment 0ms)
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
