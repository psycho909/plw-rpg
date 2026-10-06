# Phase 2 Reward UI — Follow-up Review

Disposition: **PASS** for the authorized UI follow-up patch. The three scoped fixes close the two original low-severity findings from [ui-independent-review.md](ui-independent-review.md). That initial report is preserved unchanged. This follow-up is not a full Phase 2 gate review.

## Snapshot and scope

Read-only review of the authorized three-change patch in `src/components/InventoryWindow.vue`, against the previously sealed presentation snapshot.

- Sealed InventoryWindow.vue SHA-256: `8f2402400b3f9f87e719dc18d3330be8950db5a425a6ddc62d1b09759586f475`
- Current InventoryWindow.vue SHA-256: `ba829563f54fa6ea30a3f5c144d0209e8b78c06aef23df53b1c29041cf56cca8`
- Other six sealed UI-scope files retain their prior hashes:
  - src/components/CharacterSheet.vue: `db3d94e19d29efe49e33d558d022ca9f3dd3bba621365db9075c7baeb395002b`
  - src/presentation/rewardProjection.ts: `b83c2a8c5ad438c4bcdef6d220cea6b9a912d91bd63feec532fe627ca1596a3e`
  - src/presentation/rewardProjection.test.ts: `32099e63ced6b0f3b0f011eebb30eff8e776dfe3ccc6df861e6401a1e718997c`
  - src/style.scss: `4f176d6604f81bfe0b14a2e590ea0dcc7b79570e9367f7afb868bacfc6f8f605`
  - docs/UI.md: `e6f02fd9f102878e093463af4e3221a8e85b6a1dbf6e59e8624a4b5cab4c0a46`
  - reports/v2/20261006-reward-core/ui-plan.md: `61b0f5a9d30d7c0587afe9e6307d1d91160d023ba8b6cf69bb3bc09c6c8c5660`
- No other InventoryWindow changes were found beyond the three authorized focus/help-text fixes.
- The original report `phase-02/ui-independent-review.md` and JSON remain present and unchanged.
- `git diff --check -- src/components/InventoryWindow.vue`: **PASS**.

## Closed findings / fixes

1. **Sale-success focus — closed (original UI-R1).** After success, the code now queries the first remaining gear-list button in its own query, then falls back to the currently pressed category button. The earlier comma-selector/document-order issue is removed.
2. **Sale-cancel focus fallback — closed (related focus case).** If the saved sale trigger is disconnected or disabled, focus now goes to the currently pressed category rather than the first category control.
3. **Unavailable blacksmith guidance — closed (original UI-R2).** When `settlement.buildings` does not contain `blacksmith`, the UI states that village growth and the blacksmith opening unlock gear sales. Once the building exists, the prior opening-hour/proximity/equipped-item guidance remains.

The building-membership predicate matches the existing `BuildingId[]` model. The normal new save has no blacksmith and village growth adds it; this review does not change or reassess the unlock rule.

## Verification limits

The reviewer did not run tests, build, or browser checks. In particular, build and fresh-browser verification remain outside this follow-up. No source or Git metadata was modified; only this recorded follow-up report and its archive entries were published via `scripts.recorded_reports.write_recorded`.