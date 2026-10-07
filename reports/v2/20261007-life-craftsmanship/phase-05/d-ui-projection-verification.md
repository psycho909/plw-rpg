# Phase 5-D UI projection verification

Status: focused projection checks, strict UI audit, and production build passed; browser workflow is assigned to the separate D browser QA driver.

## Scope

The UI projects only the starter recipe registry allowlist, neutral selection by default, the engine plan's selected one-unit material input/current count, and the plan's station hours. Direction copy reads current material affix weights and the existing legendary-weapon special chance. It states that material influence does not change rarity odds and makes the Moonstone special roll conditional on a Legendary weapon. The sole starter recipe is presented as a label rather than a no-op selection button; material choices remain the actual native button group.

## Verification

- `npm test -- src/presentation/craftingProjection.test.ts` — PASS, 4 tests. Covers neutral default and allowlist, Wolf Fang input/weights, Moonstone conditional 10% → 25% special chance with unchanged rarity odds, missing-material denial/count, and projection purity.
- `npm run build` — PASS; `vue-tsc --noEmit` passed and Vite built 81 modules.
- `python /tmp/frontend-design-premium/scripts/audit_project.py /workspace/plw-rpg --mode strict --no-write` — PASS, zero findings.
- `git diff --check` on the UI-owned source/docs files — PASS.
- No pre-implementation UI RED run was captured. The existing `d-red-influence-preview.txt` is engine planner RED evidence and is not represented as a UI RED run.
- A full D browser workflow has not been run by this UI owner; the separate browser QA driver will cover material selection, denial, and narrow layout after final source freeze.

No project design tokens or durable visual-system rules changed. The existing monochrome pixel window, native button-group, focus, and scrollbar owners remain in use.
