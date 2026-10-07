# Historical save fixtures for Phase5 migration work

These are real archived saves, retained as candidate regression inputs. No migration was run and no current state was used to manufacture a legacy fixture. All authored files were published through `scripts.recorded_reports.write_recorded`; each publication is appended to the phase directory `playlog.jsonl`.

| Fixture | Source | State | Transformation |
|---|---|---|---|
| [`legacy-v1-after-boss.save.json`](legacy-v1-after-boss.save.json) | `reports/playtests/20261003-comprehensive/adventure/after-boss-save.json` | V1, seed 909, time 224382, 1 character, 44 NPCs, 28 history entries | Byte-for-byte UTF-8 copy; parsed state also equals source. Original artifact SHA-256: `25cc063a3a5850bdeb9fcb37301811d9f5f0be34b07470a9919bab33296ce4ba`. The test report identifies source baseline commit `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`. |
| [`phase4-v2-stress-final.save.json`](phase4-v2-stress-final.save.json) | `reports/v2/20261006-reward-core/phase-04/archive/stress-browser-retry01.json`, field `final` | V2, seed 909, time 13376, 1 character, 29 NPCs, 2 history entries | Exact selected JSON value serialized to standalone JSON; parsed fixture equals source field. Runner source commit `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`, run `20261007T010452Z`. Its 74-file source SHA map matches Phase4 delivery fingerprint `71d8cc68aab5f09579b9c87f74b564b585d4ab792fee10e0712ded73037ec245`. |

Both summaries also record RNG state, inventory item units, procedural reward instances, typed material units, and threat state. Full artifact hashes, transformation notes, source context, and compact counts are in [`fixture-metadata.json`](fixture-metadata.json). The legacy V1 artifact has no embedded source commit; its report's baseline commit is recorded separately rather than inferred from the current checkout.
