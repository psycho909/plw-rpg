# Post-RC Technical Hardening — common worker rules

- Ticket: `tickets/20261016-v2x-post-rc-hardening.md`. Source under test: `6a15a2b` (src tree `b1a1ff20…`, same as RC `76595c5`).
- You are a single named worker. Do the work yourself; do not delegate; do not use herdr; do not start Codex.
- NO product source changes in `src/` except the files your dispatch explicitly lists. Never change save schema, journal schema, balance numbers, crisis/defender rules, or existing tests' expectations.
- Keep Owner decisions: Threat KEEP V0, S-01 KEEP CURRENT VALUES, Farming V4, Merchant NOT MODELED, Human Product DEFERRED.
- Use only legal seeds, GameState built by existing engine functions, and public actions/engine APIs. Do not hand-edit state in ways the game cannot reach unless clearly labeled as a controlled fixture, and say why.
- No commit/push. Root Lead commits.
- Sandbox escalation allowed: `npx.cmd vitest run <files>`, `npx.cmd vue-tsc --noEmit` (single standalone commands). Lead runs the full `npm.cmd run check`.
- Evidence and your summary go under `reports/v2/20261016-final-qa-rc/post-rc/` with your worker-name prefix. Keep logs small.
- Classify each result as exactly one of: CONFIRMED DEFECT / VERIFIED SAFE IN TESTED SCOPE / PRODUCT DECISION REQUIRED / NOT TESTED.
