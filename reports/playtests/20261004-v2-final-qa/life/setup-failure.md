# Setup/reporting failure (preserved)

- Source commit: `c02b600c6f5f1533374d671b707d333c86d852d7`
- Context: fresh profile/new UI world was successfully created at 2026-10-04 23:55 UTC. Startup reporter then queried `s.worldHistory.length`; actual V2 save field is `history`.
- Original exception: `Page.evaluate: TypeError: Cannot read properties of undefined (reading \"length\")` at session.py state projection for nonexistent `worldHistory`.
- Impact: reporting bootstrap aborted after browser launch, before any world mutation. Save was untouched; no game progression or time advancement was injected.
- Resolution: updated the helper projection to read `s.history.length`; existing Playwright context/profile was retained.
- This setup failure remains recorded and is not a product bug.
