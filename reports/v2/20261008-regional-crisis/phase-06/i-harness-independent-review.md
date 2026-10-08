# Phase 6-I simulation harness independent review

**Result: PASS WITH FINDINGS.** The evidence includes 10,000 actual canonical crisis resolutions, three continuous 100-year engine worlds, and a 500-pair matched public Life contribution supplement. Standards and Spec results are reported separately below. This is a harness and evidence review; it does not review application source behavior or claim a product-level Phase 6 pass.

## Standards

**PASS WITH FINDING.** In `phase06_i_simulation.test.ts:185,216,241-243`, each 10,000-run fixture is initialized with `seedCycle[index % 3] + index` and records that derived world seed, while the runner summary groups rows by equality with the three unmodified base seeds. Its original `outcomesBySeed` buckets are wrong.

The recorded [resolution reanalysis](i-runs/phase6-i-10000/resolution-reanalysis.json) preserves the original summary and raw JSONL and groups by `index % 3`. Its verifier checks contiguous indices, the derived seed schedule, profile schedule, actual resolver outcomes, save round trips, and source/HEAD hashes. Use the reanalysis `baseSeedScheduleGroups`; do not use the original summary’s `outcomesBySeed` field.

## Spec

**PASS WITH LIMITATIONS.** The 10,000-row run has contiguous unique indices, 1,000 rows per profile across ten profiles, all four outcomes, a canonical `resolutionSummary` for every row, and successful pre/post save round-trip checks. Each fixture reaches `aftermath` through `simulate()` and records world consequences and injuries. The corrected totals are 2,338 decisive successes, 1,607 costly successes, 4,238 setbacks, and 1,817 local defeats.

The 500-pair supplement closes the public Life contribution route gap. Within every pair, the complete pre-action state hash, world time, crisis ID, and RNG start match. The control is a living player taking no crisis contribution actions (`NoPlayerAction`); the treatment accepts public engine food, gold, and equipment contribution APIs in all 500 cases. Each arm reaches canonical aftermath and passes pre-resolution reload, post-resolution reload, and loaded-resave/no-replay checks. The treatment contributes 25 inventory food, 25 gold, and a controlled `generateItem` craft-context spear through the canonical equipment contribution action. The full crafting transaction is not exercised.

Actual success chance averages 0.30853 in control and 0.49811 in treatment, higher for treatment in all 500 pairs. Outcomes, in decisive/costly/setback/defeat order, are 96/62/245/97 for control and 153/93/182/72 for treatment. Initial RNG state is matched; the later resolver draw is identical in 463 pairs and differs in 37 after canonical progression. This is a deterministic matched initial-state contrast, not shared-roll causal pairing or iid statistical inference.

The supplement’s `combatCalls=0` field is a static annotation rather than a runtime counter. The harness imports and invokes no player combat API, which I verified by source inspection; describe this as a source-inspected noncombat route, not dynamically instrumented combat telemetry.

The main profiles also have explicit control limits: NoPlayer is canonical player death plus an emptied resident population and measures Chief-present recovery; LifeOnly/Prepared NPC jobs are fixture edits rather than live life/job production; StrongGear/WeakGear and the supplement generate craft-context items with provenance then use canonical contribution, without running the craft transaction; ChiefOnly calls the canonical NPC chief-defeat hook without a combat encounter. Keep these descriptions attached to the controlled profiles.

The long-world run records 300 annual rows and nine checkpoints for seeds 399889, 400162, and 400435 at years 10, 50, and 100. Each year is 120 days (1,200/6,000/12,000 days at those checkpoints). Checkpoints verify unique actor IDs, active-character existence, finite world time, safe event sequence, save/reload equality, and equality after one more day from loaded and uninterrupted states. They also record population, economy, threat/crisis, history/events, and save size.

The harness records engine history/events, not browser or service journal growth. The 20k-history clone/profile performance benchmark is deferred explicitly to Phase 6-J. These engine runs have source and runner/config hashes but no build hash because no application build is used; do not claim build-hash verification.

## Evidence and disposition

- Source fingerprint: `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`; HEAD: `4399579ea67703f2f5ea7ac03d3f2c249ce94eef`.
- Main runner/config SHA-256: `3e5a625f65f7f77c75c6e26b9553ed7e4a0865db2f5bac28ba4f31beaede4dc7` / `39fb2f864278b9a5cf5b7f556bc1d80474a08cf6edf48435be59e4dc5430e532`.
- Life supplement runner/config SHA-256: `214276747a05b773cc8110618827ba5046a0300e792b339641e671f40a0790ff` / `08581fdcdec3aa58efcd1fb72de804cefcde2e88b8832c714756751178e59a8b`.
- All three runner exits are recorded as 0. Raw inputs, summaries, manifests, and reanalysis hashes appear in the accompanying JSON and are archived in the phase playlog.
- No production application bug was found or reviewed. Findings concern the original per-seed projection and evidence limitations stated above.
