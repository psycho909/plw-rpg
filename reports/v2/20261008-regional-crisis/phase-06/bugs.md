# Phase6 Bug register

Source base: `b82de85fb251697fca3e4331c5bb44945349a387`; uncommitted Phase6 source identified by per-stage hashes. Human: DEFERRED / NOT APPLICABLE AT THIS STAGE.

## P2-B01 — Current save accepts coerced crisis severity

- Finding: strict V4 validation accepted severity string `"2"` and array `[2]`, preserving wrong runtime types. Public deserialize reproduction: `b-review-repro-raw.json`; initial source fingerprint `85b0cdb5eb05a9ab650b083e6d962bbd44554e18f5ba79e7af87a091b5a6b663`.
- Root cause: `Number(value.severity)` membership check. Boolean true rejected in original severity-2 fixture; matching severity-1 regression demonstrates its coercion acceptance separately.
- Impact: malformed saves cross numeric schema boundary; not proof of spontaneous corruption during normal play.
- Fix: strict safe integer range 1–3; numeric controls preserved, coercible types rejected.
- Evidence: original bug RED, subsequent test RED, six-case GREEN, 92 save tests and typecheck preserved in `b-fix-*`; independent Standards/Spec review PASS, 207 focused tests; `b-core-independent-review.md/json`.
- Status: FIXED / INDEPENDENTLY VERIFIED / B ACCEPTED.

## Harness failures (not product bugs)

- Initial reproduction Vite config resolved outside project. Original raw `b-review-repro-initial-failure.json` retained; corrected absolute project/config paths produced valid reproduction.
- Added regression first failed typecheck because union severity access lacked narrowing. Original `b-fix-typecheck.txt` retained; test assertion corrected, green typecheck recorded separately.

No P0/P1 claim; later slices and final QA not yet executed. Do not interpret this interim register as complete Phase6 bug inventory.

## P1-D01 — Allocated defender death makes generated save unloadable

- Source: D uncommitted development snapshot on parent `bd4901c`; exact pre-fix source/log hashes in `d-red-pruned-defender-source-hashes.txt`.
- Reproduction (CONTROLLED FIXTURE/public seams): contribute owned equipment → `die` defender → normal `simulate` crosses daily boundary and prunes nonfeatured dead NPC/life records → `deserialize(serialize(state))` rejects generated save. Original failing regression `d-red-pruned-defender-reference.txt` SHA256 `654503e39a596e3378b98d558fa4df0c30f00d5da2e82073d23070a72d54d04d`. Independent reviewer also observed this before patch; its later attempted second capture raced with fix and was not misreported as RED.
- Root cause: validator required current `s.npcs` membership for retained crisis allocation. Legitimate historical NPC IDs below monotonic nextNpcId must survive lifecycle pruning.
- Severity: P1, ordinary lifecycle cleanup can render internally generated saves unloadable. Does not claim observation in a normal browser playthrough.
- Fix underway: accept bounded legitimate historical references and keep actual action→death→daily prune→reload regression. Prior over-strict test/RED/GREEN evidence retained and explicitly superseded.
- Status: FIXED / INDEPENDENTLY VERIFIED / D ACCEPTED.

## P2-D02 — Over-request incorrectly advises more farmers

Oversized food submission with a negative raw forecast that could become positive gave zero-effect farmer advice. Asset guards still rejected the request atomically. Distinct over-request and actual zero-effect messages now covered by retained `d-red-food-feedback.txt`/`d-green-food-feedback.txt`, independentDreview confirmed; FIXED.

## Additional harness/test failures retained

- Authentic archivedV4 fixture runner emitted a Vite log before JSON. Parser failure retained in d-v4-fixtures/generation-failure.json; corrected parsing produced authenticatedsame-sourceV4 fixtures.
- FirstD fullcheck: 473/475 passed, two testfailures from staleV4 version expectations; three assertions corrected toV5. Originald-fullcheck.txt kept, separategreen475/typecheck/build.

## P2-E01 — Camp victory exceeds valid event-sequence budget

E uncommitted snapshot on source parent `dfdc816`. Controlled public startRegionalCampRaid at MAX_SAFE_INTEGER−2 then successful combatTurn produced a save rejected by deserialize; original `e-red-event-capacity.txt` SHA256 `68e72137d92e6b5d0e20b7118f7839b1f667c5231d9b285aafd9a324fde8ccf1` records exact pre-fix source/test hashes and failure. Source test hash `5b3c72ed449f7f2b29e56cf511f1cc2bab07680be7dcf2e0aba3fc8a0268f59f`. Natural play cannot practically reach this counter; classified P2 integrity edge, not P1 normal-save loss. FIXED / INDEPENDENTLY VERIFIED / E ACCEPTED. Exact isolated camp-combat clone preflight rejects before real state changes; 505 full tests and independent 29 tests PASS. Original RED retained. Full-history clone cost remains an I/J profiling risk.
