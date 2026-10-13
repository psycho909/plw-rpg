# F Goblin Bias Correction — Validation Evidence

## Source and revision

- HEAD before/after: `e05cc78f1ef452e2672df223f2febf48444dcbd3` / `e05cc78f1ef452e2672df223f2febf48444dcbd3`; unchanged.
- Changed files by this QA: none. The captured source/config/package SHA map had 117 files before and after with no differences.
- Corrected Goblin module SHA-256: `61b109a69611743f6b4d3983fb252a40dc8a8d1758a4154af034fa2d91c9bb13`.
- F validator content counts: 66 monsters, 48 materials, 48 equipment, 24 recipes, 0 crops/goods.
- F combined quality: 66 qualifying monsters, 96 candidate item IDs, 48 usable materials; 48 validator-qualified gear candidates. The gear audit found 48 definitions and 0 functional clone groups.
- All seven individual/combined F validator invocations exited 0 with Content PASS, typecheck PASS, and publisher PASS. There were 0 content errors and 0 warnings. Raw commands, stdout/stderr, case outcomes and retained-source/input snapshots are in `f-content-validation-run/runs/2026-10-13T07-26-49.218Z-83f60eb4-456f-4e14-a8ad-b10771503854`.

## Targeted reproduction and typecheck

Run directory: `f-regression-run/attempt-03-goblin-bias-validation`.

- Named regression: `keeps Wild and Frontier bias materials compatible with their recipe outputs and exposes planned gear in selected loot` — 1 passed, 12 skipped (the other tests in the file), exit 0.
- `npm exec -- vue-tsc --noEmit` — exit 0.
- UTC: targeted `2026-10-13T07:26:38.986+00:00`–`2026-10-13T07:26:40.145+00:00`; typecheck `2026-10-13T07:26:40.145+00:00`–`2026-10-13T07:26:45.252+00:00`.
- HEAD and full 117-file source/config/package map remained unchanged before and after both commands.

## Full check

Run directory: `f-regression-run/full-check-attempt-01`.

- Command: `npm run check` (runs `npm run test && npm run build`).
- Exit 0; 605/605 tests passed across 34 files; build ran `vue-tsc --noEmit` and `vite build`, transforming 95 modules and completing successfully.
- UTC `2026-10-13T07:28:02.211+00:00`–`2026-10-13T07:28:48.925+00:00`; Taipei `2026-10-13T15:28:02.211+08:00`–`2026-10-13T15:28:48.925+08:00`; duration 46.714 seconds.
- HEAD unchanged and 117-file source/config/package map unchanged.

## Scope limit

These checks provide test-suite, typecheck, build, and content-validator evidence. They did not execute a browser, browser automation, or end-to-end UI scenario; browser behavior is therefore not established by this report.
