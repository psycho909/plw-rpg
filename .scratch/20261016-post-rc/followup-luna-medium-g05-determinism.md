# Lead review follow-up (luna-medium-g05-determinism)

Change requested in `src/engine/postRcDeterminism.test.ts` only:
- `reload()` uses `Object.assign(state, restored)`. Keys that exist on the live object but are not serialized survive the "reload", so a field dropped by save/load would be masked — exactly what G-05 must detect. Make Run B continue from the restored object itself: hold the state in a `let` and reassign `state = deserialize(serialize(state, SAVE_TIME)).state` at each boundary (re-resolve `player(state)` after each reload; never reuse a pre-reload reference).
- Add one assertion per boundary that the restored state round-trips: `serialize(restored, 0) === serialize(beforeReload, 0)`.
- In the summary, add a short "Controlled fixture fields" list (store position, wood/stone/gold/stamina, threat/safety/guard jobs) and why they are needed.
Rerun `npx.cmd vitest run src/engine/postRcDeterminism.test.ts` twice and `npx.cmd vue-tsc --noEmit`; update the same summary file. Reply with only its path.
