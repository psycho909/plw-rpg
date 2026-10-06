# Active dungeon, party, gear and life save/reload check

- Status: **passed**
- Source: `441e3c2b435f199a50cb78ee5b19521bcc084593`; served at `http://127.0.0.1:5197`
- Existing profile: `/tmp/plw-v2-final-adventure-profile-source-final-02`
- Browser run: 2026-10-05T20:36:26.748+00:00 to 2026-10-05T20:36:52.670+00:00
- This short coverage check is not Agent playtime or soak credit.
- No application source changes, direct state/time/resource injection, debug injection, cache clearing, or world reset.

## Build and profile preflight

- Source manifest: 58 files; all match: `True`.
- Served immutable assets: 3; all match manifest: `True`.
- Initial saved profile has full expected root shape: `True`.
- Initial character has equipped weapon and armor: `True` / `True`.
- Active party is non-empty: `True`; owned home present: `True`.
- Startup attempts stopped before deliberate gameplay controls: 2; details and screenshots remain in the JSON/playlog archive.

## Run result

- **immutable source and served asset fingerprint** — `passed`. 58 source hashes and all three served assets matched the frozen 441 manifest.
- **retain the sole writer-ready restored tab** — `passed`. A visible duplicate-writer warning identified the blocked session-restored clone; only that blocked tab was closed.
- **load the existing completed Adventure profile** — `passed`. Initial browser storage in the sole writer-ready restored tab retained active character, weapon/armor, Lucy party and owned home; no direct state injection was used.
- **pause world through the rendered UI** — `passed`. Used the visible normal pause button before travel.
- **travel, enter dungeon, explore into combat** — `passed`. Actions were performed with rendered map/context/dungeon buttons.
- **pause and save active combat through normal UI** — `passed`. Pause control and header 存檔 button were clicked; full post-save storage was captured.
- **continue with one rendered attack after reload** — `passed`. Clicked the visible 攻擊 button; a changed combat/event state was observed.

## Save and reload evidence

- Saved combat persisted in pre-app reload storage: `True`.
- All 21 simulation root fields match exactly across the normal UI save and pre-Vue reload capture: `True`.
- Difference in the complete 23-field root: `['lastSavedAt']` (the `lastSavedAt` metadata timestamp changed on pagehide auto-save).
- Combat scene restored after mount: `True`; visible pause control then stopped the resumed clock.
- Reloaded profile: `{"player": {"id": "alden", "level": 7, "equipment": {"weapon": "sword", "armor": "armor"}}, "party": ["露西 7"], "ownedHome": "property:home:alden", "dungeon": {"discovered": true, "threat": 1, "progress": 0, "runs": 2, "stage": 0, "inDungeon": true}, "activeCombat": true, "requiredStatePresent": true}`.
- One visible post-reload attack registered: `True`; afterward combat is `None`, dungeon stage is `1`, and player level is `8`.
- Page errors: 0; console errors: 0 (recorded verbatim in JSON).

### Full browser screenshots

- [00-restored-app-tab-1.png](active-dungeon-party-reload-screens/00-restored-app-tab-1.png)
- [00-restored-app-tab-2.png](active-dungeon-party-reload-screens/00-restored-app-tab-2.png)
- [01-loaded-owned-party-gear.png](active-dungeon-party-reload-screens/01-loaded-owned-party-gear.png)
- [02-active-dungeon-combat-before-save.png](active-dungeon-party-reload-screens/02-active-dungeon-combat-before-save.png)
- [03-after-ui-pause-save.png](active-dungeon-party-reload-screens/03-after-ui-pause-save.png)
- [04-after-reload-combat-restored.png](active-dungeon-party-reload-screens/04-after-reload-combat-restored.png)
- [05-after-resumed-attack.png](active-dungeon-party-reload-screens/05-after-resumed-attack.png)

### Stored root snapshots

- `initialProfileExistingRestoredPage`: 23 root fields; full state and localStorage entries preserved in JSON; capture source: existing restored app page; post-mount read-only initial capture.
- `initialProfilePostMount`: 23 root fields; full state and localStorage entries preserved in JSON; capture source: browser localStorage read only.
- `activeDungeonCombatBeforeSave`: 23 root fields; full state and localStorage entries preserved in JSON; capture source: browser localStorage read only.
- `postUiSaveBeforeReload`: 23 root fields; full state and localStorage entries preserved in JSON; capture source: browser localStorage read only.
- `preAppAfterReload`: 23 root fields; full state and localStorage entries preserved in JSON; capture source: init_script before Vue/app bundle.
- `postReloadMountedAndPaused`: 23 root fields; full state and localStorage entries preserved in JSON; capture source: browser localStorage read only.
- `afterReloadedAttack`: 23 root fields; full state and localStorage entries preserved in JSON; capture source: browser localStorage read only.
