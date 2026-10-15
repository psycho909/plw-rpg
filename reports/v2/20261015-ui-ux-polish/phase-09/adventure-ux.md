# Phase9-B Adventure UX — Boss Preparation

## Before / after

The A1 normal fresh-save forest panel showed Boss rank, eligibility/reason, wolf reward expectation and next adventure goal. It did not provide a factual player-versus-monster level comparison or an expandable summary of discovered mechanics, retreat effects and cooldown. Baseline image: [forest-adventure-boss-preparation.png](a-runner/attempt-20261015T082613437Z-ux-audit/forest-adventure-boss-preparation.png).

After this change, the original encounter rows remain the primary controls. Elite, MiniBoss and Boss rows expose native expandable details; the ordinary Goblin Chief panel also has an expandable detail when the Chief is present. The fresh-save probe captured all 16 high-rank details visible in the forest: three wolf rows and 13 authored-content rows. Goblin Chief was not present on this fresh save, so its conditional detail was not observed. Text for every opened row and both interactions is recorded in [probe-results.json](b-runner/probe-20261015T093111935Z/probe-results.json).

For each row, the final probe navigated with native Tab inside the modal, then toggled open and closed with Space and Enter before capturing the expanded state; it then collapsed and reopened the same row with elementFromPoint-verified clicks. The Enter keyDown includes `key`, `code`, `text`, and `unmodifiedText`, followed by the matching `char` and keyUp events. Both keys opened and closed all 16 rows. The probe did not inject `tabIndex`. Each link below is the keyboard-expanded screenshot; pair it with the correspondingly named `*-click-expanded.png` in the same directory.

## B finding: modal focus trap omitted summary controls

The first focused probe temporarily assigned `tabIndex=0`, masking that the production modal focus trap omitted `<summary>` from its focusable selector. Lead identified the defect and fixed `src/components/PixelWindow.vue:11` by adding `details > summary`, then rebuilt `dist`. The final attempt [`probe-20261015T093111935Z`](b-runner/probe-20261015T093111935Z/) contains no such injection: native Tab reached all summaries, Shift+Tab from the first modal control wrapped to the final control, and Tab wrapped back to the first. All focus remained inside the modal. Earlier attempts remain retained as historical evidence.

| Row | Keyboard-expanded screenshot | Click-expanded screenshot |
|---|---|---|
| Wolf `alphaWolf` · Elite | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-0-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-0-click-expanded.png) |
| Wolf `packLeader` · MiniBoss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-1-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-1-click-expanded.png) |
| Wolf `wolfKing` · Boss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-2-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-2-click-expanded.png) |
| `slime_cinder` · Elite | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-3-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-3-click-expanded.png) |
| `slime_matriarch` · MiniBoss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-4-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-4-click-expanded.png) |
| `slime_tidecaller` · MiniBoss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-5-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-5-click-expanded.png) |
| `slime_heart` · Boss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-6-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-6-click-expanded.png) |
| `wild_beast_bristleback` · Elite | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-7-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-7-click-expanded.png) |
| `wild_beast_galehorn` · Elite | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-8-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-8-click-expanded.png) |
| `wild_beast_old_matriarch` · MiniBoss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-9-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-9-click-expanded.png) |
| `wild_beast_apex` · Boss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-10-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-10-click-expanded.png) |
| `frontier_goblin_duelist` · Elite | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-11-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-11-click-expanded.png) |
| `frontier_goblin_standardbearer` · MiniBoss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-12-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-12-click-expanded.png) |
| `frontier_goblin_warlord` · Boss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-13-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-13-click-expanded.png) |
| `fog_undead_wight` · Elite | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-14-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-14-click-expanded.png) |
| `fog_undead_hollow_bell` · MiniBoss | [keyboard](b-runner/probe-20261015T093111935Z/data-b-probe-index-15-keyboard-expanded.png) | [click](b-runner/probe-20261015T093111935Z/data-b-probe-index-15-click-expanded.png) |

## Information shown and source

- **Name / rank / eligible state / blocker:** existing `wolfEncounterOptions` and `contentEncounterOptions` projections, plus the existing `state.threat.bossAlive` Chief gate.
- **Level comparison:** actual monster level from `WOLF_MONSTERS`, `CONTENT_MONSTERS`, or `MONSTERS.chief`, beside the active character's current level. This is not an estimate of danger or a recommendation.
- **Known mechanics:** content telegraphs are disclosed after the monster ID is in the seen/defeated/Boss collection. Wolf details use active encounter `wolfCombatPresentation`; without a current snapshot they expose only fixed core behavior and disclose that random traits are not retained in collection.
- **Known loot:** wolf rows preserve `wolfRewardExpectation`. Authored content loot is named only through registered loot tables whose source is confirmed by `contentKnowledgeCatalog`; Chief material follows its current `MONSTERS.chief.loot` reward.
- **Retreat:** the current `run` action ends combat, advances world time, and grants neither XP nor loot (`src/engine/actions.ts`, `resolveCombatTurn`). Since duration is an unexported literal and engine rules are outside this sub-ticket, UI states the time/effect without duplicating a numeric duration.
- **Cooldown:** wolf Boss duration is read from `WOLF_ENCOUNTER_RULES.bossCooldownDays`; authored content Boss duration is read from `bossRules.cooldownDays`. The Chief has no independent cooldown; it returns through existing threat progression.

## Deliberately absent

No danger score, recommended level, combat-power system, unobserved random trait, undiscovered content loot, new Boss rule, or encounter balance change was introduced. Phase8 controlled difficulty evidence remains separate from ordinary route experience; this interface change does not claim human players understand the information.
