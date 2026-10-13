# E Integration Audit Correction

- Targeted command: npx vitest run src/engine/contentBosses.integration.test.ts src/engine/contentFamilies.test.ts src/engine/caveInsects.integration.test.ts src/engine/remainingFamilies.integration.test.ts
- Actual result: 4 files / 39 tests; exit 0
- Typecheck: npx vue-tsc --noEmit; exit 0
- HEAD: 3d15d2e479662cb74135bba8894290e054adaa6f before / 3d15d2e479662cb74135bba8894290e054adaa6f after
- Full source/scripts/config/package maps unchanged: true (116 / 116 files)
- Exact current test snapshot SHA-256: deaf227c4379c4700314dc52b6ae1273655dd7071caca998a742a71f4503e564
- Comparison to pre-correction Root fallback test snapshot: 4055588f2c291391a93f99ff4bbfef944894e7ae50e0530f9526f63c0ccc92a8 → deaf227c4379c4700314dc52b6ae1273655dd7071caca998a742a71f4503e564; diff exit 1 (expected 1 for this one-line deletion)

Raw stdout/stderr, exits, UTC/Taipei timestamps, exact source snapshots, and source maps are retained in this directory.
This is targeted post-correction evidence only; no full suite or validator CLI was run.
