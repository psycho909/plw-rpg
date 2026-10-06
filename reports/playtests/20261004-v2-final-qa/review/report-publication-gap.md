# Report publication gap

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`.

The interim archive integrity check found the two completed Life Markdown projections differed from their latest PREPARED archive versions. Their content had been written to disk without publication through the append-first report writer. Root captured the actual existing versions with `kind=initial-capture`, then published those same verified bodies through `write_recorded`. This repairs current projection consistency; it does **not** establish that earlier intermediate Markdown versions were automatically recorded. No past timestamp or version is fabricated. The original prepared archived bodies and the raw `life-final/results.json` action/observation/failure versions remain intact. The affected projections are `life-final/README.md` and `agent-playtest-life.md`.

Hybrid projections were also mismatched during this live interim check while the continuation worker was editing them; root notified that owner to publish completed reports through the writer. Final artifact integrity is rerun only after all writers are quiet. This is a QA-report publication issue, not an observed game-save or journal loss.
