# Phase6-F core independent review

Reviewed 2026-10-07T23:13:59+00:00 on `v2x/reward-core`; base and HEAD are `6583db9ba0da1e31df6af2f4583771bc54a38e6e`. This reviews the frozen, uncommitted F source snapshot in [`f-source-freeze.json`](f-source-freeze.json). All 16 source-file and 29 evidence digests match. Canonical source fingerprint: `d0ff4e64ab667ca5ade5e7fe914f25e5d4c9cdc1e33822b0b46313e52e3e52e7` (SHA-256 over sorted `path NUL lowercase file SHA-256 LF` records). Freeze manifest SHA-256: `a552c41bf0fb049dc80f19de71cf9e9ee8fe5ff3f81b1407300fdc7713cad70d`.

## Standards

**PASS.** Review followed `AGENTS.md`, `docs/agents/review.md` §§1–3, `docs/agents/skill-workflows.md`, and the repository-adapted `matt-skills-curated:code-review` workflow. The staged source diff is empty; the frozen source snapshot consists of 15 modified tracked files plus the new `src/engine/crisisResolution.test.ts`. The final source hash map was checked against the freeze; `git diff --check` reported no whitespace errors on the source paths.

The full-action preflight runs only when an action can reach an active resolution, legacy `resolution`, or due-recovery daily boundary. It clones the state and executes the internal action on the clone before the live action. RNG writes and emitted events stay on that clone; the event capture WeakMap is keyed by state, so the preview does not register real-state captures. The internal calls do not recurse through public action wrappers. Valid craft plans enter preflight before resource mutation, while invalid plans return their existing stable error. No generic clone runs for normal, non-boundary actions.

The accepted preview copies bounded history up to 20,000 events, and a boundary-reaching Goblin raid also includes its existing E combat preview. Root approved this design; profile this cost during I/J. No browser performance result is claimed.

## Spec

**PASS for F engineering core, with one scoped recovery limitation recorded below. Recommend Root accept F core.** The resolver only handles the `resolution` phase, checks event/time capacity before consuming the resolution roll, uses RandomService once for the outcome, applies bounded actual world deltas and injuries, persists the measured summary, and transitions out of `resolution`. The resolution-phase guard prevents reroll/replay after save/reload. It does not force a Chief kill or delete an NPC/property.

The V6→V7 migration reuses the authentic archived V6 fixture and preserves its world, time, RNG, and existing contribution/adventure facts. Legacy V6 aftermath/cooldown saves receive `resolutionSummary: null`; migration does not invent historical probabilities or reapply consequences. New V7 summaries are range- and shape-validated, including canonical historical NPC IDs below `nextNpcId`.

Public time-advancing actions preflight their complete internal action at crisis/recovery boundaries, including pre-simulation resource/combat mutations and post-simulation events. The additional safe-world-time guard rejects an unsafe resulting timestamp before action mutation. Preserved REDs cover resolution/recovery, V6→V7 migration, event capacity, paid rest, combat/reward, walk, home-rest trailing events, legacy resolution, extreme world-time, and the craft validation-order regression; the current 411-test set includes the fixes.

### Product limitation: recovery is scheduled only for zero population at resolution

At resolution, the implementation records a 30-day pending relief only when living population is already zero and the Chief is alive. At the due date it rechecks population and Chief status, cancels if conditions changed, or grants one adult resident. If the population is nonzero at resolution but later falls to zero during aftermath, no relief is scheduled. Root scoped the approved safety valve to zero population at resolution; this report records that boundary and does not request an unapproved expansion. Do not describe every later zero-population path as recoverable.

## Verification and gate

The engineer's current-source directed run is **411/411 across 14 files**, with `vue-tsc --noEmit` and `npm run build` passing. I verified the run/build/typecheck evidence digests against the frozen manifest and did not rerun the large suite. The two-file craft/resolution follow-up is **75/75** on current source. The preceding 410/411 craft-ordering failure is retained as development evidence, together with its pre-fix hashes; it is superseded by the plan-before-preflight fix and current GREEN.

No unresolved F code blocker remains. **Recommend Root accept F core with the zero-at-resolution recovery boundary documented above.** Full-history clone profiling remains for I/J. Human validation is `DEFERRED / NOT APPLICABLE AT THIS STAGE`; this review is not an overall Phase6/product PASS, and G remains blocked until Root accepts F.
