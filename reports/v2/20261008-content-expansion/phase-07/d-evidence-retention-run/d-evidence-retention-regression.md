# D Evidence Retention CLI Regression

Status: runner QA scenarios passed after one documented harness setup correction. This does not recover the historical failed pack or authored-source evidence, accept D, waive its blocker, or release E.

## Frozen inputs and capture

- Repository HEAD before and after: `f026b6b4947d18aadc0f551c642c31750db5768c`.
- Frozen validator SHA-256: `79f390fad5a706955b1f2546c6065191e52e556d4c6297587d2a11cc8859c989`.
- Frozen evidence helper SHA-256: `574343415da3524deb7092cc1288ce8e602eae8aa9eb41be9b998c62d8dd6bc4`.
- Frozen focused tests SHA-256: `0d071a6a405b2121f5360a0af2c737a17f403d60f61b460ef4dc1cc842a393ba`.
- The old validator is saved as `legacy-validator.mjs`; its SHA-256 matches the exact `git show f026b6b:scripts/validate_content_batch.mjs` blob (`c40e157d2c3395cf2b7179c99aa26aa4fb5364a026e4575358626ef23cf06164`).
- The runner harness, exact child stdout/stderr, exit codes, UTC and Asia/Taipei timestamps, before/after full `src`/`scripts`/configuration SHA maps, and scenario summaries are in `artifacts/`. The captured maps show no source/config hash changes. There were four intended new-CLI scenario types (B/C/D/E), with five new-CLI invocations total: the initial E harness-error attempt plus its corrected valid-pack attempt. All five run manifests retain supplied pack bytes and independent source snapshots; all declared hashes match their captured bytes. The per-run source fingerprint is stable (`6591df2c…0911eb`); captures do not claim that current source generated the input pack.
- Existing 103-input before/after check was not rerun; its retained artifacts remain under `d-timeout-diagnosis-run/maxworkers-1-check/`.

## Scenarios

| Case | CLI result | Retention result |
| --- | --- | --- |
| A. Exact old CLI with malformed JSON | Exit 1 | No readable report and no `.qa-runs` directory. This demonstrates the old retention behavior now against immutable old source; it is not a recovered historical D failure. |
| B. New CLI, valid minimal pack | Exit 0 | Content and overall status PASS; targeted tests and typecheck PASS; pack, snapshots, manifest, and publisher outputs retained. |
| C. New CLI, same pack path overwritten with `hp: 0` | Exit 1 | Content and overall status FAIL; targeted tests and typecheck PASS. New unique run retained; the earlier readable report remains decodable in the archive with its original prefix intact. |
| D. New CLI, malformed JSON | Exit 1 | Content status ERROR and overall FAIL; exact malformed input and error outcome retained. |
| E. Controlled publisher failure, corrected attempt with valid pack | Exit 1 | Content checks ran against the valid pack. Publisher reports exit 23 / FAIL and preserves the known sentinel stderr; the prior readable report remains byte-identical. Pack and source snapshots retained. |

Harness setup note: the first E attempt reused C's overwritten semantic-negative pack. That captured attempt is preserved as `E-controlled-publisher-failure.*`; it correctly showed publisher exit 23 and protected the report, but was not counted as the valid-pack E case. The harness input-selection error was corrected, and one valid-pack E attempt is retained as `E-corrected-valid.*`. It has the expected controlled publisher failure, so no further scenario rerun was needed.

The four intended scenario types have five new-CLI invocations because the first E attempt used the wrong input; that attempt is retained and not counted as the valid-pack E result. Expected CLI nonzero exits (C/D/E) remain distinct from QA scenario results. The old-source behavioral reproduction is separate from the earlier structural RED (`ERR_MODULE_NOT_FOUND`), which was not old-behavior evidence. All raw evidence and timestamped process records are in `artifacts/`; run manifests and snapshots are in `work/.qa-runs/`.

## Result and limits

The current validator retained the exact supplied pack and source context for valid, semantic-negative, malformed, and controlled publisher-failure runs. It retained actual child exit status and separated stdout/stderr. Publisher failure left the earlier readable report unchanged. These runner results only establish the behavior of the frozen current CLI in this environment. They do not reconstruct the missing historical input/source, satisfy the D acceptance gate, or change E's unreleased status.
