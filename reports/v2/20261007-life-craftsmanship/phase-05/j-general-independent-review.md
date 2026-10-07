# Phase 5 general independent review

Disposition: **ACCEPT** for the reviewed UI, pricing, and runner implementation snapshot. The unresolved-return-combat finding below was fixed and independently rechecked before this final disposition. This review does not accept the remaining Phase 5 gates; H/I/J runtime and Human validation are still pending, with Human validation explicitly deferred.

## Scope and snapshot

- Ticket: `tickets/20261007-v2x-05-life-craftsmanship.md`; review basis: Phase 5 spec and `reports/v2/20261007-life-craftsmanship/phase-05/slice-decisions.md`.
- Base/current HEAD: `1a56cd3eeb2ea65114a5dcf03c0e00504b69239f`. The review covered the current unstaged tracked diff (`git diff -- <reviewed paths>`) and the complete current contents of relevant untracked files. The working tree is shared and dirty; no staged changes were present in the reviewed paths.
- Reviewer: independent general reviewer, requested role `g6_luna_med_phase5_final_reviewer`; requested model attribution GPT-6 Luna / medium, backend runtime not verified. Not an implementation owner.
- Hashes below pin the reviewed files. Changes after this snapshot require review of the changed files and their affected behavior.

## Findings


**Resolved before final review:** the original runner allowed a time-capped Hybrid return fight to return normally without a terminal event, after which the main routine could promote it to PASS. The final version checks for a post-start `combat.won` event and no active combat; otherwise it records `BLOCKED_RETURN_COMBAT_UNRESOLVED`. I confirmed the guard and its unfinished / resolved-without-victory / victory cases in the focused driver tests.

Earlier harness findings were fixed before this snapshot: Life note generation now initializes and populates the selected recipe state; the planner parser reads the rendered “鍛造熟練度 需求 Lv.N” text and scores locked goals; Hybrid mode marks completed routines while preserving blockers; and run metadata explicitly says the action controller is a deterministic runner policy with no model inference. The original first-note failure remains preserved in `browser-driver-life-note-red.json`. A prior concern about note-state shape was withdrawn after confirming line 729 stores the full raw state.

## Review results

The Phase 5 workbench uses the engine plan for station, hours, input counts, skill, quality, cost, and denial copy. Material selection resets when a newly selected recipe does not allow the selected material. The success result hands the generated instance to the existing Inventory detail/comparison/equip path; the new provenance projection displays maker, time, recipe, and Masterpiece state. Identity labels come from engine identities. The accessible button groups, pressed states, heading labels, status messages, modal handoff, and result focus path are present in the source. I found no UI-only duplicate transaction or progression rule that supersedes the engine plan.

The crafted sale premium follows the released formula: legacy gear retains the exact prior base-by-rarity price, while crafted affix and Masterpiece premiums are independently bounded and combined under the 25% cap. Tests cover unchanged legacy prices, the same-item Masterpiece delta, the cap, and the worst-case expected purchased-input bound across the recipe/material modes. No evidence in the reviewed sale path suggests Masterpiece premium is consumed by the affix component or changes legacy prices.

The browser support/launcher code pins recursive source, build inputs, dist assets, build-status bytes, and owned helper hashes; validates the served production bytes; starts an isolated Chromium context; observes storage before app startup; captures page/console/rejection/storage failures; and performs state mutations through rendered controls. The Life run has ten-minute progress/drought notes and now records the adaptive policy inputs and distinguishes runner policy from model inference. Route planning reads the map to choose paths but moves only through visible direction controls. C pilot artifacts show the earlier opener/navigation/cleanup repairs were exercised; the preserved full C pilot `c-normal-20261007T040512Z-pid65042` is PASS for the earlier source snapshot, not the current G snapshot.

The inert I runner explicitly reports `transactionCount: 0` and says it samples real craft-context generation without deducting inventory/gold/stamina, advancing time, or emitting transaction history. Its controlled Smithing/material fixtures, generated Masterpiece clone control, and combat matrix labels are documented separately from normal browser play. Combat rows are paired against legacy on the same seed, progression band, target, and action policy, with save/reload replay equality. No I release file is present in the reviewed snapshot; no Monte Carlo or combat simulation result is claimed here.

## Verification evidence and limits

I ran these narrow runner checks after the Life/hybrid fixes and policy parser update:

- `python reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_support.py` — 3 passed.
- `python reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_c_normal_pilot.py` — 3 passed.
- `python reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py` — 5 passed.
- `python -m py_compile` on `phase05_browser_driver.py`, `phase05_browser_launcher.py`, and `phase05_browser_support.py` — passed.

No production build or current-source browser run was performed by this reviewer. The recorded C browser PASS and previous G UI build are historical evidence for their recorded source fingerprints. Root’s fresh G build and later H/I/J releases remain the required runtime gates. Human product validation is **DEFERRED**.

## Reviewed file hashes

```text
src/App.vue 6a4cb4bd521c671a5428eae511b1c10270bf1a74355a0cd3dd42cb0cafef1972
src/components/PlaceWindow.vue 815c541a39d79de566e06d4f733d1b138df36c0ba158318e030a6e9ecc82a7d5
src/components/InventoryWindow.vue 12794d34b5d7df1902804f36698c26d58f0c46e3ec8f8bcd4519b075d2ad4609
src/components/CharacterSheet.vue 0905f39da0b3ba52ed2c8c4c852ce08bc96a5e80d925cb64bb1f3dcb5b0d0dbd
src/components/IdentityWindow.vue 982afc32143581311c9a014236e3e2a75e1a40b8f04f8fe97796c542966f7f06
src/stores/gameStore.ts b5d18a378cf4b05d05a37a2825e7eff045fd1ef68ac0714076b8f7c049bf5ac2
src/presentation/craftingProjection.ts 26e70a094527b49ed17cf4e8a802d8e32f145789b13cb78d5b1825d70ce80dbf
src/presentation/craftingProjection.test.ts 9e267bcd768b9ee7238ff6c6c7e669df5b7fa987fd872c7bf2848aee5d1090ce
src/presentation/rewardProjection.ts 969498139ed5fa7b221378d939032d7948904c242ea3d3691657728293603d92
src/presentation/rewardProjection.test.ts cb54650c0885c3c1c245a9eb7d599fa63589f7543fb1c7514fd570d6e1244d86
src/engine/rewardActions.ts e65c62d7477347152fa63cf208aaa06f76cd69371ca79cbdebb541cb7553f4c1
src/engine/rewardActions.test.ts 0b8972f23231416b0cff9d4f8af8d8cc4c79804bdb1a971c437e0581ca5a7c7f
src/style.scss 39ff3ebf848b580a2e80da3a65860bf9f401623deae77efe161d80ad123a9f46
docs/UI.md fca8a5d3e5c27ee36ec84824efd2dffa5069bbd8c4c32d58106620c18e2cae1e
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_support.py 8572bdf613f7840d5818e7ec0de844c3f4501ce70fe66df71986c0a1e1f6572c
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py ff87148ac8ddecf37580df9774fee88df31e753b82e654b7c0c8d11433aa1df6
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_launcher.py 84c7f4429196180787be2de52b6cf05817078e41faac984813c6472125823297
reports/v2/20261007-life-craftsmanship/phase-05/phase05_c_normal_pilot.py 1b527573a4f130c65bb9e423286a114f99ad792ec3f8c03da71b0e51dbec1b2d
reports/v2/20261007-life-craftsmanship/phase-05/phase05_i_simulation.test.ts 0966d69e8832e1ed76958ca0c53ec0c606eb5cddb5b194dbac424b40a5247bf4
reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py 623d9010c73f887d170cf396a4e2bb1e91d4ee224a069ecd9728f6d95789323b
```

## Follow-up review: Chromium 151 CDP compatibility

The hash pins above remain the historical overall-review snapshot. I separately reviewed the runner-only CDP compatibility patch after the original H startup failure. The original failed run remains preserved at `browser-runs/hybrid-short-20261007T050755Z-pid73650`; its recorded failure is `Memory.enable` unsupported, after 1.07 seconds, with zero gameplay operations and zero reloads.

The current driver removes both unsupported domain-enable assumptions. It probes the independent `Performance.enable`, `Memory.getDOMCounters`, `Runtime.getHeapUsage`, and `Performance.getMetrics` commands; each unavailable metric is recorded under `profilingLimitations` and does not overwrite browser errors or run status. When direct heap usage is absent, the checkpoint falls back to JS heap values from Performance metrics. The recorded Chromium 151 (`151.0.7922.173`) smoke confirms all four commands on `about:blank`; it exercised no application, save, UI action, or gameplay. The original failure remains the authoritative failure record and was not rewritten.

Independent follow-up verification:

- `test_phase05_browser_support.py` — 3 passed.
- `test_phase05_c_normal_pilot.py` — 3 passed.
- `test_phase05_browser_driver.py` — 6 passed.
- `py_compile` for the browser driver, launcher, and support helper — passed.

Follow-up hashes:

```text
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py 5c15bb9f1c4b1673fbdc3a84f3cf697be162b9c80ccf5f984e47beb81bdd0458
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_launcher.py 84c7f4429196180787be2de52b6cf05817078e41faac984813c6472125823297
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_support.py 8572bdf613f7840d5818e7ec0de844c3f4501ce70fe66df71986c0a1e1f6572c
reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py 25e303678c094d3e041c5badad5fd94fa2dd5f8f18e2e7e1e62876807e10ac36
reports/v2/20261007-life-craftsmanship/phase-05/browser-driver-cdp-compat-red.json f22534d0ba4591e5b32eaaac6a849d894dc55e3b52f77fe6d722e739ad139bd4
reports/v2/20261007-life-craftsmanship/phase-05/browser-driver-cdp-compat-green.json eda4152dadd6d3ae692490ba3877c9b348ddea41b98626b8a68d042dfde4f9ac
reports/v2/20261007-life-craftsmanship/phase-05/browser-runs/hybrid-short-20261007T050755Z-pid73650/hybrid-short-result.json 3766ec4392b5f3ffb8862c6f0b01af21437dc8bb7855f9ab76abe7fd01fc2306
```

The compatibility fix is accepted for the reviewed harness startup path. It does not constitute a new H browser gameplay pass; a fresh source/build-correlated H run remains necessary.

## Follow-up review: H2 icon-prefixed gather locator

The historical overall review and its earlier follow-up hashes remain unchanged. I retargeted the H2 runner-only gather-selector change after the original `hybrid-short-20261007T052830Z-pid76332` attempt ended `BLOCKED_HYBRID_INPUT_GATHER` with a visible planner request for wood but `actionVisible: false`.

The preserved source evidence identifies a harness locator mismatch: `PlaceWindow.vue` renders the button as `{{ itemIcons[kind] }} 伐木`, and `itemIcons.wood` is `🪵`. The driver's exact accessible-name query for `伐木` therefore returned zero matches for the real button name `🪵 伐木`. The current runner uses a regex locator for the three known resource labels (`伐木`, `採石`, `採鐵礦`) and still requires that the locator resolve to a visible, enabled button before clicking it. It does not force a click or mutate product state. The raw H2 failure remains preserved in `browser-driver-gather-red.json`.

The recorded real-browser gather smoke found zero exact matches and one substring match for the wood action; clicking that visible normal control raised wood from 0 to 2 with no page, console, request, HTTP, or storage errors. Its `buildSourceMatch` is false because it used the previous `dist` while J9 source work was underway. This smoke confirms the locator diagnosis and action only; it is not a source/build-correlated H acceptance or product gather defect.

Independent follow-up verification:

- `test_phase05_browser_support.py` — 3 passed.
- `test_phase05_c_normal_pilot.py` — 3 passed.
- `test_phase05_browser_driver.py` — 7 passed, including icon-prefixed resource names.
- `py_compile` for the browser driver, launcher, and support helper — passed.

Follow-up hashes:

```text
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py 8a64c37bc58ff60f7db4623e9ed3b3c5e55e3c01cac16bd9377c6eaf0bdbf68b
reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py 2749275510450f1e0c976ba3cd5fd1197c966dc24361bc2be89dd7c6bc65fa79
reports/v2/20261007-life-craftsmanship/phase-05/browser-driver-gather-red.json 10cdeb92b92bba0c564a9e66860f43b966813b114b0820ada57fedf3c00a4c71
reports/v2/20261007-life-craftsmanship/phase-05/browser-driver-gather-green.json 75c688ace9a0d042c801911bf852b49a067792eddfdf23c0c31c4d918a48fbe4
reports/v2/20261007-life-craftsmanship/phase-05/browser-runs/hybrid-short-20261007T052830Z-pid76332/hybrid-short-result.json f4333d5f791b18028252999269c214c916f2ab97d4773f21740fc69617e60d35
reports/v2/20261007-life-craftsmanship/phase-05/browser-runs/gather-smoke-20261007T053243Z/gather-smoke-result.json 0cad74f25a0539723c405beed1308e0cd2d78a8d291e72f4212704153fba6803
```

The gather-selector fix is accepted for this narrow harness issue. The original H failure and this limited smoke remain separate from the next fresh source/build-correlated H run.

## Follow-up review: live navigation and crafted-instance contract

I independently reviewed the frozen browser-contract delta at source commit `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`. The driver resolves a region interaction from the current rendered map tile's accessible label and resolves a building interaction from its visible `.building-name`; it rejects missing, undiscovered, ambiguous, or stale targets rather than guessing. The farm route falls back to the actual walkable `farmland` region when no farm building is present. Existing focused tests exercise live mine/store labels, registry labels, the farmland fallback, and material-shortage-to-region/action mapping.

The craft-result bridge reads the new instance ID from the ordinary save snapshot, opens the visible result action, selects the inventory row with that exact `data-instance-id`, verifies selection, and equips that same instance through the visible comparison action. It then checks the saved equipped slot. Source-contract assertions tie those expectations to the Vue result, App focus prop, inventory row/detail/equip controls, and native save/reload path. The driver remains read-only with respect to localStorage and contains no forced Playwright click.

I independently ran `test_phase05_browser_driver.py` (14 passed), `test_phase05_browser_support.py` (3 passed), and `py_compile` on the driver, launcher, and support helper (passed). This is a focused harness review only: the green artifact explicitly says no production build or browser run was executed and browser release is unauthorized. It does not certify a full H pilot or long run.

Follow-up hashes:

```text
reports/v2/20261007-life-craftsmanship/phase-05/phase05_browser_driver.py 438080d1749cad35e04dd401f0cb350cb7212fe1a9286b9451e514fc12ab0ab9
reports/v2/20261007-life-craftsmanship/phase-05/test_phase05_browser_driver.py e5ee8037d9751464ff6d14aeff8a437fe881c1ca1a8f464a67491e356c140ade
reports/v2/20261007-life-craftsmanship/phase-05/browser-driver-live-navigation-contract-red.json 7d67fd16c6b57bd7c2e3a73f24c8e8af6fdd533ac776765d05c6299d0247aabf
reports/v2/20261007-life-craftsmanship/phase-05/browser-driver-live-navigation-contract-green.json 35fcf0a53509cc411299df5e2278c11e7c4f1ad35e7e94021bf26632359c7c29
```

I found no blocking issue in this frozen delta. It is accepted for the reviewed navigation and craft-result contract only; source/build-correlated H validation remains outstanding.
