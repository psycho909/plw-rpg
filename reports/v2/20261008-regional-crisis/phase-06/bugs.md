# Phase6 Bug register

Source base: `b82de85fb251697fca3e4331c5bb44945349a387`; uncommitted Phase6 source identified by per-stage hashes. Human: DEFERRED / NOT APPLICABLE AT THIS STAGE.

## P2-B01 — Current save accepts coerced crisis severity

- Finding: strict V4 validation accepted severity string `"2"` and array `[2]`, preserving wrong runtime types. Public deserialize reproduction: `b-review-repro-raw.json`; initial source fingerprint `85b0cdb5eb05a9ab650b083e6d962bbd44554e18f5ba79e7af87a091b5a6b663`.
- Root cause: `Number(value.severity)` membership check. Boolean true rejected in original severity-2 fixture; matching severity-1 regression demonstrates its coercion acceptance separately.
- Impact: malformed saves cross numeric schema boundary; not proof of spontaneous corruption during normal play.
- Fix: strict safe integer range 1–3; numeric controls preserved, coercible types rejected.
- Evidence: original bug RED, subsequent test RED, six-case GREEN, 92 save tests and typecheck preserved in `b-fix-*`; independent review PENDING.
- Status: FIX IMPLEMENTED / INDEPENDENT REVIEW PENDING.

## Harness failures (not product bugs)

- Initial reproduction Vite config resolved outside project. Original raw `b-review-repro-initial-failure.json` retained; corrected absolute project/config paths produced valid reproduction.
- Added regression first failed typecheck because union severity access lacked narrowing. Original `b-fix-typecheck.txt` retained; test assertion corrected, green typecheck recorded separately.

No P0/P1 claim; later slices and final QA not yet executed. Do not interpret this interim register as complete Phase6 bug inventory.
