# Phase 4 playlog recovery

Manifest: `phase04-playlog-20261007T014622Z.manifest.json`

The original raw journal remains at `archive/playlog.jsonl`. Reassemble the parts in listed order: `cat phase04-playlog-20261007T014622Z.part-001.xzpart phase04-playlog-20261007T014622Z.part-002.xzpart phase04-playlog-20261007T014622Z.part-003.xzpart > recovered-playlog.xz`. Compare the compressed SHA-256 with `concatenatedXzSha256`, then run `xz -dc recovered-playlog.xz > recovered-playlog.jsonl` and compare its SHA-256 and byte count with `rawSha256` and `rawBytes`.

## Historical projection gap and explicit supplement

The frozen archive has 4263 valid records and preserves all existing recorded bytes. Its latest published driver record is old4fa911a4, while the reviewed/runtime-hashed current driver is8412261b;27/28 existing projections match, one does not. The manifest preserves that mismatch. Current driver bytes are also committed at archive/final-runtime-driver.py and explicitly captured after freeze in final-runtime-driver-post-freeze-capture.py with post-freeze-capture.json. This is current-file capture, not a claim that intermediate edits were automatically recorded. The frozen rawJSONL/XZparts and their checksums were not changed.
