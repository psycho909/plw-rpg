# Phase 5 G UI Source Freeze

Status: UI-owned source and documentation are frozen after final UI verification. No further UI edits are planned unless a focused regression or review identifies a concrete defect.

Core G freeze: `g-core-source-freeze.md`, SHA-256 `7dfe2d3c835a7700eb73e9c5f2baa99b66f3167244baf664e8cf32bb9413101d`.

Current source tree: 79 files under `src`; sorted per-file SHA list fingerprint (command: `find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`) is `ddc9946a43cb897564ff9044bbc5cf2a04cac1dbc7faf8974677746f6b8aa5b5`.

## UI-owned file hashes

- `src/components/PlaceWindow.vue`: `815c541a39d79de566e06d4f733d1b138df36c0ba158318e030a6e9ecc82a7d5`
- `src/components/IdentityWindow.vue`: `982afc32143581311c9a014236e3e2a75e1a40b8f04f8fe97796c542966f7f06`
- `src/components/InventoryWindow.vue`: `12794d34b5d7df1902804f36698c26d58f0c46e3ec8f8bcd4519b075d2ad4609`
- `src/presentation/craftingProjection.ts`: `26e70a094527b49ed17cf4e8a802d8e32f145789b13cb78d5b1825d70ce80dbf`
- `src/presentation/craftingProjection.test.ts`: `9e267bcd768b9ee7238ff6c6c7e669df5b7fa987fd872c7bf2848aee5d1090ce`
- `src/presentation/rewardProjection.ts`: `969498139ed5fa7b221378d939032d7948904c242ea3d3691657728293603d92`
- `src/presentation/rewardProjection.test.ts`: `cb54650c0885c3c1c245a9eb7d599fa63589f7543fb1c7514fd570d6e1244d86`
- `src/style.scss`: `39ff3ebf848b580a2e80da3a65860bf9f401623deae77efe161d80ad123a9f46`
- `docs/UI.md`: `fca8a5d3e5c27ee36ec84824efd2dffa5069bbd8c4c32d58106620c18e2cae1e`
- `reports/v2/20261007-life-craftsmanship/phase-05/ui-plan.md`: `8a3206fa908b47edffeaea882996a8d47ef4ef367c1ba0f237843f31186b5afb`

## Verification

- `npm test -- src/presentation/craftingProjection.test.ts src/presentation/rewardProjection.test.ts`: PASS, 14 tests.
- `npx vue-tsc --noEmit`: PASS.
- `npm run build`: PASS, Vite production build, 81 modules.
- Strict frontend design audit: PASS, 0 findings.
- `git diff --check`: PASS.

UI report: `g-ui-verification.md`. No G browser run is claimed; Root owns the final combined source/build freeze and browser authorization marker.
