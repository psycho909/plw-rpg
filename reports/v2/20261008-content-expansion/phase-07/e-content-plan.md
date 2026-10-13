# Phase7-E — Root implementation plan

Prepared while D verification runs; implementation is not released until the E ticket records D acceptance. Authority: approved Phase7 plan (66 monsters / 107 items / 24 recipes / 12 crops) and `remaining-family-plan.md`. Existing generic encounter, frozen variant/cooldown, single loot generator and bounded world consequence are reused. No new combat/status language or crisis system.

## Remaining-family Boss scope

Wild Beasts, Frontier Goblins, Fog Undead and Mine Constructs each add exactly their two planned Mini Bosses and one planned Boss. Use their approved fixed cores, three additive variants, boss-only eighth material, one exclusive eighth-budget equipment base, bounded cooldown and small safety/prosperity/food consequence. Preserve actual D IDs and useful consumers. Rare boss material is an optional compatible crafting bias, never a routine recipe prerequisite. Every output has actual selected loot source. Adjust only finite thresholds/stats/telegraph details within existing schema; no fixed-year schedule.

## Cave Insects E slice

| ID | Rank | Combat identity | Reward/source and world role |
| --- | --- | --- | --- |
| `cave_insect_broodguard` | miniBoss | guard plus self-only rally | Mine optional guard target, level7+/threat2+, plate/core-biased selected loot; no ally summoning |
| `cave_insect_tunnelstalker` | miniBoss | rush plus chargedAttack, no heal | Mine evening target, level7+/threat2+, leg/gland-biased selected loot; no stealth/status effect |
| `cave_insect_queen` | boss | Fixed guard plus heavyStrike; no heal | Mine level8+/threat3 OR level10+ with bounded hours/season and no threat3 requirement; family gate still applies. Boss-only `cave_insect_queen_core`, exclusive armor `cave_insect_queen_carapace`; cooldown42days; defeat safety+2 |

Queen variants preserve both core mechanics and add exactly one implemented mechanic: `cave_insect_queen_plateback` rally, `cave_insect_queen_razor` rush, `cave_insect_queen_resin` chargedAttack. Names/telegraphs describe only their modeled effects. The eighth material has useful compatible piercing/blocking bias and can be consumed optionally by current spear recipe; F supplies the remaining planned armor recipes. Exclusive carapace uses existing armor slot/affixes; do not add poison resistance or hidden damage rules.

## Slime E refinement

Preserve all 11 accepted IDs, stat/mechanic/loot identity and existing forms. Add the planned higher-level same-region alternate boss predicate so the existing Slime Heart is not exclusively tied to threat3; respect family's finite level cap and current discovery. No duplicate definition counting and no new Slime quota.

## Verification and ownership

Low authors isolated two-family groups after Root release. Medium tests public boss encounter→telegraph→flee/save/reload frozen form→defeat guaranteed/exclusive loot→bounded consequence→cooldown→expiry across all six bosses, plus mini classification/reachability; any actual core save/RNG bug routes Max. One serialized QA runner captures each pack and merged catalog with exact generation/source evidence. Independent review checks final data plus integration. Stage acceptance requires actual tests, not this plan. Natural encounter frequency remains J/K observation rather than controlled-witness claims.
