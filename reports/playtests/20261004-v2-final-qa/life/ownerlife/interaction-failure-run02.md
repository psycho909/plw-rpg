# Run 02 interaction failure (preserved)

At approximately 2026-10-05 03:53 UTC, the nearby-life dialog showed a list of NPCs. The world advanced while the dialog stayed open; the offered Hugo row disappeared and only the forest remained. Playwright exact-name click `get_by_role("button", name="🛡️ 雨果 6 ›", exact=True)` timed out after 30s. This revealed that the list was dynamic during the dialog; the initial failure is treated as a stale harness selection pending future UI confirmation.

A subsequent normal click of the top-level `暫停` control was blocked by the open modal (`<dialog open class="pixel-window"> intercepts pointer events`). `write_stdin` against session 36553 returned Unknown process id / exit code 1; process inspection found Python PID 157563 and Chromium still running with profile `/tmp/oakvale-life-profile-909-run2`, but stdin/stdout/stderr FDs were inaccessible (`Permission denied`). The profile was not killed, reset, or reopened. Run 02 counts only the observed active interval before approximately 03:56 UTC; later time is excluded.

This is a harness/session-control failure, not a confirmed gameplay bug. Raw Playwright traceback and call log were emitted in the terminal tool result at handoff; this summary preserves the triggering selector and interception evidence.
