# Remaining D Pre-Fix Validation

Status: pre-fix validation run complete. Preserve this run as the baseline for Root's minimal authoring fix selection. No authored source was changed during or after these invocations. These results do not accept D or claim the final Phase 7 gates.

## Run identity and generated counts

- Run: `2026-10-13T02-09-50.620Z-8fe80794-964a-4a4d-b2b7-596c0f2b92a9`
- HEAD before and after: `75140d1aa0b40bc00e246cec8253daab524720ad`; branch maps unchanged.
- Full `src/`, `scripts/`, package, and config hashes before/after are unchanged (`artifacts/before.json`, `artifacts/after.json`). All five validation manifests retain input bytes matching their declared pack hashes and source snapshots with no hash mismatches.
- All four new packs measured 8 monsters, 7 materials, 2 equipment, and 2 recipes. Combined six-family totals measured **51 monsters, 43 materials, 17 equipment, and 13 recipes**, matching the requested targets. Combined crops and crop goods are both 0.
- Per-pack files, byte lengths, and SHA-256 values are in `packs/extraction-manifest.json`: Wild Beasts `8dcf9ad3…255b368`; Frontier Goblins `b9cb012b…cf94378`; Fog Undead `e84c2146…a3459ed`; Mine Constructs `68c270b4…e276d672`; six-family combined `f6f1c52b…c531e3f7`.

## Sequential validator outcomes

| Pack | CLI | Content | Overall | Diagnostics / child checks |
| --- | ---: | --- | --- | --- |
| Wild Beasts | 1 | FAIL | FAIL | `affix-ineligible` for `wild_beast_antler`, `wild_beast_resin`, and `wild_beast_amber_sinew`. Targeted tests PASS; typecheck FAIL. |
| Frontier Goblins | 1 | FAIL | FAIL | `orphan-material` for `frontier_goblin_slingcord`; `affix-ineligible` for `frontier_goblin_slingcord` (reported twice), `frontier_goblin_signalcloth`, `frontier_goblin_wire`, and `frontier_goblin_forgecore`. Targeted tests PASS; typecheck FAIL. |
| Fog Undead | 1 | PASS | FAIL | No content diagnostics. Targeted tests PASS; typecheck FAIL. |
| Mine Constructs | 1 | PASS | FAIL | No content diagnostics. Targeted tests PASS; typecheck FAIL. |
| Six-family combined | 1 | FAIL | FAIL | Includes `orphan-material` for `frontier_goblin_slingcord`. Targeted tests PASS; typecheck FAIL. |

Each typecheck invocation reported the same integration-test error: `src/engine/remainingFamilies.integration.test.ts(209,5): error TS2322: Type 'string[]' is not assignable to type 'BuildingId[]'.` This concerns Medium-owned integration-test typing. No typecheck or content failures were repaired in this run.

All CLI run stdout, stderr, status, and UTC/Asia-Taipei timestamps are separate files in `artifacts/`. Full reports are versioned in this run's `playlog.jsonl`; run manifests, exact input bytes, source snapshots, child outcomes, and check logs are under `.qa-runs/`. Report archive entries decode and hash-check.

## Harness postprocessing note

The sequential extraction and all five validator calls completed and their evidence was retained. The outer harness then exited 1 in markdown-summary generation because `.map` was applied before awaiting the parsed JSON array. The exact observed exception is preserved in `artifacts/harness-postprocess-failure.txt`; the summary expression has been corrected in the harness source. The summary here was assembled from retained evidence. No validator run was repeated.
