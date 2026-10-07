# Phase 6C — Civil Defense Model

Status: implementation frozen for independent review; Root has not yet released D implementation.

## Derived model

`deriveCivilDefense(state, crisis)` returns a value only for warning, preparation, active, and resolution phases. It is a pure derivation: it does not mutate `state` or the crisis, does not draw RNG, and persists no duplicate world snapshot.

Available defenders are living, work-age, non-retired, uninjured guards and mercenaries who are not in the player's party. Workforce and farmers use the same eligibility filter as `simulation.ts`; party NPCs do not work or farm but remain in the live population used for food consumption. Legacy NPC weapon and armor slots count only for eligible defenders. The defender target is `min(8, 2 + 2 × severity)` and gear capacity is two slots per available defender up to that target.

Food projection mirrors the current daily simulation net: `1.8 + farmers × 1.4 − alivePopulation × 0.12 − (bossAlive ? 1 : 0)`. It projects current food across the remaining warning, preparation, and active time until resolution, then bounds the shown stock to 0–100. The separate defense window excludes warning time and includes only remaining preparation plus active time. This makes a warning crisis show both its remaining warning duration and the full preparation/active duration still to come. C reports the current daily net and forecast days so a later contribution step can calculate a raw forecast before clamping, while readiness uses threshold-55 coverage and a bounded shortage.

Readiness is the weighted sum of bounded factors: defenders 30, average combat skill 15, legacy equipped slots 10, food coverage 12, safety 10, other eligible adult workers 8, settlement stage 5, prosperity 5, infrastructure 5. The weights sum to 100. Threat pressure is `20 + 14 × level + 0.2 × max(0, population − 30) + 8 × boss`, bounded to 0–100; demand is the higher of trigger-time cause pressure and current pressure. This preserves the cause floor after ordinary hunting while allowing a current escalation to raise demand. Success likelihood is a logistic curve of `(readiness − demand) / 18`, clamped to 0.1–0.9; C never resolves the crisis or rolls that probability.

## Verification

- `civilDefense.test.ts`: seven cases cover bounded deterministic purity, exact defender eligibility and equipment caps, simulation-matched food/population semantics, warning/preparation/active/resolution windows, cause-floor behavior, natural prepared versus underprepared settlements without player aid, player-stat independence, and dormant/aftermath exclusion.
- `regionalCrisis.test.ts` regression plus C tests: 16/16 passed.
- `npx vue-tsc --noEmit`: exit code 0.
- The first expanded preparedness fixture failure was a test setup issue: the underprepared town retained the full starting population and many farmers. The saved failure records the observed readiness 20; limiting the fixture to seven non-farming residents gave the intended underprepared baseline and the corrected test passed.

## Source and evidence hashes

| Artifact | SHA-256 |
| --- | --- |
| `src/engine/civilDefense.ts` | `4680ef90f5bc2560fc1e8b7296379aa001a7276e36e54a7131bc46b1754203bd` |
| `src/engine/civilDefense.test.ts` | `c05afe2ab42f334f3284f3b7830ea073db96707995b2336e2b30855d0c84e125` |
| `c-red-initial-civil-defense.txt` | `dc75576bc1f047570c868a71df0b79ef20098cea8b566cd25352f6b5a50159b7` |
| `c-green-initial-civil-defense.txt` | `9ea75779803cf896f916c7cbf0cdc6ec4acb26cd34c1adca838ab0e8e9bddc90` |
| `c-typecheck-initial.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `c-red-expanded-underprepared-expectation.txt` | `086cbc0d11083141f7dd5c10b1eb64f51aa5751e03d501a6081806a5bd568275` |
| `c-green-expanded-civil-defense.txt` | `4a6fc7387d36836292a71b0585b74aca80e43805a69f6d5573db40acd140b628` |
| `c-regression-civil-defense-regional-crisis.txt` | `727184917c4b37c04ea36b8670ec247afcfceac58c9dd0c680af043e411d2a6d` |
| `c-typecheck-final.txt` | `a5bd41ddc191579a2da22208a50aa789a78f0da44fc6fc375df5e02d6ac97830` |

