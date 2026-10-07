# Phase6-D Core Independent Review

- **Disposition: recommend ACCEPT D core; no unresolved blocker.** Root may accept D and release the next dependency. This is an engineering-core review, not an overall Phase6 or product PASS.
- **Scope:** bounded equipment/food/gold contribution actions, Civil Defense effects, V5 ledger validation, V4 migration, lifecycle references and focused D evidence. No E/F UI or product implementation.
- **Reviewer:** `g6_luna_max_phase6_core_reviewer`; requested role GPT-6 Luna Max deep review, runtime model telemetry unavailable; implementation contributor: no.
- **Git snapshot:** branch `v2x/reward-core`; base and HEAD `bd4901c28ed3fb8469d6fe5c82354b4e1128691e`. D remains an uncommitted working-tree snapshot. All 12 frozen source hashes match after independent tests and the crafted-item runtime check.
- **Source fingerprint:** `7262a7598830129e1c89dac1a7918a206b40a034945e074aea1ac2e7e835d136` over sorted `path NUL sha256 LF`; freeze manifest [`d-source-freeze.json`](d-source-freeze.json), SHA-256 `1f221ac850211a7f32166c8125178fc995f6ca21aeb615e9876aa4ad876b4d55`. The exact 12-path mapping is in [`d-core-independent-review.json`](d-core-independent-review.json), SHA-256 `e2af8d9576c1da2524149ff85a86942fbbc39d2538b7df139b015ee3eab11913`.

## Standards

**PASS, no Standards findings.** Review followed `AGENTS.md` §§3–6, `docs/agents/review.md`, `docs/agents/skill-workflows.md`, `docs/agents/agent-routing.md`, `docs/governance/ai-governance.md`, and the repository-adapted code-review workflow. Actions stay in a narrow engine module; persistence validation stays at the save boundary; no UI, E/F resolver or out-of-scope product code was added.

## Spec

**PASS for D core.** The action seam in `src/engine/crisisContributions.ts:25–45, 69–161` preflights crisis identity/phase, player life/status, combat/dungeon, local handoff, event capacity, actual assets and needs before mutation. Tests cover atomic rejection, owned unequipped equipment, real stats, physical food stockroom and raw forecast, no-zero-effect food, bounded gold, save/reload and RNG/time invariance.

`src/engine/civilDefense.ts:123–163` derives bounded gear effect from rolled stats and defender suitability, with per-slot cap and actual defender capacity. Food uses the accepted model's raw resolution forecast; gold contributes only within derived logistics capacity. A separate public-runtime contrast (`d-review-crafted-item-contrast.txt`) uses an actual `ironShortSword` produced by `craft`, with valid `craftProvenance`: donation raised readiness from 0 to 0.4321428571, removed the live item, retained provenance in the ledger, consumed no time/RNG, and survived exact save/reload.

The V5 ledger is strict and bounded in [`saveService.ts`](../../../../src/services/saveService.ts:122). Authentic V4 warning/preparation/active saves from committed checkpoint `bd4901c` are migrated to V5 without recreating the crisis or changing crisis fields, world time, RNG or save timestamp; fixture hashes/source provenance are in `d-v4-fixtures/manifest.json`.

### Resolved findings

- **P1-D01 — pruned historical defender blocked reload.** Before the fix, an owned equipment contribution to a nonfeatured guard, followed by `die()` and one normal daily simulation boundary, caused NPC pruning while the ledger retained that historical ID; `deserialize(serialize(state))` rejected the save. The preserved RED is [`d-red-pruned-defender-reference.txt`](d-red-pruned-defender-reference.txt), SHA-256 `654503e39a596e3378b98d558fa4df0c30f00d5da2e82073d23070a72d54d04d`; pre-fix source hashes are in [`d-red-pruned-defender-source-hashes.txt`](d-red-pruned-defender-source-hashes.txt), SHA-256 `b4b88c0f6950f46a96973c97389ce8e3dfd752e35db7f77a1e9a4fdf4df580fa`. The current validator accepts canonical historical `npc-<n>` IDs below monotonic `nextNpcId` without requiring an active NPC record, while retaining item/donor/allocation validation. The new public prune→save→reload regression passes: [`d-green-pruned-defender-reference.txt`](d-green-pruned-defender-reference.txt), SHA-256 `e0fd14c5019395b4813b42c1c9b3c4360d5c87e4219f6719a08e8e1696a9a7cb`.
- **P2 D-FOOD-FEEDBACK-01 — oversized positive request gave misleading farmer advice.** The action now distinguishes over-request from a genuinely zero-effect contribution and both paths leave state unchanged. RED/GREEN evidence: [`d-red-food-feedback.txt`](d-red-food-feedback.txt) (`6a843095745d10791f41dbfa7a14e0deb08188587ea58fd33a8286014ec5f781`) and [`d-green-food-feedback.txt`](d-green-food-feedback.txt) (`ca0c705afb68503277587b4c518792827cea4dc953a0b0950f9eed5f74593d69`).

## Verification

| Evidence | Result | SHA-256 |
| --- | --- | --- |
| [`d-review-targeted-tests.txt`](d-review-targeted-tests.txt) | Independent post-freeze rerun: P1 prune/reload regression and 3 authentic V4 migration cases; 4 passed, 111 filtered | `729d8db1d9abb83cd4a86de82817473374f945c18dd072062065d911e5246719` |
| [`d-review-crafted-item-contrast.txt`](d-review-crafted-item-contrast.txt) | Public crafting → contribution → effect → save/reload runtime contrast passed | `d7979ad11ed2b30f9a3d1b3397f1a4b474e333ce824dd52c2d34a683c94d2a7d` |
| [`d-regression-final.txt`](d-regression-final.txt) | Engineer focused D set: 6 files, 170 tests passed | `6fde8385b095d840f291b5908072074567e1900f4e58741685bcbabc5933c5c4` |
| [`d-fullcheck-green.txt`](d-fullcheck-green.txt) | Engineer `npm run check`: 25 files, 475 tests, typecheck and production build passed | `884991ad530fadcc165e683e0d94e7fa48b7e40c59c31424abfaa42b03e6e23c` |
| [`d-v4-fixtures/manifest.json`](d-v4-fixtures/manifest.json) | Authenticated committed-V4 fixture provenance; warning/preparation/active fixture hashes listed in freeze manifest | `bc07f9ac342b5e10886279ca60d3856e28690d39b3207f874c3e1d9c9c0c6ab8` |

The initial synthetic V4 test failure is preserved as test-fixture setup evidence and is superseded by the archived V4 fixtures and passing phase-specific migration tests. Human validation remains `DEFERRED / NOT APPLICABLE AT THIS STAGE`; it does not block engineering review. No overall Phase6 product PASS is claimed.
