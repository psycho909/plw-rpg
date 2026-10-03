# Persistence and Save Integrity Playtest

**Outcome:** two accepted-save integrity defects were reproduced in the fixed 694c6d7 browser build. The other persistence checks passed, with no browser `pageerror` events.

## Run

- Baseline: `694c6d76df67e3d3dd4da5aa98feba8581ecc2ba`, localhost static build at `http://127.0.0.1:5180/`.
- Browser: Python Playwright with `/usr/bin/chromium`, headless, new isolated Chromium contexts. Test fixtures were seeded through each context's `storage_state`; no active page's `localStorage` was edited before reload.
- Run: `2026-10-03T06:18:33.642513Z` to `2026-10-03T06:19:24.153986Z` (50.511 seconds), 13 cases, 0 page errors.
- Baseline identity came from the comprehensive playtest manifest and Git HEAD. The browser harness imports no application modules. Astra changed the working-tree `src/services/saveService.ts` during this run; the tested server remained the separately pinned 5180 static build, so these results do not validate that in-progress source repair.

## Confirmed defects

1. **A stale `nextNpcId` can make an accepted save impossible to reload.** A valid initial state with `nextNpcId=1` loads without warning even though `npc-1` already exists. Advancing across day 15 creates another `npc-1`; the UI can save that duplicate-ID state, but the next reload rejects it and blocks play pending world rebuild. The blocked page preserves the saved raw. Reproduce with `accepted_nextNpcId_collision_bricks_reload` in the script. Screenshots: [before reload](artifacts/next-npc-duplicate-before-reload.png), [blocked reload](artifacts/next-npc-save-blocked.png).

2. **Duplicate crop IDs lose a crop on harvest.** A save with two mature crops sharing `id=101` is accepted. One normal UI harvest removes both records but grants only the yield for one crop (5 food), permanently losing one crop's yield. Reproduce with `accepted_duplicate_crop_id_loses_crop`. Screenshots: [two crops before harvest](artifacts/duplicate-crops-before-harvest.png), [after one harvest](artifacts/duplicate-crops-after-one-harvest.png).

Both are controlled malformed-save fixtures, clearly separate from normal play. Their impact is observable state loss or a save that can no longer be continued; they are not validator-style preferences.

## Passed checks and accepted data policy

- A normal UI save and reload preserved the exact game state, excluding `lastSavedAt`. Controlled saved-state round trips also passed for growing crops, mid-combat, a mid-dungeon run, a hired party member, and a dead character at the successor screen.
- The `matureAt = worldTime + 0.5` fixture was accepted. After a live simulation tick, `worldTime` remained an integer, the crop matured, and the game saved and reloaded without warning or page errors. This candidate did not reproduce a runtime continuation failure.
- Offline elapsed cases produced 0 minutes for zero, negative, and future timestamps; 2 minutes for one second; 57,600 minutes at eight hours and above. Saving then reloading each result applied no second offline increment.
- Invalid JSON, unsupported version, missing field, fractional prepared plots, duplicate character/NPC ID, missing active-character ID, invalid position, invalid dungeon stage, combat/dungeon flag mismatch, and invalid `lastSavedAt` were rejected. All 10 original raw values remained byte-for-byte unchanged after manual save and a pagehide save.
- Throwing `setItem` preserved the prior save during manual save, the 10-second autosave, visibility-change, and pagehide attempts. Recovery through the UI retry button then succeeded in the same page. Throwing `getItem` and an unavailable `localStorage` property also preserved the seeded raw and displayed the protection warning.
- A 334,700-byte record with a 256 KiB character name was accepted and manually saved. The tested size caused no observed failure; there is no general serialized-byte-size rejection in this baseline. This does not establish behavior above browser quota.

## Reproduction and limits

Run from the repository root with the existing Python Playwright package and `/usr/bin/chromium`:

```sh
python reports/playtests/20261003-comprehensive/persistence/verify_persistence.py
```

The complete machine-readable outcomes are in [results.json](results.json); the runner is [verify_persistence.py](verify_persistence.py). It uses the shared `ui_helpers.py` only and does not import the historical UI verification script.

Coverage is limited to this Chromium build and disposable local fixtures. It does not cover real player profiles, other browsers, multi-tab races, or quota sizes beyond the tested record and injected `setItem` exception. This route did not alter source or official tests and did not stop the existing server.
