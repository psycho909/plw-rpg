# Phase 8-A Balance Baseline

Source snapshot: current `HEAD eb4946ce4f486e9f9ad1707b9ba20bb01cdf4781`; delivered Phase 7 source `b71201e84ff6b78035f8b6ef9b845dbb831451c5`, `src/` fingerprint `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`. The Phase 7 evidence reports test-time HEAD `e05cc78` for some lanes and a separate historical monster fixture source fingerprint `6a320c…`; delivery correlation is based on the Phase 7 baseline's matching source fingerprint, not on equating those test HEADs with delivery HEAD.

All Phase 7 values below are reused without rerunning. A controlled fixture is not a normal-play probability estimate. No rate here is a product target.

## Combat

| Metric | Baseline / status | Source, sample, seed and context | Uncertainty |
|---|---|---|---|
| Win / death rate by rank | Controlled: Normal 100% / 0%; Elite 98.6% / 1.4%; Mini Boss 93.0% / 7.0%; Boss 34.2% / 65.8%. Early/Mid/Late Boss wins 11.1% / 20.5% / 71.1%. | `phase-07/monster-balance.md`; 118,800 controlled legal fixture encounters, 1,188 cells, 100/cell, 3 seeds; six builds; not normal play. | Fixture selection, prescribed builds, and seeded cases do not model route choice, natural gear, tactics, or abandonment.
| Turns | Mean 2.94 / 5.90 / 8.56 / 11.51 for Normal / Elite / Mini Boss / Boss. | Same controlled sample as above. | Aggregate mean only in summary; no P10/P50/P90 cited here.
| Damage taken, potion use, fight cost, remaining HP | NOT MEASURED in report-level Phase 7 summary. | Raw controlled run exists under `phase-07/j-formal-20261013/combat-attempt-05/`; not re-run for A. | Extract from raw records if B needs them; do not infer from win rate.
| Build performance | Controlled Boss defense build led at 52.1%; six builds × 1,800 Boss samples. | `phase-07/monster-balance.md`; controlled fixture. | Survival advantage is not proof of universal dominance; other rank/build detail is in raw matrix.
| Natural encounter and Boss exposure / outcome by progression band | NOT MEASURED. Fresh-save heuristic trace included 42 combat-category and 14 exploration-category actions, reached Boss alive/cooldown, and recorded no player content-Boss defeat; no Early/Mid/Late player stratification. | `phase-07/agent-content-playtest.md`, one normal fresh-save browser run, 840 actions; seed not recorded in per-action trace. Long-world lane had zero player encounter actions. | Heuristic did not pursue a deliberate combat route; no exposure rate denominator for ordinary players.

## Reward

| Metric | Baseline / status | Source, sample, seed and context | Uncertainty |
|---|---|---|---|
| Gear award rate by rank | Boss 100.0%; Elite 74.3%; Mini Boss 85.5%; Normal 56.9%. Overall 79.2%. | `phase-07/loot-analysis.md`; 100,008 controlled `awardContentLoot` calls split evenly across 24 family/rank cohorts (4,167 each); seed mirror checks 1,200. | Engine/weight diagnostics only; not natural exposure, time-to-item, or party kill rate.
| Material availability | Counts span 694–4,910 awards per material in the controlled calls; named exclusive cores were 4,167 each. | Same controlled 100,008 calls; `phase-07/loot-analysis.md`. | Balanced cohort design; no natural spawn or acquisition-volume model.
| Upgrade / sidegrade rate, time to meaningful loot, reward drought, boss-exclusive access in normal play | NOT MEASURED. | Existing controlled loot audit has no player inventory trajectory; agent lane is not a deliberate route. | Requires deliberate normal route evidence; do not treat drop generation as player access.

## Life

| Metric | Baseline / status | Source, sample, seed and context | Uncertainty |
|---|---|---|---|
| Recipe transactions / crafting cost | All 24 new recipes completed; fees range 11–26 gold. Output sale exceeded craft fee by 2–17 gold for every recipe. | `phase-07/crafting-economy.md`; 24 controlled public-API recipe transactions; no seed stated. | Excludes input value/availability, purchase price, stock, and throughput; not net profit.
| Material/gold income, smithing progression, masterpiece eligibility/frequency, crop yield, skill unlock time | NOT MEASURED in the cited Phase 7 summary as route-level distributions. | Phase 7 content and engine tests establish consumers/rules, not normal-play income or progression distributions. | Requires dedicated route/economy samples; avoid treating function coverage as balance evidence.
| Merchant buy/sell/stock/restock cycle | NOT MEASURED. | `phase-07/crafting-economy.md` explicitly excludes purchase prices, merchant stock volume/restock, and natural acquisition. | No confirmed exploit; cycle observability is the C-lane priority.

## World

| Metric | Baseline / status | Source, sample, seed and context | Uncertainty |
|---|---|---|---|
| Population / settlement continuity | Year 10/50/100 checkpoints: living NPCs 79–80; total NPCs 80–81 at sampled rows. | `phase-07/long-world.md`; 3 seeds (40131–40133) × 10/50/100 years = 9 checkpoints; unattended simulation. | Three seeds; no player route or intervention.
| Threat / monster population | Threat 3 at all nine checkpoints; population 85.2–100.0 at Year 10, 91.27–100 at one Year 10 row / 100 at later checkpoints, 90.205–100 at Year 100. | Same long-world sample. | Report rounds values to 3 decimals; three seeds cannot characterize tails.
| Boss state / natural player Boss defeats | Boss alive in 5 of 9 checkpoints; no player encounter actions and no natural content-Boss defeats in any checkpoint. | Same unattended long-world sample. | Says nothing about player encounter opportunity or success.
| Event retention / save size | 150 event rows at each checkpoint (configured cap); history 199–222 at Year 10, 980–1,017 at Year 50, 1,960–1,996 at Year 100. Serialized save 245,878–310,690 bytes at Year 10, 372,913–415,455 at Year 50, 576,378–611,123 at Year 100. | Same long-world sample; save/reload and one-day continuation equality passed all nine checkpoints. | Serialized save bytes are not physical browser storage.
| Crisis frequency/outcome, food/supply, recovery frequency | NOT MEASURED as full distributions in the cited long-world summary. | Long-world checkpoint metrics above are reusable but do not enumerate crisis cycles or supplies. | D-lane should measure scenario and crisis histories.

## Phase 7 heuristic no-progress classification

New runner classified the existing one-hour normal fresh-save trace only; it did not rerun the playtest. The trace had 840 actions and 247 actions marked `noProgress` (29.4%); the old report notes 289 Wait 1 day choices, 230 navigation, 117 equipment/use, 114 farming, 42 combat, 14 exploration, 6 observe, and 27 close-dialog actions. Current run classified 173 as runner-marker cases (medium confidence), 74 as resource-cue cases (low confidence), and 0 as UI / world-wait / goal; the latter zeros mean no rows met these narrow observable rules, not that those causes are absent. The classifier uses action choice, visible text, and explicit runner markers, with confidence and reason. It is a reproducible screening heuristic, not a causal or human-experience label. See JSON/CSV and manifest in `a-baseline-run/attempt-20261014T025228601Z/`.

Historical first-run artifacts directly under `a-baseline-run/` are retained. That run executed the initial classifier, whose overly broad runner-marker rule assigned every no-progress row to `runner`; this classification was superseded by the narrower decision order in the attempt subdirectory. The first-run files remain as historical evidence and are not used as the current reading.

## Browser storage (P8-F06)

`NOT MEASURED` for `navigator.storage.estimate()` usage/quota in Phase 8-A. Existing Phase 7 browser reports have bounded IndexedDB record counts and JSON-projected serialized-byte estimates (including 14,847 rows / 3.82 MB estimated in the 2-hour lane and 7,403 rows / 1.91 MB in the 1-hour lane), but explicitly do not establish physical IndexedDB bytes or quota. A fresh Browser run was not considered cheap with the installed tooling in this workspace (Playwright package/tooling is not declared in `package.json`); F should decide whether to add a supported browser lane. Keep JSON-estimated bytes and physical usage separate.

## Finding triage for B–E

| Finding | Evidence and current reading | Recommended priority |
|---|---|---|
| P8-F01 Natural Encounter / Boss Progression | v3 valid scripted routes establish route-specific encounter outcomes: Adventure recorded 714 Normal wins and 6 Boss wins / 48 retreats; Hybrid 345 Normal wins and 13 Boss wins / 12 retreats. Elite and MiniBoss were **NOT OBSERVED**: 0 eligible and 0 encounters in all three years. Encounter-option evidence records region/season/hour/settlement/progression gates, Wolf rank-chain defeat requirements, stamina/population constraints, and Boss cooldowns. This is not a player exposure probability. | **B — high**: inspect why authored Elite/MiniBoss tracks never became eligible under these calendar/route conditions, then obtain broader legal natural-gear and encounter evidence before any tuning. Keep Phase 7 controlled fixtures separate.
| P8-F02 Reward / Goal Drought | In the v3 trace, all 1,423 no-progress actions were classified `goal` by the route heuristic (Life 242/seed, Adventure 155–156/seed, Hybrid 77/seed). This scripted marker is not a causal label or proof of player drought. The prior heuristic trace remains 247/840 no-progress, classified runner-marker 173 and resource-cue 74. | **E — high**: review the goal-class semantics and gather a deliberate goal-bearing route with outcome evidence before pacing changes.
| P8-F03 Life / Economy Full Cycle | v3 records gross gold and signed net, crop yields and crafting progression. Life earns 11,727 gold, spends 2,704, nets 9,023, harvests 24 wheat, and makes 676 crafts for Smithing Lv.3 (+60 XP). The craft count for one `starterSpear`-type recipe is a chore-risk signal, not a balance verdict. Material receipts are only fully tallied for action-level reward-material deltas; ordinary gatherable gross inputs and merchant stock/restock remain unmeasured. No arbitrage is confirmed. | **C — high**: trace item-level gathered inputs, sale/buy flows and stock/restock through the full economy cycle before changing prices or recipe fees; investigate the repeated-craft burden as a risk signal.
| P8-F04 Combat / Equipment | v3 natural-route policy outcomes are recorded separately: Adventure has 0 deaths, 48 Boss retreats and 6 Boss wins; Hybrid has 0 deaths, 12 retreats and 13 Boss wins. These outcomes include scripted target selection, recovery and route caps. Controlled rows still provide turns and remaining-HP distributions plus net HP-loss proxy for 72 rank/band/build cells; total damage taken, potion use and fight cost are absent. | **B — medium**: use controlled turn/HP data only for fixture diagnostics; add missing spend/damage evidence and natural gear trajectories before tuning combat. Check long Boss retreat sequences as route evidence, not a target-rate failure.
| P8-F05 World / Crisis | Existing 3-seed × 10/50/100-year lane supports stable population/save round-trips and bounded event rows. The new three-year scripted routes do not measure crisis frequencies or supply/recovery distributions. | **D — medium**: reuse current long-world rows for continuity; add crisis-cycle observability where the dedicated lane lacks it.
| P8-F06 Storage / Performance | Phase 7 journal rows and bounded JSON estimates remain the available growth evidence; v3 route artifacts do not measure `navigator.storage.estimate()` or physical quota/IndexedDB usage. | **F — medium**: determine availability of supported browser storage instrumentation; make no quota-risk claim from JSON estimates.

No ideal win rate, drop rate, or fixed reward interval is defined here as a product requirement. v3 is a valid **Normal fresh-save scripted-policy baseline** for these three paired seeds and this three-year window; it is neither a human playtest estimate nor a product target. Unmeasured metrics and the policy/seed limitations remain explicit evidence gaps.

## A2 — Additional evidence and lane ownership

### Controlled combat raw-row extraction (reused, not rerun)

Extracted the existing compressed Phase 7 file `phase-07/j-formal-20261013/combat-attempt-05/combat-raw.jsonl.gz` into **118,800 rows**, grouped as **72 rank × band × build cells** with row-level sample sizes reflecting the number of definitions per rank; 100 distinct row seed values are recorded in the manifest. Turns P10/P50/P90, remaining player HP P10/P50/P90, wins/deaths, and median net HP loss are present per cell. The full table is [combat-extraction.md](a-baseline-run/attempt-20261014T031333507Z/combat-extraction.md); CSV and JSON are adjacent in the same attempt.

The raw schema contains no turn-wise incoming damage, potion use, or gold/consumable spend ledger, so **total damage taken, potion use, and fight cost remain NOT AVAILABLE**. Net HP loss is a separate proxy calculated from initial and final HP; it can be affected by healing. This remains **CONTROLLED_LEGAL_FIXTURE_NOT_NATURAL_PLAY** and does not establish natural route difficulty. Do not merge its results with the normal fresh-save runner output.

### Normal fresh-save runner status

`scripts/phase8/run-normal-routes.mjs` defines paired seeds 61101–61103 across Life, Adventure, and Hybrid policies over calendar years 1–3. It loads the existing public engine APIs through Vite SSR and is designed to write per-seed JSON plus daily time series, encounter, action/no-progress, craft, upgrade, recipe-plan eligibility, and crop-yield CSVs. It uses an operational calendar-year grouping (year 1 Early, year 2 Mid, year 3 Late), rather than a product progression target. Each attempt records HEAD, src fingerprint, seeds, window, and policy version.

Attempt `attempt-20261014T031753470Z/` completed outside the sandbox (3,240 daily rows, 314 encounters, 3,275 actions) but is **SUPERSEDED — POLICY ARTIFACT, NOT A BASELINE** by v3. The v1 runner performed exactly one policy decision per game day; Life produced 0 crafts, 0 crop yields, no skill gains, and no resource activity, while Hybrid completed only one combat encounter. Do not use its outcomes as a normal-play or balance baseline. Preserve all files as historical evidence.

The v1 Adventure rows explain the apparent 100% win result but do not validate difficulty: all 310 encounters across three Adventure seeds were wins (106 Normal, 106 Elite, 82 MiniBoss, 16 Boss); encounter bands were 104 Early, 107 Mid, 99 Late. All 310 rows have HP before/after and player level (levels 1–22; HP before 64–226, after 64–218). All 16 Boss rows were Late and used registry definitions `cave_insect_queen` or `frontier_goblin_warlord`; example rows include queen level 15, HP 184→120, and warlord level 16, HP 120→134. The scripted policy selected only currently eligible authored targets, used potions below 55% HP, retreated below 28% HP or after 9 turns, and recovered at an inn below 35% HP or 8 stamina. Together with late-only Boss exposure and a max level of 22, these are policy-selection/recovery artifacts. Keep the rows available for runner diagnosis only.

Attempts `attempt-20261014T031235366Z/` and `attempt-20261014T031405256Z/` stopped before module loading because Vite's Windows real-path resolution attempted a child process and the sandbox returned `spawn EPERM`; preserve their failure evidence. The A3 v2 attempt `attempt-20261014T032942232Z/` is **SUPERSEDED — INVALID_POLICY, NOT A BASELINE** by v3; preserve its diagnostic evidence. All route policy results are scripted observations, not human play.

### NOT MEASURED follow-up ownership

| Metric still unmeasured | Reason / next evidence | Owner lane |
|---|---|---|
| Human/ordinary-player encounter rates by family/rank/band; route-independent upgrade gaps; natural gear trajectories | v3 is scripted-policy evidence only; 3 paired seeds and one three-year window do not model player choice. Elite/MiniBoss were not observed and were never eligible in the sampled route decisions. | B (F01/F04), E (F02) |
| Gross common-material gathering inputs, full merchant buy/sell/stock/restock cycle, masterpiece eligibility/occurrence | v3 action-level material deltas capture combat/reward receipts, while common gathered-material gross flows and merchant stock/restock are not logged as a complete ledger; masterpiece eligible count was 0 under these policies. `planCraft` legality is observed availability, not an authored unlock event. | C (F03), E (F02) |
| Merchant buy/sell/stock/restock cycle | Explicitly deferred by A2 to the full economy lane; this route baseline will not claim stock/restock observability. | C (F03) |
| Crisis frequency/outcome, food/supply, and recovery distributions | Existing long-world data remains reusable for stability only; dedicated crisis-cycle distribution is deferred. | D (F05) |
| `navigator.storage.estimate()` usage/quota and physical IndexedDB bytes | Phase 7 has bounded record counts and JSON estimates only; physical storage and quota remain unmeasured. | F (F06) |

## A4 — Normal-route policy correction

The lead-run v2 attempt, `a-baseline-run/attempt-20261014T032942232Z/`, is **SUPERSEDED — INVALID_POLICY, NOT A BASELINE** by v3. Its three Life seeds were byte-identical and produced no farming or crafting; its 2,366 Adventure encounters were all Normal, with no Elite, Mini Boss, or Boss engagements. Preserve it as diagnostic evidence; do not use its outcomes for balance conclusions.

The v3 harness keeps paired seeds 61101–61103 and the existing three-year window. Its policy decisions are harness behavior, not product requirements or balance targets:

- **Life:** use legal public gather, farm, craft, sell, rest, and travel actions; never start a voluntary encounter. Prepare and plant currently available all-season wheat in farmland, harvest at maturity, reserve 3 wood and 2 stone for the fresh-save `starterSpear`, and craft only when `planCraft` reports the store transaction is legal. Sell only gathered surplus beyond the recipe reserve.
- **Adventure:** inspect public content and Wolf encounter options, use the forest encounter, and challenge the Goblin Chief only while `bossAlive`. Select the highest eligible rank, rotate regions by in-game day, and use the configured equipment and recovery policy. Three Normal starts per day is a route-policy cap; an eligible higher-rank target is still pursued. Record why no higher rank was eligible when that is the case.
- **Hybrid:** alternate the complete Life and Adventure policies by in-game day; resolve an active combat before taking an action from either half. Each seed must show successful actions from both halves.

Validity gates now require engine success plus a changed relevant state, differing seed-derived world/RNG evidence, successful Life gathering and farming with skill XP plus crafting/smithing XP when a fresh-save recipe is reachable (or a verified impossibility reason), engagement of each higher rank observed as eligible, both Hybrid halves, and an evidence-based explanation for all-win combat results. These are runner-sanity checks, not target rates.

The UI has no fixed actions-per-day counter: each action is gated by its own stamina, time, location, station, and world conditions. Movement advances 5 minutes per tile; gathering spends 10 stamina and 15–43 minutes by skill; farming spends 4–6 stamina and 10–20 minutes; the starter spear craft spends 10 stamina and 45 minutes; encounter starts spend 8 stamina; combat turns advance 1 minute (retreat: 10 minutes); village rest restores 35 stamina and 15 HP in 60 minutes, while an 8-gold inn stay takes 480 minutes and fully recovers. The harness's 80-decision daily ceiling is only a safety guard, and actions can cross midnight.

## A5 — v3 Normal fresh-save scripted-policy baseline

Lead executed `node --test route-validity+classify` (14/14 PASS), `vitest src/engine/simulation.test.ts` (28/28 PASS), and `node scripts/phase8/run-normal-routes.mjs`. The runner completed **PASS** at `a-baseline-run/attempt-20261014T040039340Z/`, policy `normal-fresh-save-routes-v3`, seeds 61101–61103, years 1–3 (3,240 daily rows, 1,138 encounters, 50,931 actions, 3,398 crafts, 42 gear changes, 12 unlocks, 18 crop yields); all nine route/seed gates are `VALID_POLICY`. This is a Normal fresh-save scripted-policy baseline, not a human playtest, player probability estimate, controlled fixture, or product target. Phase 7 controlled combat/reward results remain separate.

| Route / seed | Encounters by rank / outcome; Boss wins / retreats | First meaningful gear (min) | Gold income / spend / net; final gold | Reward-material receipt (gross positive action deltas) | Crafts; Smithing / Farming at end | Wheat yields; no-progress |
|---|---|---:|---|---|---|---|
| Life 61101 | None (voluntary encounters disabled) | N/A | 11,727 / 2,704 / +9,023; 9,068 | 0 reward-material deltas; common gatherable gross inputs not instrumented | 676; Lv.3 (+60 XP) / Lv.3 | 5, 6, 6, 7 = 24; 242 (`goal`) |
| Life 61102 | Same | N/A | Same | Same | Same | Same |
| Life 61103 | Same | N/A | Same | Same | Same | Same |
| Adventure 61101 | Normal 237 win; Boss 2 win, 15 retreat; 0 deaths | 555 | 2,245 / 0 / +2,245; 2,290 | 288 units | 0; Lv.1 / Lv.1 | None; 155 (`goal`) |
| Adventure 61102 | Normal 240 win; Boss 2 win, 15 retreat; 0 deaths | 562 | 2,266 / 0 / +2,266; 2,311 | 278 units | 0; Lv.1 / Lv.1 | None; 156 (`goal`) |
| Adventure 61103 | Normal 237 win; Boss 2 win, 18 retreat; 0 deaths | 4,422 | 2,245 / 0 / +2,245; 2,290 | 287 units | 0; Lv.1 / Lv.1 | None; 155 (`goal`) |
| Hybrid 61101 | Normal 115 win; Boss 5 win, 1 retreat; 0 deaths | 4,880 | 9,381 / 1,832 / +7,549; 7,594 | 133 units | 458; Lv.3 (+60 XP) / Lv.2 | 5, 6 = 11; 77 (`goal`) |
| Hybrid 61102 | Normal 115 win; Boss 4 win, 6 retreat; 0 deaths | 4,880 | 9,296 / 1,828 / +7,468; 7,513 | 137 units | 457; Lv.3 (+60 XP) / Lv.2 | 5, 6 = 11; 77 (`goal`) |
| Hybrid 61103 | Normal 115 win; Boss 4 win, 5 retreat; 0 deaths | 4,880 | 9,281 / 1,820 / +7,461; 7,506 | 137 units | 455; Lv.3 (+60 XP) / Lv.2 | 5, 6 = 11; 77 (`goal`) |

Encounter rank evidence reports **Elite: NOT OBSERVED (0 eligible, 0 encounters)** and **MiniBoss: NOT OBSERVED (0 eligible, 0 encounters)** for all Adventure and Hybrid seeds across the observed three-year route. This is a legality result, not missing rank classification: authored options are gated by region, level, threat, season, hour, settlement/progression state and safety; Wolf ranks additionally require defeating the prior rank, forest location, sufficient stamina and monster population; Boss targets have cooldowns. The runner recorded these blocked reasons, including ineligible region/season/time/settlement, prior Wolf-rank requirements, insufficient stamina, no nearby monster and Boss cooldown. The outputs do not establish that a human player could not reach those ranks by changing route or state.

Material income is the sum of positive action-level `materialDelta` receipts (combat/reward drops); it is not total item throughput. Life has no combat-material receipts, while gross ordinary wood/stone/iron gathering is not represented as a per-action quantity in the baseline schema, so those inputs are not reported as zero. Crop outputs are food yields and remain distinct from combat-material receipts. Initial gold is 45; gross income, spending, net and final gold are computed from the action deltas and final state.

Life metrics are seed-invariant even though all three seeds were applied: `worldSeed`, `rngState`, and the RNG probe differ for each seed (61101: 1216225876 / 0.52625; 61102: 399550865 / 0.14356; 61103: 3877843150 / 0.76087). Per A4 Max Q1, the fixed Life policy's gather/farm/craft/sell/wait decisions do not encounter randomness affecting the reported Life metrics; this is a deterministic policy result, not evidence that seeds were ignored. Treat the three repeated Life observations as one invariant policy outcome, not three independent varied outcomes.

The 676 successful `starterSpear`-type crafts per Life seed (and 455–458 per Hybrid seed) for Smithing Lv.3 (+60 XP) are a **chore-risk signal**: the route policy repeats the same reachable craft many times while XP remains capped. It is not a product target or standalone balance verdict. No-progress class `goal` is the runner's heuristic class and does not imply causal user intent or a player experience diagnosis. No ideal rates or desired pacing are specified here.

## Raw evidence storage note

Root compressed 29 raw CSV/JSON files larger than 1 MB under `a-baseline-run/` with `gzip -9 -n` before commit (280 MB → 6.5 MB), following the Phase 7 `combat-raw.jsonl.gz` convention. Original SHA-256 values are recorded in `a-baseline-run/raw-compression-manifest.sha256`; every `gunzip -c` output was verified to match. Paths cited above refer to the same files with a `.gz` suffix where applicable. Runners write uncompressed output; compression is a post-run storage step only.
