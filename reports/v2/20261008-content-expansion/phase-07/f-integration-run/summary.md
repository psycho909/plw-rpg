# Phase 7-F Content Item Integration Verification

## Result

The final targeted run passed all three integration checks (3 passed, 0 failed). The final `vue-tsc --noEmit` check exited 0. No broad test suite, content CLI, runtime simulation, build, or data-validator run was performed by this integration owner.

Final test source SHA-256: `0be844b6bb8f7dd6c1d762463d48982b0d4402d396dcf10b56ba5cc165f77f64`.

## Scope covered

- All 24 registered content recipes run through `planCraft` and `craft`; for each compatible optional bias, the test checks the exact preview inputs and resource consumption, the output against `generateItem` on a cloned state, provenance, equip, save/reload, unequip, and sale.
- The 48 content equipment bases are checked for a positive selected-monster loot entry with nonzero equipment chance, a recipe output, or an explicit Boss-exclusive source. Boss-exclusive equipment is checked for no non-Boss selected-table leak. The catalog split is 30 weapons / 18 armor.
- Every content material must have a mandatory recipe consumer or a compatible optional generation bias, with compatibility checked against runtime `AFFIXES` metadata.
- These are controlled witnesses for API preconditions; they do not model natural drop frequency. The test does not assert the final Phase 7 quantity gate.

## Captures

- Final targeted output, stderr, exit code, and test hash: `targeted-attempt-04/`.
- Earlier retry outputs: `targeted-attempt-02/` and `targeted-attempt-03/`.
- Typecheck output and exit code: `typecheck/`.
- Data source SHA maps before and after: `frozen-data-before.sha256` and `frozen-data-after.sha256`; `frozen-data-map-diff.exit-code.txt` is `0`, and the diff is empty. The compared set is the six family modules plus `contentRegistry.ts`, `crafting.ts`, and `rewards.ts`.
- Broader source snapshots and full source map: `source-before/`, `source-after/`, `source-before.sha256`, `source-after.sha256`.

The first run's live tool output showed three failures: an uninitialized material-stack fixture, a false source failure for Slime Heartstaff (the runtime grants it directly from `bossRules.exclusiveEquipmentId`), and a false material-bias failure because content packs declare no local affix metadata and the runtime uses baseline `AFFIXES`. Attempt 2 redirected over the same top-level stdout/stderr paths before attempt 1 was copied. The `f-integration-run/` inventory has no first-attempt log archive or `playlog.jsonl`; the exact pre-run test source is present in `source-before/`. The first tool output displayed all three failure reports and stack locations without a truncation warning, but the missing raw files prevent byte-level completeness checks. `targeted-attempt-01-reconstruction.md` separates the displayed diagnostics from retained raw artifacts. Attempt 2 then isolated the preview-current expectation when mandatory and optional material inputs shared one stack. Attempt 3 isolated the canonical save fixture shape: V8 requires legacy material IDs before normalizing new content material keys. The final fixture now seeds every current `MATERIALS` key at zero before assigning exact recipe inputs. No Save/runtime/data code was changed.

## Limits

The validator correction's counterexample test has separate evidence under `../f-validator-run/`. Root's centralized validator/content CLI and later full regression remain outside this targeted test run.
