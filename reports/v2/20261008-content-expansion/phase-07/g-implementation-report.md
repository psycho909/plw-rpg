# Phase 7-G Crop Integration Evidence

Implemented the released crop integration scope against the authored `FARM_CROP_CONTENT` pack. The pack source `src/data/content/farmCrops.ts` remained read-only. The runtime registry/reward catalog now exposes all 11 crop/good pairs alongside legacy wheat. `farm(state, action, cropId?)` keeps wheat as the default, rejects unknown/out-of-season/non-farmland planting before mutation, uses registered growth and yield, and awards authored harvests only as material goods. Existing wheat harvest remains inventory food. The new inventory action converts an owned crop good into the exact declared food value while consuming the same material stack; converted food works with the existing farm-business supply path and goods remain sellable. The farm UI offers the current season's crops in an accessible button group, plots/map marks display crop names and growth progress, and inventory lists conversion value/action. Selection remains component-local and falls back to wheat when the season changes.

## RED / GREEN

- Initial RED: `g-integration-run/initial-red/`; `npm exec -- vitest run src/engine/crops.integration.test.ts` exited 1 (1 failed). The public call `farm(state, 'plant', 'spring_pea')` planted `wheat`; exact stdout/stderr, source SHA and HEAD are retained there.
- First GREEN: `g-integration-run/first-green/`; the same focused test passed after registry and farm integration.
- Final focused validation: `g-integration-run/verification-final-02/`; 5 test files passed, 82 tests passed, exit 0. Coverage includes default wheat growth/yield, registered seasonal planting, unknown/out-of-season/wrong-region no-mutation rejection, dynamic good harvest, crop save/reload, all 11 conversion values, bounded conversion/accounting, material sale, safe stack overflow rejection, map crop names/progress, and converted-food acceptance/consumption through `supplyFarmFood`.
- `npm exec -- vue-tsc --noEmit` exited 0; raw output and matching source hashes are in `verification-final-02/`.
- Seven-pack merged content CLI exited 0 with content validation PASS, child content-validation tests PASS, and child typecheck PASS. Captured pack SHA-256: `67940cf6d922530da76c02fe7490ba73512f08ab02ffc234bbdd4b68d4a21f52`; registry extraction has 11 crops and 11 crop goods. Raw stdout/stderr, command exit, source fingerprint and extraction manifest are in `merged-validator-run/`. A second extraction corrected only the helper's pack label to identify the interleaved G pack; it produced the identical combined SHA. Validator metadata still reports natural exposure as not measured and its static crop-good/save evidence fields as unverified; runtime evidence above is separate.

## Final source hashes

Hashes below are from `verification-final-02/source-after-targeted.sha256`:

- `src/engine/actions.ts`: `38bf369b2fc8ce13f73a20cdfc50f756f5437d14cc1b67530600e0f61abd0344`
- `src/engine/simulation.ts`: `149c2bc120fef9984be6afa6f72db293f16877085211f630d004e49f8db0f3db`
- `src/data/contentRegistry.ts`: `65593e63bffdfd3c0c20cb3ca780af921ee01e61b550aa4542c69c6e433f9585`
- `src/engine/rewardActions.ts`: `b1cee65e318adfd0c2632b48a973fbeec9682cb982ace71b9518fe64a498cd5c`
- `src/components/PlaceWindow.vue`: `ee8a58a28908cd498ad1ba2a762a3e177ccdb8b921a6621e0d9690cc0f2698ca`
- `src/components/InventoryWindow.vue`: `fd6abf113b02c835e6938c9a01e21e1f8c36f201c2ec9f580f1fc34e7fd1256f`
- `src/engine/crops.integration.test.ts`: `cc3ee948b1e981b6005ec720bb3f33ba2c1a57fa4a950281662592b731ac684d`
- Read-only crop pack: `src/data/content/farmCrops.ts`: `d49418c074d0bb5757db26b40c1342e169e29975caf717095fec668246af30a8`

The integration engineer did not run the broad suite or a browser smoke test; the central runner owns broad regression. No independent review is claimed.
