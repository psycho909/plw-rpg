# Phase 5 browser QA driver plan

Status: preparation only. No production build or browser run is claimed. The UI and public C transaction contract must be released and frozen before any driver starts.

## Release order and evidence

1. **C normal fresh-save pilot** proves that ordinary UI progression can acquire wood ×3 and stone ×2, enter the existing store workbench during its rendered service hours, preview and make the starter spear, inspect and equip the resulting instance, then save and reload it. The run starts from an empty isolated browser context and the normal opening screen. It never writes game storage directly. It records the pre-craft and post-craft inventory, gold, stamina, world time, RNG state, event count, instance/provenance, equipped item and reload equality as read-only observations.
2. **Integrated browser stress, 20–30 real minutes** starts a separate fresh save. Exercise workbench preview/craft, legal wood/stone gathering, inventory inspection and equipment, shop, legal combat, modal open/close, save/reload and Smithing progression as the released surface permits. Do not invent repetitions to satisfy a count; track action count, failures and blocked actions. Checkpoint every 60 seconds and capture heap, DOM counters, origin storage, save bytes/latency and a bounded UI-response sample. Use append-only operation JSONL; publish only compact checkpoints and the final summary.
3. **Life Agent, 30–60 real minutes** starts another fresh save. The policy observes visible goals, recipe/skill/access reasons, materials, cost and recent outcomes, then chooses ordinary gather, craft, inventory, shop, rest or navigation actions through visible controls. It records concise decision, progress and frustration/drought notes rather than full DOM snapshots. The agent may stop or change its focus using a separate control file. This remains agent-driven QA, not human product validation.
4. **Hybrid normal loop** is a separate fresh-save run after the needed material-influence recipe and combat integration are released (Phase H). Follow wolf/boss encounters through normal UI, obtain the actual material, return to the eligible workbench, craft a targeted item, inspect/equip it, save/reload, then return to combat and compare the actual encounter outcome with the pre-equip baseline. No injected rewards, clock, gold, inventory or combat state.

## Shared driver contract

- Each run requires an explicit `--go`; preparation/import is inert. A unique run directory is created with `exist_ok=False`.
- Before browser startup, record exact HEAD, recursively hashed production source paths (including untracked non-ignored source), harness/helper hashes, build-status hash and the production asset set. Require successful build status whose complete source manifest equals the current manifest. Serve only the resulting `dist/` on loopback. Compare HTTP index and every referenced JS/CSS asset byte-for-byte and by SHA-256 with `dist/` and the build evidence. Recompute all manifests after the run and fail on drift.
- Use Playwright with the repository's existing Chromium. Listen for page errors, console errors, unhandled rejections and local-storage write failures from before navigation. Any such error blocks a clean PASS. Read the active save only for observation. Every mutation goes through visible UI actions and native save/reload.
- Route via the rendered map and direction controls. Never set `localStorage`, call production store actions from page evaluation, alter state/time/gold, skip waits or build controlled riches. Keep explicitly controlled fixture work in a separate report/run class.
- Query accessible names or agreed stable `data-*` selectors from the UI owner. Do not retain locators across modal close, navigation or reload; read needed visible text before closing, then reacquire. Match material IDs/names exactly; do not use substring selectors that conflate similar labels.
- Append every meaningful action/result/failure to a run-unique JSONL with flush/fsync. Write compact snapshots at 60-second intervals and one final projection through `scripts.recorded_reports.write_recorded`. Preserve each failed attempt's unique raw artifact; never overwrite or relabel a failure as a pass.
- Log real elapsed duration and operation time. For stress runs, keep UI-response timing bounded and report distribution/sample limits. Track heap/DOM counters, storage use, save latency, save bytes, world time, events, NPC count, inventory/instance count, errors and reload count.
- Final PASS requires zero browser/console/unhandled/storage errors, intended native save/reload invariants, stable source/build/harness/helper fingerprints, and the duration minimum. A readiness/build/provenance failure is a failed/blocked attempt, not a product pass.

## Current C facts used by the pilot

- Core's upcoming public transaction: `CraftRequest { recipeId: CraftRecipeId }`; `planCraft` is a pure allowed/denied preview; `craft` returns a typed success with `instanceId`, `recipeId`, `baseId` or a typed failure. The callback is supplied once through `game.act<T>(action, options?)`; UI owns the result bridge. Caller does not provide generated provenance.
- Initial recipe: starter spear, wood ×3 and stone ×2, service fee 4 gold, stamina 10, 45 game minutes, Smithing Lv.1. Material influence is not in C. Check exact canonical IDs and inventory ownership from released public data; the runner must not infer or clone transaction state.
- Agreed C semantic hooks: the exact `工作台` heading, `木石長矛` recipe button, `製作木石長矛` submit, `[data-craft-result]` result, `檢視裝備` focus bridge, and `[data-instance-id="..."]` inventory row. The product base is `spear` / `獵矛`, distinct from the recipe label. Existing detail uses `穿戴獵獲裝備`; save uses `.save-button` / `存檔`.
- Existing noncombat gather UI yields wood or stone through forest/mine, each at a cost of 10 stamina and 4 gold earned. The ordinary fresh character starts with 45 gold. Collect only what is needed, through visible actions.
- Workbench access is defined as 08:00–18:00 in the accepted slice decision; this is a workbench-service window. The existing store currently renders 08:00–20:00. Test the workbench's own rendered status and planner result, rather than assuming the shop's hours apply.
- Current world map labels/tiles and building coordinates can change with source. Prefer semantic world navigation and visible enabled controls; treat save values as read-only evidence, not action inputs.

## Pending release dependencies

- Frozen accessible selectors/labels for workbench opener, recipe row, planner preview, disabled reason, craft submission, result instance, inventory focus/detail/equip, and any provenance display.
- B migration/full-check and independent core review accepted; C implementation and UI integration released; build-status generated from that exact source tree.
- For Hybrid: released material-bias recipe and H's real outcome comparison route.

The C source tree is currently being completed and has not been frozen for this harness. Until source freeze, matching build status, and Root's explicit runtime release, the driver is a preparation artifact and must not be run. Stress, Life Agent, and Hybrid execution remain deferred until their corresponding recipes/features and later release gates exist.
