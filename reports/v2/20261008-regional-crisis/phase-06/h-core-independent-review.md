# Phase6-H core independent review

Reviewed 2026-10-08T00:03:30+00:00 on `v2x/reward-core`; base and HEAD are `ec7bd32b5f81c433ecd07bbbcd43c1a51af6ea70`. This reviews the final frozen, uncommitted H source snapshot in [`h-source-freeze.json`](h-source-freeze.json). All 5 source-file and 9 evidence hashes match; the ticket authority hash also matches. Canonical source fingerprint: `96b0c7d241cd249a71cf6459ab8c9ecd4957afa0ff1b1ea2f686f3fffb6704d1` (SHA-256 over sorted `path NUL lowercase source SHA-256 LF` records). Freeze manifest SHA-256: `69465d6acab257c5a05263293541089cef0656b5afaea92c009ad341db1800bc`.

## Standards

**PASS.** Review followed `AGENTS.md`, `docs/agents/review.md` §§1–3, `docs/agents/skill-workflows.md`, and the repository-adapted `matt-skills-curated:code-review` workflow. The H snapshot is three modified tracked implementation/test files, one additional modified test file, and one new engine module; there are no staged H source paths. The final source diff is reviewed against the ticket, freeze map, and current source. `git diff --check` passed on all five frozen source paths.

Recognition calculations are deterministic and read existing contribution facts. The new code calls the existing bounded `changeReputation` and `emit` paths; it adds no identity or Smithing action, RNG call, time advancement, or global state. The public supply/equipment actions check the full event budget before consuming assets or updating ledgers. Camp recognition is inside the existing guarded camp-victory path, whose E clone preflight executes the complete combat resolver. History and identity caps remain in the existing emitter and reputation helper.

## Spec

Basis: ticket H contract and formal spec §§52–60 and §90.

**PASS for H engineering core; recommend Root acceptance.** H adds no save field or reward ledger; save version remains 7. Recognition uses monotonic facts already present in the V7 crisis contribution ledgers and camp marker.

- Supply recognition is per donor and crisis. Food credits divided by 4 plus gold credits divided by 5 award +3 reputation and one major event only on a below-5 to at-least-5 crossing. Ordinary food/gold events remain gameplay events; below-threshold donations do not create major history. A loaded ledger already above the threshold does not replay the award.
- Craft recognition sums `civilDefenseGearEffect(sourceItem.rolledStats, allocation.slot, 10)` by original `craftProvenance.createdBy`; the `10` is the approved combat-skill argument. A below-1.0 to at-least-1.0 crossing gives the original crafter +3 and one major event. Current item owner does not replace creator attribution. For a dead creator, the event preserves name/ID while the existing reputation path awards neither the deceased nor the successor.
- Adventure recognition runs only when the existing current-crisis camp fact changes from `campRaidAt: null` to a timestamp on actual victory. Ordinary Goblin hunts receive no H major event; the Chief keeps the existing +12 path without duplicate H recognition.
- Threshold crossings reserve up to three event IDs before donation assets, gold, ledger, or reputation mutation: gameplay, possible rank-change, and major events. At `MAX_SAFE_INTEGER - 3` the crossing rejects with state unchanged; at `MAX_SAFE_INTEGER - 4` the full three-event path saves/reloads at `MAX_SAFE_INTEGER - 1`. Camp win uses the complete E combat clone preflight, including the H award.
- Reload tests cover supply and crafted-contribution state, dead creator/successor attribution, and in-flight/successful camp state. Final test-only assertions verify supply and craft threshold actions preserve `worldTime` and `rngState`; the camp recognition test also checks RNG preservation. An above-threshold loaded supply ledger does not receive a retroactive event.

The craft contribution seam uses a V7-valid `ItemInstance` snapshot with `rolledStats` and actual `craftProvenance` fields; it verifies threshold aggregation and original creator attribution after succession. Craft generation itself is unchanged and remains covered by existing crafting/provenance tests.

## Verification and gate

I independently verified the final fingerprint, all 5 source hashes, all 9 evidence hashes, the ticket hash, and the recorded-report archive contents. I ran `npm test -- src/engine/crisisContributions.test.ts src/engine/crisisAdventure.test.ts` before the final test-only assertions: **54/54 passed**. After that test-only change, the engineer's current-source follow-up is **24/24** for `crisisContributions.test.ts`, with `npx vue-tsc --noEmit` passing. The earlier H directed set passed **211/211 across 7 files** and `npm run build` passed on the same unchanged production-source hashes. I did not repeat the 211-test set or production build after the test-only assertion update.

No unresolved H core blockers remain. **Recommend Root accept H and release I.** Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`; this review is not an overall Phase6/product PASS.
