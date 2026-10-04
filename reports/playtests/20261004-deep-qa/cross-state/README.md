# QA-06 / QA-07 cross-state matrix

This report compares the fixed `738bc00` production baseline with the fixed build containing the O1 recovery patch. A focused follow-up adds an actual combat attack to the delayed-ACK race. All evidence uses separate disposable Chromium contexts; build evidence and raw state are kept in version-specific folders.

| Build | Fixed URL | Source label | Cases / checkpoints | Result |
| --- | --- | --- | ---: | --- |
| [738bc00 baseline](production-738bc00-baseline/README.md) | `http://127.0.0.1:5191/` | `738bc00 baseline without O1 recovery patch` | 10 / 42 | 10 passed, 0 failed |
| [O1 final matrix](production-738bc00-o1-final/README.md) | `http://127.0.0.1:5192/` | `738bc00 + verified O1 recovery patch` | 10 / 42 | 10 passed, 0 failed |
| [O1 delayed-combat follow-up](production-738bc00-o1-resume/README.md) | `http://127.0.0.1:5193/` | same final-manifest build; source hashes matched | 2 / 7 | 2 passed, 0 failed |

The full matrix runner is [harness.py](harness.py); the focused follow-up is [delayed_combat_ack.py](delayed_combat_ack.py). Both use `scripts.recorded_reports.write_recorded` for every checkpoint. Each run folder has its own `results.json`, append-only `playlog.jsonl`, raw JSON snapshots, and screenshots.

## Matrix covered

- ×20 with a normal UI save while a modal is open, measuring actual wall time and verifying the modal stays open and Tab focus remains inside enabled dialog controls.
- ×20 across an exact day boundary and an exact New Year boundary; the fixture only sets a legal save's `worldTime` and future `lastSavedAt`, then native game timers perform the transition.
- IndexedDB delayed-ACK queue interleaving: delay delivery of the app's `IDBTransaction.oncomplete` callback by 1,800 ms, issue four public movement actions during that interval, and compare pending journal IDs with the archive after completion.
- Focused delayed-combat race: delay app ACK delivery by 2,500 ms after a real IndexedDB commit, use the rendered Attack button, resume the actual ×20 timer, and issue two further attacks while time and action records queue. Verify all five new IDs appear once, pending drains, the latest world state remains unchanged by ACK handling, and reload restores the same game/journal state and archive rows.
- IndexedDB abort/rollback: intentionally seed an archive row whose unique ID conflicts with a different pending payload. Observe `onabort`, visible retry/error state, exact raw storage before/after, and unchanged archived content.
- Combat modal focus and disabled controls (empty potion, map and movement targets), real ×20 background progress with combat state held, and the non-dismissible death/successor modal with movement disabled while the world advances.
- Public-action party and dungeon route: grow the settlement with Traveler Notes, gather/rest through rendered controls, hire the fighter and healer, verify injury expiry/follow behavior, discover and enter the mine, retreat and re-enter, leave between floors, then complete all three stages.
- Save/reload at dungeon entry and during active floor-two/floor-three combats. Compare party/dungeon/combat state and archive IDs before/after reload; all IDs remain unique and prior IDs remain present.
- Two-member wages and three-day contract expiry; another exact New Year boundary for contract payment/expiry; and a companion natural-age death at New Year followed by survivor contract expiry.

## Runtime and fixture boundary

The ×20 tests use the app's actual 100 ms interval and Playwright wall-clock waits. The harness installs no `Date`, `performance`, or timer fake. A `MutationObserver` clicks the rendered pause control immediately after boot so automation can take control before boundary fixtures tick; subsequent speed changes use visible controls. The exact day/year, controlled combat/death, injury and companion-aging states are explicitly labelled valid-save fixtures and document their changed fields in `results.json`; transitions after loading them use real game logic and public UI actions.

The delayed ACK hook wraps only assignment to `IDBTransaction.oncomplete`: native IndexedDB reads/writes still complete and `onabort` is delivered immediately. This tests serialized browser event-loop ordering under delayed app acknowledgement, not simultaneous JavaScript execution or true parallel re-entry. The focused run reports both native completion and delayed application-callback timestamps for the two write batches.

The normal party/dungeon route and the exact-time/edge fixtures are separate. No outcome in the dungeon route is created by directly editing save state. The intentional IndexedDB conflict is the sole seeded archive fixture and exists to force a real unique-index transaction abort.

## Limits and notes

Runs are headless Chromium only, against immutable local production assets. They do not establish behavior in other browsers. Each run recorded one generic browser console error reading `Failed to load resource: the server responded with a status of 404 (File not found)` attributed to the page URL, with zero uncaught page errors. A direct request to `http://127.0.0.1:5193/favicon.ico` confirmed the missing favicon returns 404; the final-manifest HTML, JavaScript, and CSS assets all returned 200 with exact hashes. This remains a low-risk browser-console observation.

The baseline HTTP HTML/JS/CSS hashes match its captured manifest exactly. The current checkout includes the later O1 changes, so the baseline manifest's source hashes for `src/App.vue`, `src/stores/gameStore.ts`, and `src/stores/gameStore.test.ts` differ from this checkout. The focused follow-up matched all 35 source hashes and all three HTTP asset hashes in `final-manifest.json`. The label identifies the source as `738bc00 + O1 verified patch`; it does not claim the commit alone contains the recovery fix. The run folder's append-only history retains three earlier harness/setup failures and their checkpoints; the final run passed all cases.
