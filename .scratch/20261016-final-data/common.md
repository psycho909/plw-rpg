# Final data-integrity hardening — common worker rules

- Ticket: `tickets/20261016-v2x-final-data-integrity.md`. Base: HEAD `037289d`.
- You are a single named worker. Do the work yourself; do not delegate; do not use herdr; do not start Codex.
- Edit only the files your dispatch lists. Never change save schema, journal schema, the crisis ledger cap or validation, balance numbers, or existing tests' intent.
- Use legal seeds and engine/public APIs; label any directly constructed fixture fields and say why.
- No commit/push. Sandbox escalation allowed: `npx.cmd vitest run <files>`, `npx.cmd vue-tsc --noEmit` (single standalone commands). Lead runs the full `npm.cmd run check`.
- Write your summary to `reports/v2/20261016-final-qa-rc/final-hardening/<your-worker-name>-summary.md`; reply with only that path.
