# Phase 03 cooldown assertion correction

Harness: `stress_browser.py`

Corrected SHA-256: `1423a3638721e7866feb78b3e863d4723f60d8d4a9228d44ec84a34347e47280`

Status: **narrow fix published; static checks only**

The original browser attempt (`20261006T065612Z`) ran for 13.16 seconds and exited 1 at the cooldown-row assertion. Immediately after the wolf king win the saved world was at minute 5968, with `wolfBossDefeatedAt` 5967 and monster population 0. The character was alive (level 5, 166 gold, 91 HP), all five wolf definitions were defeated, and the saved wolf boss form was clear. The failure screenshot shows the row disabled by “附近暫時沒有怪物。”: the global population blocker takes priority over cooldown text. This was a harness expectation error, not an observed cooldown defect.

Evidence is preserved: [status](browser-stress-status.json), [stderr](browser-stress-stderr.txt), [stdout](browser-stress-stdout.txt), [run JSON](stress-browser.json), [raw save](failure-raw-save.json), and [failure screenshot](20261006T065612Z-failure-screen.png). The only console error was a favicon 404; page errors, unhandled rejections, and storage errors were zero.

The corrected harness records the actual disabled row and state first. When monster population is below 1, it follows the existing visible-UI `rest_until` route, capped at 120 game-hours, until population recovers. It then reopens the forest and checks that `wolfBossDefeatedAt` is unchanged and `wolfBossForm` remains null. If recovery stays inside the seven-day window, it asserts the disabled row shows the cooldown reason and the exact ceiling-rounded remaining days. If legal recovery crosses the expiry, it records a design finding and does not claim the cooldown was observed. No state is injected and no app source changed.

`python3 -m py_compile` passes and the current 74-file source fingerprint still matches `build-status.json`. This owner did not rerun the browser; root/Luna will run a fresh 1,200+ second attempt. The original short failure remains a failure, not a stress pass.
