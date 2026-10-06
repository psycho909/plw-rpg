# Adventure Mastery Agent Exploratory Playtest

- Source commit: `c02b600c6f5f1533374d671b707d333c86d852d7`
- Immutable browser build: `http://127.0.0.1:5195`; manifest `../build-manifest.json`
- Browser: Chromium via Playwright; isolated persistent profile; all progress after initialization is via rendered UI.
- Initial seed: 17, canonical `createGame(17)` state defaults from `../seeds/seed-17.json`. The app UI has no seed selector. It is loaded once before starting the life; no time, item, gold, stat, or progress field is edited. Reloads use the persisted evolving save.
- Duration target: at least 3,600 real seconds. This is an Agent Exploratory Playtest, not human feedback.

Raw timestamped observations, state snapshots, and UI action records are appended to `results.json` and `playlog.jsonl`; screenshots are retained in this directory.

## Preserved harness attempts

- Before browser runtime, launch attempt 1 failed because the script resolved the repository root one directory too high (`ModuleNotFoundError: scripts`).
- Attempt 2 exposed the Python Playwright binding signature (`BrowserContext.add_init_script` accepts a single script string, not a separate argument). Both errors happened before app startup.
- Attempt 3 successfully loaded and verified seed 17 and recorded the initial UI checkpoint. It was stopped after roughly two minutes when review showed ten-minute interaction gaps were too passive for exploratory play. Its result/screenshot are preserved in `attempt-01/`; the archived report versions also remain in the append-only playlog.
- A later preflight exposed an orphaned Chromium `ProcessSingleton` lock from the interrupted persistent browser. The agent verified the process command targeted only its own `/tmp` profile, terminated it, and checked that zero Chromium processes remained. The profile had continued at ×20 without agent observation; it is retained as `profile-02` evidence and excluded from playtest duration/findings.
- An interactive-driver smoke against that preserved profile confirmed the world mounted but was immediately stopped because its state had advanced unattended. Its incomplete result is retained in `attempt-03/`.
- The formal exploratory run uses a fresh isolated profile seeded from canonical defaults, a post-preflight UTC/monotonic start, and a persistent interactive driver. The agent inspects each live checkpoint, records why the next objective changed, and sends only normal UI actions. Ten-minute snapshots support the reward/retention review.
