# Phase9 UX Findings — A–E Consolidation

This record consolidates the normal fresh-save observations, clearly labeled controlled fixtures, reviews and accepted fixes. An engineering finding describes what the interface exposes and what the tests/probes observed; it does not establish that a human player understands, enjoys or prefers it. Human goal clarity, fun and retention remain **DEFERRED**.

## Phase9-A baseline findings

| Priority / finding | Decision and current state | Evidence / next owner |
|---|---|---|
| P2 · Boss preparation information was thin: no factual level comparison and no expandable known mechanics, retreat effects or cooldown summary. | **Partially resolved in B.** High-rank details now give actual player/monster levels, discovery-gated mechanics and loot, retreat effects and configured cooldown. A danger score or recommended level remains intentionally absent because the current model does not define one; inventing one would imply unsupported precision. The remaining question is whether players find the supplied facts sufficient. | `ux-baseline.md` P9-02; `adventure-ux.md`; B review. Engineering follow-up: none unless a supported combat model is approved. Human clarity: Owner/Human gate. |
| P2 · Persistent HUD/navigation controls were clipped below common desktop/mobile viewport heights. | **Resolved in D.** Dynamic viewport shell allocation keeps measured controls in view over the tested 20 width/height combinations; 0/20 required controls were outside. This is tested viewport evidence, not physical-device coverage. | `ux-baseline.md` P9-01/P9-05; `responsive-visual-review.md`; D probe. F1 owns final browser regression. |
| P3 · Generic monster loot and registered recipe materials were difficult to distinguish and connect to known sources/uses. | **Resolved in C.** Inventory displays origin labels, and known source/use derives from the existing knowledge projection. Search now includes the displayed Chinese origin label. | `ux-baseline.md` P9-04; `life-crafting-ux.md`; C probe and C review fixes. |
| P9-03 controlled cap check; no new defect evidenced. | **No change.** Controlled workbench state displayed the cap, next recipe target, material counts and a textual disabled-action reason. This does not erase Phase8-E's zero-XP chore-risk evidence below. | `ux-baseline.md` controlled-cap section; A controlled fixture seed 94103; Phase8 `life-progression.md`. No follow-up owner unless human testing changes the product decision. |

## B–E review findings and dispositions

| Review finding | Disposition | Evidence / next owner |
|---|---|---|
| B P2(a): delivery-square destination copied a coordinate instead of using `LIVING_EVENT_LIMITS.deliverySquare`. | **Resolved** in B review fixes; projection test asserts canonical destination. | `b-review/b-review.md`; `b-runner/b-summary.md`; `goal-information-architecture.md`. |
| B P2(b): wolf fixed-core preparation descriptions lived in `PlaceWindow.vue` separately from combat cue presentation. | **Resolved** in B review fixes; `wolfCorePresentation` is shared by preparation and combat wording and has a regression assertion. | B review, B summary, `src/engine/wolfFamily.ts` tests as recorded by B. |
| B P3: `docs/UI.md` described the completed B probe as pending. | **Resolved** in the B documentation follow-up; the final attempt path is linked. | `docs/UI.md`; `b-review/b-review.md`; `b-runner/probe-20261015T093111935Z/`. |
| B product finding: modal focus trap skipped native `<summary>` controls. | **Resolved** by adding `details > summary`; final probe exercised native Tab, Shift+Tab, Enter, Space and hit-tested click on all 16 details. The first probe's injected tabindex attempt is retained as a masking diagnostic, not acceptance evidence. | `goal-information-architecture.md`; `adventure-ux.md`; final B probe. |
| C P3(a): inventory search indexed internal origin enums rather than the displayed Chinese origin label. | **Resolved** by shared label/search-index presentation and a label-search assertion. | `c-review/c-review.md`; `c-runner/c-summary.md`; C tests. |
| C P3(b): `adventure-ux.md` had a stale pending sentence after the C probe completed. | **Resolved**; after-evidence replaces the stale status. | C review and summary; `adventure-ux.md`. |
| D P3: generic `[tabindex]` selector could include visible disabled controls in modal Tab order. | **Resolved** with native/ARIA disabled filtering and regression tests. Follow-up disposition is RESOLVED / ACCEPTED; modal-focus suite 4/4, full check 40/647. | `d-review/d-review-followup.md`; D summary and final check log. |
| E P3: completion reports said build/probe were pending after artifacts existed. | **Resolved** across E summary, world feedback and responsive visual review; independent follow-up accepted the synchronization. | `e-review/e-review-followup.md`; `e-runner/npm-run-check-e.log`; final E probe. |

E source feedback fixes are also reflected in the findings: successful crafting reports the plan's real practice amount; boss victory notice combines the boss result and existing combat reward. The fresh-save E run observed +10 matching the plan's +10 XP, and the controlled Goblin Chief run observed the combined result/reward notice and separate log entries. The notice omits the “XP” unit; the displayed value is cross-checked against the plan. No post-cap craft was browser-tested.

## Intentionally unchanged within Phase9

- No explicit numeric boss danger estimate or recommended level was added. Existing UI now exposes actual levels, eligibility reasons, discovery-limited mechanics/loot, retreat effects and applicable cooldowns. A human comprehension judgment remains deferred.
- No Phase8 threat, crop, combat, loot, economy, or save-schema value was changed. No forced quest, daily checklist, completion tracking, additional modal or persistent notification feed was added.
- C's existing material-source knowledge remains discovery-gated; no second collection database or encyclopedic catalog was introduced.
- E did not attempt a post-cap craft on the normal fresh-save route. A's separate engine-generated cap fixture tests that cap/blocker/next-target copy is visible; it is not evidence about the frequency or feel of normal player crafting.
- NPC state-change, several settlement/property/reputation actions and some crisis outcomes were source-reviewed or covered by earlier controlled C/A evidence rather than newly traversed as E fresh-save flows. Do not upgrade them to new E browser observations.
- A–E viewport/browser automation is not cross-browser or physical-device testing; Phase9-F final browser/stress/performance reports remain F1-owned.

## Phase8 product findings carried into Phase9-F

These remain distinct from Phase9 UI defects and retain their prior evidence lane and qualification.

| Finding | Current decision / evidence boundary | Next owner |
|---|---|---|
| D-F1 — long-run Threat 3 saturation under default V0 values (High product finding). | **Owner decision: KEEP V0 for Phase8.** Phase9 only improved presentation; no balance/source change. Revisit in a later approved design phase with broader parameter coverage; tested variants do not prove no intermediate balance point exists. | Product Owner at a future balance-design gate. |
| Merchant stock/restock. | **NOT MODELED.** Current economy evidence does not include stock volume, restock, or demand; this neither proves an exploit nor healthy merchant economy. No economy conclusion should infer stock behavior. | Owner to scope any future merchant-economy study. |
| E-F1 — 1,276 / 1,423 no-progress markers. | Only low-confidence classification is “no understandable next goal”; 147 are runner daily-encounter-cap limited, not legitimate world waiting. This does not measure actual player goal clarity. | Human Product gate; DEFERRED. |
| E-F2 / B-F1 — visible Boss eligibility and reasons, no explicit danger estimate/recommended level. | Existing UI now adds factual comparisons and preparation details, but still does not invent danger metrics. Phase8 evidence is not a player comprehension study. | Human Product gate for comprehension; Product Owner only if an approved model/change is proposed. |
| E-F3 — zero-XP capped crafts without another legal XP-yielding recipe at those decision times. | Phase8 r9 joins show 676 total `starterSpear` crafts per Life seed, 6 XP-yielding and 670 zero-XP; at the zero-XP moments no alternate legal recipe was projected, although trade actions existed. Keep this as a starterSpear chore-risk signal, not a universal life-progression requirement or player-perception result. A's cap UI fixture showed the explicit cap and next target. | Product Owner at a future progression review; Human Product perception DEFERRED. |
| B-F2 — Boss ID × progression-band difficulty spread. | Controlled results showed context-dependent difficulty; no Phase9 stat edit is authorized by that evidence. The Phase8 final review retained this as a qualified design finding. | Product Owner if future combat tuning is authorized. |

## Confidence boundary

Normal fresh-save probes, controlled engine-generated starting saves, source review and automated tests answer different questions and are not pooled. Controlled crisis/cap/boss results are always labeled as fixtures. “Clear” or “fixed” below means the relevant UI behavior was measured or its source/test contract was verified; it does not mean a human judged the information understandable or enjoyable.
