# S-02 defender lifecycle characterization

Scope: extended `src/engine/postRcS02Defender.test.ts` only; no product source changes. Fixtures use a legal started crisis and controlled guard roster/equipment, with crafted item provenance matching the existing starterSpear fixture.

## Observed behavior against Owner rule

| Case | Observed behavior | Matches Owner rule? |
|---|---|---|
| Living defender with gear | Gear row contributes one effective slot and readiness. | Yes |
| Temporary injury | Defender leaves the eligible workforce; effect pauses, ledger row remains. Save/reload preserves this state. | Yes: paused, not released |
| Injury recovery | After engine time advances past `injuredUntil`, the same allocation resumes its effect. | Yes |
| Permanent death below ledger ceiling (severity 1 fixture) | Dead defender's effect stops; a replacement within the target roster accepts new gear while ledger count is below 16. | Yes: capacity is effectively available; no refund or transfer |
| Severity 3 with 16 rows | Existing case: death stops the effect and keeps the row, but a replacement cannot contribute because the global 16-row ledger cap is full. | **No**: effective capacity is not reusable at the ceiling |
| Duplicate `instanceId` | Rejected with no gold or ledger mutation; the item remains in the inventory fixture. | Yes: duplicate rejected |
| Craft recognition after death | Dead defender's immutable craft row remains included in the accumulated threshold; one major event/reputation award occurs at threshold and later contribution does not award it again. | Yes: history retained, no duplicate reward |
| Save/reload | Round-trip is asserted for injured state, existing full-ledger death case, successor removal, and resolved crisis. Mid-active reload and uninterrupted replay produce identical serialized state. | Yes for covered persisted states |
| Crisis resolution | Resolved outcome matches across both runs; the dead defender's gear row remains in the resolution history. Outcome is compared deterministically by the test rather than hard-coded. | Yes: history retained; dead gear contributes no active readiness |
| Defender chosen as successor | The NPC leaves the workforce, equipment effect stops, and the crisis row remains. | Yes for permanent loss/history; capacity remains subject to the same 16-row ceiling |

## Findings and undefined states

- The only observed Owner-rule failure is the full-ledger ceiling: at 16 rows, a replacement cannot receive gear even after a permanent casualty. The current ledger cap and save validation were left unchanged as required by the dispatch.
- At lower ledger counts, replacement succeeds because new contributions are allowed; the ledger does not delete or rewrite the dead defender's history.
- Retirement and changing a defender's job away from guard/mercenary were not directly exercised. The code's current workforce predicate excludes workers who are no longer eligible defenders, so their rows cease contributing to readiness but continue counting toward the ledger ceiling. Product intent for these transitions remains unspecified.
- Major recognition deduplicates by cumulative craft effect crossing its threshold, including rows for unavailable defenders; it does not award again after crossing.
- The duplicate-ID rejection test deliberately reinserts the consumed instance to reach that guard. This is an invalid inventory/ledger overlap under save validation, so no round-trip claim is made for that synthetic duplicate state.

## Verification

- `npx.cmd vitest run src/engine/postRcS02Defender.test.ts src/engine/crisisContributions.test.ts src/engine/civilDefense.test.ts`: **3 files, 37 tests passed**.
- `npx.cmd vue-tsc --noEmit`: **passed**.
- No product files changed. Full `npm.cmd run check`, browser smoke, independent review, commit, and push were not run; the lead owns full check and publication.
