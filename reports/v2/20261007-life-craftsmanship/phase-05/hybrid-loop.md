# H — Hybrid loop evidence

**Result: ACCEPTED for the short normal browser integration route.** This is runner-driven evidence for acquisition → targeted craft → equip → save/reload → return combat, not human product validation, a long soak, or a causal gear comparison.

## Recorded run

- Fresh isolated save with no injected state; source remained stable at `f9f969c9d3dfa3cbf1c379bec98eafab765b11cc`, fingerprint `64118ae0a53e69a897ba5bf0611da3d913d75b0861c80d56f95729feebba12cb`.
- Run `20261007T085056Z-pid83657`: **6.26 seconds**, **70 UI operations**, **2 reloads**, **3 checkpoints**; game time advanced from minute 480 to 806 (**326 game minutes**).
- Normal combat yielded wolfFang. The workbench crafted starterSpear instance `item-2` with `craftProvenance.influenceMaterial = wolfFang`; the final recipe and material controls were both selected. WolfFang count moved from 1 to 0, delta −1, with no material loot gained during craft (verified debit 1).
- The exact crafted instance was equipped in the weapon slot, saved and reloaded, then remained equipped through the return gray-wolf combat. The return fight ended in victory.
- The result was Common with no affixes or special trait. This is an observed product finding: consuming an influence material does not guarantee a visible bonus; it is not classified as a bug.

## Interpretation and limits

The two victories do not show that the crafted weapon caused a combat improvement. The actor's level, HP/max HP, world time, resources and RNG state changed between encounters; the first encounter ended at level 1 / 79 HP / minute 499, while the return began at level 2 / 85 HP / minute 803 and ended after leveling again. Phase I's controlled combat matrix owns causal gear comparison.

Human validation remains **DEFERRED / NOT APPLICABLE AT THIS STAGE**. This short pilot does not satisfy the 20–30 minute integrated stress or 30–60 minute Life Agent exploration requirements in J.

## Source records

- Canonical acceptance and debit evidence: [hybrid-acceptance.json](hybrid-acceptance.json) (result SHA-256 `29a8e4b3fd5b14f8926e9df1eecb5e900a95495feeaaf5e7fd276e9d4b4866ee`).
- Full actual browser result: [hybrid-short-result.json](browser-runs/hybrid-short-20261007T085056Z-pid83657/hybrid-short-result.json).
- Per-operation trace, checkpoint snapshots and recorded run archive: [operations.jsonl](browser-runs/hybrid-short-20261007T085056Z-pid83657/operations.jsonl), [checkpoints.jsonl](browser-runs/hybrid-short-20261007T085056Z-pid83657/checkpoints.jsonl), [playlog.jsonl](browser-runs/hybrid-short-20261007T085056Z-pid83657/playlog.jsonl).
- Earlier false PASS / provenance-deficient run is retained and qualified in the [bugs ledger](bugs.md), entry for `hybrid-short-20261007T083533Z-pid81573`; its raw evidence remains intact.
