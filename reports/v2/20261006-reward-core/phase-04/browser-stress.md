# Phase 4 production browser stress

**Status: PASS for the integrated 20-minute browser-stress scope, with findings.** The original failed attempt and the earlier aggregate final-runtime failure remain preserved and are not overwritten by this passing retry.

## Run identity

Passing retry artifact: `archive/stress-browser-retry01.json`, run `20261007T010452Z`. Actual browser run: `2026-10-07T01:04:53.293106Z`–`01:24:53.984031Z`, 1,200.691 seconds. The 19 named checks passed. The last check records 1,499 cycles, seven reloads and 20+ minutes. It used Chromium 151.0.7922.173, an unmodified fresh Level 1 / 45 gold save (`saveInjected=false`), and no controlled fixture.

The runner used source commit `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`; all 74 `src/` fingerprints matched the stored production build manifest (aggregate source fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`). Source, harness and helpers stayed stable. Build status SHA-256 is `14bc6d8d34628f28bfba714922bb0070225ab661f51c52c7ace6aabc62dbe987`; retry harness SHA-256 is `9c3524bed787729051e79a0d08e23950943e1637b09cdbfa38440b3fb2a78218`. The launcher status confirms provenance stable, runner exit 0 and that its owned static server was closed at completion.

## Progression and lifecycle evidence

The opening checkpoint at 0.667 seconds was world time 480: fresh Level 1 Alden, 100/100 HP, 84 stamina, 45 gold, 30 living residents, monster population 12, 78,928-byte save, zero pending journal records, 2,174 DOM nodes, 449 listeners and 6,341,484 bytes used JS heap.

The last scheduled checkpoint was at 1,143.663 seconds (UTC `01:23:56.956122Z`), world time 13,139: alive Level 7, 136/136 HP, 19 stamina, 318 gold; all five wolf ranks had been defeated and the Wolf King was defeated at world time 5,896. It recorded 150 events, two history entries, zero pending journal records, 105,707-byte save, 472,706-byte storage estimate, 2,242 DOM nodes, 462 listeners and 9,692,492 bytes used JS heap. The boss was not alive at this checkpoint.

The true final game-state snapshot is separate from that scheduled checkpoint. At 1,200.691 seconds it was world time 13,376: alive Level 7 Alden, 136/136 HP, 44 stamina, 322 gold, in the forest at (7,6), no active combat. `reward.equipped.alden` retained weapon item-4 (Rare Moon Fang Spear) and armor item-3 (Rare Chain Armor); collection contains all five seen/defeated wolf ranks, Wolf King, Moon Fang Spear, and the three wolf materials. The final app snapshot does not include heap/DOM/storage telemetry; do not present last-checkpoint counters as final counters.

The stress sequence had five successful rank wins, including Scarred Wolf, Alpha Wolf, Pack Leader and Wolf King. It exercised cue-based defense, normal rare/affix loot, Wolf King save/reload at turn 2, flee/retrack with the same boss form and unchanged RNG state, the exclusive Rare Moon Fang Spear reward, Moonstone, and the boss cooldown after legal population recovery. Seven explicit native reload checks confirmed saved state/rewards and no offline time. The artifact records 42 fight actions, 1,503 same-pane gear comparisons and four visible first-discovery loot events. Four real gear upgrades were equipped: Common spear (+5 attack), Uncommon bleeding short sword (+1 bleed), Rare blocking/sturdy chain armor (+7 defense, +8% block), then Rare Moon Fang Spear (+2 attack, +3% crit, +2 penetration, +1 bleed versus the equipped short sword). Two keep-current decisions are logged.

The normal save remained a hamlet without a blacksmith. Sale readiness and the one sale attempt were blocked by natural settlement progression; no sale result is claimed. The runner performed 1,499 gear/modal cycles (1503 comparisons) and 17 legal rest routes. The integrated sequence covers inspection, comparison, equipment, collection, boss progression, reload and modals, but does not establish an available sell action in a naturally progressed settlement.

## Telemetry and errors

Across 21 scheduled checkpoints, used heap ranged from 6,341,484 bytes (initial) to 29,919,248 bytes at 902.925 seconds, then measured 9,692,492 at the last checkpoint. Total heap ranged 10,555,392–60,608,512 bytes. DOM nodes ranged 2,174–3,729 and listeners 449–587; both fell from their peaks to 2,242 / 462 by the last checkpoint. Save bytes ranged 78,928–105,769 and were 105,707 at the last checkpoint. Browser storage estimate rose from 2,398 to 472,706 bytes as the save/world progressed. Pending journal records remained zero at all checkpoints.

Across 1,910 measured localStorage writes, latency median was 0.2 ms, P95 0.6 ms, maximum 5.8 ms. The UI responsiveness series contains 3,001 action observations: median 34.36 ms, P95 51.48 ms, maximum 87.76 ms (discovery-modal cycle). These measurements show fluctuating counters and progressing persistent state, not monotonic heap/DOM/listener growth. There is no new §41 evidence requiring a 60/120-minute extension. This does not close inherited C01–C03 or prove behavior beyond this 20-minute run.

There were zero page errors, unhandled rejections and storage errors. The console recorded one missing `/favicon.ico` 404. It did not interrupt the run. Human Fun Gate, feedback and retention survey remain `DEFERRED / NOT APPLICABLE AT THIS STAGE`.

## Preserved failure and gate boundary

The original `archive/stress-browser.json` is still a failed 31.919-second attempt. It timed out reading the Wolf King reward expectation after the dialog closed; this was the runner lifecycle/selector failure. `archive/stress-browser-retry01.json` is the distinct completed 20-minute retry that passed. The earlier aggregate final-runtime result remains `FAILED` because of its separate orchestration/report-consumption failure; this stress PASS does not rewrite that aggregate status.

Artifacts: passing retry `archive/stress-browser-retry01.json`; launcher provenance/status `final-runs/stress-browser-retry01-20261007T010451Z-pid46028/launcher-status.json`; original failure `archive/stress-browser.json`. No human, retention or product-readiness gate is claimed.


## Separate controlled sale check

The normal fresh-save stress run remained a hamlet without a blacksmith, so its sale path was blocked by actual settlement progression. A separate controlled fixture later passed eight sale-panel checks, including pricing, cancel/Escape, worn-boss-gear disablement, collection retention, and native save/reload without ghost references. See `browser-regression.md` and `controlled-gear-sale/controlled-gear-sale.json`. This fixture is outside the stress scope and does not establish normal-play sale access or economy balance.
