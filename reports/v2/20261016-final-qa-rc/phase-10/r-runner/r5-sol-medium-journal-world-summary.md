# Phase10-R round 5 — Journal source worlds

## Disposition and scope

- Targeted source-world fix and requested regression commands passed. **Full dispatch acceptance remains blocked on the many-world retention/cap conflict below.** Parent Ticket acceptance and independent review remain with the lead.
- Authority: `.scratch/20261016-phase10r/dispatch-sol-medium-journal-world.md`, its `common.md`, and `tickets/20261016-v2x-10r-external-review-fixes.md`.
- Changed only `src/stores/gameStore.ts`, `src/stores/gameStore.test.ts`, and this requested report. Built on the accepted, uncommitted round-4 work; did not revert it. No delegation, herdr, commit/push, dependency, balance, journal schema or save schema change.
- Observed HEAD: `99ae963bd57fbeafbb3a57bc4a783b5efe345cdf`. The older common dispatch baseline names `0d86c50`; this worker did not move HEAD.
- Applied `matt-skills-curated:tdd` through the public store/action/reset and checkpoint-service boundaries. No private store state access was added.

## Changes

- `compactPending()` consumes an oldest prefix and groups only its source records by `worldId`. Each source world gets its own summary/gap pair with its own minimum `from` and maximum `to`. Existing markers participate in their own world's group regardless of their position; detection no longer strips exactly one leading pair.
- Marker order follows source-world first occurrence in the consumed prefix, followed by untouched retained records. Marker timestamps and character IDs come from the first source record rather than the current world. World time restarts on reset, so sorting globally by `from` would be incorrect.
- The retained suffix budget includes actual serialized sizes and counts of all generated marker pairs. Both the 256-record cap and 256,000-character pending-array cap pass the mixed-world fixtures; the count-bound fixture retains exactly 256 records and preserves the untouched suffix.
- Related event-overflow marker detection in `markJournalGap()` finds the current world's markers anywhere in pending and extends only those markers. Older worlds' marker objects remain unchanged. With no existing current-world marker, the new pair goes immediately before the current tail time record.
- Round-4 `record()` coalescing, persisted-record replacement IDs, in-flight guards, and real marker-prefix guards were left unchanged.
- Regressions cover oversized legacy-world reset and quota recovery, mixed-world character pressure with repeated compaction, mixed-world record-count pressure, and a current-world event gap behind an older world's marker pair.

## RED / GREEN evidence

Commands ran from `D:\Codex\plw-rpg`.

1. RED: `npx.cmd vitest run src/stores/gameStore.test.ts -t "compacts mixed worlds|reset after oversized"` exited 1: **1 failed / 44 skipped**. Only the mixed-world name matched this filter. Expected two pairs: old-world 500–600 and current-world 480–510. Received one current-world pair covering 480–600, demonstrating the cross-world merge.
2. RED: `npx.cmd vitest run src/stores/gameStore.test.ts -t "oversized"` exited 1: **1 failed / 44 skipped**. The added assertion that both legacy-range markers have `worldId: 'legacy-world'` failed. Both RED runs preceded production-code changes.
3. GREEN after implementation: `npx.cmd vitest run src/stores/gameStore.test.ts -t "compacts mixed worlds|oversized"` exited 0: **2 passed / 43 skipped**.
4. Supplemental regression check: `npx.cmd vitest run src/stores/gameStore.test.ts -t "source world markers|extends only"` exited 0: **2 passed / 45 skipped**. These two supplemental cases were added after the initial RED/GREEN cycle; they are not claimed as separate RED evidence.
5. Final requested suite: `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` exited 0: **3 files / 54 tests passed**, duration **55.86 seconds**. Includes the unchanged 25,000-advance, coalescing, lost-acknowledgement, legacy checkpoint and IndexedDB regressions.
6. `npx.cmd vue-tsc --noEmit` exited 0.
7. `git diff --check -- src/stores/gameStore.ts src/stores/gameStore.test.ts` exited 0. Final report whitespace and scope inspection are recorded below.

## Review and unresolved cap conflict

- Self-review only; not an independent audit. Inspected `git diff -- src/stores/gameStore.ts src/stores/gameStore.test.ts`, the current source, and `git diff --cached -- src/stores/gameStore.ts src/stores/gameStore.test.ts` (empty). The full unstaged diff includes accepted round-4 changes; only the marker helpers, compaction, related event-gap detection and the new world regressions belong to this round.
- Standards: changes stay within the owned persistence code and tests, preserve existing schema, and create replacement markers without mutating persisted/in-flight source objects.
- Spec: the confirmed reset misattribution and mixed-world merge are fixed and tested. The required universal pending-cap guarantee is **not satisfied for arbitrarily many pending worlds**.
- **Blocking boundary:** retaining two separate summary/gap records for each of 129 source worlds requires at least 258 pending records, before retaining any new reset/action. During a sufficiently long archive outage with repeated resets, `compactPending()` can exhaust the input while the generated pairs still exceed 256. This follows directly from the representation and loop; the 129-world boundary was not separately runtime-tested. Source-world attribution is preserved, but no universal count/size bound is claimed. Even one record per world cannot preserve arbitrarily many worlds under a fixed record cap.
- No world markers were silently evicted, merged across worlds, or relabeled to conceal this conflict. No retention policy or external storage behavior was invented within this dispatch.
- **Next action for lead/Owner:** decide an explicit oldest-world retention/eviction policy, or revise the per-world marker/cap contract. Preserving every source world indefinitely while requiring a fixed pending cap cannot be implemented with the current per-world record representation. The source-attribution patch is ready for review, but do not mark the full dispatch or parent Ticket accepted on this evidence alone.
- Existing round-4 risk remains: lost archive acknowledgement can preserve overlapping ranges under different IDs. This patch neither changes that contract nor bounds total IndexedDB history.
- No full `npm.cmd run check`, browser, deployment, independent audit or remote publication was performed; these remain outside the worker dispatch.

Final inspection: only the two owned source/test files and this report were written by this worker. Scoped diff whitespace check and report trailing-whitespace inspection passed.
