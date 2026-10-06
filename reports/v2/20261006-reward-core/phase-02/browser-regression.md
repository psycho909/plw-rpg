# Latest Phase 2 V2 Browser Regression

Production Chromium: 20 checks PASS, 0 page errors.
Source base: f89c2c292aaadb6c22bc0453188661f22e4f15b2 + exact source fingerprints in browser-regression-status.json / browser-run/browser.json.

Current build matches tested working tree; sourceStableDuringRun and harnessStableDuringRun true. Core windows, Active Idle, native V1 migration / V2 defaults, ownership / identity / NPC / event views, save / reload and storage failure protection retain their existing verification. Raw artifacts and screenshots reside in browser-run.

This 17-second regression does not count as the required10-minute targeted run. Targeted initial failure and retry are preserved separately; gate pending until real-duration completion.
