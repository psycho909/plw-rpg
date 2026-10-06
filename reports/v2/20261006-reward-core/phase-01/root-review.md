# Phase1 Root Standards / Spec Review

Scope: `git diff -- src` plus every newly added reward domain/data/engine/service file, all new tests, and Phase1 runtime status source fingerprints. Base HEAD `468a4923d3e847dbd04a5b7edeff6cf5be21a9d5`; staged application content is empty at review time. Root participated in implementation; this document is **not independent review**.

## Standards
Typed definitions and data registries are separated from save unknown-data guards. Vue, game loop, checkpoint journal, IndexedDB and renderer have no Phase1 behavior changes. The only world creation change attaches emptyReward; it consumes no RNG and does not alter NPC creation or world simulation. New gear-stat projection is pure. Existing test fixture helpers explicitly omit the new field to remain genuine legacy V1 shapes, retaining old equality assertions. Unknown or inconsistent reward fields fail through existing preserved-save protection rather than a fallback createGame. No dependencies or new servers are introduced.

## Spec
Reward schema is additive to saveVersion2. V1/V2 validation occurs before attaching defaults, and retained existing reward is strictly checked. IDs, own-character ownership, material stacks and finite catalog discovery remain distinct from legacy inventory. Canonical roll values, rarity cardinality, slot eligibility, level/tier and special/provenance restrictions are enforced. Equipped instances cannot overlap legacy physical slots or refer to missing/foreign instances. Native V1 equality and V2 preservation/idempotence tests pass, including malformed state protection at store entry.

The optional family encounter schema has no product consumer until Phase3. Exact variant-derived combat stats and comparison with saved boss formation are explicitly deferred to the shared Phase3 resolver and acceptance; no Phase3 mechanic is claimed complete. Later crafting/content/retention scope remains excluded.

## Evidence and disposition
243 full tests, fresh typecheck/build, 20 production Chromium checks all pass on the same recorded working-tree source fingerprints. Root found no blocking Phase1 defect. Await the separately spawned Luna/max reviewer final disposition before accepting the gate; its preliminary message found no migration destruction and treats the reserved encounter follow-up as nonblocking Phase1 scope.
