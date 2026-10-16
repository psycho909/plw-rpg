# Task D — G-05 cross-system determinism (luna-medium-g05-determinism)

You ARE the assigned worker `luna-medium-g05-determinism`. Read `.scratch/20261016-post-rc/common.md` (rules apply).

## Gap (external review G-05)
"Determinism replay（`phase10Determinism.test.ts`）只是單回合 fixture；Long-world 為 No Intervention、沒有接班。「鍛造、危機、接班後中途 save／reload」的 replay 未覆蓋。"

## Do
Add ONE new test file `src/engine/postRcDeterminism.test.ts` (you own only this file). Reuse helpers/patterns from `phase10Determinism.test.ts`, `regionalCrisis.test.ts`, `lifeIntegration.test.ts`, `crafting.test.ts`, `phase10rSaveInvariant.test.ts`.

Scenario: legal seed → a fixed sequence through public engine actions covering Craft → Crisis (start via existing legal entry, contribute, advance through phases) → Save → Reload → Succession (player death via existing engine function, choose successor) → Continue (simulate further time and a few actions).

Run it two ways from the same seed + initial state + same action list:
- Run A: continuous, no save/reload.
- Run B: identical, but at ≥3 boundaries (after craft, mid-crisis, after succession) do `deserialize(serialize(state))` and continue from the restored state.
Assert equivalence of: RNG state, world time, active character identity, inventory/equipment, NPC references, crisis phase and contributions, reward/loot, world history/events, and the full serialized game state. If you must exclude any field (e.g. save timestamp metadata), exclude only that field and document why in a test comment and in the summary.
Also assert each restored state passes `deserialize` (no throw).

If A and B differ, do NOT change product code: keep the failing assertion as a reported finding (mark the test `it.fails` only if needed to keep the suite green, and explain), and describe the divergence precisely (first differing field, step).

Run `npx.cmd vitest run src/engine/postRcDeterminism.test.ts` (also run it twice to confirm stability) and `npx.cmd vue-tsc --noEmit`.

Output `reports/v2/20261016-final-qa-rc/post-rc/luna-medium-g05-determinism-summary.md`: sequence, boundaries, compared fields, exclusions + reasons, results, classification. Reply with only that path.
