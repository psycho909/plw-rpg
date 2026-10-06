# Life Final — Agent Exploratory Playtest

Status: **completed; conservative observed minimum met**. This is agent feedback, not human playtesting. Human Fun Gate remains pending and Product Gate is not approved.

## Completed run

- Frozen source: 441e3c2b435f199a50cb78ee5b19521bcc084593 (full SHA); build manifest: ../build-manifest.json.
- Start: 2026-10-05T13:53:57.146Z, normal UI “起身”. Last direct observed full snapshot: 2026-10-05T14:59:31.002Z, elapsed 3933.86s. Runner shutdown/update: 2026-10-05T14:59:51.893Z, raw 3954.75s.
- Root-reviewed conservative active time: 3609.642s (60m 9.642s). It uses the last direct snapshot and subtracts the 324.214-second union of complete unverified intervals around driver errors. This passes the 3600-second minimum but does not prove 3900 valid seconds. Earlier 3909.75-second effective-time claim is explicitly superseded. See [final Agent playtest report](../agent-playtest-life.md) for the per-interval calculation and corrected 10-minute checkpoints/NPC evidence.
- Fresh persistent seed-909 profile: /tmp/oakvale-v2-life-final-seed-909; URL http://127.0.0.1:5197/; Chromium 151.0.7922.173; CDP 9259; one app page. Asset hashes were checked against manifest at start and rechecked at end.
- Final result was published through scripts.recorded_reports.write_recorded. [results.json](results.json) preserves raw runner status/time, observations, actions, errors, save/reload comparison and root-reviewed conservative bound; [playlog.jsonl](playlog.jsonl) preserves recorded versions.

## Final observed outcome

The player ended with resident+farmer identities, 23 farming actions, reputation 7, 11g, 47 food, 20 wood and an owned home. Oakvale was a village with 39/60 residents, food/prosperity 100 and safety about 93; tavern and blacksmith were open. Public farmland was usable without ownership, but purchasing land remained gated at 140g plus reputation 10. Farm business required owned land, 220g and reputation 25. Forest threat reached Lv.2 and northern-road/caravan events affected settlement safety/supply; the route stayed local rather than hiring a companion or entering the threatened forest.

Mira 1’s profile recognized repeated farming in dialogue, while UI familiarity still read “還不熟” and shared memory remained empty. NPC and reward/goal timeline details are in the final report.

## Failures and product findings

The run contains eight driver errors (screenshot timeouts, blocked controls, a detached locator, and an ambiguous menu locator) plus one asynchronous console 404; page errors: zero. Root conservatively excludes whole adjacent successful-action intervals, not just timeout durations. These are harness-operation failures, not confirmed product bugs.

Unconfirmed product observations: property/business goals are distant relative to tested earnings, repeated farming dominated safe noncombat progression, contextual NPC recognition did not create stored familiarity/shared memories, and the route did not resolve regional threats. These are exploratory findings, not defect declarations or design approval.

## Driver reference

Historical invocation, retained for provenance only (this completed profile must not be restarted):

    python3 reports/playtests/20261004-v2-final-qa/life-final/interactive.py 441e3c2b435f199a50cb78ee5b19521bcc084593 reports/playtests/20261004-v2-final-qa/build-manifest.json

The prepared interactive driver uses normal rendered UI actions and read-only save snapshots; it has no autoplayer. No source or Git files were changed for this playtest.
