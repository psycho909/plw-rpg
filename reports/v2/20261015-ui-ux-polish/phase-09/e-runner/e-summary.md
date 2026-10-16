# Phase9-E worker summary — visual consistency and feedback

## Scope completed

- Added `scripts/phase9/e-probe.mjs` for a production-dist fresh-save route. It uses Chrome/CDP, checks each control hit with `elementFromPoint`, records screenshots and probe JSON, and records the Chrome profile size before removing only the profile inside its attempt. Attempts are preserved.
- Added actual smithing practice XP to the successful craft status notice using the crafting plan's `practice.xpAward`; zero-XP plans do not show a fabricated award.
- Updated `gameStore.act` so a boss-defeat message is not overwritten by the later generic `combat.won` event; the immediate message preserves both boss result and reward.
- Added two craft-message formatting tests and one store-level boss feedback regression test.
- Updated `world-feedback.md` with measured and source-reviewed action findings, confidence boundaries, and retained Phase9-C references. Updated the visual section of `responsive-visual-review.md`.

## Evidence and findings

- Gather-only production attempt: [`attempt-20261016T012939967Z/probe-results.json`](attempt-20261016T012939967Z/probe-results.json) remains as prior evidence. The post-build full browser recheck is [`attempt-20261016T013838256Z/probe-results.json`](attempt-20261016T013838256Z/probe-results.json).
- Initial opening/world and action screenshots are interaction-state before/after captures, not a claimed CSS diff. The inspected black/white palette, zero radius, Chinese font stack, and 4/8/12/16 px spacing remain consistent. No SCSS/layout edits were needed; no Phase9-D height allocation rules were changed.
- The post-build normal fresh-save lane gathered the inputs at the forest and mine, then crafted `starterSpear` at the store workbench. The success notice read `製作完成：獵矛。 鍛造熟練 +10。`; the same workbench plan specified `+10 XP`, confirming the real numeric practice award. The notice itself omits the `XP` unit. A post-cap craft was not included because it would require several additional full material batches and stamina recovery steps. Gather and craft entries are captured in `gather-and-craft-event-log.png`.
- A distinct controlled boss lane uses engine `createGame(93018)` and `encounter(state, true)` to produce a normal Goblin Chief combat state. The fixture manifest records original HP 110, max HP 110, 150 XP, 100 gold, and the single adjustment of current HP to 1 to make a visible one-turn victory deterministic. An elementFromPoint-verified visible Attack click showed the boss result and reward together (`哥布林酋長被擊敗… 戰鬥勝利！獲得 150 經驗與 100 金幣。`); the event log contains separate boss-defeated and combat-won entries. The controlled starting save is kept separate from the fresh-save craft route.
- Other E scenarios remain explicitly source-reviewed or covered by retained C evidence, not newly observed browser routes.
- Retained runner diagnostics: `attempt-20261016T011930882Z` (`spawn EPERM` inside sandbox), `attempt-20261016T012146635Z` and `attempt-20261016T012214424Z` (initial probe flow/target selection), `attempt-20261016T012243025Z` and `attempt-20261016T012309688Z` (map target hit-testing), and `attempt-20261016T012346882Z` (interaction button selection). These are harness-only attempts and are not product findings. The first invocation failed before creating an attempt directory. `attempt-20261016T012420556Z`, `attempt-20261016T012646525Z` and `attempt-20261016T012833877Z` are earlier successful gather/log runs; final run `attempt-20261016T012939967Z` includes state measurements and final classifications.
- The new craft/boss recheck keeps all further attempts: `attempt-20261016T013657250Z` captured the successful craft but the initial parser expected an explicit `XP` suffix; `attempt-20261016T013732972Z` completed the full route but its map screenshot was taken after travel; final `attempt-20261016T013838256Z` records the numeric award correctly and captures the map before travel. These are harness diagnostics, not product failures.

## Verification

- `node --check scripts/phase9/e-probe.mjs` — PASS after the craft and controlled boss probe changes.
- `npx.cmd vitest run src/stores/gameStore.test.ts src/presentation/craftingFeedback.test.ts` — PASS, 2 files / 37 tests.
- `node scripts/phase9/e-probe.mjs` — PASS, attempt `attempt-20261016T013838256Z`; gathered-input fresh-save craft, live +10 smithing XP notice, event-log review, controlled visible Goblin Chief defeat/reward notice, and both boss log entries captured. Chrome profile size was 57,802,498 bytes before profile-only cleanup.
- [`npm-run-check-e.log`](npm-run-check-e.log), Lead execution of `npm.cmd run check` — **PASS**, 41 test files / 650 tests; TypeScript check and Vite build passed (103 modules transformed).

No commit or push was made. No save schema, engine rules, balance values, modals, or D layout rules were changed. All attempts were retained; only the Chrome profile within each attempt was removed after recording its size.
