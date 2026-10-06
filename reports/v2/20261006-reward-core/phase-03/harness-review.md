# Phase 03 browser harness review

Owner: `gpt6luna_max_browser_harness`

Artifact: `stress_browser.py`

SHA-256: `074fc944335e049f06c9b900b56b216e96d308190d5c0472a9cd2ecd4ddde5eb`

Status: **STATIC READY FOR INDEPENDENT REVIEW**

The harness requires the production build source fingerprint to match all 74 current `src` files, defaults to `http://127.0.0.1:5202`, and refuses a duration below 1,200 real seconds. It uses visible UI actions for legal rest, native shop purchases, owned gear, all five wolf definitions, and the boss save/reload/flee/rest/retrack/win route. Victory evidence is encounter-scoped using the monotonic event sequence, so a full 150-event ring cannot cause stale wins. Every rank record, including a first-attempt gray win, records `won: true`.

The boss reload check reads the first successful `oakvale-v1` write from a per-document `Storage.setItem` observer that forwards the exact receiver and arguments to the native method. It compares that saved checkpoint before pausing through the real UI, reopens persisted combat through the context action, asserts retrack does not consume RNG, and records goblin flags/progress directly around the final winning command with the world-minute and midnight delta.

Static validation: `python3 -m py_compile` passed, and the current source fingerprint matches `build-status.json`. This owner did not run a browser or modify app source. The 1,200+ second Chromium run remains for the root/Luna runner; no stress-pass claim is made here. Author-requested profile is Luna/max; runner-requested profile is Luna/low; neither runtime profile is independently verified. Human Fun Gate, feedback and retention surveys are **DEFERRED / NOT APPLICABLE AT THIS STAGE**.

Audit gap: root confirmed the earlier unrun preflight draft was absent from the playlog before its first overwrite. Its original content is unrecoverable and is not reconstructed. All subsequent published script versions, including this SHA, are writer-recorded.
