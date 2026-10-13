# Phase 7-F Content Item Integration Run

## Scope

The public-seam test is `src/engine/contentItems.integration.test.ts`. It exercises all 24 registered recipes using controlled game-state witnesses for station, progression, time window, gold, stamina, inventory inputs, recipe materials, and optional bias materials. Each craft is previewed with `planCraft`, compared with an expected instance from the existing `generateItem` API on a cloned state, then checked for exact input consumption and craft provenance. The same output is equipped, saved/reloaded, unequipped, and sold through the public APIs.

The catalog checks cover the 48 content equipment bases and 30 weapon / 18 armor split. Each base must be referenced by a valid recipe or by a positive-weight entry in a selected monster loot table with a nonzero equipment chance. Boss-exclusive bases must have their boss source and no selected non-boss source. Material coverage requires an authored mandatory recipe input or compatible optional generation bias; it does not assert the final Phase 7 quantity gate.

Controlled state mutations are witnesses for reachable API preconditions and are not claims about natural progression or drop frequency. No content-source extraction, validator, full regression, or runtime simulation is part of this targeted test.

## Run gate

Do not run until Root confirms the five Low-authored family modules are frozen. Before execution, record the source SHA and snapshots of the six family modules, `src/data/contentRegistry.ts`, `src/data/crafting.ts`, the new integration test, and the relevant engine files. Run only the targeted test first; retain stdout, stderr, and exit status here. Any failure report must identify its exact recipe or base ID and preserve the corresponding source snapshot.

Execution results and source maps are recorded in `summary.md` and the sibling run artifacts.
