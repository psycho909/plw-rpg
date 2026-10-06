# Phase 2 Reward UI / Presentation — Independent Review

Disposition: **PASS WITH FOLLOW-UP (UI-only)**. No blocking finding was identified in this presentation fragment. This is not a Phase 2 gate acceptance: full build and fresh-browser UI verification remain pending the global source freeze.

## Scope and snapshot

Reviewed the Phase 2 equipment ticket, Phase 3 variant ticket for scope boundaries, AGENTS.md, README.md, docs/agents/review.md, the Phase 0–3 sections of docs/specs/V2X-REWARD-RETENTION.md, docs/UI.md, the UI plan, and the frozen presentation scope: InventoryWindow.vue, CharacterSheet.vue, rewardProjection.ts/test.ts, and the narrow style.scss diff. Engine action/generation/combat implementation is excluded from this report; Phase 3 AdventureWindow behavior is also out of this fragment.

Base commit and current HEAD are both `f89c2c292aaadb6c22bc0453188661f22e4f15b2`. The UI changes are unstaged; the staged diff is empty. The three-dot branch diff from this fixed point is empty. I reviewed the tracked UI changes with `git diff --cached -- <paths>`, `git diff -- <paths>`, and the untracked-file list; the new projection module and test were read in full. `git diff --check -- <tracked UI paths>` passed. Source files were not changed by this review.

SHA-256 snapshot:

- src/components/InventoryWindow.vue — 8f2402400b3f9f87e719dc18d3330be8950db5a425a6ddc62d1b09759586f475
- src/components/CharacterSheet.vue — db3d94e19d29efe49e33d558d022ca9f3dd3bba621365db9075c7baeb395002b
- src/presentation/rewardProjection.ts — b83c2a8c5ad438c4bcdef6d220cea6b9a912d91bd63feec532fe627ca1596a3e
- src/presentation/rewardProjection.test.ts — 32099e63ced6b0f3b0f011eebb30eff8e776dfe3ccc6df861e6401a1e718997c
- src/style.scss — 4f176d6604f81bfe0b14a2e590ea0dcc7b79570e9367f7afb868bacfc6f8f605
- docs/UI.md — e6f02fd9f102878e093463af4e3221a8e85b6a1dbf6e59e8624a4b5cab4c0a46
- reports/v2/20261006-reward-core/ui-plan.md — 61b0f5a9d30d7c0587afe9e6307d1d91160d023ba8b6cf69bb3bc09c6c8c5660

Reviewer: independent context, not involved in implementation. The orchestration tool explicitly requested `gpt-6-luna`, reasoning effort `max`, `fork_turns=none`; runtime model telemetry is unavailable. The project Luna profile file is absent per the orchestration handoff.

## Standards

Result: **PASS WITH FOLLOW-UP**. The UI follows the existing monochrome/world-first design, retains supplies as the initial category, uses the existing PixelWindow modal, native aria-pressed filter buttons, bounded detached gear pages, and one shared physical weapon/armor slot projection. Sale confirmation is an inline group within the existing dialog; it gives the permanent-loss outcome and initially focuses the safe “保留這件裝備” action. Page/filter state is transient, stale pages clamp, and filtered/paged projection does not delete instances. The mobile one-column inventory override is later in stylesheet order and continues to apply to the gear layout.

### Finding UI-R1 — P3, non-blocking: successful sale returns keyboard focus to the category selector

At `src/components/InventoryWindow.vue:54`, `querySelector('dialog .gear-layout .item-list button, dialog .filter-buttons button')` is intended to prefer the first remaining gear row. DOM query order is document order, however, and the category/filter buttons are rendered before the gear list (lines 78–94). The query therefore selects the first category button (“日常物品”) after every successful sale, while the view remains in the gear category. A keyboard user must traverse the filter controls again to continue browsing.

This weakens the focus-containment and safe-focus interaction contract in `docs/UI.md:39–46`; the product UI plan also lists keyboard/focus verification at `reports/v2/20261006-reward-core/ui-plan.md:11`. Prefer querying the gear-list button first and use a filter control only as a fallback when the list becomes empty. Verify both the remaining-item and empty-list cases after the fix.

### Finding UI-R2 — P3, non-blocking: locked blacksmith state is described as a location/hour problem

When `canVisit(..., 'blacksmith')` is false, `src/components/InventoryWindow.vue:104–105` disables sale and says to visit the blacksmith during opening hours; it does not distinguish a missing/unlocked-later building. A normal new save starts before the blacksmith is unlocked: `README.md:27` says the tavern and blacksmith unlock after the settlement grows into a village. Players who obtain gear before then can be directed toward a service that does not yet exist. Add a brief locked-state explanation when the building is unavailable; do not change the settlement unlock rules.

## Spec

Result: **PASS FOR THE REVIEWED UI SLICE; full acceptance remains pending**. The reviewed code and docs align with the Phase 2 presentation needs: bounded inspectable gear, actual same-slot comparison, clear confirmation before permanent sale, existing store/blacksmith access gates, and world-retained discovery display. The projection reads only the active owner’s instances and returns a detached bounded page; its tests cover paging/clamping, filtering, preservation of the source inventory, and fixed/procedural equipment-slot comparison.

Phase 3 monster/combat UI and engine acceptance were not reviewed here and are not reported as missing Phase 2 UI work. The implementation plan itself says the UI description does not claim Phase 2/3 gate completion or human retention approval.

## Verification evidence and limits

I did not rerun tests, build, or browser checks. The recorded focused projection run in `reports/v2/20261006-reward-core/phase-02/projection-green-status.json` reports the two projection tests passing. The projection source/test hashes in that run match this review snapshot. That run does not exercise the changed Vue components. Root reports that Phase 2 build and browser checks are pending worker/global source freeze; this report therefore does not claim them as passed. No full Phase 2 gate conclusion is made.
