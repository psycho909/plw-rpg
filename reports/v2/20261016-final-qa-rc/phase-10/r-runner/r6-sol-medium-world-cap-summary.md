# Phase10-R round 6 — bounded multi-world journal markers

## Scope and disposition

- Authority: `.scratch/20261016-phase10r/dispatch-sol-medium-world-cap.md`, `common.md`, and `tickets/20261016-v2x-10r-external-review-fixes.md`; implements the dispatch's explicit oldest-world merge decision.
- Observed HEAD: `99ae963bd57fbeafbb3a57bc4a783b5efe345cdf`. Built on the existing uncommitted round-4/5 changes without reverting them.
- Changed only `src/stores/gameStore.ts` (compaction and marker helpers), `src/stores/gameStore.test.ts`, and this requested report. No delegation, herdr, commit/push, dependency, balance, journal schema, or save schema change.
- Used `matt-skills-curated:tdd` through public store actions and checkpoint service boundaries. Worker verification is recorded below; parent Ticket acceptance, independent audit, full project check, and publication remain with the lead.

## Changes

- First attempt ordinary oldest-prefix compaction with per-world attribution. If that satisfies both caps and preserves the newest record when feasible, keep that result unchanged. This preserves round-5 behavior even when many distinct worlds remain in the untouched suffix.
- When necessary, budget world marker pairs by actual serialized character cost and record count, reserve room for the newest record when it can coexist with a combined summary, and merge oldest worlds until the representation fits. Retry prefix compaction using that policy; newer worlds retain individual markers and the untouched newest suffix.
- Both combined messages explicitly state `較舊 N 個世界的紀錄缺口已合併` and identify their time range as spanning worlds. Combined records use the documented, deterministic, schema-valid sentinel `journal-combined-worlds`; normal generated world IDs remain UUIDs. Existing summary/gap prefix guards recognize both combined messages, preventing time coalescing into them.
- Read cumulative world counts from existing combined messages, deduplicate each source world's contribution across its summary/gap pair, and add newly absorbed worlds. Counts survive checkpoint serialization and reload. Existing records and in-flight/persisted objects are not mutated; replacement markers receive new IDs.
- Marker character IDs longer than 128 characters are omitted, because the legacy journal validator accepts arbitrary character strings and copying unbounded metadata into markers would defeat the hard size cap. Normal character attribution is unchanged. JSON array brackets/separators are included in size checks.
- No changes to `record()` coalescing, persisted replacement-ID behavior, flush/reset behavior, or `markJournalGap()` current-world selection.

## RED / GREEN evidence

Commands ran from `D:\Codex\plw-rpg`.

1. Initial RED, before production edits: `npx.cmd vitest run src/stores/gameStore.test.ts -t "bounds .* pending worlds"` exited 1: **2 failed / 47 skipped**. The 129-world fixture retained **258** records; the 1,000-world fixture retained **2,000**, exceeding 256. Each fixture supplies existing per-world summary/gap pairs under archive outage.
2. Initial GREEN: `npx.cmd vitest run src/stores/gameStore.test.ts -t "bounds .* pending worlds|mixed worlds|source world markers|oversized"` exited 0: **5 passed / 44 skipped**. The new fixtures assert combined counts **3** and **874**, unchanged newest per-world markers, retained newest actions, and both caps.
3. Additional character-pressure RED: `npx.cmd vitest run src/stores/gameStore.test.ts -t "large newest"` exited 1: **1 failed / 52 skipped**. A 246,000-character newest message was replaced by a gap marker despite fitting alongside a combined summary. An earlier 198,000-character fixture retained the newest message already and failed only an unnecessary merge expectation; that fixture was corrected to create actual retention pressure before fixing the budget. One sandbox attempt failed with esbuild `spawn EPERM`; the standalone escalated run supplied the behavioral RED evidence.
4. Character-pressure GREEN plus cumulative-count and marker guards: `npx.cmd vitest run src/stores/gameStore.test.ts -t "bounds .* pending worlds|cumulative|large newest|unpersisted marker|mixed worlds|source world markers|oversized"` exited 0: **11 passed / 42 skipped**. Cumulative fixture reloads a count of 100, compacts to **102**, adds ten newer worlds, reloads, and compacts to **112**. These cumulative and guard cases supplement the original RED cycle; they are not claimed as separate RED evidence.
5. Compatibility RED found during self-review: `npx.cmd vitest run src/stores/gameStore.test.ts -t "prefix compaction alone"` exited 1: **1 failed / 54 skipped**. A 129-world fixture with many oldest-world detail records incorrectly emitted the combined sentinel even though ordinary prefix compaction fit. Fixed by trying ordinary compaction before applying the combined-world policy.
6. Final targeted GREEN: `npx.cmd vitest run src/stores/gameStore.test.ts -t "bounds .* pending worlds|prefix compaction alone|cumulative|large newest|unpersisted marker|legacy character|mixed worlds|source world markers|oversized"` exited 0: **13 passed / 42 skipped**. Includes oversized legacy character metadata and both combined prefixes under the same-world coalescing guard.
7. An intermediate requested three-file run exited 0: **3 files / 61 tests**, **54.70 seconds**; its typecheck exited 0. This preceded the final ordinary-compaction compatibility fix and is not the final verification snapshot.

8. Final requested regression after the compatibility fix: `npx.cmd vitest run src/stores/gameStore.test.ts src/services/phase10rJournal.test.ts src/services/playJournal.test.ts` exited 0: **3 files / 62 tests passed**, **54.25 seconds**. Includes the existing 25,000-advance, persisted replacement-ID, lost-acknowledgement, current-world event-gap, and journal service regressions.
9. Final `npx.cmd vue-tsc --noEmit` exited 0.
10. Final scoped `git diff --check` and report whitespace check exited 0. Worker implementation and requested verification are complete; independent acceptance remains with the lead.

## Review and remaining boundaries

- Self-review only, not independent audit. Inspected actual source plus `git diff -- src/stores/gameStore.ts src/stores/gameStore.test.ts`, `git diff --cached -- src/stores/gameStore.ts src/stores/gameStore.test.ts` (empty), and `git status --short`. Full unstaged diff includes prior accepted round-4/5 work; only the changes described above belong to round 6. Other workers' files were left untouched.
- Standards: scope stays within assigned marker/compaction code and tests; schemas and dependencies are unchanged; public checkpoint boundaries verify loading and output. Spec: fixed record and character budgets include generated markers, newest-record reservation, cumulative counts, newer-world attribution, and real prefix guards.
- Bound reasoning: at worst, all consumed worlds can collapse into one bounded marker pair. The prefix scan removes oldest input until that pair plus the retained suffix fits both limits. Character metadata is bounded before creating marker pairs, and no spread over arbitrarily many worlds is used. A newest record that cannot fit with even one combined pair is explicitly summarized instead of violating the cap.
- Combined markers intentionally lose individual old-world attribution according to the Owner decision. Cross-world minimum/maximum minutes are envelopes, not a continuous single-world timeline; messages explicitly state this.
- Existing lost-acknowledgement risk remains: IndexedDB may retain overlapping ranges under different IDs. This work bounds pending checkpoint data, not total archived history or the game-state portion of localStorage.
- No full `npm.cmd run check`, browser test, production build/deployment, independent audit, or Git publication was performed by this worker. Parent L3 acceptance remains the lead's responsibility.
