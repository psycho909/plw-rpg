# Phase 4-E UI implementation and verification

Status: UI slice implemented by its assigned owner after Root accepted Phase 4-A through D and issued the E go-ahead. Browser regression/stress and Adventure exploratory playtest remain pending their designated QA owners; no runtime result is claimed here.

## Canonical ownership and changes

- `InventoryWindow.vue` remains the single owner for gear browsing and compare decisions. It presents candidate rarity/name and every candidate/current same-slot stat with explicit signed deltas, then compares both affix lists and special traits in the existing detail pane. Stable hook: `data-gear-comparison`.
- `rewardProjection.ts` owns detached comparison projection for only a currently owned candidate. It includes real rarity, base, rolled stats, affix identity and special trait for both sides, including fixed legacy equipment. It does not mutate state, consume RNG, score gear, or infer “upgrade”.
- Affix copy follows current engine behavior: attack adds hit damage; defense reduces received damage; critical can double attack damage; penetration lowers enemy defense and doubles while the wolf armored phase is active; bleed adds fixed damage on every hit and is not damage over time; block can halve incoming damage; reduction reduces incoming damage by percentage. `moonHunter` explicitly affects wolves only.
- `PlaceWindow.vue` renders every existing wolf track option with expectation from `wolfRewardExpectation`: gear chance, drop level, nonzero rarity rates, guaranteed/chance material, and boss-exclusive base. Visible stable hooks: `.wolf-track-row`, `data-wolf-track`, `data-wolf-reward-expectation`, and exactly one `data-adventure-goal` in the forest panel.
- The goal advances from the first undefeated eligible/locked target. After all targets are defeated it recommends the re-challengeable boss; during its cooldown it points to the existing elite reward opportunity. When progression is blocked, it uses the engine-provided reason.
- `AdventureWindow.vue` shows the same engine-backed “if defeated” reward forecast during wolf combat alongside existing rank, trait, variant, and next-turn cue. No RNG or combat calculation is added.
- `awardWolfLoot` now checks whether the generated base was absent from the existing unique `collection.bases` set before inserting it. It adds `新發現：` to the existing `loot.item` event message only for that first base discovery. This changes no RNG, reward/save fields, event type, collection semantics, or generation rules. Stable visible hook: `data-loot-feedback`; it reads only the actual event text while that event remains in the bounded events buffer. Once evicted, the collection view says `收藏已記錄` and does not recreate a novelty claim.
- `src/style.scss` keeps existing monochrome tokens and adds compact, wrapping comparison/expectation layouts, signed/arrow deltas, a narrow-width affix stack, and a restrained reward feedback row. Existing sale confirmation, Escape/focus restoration, 20-item paging, disabled reasons, reduced motion, and window scrolling remain in place.
- `docs/UI.md` records these canonical owners and data-backed contracts. `premium-ui.json` points to Phase 4 targeted, stress and exploratory browser runners; those browser runners remain unexecuted by this UI owner.

## Verification performed

- TDD red: first-discovery engine test failed before the event label change because the real first moon-fang award lacked `新發現`; captured as `ui-new-discovery-tdd-red.txt` with status JSON through `scripts.recorded_reports.write_recorded`.
- `npm run test -- src/presentation/rewardProjection.test.ts src/engine/itemGeneration.test.ts`: passed, 2 files / 28 tests. Covers same-slot detached comparisons, true first boss base award vs repeat, unchanged reward schema/deterministic RNG across replay, and no reconstructed “new” status after the bounded event is evicted.
- `npx vue-tsc --noEmit`: passed.
- Official frontend-design-premium `audit_project.py /workspace/plw-rpg --mode strict`: passed with 0 findings; final JSON archived as `ui-static-audit.json` through `scripts.recorded_reports.write_recorded`.
- `python3 -m json.tool premium-ui.json`: passed.
- `archive/test_runner_paths.py`: passed (3 tests).
- Full `npm run check`, production build, browser regression, stress, 390px, keyboard/focus, reduced-motion and adventure exploratory runtime validation were not executed by this owner; designated QA owns those checks.

## Remaining risk

The visible loot feedback disappears when its actual `loot.item` event leaves the bounded event ring. Durable collection IDs remain available and are displayed as `收藏已記錄`; the UI does not infer novelty from those IDs. Browser owner must verify the authored selectors and rendered Traditional Chinese expectation copy in the production UI.

## Post-review copy clarification

Independent UI review accepted with no P2 findings and requested that rarity rates be explicitly conditional on a gear drop. Both expectation strings now say `品質（掉落裝備時）`, separating rarity shares from the preceding overall gear-drop chance. Root approved this copy-only correction and waived rerunning the low-impact copy unit/static checks; the assigned full browser/full-check owner will verify final UI. Source is frozen after this correction.

Source SHA-256 and exact scoped copy change:

- `src/components/PlaceWindow.vue`: `46c761635ac960fc5b88a629c5940d6af842c8bc18aa19e6424c3594b069173e` → `ba31a984e6936a940d8086ee14bd6e1387b2bba0112cf5940f5373bd3096f6d2`; `品質 ${rarities}` → `品質（掉落裝備時） ${rarities}`.
- `src/components/AdventureWindow.vue`: `d4901efab46aeee41c04813369a94787fcf1b5f2a60128984e037f80bde851cd` → `eb6167f033c2c871d0719fb3742319df591feace02bffabe8af5a4802ebfc087`; `品質 ${quality}` → `品質（掉落裝備時） ${quality}`.
