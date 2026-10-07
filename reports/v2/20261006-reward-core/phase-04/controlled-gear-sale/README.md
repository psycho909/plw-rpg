# Controlled gear sale browser check

This is a short, separate controlled fixture check for the Phase 4 gear sale panel. It is **not normal play, an adventure exploration run, a stress test, a soak, or a full-suite result**. It must run separately from the in-progress Phase 4 long runners, after the root runner explicitly opens its Low gate.

`build_fixture.mjs` starts Vite in SSR mode and loads the recorded native V1 save from `reports/playtests/20261003-comprehensive/adventure/after-boss-save.json` through the current public `saveService.deserialize` migration. It does not use a newly created world as fixture state. The current validator internally calls `createGame` to obtain its schema template; only the provided recorded village save is migrated and retained. The builder uses public `awardWolfLoot` calls for a procedural elite item and the exclusive Wolf King moonFangSpear, serializes the result, then deserializes it again to prove current save validation accepts it. The exact source save, generated instance IDs, SHA-256 hashes, and control fields are in `fixture-metadata.json`.

The manually controlled save fields are the player's walkable position beside the existing blacksmith, the corresponding `currentRegion`, a direct forward clock set to 08:00 the next day without simulating skipped time, and a controlled RNG seed chosen from a bounded deterministic search to yield a procedural item with visible affixes. Village stage/unlock, actors, map, history, inventory baseline, active character, and source world come from the recorded village save. The checked-in fixture is tied to HEAD `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`, ALL74 source fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`, and uses the same current production application assets.

The browser entry point is `controlled_gear_sale.py`. It verifies the fixture and production build fingerprints before launch, seeds a fresh isolated Chromium context only when its local storage is empty, then checks affix comparison at 390px, cancel and Escape state preservation, displayed sale-price payout, instance removal, collection retention, the implemented worn-item disabled rule, absence of dangling equipment references, and save/reload persistence. It writes only its own JSON report and screenshots to this directory through `scripts.recorded_reports.write_recorded`.

To prepare and validate the fixture:

```bash
node reports/v2/20261006-reward-core/phase-04/controlled-gear-sale/build_fixture.mjs
python -m py_compile reports/v2/20261006-reward-core/phase-04/controlled-gear-sale/controlled_gear_sale.py
```

After the root agent opens the Low gate and confirms the existing app server/build are available, run exactly this one browser check:

```bash
python reports/v2/20261006-reward-core/phase-04/controlled-gear-sale/controlled_gear_sale.py
```

Set `PLW_V2_URL` only if the current production app server uses another local URL. Do not change any existing runner, shared helper, application source/configuration, or long-run process for this check.
