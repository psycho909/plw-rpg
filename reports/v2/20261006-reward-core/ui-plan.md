# Reward Core UI Plan (pre-implementation)

Authority: Phase2/3 tickets and V2.x §77. Register: existing product game; zh-TW, no Japan-market scope. This records intended behavior, not completed UI QA.

Canonical sources are root DESIGN.md pointer → docs/design/DESIGN.md, docs/UI.md, src/style.scss tokens. PixelWindow owns overlays/focus/scroll; PixelMeter owns meters; StatusNotice + gameStore.act owns errors/status and persistence. Current property desktop and 390px screenshots from Phase1 browser were inspected: single world-backed monochrome modal, readable content, narrow internal scrolling and fixed modal footer. Existing visual identity is retained. No durable token change is proposed.

Inventory remains the owning list/detail workflow. Native aria-pressed category/filter buttons follow existing controls. Supplies stays the default so legacy selection/use stays familiar. New gear list is bounded to 20 instances per page; all owned instances remain saved. Selection and page are transient and clamped after changes. Detailed gear shows rarity words, actual stats/affix tier, equipped-slot comparison, and optional provenance. Empty gear gives a real forest goal. The two existing physical equipment slots are shared by fixed and procedural gear; no extra slots or double bonus.

Success equip/sale remains in inventory, emits existing shared status and autosaves. Failure stays in the same selection with engine reason. Material sale is available at the existing open store, preserving actual distance/hour rules. No browser dialogs, duplicate primitive, fixed dashboard, external font/dependency, or color-only rarity. Character sheet resolves names from the same equipped refs. Phase3 existing AdventureWindow shows real trait/variant rhythm and actionable next-turn cues rather than only different HP.

Verification required after actual source freeze: tests/typecheck/build; real fresh production Chromium equipment loop; keyboard/Escape/focus restoration, empty/blocked states, 390px/reduced-motion, existing V2 regression, repeated modal/gear profiling, premium strict static audit. No formatter/linter/Storybook entry exists in this repository. Agent/runtime verification does not prove human fun; Human Gate is DEFERRED / NOT APPLICABLE AT THIS STAGE.

Current-stage policy: human validation is deferred during this development slice and does not block engineering QA. Earlier historical Human-PENDING records describe the prior product-test stage; no human answer or product approval is fabricated.
