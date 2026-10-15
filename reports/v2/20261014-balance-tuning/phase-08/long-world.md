# Phase8-F Long-World Consolidation

## Scope and evidence lanes

This report consolidates Phase7-K's unattended checkpoint evidence and Phase8-D's D1 normal-policy worlds plus D2 controlled parameter comparison. The normal-policy and controlled lanes are kept separate. A checkpoint verifies a specific save/reload and continuation boundary; it does not estimate all possible long-run player outcomes.

| Lane | Scenarios / seeds / horizons | Result and evidence |
|---|---|---|
| Phase7-K current-source unattended simulation | 3 seeds (40131–40133) × years 10/50/100 = 9 checkpoints | 9/9 save/reload and one-day continuation equal; source stable. Raw report: [`Phase7 long-world`](../../../20261008-content-expansion/phase-07/long-world.md); raw attempt `reports/v2/20261008-content-expansion/phase-07/k-current-source-long-world-20261013/attempt-01/`. |
| Phase8-D1 normal-policy / controlled starting worlds | No Intervention, Life, Adventure, Mixed, Prosperous controlled, Struggling controlled × 3 seeds × 10/50/100 years = 54 checkpoints | 54/54 valid with save/reload and one-day continuation parity. Summary: [`d1-summary.md`](d-runner/d1-summary.md); raw scenarios under `d-runner/attempt-*/`. |
| Phase8-D2 controlled parameter comparison | V0, G1, G2, K1 × No Intervention, Life, Adventure × 3 seeds × 10/50/100 years = 108 checkpoints | 108/108 checkpoints persisted; 11/12 runs VALID. G1 Adventure is INVALID because it produced zero crises and zero phase transitions. Summary data: `d-runner/d2-controlled/comparison-summary.json`; individual attempts under `d-runner/d2-controlled/`. |

D1/D2 use the actual exported `simulation.simulate()` at canonical day boundaries. The corrected D runner accounts for simulation time advanced both by the outer loop and inside actions; previews and reload/continuation clones are excluded from live-world elapsed time. It reconciles each canonical daily tick and crisis monster-population delta against the saved crisis records. D1 raw evidence records deaths, successions, transitions, crisis outcomes, actions, and daily balance. D2's growth/guard variants were in-memory runner overrides; they were not product-source edits.

## Save, continuation, event retention, and serialized size

| Evidence | Checkpoints | Event rows / retained history | Serialized save bytes | Parity |
|---|---:|---|---|---|
| Phase7-K | 9 | Event rows were 150 at every checkpoint (configured cap); history was 199–222 at year 10, 980–1,017 at year 50, and 1,960–1,996 at year 100. | 245,878–310,690 at year 10; 372,913–415,455 at year 50; 576,378–611,123 at year 100. | Save/reload and one-day continuation equal at 9/9. |
| Phase8-D1 | 54 | D1 artifacts capture world events, crisis records, histories and transitions. A comparable retained-event-row count and serialized save-size series were **NOT MEASURED** in the D1 summary. | **NOT MEASURED** as a D1 size series. | Save/reload and one-day continuation equal at 54/54. |
| Phase8-D2 | 108 | Per-run world/crisis records retained; no comparable save-size or retained-event-cap series reported. | **NOT MEASURED**. | Save/reload and one-day continuation equal at 108/108; the G1 Adventure world is invalid despite parity because it produced no crisis/phase evidence. |

Phase7 serialized bytes are JSON/save payload size, not physical IndexedDB bytes or browser quota. The 150 event rows are a configured retention bound, while history grows with time. Browser-native storage estimates and stress behavior are pending F1; see the placeholders in [`final-review-draft.md`](final-review-draft.md). Do not infer a browser storage limit from these JSON measurements.

## Normal-policy long-world results (D1)

Each scenario uses seeds 40131–40133 and checkpoints at years 10, 50 and 100. Crisis counts below are three-seed totals across 300 seed-years; the per-seed-century figure is the comparable single-seed 100-year rate.

| Scenario | Crises (3-seed total / per seed-century / per seed-year) | Year-100 population / food / prosperity | Mean readiness | Notes |
|---|---:|---:|---:|---|
| No Intervention | 201 / 67.0 / 0.670 | 80 / 100 / 100 | 82.76 | Empty contribution ledger; NPC activity continues. |
| Life | 200 / 66.7 / 0.667 | 79.33 / 100 / 100 | 82.78 | 114 deaths from aging, 114 successions; no combat. |
| Adventure | 200 / 66.7 / 0.667 | 79.67 / 100 / 100 | 82.63 | 12 combat deaths plus 132 aging deaths; all 144 succeeded by a legal heir. |
| Mixed | 200 / 66.7 / 0.667 | 80 / 100 / 100 | 83.03 | 11 combat deaths plus 120 aging deaths; all 131 succeeded by a legal heir. |
| Prosperous (controlled start) | 203 / 67.7 / 0.677 | 80 / 100 / 100 | 83.86 | Starting-condition comparison, not normal play. |
| Struggling (controlled start) | 203 / 67.7 / 0.677 | 80 / 100 / 100 | 82.45 | Starting-condition comparison, not normal play. |

All four crisis outcomes occurred and every recorded crisis resolved. There was no game over or world reset. Player-policy cases apply UI-equivalent legal succession after player death; no-intervention and controlled settlement cases do not simulate a player succession action. The active-policy scenarios' 389 deaths were matched by 389 successions. Adventure's 12 and Mixed's 11 combat deaths occur early (years 2–24 and 2–32 respectively); these reflect the deliberately sparse D1 adventure itinerary and should not be substituted for A's much more active three-year Adventure route (which had no deaths).

The default V0 world remains threat-saturated: daily monster growth is +0.65 while guards offset about −0.30/day. Threat 3 occupied 99.6–99.7% of the sampled D1 policy years; safety frequently approached its floor. Yet population, food, and prosperity stayed near their bounds and autonomous NPC activity continued. This is evidence of persistent high threat alongside settlement continuity, not evidence that threat pressure has recovered or that all policies are equally safe.

## Controlled threat comparison (D2)

D2 tested finite in-memory variants against the same seeds and horizons; it does not select a production balance value. V0 is the synchronous control. G1 nearly removed monsters and reduced No Intervention/Life crises to about 15 per seed-century, but Adventure had zero crises/phase transitions and failed the validity rule. G2 retained roughly 66.7 crises per seed-century yet left Threat 3 at 93.96–99.35% of sampled time. K1 reduced Threat 3 to 23.60% No Intervention and 18.85% Life, but Adventure retained only 7.3 crises per seed-century and no local-defeat outcome. Population, food and prosperity remained stable in the tested checkpoints.

The comparison shows real tradeoffs among the tested candidates; it does not prove the absence of an intermediate balance. The Owner's recorded decision is **D-F1: KEEP V0 for Phase8**, with high threat saturation retained as a High product finding and future evaluation of a stable feedback design left to a later phase. No D2 variant was applied to `src/`.

## Phase7-K comparison and source correlation

Phase7-K used HEAD `e05cc78f1ef452e2672df223f2febf48444dcbd3` and `src/` fingerprint `585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58`. Its three unattended seeds reached Threat 3 at every checkpoint, with population 85.2–100 at year 10 and 90.205–100 at year 100; no player encounters or natural content-Boss defeats were recorded. D1 and D2 are not silently treated as reruns of that source: their manifests show `srcFingerprint` `6ab18dfe0259d99d4d74802c612b32268930926676e5d0312ae37513cda3f95d`; D1 attempt manifests use base HEAD `5e223beb2ef056968861bc4c7125c1fb41da8728`, while the corrected D2 comparison used base HEAD `c489ff18ac656d3c483a5b9d1b59e3d61257270b`. D2 changed only in-memory parameters. Current delivery HEAD is `9118454` (`src/` later unchanged across D1/D2 per identical fingerprints); base HEAD, product source fingerprint, and runner code are separate provenance fields.

| Evidence | Tested base HEAD | `src/` fingerprint | Interpretation |
|---|---|---|---|
| Phase7-K | `e05cc78` | `585f5e…b480ef58` | Reused Phase7 current-source unattended baseline. |
| D1 | `5e223be` | `6ab18d…3f95d` | V4 product source; six normal/controlled scenarios. |
| D2 | `c489ff1` | `6ab18d…3f95d` | Same product source as D1; in-memory parameter variants. |

## Limits

- Three seeds are a narrow sample; scenario policies are scripted. D1's no-intervention and controlled-start worlds do not measure player decision-making.
- Phase7-K event retention and serialized bytes cannot establish physical browser storage. D1/D2 did not report comparable save-size/event-cap measures.
- A checkpoint parity pass validates sampled save/reload and one-day continuation, not every migration, every long-term event order, or all possible routes.
- G1 Adventure's 0-crisis result is invalid evidence for that candidate, not a successful low-crisis balance target. The original and corrected attempts remain preserved.
- Browser regression/stress, real IndexedDB usage/quota, and browser-visible Long World behavior are pending F1.

## Verification and raw evidence

- D1 core test: `node --test scripts/phase8/test_world_crisis_core.mjs` — 3/3 PASS as recorded in [`d1-summary.md`](d-runner/d1-summary.md). D Max follow-up notes the worker environment could not independently rerun that command because of `spawn EPERM`; do not claim a new F2 execution.
- D1: six scenario runs × 3 seeds × years 10/50/100; 54/54 valid checkpoints, save/reload and continuation 54/54.
- D2: 12 runs × 3 seeds × years 10/50/100; 108/108 checkpoints and parity; 11/12 VALID, with G1 Adventure invalid as above.
- Attempts, manifests, per-seed data, checksums, failure attempts and comparison summaries are retained under `d-runner/`; no attempt is deleted by this report.
