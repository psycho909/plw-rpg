# Hybrid Agent Exploratory Playtest

Status: **READY FOR FINAL REVIEW**. The formal resumed-segment duration gate is met: segments 02–04 total 4,384.601 verified active-observation seconds, including 3,227.410 seconds in segment 04. Segment 01 receives zero formal credit because its external CDP/debug reserve is an estimate, not a proven upper bound. The old 4,504.145-second result is superseded conditional history. Human Fun Gate remains **PENDING**; Product Gate remains **NOT YET APPROVED**. This is Agent Exploratory Playtest evidence, not human feedback or Drought Matrix agent coverage.

The playtest used frozen source `441e3c2b435f199a50cb78ee5b19521bcc084593`, served at `http://127.0.0.1:5197` from `/tmp/oakvale-v2-final-441e3c2-dist`. Its seed-2026 starting fixture came from the public `createGame(2026) → serialize` path with untouched defaults (world time 480, 45 gold); it differs from the Life route's native UI seed 909. No resource, time, or state edits were made. After fixture setup, exploration used visible UI actions. Resumed segments continued the same persistent profile and saved world. Segment 04 attempt 02 ran 2026-10-05 19:40:50.050–20:40:53.259 UTC and ended with the game paused; attempt 01's failed stdin-EOF startup is preserved separately and uncredited. Source/build fingerprints and served assets matched the immutable manifest. Seed provenance is in `seeds/provenance.json`.

## Formal timing

| Segment | Credited active observation | Accounting |
| --- | ---: | --- |
| 01 | **0.000 s** | excluded; previous 3,346.954 s was a conditional estimate using an unmeasured 600 s debug reserve |
| 02 | 706.055 s | 932.685 s window − 1.169 s recovery − 225.461 s explicitly unobserved |
| 03 | 451.136 s | 601.068 s window − 50.574 s recovery − 99.358 s explicitly unobserved |
| 04 | 3,227.410 s | 3,603.209 s window − 241.843 s recovery − 133.956 s explicitly unobserved |
| **Formal total** | **4,384.601 s (73.1 min)** | ≥3,600 s route requirement and ≥3,000 s segment-04 target met |

The independent `review/agent-timing-audit.py` recomputes action-bounded harness recovery intervals and merges explicit gaps. Segment 04's errors were two disabled sale attempts (31.769 s and 148.970 s) and one broad rest locator timeout (61.104 s). The known review gap 20:35:09.925–20:37:23.881 UTC is excluded in full (133.956 s). Calculation starts at the formal run's start and stops at direct observation 92; raw elapsed after that snapshot is not credited. No `priorActiveSeconds` or `cumulativeActiveSeconds` are used. Segment 04's standalone writer was closed normally after the game was paused. Its per-attempt `playlog.jsonl` is 111,787,656 bytes and must be preserved intact when packaging.

The 3h40m wall-clock gap before segment 02 is unobserved. Segment 01's final direct world time was 101651; segment 02's pre-start saved-state read was 103783, an unobserved increase of 2132 world minutes, with its first UI observation at 103785 after a two-minute UI tick. This does not establish the cause, offline advancement, or a bug. Records support continuation by same profile, source/build, seed 2026, active character `alden`, and saved progression; no `worldId` field is exposed, so the report does not claim explicit world-ID equality. A further 14m19.354s unobserved gap separates segment 03 from 04: segment 03 ended at worldTime 162409 / RNG 3886205941 (19:26:30.723Z), segment 04 expected resumed worldTime 164545 and first observed 164547 / same recorded RNG (19:40:50.077Z). The 2,136-minute pre-resume advance and subsequent two-minute UI tick are not credited. The world time did change while unobserved; the records do not establish why, prove offline simulation, or show an unchanged world. Continuity is supported by profile, seed, source/build, actor and recorded RNG, but there is no explicit worldId field.

## Exploration findings

Exploration moved from gathering and town work into the village economy, combat, land ownership, farming, and NPC relationships. Segment 04 reached the land threshold (140 gold/10 reputation) and purchased land through UI, leaving 2 gold. A mine boss then paid 125 gold, 188 XP, and iron; the player reached level 7 and used one potion, ending at 53 HP. Cultivating four plots yielded +32 food and +4 reputation when harvested. At the final checkpoint, gold was 222 and reputation 21: the farm business requires 220 gold and 25 reputation, so reputation remained four short and the business was not purchased.

A normal UI save/reload during segment 04 preserved the seed, active character, identity, saved combat/dungeon values, and RNG values; the pre-app world-time capture matched saved time. These equality checks do not claim an active encounter was present. No source code was changed.

| Active minute | Reward and state signal | Player-chosen follow-up |
| ---: | --- | --- |
| 0–15 | Local work/forest rewards; inspected land and farm business gates. | Buy reachable land; build a farm route while tracking the reputation gate. |
| 15–30 | Land cost 140g; mine boss +125g/+188XP/iron, level 6→7, potion use. | Recover and use the new income to pursue farming and town progress. |
| 30–45 | Reload equality check; hired Nora for 25g and read her remembered dialogue; began four-plot cycle. | Observe contract and crop outcomes during time passage. |
| 45–60 | Forest wolf +15g/+31XP/+1 reputation; four harvests +32 food/+4 reputation; eight food sales +40g. | Pursue remaining reputation needed for the farm business. |

Each crop cycle required preparation (6 stamina/20 game minutes), sowing (4/10), and harvest (4/15); maturity was 2,880 game minutes (48 hours). Crops were a delayed, active labor reward rather than passive income. The farm UI explicitly states cultivation and food supply remain player-operated.

| NPC / service | Observed interaction | Outcome |
| --- | --- | --- |
| Nora 5, age 27, experienced mercenary | Concerned with settlement safety; hired for 25g at 4g/day for three days; dialogue referenced the prior invitation. | Hire memory recorded. Two day wages were paid before expiration; no independent combat damage contribution was measurable. |
| General shop | Open 08:00–20:00; food sale 5g and five game minutes each. | Eight enabled sales: food 102→94, gold 182→222. Two earlier disabled sale attempts remain failures with no transaction. |

The final state was level 8, 222 gold, 94 food, reputation 21, resident/farmer/adventurer identities, land owned, no active party, and no planted crops. The top-level detailed report contains additional segment-by-segment reward and NPC observations.

The earlier segments cover the initial move from hamlet resident to village resident, work and market trade, a purchased/equipped sword, home/inn rest, harvests and reputation growth, and the mine's ordinary slime reward. Raw errors remain preserved, including earlier browser preflight/restore evidence, segment-02 disabled sale, segment-03 farm selector mismatch and subsequent successful UI retry, segment-04 disabled sale/rest locator errors, and the console 404 message. A failed preflight or action is not counted as play.

Primary evidence:

- Detailed report: `hybrid-final/README.md`.
- Original segment: `hybrid-final/results.json`.
- Resumed segments: `hybrid-final/resumed-segment-02/results.json`, `resumed-segment-03/results.json`, and `resumed-segment-04/attempt-02/results.json`.
- Segment 04 failed startup: `hybrid-final/resumed-segment-04/attempt-01/results.json`.
- Recomputed timing: `review/agent-timing-audit.json`.

Reports are published through `scripts.recorded_reports.write_recorded`; raw failures and action/observation records remain preserved. The final status only closes the Agent Explorer duration gate; Human Fun Gate remains pending and product approval is not granted.
