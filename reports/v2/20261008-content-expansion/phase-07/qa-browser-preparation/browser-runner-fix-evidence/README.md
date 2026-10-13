# Browser runner lifecycle and reload speed contracts

RED was captured before the implementation in `lifecycle-speed-red.txt`. The focused suite could not import the not-yet-implemented `close_runner_resources` contract (`ImportError`), confirming the lifecycle regression contract was absent. The browser reproduction remains untouched at `k-ui-selector-20261013/runs/20261013T114000Z-selector-smoke`.

After the fix, the focused suite passed 16 tests; output is in `lifecycle-speed-green.txt`. The lifecycle test verifies CDP detach, context close, browser close, and only then Playwright stop; it injects a browser-close event-loop error and asserts it is recorded without replacing the existing check failure. The reload contract models the loaded default as ×1, validates `worldSpeedAfterReload == 1`, and independently verifies the originally selected speed is restored.

Checks run (no browser or product build):

- `python -m unittest reports/v2/20261008-content-expansion/phase-07/qa-browser-preparation/test_qa_browser_contract.py` — 16 passed.
- `python -m py_compile reports/v2/20261008-content-expansion/phase-07/qa_browser_runner.py reports/v2/20261008-content-expansion/phase-07/qa-browser-preparation/test_qa_browser_contract.py` — passed.
- `git diff --check -- reports/v2/20261008-content-expansion/phase-07/qa_browser_runner.py reports/v2/20261008-content-expansion/phase-07/qa-browser-preparation/test_qa_browser_contract.py` — passed.

SHA-256:

- runner: `9cf301463c2d67fe8ae735f9806f90b27287f76daf85b6edc3a646f5a0f68178`
- contract test: `20682f5110010b8f1b3b0b6557e51814550d3f8c71972a67b5f6ba38731042d5`
- RED output: `76f5e17a13967d2085726d3d602e4c58e06b4a972f2bfaaf963a8d96090ed211`
- GREEN output: `e99e9dcfb2cc454775d532dee5cf99ea85295938e649de72c869726bdde1dbef`

## Selector smoke Playwright lifecycle correction

The selector lifecycle contract was first run red and recorded in `selector-lifecycle-red.txt`: it failed because `browser-smoke.py` did not expose a cleanup seam that guaranteed browser closure before Playwright stop. The reproduced run `k-ui-selector-20261013/runs/20261013T114000Z-selector-smoke` and its screenshots/traceback were left unchanged.

The harness now explicitly starts Playwright and runs its browser checks in a `try/finally` inside the runner's outer result-handling scope. The inner finalizer closes the browser before stopping Playwright; each cleanup exception is recorded without escaping and replacing the check outcome. The outer finalizer therefore continues to provenance reporting and `status.json` publication. The contract injects the reproduced closed-event-loop error and verifies cleanup order plus preservation of the prior failed check. GREEN output is in `selector-lifecycle-green.txt` (17 tests passed).

Checks run without a browser or product build:

- `python -m unittest reports/v2/20261008-content-expansion/phase-07/qa-browser-preparation/test_qa_browser_contract.py` — 17 passed.
- `python -m py_compile reports/v2/20261008-content-expansion/phase-07/k-ui-selector-20261013/browser-smoke.py reports/v2/20261008-content-expansion/phase-07/qa-browser-preparation/test_qa_browser_contract.py` — passed.
- `git diff --check -- reports/v2/20261008-content-expansion/phase-07/k-ui-selector-20261013/browser-smoke.py reports/v2/20261008-content-expansion/phase-07/qa-browser-preparation/test_qa_browser_contract.py` — passed.

SHA-256:

- selector harness: `38c63204f2dd3aefeae35be4f5e053cd212edfde22273eab626fea1fd75a6c9b`
- contract test: `4b37ea05c7fb856cf5e9e48e083854cb4ea09d118854f7a262df181907b3bde4`
- RED output: `fe0904526a0439347f4b0b4de722e61dbbebea45676ea232dd4d689b590ab57e`
- GREEN output: `bcd0cf24f4255b66400567e8efbe5311d20e611ab6f2925b75537b11d9cf99d2`

## Selector smoke stale UI assumptions

The failing 20261013114550Z run remains unchanged (21 passed, 3 failed; browser errors and unhandled rejections were empty; source stability was true). Its inventory locator required accessible name exactly `物品`, while the desktop shortcut includes its visible `I` key label. The harness now matches the `物品` button name with an anchored pattern that permits the shortcut suffix. `PlaceWindow.vue` renders all entries of `CRAFTING_RECIPES`; that registry combines four legacy recipes with the content recipes, so total count 24 was not a stable contract. The smoke now asserts the intended `starterSpear` recipe ID exists once and that search resolves to that same ID.

A focused inventory-name contract first failed because the harness did not yet define its accepted accessible-name pattern (`selector-assumptions-red.txt`). After the harness update, all 18 contract tests passed (`selector-assumptions-green.txt`). No browser was launched for this correction, so runtime confirmation of these two repaired flows remains for the next approved smoke run.

Checks run:

- `python -m unittest reports/v2/20261008-content-expansion/phase-07/qa-browser-preparation/test_qa_browser_contract.py` — 18 passed.
- `python -m py_compile reports/v2/20261008-content-expansion/phase-07/k-ui-selector-20261013/browser-smoke.py reports/v2/20261008-content-expansion/phase-07/qa-browser-preparation/test_qa_browser_contract.py` — passed.
- Scoped `git diff --check` for the selector harness and contract test — passed.
- Frozen product source fingerprint from the preserved smoke: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`.

SHA-256:

- selector harness: `29852dfdea12f0c8e42d752906601082f9750fed814c965c335fad247e195d31`
- contract test: `903114bc3a0b5e9bb988241c9efb5893379999ef40768edc9e0347bbcefa7cae`
- RED output: `3b6dd1a7f2c6ec248583f18933d422c39927080a4d71b1ae10efaedfb3c8e50e`
- GREEN output: `154228f70084f61658a645732f5095c45d529f2622e464ebf90e3c4d6239aa95`
