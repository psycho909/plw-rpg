# Formal Run 03 — preserved failures

- 2026-10-05T04:02Z — Helper startup failure: `python3 -i /tmp/life-run3.py` could not import `scripts.recorded_reports` because Python put `/tmp` on `sys.path` and omitted the repository working directory. No browser was launched and no game state was touched. Corrected the helper to add the repository root to `sys.path` before importing the report writer. This is a harness setup issue, not a product bug.

- 2026-10-05T04:03:35.165+00:00 — menu 住所與產業: TypeError: Keyboard.press() got an unexpected keyword argument 'timeout'

- 2026-10-05T04:04:35.058+00:00 — menu 住所與產業: TypeError: Keyboard.press() got an unexpected keyword argument 'timeout'

- 2026-10-05T04:27:05.310+00:00 — menu 🌱: TimeoutError: Locator.click: Timeout 4000ms exceeded.
Call log:
  - waiting for locator(".pixel-menu").get_by_role("button", name="🌱", exact=True)


- 2026-10-05T04:27:24.937+00:00 — menu 🙂
農田: TimeoutError: Locator.click: Timeout 4000ms exceeded.
Call log:
  - waiting for locator(".pixel-menu").get_by_role("button", name="🙂\n農田", exact=True)


- 2026-10-05T04:29:10.080+00:00 — direct map target click for innkeeper exact newline label timed out at 3s (uncaught locator timeout; world state unchanged, REPL remained usable). Harness: direct click bypassed safe wrapper; use target filtering after querying rendered buttons.
