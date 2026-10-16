# V2.x Engineering RC — Baseline

- Date: 2026-10-16
- Ticket: [20261016-v2x-rc-final-acceptance](../../../../tickets/20261016-v2x-rc-final-acceptance.md)
- Executor: Claude Lead (Claude Opus 5.5, Claude Code), Claude-only flow per Owner decision; no Codex worker started.

## 1. Preflight — Codex Hooks（read-only）

Inspected `~/.codex/config.toml` `[hooks.state]`, `~/.codex/hooks.json`, plugin hook definitions, and `config.toml.bak` (2026-10-13) as the comparison point. Nothing was modified.

| Hook | Command | Trust state | Result |
|---|---|---|---|
| ponytail（session_start / user_prompt_submit / subagent_start） | `node` → `ponytail-activate.js` / `ponytail-mode-tracker.js` / `ponytail-subagent.js`（plugin 5.3.1, installed 2026-10-16 21:36 from `DietrichGebert/ponytail`） | All 3 `trusted_hash` values differ from the 10-13 backup; `config.toml` rewritten 21:42 | **UNVERIFIED new trust.** Most likely written by the Lead's blind confirm keystroke on a Codex "Hooks need review" screen (3 hooks new/changed). Quick scan: no network calls; writes local mode flag files; runs `git ls-files`. Not a security audit. |
| i-have-adhd（session_start） | `node` → `always-on.mjs`（0.4.1） | Unchanged since 10-13 | No change |
| `~/.codex/hooks.json`（10 events） | `herdr-agent-state.ps1`; `C:/Users/pc/.orca/agent-hooks/codex-hook.cmd` | Unchanged hashes; file mtime 10-13 | No change; script contents **NOT VERIFIED** |
| `[projects]` trust | `C:\Users\pc\orca\workspaces\dv3-dito-web\herring` | New since 10-13 | Origin **NOT VERIFIED** |

Owner decision (2026-10-16): option 3 — no Codex worker this round; ponytail trust not accepted; items above moved to Security Follow-up ([rc-risk-register](rc-risk-register.md) SEC-01..03); global settings not modified.

## 2. Source Freeze

| Item | Value |
|---|---|
| Branch | `v2x/reward-core` |
| HEAD / origin | `76595c5cd568e9b8a8d094a2bce4d7675817d324`（equal after fetch） |
| Working tree at start | clean |
| O-01 commit in HEAD | yes（`76595c5`） |
| Remediation chain | `0d86c50` → `99ae963` → `b21ce0c` → `5980de2` → `76595c5` |
| `git rev-parse HEAD:src` | `b1a1ff204ec4fbcf35035b5e7ecb0bd911346946` |
| src fingerprint（Phase10-E runner convention, repo-relative sha256 tree） | `dc7bac56eeea5e192dd49d236a3053dcd43bfbd66335295c9a688771b8f2ca03` |
| `HEAD:scripts` at start | `2df1020f31be5c9c36fb1b2dfade509e51fe88e4`（this round adds QA runner changes only; see [rc-regression](rc-regression.md)） |
| External Review | [Verification](Oakvale-V2x-External-Code-Review-Verification.md): APPROVED WITH FINDINGS; 4/4 VERIFIED_FIXED; O-01 fixed and locally reviewed（[ticket](../../../../tickets/20261016-v2x-10r-o01-load-compaction.md)） |
| Risk register | [final-risk-register](final-risk-register.md) + [rc-risk-register](rc-risk-register.md) |

Product source was not modified during this RC round.

## 3. Baseline regression（current HEAD, not reused）

`npm.cmd run check` on `76595c5`, 2026-10-16 ~22:05:

- Vitest: **48 files / 719 tests passed**（115 s）.
- `vue-tsc --noEmit`: pass. `vite build`: pass（existing warning: main chunk 502.67 kB > 500 kB）.
- dist fingerprint: `9ce31ea5793490aa6da23c3ff77ce8590ced7e61bed64437d0807ef687214272`（repo-relative runner convention）／`a018b478c92fc354996f790ad71016c3514799d610aeaea7aa4018155a2dcf61`（`sha256sum` list convention）; same 3 files.
- Environment: Windows 10 Enterprise 10.0.19045, Node v22.20.0, Chrome 155.0.8059.82（`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`, headless）.
