# Save identifier integrity — L2 review

## Scope and review snapshot

- Ticket: `tickets/20261003-comprehensive-playtest.md`; scope is limited to `src/services/saveService.ts` and `src/services/saveService.test.ts` for NPC/crop/event sequence validation, null/shape rejection, and version 1 compatibility.
- Base and HEAD: both `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`.
- Reviewed working-tree patch: `git diff -- src/services/saveService.ts src/services/saveService.test.ts`; both files are unstaged. No base-to-HEAD committed diff is being claimed.
- `src/services/saveService.ts` SHA-256: `2a8cced65b901c2f616c022ee82f170c6b13d2ab486e7ddd0cab13aab5b98852`.
- `src/services/saveService.test.ts` SHA-256 after the reviewed fixture-isolation edit: `6dc6560c38677a4326ecaf2bf64c2cee3a0a3f0a4e09bfd6bacb34b562ce0482`.
- Reviewer: independent general L2 reviewer, not a contributor to this fix; not an L3 audit. GPT-6 Luna Max / max is the assigned route per repository README and `docs/SUBAGENTS.md`; the local profile file is absent, and runtime telemetry is unavailable to independently verify backend execution.
- Repository review guidance and the full available `matt-skills-curated:code-review` entry were read earlier in this task chain. This report keeps Standards and Spec findings separate.

## Standards

No maintainability finding. The added checks stay within the existing pure `valid()` predicate and do not mutate the parsed state or raw storage. `deserialize()` continues to throw the preserved-save error on invalid version 1 data; `gameStore` catches load failures, sets `saveBlocked`, and refuses later saves while blocked. The change does not weaken the raw-preservation flow.

The null crop guard is correctly ordered: the existing shape matcher rejects `null` before `c.id` is read at `saveService.ts:45`, and the short-circuited validation does not reach the `Set` at line 46. The recorded `null-crop-red.log` reproduces the prior `TypeError`; `null-crop-green.log` records the standard preserved-save error test passing (57 tests).

## Spec

The validator changes address the reproduced ID integrity failures and preserve generated version 1 worlds:

- `nextNpcId` is a positive safe integer and must exceed every canonical `npc-N` ID in both `characters` and `npcs` (`saveService.ts:24-25`). This includes a successor moved into `characters`; the dedicated test checks that case (`saveService.test.ts:34-41`).
- Crop IDs must be positive safe integers and unique (`saveService.ts:45-46`).
- `eventSequence` must be a nonnegative safe integer, and every stored event, history, and crop ID must be a positive safe integer no greater than that sequence (`saveService.ts:49-50`). This matches `emit()` and planting, which increment the shared sequence before recording IDs.
- The baseline reproduction `artifacts/reproduce_id_integrity.mjs` shows the controlled `nextNpcId=1` corruption being accepted, later producing duplicate `npc-1` and an unreadable save; its crop case shows a one-crop reward while two plots disappear. `astra-id/reproduce-event-sequence.mjs` separately demonstrates a rolled-back sequence producing crop IDs `[4,4]` and losing both crops on one harvest. These are controlled corruptions, not claims about normal play.
- RED/GREEN evidence records each original failing assertion followed by passing targeted suites. The edge suite covers invalid counter/crop values, IDs ahead of sequence, inherited character IDs, four ordinary crops harvested one at a time, and a 500-year save/reload/continuation. `legacy-results.json` records four real baseline version 1 producer outputs (new game, four crops, 500 years with deaths, and successor) accepted unchanged by the new validator.
- `artifacts/final-check.log` records the pre-isolation full check at 124 tests / 6 files, `vue-tsc`, and production build passing. After the test-only isolation edit, both the root's `review-fixtures-check.log` and my targeted `npm run test -- src/services/saveService.test.ts` run pass all 57 save-service tests; `review-fixtures-types.log` records the follow-up type check. No runtime source changed after the full check; I did not rerun the full suite or build.

### Finding

**ID-1 — Extreme counter exhaustion can make a later save unreadable (low-priority known limit; accepted for this scope).** At `saveService.ts:24` and `:49`, the strict `< Number.MAX_SAFE_INTEGER` test accepts `MAX_SAFE_INTEGER - 1`. One `addNpc()` or `emit()` increments that accepted counter to `MAX_SAFE_INTEGER`; the same validator then rejects the resulting state on reload because it requires the counter to remain strictly below that value. Astra independently reproduced both cases with public operations and documented why changing the static threshold only moves the failure boundary in [`astra-id/COUNTER-LIMIT.md`](astra-id/COUNTER-LIMIT.md). This requires controlled injection near `9×10^15`, is not reachable in the reviewed ordinary-play evidence, and does not invalidate the repairs for low counter rollback, existing NPC ID collision, or duplicate crops. Root accepts it as a disclosed low-priority limitation; no one-line threshold change would safely solve exhaustion. Resolution, if future requirements include hostile near-limit counters, is an explicit runtime ID exhaustion policy that guards every allocation and avoids partial simulation mutations.

**ID-2 — Test isolation was corrected and rechecked.** The `it.each` cases at `saveService.test.ts:22-31` originally shared the founding event object across `events` and `history`. The reviewed update shallow-clones both lists before mutation and asserts every non-target collection remains at or below `eventSequence`. This now isolates the history-only and event-only cases. The updated test SHA is recorded above; `npm run test -- src/services/saveService.test.ts` passed, 57/57, after the edit. The root's `review-fixtures-check.log` independently records the same result.

## Disposition and limits

The implementation matches the reproduced root causes, guards null crops with the standard error, and accepts representative legacy version 1 worlds unchanged. ID-2 is closed after the narrow test correction and passing targeted suite. ID-1 remains an explicitly accepted low-priority limitation under the root's decision, with the extreme counter exhaustion evidence preserved for future scope decisions. Code-level disposition: **acceptable with that documented limit**. This review does not cover UI raw-storage behavior or the other in-progress playtest routes.
