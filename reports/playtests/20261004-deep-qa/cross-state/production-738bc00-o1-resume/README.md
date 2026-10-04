# 738bc00 + verified O1 patch: delayed-combat ACK follow-up

- Source commit label: `738bc0010c549fa3fb2420437d171f5aa2a043a0` plus the O1 recovery patch recorded in the final manifest; this does not attribute the patch to the commit alone.
- Source label: `738bc00 + O1 verified patch; exact final-manifest source hashes`
- URL: `http://127.0.0.1:5193/`
- Manifest: `reports/playtests/20261004-deep-qa/baseline/final-manifest.json`
- Manifest SHA-256: `ba71b37f0c37e07d44d130c35602aae2210334b7704e7b4e1ce81c69cb2425ae`
- Result: **2 cases passed, 0 failed; 7 checkpoints; 0 page errors.** The cases include fixed-build/source verification and the focused browser scenario.
- UTC: `2026-10-04T07:40:32.389410+00:00` through `2026-10-04T07:40:41.813+00:00`.
- Browser: headless Playwright Chromium `/usr/bin/chromium`, `151.0.7922.173`.

## Focused case

The runner loaded a normal UI-generated save into a disposable Chromium context and applied a labelled controlled-combat fixture (`activeCharacter.status`, `combat`, and `lastSavedAt`). It used the configured wolf encounter fields, initialized the empty IndexedDB archive with the application's existing `records` store/index shape, then used rendered controls to set ×20 while paused and open the battle modal.

The browser clicked the visible `攻擊` button. The harness observed native IndexedDB `readwrite` transaction completion while its application `oncomplete` callback was still waiting for a 2,500 ms timer. During that window it clicked Attack twice more and resumed the actual ×20 timer. The world advanced from minute 480 to 491; three action records and two time records were pending before the first application ACK.

The two delayed write batches completed at `07:40:35.883Z` / `07:40:38.384Z` and `07:40:38.391Z` / `07:40:40.891Z` (native `oncomplete` / application callback). All five new record IDs appeared in the archive exactly once, pending drained to zero, and the saved game state matched the latest pre-ACK checkpoint. Reload restored the same game state and journal with five unchanged archive rows.

The event hook delays only the assigned application `IDBTransaction.oncomplete` handler; native transactions commit normally, and the shared hook leaves `onabort` immediate. This case exercised successful transactions; the matrix run's separate conflicting-record case covers native abort and rollback.

## Evidence and limitations

Full results and timestamped transaction trace are in [results.json](results.json); every checkpoint was appended to [playlog.jsonl](playlog.jsonl). `raw/` contains the fixture and before/after localStorage snapshots; `artifacts/` contains the combat, pending-ACK, and reload screenshots. The focused run verified all 35 source hashes and the exact manifest hashes for the HTTP HTML, JavaScript, and CSS files.

One generic browser-console 404 was recorded, with zero page errors. A direct request to `/favicon.ico` returned 404; the three manifest assets returned 200. This was the only browser-console observation.

The append-only report history retains three earlier harness/setup failures from the same run folder: a fresh context without the IndexedDB `records` store, an assumption that ×20 setup could not create a real time record, and clearing the trace by replacing its array instead of mutating the instrumented array. The runner now creates the schema from the existing journal contract, waits for setup records to be acknowledged, and clears the trace in place. Those were harness issues; the final product scenario passed. Four executions are represented in the 24 checksum-verified archive entries; the final `results.json` describes the successful execution only.

This is Chromium evidence for the fixed local production build. It does not establish behavior in Firefox, Safari, or physical mobile browsers.
