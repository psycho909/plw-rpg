> Formal timing update: READY FOR FINAL REVIEW. Verified formal credit from segments 02–04 is 4,384.601s, including 3,227.410s from segment 04. Segment 01 receives zero formal credit; its 600s debug reserve is an estimate, so the prior 4,504.145s remains superseded conditional history. Human PENDING; Product NOT YET APPROVED.

# Hybrid Final Source Agent Exploratory Playtest

Status: complete for the Hybrid Agent Exploratory runtime. This is agent play, not human feedback; Human Fun Gate remains `PENDING` and Product Gate is `NOT YET APPROVED`.

The playtest used the frozen build from source `441e3c2b435f199a50cb78ee5b19521bcc084593`, served at `http://127.0.0.1:5197` from `/tmp/oakvale-v2-final-441e3c2-dist`. Its canonical seed-2026 fixture was created by the public `createGame(2026) → serialize` path with untouched defaults (world time 480, 45 gold); this differs from the Life route's native UI seed 909. No resource, time, or state edits were made. All play after fixture setup used visible UI actions. Resumed segments 02, 03, and 04 continued the same persistent profile and saved world through one app tab and one writer. Segment 04 ran 2026-10-05 19:40:50.050–20:40:53.259 UTC; a preceding failed stdin-EOF startup attempt is preserved separately and receives no credit. Served index, JavaScript, and CSS returned HTTP 200 and matched the immutable manifest both at segment starts and in read-only end checks. Seed provenance is recorded in `../seeds/provenance.json`.

## Time accounting

The coordinator's helper, `../review/agent-timing-audit.py`, independently recomputed the following credits from direct observation windows, merged harness-recovery intervals, and the explicit unobserved intervals inside each resumed segment. It does not credit raw elapsed, `priorActiveSeconds`, or `cumulativeActiveSeconds`.

| Segment | Direct observation window | Excluded recovery / unobserved time | Formal credited active observation | Runner status |
| --- | ---: | ---: | ---: | --- |
| 01, `results.json` | 4,678.170 s | 731.216 s recorded recovery; 600 s debug reserve was only an estimate | **0 s (excluded)** | `running` in preserved raw report |
| 02, `resumed-segment-02/results.json` | 932.685 s | 1.169 s harness recovery + 225.461 s explicit unobserved intervals | 706.055 s | `stopped-short` preserved; its old runner gate was 3,600 s |
| 03, `resumed-segment-03/results.json` | 601.068 s | 50.574 s harness recovery + 99.358 s explicit unobserved intervals | 451.136 s | `completed` |
| 04, `resumed-segment-04/attempt-02/results.json` | 3,603.209 s | 241.843 s harness recovery + 133.956 s explicit review gap | 3,227.410 s | `completed`; writer closed normally |
| **Formal total (02–04)** |  |  | **4,384.601 s (73.1 min)** | **3,600 s minimum and 3,000 s segment-04 target met** |

Segment 01's estimated 600-second reserve is not a measured or proven upper bound for external CDP/debug work, so segment 01 receives zero formal credit. The previously circulated 4,504.145-second sum is a superseded conditional estimate and is not the gate basis. The timing helper recomputes harness exclusions from recorded errors and neighboring actions, then merges them with explicit unobserved intervals. It does not count raw elapsed, `priorActiveSeconds`, or `cumulativeActiveSeconds`.

Segment 04 timing source: `runStartedAtUtc` 2026-10-05T19:40:50.050Z through `/observations/92` at 2026-10-05T20:40:53.259Z (3,603.209 seconds). Harness recovery intervals were 19:43:22.530–19:43:54.299Z (31.769 s; disabled sale), 19:46:19.731–19:48:48.701Z (148.970 s; disabled sale), and 20:15:42.314–20:16:43.418Z (61.104 s; broad rest locator timeout). The explicit unobserved review interval was 20:35:09.925–20:37:23.881Z (133.956 s); the world advanced during the gap, so the full interval is excluded. These exclusions do not overlap. `3,603.209 - 241.843 - 133.956 = 3,227.410` seconds. Last direct UI checkpoint was paused at Year 2 Summer 9, 13:36. The script's process-exit raw elapsed (3,712.68 s) is not credited.

The 3h40m wall-clock gap before segment 02 is not credited. Segment 01's final direct checkpoint was Autumn 11, day 11, 14:15 at `worldTime` 101651; segment 02's pre-start saved-state read was 103783, an unobserved increase of 2132 world minutes. Its first UI observation was 103785, two minutes later after a legal startup UI tick. The cause of the unobserved increase is unknown; it is not evidence by itself of offline advancement or a bug. Continuity is supported by the same persistent profile, frozen source/build, seed 2026, active character `alden`, and saved progression; the report schema does not expose a `worldId`, so no explicit ID equality is claimed. Segment 02 starts its credit at 18:58:53 UTC from that resumed checkpoint. A separate early browser preflight failure and restore evidence remain preserved; neither contributes play time.

A second unobserved continuity gap separates segments 03 and 04: segment 03 last directly observed world time 162409 at 2026-10-05T19:26:30.723Z (RNG 3886205941); segment 04 recorded expected resumed world time 164545 and its first UI observation was 164547 at 19:40:50.077Z, with the same recorded RNG value. Thus 2,136 world minutes elapsed before segment 04 and two more by its first observation, across a 14m19.354s wall-clock gap. This span receives no credit. The saved-world time was not unchanged, and these records do not establish why it advanced; they are not proof of offline simulation or a defect. Continuity evidence is the same profile, seed, source/build, actor and preserved recorded RNG value, but no `worldId` equality or gap behavior is asserted.

## Exploration and outcomes

The first run followed goals arising from the world: settle near Oakvale, take available work, grow food, inspect trade and local requests, and respond to nearby threats. Direct checkpoints near each ten-minute mark show progression from a hamlet resident with 45 gold to a village resident, level 4, 64 gold, and reputation 5. Farm work and harvests supplied food and reputation; mining and gathering paid wages; combat yielded XP and gold; NPC careers, births, warnings, and settlement changes continued while the player traveled.

| Approx. active minute | Direct checkpoint and reward / state signal | Next goal chosen from the observed state |
| ---: | --- | --- |
| 10 | `mine-octave` / `second-iron`: level 3, 65–69 gold, reputation 2; work paid 4 gold and mining reached level 2. | Continue accessible paid work and explore the nearby market. |
| 20 | `market`: a blacksmith NPC described balancing work and daily life; resources and gold were still constrained. | Follow the farming/settlement loop and confirm save persistence. |
| 30 | `80m`: home rest restored stamina; life remained resident, reputation 2. | Use the remaining stamina on field and resource goals. |
| 40 | `after-save-reload`: NPC transfers and a birth appeared in the living history; level 3, 73 gold. | Continue normal field work and let the planted crop mature. |
| 50 | `55m`: wheat matured and yielded 6 food; reputation reached 3. | Harvest first, then return to work and combat for funds. |
| 60 | `60m`: level 4, 17 gold, reputation 3; iron work continued. | Respond to the available road/quest threat using current equipment and party state. |
| 70 | `quest-ready`: a slime victory paid 15 XP and 8 gold; reputation was 5 and gold 56. | Review the resulting local state and save before continuing. |

Segment 02 resumed at level 4 with 64 gold, 8 iron, 17 wood, 14 food, and reputation 5. The player reviewed requests/news, hired a tavern companion through UI (25 gold; the contract later expired under accelerated world time), sold four iron through the shop UI for 32 gold, rested at home, revisited Nora's story, and purchased an iron sword through the blacksmith. A disabled sale button after closing time was retained as one raw harness error; it caused no sale and was not retried until the normal shop state allowed transactions. The saved checkpoint ended level 5 with 6 gold and the sword in inventory, unequipped.

Segment 03 equipped that sword through inventory UI and tested the resulting combat: a grey wolf fell in two attacks, with a 26-damage opening hit compared with the unarmed segment-02 wolf's 16 damage per hit. At the mine, the first ordinary slime was defeated for 19 XP, 10 gold, and one material without HP loss. The player left before the next elite stage. Back in town, free home rest restored health/stamina; paid inn lodging cost 8 gold for 8 hours and also fully restored them. Two normal wheat cycles each matured after approximately 48 game hours; harvests yielded 6 and 7 food, farming reached level 3, and reputation rose from 8 to 10. Farm construction's visible requirement remained 140 gold, so it was not purchased at 23 gold. By the paused end checkpoint the player was a resident and farmer, level 5, with 23 gold and 27 food.

The feature mix produced useful reward and retention signals: a visible farm-to-food-to-reputation loop, a weapon purchase that shortened combat, recoveries with distinct free/paid costs, and a world that continued generating NPC transfers, births, warnings, and changing settlement access. NPC-specific dialogue and memories were readable, while two checks correctly showed unavailable interactions (farmer conversation and tavern hiring while disabled). These are observations from an agent run, not a claim that human players find the experience fun.

## Segment 04: continuation goals and reward signals

The player resumed the same saved world at level 6 with the existing home, sword, and town progression. Visible requirements shaped the next goals: land was purchasable at 140 gold and reputation 10, while the farm business remained gated behind 220 gold and reputation 25. After buying land (142→2 gold), the player cultivated four plots through a normal UI cycle; each mature crop yielded 7 food and +1 reputation. Dungeon combat produced larger, riskier rewards: the mine boss paid 125 gold, 188 XP, and iron, and raised the player from level 6 to 7; a potion offset one hit, leaving 53 HP. A later 4-plot harvest batch yielded 32 food and +4 reputation. Food sales at the shop paid 5 gold per item and took 5 in-game minutes each. At the final checkpoint, the player had 222 gold and reputation 21, so the gold requirement was met but the farm's reputation gate still blocked purchase.

| Approx. active segment minute | Observed goal, outcome, and reward | Why the next goal changed |
| ---: | --- | --- |
| 0–15 | Followed local work/forest signals, earned combat and work rewards, and inspected land/business requirements; direct UI exposed 140g/10 reputation land and 220g/25 reputation farm gates. | The reachable land purchase created a farm route, while the business remained visibly out of reach. |
| 15–30 | Bought land for 140g, completed a mine run through slime, elite, and boss; boss reward +125g/+188XP/iron, level 6→7, one potion used, ending at 53 HP. | Combat could fund the next goals, but health recovery and cultivation remained relevant. |
| 30–45 | Save/reload preserved seed, identity, combat/dungeon state, and RNG; hired Nora for 25g, read her dialogue, then farmed four plots and sold food. | Companion cost/contract and farm yield were directly observable; plots offered a reputation path but required 48 in-game hours. |
| 45–60 | Defeated a forest wolf (+15g, +31XP, +1 reputation), then harvested four mature plots (+32 food/+4 reputation). Eight food sales added 40g, reaching 222g/rep21. | The farm business gold bar was reached, but reputation remained four points short; continued play would focus on local reputation-bearing goals. |

The gameplay steps use distinct pacing: plot preparation costs 6 stamina/20 in-game minutes, sowing costs 4/10, and harvesting costs 4/15; each crop matures after 2,880 in-game minutes (48 hours). This is a crop cycle, not an automatic income stream. The farm panel explicitly says cultivation and food provision remain player-operated.

| NPC | Visible identity and interaction | Result |
| --- | --- | --- |
| Nora 5 | Age 27; experienced mercenary; concern: “留意聚落周遭的動靜”; existing memory that the player defended Oakvale. Hired through the tavern for 25g with a 4g/day, 3-day contract. | Hire memory recorded at world time 196962. Conversation returned “那次你邀我同行，讓我看見了不一樣的路。” A later accelerated time passage paid two daily wages and expired the contract before the next forest fight; her presence did not produce a separable combat damage signal. |
| Local shopkeeper | Shop was open 08:00–20:00; sale controls displayed per-item prices and a five-minute cost. | Eight enabled food sales each paid 5g and advanced five game minutes, taking food 102→94 and gold 182→222. Two earlier disabled sale attempts remain recorded as harness failures and caused no transaction. |

The paused final checkpoint records level 8, gold 222, food 94, reputation 21, identities resident/farmer/adventurer, land owned, no active party, and no planted crops. The business remained unavailable for the stated reputation requirement; the report does not claim it was purchased. The normal UI save/reload check recorded `preAppCaptureAvailable=true`, pre-app world time equal to saved time, preserved seed/character/identity and saved combat/dungeon values, and equal RNG values before/after. The dungeon/combat saved-state checks are equality-preservation observations; they do not imply that an active encounter was present at that checkpoint.

## Persistence, errors, and artifacts

Twelve normal UI save/reloads are recorded across segments 01, 02, and 04. Seed, active character, identity, and saved combat/dungeon state were preserved in every recorded check; recorded before/after RNG values matched. Segment 02 also used a read-only pre-app localStorage capture: its world time matched the saved value before app initialization, and the post-reload observation preserved seed and character identity. Its reported UI-session world-time delta was zero; the subsequent observation was two world minutes later, so the report records the values instead of making a broader no-advance claim.

Raw failures and errors remain in each `results.json`, including the earlier browser preflight/restore evidence, disabled sale clicks in segments 02 and 04, the rest-locator timeout in segment 04, the exact-label farm-click mismatch in segment 03 (followed by a successful normal regex UI click), and the recorded 404 console resource message. Segment 04 attempt 01 records the failed stdin-EOF startup; it is excluded from the credited run. Attempt 02 ended normally, and its `playlog.jsonl` is 111,787,656 bytes; preserve it intact when packaging because it exceeds a 100 MiB single-file limit. The failed farm click did not change state. No application source was changed.

- Raw initial segment: `results.json`.
- Resumed UI continuations and per-segment accounting: `resumed-segment-02/results.json`, `resumed-segment-03/results.json`, and `resumed-segment-04/attempt-02/results.json` (attempt 01 failure retained separately).
- Reproducible combined timing review: `../review/agent-timing-audit.json`.
- Top-level route report: `../agent-playtest-hybrid.md`.

The report archive is updated through `scripts.recorded_reports.write_recorded`. The initial report and all raw action, observation, and error records remain preserved.
