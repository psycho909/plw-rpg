# Phase 5 J regression

**PASS after capacity safeguards** — `npm run check` exited **0** at 2026-10-07T05:35:04.184518+00:00. Vitest passed **22/22 files and 425/425 tests**; `vue-tsc --noEmit` and Vite **7.3.6** production build passed. Browser support `validate_build` accepted the new build evidence. This is a full check only; no browser or Monte Carlo run is claimed.

Requested attribution: **gpt-6-luna / low**, agent `g6_luna_low_phase5_qa_runner`; backend runtime is unverified. Environment: Python **3.12.14**, Node **v24.19.0**, npm **11.9.0**, Vitest **4.1.11**.

## Current frozen evidence

- Base HEAD before and after: `1a56cd3eeb2ea65114a5dcf03c0e00504b69239f` (unchanged).
- Recursive working source: **79 files**, including untracked files. Fingerprint before and after: `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb` (unchanged). Exact path-to-SHA-256 maps: [`j-full-check-runs/20261007T053450Z-58555c07/source-before.json`](j-full-check-runs/20261007T053450Z-58555c07/source-before.json), [`j-full-check-runs/20261007T053450Z-58555c07/source-after.json`](j-full-check-runs/20261007T053450Z-58555c07/source-after.json).
- Build inputs, this wrapper, and `scripts/recorded_reports.py` remained unchanged. Current dist has **3 files**, fingerprint `6824067c45cb8bcda82376c05fa763e1ca109d3be1dbdc8815b00549e5371d16`.
- Current `j-full-check-status.json` SHA-256: `d7701aa1cfe9aa32ad81f2d3250114e6cb17aa45d8a9f444fc5270890929198c`. Current `build-status.json` SHA-256: `29b54af491df360466d61e43da51e4ac22b94f333d0c46aa90def67da85aa442`.
- Raw stdout/stderr, exit code, environment, timestamps, and pre/post snapshots: [`j-full-check-runs/20261007T053450Z-58555c07`](j-full-check-runs/20261007T053450Z-58555c07).

## Earlier evidence retained

The prior **423/423 PASS** remains in [`j-full-check-runs/20261007T052610Z-d96674d0`](j-full-check-runs/20261007T052610Z-d96674d0); its status SHA was `ba3ce27064504f8d98127ccd78dc83aaba88407962383c2868542553ef4fb799`. The previous **420/420 PASS** remains in [`j-full-check-runs/20261007T050201Z-f3522b8b`](j-full-check-runs/20261007T050201Z-f3522b8b); its status SHA `cd4a293da2cc6f41625da8285614a7350742591505c3f450e1c57f59a367e6ad` is preserved in recorded-report history.

The original B full-check remains **335/340 passed, 5 failed** in [`b-full-check-status.json`](b-full-check-status.json), with original logs in [`b-full-check-20261007T022236Z/`](b-full-check-20261007T022236Z/). [`b-full-check-fix-addendum.md`](b-full-check-fix-addendum.md) records that synthetic V1 builders retained newer Smithing/event-tier data and were corrected; save-version expectations changed to 3 without relaxing validation.

Both H attempts remain separate raw failures and are not Hybrid passes. The first, [`browser-runs/hybrid-short-20261007T050755Z-pid73650`](browser-runs/hybrid-short-20261007T050755Z-pid73650), failed before UI actions because Chromium rejected `Memory.enable`. The later [`browser-runs/hybrid-short-20261007T052830Z-pid76332`](browser-runs/hybrid-short-20261007T052830Z-pid76332) completed the normal wolf victory and recorded wolfFang +1 / moonStone +1, then stopped because the starter recipe needed wood 3 and stone 2, both at zero, and no visible wood gathering action was available in the forest. It performed no craft/equip/reload/return-combat flow. These run artifacts remain unchanged.

## Script metadata

- Full-check wrapper `phase05_j_full_check.py`: SHA-256 `527f3cd72ccc6c771d13281b36bff0cf2c3545886df27a93bb22b6f9c19f11ed`.
- Report recorder `scripts/recorded_reports.py`: SHA-256 `bc09dc981267e9cdfaf63103b260c052417b2ff675e551cd2677986f9231962b`.
