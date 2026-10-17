# Independent review — Cloud Save MVP (luna-max-cloud-review)

You ARE the assigned reviewer `luna-max-cloud-review`. Read-only: do not edit files, do not delegate, do not use herdr, no git push, no Supabase/Vercel/GitHub calls that change anything, never print secrets (do not read `.env.local`).
Ticket + Lead design contract: `tickets/20261017-cloud-save-mvp.md`. Implementation: `git diff --ignore-cr-at-eol 2613459 -- src package.json` plus untracked files `src/services/cloudSave.ts`, `src/stores/cloudStore.ts`, `src/components/CloudSaveWindow.vue`, tests, `src/vite-env.d.ts`. Worker summary: `reports/v2/cloud-save/sol-medium-cloud-save-summary.md`. Real-service evidence: `reports/v2/cloud-save/real-e2e.md` and harness `scripts/cloud-e2e/e2e.mjs`.

Check:
1. Conflict safety: no upsert; first write INSERT revision 1 (23505 → conflict); updates conditioned on user_id + slot_id + revision; 0 rows → conflict + refetch; never silently overwrite. Any path (auto-sync, manual upload, overwrite, account switch, stale async result) that can overwrite a newer cloud revision or adopt an unverified checkpoint?
2. Data integrity: checksum + `unpackCheckpoint` validation before upload and before adopt; 8 MiB limit; `adoptCheckpoint` stops all writes before writing localStorage and reloading (game loop, pagehide flush, journal flush) — can the old in-memory state overwrite the adopted checkpoint? Journal / writer lock / migration untouched otherwise.
3. "Don't overwrite unbacked-up local progress": load requires backup + confirm; conflict pauses auto-sync.
4. Offline / 401 / token refresh behavior incl. the CS-F01 fix; local play never blocked.
5. Security: only URL + publishable key in the frontend; no secret/service role key; RLS relied on server-side (policies in real-e2e.md).
6. Test validity (mock tests) and whether the real E2E evidence supports the claims. Anything overstated?
You may run `npx.cmd vitest run src/services/cloudSave.test.ts src/stores/cloudStore.test.ts src/stores/gameStore.test.ts` (escalation allowed).

Final message (≤ 50 lines): verdict APPROVE / CHANGES REQUIRED, findings by severity (file:line, failure scenario, suggestion), what you ran.
