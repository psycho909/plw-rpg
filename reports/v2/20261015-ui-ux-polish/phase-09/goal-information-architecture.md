# Phase9-B — Goal & Information Architecture

## Outcome

This implementation adds a small, state-driven “此刻可留意” section to the existing Traveler Notes window and progressive battle-preparation details to existing high-rank encounter rows. It is an engineering information projection, not a claim that players understand or prefer these suggestions; Human Product remains deferred.

## Before / after evidence

| View | Before | After |
|---|---|---|
| Traveler Notes | Static general directions and wait/party information; no world-state-specific action suggestions. Reference: [A1 Notes-window screenshot](a-runner/attempt-20261015T085040840Z-ux-audit/window-4-shot.png). | Fresh save at the village shows the intended empty state: [empty-state screenshot](b-runner/probe-20261015T093111935Z/traveler-notes-currently-noteworthy.png). After normal travel to the farm, the seasonal pea hint appears with its reason, four expected harvest, and destination: [farm hint screenshot](b-runner/probe-20261015T093111935Z/traveler-notes-farmland-hints.png). Its button was elementFromPoint-verified and activated; [destination result screenshot](b-runner/probe-20261015T093111935Z/hint-destination-activated.png). |
| Forest high-rank preparation | Rank/eligibility, wolf reward expectation and next goal were visible, but no factual level comparison or expandable mechanics/retreat/cooldown summary. Reference: [A1 forest Boss preparation](a-runner/attempt-20261015T082613437Z-ux-audit/forest-adventure-boss-preparation.png). | Probe captured each of the 16 displayed high-rank details expanded by keyboard and click, with visible text in [probe-results.json](b-runner/probe-20261015T093111935Z/probe-results.json) and screenshots in [the retained attempt](b-runner/probe-20261015T093111935Z/). The Chief-specific row was absent because the fresh save did not have a live Chief. |

Probe evidence is from the production `dist` after Lead's rebuild, using system Chrome CDP and a new save. It followed visible map and interaction controls; it did not inject or alter game state. The probe records click targets through `elementFromPoint`, writes output to a new timestamped directory, records the Chrome profile size, then removes only that attempt's profile. The initial notes state was empty; traveling to the farm made the conditional crop hint eligible. With Lead's PixelWindow focus-trap fix, native Tab reached all 16 summaries inside the modal, Shift+Tab wrapped from the first control to the last, and Tab wrapped back. Enter (CDP keyDown with key/code/text plus char) and Space each opened and closed every detail; both keyboard-expanded and independently click-expanded states were captured.

## B finding: modal focus trap omitted summary controls

The first focused probe temporarily assigned `tabIndex=0`, which masked that the production focus trap's selector omitted `<summary>` elements. Lead identified and fixed the source defect in `src/components/PixelWindow.vue:11` by adding `details > summary` to the trap selector, then rebuilt `dist`. The final probe does not inject `tabIndex`; it verifies native Tab traversal and boundary wrap inside the modal. This is a B accessibility finding and fix, not a gameplay rule change.

## Data source for each hint and preparation line

### Traveler Notes hints

| Hint | Condition / reason source | Destination source |
|---|---|---|
| Open request | `state.life.requests`: status `open`, expiry after `worldTime`, exact amount/progress; same WorldRequest fields surfaced in `LifeNewsWindow.vue`. | Existing request route behavior: living target NPC position for medicine, forest workplace for unfinished hunt, village square for delivery. |
| Regional crisis | Existing `regionalCrisis.phase` is `warning`, `preparation` or `active`; text names that phase and does not calculate readiness or change crisis rules. | Existing forest encounter location. |
| Seasonal crop | `farmCropChoices(state)` supplies current-season and region eligibility; `CONFIG.maxPlots`, `state.crops` and `preparedPlots` gate whether another crop can fit. Harvest amount comes from the canonical choice projection. | `BUILDINGS.farm.position`. |
| Authored high-rank encounter | `contentEncounterOptions(state)` must return an eligible non-normal target; no eligibility rule is duplicated. | Current region's existing location from `JOBS`, `BUILDINGS` or `DUNGEON`. |
| Wolf King | `wolfEncounterOptions(state)` must mark the Boss eligible; stamina cost reads `WOLF_ENCOUNTER_RULES.staminaCost`. | Existing forest/woodcutter location. |
| Goblin Chief | `state.threat.bossAlive` and `MONSTERS.chief.level`; no threat thresholds are recomputed. | Existing forest location. |

Candidates are read-only, condition-based and capped at five. Open requests are capped to the latest two so that they cannot take over the Notes window. The section has an empty state when no condition applies. It creates no Quest, checkbox, completion tracking, daily task, or fixed target list.

### Boss / high-rank details

| Display line | Source and disclosure rule |
|---|---|
| Rank, eligibility and reason | Existing `wolfEncounterOptions` / `contentEncounterOptions` row data. The Goblin Chief button remains gated by `state.threat.bossAlive`. |
| Monster / player level | Authored `WOLF_MONSTERS`, `CONTENT_MONSTERS`, or `MONSTERS.chief` level compared with active character level. No danger score or recommended level is invented. |
| Content mechanics | Shown only after the definition ID appears in the persistent seen/defeated/Boss collection. Text comes from registered `CONTENT_MONSTERS` combat mechanic telegraphs; otherwise “情報不足：尚未遭遇”。 |
| Wolf mechanics | Shown only after collection discovery. Active encounter details use `wolfCombatPresentation`; outside combat the UI names only fixed core behavior from `WOLF_MONSTERS` / the wolf combat implementation. The collection does not persist past random traits, so the UI says they are not retained rather than claiming a known trait. |
| Loot | Wolf keeps existing `wolfRewardExpectation`. Content loot names come from registered loot tables and are shown only when `contentKnowledgeCatalog` confirms the discovered monster as a source. Goblin Chief uses its existing generic `MONSTERS.chief.loot` reward. |
| Retreat | `resolveCombatTurn(..., 'run')` ends combat, returns status to idle, advances world time through simulation, and grants no XP or loot. UI describes the time cost and effects without repeating the engine's literal minute count, because no shared exported retreat-duration constant exists and this Ticket forbids engine-rule edits. |
| Boss cooldown | Wolf uses `WOLF_ENCOUNTER_RULES.bossCooldownDays`; authored content uses `bossRules.cooldownDays`. Goblin Chief has no separate cooldown; it returns through existing world threat progression. |

## Spec §4 and scope compliance

- **World First:** features stay in existing Notes and encounter windows, with a travel action to the named place; no new route or modal.
- **Progressive disclosure:** high-rank rows retain their compact name/rank/status and reveal details with native `<details>/<summary>` keyboard behavior.
- **No hidden rule / fabricated metric:** comparisons use actual registered levels; eligibility and reasons remain canonical; no danger number or recommended level.
- **Discovery respects collection:** content mechanics/loot remain hidden before discovery; wolf random traits absent from persistent state are not represented as known.
- **Minimal scope:** no engine rules, config numbers, save schema, balance formula, Quest system, or large framework changed. Phase8 V0 / Farming V4 decisions are untouched.

## Verification

- `npx.cmd vitest run src/presentation/goalHints.test.ts` — **10/10 PASS**.
- `node scripts/phase9/b-probe.mjs` — **PASS**, retained post-fix attempt [`probe-20261015T093111935Z`](b-runner/probe-20261015T093111935Z/); 16/16 available detail rows expanded and text-recorded, native focus traversal/cycling verified, empty and populated Notes states captured, and one hint destination activated.
- `npm.cmd run build` was run by Lead before this probe (per dispatch context); this agent did not rerun it or `npm.cmd run check`.
- No human comprehension, fun, or retention claim is made.
