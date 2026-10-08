# Phase 6-I crisis resolution balance observations

The frozen runner processed 10,000 actual canonical crisis resolutions from 2026-10-08T00:16:43Z to 00:18:03Z (80 seconds wall time; Vitest reports 79.49 seconds; exit code 0). The batch is a deterministic **stratified sweep**, not iid Monte Carlo: RNG start states are spread across the 32-bit range and ten profile arms receive 1,000 rows apiece. Do not interpret these observed frequencies as iid estimates or attach binomial confidence intervals.

## Overall resolver outcomes

| Outcome | Observed | Expected from the probabilities used by the canonical resolver |
| --- | ---: | ---: |
| Decisive success | 2,338 | 2,369.0 |
| Costly success | 1,607 | 1,579.3 |
| Setback | 4,238 | 4,236.2 |
| Local defeat | 1,817 | 1,815.5 |

Every row records the actual resolver result, canonical resolution summary, action log, consequence state, and before/after save checks. All 10,000 rows passed the recorded save round-trip checks. The 1,000 NoPlayer cases used the controlled player-death/empty-resident fixture; Chief recovery was granted and reloaded in all 1,000 cases. Recorded consequence fields changed in all 10,000 boss-progress, food, and prosperity results, 9,865 safety results, and 9,047 monster-population results.

## Profile observations

| Profile | Mean success chance used at resolution | Decisive | Costly | Setback | Defeat |
| --- | ---: | ---: | ---: | ---: | ---: |
| NoPlayer | 10.00% | 50 | 50 | 625 | 275 |
| LifeOnly | 42.96% | 252 | 174 | 403 | 171 |
| AdventureOnly | 54.10% | 319 | 214 | 327 | 140 |
| Mixed | 53.04% | 316 | 200 | 333 | 151 |
| Prepared | 43.92% | 254 | 180 | 388 | 178 |
| Underprepared | 17.16% | 92 | 72 | 582 | 254 |
| StrongGear | 45.25% | 278 | 189 | 381 | 152 |
| WeakGear | 45.17% | 275 | 190 | 381 | 154 |
| CheapSpam | 37.28% | 223 | 155 | 437 | 185 |
| ChiefOnly | 45.95% | 279 | 183 | 381 | 157 |

In this controlled sweep, Prepared versus Underprepared differed by 26.76 percentage points in mean resolver success chance. StrongGear and WeakGear differed by 0.08 points, while Mixed and AdventureOnly differed by −1.06 points. CheapSpam's observed mean was 37.28%. These are fixture comparisons from this deterministic schedule; they do not establish player-level causal balance or normal-play rates.

The runner records both a pre-advance preview and the probability actually used after canonical time advancement. They differ in 9,000 of 10,000 rows; mean absolute success-chance difference is 1.37 percentage points and the maximum is 20.62 points. The expected outcome totals above use the post-advance canonical resolver probability (`resolutionSummary.successChance`), not the preview.

## Scope limits and provenance

The scenario arms exercise the canonical resolver/actions, but several are controlled inputs: LifeOnly/Prepared assigns NPC guard/farmer jobs in the fixture; it is not live life/job play. Strong/Weak gear uses the real item-generation craft context and canonical contribution action, but does not run the crafting transaction. ChiefOnly calls the canonical NPC chief-defeat hook directly, without a chief combat encounter. NoPlayer is a controlled death/recovery case, not evidence of autonomous survival. The base seeds label schedule groups; each resolution uses a unique actual world seed (`base seed + row index`).

The first runner's per-seed aggregate was invalid because it compared row world seeds against base schedule seeds. The raw rows and original summary remain preserved; the separate post-run reanalysis recomputes the grouping by the deterministic schedule rule. Use `i-runs/phase6-i-10000/resolution-reanalysis.json` for corrected schedule-group and profile totals. It verifies 10,000 contiguous unique indexes, all canonical resolver/save fields, and unchanged source/HEAD. Raw JSONL SHA-256: `68c01fe0bbf3b278b0882b41a894383753e8f92ba5e86e6e5f9718c090d53dee`; corrected reanalysis SHA-256: `eaab76cd6fdfb2403b222def1de21e22906525e65aec4292b719114ba3a70571`. Source HEAD: `4399579ea67703f2f5ea7ac03d3f2c249ce94eef`; source fingerprint: `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb` before and after.

Detailed run data and profile results are recorded in `crisis-simulation.json`. The append-only raw records, original summary, corrected reanalysis, command, timestamps, stdout/stderr, and exit status are retained in `i-runs/phase6-i-10000/` (22,424,732 bytes total at completion). No product balance changes were made from these observations.

## Matched public-support supplement

A supplemental deterministic matched-pair run completed 500 pairs (1,000 actual canonical resolutions) in 17 seconds wall time, exit code 0. Each pair began with the same living-player world snapshot and RNG start state. The control took no crisis-contribution actions. The treatment used the canonical public warning/preparation actions to contribute food, gold, and equipment. Static trace found no combat import or call in this supplement test path; the per-fixture `combatCalls: 0` field is a harness annotation, not an instrumented runtime count. Every treatment accepted all three actions, and save/reload/resave checks passed for both arms in all pairs.

| Outcome | Control (n=500) | Public-support treatment (n=500) |
| --- | ---: | ---: |
| Decisive success | 96 | 153 |
| Costly success | 62 | 93 |
| Setback | 245 | 182 |
| Local defeat | 97 | 72 |
| Decisive + costly success | 158 (31.6%) | 246 (49.2%) |
| Mean actual resolver success chance | 30.85% | 49.81% |

In this schedule, 97 pairs moved from a setback/defeat in control to a success in treatment; 9 moved from a control success to a treatment setback/defeat. The net observed success-count difference was +88 of 500 pairs (+17.6 percentage points). The actual resolver draw was identical in 463 pairs and differed in 37 after the shared initial state and RNG start. Both arm draws are recorded, but the consumer of the later RNG divergence was not traced. These results are descriptive for this deterministic paired schedule, not IID estimates or confidence intervals. The treatment bundles all three contribution types, so this run does not isolate each contribution's separate effect.

Treatment resource inputs were controlled starting inventory: 25 food items and 200 gold; each treatment spent 25 gold, supplied 100 settlement food from 25 inventory items, and contributed one `starterSpear`. The item was generated with detached RNG and granted to treatment after the matched initial snapshot; it retained craft-context provenance but was not earned or produced by a simulated craft transaction. These resources were controlled and were not earned or farmed by the player. The experiment covers warning-phase public preparation actions, not a complete player life or crafting loop.

The raw 500-pair records are in `i-runs/phase6-i-life-public-500pairs/life-pairs.jsonl` (SHA-256 `8d217954ac13383d0845b80d0c5e5fc61a051e3af1a8d60181e0bb9a5cdc8539`); summary SHA-256 is `33a94717f295355287384cd5c93cd5a06e4354d91e4fca2ecd521746720fb336`. Runner SHA-256 `214276747a05b773cc8110618827ba5046a0300e792b339641e671f40a0790ff`, config SHA-256 `08581fdcdec3aa58efcd1fb72de804cefcde2e88b8832c714756751178e59a8b`. HEAD and source fingerprint remained `4399579ea67703f2f5ea7ac03d3f2c249ce94eef` and `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`.

