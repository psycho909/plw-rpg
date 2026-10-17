# Follow-up fix (sol-medium-cloud-save): re-login prompt cleared too early (P3, found in Lead real-service E2E)

Observed with the real Supabase project: after the access token AND refresh token were made invalid, a cloud read correctly set status `auth` / 「請重新登入。」. A few seconds later, without any successful re-authentication, status flipped back to `ready` with an empty message (the token was still invalid; the next cloud read went back to `auth`).
Cause: `acceptSession` in `src/stores/cloudStore.ts` clears `auth` for ANY auth event that carries the same user id (supabase-js re-emits the stored session, e.g. on visibility/focus recovery).

Fix (owner: `src/stores/cloudStore.ts`, `src/stores/cloudStore.test.ts` only): leave `auth` only when the event is a real re-authentication — `onAuthStateChange` event `SIGNED_IN` or `TOKEN_REFRESHED` AND `next.access_token` differs from the access token that was in use when the 401/auth failure happened (remember it at failure time). Same-token re-emits (INITIAL_SESSION, SIGNED_IN replay, etc.) must keep `auth`. Do not change anything else.
Tests: RED first (same-user, same-token event currently clears `auth`), then GREEN; a TOKEN_REFRESHED with a new token clears it; a successful cloud read after re-login clears it (existing behavior).
Run `npx.cmd vitest run src/stores/cloudStore.test.ts src/services/cloudSave.test.ts` and `npx.cmd vue-tsc --noEmit`. Append a "Follow-up" section to `reports/v2/cloud-save/sol-medium-cloud-save-summary.md` with RED/GREEN output. Reply with only that path.
