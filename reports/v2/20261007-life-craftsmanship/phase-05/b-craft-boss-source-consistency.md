# Crafted legendary boss-source consistency

The focused RED is preserved in b-red-craft-legacy-boss-source.txt: a valid generated crafted Legendary saved with legacy provenance.bossSource set to wolfKing was accepted before the fix.

The validator now rejects non-null legacy provenance.bossSource only when craftProvenance is present. Generated crafted Legendary items with null bossSource and noncrafted wolfKing Legendary items both round-trip successfully. No other tamper or provenance rules changed.

Targeted results: saveService 83/83, rewardSave 33/33, itemGeneration 26/26, and vue-tsc exit 0. Full Phase5-B retry01 already passed 341/341 with typecheck/build and was not rerun for this narrow delta.

Current SHA-256:
8f5f2fed7ba16468c7727a538fe98bd667c9e23dfeb1542b20a2a0a207d0e604  src/services/rewardValidation.ts
9870fe24df0bccafc5b45ff55411d017d6c881bb968afb6d6ac4da0f5fd4a9be  src/services/saveService.test.ts

Raw green commands: b-boss-source-save-service.txt, b-boss-source-reward-save.txt, b-boss-source-generation.txt, b-boss-source-typecheck.txt.
