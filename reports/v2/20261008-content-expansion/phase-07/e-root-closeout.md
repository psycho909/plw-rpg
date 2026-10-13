# Phase7-E Root closeout

Date: 2026-10-13（Asia/Taipei）. Branch `v2x/reward-core`; tested base HEAD `3d15d2e479662cb74135bba8894290e054adaa6f`, with captured pending source deltas, not a claimed final delivery SHA.

## Accepted scope

Six families now have 6 normal / 2 Elite / 2 Mini Boss / 1 Boss each: 66 total, excluding variants and legacy monsters. Existing generator/frozen Boss form/cooldown/world consequence APIs are reused. No Save/RNG/runtime core changed in E. Seven source-linked CLI checks passed; merged pack has 66 qualified monsters, 60 interim qualified items, raw 48 materials / 25 equipment / 16 recipes. Six material-duplicate groups and one Wild loot-table warning remain visible. Natural exposure, balance and final >=100 item count wait for F–K.

## Failure chronology and limits

Initial data precheck found seven errors involving future equipment references, an orphan Apex material and resulting identity-axis errors; bytes and snapshots remain in `e-content-validation-run/runs/2026-10-13T02-51-56.085Z-dbda131c-3bbb-4c7d-a118-d872aadb4196/`. Early integration stale D count assertions failed; original streams remain in `e-integration-run/`. Medium then hit provider quota with one remaining fixture failure and TS18048; Root completed narrowly scoped corrections. Some integration captures initially used a root-level `phase07/` directory; moved intact into this canonical report directory, retaining embedded original paths. The archive bytes are not rewritten as if produced elsewhere.

Independent audit caught a remaining enemy-HP mutation in the victory fixture. Removed it; exact one-line diff, 39/39 tests and typecheck are captured in `e-integration-run/audit-correction-20261013T053847Z/`. Current test SHA `deaf227c4379c4700314dc52b6ae1273655dd7071caca998a742a71f4503e564`; independent delta review clears the finding. Original audit is preserved in `reports/audit/playlog.jsonl`. Controlled strong-player witnesses establish public runtime invariants, not natural Boss win rates or acquisition frequency.

## Gate

E PASS WITH FINDINGS; Root accepts E under existing Owner completion authorization and releases F. Prior D historical-evidence P2 remains permanent. D's 585-test full check is historical; not presented as full regression of this E version. Final full regression/build will run at the F/G integration node and final frozen source.

QA runner preparation has independent source-level clearance only (`qa-preparation-review.md`); no formal simulation/browser lane has run. Prepared F/G plans are not implemented acceptance. Human validation remains DEFERRED / NOT APPLICABLE AT THIS STAGE.

## Commit evidence preservation

Default staged whitespace check returned only captured stdout/stderr ending blank lines and one launcher-source trailing blank line. Root removed the launcher's final blank line (formatting only; no behavior change), retains all raw process bytes, and uses invocation-scoped `core.whitespace=-blank-at-eof` only on the exact reported raw log paths. All other staged paths undergo strict checking. No global Git setting or raw log normalization. Root records this source-formatting delta to the earlier QA preparation review; real runner execution remains pending.
