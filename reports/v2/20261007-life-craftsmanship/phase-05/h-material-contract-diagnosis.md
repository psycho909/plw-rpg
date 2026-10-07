# H material provenance diagnosis and runner freeze

Status: the false-PASS cause is isolated to the browser runner and the runner contract fix is frozen. The original H raw artifact remains unchanged and is still not accepted. No product-source change was made. A fresh normal H pilot has not been run because the current Root release marker is revoked (`authorized: false`, no authorized modes).

## Diagnosis

The preserved run is `browser-runs/hybrid-short-20261007T083533Z-pid81573/`. Its result JSON has SHA-256 `0859a3dc9bd8239dfa3df012bb2e38b2e52479932666c180368534409fb2a1d8`; its operation log has SHA-256 `464b4be9f438641ed1ce0ebdcd42f71cc95766d741b058d0ecd5b62ca4c2db9b`. Both files remain unchanged.

The run legally acquired one `wolfFang`, gathered wood and stone, and displayed a live workbench plan with `starterSpear` and `wolfFang` selected after the gathering trips. The decisive operation sequence is:

1. Operation 70 explicitly selected the legally earned `wolfFang` option.
2. Operation 71 chose an influence material under `focus=balanced` immediately before crafting.
3. Operation 73 recorded item-2 with `craftProvenance.influenceMaterial: null` and `material: null`.

The old policy intentionally saved a singleton rare material under balanced focus (`owned > 1` was required to select it), so operation 71 returned the selection to neutral. The earlier planner observation was captured before that choice and was incorrectly reused as craft evidence. The raw result says `PASS`, but this run does not satisfy H and remains a false PASS; no H acceptance or I authorization was created.

The product path is consistent with the intended request: `PlaceWindow.vue` submits its currently selected material, `crafting.ts` passes the planned material to `generateItem`, and `itemGeneration.ts` writes that value to both item material and craft provenance. The raw trace and source inspection establish a harness policy/acceptance gap; they do not establish a production reset bug.

## Red evidence and pre-fix pins

Before implementation, `phase05_browser_driver.py` was `438080d1749cad35e04dd401f0cb350cb7212fe1a9286b9451e514fc12ab0ab9`. The unchanged test file before adding the regression was `e5ee8037d9751464ff6d14aeff8a437fe881c1ca1a8f464a67491e356c140ade`. The test with the new H policy assertion, before implementation, was `ac38128991f2eab56a56c1e341f35dd2ac03b78168d7198e175c6eff5668def1`.

The minimal RED command was:

```text
python -m unittest test_phase05_browser_driver.BrowserDriverLifecycleTest.test_hybrid_required_material_overrides_balanced_reserve_policy
```

It failed because the runner had no `choose_material_choice` seam (`AttributeError: module 'phase05_browser_driver' has no attribute 'choose_material_choice'`). That seam now expresses the missing rule directly: an H-required material takes priority, while an ordinary balanced Life craft still keeps a single rare material in reserve.

## Runner-only repair

`phase05_browser_driver.py` now accepts an H-required material on `craft_if_ready`, reselects it through the visible workbench control after all gather/preview interactions, and immediately before submit requires exactly one visible `aria-pressed` recipe and material control. After the visible craft, it checks the actual new instance's recipe/material/provenance and the active owner's reward-material ledger. It requires one craft debit, adjusting the net ledger delta only for matching `loot.material` events recorded during the craft interval. The evidence is written as `hybridCraftEvidence` and `hybrid-craft-contract`.

Only the Hybrid route passes `required_material="wolfFang"`. Optional normal Life policy remains unchanged. The runner does not click through state, write storage, retain rare material by mutation, or assume the previous planner selection is final.

## Verification and freeze

The pre-fix RED is preserved above. The final focused command passed:

```text
PYTHONDONTWRITEBYTECODE=1 python -m unittest test_phase05_browser_driver test_phase05_browser_support test_phase05_c_normal_pilot
Ran 22 tests in 1.478s — OK
```

Python compilation also passed for the driver, support, launcher and three browser test files before the final small driver/test edits; the final 22-test run imported and executed the edited driver and all three test modules. Generated `__pycache__` files were removed. No `src/` file changed.

Frozen browser QA file hashes for a Root release marker:

| File | SHA-256 |
|---|---|
| `phase05_browser_launcher.py` | `84c7f4429196180787be2de52b6cf05817078e41faac984813c6472125823297` |
| `phase05_browser_driver.py` | `7adf619295c44935daf1900e5744cd01145930554fef23a912660d17bfde0c15` |
| `phase05_browser_support.py` | `8572bdf613f7840d5818e7ec0de844c3f4501ce70fe66df71986c0a1e1f6572c` |
| `test_phase05_browser_driver.py` | `094536be78c82ca2810d0460f61740ffe394d8d40ee5aa41cbd72adb2920f3aa` |

Current provenance is HEAD `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, source fingerprint `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`, build-status SHA-256 `29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442`, and dist fingerprint `6824067c45cb8bcda82376c05fa763e1ca109d3be1dbdc8815b00549e5371d16`. `browser-release.json` still pins the pre-fix driver hash and has `authorized: false`; Root must write a new matching release marker before one fresh pilot can start.

The next pilot should pass explicit execution metadata (`--execution-model "GPT-6 Luna Max" --execution-effort max`); the launcher will continue to record `backendRuntimeVerified: false`. Keep the old raw result untouched and accept H only if the new raw evidence contains the immediate pressed selection, actual wolfFang provenance, one adjusted material debit, the native save/reload, and the normal return-combat outcome.

## Cloud workspace setup

The repository README requires Node.js 22.20+ and npm 10+; this workspace has Node.js 24.19.0, npm 11.9.0, and the existing `node_modules` install. The relevant repository scripts are `npm run test`, `npm run build` (typecheck plus Vite build), and `npm run check` (both); the full 425-test/typecheck/build evidence already exists for the unchanged source fingerprint. Python 3.12.14 and Playwright 1.62.0 are available. The Phase 5 runner explicitly launches `/usr/bin/chromium`, which is present as Chromium 151.0.7922.173. A blank-page Playwright launch/render/close smoke passed. No dependency, repository, or environment configuration changes were needed. The app-level H pilot remains gated by the Root release marker above.
