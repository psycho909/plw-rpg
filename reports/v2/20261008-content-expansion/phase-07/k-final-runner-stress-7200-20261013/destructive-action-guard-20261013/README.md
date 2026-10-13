# Destructive world-action guard and blocked-modal fail-fast

The preserved stress reproduction is run `20261013T142116Z-pid399841`; see the parent `summary.md`, raw `actions.jsonl`, checkpoints, and detached hashes. It selected `重建世界`, then `覆蓋存檔並重建世界`, resetting world time from 128547 to 480. The subsequent identical blocked opening modal consumed 67 turns before the scheduled reload failed.

The runner now excludes explicit world-reset/rebuild and save-overwrite labels from actionable categories, including the confirmation button. Ordinary navigation such as `旅人筆記` remains selectable. If a modal has no recognized action or safe close path and the identical dialog/text/control fingerprint repeats for three turns, the runner persists the third blocked action with a failure reason and exits early. Ordinary observations, modal changes, and dialogs with recognized controls do not count toward this threshold.

`red/` preserves the two failing contracts before the change. `green/` records the focused contract suite, Python compilation, and scoped diff check. No Browser, long lane, release manifest, `src/`, or `dist/` changes were made.
