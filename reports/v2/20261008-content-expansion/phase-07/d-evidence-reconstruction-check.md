# Phase 7-D Deterministic Candidate Check

- Checked at repository HEAD: `f026b6b4947d18aadc0f551c642c31750db5768c`.
- Input: retained pre-gate-fix pack `d-cave-insect-pack.json`, SHA-256 `382665d4cc23d5e87c0848faff6a8a291ead28ad5de9d2a87847e5d472496a7e`.
- Expected failed-pack SHA-256 from the archived initial report: `5a03ea1f19fe78b1b7bd7cc8b96d189f95d36698bc407f9c929d2f7ca84a663d`.
- Precondition observed: `cave_insect_resin.bias` is exactly `{ "piercing": 1 }`.
- Single deterministic transform: parse the retained pack, set only `cave_insect_resin.bias` to `{ "keen": 1 }`, then serialize with `JSON.stringify` preserving parsed key order and no trailing newline.
- Candidate result SHA-256: `06806ef8363c4992ff942b2c43a998469dba0d570811ace1ef14d23a59fa22c0` (10,807 bytes); target did not match. No candidate file was written.

This is one bounded deterministic candidate check, not a search and not recovery of original bytes. The mismatch does not prove what any other historical bytes contained. No authentic failed authored-source SHA-256 or fingerprint was found or created; the current source or this candidate cannot stand in for that evidence. Phase 7-D remains blocked and E remains unreleased. No existing source, pack, report, ticket, or acceptance state was changed. No tests were run.
