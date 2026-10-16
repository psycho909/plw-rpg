# Phase10-R common rules
- Ticket `tickets/20261016-v2x-10r-external-review-fixes.md`; external review `reports/v2/20261016-final-qa-rc/phase-10/Oakvale-V2x-External-Code-Review.md` (read your findings fully). HEAD `0d86c50`; baseline check PASS 45/658.
- Minimal fixes only; no balance/config number changes; no save schema change (old saves/journals must still load); TDD: write the failing test first, record it failing, then fix.
- You are the single owner of the files listed in your dispatch; do not touch the other worker's files.
- Sandbox escalation allowed: `npx.cmd vitest run <files>`, `npx.cmd vue-tsc --noEmit`, `node scripts/`. Single standalone commands. Lead runs `npm.cmd run check`. Root-only Git; no commit.
- Evidence/notes under `reports/v2/20261016-final-qa-rc/phase-10/r-runner/` (your prefix). Summary: what changed, failing-before/passing-after test output, risks.
