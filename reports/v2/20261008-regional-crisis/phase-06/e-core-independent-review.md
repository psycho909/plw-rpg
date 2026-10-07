# Phase6-E core independent review

Reviewed 2026-10-07T20:00:25+00:00 on `v2x/reward-core`, with base and HEAD both `dfdc81636bb68f83ee87c4046199dcbaaf11e192`. The review covers the uncommitted E source snapshot listed in [`e-source-freeze.json`](e-source-freeze.json); all 12 source hashes match. Canonical source fingerprint: `a298dde9e3a59c5adac8f234cc823cd57d7f6d0fbb9414421b1be1942018e739` (SHA-256 over sorted `path NUL lowercase SHA-256 LF` records). Freeze manifest SHA-256: `74d049096da396028ed83650b81d6791787b6c3aa1bb1fbfb3579a44789cabef`.

## Standards

**PASS.** The tracked E diffs and the untracked `src/engine/crisisAdventure.test.ts` were reviewed separately. `git diff --check HEAD -- src` passed. Clone projections call the internal combat resolver without recursion; cloned RNG/state mutations and emitted events remain isolated from the real world and event-capture WeakMap. The optional shared encounter constructor keeps ordinary encounter behavior intact.

The accepted clone preflight copies full game state/history on camp combat turns. History is bounded at 20,000 records; Root approved this exact approach. Its worst-case performance remains unprofiled for Phase6-I/J, so no browser-performance claim is made.

## Spec

**PASS for E core; recommend Root acceptance.** The camp raid and Chief are real existing Goblin actions. Actual Chief/camp facts provide relief `min(14, 8 + 6)`, applied to `max(causeFloor, currentPressure)` with a floor of 20. Ordinary hunts cannot write camp success. Raid starts and success credit are guarded by the live crisis ID, phase, deadline, player location/state, and event capacity. Flee, expired completion, death, and succession do not grant camp credit; an objective from an older crisis can load but cannot credit the current one.

The V5-to-V6 migration adds the new default while preserving the D ledger and world/time/RNG/save timestamp. The authentic archived V5 fixture at `e-v5-fixtures/crisis-v5-preparation-d-ledger.json` is reused unchanged.

The preserved P2 event-capacity finding is resolved in this snapshot. The public RED at event sequence `MAX_SAFE_INTEGER - 2` reproduced an unsaveable victory. The final implementation preflights a projected start-to-victory and each camp turn on a clone, rejecting over-capacity actions before changing real state. RED: [`e-red-event-capacity.txt`](e-red-event-capacity.txt), SHA-256 `68e72137d92e6b5d0e20b7118f7839b1f667c5231d9b285aafd9a324fde8ccf1`. GREEN: [`e-green-event-capacity-regression.txt`](e-green-event-capacity-regression.txt), SHA-256 `8187b844f88980874634a50d189003e753470bb7c3cb2dea4647f3f6cd7d819e`.

## Verification and gate

I independently ran `npm test -- src/engine/crisisAdventure.test.ts`: **29/29 passed**. The frozen engineer evidence records the focused 12-file regression at **297/297**, and `npm run check` at **505/505 across 26 files**, with `vue-tsc` and the production build passing. Full-check evidence SHA-256: `5de37e200e59e07c14edf58c74a0d0b374820536bfdd9140eccb2e258cae4580`. I hash-verified those evidence files against the final freeze manifest instead of repeating the full check.

No unresolved E core blockers remain. **F stays blocked until Root accepts E.** Human validation remains deferred, and this is not an overall Phase6/product PASS.
