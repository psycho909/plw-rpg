# Phase8-E Reward & Progression Pacing

## Scope and evidence

Normal-play evidence is the A v3 scripted-policy run `reports/v2/20261014-balance-tuning/phase-08/a-baseline-run/attempt-20261014T040039340Z/`: Life, Adventure, Hybrid; seeds 61101–61103; three in-game years; 6,424 / 4,472–4,483 / 6,064 actions per seed respectively. Raw seed JSON and action CSV are gzip-compressed; this report's analysis artifact is `e-runner/route-pacing-attempt-20261014T101557311Z.json`. These are scripted itineraries, not human play. Controlled combat matrices and controlled loot generation are separate evidence lanes and are not combined with route frequencies.

### Instrumented companion lane (validated policy v3)

The instrumented run `e-runner/instrumented-attempt-20261014T102419801Z/` uses the validated `run-normal-routes.mjs` policy v3 and route-validity gates, instrumented on current V4 crop-yield-cap HEAD `5e223beb2ef056968861bc4c7125c1fb41da8728`. Manifest status is PASS for all 9 route/seed cases across three years, with 3,240 daily rows, 50,931 actions, 50,889 decision snapshots, and 1,138 encounters. Corrected analyzer output is `analysis-summary-r9.json`; prior r6–r8 outputs are retained. Per-seed decision JSONL and `boss-visibility.json` retain details. This is a separate scripted lane; its counts are not pooled with the A v3 tables. Each Life seed has 676 total starterSpear crafts, of which 670 are zero-practice-XP after the cap. The policy farms/sells; these are scripted chore patterns, not player prevalence.

Gap intervals include the leading interval from fresh-save start and the trailing interval through the observation boundary. Distributions below pool interval samples across the three seeds; values are game minutes and action counts. Empty event streams therefore show the full-window right-censored interval. Gold bands (100, 500, 1,000, 5,000, 10,000) are analyst-defined descriptive bins, not authored thresholds or product targets. Skill-up timestamps are daily snapshots, so they are bounded by the route's daily reporting cadence.

## Reward and goal drought intervals

Asset/property acquisition is **NOT MEASURED**: none of these route policies acquires property, and the retained logs do not provide a property progression timeline. Gold high-water bands below are descriptive wealth proxies only.

| Route / event | Gap samples | Game minutes median / p90 / max | Actions median / p90 / max |
|---|---:|---:|---:|
| Life — equipped meaningful item upgrade | 3 censored | 517,920 / 517,920 / 517,920 | 6,424 / 6,424 / 6,424 |
| Life — skill level-up (all skills pooled) | 123 | 7,200 / 30,240 / 48,960 | 80 / 387 / 595 |
| Life — new enemy first encountered | 3 censored | 517,920 / 517,920 / 517,920 | 6,424 / 6,424 / 6,424 |
| Life — descriptive gold high-water band | 15 | 59,040 / 227,040 / 227,040 | 712 / 2,926 / 2,926 |
| Life — first legal recipe plan observed | 9 | 39,083 / 477,397 / 477,397 | 465 / 5,942 / 5,942 |
| Adventure — equipped meaningful item upgrade | 23 | 8,853 / 244,283 / 401,576 | 92 / 1,985 / 3,384 |
| Adventure — skill level-up (all skills pooled) | 75 | 14,400 / 58,956 / 86,400 | 104 / 523 / 776 |
| Adventure — new enemy first encountered | 24 | 4,671 / 397,544 / 401,869 | 57 / 3,382 / 3,402 |
| Adventure — descriptive gold high-water band | 12 | 69,120 / 344,170 / 344,170 | 548 / 2,948 / 2,955 |
| Adventure — first legal recipe plan observed | 3 censored | 517,930 / 517,930 / 517,930 | 4,483 / 4,490 / 4,490 |
| Hybrid — equipped meaningful item upgrade | 25 | 8,182 / 332,099 / 415,165 | 91 / 4,093 / 4,958 |
| Hybrid — skill level-up (all skills pooled) | 157 | 4,800 / 28,800 / 41,300 | 56 / 353 / 558 |
| Hybrid — new enemy first encountered | 21 | 8,642 / 412,745 / 412,745 | 94 / 4,914 / 4,949 |
| Hybrid — descriptive gold high-water band | 15 | 56,640 / 272,640 / 276,480 | 561 / 3,110 / 3,129 |
| Hybrid — first legal recipe plan observed | 9 | 39,082 / 477,418 / 477,418 | 391 / 5,678 / 5,678 |

“Meaningful item” is an actually equipped stat/rarity improvement in the harness, not every generated item. “New enemy” is first observed encounter per definition ID. Recipe events are the first retained time at which `planCraft` was legal; these are goal proxies, not an in-game announcement. Rank-unlock and Boss-eligibility timestamps are not retained in the A v3 seed files and are **NOT MEASURED**.

## Chore risk and no-progress classification

| Route | StarterSpear crafts with zero practice XP after cap, per seed | Gather actions, per seed (additional actions inside consecutive pairs; max run) | Same-enemy consecutive encounter streaks, per seed (maximum) | Repeated identical wait actions |
|---|---:|---:|---:|---:|
| Life | 670 | 743 (2; max run 2) | 0 | 0 |
| Adventure | 0 | 0 | 44–45 (59) | 0 |
| Hybrid | 449–452 | 526–529 (2; max run 2) | 21–22 (32) | 0 |

The zero-XP starterSpear repetitions follow recipe practice caps: `crafting.ts:207-241`. They are a chore-risk signal from these policies, not a claim about player boredom. Adventure's repeated same-enemy streaks are scripted target-selection behavior; the longest grayWolf streak spans game time rather than uninterrupted actions. The A v3 route files did not capture all simultaneously legal alternatives; the instrumented companion lane resolves alternatives for its own recorded moments (details below). Life and Hybrid plant only wheat under the A policy (four and two harvests per seed respectively); they do not test whether a player would change crop strategy. No repeated “Wait 1 Day” policy action was recorded.

A v3 records 1,423 no-progress markers: Life 242/seed, Adventure 155–156/seed, Hybrid 77/seed. All are synthesized `*-policy-no-action` records with reason `policy-found-no-legal-progressing-action`. In the instrumented companion analysis (`analysis-summary-r9.json`), 1,276/1,423 are only classifiable as low-confidence “no understandable next goal”; the remaining 147 are runner-policy-limited because the v3 daily encounter cap is consumed while eligible Normal targets remain (Adventure 114, Hybrid 33). This runner cap is not legitimate world waiting and does not establish a game defect. These scripted policy outcomes do not indicate player goal comprehension. The A-v3 nearest-daily-snapshot summaries (Life median age 520 minutes; Adventure 1,339; Hybrid 879) are stale context, not state at the no-op timestamp. The Phase7 one-hour heuristic trace was 247/840: 173 runner-marker, 74 resource-cue. The A v3 lane lacks per-action location, time-of-day, cooldown, shop-hour, and contemporaneous legal-option snapshots; the instrumented lane adds these fields and legal projections. Source cue rules are narrow (`scripts/phase8/classify-playtest.mjs:1-23`); the runner breaks after a policy no-op (`scripts/phase8/run-normal-routes.mjs:211-215, 576-592`). No-progress is not treated as boredom.

## B-F1 — Boss visible before beatable

Instrumented projection evidence supersedes the A-v3-only encounter timing above: first listed Boss option (`wolfKing`) is at game minute 480 on all routes. First legal Boss eligibility is Adventure minute 116,195 (`wild_beast_apex`), Hybrid 81,804 (`slime_heart`), Life 55,883 (`slime_heart`). First eligible-to-engaged is zero for Adventure, 4,346 minutes for Hybrid (engages at 86,150), and no engagement for Life because its validated policy does not fight. Adventure seeds 61101/61102 reach their first Boss win 7/6 game minutes after first engagement. Seed 61103's 145,469-minute interval is route-level elapsed game time from first Boss engagement to first Boss win; it includes 18 retreats and crosses Boss IDs (`wild_beast_apex` first engaged, `frontier_goblin_warlord` first won), so it is not a continuous fight or time-to-kill. Hybrid's route-level intervals to first win are 6–7 game minutes. These are scripted route outcomes, not player expectations. First-listing to eligibility gaps are 115,715 minutes Adventure, 81,324 Hybrid, and 55,403 Life.

No Elite or MiniBoss was **OBSERVED** in this three-year policy-v3 run. Phase8-B's separately measured normal route DID record 64 Elite and 1,103 MiniBoss encounters (`combat-balance.md`, `b-runner/normal-route-attempts/measured/attempt-20261014T045339779Z/`). B attributed v3's zero to runner over-clearing plus its grayWolf tie-break, not player exposure. Therefore v3's zero is runner-policy-defect evidence in the encounter-exposure/drought interpretation; it is not evidence that players do not encounter those ranks or that the ranks are unavailable. The instrumented companion's sampled projections provide legality context, but do not override the cross-run counterexample. Detailed v3 rank/eligibility reasons remain in `e-runner/instrumented-attempt-20261014T102419801Z/boss-visibility.json` and per-seed decision JSONL. “First listed” means the option appears in the engine/UI projection; this runner cannot prove the player noticed it.

Before engagement, `PlaceWindow.vue:97,105,133-145` projects wolf options and next-step/reason text; `:201` renders wolf track buttons with disabled eligibility, reason, and reward expectation; `:236-259` lists content encounter rank, disabled eligibility, and reason. The inspected surfaces do not provide an explicit danger estimate or recommended level. Rank/reason/reward visibility is established; subjective risk clarity and player comprehension are not measured. The earlier statement that no pre-encounter eligibility list is rendered is withdrawn. B's qualitative “Bosses visible long before they are beatable” (`combat-balance.md:115`) is consistent with the policy projection timeline, but does not by itself justify a spawn or UI change.

## Source interpretation

The instrumented companion lane also answers the chore alternatives question at captured decision moments, joined by each craft event's timestamp to its corresponding action-decision interval. Zero-practice-XP starterSpear crafts: Life 670 per seed (2,010 total), Hybrid 452/451/449 per seed (1,352 total), Adventure 0. At each such moment, no other legal recipe was projected (thus none could be an XP-yielding alternative), while at least one legal trade was projected (Life 670/670; Hybrid 452/451/449). Trade is an alternative action, not alternative smithing progression. Adjacent same-definition encounter pairs: Adventure 142/143/142 (427 total), Hybrid 76/77/77 (230 total). No higher-rank target was legal at those repeats; another same-rank target was legal at 141/142/141 Adventure moments and all Hybrid moments. Same-rank legality does not mean the alternative was better. These policy observations are not estimates of player preference or boredom.

Instrumented no-progress reclassification, using contemporaneous decision state and engine projections: 1,423 total; generic runner policy defect 0; runner-policy-limited 147; UI not visible/reachable 0; lacking resources 0; no understandable next goal 1,276 (low confidence); excessive wait-repeat cost 0; legitimate world wait 0. The 147 cap-limited cases are Adventure 114, Hybrid 33, Life 0. Separately, the v3 route's zero Elite/MiniBoss encounters are runner-policy-defect evidence for rank exposure, as described above; this is not an additional no-progress marker. Zero in a no-progress category means no captured marker matched that rule, not that players never encounter the issue. UI reachability/comprehension was not measured using rendered UI or accessibility snapshots. The policy stops after a no-op, so repeat-wait cost is unevaluated. Logged fields include world time, time-of-day, location, stamina, HP, gold, shop/blacksmith visibility, cooldowns, crops/plots, legal encounter/recipe/trade projections, selected action, and outcome.

- Normal route policy, daily reporting boundary and action ceiling: `scripts/phase8/run-normal-routes.mjs:1-17, 568-592`. The 80-decision ceiling is a runner guard, not an in-game action limit.
- Skill advancement curve: `src/engine/simulation.ts:225-239`.
- Craft practice XP cap: `src/engine/crafting.ts:207-241`.
- Content Boss legal option projection: `src/engine/contentFamilies.ts:127-153`; Wolf rank/cooldown gating: `src/engine/wolfFamily.ts:50-75`.
- Active combat rank and telegraph display: `src/components/AdventureWindow.vue:38-54`.
- Pre-combat projections/eligibility explanation: `src/components/PlaceWindow.vue:97,105,133-145,201,236-259`.

## E2 change proposals

**NO CHANGE for E2.** The instrumented companion now records per-action state/legal options and Boss projection/eligibility; it shows long policy projection-to-eligibility gaps and repeated zero-XP crafts, but no human UI visibility, comprehension, or preference. PlaceWindow exposes rank and eligibility reasons (plus wolf reward expectation), correcting the earlier claim that pre-engagement reasons are absent; explicit danger estimate/recommended level was not found in inspected UI lines. These scripted observations do not identify a product defect or justify changing rewards, encounter rates, or skill progression. No target rate is proposed.

## E Findings

- **E-F1 — No-progress interpretation:** 1,276/1,423 no-progress markers are only classifiable as low-confidence “no understandable next goal”; 147/1,423 are runner-policy-limited by the daily encounter cap, not legitimate world wait. Whether a human player sees or understands a goal is **DEFERRED to the Human gate**.
- **E-F2 — Boss presentation:** Boss encounter options are eligibility-gated and show visible reasons before engagement; wolf-track rows also show reward expectation. Inspected UI lines have no explicit danger estimate/recommended level. This is B-F1 reinterpreted with UI evidence; player risk comprehension remains unmeasured.
- **E-F3 — Capped crafting:** Correct event-time joins show 670 zero-XP starterSpear crafts per Life seed (676 total crafts) and 452/451/449 per Hybrid seed. At these moments no other legal recipe was projected, so no XP-yielding legal recipe alternative existed in the captured option set; trade actions were projected. This is policy evidence of a constrained smithing progression loop, not evidence of player perception or a product target. Counts and alternatives are in `analysis-summary-r9.json`.
