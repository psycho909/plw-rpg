# Phase 7-I Discovery UX Plan

Date: 2026-10-08 UTC  
Status: proposal only; no UI source changed and no runtime checks run.  
Authority: `tickets/20261008-v2x-07i-discovery-ux.md`, parent Phase 7 ticket, and §14 of `docs/specs/V2X-PHASE7-CONTENT-EXPANSION.md`.  
Design context: `docs/design/DESIGN.md`, `docs/UI.md`, and the existing world, equipment, crafting, property, and crisis screens.  
Skills applied: `frontend-design` and `frontend-design-premium`, including the canonical UI resolution, design-context lifecycle, and interaction contract references.

## Design direction

The player is a resident adventurer in Oakvale. This screen's job is to help them recognize one worthwhile next action in the living world: notice a local encounter, understand what it may yield, and connect a needed material to a recipe or a settlement use.

Keep the map as the main scene and use the existing contextual `PixelWindow` as the field notebook. A small, plain-text trail is the visual signature: `北方森林 → 傷痕灰狼（精英） → 狼牙 → 獵矛配方`. Each link uses real catalog or world data and appears only when known. It reads like a route through the world, not a dashboard summary. Reuse the current monochrome surface, hard pixel border, Traditional Chinese system font, monospace for levels/quantities, existing emoji world marks, and 4/8/12/16px spacing tokens. No new palette, font, card language, modal, or persistent HUD badge.

## Minimal player flow

1. The player walks to a region and opens its existing place window. Show only current, reachable encounter options grouped by family, with the localized name, textual rank (`普通`, `精英`, `小首領`, `首領`) and one concise mechanic/telegraph cue. Preserve the existing next-goal line. Do not expose a giant monster catalog or repeat mechanics already explained in the battle window.
2. The player follows a track and sees a loot/use hint beside the existing encounter row. On first discovery, keep the existing `loot.item` notice and collection projection as the discovery signal. In battle, `AdventureWindow` remains the owner of the actual current-turn cue and reward forecast.
3. In the existing material inventory, explain one concrete use path and known source region. A “查看配方” action may select that recipe in the existing workbench when the current navigation contract can preserve the current window context. The workbench remains the authority for eligibility, inputs, cost, skill, station and duration.
4. The workbench lists each missing input as `材料 ×需求／持有數量`, then keeps a readable source-region hint beside it. Recipe choice and source hint stay in the current workbench view; do not add a window switch, route action, or navigation architecture.
5. At the farm, expose the currently valid crop choices with the existing native `aria-pressed` button group only if Phase 7-G supplies a crop-selection action and projection. Show region/season, growth, harvest amount and the authored food/use value. At the existing farm-business and crisis contribution owners, continue using their current actions and show the projected contribution before the player commits it.

## Canonical owners and state reasons

| Information or action | Canonical owner | Truth source | Unavailable state |
| --- | --- | --- | --- |
| Local tracks, rank, next goal | `PlaceWindow` forest/region branch | Phase H encounter availability projection and family/monster definitions; existing wolf path remains owned by `wolfEncounterOptions` until a shared content projection is released | Keep the option row and show the engine/projection reason beside its disabled action (for example eligibility, required prior track, unavailable region, or world-state gate). Do not recompute spawn rules in Vue. |
| Active mechanic and next-turn cue | `AdventureWindow` | Existing `wolfCombatPresentation`; for new data-driven mechanics, the combat presentation projection owned by the engine integration | No cue is rendered outside an encounter. If content lacks a supported mechanic projection, do not invent a cue from description text. |
| Discovery and collection | `InventoryWindow` | `state.reward.collection` and the existing bounded loot feedback projection | Empty states point to the real region or source path only when known; no fabricated unread state after the bounded event leaves the buffer. |
| Material source/use path | `InventoryWindow` detail + `PlaceWindow` workbench | Canonical material → loot → monster → family → spawn-region graph; `CRAFTING_RECIPES`; `projectCrafting` / `planCraft` | List multiple discovered sources. For undiscovered regions show only「尚未探索的區域」; distinguish unmet source conditions from undiscovered regions. Keep this as an in-place hint with no route action. Do not imply an unimplemented drop. |
| Missing ingredients and craft action | `PlaceWindow` workbench | `planCraft` and existing `projectCrafting` inputs, station and localized `message` | Preserve exact plan rejection text (`station`, distance, hours, skill, inputs, gold, stamina, combat, dungeon, or character state). Disabled is paired with the current reason. |
| Crop choice and growth | Farm branch of `PlaceWindow` | Phase G crop definitions and engine crop plan/action; save v8 persisted `cropId` | Save v7 crops migrate as wheat without RNG. New crop goods use stable `Reward.materials` IDs and explicit `foodValue`; keep legacy wheat behavior. Show season/region or plot-capacity reason from the engine. |
| Ordinary crop/food contribution | `PropertyWindow` farm-business section | Existing `supplyFarmFood`; Phase G food/crop-good projection and contribution action | State missing food, missing farm business, distance, combat/death, or amount limit using the service/projection reason. |
| Crisis food need/contribution | `LifeNewsWindow` crisis report | `projectCrisis` / `deriveCivilDefense` and `contributeCrisisFood` | Keep crisis phase/shortage as the reason; do not merge crisis support into ordinary farm-business supply. |

The `PixelWindow` remains the only modal owner; native grouped buttons retain `aria-pressed`; `gameStore.act` remains the mutation/save path. All status copy stays in zh-TW and all quantity/rank information remains textual rather than color-only.

## Desktop and mobile layout

- Desktop (1280px and wider): keep the full world behind the existing window. In the forest, place encounter controls and the next-goal cue in a compact list; wrap the source-to-use trail below the selected row. Reuse the current two-column inventory list/detail geometry only for the material detail view. Keep a single primary action in each decision area.
- Tablet (about 768px): keep the same single-column window flow where the available width cannot comfortably fit the list/detail pair; no third pane.
- Mobile (360–560px): stack row contents, keep controls at least the existing 40px mobile-navigation height (prefer 44px for important touch actions), wrap long zh-TW text and identifiers, and let the existing PixelWindow body own long-content scrolling within safe-area viewport bounds. No horizontal table, hover-only mechanic hint, sticky panel, or new bottom navigation.
- Keyboard and assistive technology: semantic headings and lists, visible focus, real buttons for actions, `aria-pressed` on choices, status/live-region behavior only for actual results, and `aria-describedby` or adjacent text for disabled reasons. Preserve PixelWindow focus return, Escape behavior, and the rule that opening a window does not pause world time.

## Root-approved implementation boundaries

1. **Generic encounters and telegraphs:** Phase 7 Core C owns the shared encounter-eligibility and combat-telegraph projection. Existing wolf wrappers remain. `PlaceWindow` and `AdventureWindow` consume that projection; Vue must not rebuild eligibility, mechanics, or combat cues from catalog data.
2. **Material source attribution:** Show source regions only through the canonical material → loot → monster → family → spawn-region graph. List multiple discovered sources. When a source region is undiscovered, say「尚未探索的區域」without revealing its exact location or implying it is currently reachable. Keep undiscovered sources distinct from known sources whose conditions are unmet. Crop-good sources follow their crop-region data; legacy inventory materials use their existing gathering-source mapping.
3. **Crop instances and food semantics:** Save v8 persists `cropId`; v7 crops migrate to wheat without RNG and retain legacy wheat behavior. New crop goods use stable `Reward.materials` IDs, with explicit `foodValue` consumed through the existing supply path. The crop-choice and supply UI must reflect these contracts rather than convert goods to generic food in the presentation layer.
4. **Recipe/source navigation:** Keep recipe selection and source hints in the current view. Do not add a window switch, direct route action, or new navigation architecture.

These contracts resolve the product questions raised by the proposal. The corresponding Core C, G and H implementations must be released before the UI consumes their projections and actions.

## Readiness and deferred verification

The proposal can proceed as an implementation guide after the Core C/G/H projections and actions are released and Root releases Phase 7-I implementation. After release, verify only the approved UI slice: reachable/unreachable encounter states and cue; discovered/unknown source regions; missing/satisfied recipe inputs and exact rejection reason; each crop season/region/plot state; ordinary and crisis food contribution; zh-TW long text at desktop and 360px/mobile; keyboard focus, touch target and narrow-window scrolling. No browser, test, build, or other runtime checks were performed for this proposal.
