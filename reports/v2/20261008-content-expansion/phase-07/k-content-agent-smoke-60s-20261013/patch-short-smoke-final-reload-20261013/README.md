# Short content-agent smoke final reload patch

The preserved Browser RED is run `20261013T141005Z-pid398613` (66.89 seconds, 13 actions, 2 checkpoints, no normal reload), which failed only at finalization because the 60-second content-agent lane ended before the first 300-second scheduled reload. The original Browser run directory and its hashes are unchanged.

The runner now performs one final ordinary UI save/reload after a non-regression lane reaches its requested duration if no scheduled reload occurred. This uses the existing `normal_save_reload` path, records the final checkpoint, and does not inject state or run controlled fixtures. The 300-second periodic reload schedule remains intact; the long-lane `normalReloadCount >= 1` gate is unchanged.

The follow-up smoke `20261013T141529Z-pid399101` completed with launcher exit 0 and source stability true. It ran 74.39 seconds including finalization, recorded 13 actions and 2 checkpoints, and verified 1 ordinary UI reload (`short-content-agent-smoke-final-save-reload`) with no runtime differences, no browser errors, and no controlled fixture lane. Its last runner heartbeat stage was `final_save_reload`. The exact launcher result and raw-run checksums are in `green/` and the raw run remains under `qa-browser-runs/20261013T141529Z-pid399101`.

See `green/` for 34 passing contracts, static checks, and the 60-second Browser smoke evidence. The run used runner SHA-256 `a2f5e3478d99a4e693d7b43441836441598ffa685c01c694945174da7a9331a4`. No release manifest, `src/`, or `dist/` changes were made.
