# Phase 7-D Evidence Retention Repair — Independent Review (Preliminary)

Status: preliminary source review of the frozen inputs below. The requested real valid/negative validator CLI regressions were not reviewed yet; this report does not accept D, lift its blocker, or release E. The original historical failed pack and authored-source evidence remains unrecovered. The engineering record correctly describes the initial RED as `ERR_MODULE_NOT_FOUND` for the newly introduced helper; it is not evidence that the prior retention defect was reproduced.

## Scope and provenance

- Repository: `/workspace/plw-rpg`; branch `v2x/reward-core`.
- HEAD: `f026b6b4947d18aadc0f551c642c31750db5768c`.
- Reviewed working-tree inputs: `scripts/validate_content_batch.mjs`, `scripts/validate_content_evidence.mjs`, `scripts/test_validate_content_batch.mjs`, `scripts/README.md`, and `reports/v2/20261008-content-expansion/phase-07/d-evidence-retention-engineering.md`.
- Read-only scope command: `git diff -- scripts/validate_content_batch.mjs scripts/validate_content_evidence.mjs scripts/test_validate_content_batch.mjs scripts/README.md`; new files were read in full. No test command or Git mutation was run by this reviewer.
- SHA-256 at review: `validate_content_batch.mjs` `a6fb8fb787ef6a52a53ecdce12fa0122d5faff9a138efd62363cca195adc8547`; `validate_content_evidence.mjs` `2bcc468a00b02c0017fa15b64624c3de9d275222a9b7e38ea17658c5b3c8d25f`; `test_validate_content_batch.mjs` `b6fc5b803f6ace3b75e18d1db063f0b6e8c1eb22f9a16fe8384573488a4f4b3a`; `scripts/README.md` `33cc1182a584c001e72475ae6f75f7b5e16eb893acfb52fe8c9dc3a585d608e3`; engineering record `6e1bed8a14d1d0aac617f9afa73b4aaf9cb59e019ac99ab2bc8987acea0639cb`.
- Recorded report versions use the existing `scripts/recorded_reports.py publish` flow; the playlog is the authoritative append-only local history. This review report has been published with that writer.

## Standards

**Finding S1 — Medium: evidence durability is overstated.** `scripts/validate_content_evidence.mjs:38` says the supplied bytes are “durably” written before parsing, and README describes the `.qa-runs` captures as archived evidence. However, pack bytes, source snapshots, manifests, child outputs, and outcomes are created with `writeFile` and no file/directory `fsync`. `recorded_reports.py` does flush/fsync its playlog and readable report, but that does not make the separate run evidence durable across a crash or power loss. Either use a durability mechanism for these run artifacts or narrow the claim to “written/captured”; do not treat `writeFile` completion as flush durability.

No other Standards finding identified in the inspected source. Artifacts use per-run unique directories and exclusive create; paths/fingerprint inputs are sorted; recorded report versions use the existing writer.

## Spec

**Finding P1 — Low: report-level validation label does not summarize all required checks.** `scripts/validate_content_batch.mjs:35` emits `Validation: PASS` whenever content validation succeeds, even if `targetedTests` or `typecheck` has failed; those child statuses are listed separately and the CLI returns nonzero at line 115. The report should label this specifically as pack/content validation and separately show the aggregate command/check result, so a readable report cannot be skimmed as a full-run pass when required checks failed. `outcome.json` likewise has `validation: PASS` alongside failing checks; separate labels or an explicit overall status would clarify it.

Inspected requirements are otherwise represented in source: exact pack bytes are read and stored before JSON parse (`validate_content_evidence.mjs:39–49`); authored TypeScript snapshots are separately captured and provenance disclaims pack-generation attribution (`:51–76`); source paths and the current-source fingerprint mapping are sorted (`:51,64`); run directories and artifact writes are unique/exclusive (`:43,49,58,76,82`); Git HEAD is captured from `git rev-parse HEAD` and is distinct from the historical anchor in the report (`:61–74`, batch report `:31–35`); malformed JSON is caught after input capture and included in the outcome (`validate_content_batch.mjs:82–105`); child status derives from spawn error/status/signal, not printed output (`validate_content_evidence.mjs:25–32`); the report archive fails closed when publication throws (`validate_content_batch.mjs:108–113`).

## Verification and limits

- The engineering record reports five native Node tests and four Python tests passing; this reviewer did not rerun them.
- The recorded RED is only the missing-helper import failure. It does not establish reproduction of the historical evidence-loss bug.
- No real valid/negative CLI regression evidence was available in this preliminary review. Unexpected source-capture or artifact-write failures are fail-closed at the CLI boundary; failures during early capture can leave partial files without a completed manifest, and a `vite.close()` exception likewise returns failure but skips later outcome/report publication. These paths were inspected statically only.
- Status: **needs correction/clarification for S1 and P1, then review the frozen-source CLI regression evidence**. D remains BLOCKED and E unreleased.

## Delta review — frozen repair source and CLI evidence

Reviewed the revised working-tree sources at the same HEAD `f026b6b4947d18aadc0f551c642c31750db5768c`. SHA-256: `validate_content_batch.mjs` `79f390fad5a706955b1f2546c6065191e52e556d4c6297587d2a11cc8859c989`; `validate_content_evidence.mjs` `574343415da3524deb7092cc1288ce8e602eae8aa9eb41be9b998c62d8dd6bc4`; `test_validate_content_batch.mjs` `0d071a6a405b2121f5360a0af2c737a17f403d60f61b460ef4dc1cc842a393ba`; `scripts/README.md` `d50ca95bb9180265b7844e25ccb9ab6c488f3283003229e691867e24e2565b0d`; engineering record `90d08d636be6bddf9e8ec28879e50bc7f754d24db8215b282b8a75c0df998e28`.

**Previous findings resolved.** The helper now requests `flush: true` for each run artifact and no longer claims durable storage; README accurately limits the claim because directory-entry synchronization and complete power-loss durability are not established. Reports and outcomes separate content-validation from aggregate validator/child-check status, resolving the misleading PASS label. Cleanup failures are included in diagnostics and force aggregate failure. Publisher output and actual status are written as exclusive per-run artifacts, and a failed publisher returns nonzero without replacing the prior readable report. `git diff --check` for the four source/documentation paths was clean; this was a whitespace check, not a test run.

**RED provenance reviewed.** The tool-history transcription says the renderer exposed one combined output, not separate streams or numeric exit status. The initial test source is explicitly labeled reconstructed rather than a preserved runnable test. Both now identify the failure as `ERR_MODULE_NOT_FOUND` for the newly added helper, not a reproduction of the historical bug. These limits are appropriately stated.

**CLI evidence reviewed statically; no commands rerun.** The frozen-source harness artifacts identify the exact old runner as `git show f026b6b...:scripts/validate_content_batch.mjs`, record HEAD/source hashes before and after, and retain command stdout/stderr/result JSON plus run manifests/artifacts. Scenario evidence shows: A old-CLI malformed input exited 1 with no report and no `.qa-runs`; B valid input exited 0 and report says content and overall PASS; C semantic negative exited 1 and retained FAIL report/outcome while earlier report version remained archived; D malformed input exited 1 with captured pack and ERROR/FAIL report/outcome; E controlled publisher failure exited 1, retained publisher exit 23 and sentinel stderr, and preserved the prior readable report. The successful/negative CLI reports retain current HEAD and source fingerprint. These are bounded CLI regressions and do not establish recovery of the original historical D failure.

## Updated disposition

No open Standards or source Spec finding remains in the reviewed frozen source. The two preliminary findings are resolved. The original D historical evidence gap remains unrecovered; this review does not accept D, waive its blocker, or release E. No tests were rerun by this reviewer; the recorded engineering/QA outcomes remain attributed to their runner.
