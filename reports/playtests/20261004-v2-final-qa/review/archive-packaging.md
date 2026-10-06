# Hybrid04 playlog archive packaging

Status: Hybrid04 accounting and report publication were closed before packaging. The raw archive remains at its original local path and is unchanged:

- Raw: `hybrid-final/resumed-segment-04/attempt-02/playlog.jsonl` — 112,436,289 bytes; SHA-256 `c6f2d83955fe4ba656795f0725fb3bcb78570933b260b2fe6d2d5af439d3e8d0`
- Gzip: `hybrid-final/resumed-segment-04/attempt-02/playlog.jsonl.gz` — 74,734,533 bytes; SHA-256 `d2d4601a3be8db106cf7ed27c5a449026755be40a872ecde4c761306a2732530`

Decompressing the gzip reproduces all 112,436,289 original bytes with the same SHA-256. The raw source is ignored by one exact `.gitignore` path entry; the gzip archive and its metadata remain trackable. The earlier `hybrid-final/playlog.jsonl` is 100,837,503 bytes (below the 100 MiB threshold) and stays plain.

`collectionSourceCommit` is `441e3c2b435f199a50cb78ee5b19521bcc084593`, taken from the frozen QA build manifest. The compressed archive’s report content explicitly records `results.json` source commit `441e3c2b435f199a50cb78ee5b19521bcc084593`. The metadata keeps these fields separate and does not relabel archive history.

`package_large_archives.py` writes metadata to this review directory through `scripts.recorded_reports.write_recorded`; it never appends to the source playlog after packaging. The validator treats raw plus gzip as one logical archive after matching byte count and SHA-256. With only gzip present in a fresh clone, it streams every record through the existing `decode_record`, checks checksums, and compares each latest projection. If a compressed archive exceeds the single-file limit, the helper stores ordered byte shards and the validator reads them as one gzip stream.

Verification completed:

- Packaging checked that the source identity, size, modification time, and full SHA-256 stayed stable during compression, then checked full decompressed byte equality.
- `package_large_archives.py verify` reported matching raw/gzip SHA-256 and byte counts.
- Both helper self-tests passed synthetic plain/gzip equality and mismatch detection. The artifact validator also passed gzip-only version/projection reconstruction and shard-stream checks.

Run the complete report check after all writers are closed:

```bash
python3 -B reports/playtests/20261004-v2-final-qa/validate_artifacts.py
```

Root additionally validated the **real H04 gzip-only reader** without modifying the local original: all 335 historical versions decoded with valid checksums and the latest results projection matched. This used the same logical reader as a fresh clone, with the raw representation excluded; it was not a full Git clone test. See [gzip-only-verification.json](gzip-only-verification.json).
