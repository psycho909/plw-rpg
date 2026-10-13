# Phase 7-D Evidence Remediation — Independent Delta Review

## Scope and decision

Read-only review of the latest D ticket, `d-remediation-disposition.md`, current-source revalidation report, generation/run harnesses, comparison and integrity maps, and positive/negative CLI artifacts and manifests. Frozen HEAD is `f026b6b4947d18aadc0f551c642c31750db5768c`. Validator, helper, focused-test, and scripts README hashes match the prior review: `79f390fad5a706955b1f2546c6065191e52e556d4c6297587d2a11cc8859c989`, `574343415da3524deb7092cc1288ce8e602eae8aa9eb41be9b998c62d8dd6bc4`, `0d071a6a405b2121f5360a0af2c737a17f403d60f61b460ef4dc1cc842a393ba`, `d50ca95bb9180265b7844e25ccb9ab6c488f3283003229e691867e24e2565b0d`.

**Standards / technical evidence: PASS for the narrow remediation.** The recorded Vite SSR harness imports `CAVE_INSECT_CONTENT` from `src/data/content/caveInsects.ts` (SHA-256 `20d7d07e7780caf8c199a9c041eeae96a67e30da5bc1c0b34763d1ef9ce39468`) and serializes it. Its output is byte-identical to the retained gate-fix pack: 10,879 bytes, SHA-256 `18751aff901ae9a6512260ad18accce36c33b7e4971838aec82d2d54a45879fd`. HEAD and full source/config/package maps are unchanged across the run. I independently checked both run manifests against the captured input bytes and every source snapshot; both verified. Run outcomes and publisher states agree with the raw CLI results.

The generated positive pack exits 0 with content and overall status PASS, 8 qualifying monsters and 7 usable materials; targeted tests and typecheck exit 0. The negative control differs from the positive pack only at `materials[cave_insect_resin].bias`, changed from `{ "piercing": 1 }` to `{ "keen": 1 }`. It exits 1 with content and overall FAIL, and emits `orphan-material` plus `affix-ineligible`; its targeted tests and typecheck exit 0. Its SHA-256 is `581f68018aaa0a8a358d7bc2935015aa6b3e66ea8488adddb7961ceb4ebd8a75`, distinct from the historical failed pack checksum `5a03ea1f19fe78b1b7bd7cc8b96d189f95d36698bc407f9c929d2f7ca84a663d`.

**Spec / historical acceptance: remains Owner-pending.** These runs prove current-source generation and revalidation, and provide a new negative control. They do not recover or establish the missing original failed pack bytes or authored-source fingerprint. The disposition preserves that as a permanent P2 auditability finding and says explicitly that the proposed replacement acceptance clause awaits Owner confirmation. The D ticket remains `blocked` with its historical-evidence acceptance checkbox unchecked; its latest update records the proposed exception as pending. No text claims recovered history, D acceptance, waiver, or E release. I find the proposed disposition internally consistent with that boundary. D policy acceptance remains a separate Owner decision after technical remediation.

The prior canonical `npm run check` evidence is accurately treated as historical: HEAD at that run was `fd6b5e84bef73d5dc429201c903d4a867976cd0a`, with 31 files / 570 tests passing and identical before/after fingerprints. I compared its 103-entry before map with the current remediation before/after maps: all 103 entries match exactly; the current maps add eight QA/tooling/config entries. No new full suite run is claimed or required by this evidence review. Root separately verified the seven manifests/source fingerprints and the archived original report/prefix.

## Raw artifact whitespace

I ran `git diff --no-index --check /dev/null <file>` through a read-only Python runner for decodable text files in both QA run directories. In `d-evidence-retention-run`, 160 files were checked; five `work/.qa-runs/*/targetedTests.stdout.txt` files report only `new blank line at EOF` at line 9. In `d-remediation-run`, 71 files were checked; the two corresponding positive/negative `targetedTests.stdout.txt` files report the same single diagnostic. All remaining checked text files had no whitespace diagnostic.

These are raw Vitest stdout captures, not source or authored report formatting. Preserve their bytes unchanged; an invocation-only exception is appropriate. Do not normalize the retained QA output. This exception does not apply to the review report or other authored files.

## Verification limits and disposition

No tests or validation commands were rerun. Artifact hashes and manifests were read/checked; no source, ticket, or raw QA artifact was changed. The report is archived with `scripts/recorded_reports.py publish`.

**Review result:** current-source remediation evidence and proposed disposition are technically supported, with no invented historical provenance. Keep D blocked and E unreleased until Owner explicitly approves the proposed acceptance change. The authentic historical gap remains disclosed even if that revised condition is later approved.
