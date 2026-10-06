# Life Route — Final Agent Exploratory Playtest

Status: **60-minute minimum met after conservative interval review**. This is an Agent exploratory playtest, not human feedback or Product Gate approval. Runner status was completed under its raw 3,900-second stopwatch; root review corrects the effective-time claim below.

## Source, runtime, and time

- Frozen source SHA: 441e3c2b435f199a50cb78ee5b19521bcc084593.
- Frozen manifest: [build-manifest.json](build-manifest.json). index.html, assets/index-CEjw7W01.css, and assets/index-DJZsen7F.js hashes matched the manifest at preflight and were fetched/rechecked after the final snapshot; all matched.
- URL: http://127.0.0.1:5197/; Chromium 151.0.7922.173; CDP 9259; single app page; fresh persistent profile /tmp/oakvale-v2-life-final-seed-909.
- World: normal UI-created seed 909, Spring 1 08:00, age 16, 45g, food 3, potions 2, no property. No save/state/time/resource injection.
- UI “起身” start: 2026-10-05T13:53:57.146Z. Last direct observed snapshot: 2026-10-05T14:59:31.002Z, runner elapsed 3933.86s (timestamp difference 3933.856s). Shutdown/update: 14:59:51.893Z, raw elapsed 3954.75s; time after the last direct snapshot is not credited.
- Artifacts: [results.json](life-final/results.json), [playlog.jsonl](life-final/playlog.jsonl), adjacent checkpoint PNGs; 17 observations and 124 actions.

### Conservative active-time correction

An earlier note claimed 3909.75s valid time by subtracting a small per-error allowance from runner shutdown time. That claim is superseded: it used the later shutdown endpoint and did not exclude the full periods around errors. Root review uses the last direct snapshot, unions each period from the last successful action before a driver error through the next successful action, counts the two overlapping speed-control failures once, and does not charge the asynchronous console 404 separately.

| Driver error | Exclusion start: prior successful action (UTC) | Exclusion end: next successful action (UTC) | Excluded seconds | Basis |
|---|---|---|---:|---|
| status screenshot timeout | 13:54:53.466 map travel to forest | 13:55:17.135 opened Ada 3 profile | 23.669 | Full surrounding unverified interval |
| Two speed ×20 click timeouts | 13:58:19.637 opened farmland panel | 13:59:14.278 closed field panel | 54.641 | Shared interval, counted once |
| status screenshot timeout | 14:04:11.213 clicked woodcutting | 14:05:01.576 next deliberate decision | 50.363 | Full surrounding unverified interval |
| Pause click timeout during save/reload | 14:05:59.684 recorded return/rest/reload decision | 14:06:14.117 next visible UI action | 14.433 | Full surrounding unverified interval |
| Detached nearby trigger | 14:45:55.211 traveled to farmland | 14:47:18.165 next farming decision | 82.954 | Locator unstable during NPC schedule update |
| Ambiguous Traveler’s Notes locator | 14:49:03.646 recorded ordinary one-day-wait plan | 14:50:06.568 decision after reading Notes | 62.922 | Full surrounding unverified interval |
| Pause click timeout during save/reload | 14:53:19.813 harvested ripe plot | 14:53:55.045 closed field panel | 35.232 | Full surrounding unverified interval |
| **Union total** |  |  | **324.214** | Speed errors share a single interval |

Calculation: 3933.856s at the last direct checkpoint − 324.214s = **3609.642s** (60m 9.642s), exceeding the 3600-second minimum by 9.642s. This strict review does **not** establish 3900 valid seconds. Eight driver errors are harness/locator/screenshot failures, not confirmed product defects. One asynchronous console 404 is retained and not charged separately; page errors: zero.

## Reward, goal, choice, and information timeline

Elapsed labels use the runner clock; excluded intervals above do not count as play. Goals followed the current world rather than a fixed action policy.

| Approx. elapsed | Motivation, choice, and new information | Reward and retention signal |
|---|---|---|
| 0–10m | Chose a stable-life goal and inspected map, identity and property options. With 45g against the 80g home threshold, chose low-capital work over spending starting food. | UI woodcutting paid 2 wood + 4g for 10 stamina. Immediate reward made a home a concrete medium goal. |
| 10–20m | Worked until stamina fell, returned for free rest, then shifted between timber and public farmland after learning crops did not require owned land. | Bought the 80g home; storage and free overnight rest had visible value. Planted wheat as a delayed goal. |
| 20–30m | Harvested, retained food rather than liquidating all supplies, checked shop hours/prices and sold small amounts. | Harvest yielded 5–8 food and +1 reputation; farming skill advanced. One-item sales were clear but repetitive. |
| 30–40m | Continued farming to test identity. Avoided forest work after threat rose, read NPC schedules/concerns, and favored local food production. | At farming action 10, normal UI awarded farmer identity/milestone. Harvests raised reputation; newcomer Aida 33 valued safe, stable days. |
| 40–50m | Rested when tired; followed crop maturity; inspected village tavern/blacksmith. Declined a 25g companion contract while holding 11g and stayed with local work. | Population growth advanced Oakvale to village, unlocking tavern/blacksmith. Forest reached threat Lv.2; road/caravan trouble affected safety and supply. |
| 50–60m | Continued wheat cycles, preserved food, read Traveler’s Notes and chose its normal one-day wait to mature crops; harvested two ready plots and rechecked ownership. | Farmer identity persisted; 22 farming actions, rep6, food39, owned home, village stage. Land still required 140g + rep10. |
| Final direct observation (~65m34 raw) | Read village, journal and Mira profile after ordinary UI save/reload. Kept supplies and did not hire or enter the threatened forest. | Mira recognized the farming, but still showed “還不熟” and no shared memory. Time beyond this directly observed snapshot is not credited. |

Immediate rewards included work pay, crop yields, skill/character levels, reputation and contextual dialogue. Short goals were harvest/stamina/food; medium goals were home and farmer identity; long goal was farmland then a farm business. Final state: 11g, 47 food, 20 wood, 23 farming actions, reputation 7, resident+farmer identities, one home, village population 39/60, food/prosperity 100 and safety 93. Farmland remained gated at 140g and rep10; farm enterprise further required owned land, 220g and rep25. This left an untested long economic runway and repeated farming as the clearest safe noncombat loop: exploratory retention concerns, not confirmed bugs.

## Featured NPC evidence

Structured details are from the initial JSON observation at 13:53:58.561Z and final direct observation at 14:59:31.002Z. Those observations include age, job, career/careerJob, traits, concern, memories and milestones. Familiarity is reported only for directly captured UI profiles; otherwise it is marked not individually re-read.

| ID / name | Initial → later age, job, career | Traits | Concern change | Familiarity / memory evidence |
|---|---|---|---|---|
| npc-1 Mira 1 | 18 farmer resident → 18 farmer worker | brave, ambitious, hardworking, solitary | stable life → focus on farmer work | Early and final UI profile: “還不熟”, no shared memories. Final dialogue praised player as reliable farmer. Stored memories empty. |
| npc-2 Ron 2 | 20 miner resident → 20 miner worker | brave, ambitious, wanderer, solitary | stable life → focus on mining work | Initial/final snapshots show memories empty; familiarity not individually re-read. |
| npc-3 Ada 3 | 22 woodcutter resident → 22 woodcutter worker | brave, ambitious, hardworking, solitary | stable life → focus on woodcutting work | Early profile and after conversation: “還不熟”, no shared memory. Said she was still finding what she was good at. Stored memories empty. |
| npc-4 Finn 4 | 24 blacksmith resident → 24 blacksmith worker | brave, ambitious, hardworking, solitary | stable life → focus on blacksmith work | Initial/final snapshots show memories empty; familiarity not individually re-read. |
| npc-5 Nora 5 | 26 shopkeeper resident → 26 shopkeeper worker | brave, ambitious, wanderer, solitary | stable life → focus on shopkeeper work | UI profile: “還不熟”, no shared memories. Concern/dialogue centered on shop work. Stored memories empty. |
| npc-6 Hugo 6 | 28 guard resident → 28 guard worker | brave, ambitious, wanderer, solitary | stable life → watch settlement surroundings | Initial/final snapshots show memories empty; profile was seen while asleep, familiarity not later re-read. |

All six retained their starting age/job and advanced from resident to worker. Aida 33 moved in as shopkeeper and voiced a safety/stability concern; Hugo 36 moved in as farmer; population later reached 39. Exact structured evidence is in the referenced initial/final observations.

## Save/reload, bugs, and product findings

- Normal UI save/reload preserved seed, character, property and RNG. The report records worldTimeUnchangedWhileReloadPaused=false because the first post-load observation advanced; this does not prove data loss. Root’s separate pre-app exact-checkpoint test is distinct evidence.
- Driver errors were two screenshot timeouts, two speed clicks blocked by a modal, two pause clicks blocked during save/reload, one detached nearby trigger during NPC schedule change, and one ambiguous Notes locator. Their entire surrounding intervals are excluded above. These are harness-operation failures; none confirms a product bug. The console 404 is retained; page errors were zero.
- Product findings, unconfirmed: land/business gates remained distant relative to observed earnings; repeated farming dominated safe noncombat progression; NPC dialogue recognition did not create stored familiarity/shared memory; forest/road threats affected settlement stats but this route did not resolve them. No redesign is asserted.
- Agent observations are not human validation. Human Fun Gate remains **PENDING**; V2 Product Gate remains **NOT YET APPROVED**.
