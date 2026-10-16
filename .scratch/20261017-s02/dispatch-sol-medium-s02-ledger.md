# S-02 S2-A implementation (sol-medium-s02-ledger)

You ARE the assigned worker `sol-medium-s02-ledger`. Do the work yourself; do not delegate; do not use herdr; no commit/push.
Ticket + Lead contract (implement EXACTLY this contract): `tickets/20261017-v2x-s02-equipment-ledger.md` (section "Lead 契約").
Background: `reports/v2/20261016-final-qa-rc/final-hardening/s02-equipment-lifecycle-review.md`, existing characterization tests `src/engine/postRcS02Defender.test.ts`.

## Owner of (only these files)
`src/domain/crisis.ts` (add the history cap constant only), `src/engine/civilDefense.ts` (one exported pure helper for reserved allocations, if you place it there), `src/engine/crisisContributions.ts` (capacity check), `src/services/saveService.ts` (`validRegionalCrisisContributions` length cap + reserved ≤ 16 check), `src/engine/postRcS02Defender.test.ts`, `src/engine/crisisContributions.test.ts`, `src/services/saveService.test.ts`.
Do NOT change: allocation record shape, saveVersion, equipment numbers, crisis balance, recognition formula (`regionalCrisisRecognition.ts` keeps summing ALL rows), UI text (reuse 「目前沒有可用的防衛裝備欄位。」).

## Required
- One shared predicate used by BOTH contribution and validation: a row is reserved iff its defender is in `state.npcs`, `isAlive`, and `state.life.npcs[id]?.career !== 'retired'`. Everything else is permanently ineligible (see contract for why removal is irreversible).
- Contribution rejects (no mutation of items/ledger/events/RNG/reputation) when history ≥ 32, reserved ≥ 16, or equipment shortage is 0. Keep existing per-defender-slot and duplicate-instance checks.
- Validation: ledger length ≤ 32; reserved computed on the loaded state ≤ 16. Make sure `npcs` and `life.npcs` are already validated (or safely readable) at the point the reserved count is computed; document the order in your summary.
- Update existing characterization tests whose assertions encoded the old 16-row-ceiling behavior; explain each change.

## Tests (RED first: record the failing output on current source, then GREEN)
Cover Owner §5 items 1–14:
1 ledger 16/16 + defender death → replacement accepts new gear; 2 16→17 rows save/reload PASS; 3 history 32/32 → rejection with state byte-identical (serialize before/after, RNG, events, reputation); 4 temporary injury keeps reservation (replacement cannot exceed 16 reserved); 5 recovery restores effect from the same row; 6 `career === 'retired'` releases; 7 chosen successor releases; 8 job change away and back → no double counting, reservation kept while away; 9 multiple sequential deaths/replacements keep reserved ≤ 16 and history ≤ 32; 10 no refund/no duplicate item/no duplicate major recognition; 11 crisis resolution identical with and without mid-way save/reload; 12 legacy ledger ≤ 16 loads unchanged; 13 saves with 17–32 rows validate; 14 re-contributing an already-delivered instance is rejected safely. Also add validation negatives: 33 rows rejected; a crafted save with 17 reserved rows rejected.
Run `npx.cmd vitest run src/engine/postRcS02Defender.test.ts src/engine/crisisContributions.test.ts src/engine/civilDefense.test.ts src/services/saveService.test.ts src/engine/crisisResolution.test.ts src/engine/regionalCrisis.test.ts` and `npx.cmd vue-tsc --noEmit` (escalation allowed, single standalone commands).

Output `reports/v2/20261016-final-qa-rc/s02-fix/sol-medium-s02-ledger-summary.md` (diff summary, validation order, RED/GREEN outputs, test → Owner item map, risks). Reply with only that path.
