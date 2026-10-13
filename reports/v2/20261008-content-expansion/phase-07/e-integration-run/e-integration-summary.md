# Phase 7-E Boss Integration and Scoped Corrections

## Scope correction and evidence location

The first authored evidence directory was created at `phase07/e-integration-run/`. It was moved intact to `reports/v2/20261008-content-expansion/phase-07/e-integration-run/` because that is the assigned Phase 7 evidence root. Existing command logs, snapshots, and hashes remain byte-for-byte unchanged; their recorded working-directory text is historical and still names the original checkout-relative path.

## Captured precheck and allowed corrections

Root's validation-only source capture is retained at `e-content-validation-run/runs/2026-10-13T02-51-56.085Z-dbda131c-3bbb-4c7d-a118-d872aadb4196/`. It reported seven errors: three unresolved future equipment references, the orphan `wild_beast_apex_core`, and insufficient identity axes for the two Wild mini-bosses plus Frontier Saboteur. The captured source and precheck artifacts remain immutable.

Corrections in this scope:

- Wild Beast loot now references existing family equipment. Its mini-boss pool and IDs are restored to the approved `wild_beast_old_matriarch` / `wild_beast_ironhide` entries, using `wild_beasts_loot_matriarch` / `wild_beasts_loot_ironhide`, with the planned rally and guard combat identities and reachable forest/farmland roles.
- `wild_beast_apex_core` has a positive `striking` / `keen` optional bias consumer in the existing weapon knife recipe. The E integration test proves selected boss loot plus selected normal loot can supply the inputs and that crafting consumes the boss core.
- Frontier Saboteur's selected equipment now resolves to the existing `frontier_goblin_wire_knife`.
- Cave and remaining-family D regression assertions now select their original six normal plus two Elite entries. The original seven Wild/Frontier material compatibility assertions remain; E boss materials are checked separately against compatible output slots.
- No other data family, runtime, save, or RNG code was changed.

## Verification

The final targeted commands and captured output are in `scope-corrections/`. The six data modules and three relevant integration tests are snapshotted under `scope-corrections/source-snapshots/`; the manifest is `scope-corrections/source-snapshots.sha256`.
