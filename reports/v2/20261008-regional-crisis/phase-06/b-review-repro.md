# Phase 6B save severity coercion reproduction

- Result: REPRODUCED; runner exit status `0`.
- Base: `b82de85fb251697fca3e4331c5bb44945349a387`; frozen source count `82`; fingerprint `85b0cdb5eb05a9ab650b083e6d962bbd44554e18f5ba79e7af87a091b5a6b663`.
- `saveService.ts` SHA256: `00454f3a02728517049da879de87987a0bf1bab71364911c0155b37ca8dcad41`.
- Fixture: `createGame(20261008)` followed by public `tryStartRegionalCrisis(state, () => 0)`; legal warning severity 2 with threat population 30, threat level 2, camp level 2, safety 60.
- Fixture `worldTime` and `rngState` are recorded from the generated state; neither was edited by the runner.
- Number severity control: PASS (`number_2_control` accepted as number `2`).
- Expected-reject coercion cases accepted: string_2, array_2.
- Each case begins with `serialize` output; only `regionalCrisis.severity` is changed before JSON parse through `deserialize`.
- Full raw JSON inputs, actual acceptance/rejection, output severity types, stdout/stderr, exit status, and source hashes are archived in `b-review-repro-raw.json` and `playlog.jsonl`.

## Case outcomes

| Case | Expected | Actual | Output severity type |
|---|---|---|---|
| `number_2_control` | accept | accepted | `number` |
| `string_2` | reject | accepted | `string` |
| `boolean_true` | reject | rejected | `n/a` |
| `array_2` | reject | accepted | `object` |

Repro finding: `validRegionalCrisis` in `src/services/saveService.ts` checks `![1, 2, 3].includes(Number(value.severity))`; numeric coercion permits malformed JSON values such as string `'2'` to pass this severity membership check. No source or test files were changed.
