# J Browser Harness Independent Review

**Review basis:** launch-time harness snapshots and recorded runs at HEAD `bd316cb326e5fbc20087c0154d6e3f294a5daac7`; the four harness files were untracked at review time, so this is a direct-file review, not a committed-diff review. This review is pinned to the hashes recorded in each run’s `sourceBefore`; later shared-worktree edits are outside this review. The formal source is [`tickets/20261008-v2x-06j-qa-delivery.md`](../../../../tickets/20261008-v2x-06j-qa-delivery.md), especially Acceptance lines 22–24 and the J runner contract lines 39–43. The ticket cites Phase 6 spec SHA-256 `4e7d8533181a43f66c2d51dce056407a38be34797900ed875898e4470adde640`.

## Standards

**PASS WITH LOW FINDING.** Harness source, run outputs, checkpoints design, and provenance evidence are straightforward to inspect; the two launches used separate ports, browser processes, and run directories. `sourceStableDuringRun` is true for both runs. No source, build, or helper mutation was observed.

- **Low — launcher archive producer is mislabeled.** [`j_browser_launcher.py`](j_browser_launcher.py:101) publishes J launcher evidence as `phase6-g-browser-launcher`. The payload and directory identify J, but the recorded-report producer field names G. Correct the label in a later authorized harness change so archived provenance remains unambiguous.

## Spec

**FAIL — required long-run acceptance evidence was not produced.** Both launched runs were validly configured for their requested durations and served the current production build, but both terminated at the first agent action after about 186 seconds.

- **High — the ordinary one-day action selector does not match the live UI.** [`j_browser_runner.py`](j_browser_runner.py:150)–155 opens “地圖與世界” and looks for a “等待 1 日” button. The recorded failure screenshot shows the modal’s available control is “繼續時間”; Playwright reports that “等待 1 日” is absent. Both runs recorded one `wait_one_day` choice, then failed with `Locator expected to be enabled … element(s) not found`. This prevents the required agent and stress runs from progressing beyond warm-up.
- **High — success status does not enforce required coverage.** [`j_browser_runner.py`](j_browser_runner.py:467)–496 records `NORMAL_FRESH=UNREACHED` when no warning appears in the initial natural-UI window, but does not require the full normal fresh crisis arc before setting `PASS_J_BROWSER`. Likewise, six controlled lanes only set `controlledLaneStatus`; their failure to all pass does not prevent the final pass status. The pass gate also has no minimum checkpoint/metric count. This can report a run as passing without the ticket’s normal arc, controlled cases, or 60-second metrics.
- **Medium — periodic timing begins after warm-up.** [`j_browser_runner.py`](j_browser_runner.py:465)–481 spends up to 180 seconds in `normal_lane()`, then initializes `next_reload` to 300 seconds from that later point and does not call `checkpoint()` until after an agent turn. The first scheduled visible save/reload is therefore about 480 seconds after the actual normal-run start, and metric checkpoints also begin only after warm-up. Root’s clarified timing contract anchors save/reload and checkpoints to the actual normal run; the failed runs ended before either kind of evidence was produced.

- **Not evidenced:** neither run reached the requested 1200/1800-second duration, generated any 60-second checkpoint, periodic save/reload, natural warning-to-aftermath arc, or controlled UI lane. The standalone exact-clone 20k-history benchmark and browser-journal-growth measurement were not part of this harness review and remain pending. The report does not treat the warm-up clock polls as metric checkpoints.

## Run evidence and provenance

Both launchers served the exact files in the current `j-build-status.json`; each reports HEAD `bd316cb326e5fbc20087c0154d6e3f294a5daac7`, matching source/build hashes, and stable before/after provenance. They used distinct ephemeral localhost ports and separate directories:

- `20261008T004137Z-pid49257`, stress, requested 1200s; actual runner duration 186.29s; final status `FAILED`.
- `20261008T004137Z-pid49256`, agent-crisis, requested 1800s; actual runner duration 186.14s; final status `FAILED`.

Both have zero checkpoints, zero periodic save/reloads, and zero captured page/console/request/HTTP errors. The recorded [`failure.png`](j-browser-runs/20261008T004137Z-pid49256/failure.png) shows the open modal with “繼續時間”, corroborating the missing selector. The failure is a Playwright locator assertion, not an observed application exception. Neither runner wrote to fixture files; both output trees and ports are separate. Launch-time helper hashes (from run provenance): launcher `428fbff3f6d35d633d923d8718f5d5456af0de274851aa2ef7baa59069e7c866`, runner `31c650f39bc92487d2a696c88bac42113d56f73b5df28d3044714b020ecaa223`, support `0a5ee7cf4eae755d904bd8330a6e97af574ada6c3ca520d0edd317cd24defb28`, fixture generator `ad99459003741d3bb9d8ccccec77f2312e5020042d7f51d40a65403b9550ac84`.

**Review disposition:** do not accept J BrowserStress or AgentCrisisPlaytest from these runs. Preserve both failures as evidence, repair the UI action selector and pass gate, then run the requested long-duration validation against the frozen build. No browser was launched by this reviewer and no source/helper was modified.
