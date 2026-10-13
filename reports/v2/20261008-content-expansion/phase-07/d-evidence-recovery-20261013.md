# Phase 7-D Original Failure Evidence Recovery — 2026-10-13

## Result

**Not recovered.** The original failed Cave Insects pack bytes with expected SHA-256 `5a03ea1f19fe78b1b7bd7cc8b96d189f95d36698bc407f9c929d2f7ca84a663d` were not found in the bounded local search below. No original failed authored-module SHA-256 or source fingerprint was found. No artifact has been reconstructed or presented as original evidence. D remains blocked on the existing source-evidence requirement; this search does not waive that condition or release E.

## Search baseline and record time

- Branch: `v2x/reward-core`
- HEAD commit: `fd6b5e84bef73d5dc429201c903d4a867976cd0a`
- Record update: 2026-10-13 01:06:40 UTC / 2026-10-13 09:06:40 Asia/Taipei
- Current `src/data/content/caveInsects.ts` SHA-256 at this baseline: `20d7d07e7780caf8c199a9c041eeae96a67e30da5bc1c0b34763d1ef9ce39468`. This is only the current search baseline and is not the original failed source SHA or fingerprint.

## Search performed

- Searched `/workspace` and `/tmp` to depth 5 for filenames matching Cave Insects, Phase 7, or D validation report patterns, excluding `node_modules`. Matches were limited to the current checkout files and these later `/tmp` outputs:
  - `/tmp/cave-insect-pack.json` — SHA-256 `382665d4cc23d5e87c0848faff6a8a291ead28ad5de9d2a87847e5d472496a7e`; associated source-module SHA-256 `f908c3b386ae3d4ff9ffa72976c466adb55beebc2d2b139d351b3753dd46ec4d` (later pre-gate-fix source; this is not a Git commit).
  - `/tmp/cave-insect-pack-gatefix.json` — SHA-256 `18751aff901ae9a6512260ad18accce36c33b7e4971838aec82d2d54a45879fd`; associated uncommitted source-module SHA-256 `20d7d07e7780caf8c199a9c041eeae96a67e30da5bc1c0b34763d1ef9ce39468` above HEAD `fd6b5e84bef73d5dc429201c903d4a867976cd0a`. HEAD alone does not contain this gate-fixed module.
  - `/tmp/d-cave-insects-gatefix-validation.md` — current gate-fixed validation record for the uncommitted module above the same HEAD baseline.
- The pack SHA values above were measured during the search; neither is the requested failed pack. The source revision associations come from the repository's D validation and closeout records. These are later artifacts, not original failure inputs.
- Searched non-secret files under `/workspace` and `/tmp` for the target pack SHA, archived report SHA `5b0062a838404bd4bd59229f795f1fbd60474ac5730345f34ff7d2588dd47d62`, and the recorded `orphan-material` / `affix-ineligible` diagnostics. The report SHA is present in the Phase 7 playlog; no separate failed pack bytes were located.
- Enumerated unreachable Git blobs with `git fsck --no-reflogs --unreachable` and read-only `git cat-file` inspection. No blob matched the target pack SHA, and no candidate blob contained both `cave_insect` and `resin`/`keen` source markers.
- Reviewed the current validation report and root closeout. They document that the initial failure used `cave_insect_resin` with `keen`, and explicitly state that the pack bytes and failed source-module SHA/fingerprint were not retained. The later accepted/gate-fixed artifacts are distinct and are not substitutes.

## Evidence still available

The original validator report remains archived in `reports/v2/20261008-content-expansion/phase-07/playlog.jsonl` as a published record with SHA-256 `5b0062a838404bd4bd59229f795f1fbd60474ac5730345f34ff7d2588dd47d62`. It preserves the failure diagnostics and failing pack SHA-256, but not the failed pack bytes or the failed authored-source SHA/fingerprint. The current retained pack and source hashes refer to later revisions.

## Scope and integrity

The search did not modify source files or pre-existing readable reports; it appended a recovery record to `playlog.jsonl` using the supported capture flow. Acceptance states were not modified. No tests were run. This report records a negative search result only and does not establish historical source contents beyond the archived report's statements.
