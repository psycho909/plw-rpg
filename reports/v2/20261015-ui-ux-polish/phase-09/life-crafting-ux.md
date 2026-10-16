# Phase9-C — Life and Crafting Interaction Findings

## Material discovery and recipe linkage

The A1 baseline showed one generic `怪物素材` in the ordinary inventory tab after a monster win, while the recipe area separately described required material counts. The baseline therefore established a label and information-architecture gap; it did not establish that players could not complete the flow. Before reference: [A1 adventure loot and inventory](a-runner/attempt-20261015T085040840Z-ux-audit/adventure-loot-comparison.png) and [A1 workbench blockers](a-runner/attempt-20261015T084824269Z-ux-audit/craft-cap-advanced-recipe-blockers.png).

`wolfFang`, `wolfHide`, and `moonStone` are legacy wolf-family materials. Their `MATERIALS` descriptions and old recipes identify them as saleable influence materials; they are not recipe input requirements. Authored content materials such as `slime_resin` are separate IDs registered in `CONTENT_MATERIALS`; recipes refer to these IDs as inputs. The shared `contentKnowledgeCatalog` already projects recipe uses from `CRAFTING_RECIPES` and state-aware source names from the existing loot/region graph. Inventory only lists collected or held material IDs, and the knowledge projection keeps undiscovered source regions generic.

The inventory now labels collected wolf-family materials separately from authored region-registered materials, using registry ownership as the source. The generic `material` item in the ordinary supplies list now explains that it is a general monster drop and points to the Materials & Harvest tab for recipe materials and crop goods. This adds no collection store or duplicate recipe/source rules.

## Missing-material workbench context

The selected recipe plan remains the owner of requirements, held counts, costs, eligibility, and XP feedback. Existing workbench rows call the same `contentKnowledgeCatalog` for missing material inputs and show source/eligibility context inline; undiscovered areas remain a generic hint. No legality, cost, or progression values changed.

## After evidence

The focused controlled-save probe checks the A1 concern with a legacy wolf material and a registered slime material visible together, opens a recipe with a missing registered input, and records its known source text. It also checks a successful starter spear craft's existing **檢視裝備** action opens Inventory focused on the new item for comparison. The probe uses the production `dist/` build and stores an engine-generated controlled checkpoint with its setup manifest. Evidence path: [`c-runner/attempt-20261016T003828476Z/probe-results.json`](c-runner/attempt-20261016T003828476Z/probe-results.json); see the C summary for verification and retained failed-attempt history.

## Scope decisions

- Compare/equip/sell paths after crafting were already present: the success status offers **檢視裝備**, `App.vue` opens Inventory with `focusInstanceId`, and the existing comparison view provides equip and sale controls. No extra window link or duplicate action was added.
- Existing crafting practice feedback already states the selected plan's XP award and cap/graduation status. No new XP formula or engine behavior was needed for this baseline finding.
- This is an information-architecture observation, not evidence of human comprehension or a product outcome.

## C after-evidence update

The pending reference above is superseded. Latest controlled production-dist evidence is [`c-runner/attempt-20261016T003828476Z/probe-results.json`](c-runner/attempt-20261016T003828476Z/probe-results.json): missing registered-input source in the workbench; collected wolf, registered-material and harvest origins alongside the generic monster supply item; and the successful craft action opening Inventory focused on `item-1` with comparison details. This controlled starting-save lane is separate from the A1 fresh-save route and does not measure human comprehension.
