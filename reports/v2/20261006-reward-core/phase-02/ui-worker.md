# Root UI implementation (awaiting engine / browser gate)

Root owns InventoryWindow, CharacterSheet, rewardProjection and its tests, narrow style additions and docs/UI.md. Both frontend-design skills were loaded; canonical contract map and current desktop/390px sibling screenshots inspected. No token, PixelWindow/PixelMeter/StatusNotice owner, game loop or save journal redesign.

Implemented bounded detached20-item pages with filters/clamping, actual physical-slot comparison, rarity/affix values, inspect/equip/material/discovery panels and same-modal unique-gear sale confirmation with safe initial cancel focus. Character equipment names project fixed or procedural slot without adding slots. Supplies remains the default. Missing/empty gear directs to real forest activity; closed shop/active battle and equipped-item conditions disable relevant actions. Engine API integration remains pending worker source freeze and runtime checks.

Projection public seam RED: missing module, preserved runner output. GREEN:2tests PASS. Snapshot isolation, stale-page clamping, filtering, owner exclusion, inventory preservation and actual fixed/procedural slot comparison verified. Full Phase2 regression/build/Browser are NOT yet run; UI must not be marked accepted. Static searches found no native dialogs in changed UI.
