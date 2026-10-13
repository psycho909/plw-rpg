# Phase7-H Root Review Closeout — 2026-10-13

**Disposition: PASS WITH FINDINGS.** Root accepts H's canonical region projection and crisis compatibility for Phase7 progression, and releases the approved Phase7-I scope. This is a local engineering/stage gate, not the Phase7 Product Gate.

## Frozen source and run baseline

- Branch: `v2x/reward-core`
- HEAD during implementation, review, and verification: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- H changed-source snapshot fingerprint during full check: `e82ee45141f80dd82ec0d9fc0e6099d2362641d5b2dd041acb1ba8182f37dceb` before and after; no source changed during the run.
- Full check: `h-integration-run/full-check-20261013/`; 36 test files / 622 tests passed, `vue-tsc --noEmit` passed, and Vite 7.3.6 production build passed. Source fingerprint, timestamps, exit, stdout/stderr hashes are in `status.json`.
- Built assets: `dist/index.html` SHA-256 `6976b7bce627cbebef13fb582443c34b5c52d7c6c8d28d245b73079a5eea7928`; JS `96b54eb3a7a2b37daa5ea5e16eb987a362aef44cdd1f306431c2acb188f6116a`; CSS `b76cc82a4d2fccd3ef0737700963ccae4aba6a3fedda8c26cc82eb30e7f86870`.
- Validator source fingerprint: `c538f291e6ed5440d9093bd145ff1c4723c145871cbbbc03d10477fbdca945a8`; merged pack SHA-256 `67940cf6d922530da76c02fe7490ba73512f08ab02ffc234bbdd4b68d4a21f52`.
- Relevant source hashes are retained alongside the tracked working-tree diff; the repository remains an uncommitted Phase7 working tree, not a commit-pinned release artifact. Phase7-K must freeze final integrated source.

## H implementation and verification

`contentEncounterOptions` is now the canonical pure projection for authored family encounters. It returns no entries when the active region is absent or undiscovered; for a discovered current region it exposes only monsters whose family, family profile, and effective monster profile cover that region. Each returned option reports the actual current region. Eligibility reason, progression, season, time, threat, settlement stage, safety, stamina and Boss cooldown continue to come from the engine projection. Queries and denied actions do not consume RNG or mutate state.

- Regression evidence for the original leak: `h-integration-run/current-region-red/` records the failing test showing that the prior projection exposed other-region targets; the corrected test is in `contentFamilies.test.ts`.
- Runtime reachability: `contentReachability.integration.test.ts` creates a bounded witness for every current registry monster by intersecting family/monster region, level, threat, season, hour, settlement-stage and safety conditions, then requires the production projection to report `eligible: true`. It covers every registered rank. The focused run passed **124 tests across 9 files** (`h-integration-run/runtime-reachability-01/`).
- The latest seven-pack merged validator passed with zero validation errors and **66 qualifying new monster definitions**, all with controlled reachability witnesses. Its report is `h-content-reachability-validation-20261013.md`; the raw validator run is linked there.
- Six Bosses each have same-seed/same-world-state formation tests asserting identical formed encounter, weighted variant and post-formation RNG state. Existing public integration checks Boss variant validity, frozen form across flee/save/reload, threat and crisis purity, defeat reward/consequence, rank and cooldown/re-eligibility.
- Existing `crops.integration.test.ts` follows harvested crop goods through food conversion into a live Phase6 crisis food contribution. The contribution test uses a controlled crisis/population fixture; it proves the connected public action path, not natural crop supply coverage. The full check also reruns the Phase6 crisis, contribution, civil-defense, adventure and resolution tests.
- `git diff --check` passed.

## Independent reviews and retained initial blockers

The first L3 Spec review correctly marked acceptance **BLOCKED** on two evidence gaps: no runtime eligibility witness for every authored definition across combined predicates, and no explicit crop-good-to-crisis path in the reviewed H diff. That initial finding is preserved here rather than removed. The follow-up review inspected the new runtime reachability test, Boss seed tests, crop crisis integration, recorded runs and the approved content plan; it concluded both original P1 blockers were resolved for H's runtime scope.

The independent Standards review passed with no source findings. The Spec reviewer also noted that `contentEncounterOptions` is not yet consumed by Vue and `PlaceWindow.vue` retains its pre-existing wolf-only control. Root disposition: H delivers the canonical engine projection contract; actual family discovery/UI consumption is explicitly Phase7-I work in the approved `i-ux-plan.md` (which says to consume H's released projection). Therefore H does not claim that new family options are already user-visible. I must render only this current-discovered-region projection and must not reproduce eligibility predicates in Vue.

## Findings and limits

1. **Natural encounter exposure remains not measured.** The validator explicitly reports `naturalExposure: not-measured`. Controlled runtime witnesses prove legal reachability, not normal-play frequency. The approved content plan chooses canonical player exploration actions, adds no extra daily RNG, and distinguishes those witnesses from natural exposure. J/K remain responsible for broader distribution/long-world coverage; no frequency or retention claim is made here.
2. The validator separately labels crop-good runtime binding as declaration-only/unverified. H uses the independent public-API crop integration test above as runtime evidence; these are different checks and the validator field is not represented as having changed.
3. New family UX is not yet wired. This is an I dependency, not a completed H browser/UI result.

## Gate and next stage

- Phase7-H: **PASS WITH FINDINGS**.
- H UI boundary: canonical engine projection accepted; Phase7-I owns visible discovery controls and must consume this seam.
- Natural exposure: **NOT MEASURED**; carry into J/K and the Phase7 final gate.
- Human validation: `DEFERRED / NOT APPLICABLE AT THIS STAGE`.
- Phase7-I is released under `tickets/20261008-v2x-07i-discovery-ux.md`.
- Phase7-J/K, full Phase7 quantity/balance/long-world/browser QA and final review remain open. No Phase8 or V3 work is started.
