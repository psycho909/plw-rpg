# Cloud Save MVP implementation (sol-medium-cloud-save)

You ARE the assigned worker `sol-medium-cloud-save`. Do the work yourself; do not delegate; do not use herdr; no commit/push; never print or write secrets.
Ticket + Lead design contract (implement EXACTLY it): `tickets/20261017-cloud-save-mvp.md`. Branch `feature/cloud-save` (already checked out); `@supabase/supabase-js@2.117.2` is already installed — do not add other dependencies.

## Files you own
- New: `src/services/cloudSave.ts` (pure logic: checksum, validation, insert/conditional update/fetch, conflict classification; takes an injected Supabase-like client so it is unit-testable), `src/services/cloudSave.test.ts`.
- New: `src/stores/cloudStore.ts` (Pinia store: config from `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`; disabled when missing; auth session restore + `onAuthStateChange`; sync metadata in localStorage `oakvale-cloud-sync-v1`; auto-sync driven by `watch(() => game.savedAt)` only when `game.writerReady`; online/offline handling; conflict state), `src/stores/cloudStore.test.ts`.
- New: `src/components/CloudSaveWindow.vue` (status, last sync time, cloud revision/world time, login/logout, upload, load, conflict choices with explicit confirmations; the load path first downloads a local checkpoint backup file and requires confirmation).
- Edit (minimal): `src/stores/gameStore.ts` — add `adoptCheckpoint(raw)`: validate with `unpackCheckpoint`, stop all writes (`writerReady=false`, speed 0), write `localStorage[SAVE_KEY]`, then `location.reload()`; only allowed when this tab is the writer. Export it from the store. No other gameStore change.
- Edit (minimal): `src/App.vue` — add a "雲端存檔" menu entry/window id that renders `CloudSaveWindow`; nothing else. Add `src/vite-env.d.ts` typing for the two env vars if needed.
- Add `.env.example` with the two variable NAMES only (no values).

## Rules
- Never upsert. Insert revision 1 (unique violation 23505 → conflict). Update with `.eq('user_id', uid).eq('slot_id','primary').eq('revision', expected)` + `.select()`; 0 rows → conflict/auth anomaly → refetch. Verify returned revision/checksum.
- Download: verify `sha256(checkpoint) === checksum` and `unpackCheckpoint` before offering to apply; corrupted → refuse.
- Reject checkpoints > 8 MiB (UTF-8 bytes) before upload.
- Offline / network errors / 401: keep local play; show status; never clear local data.
- Journal, writer lock, migration untouched except `adoptCheckpoint`.

## Tests (mock the client; real Supabase is tested by the Lead)
First insert; concurrent insert 23505 → conflict; conditional update success → revision+1; 0-row update → conflict and refetch; checksum mismatch on download → refuse; corrupted checkpoint (bad JSON / failing unpackCheckpoint) → refuse; oversize → refuse; network error → offline status, local untouched; 401 → re-login status; auto-sync only for writer + logged in + interval; conflict stops auto-sync; adoptCheckpoint refuses invalid raw and in a non-writer tab; load path requires backup + confirmation; cloud disabled when env missing (game unaffected).
Run `npx.cmd vitest run src/services/cloudSave.test.ts src/stores/cloudStore.test.ts src/stores/gameStore.test.ts` and `npx.cmd vue-tsc --noEmit` (escalation allowed).

Output `reports/v2/cloud-save/sol-medium-cloud-save-summary.md` (files, design notes, test results, risks). Reply with only that path.
