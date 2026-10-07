# Phase4 Core Independent Review — B/C/D

## Disposition

**Core review: ACCEPT WITH LIMITATIONS.** I found no actionable Standards or Spec defect in the frozen B/C/D source changes. This disposition covers only the core files listed below; it does not accept the full Phase4 ticket or its pending E/F/G gates.

## Review scope and snapshot

- Authority: [ticket](tickets/20261006-v2x-04-adventure-loop.md), [Phase4 spec](docs/specs/V2X-PHASE4-ADVENTURE-REWARD.md), and approved [slice decisions](reports/v2/20261006-reward-core/phase-04/slice-decisions.md).
- Base and HEAD: `d3c689985e7e4553a85148ba2a5ea3be7685cb1f`.
- Actual scope: `src/data/rewards.ts`, `src/domain/reward.ts`, `src/engine/actions.ts`, `src/engine/actions.test.ts`, `src/engine/combatStats.ts`, `src/engine/combatStats.test.ts`, `src/engine/gearStats.ts`, `src/engine/itemGeneration.ts`, `src/engine/itemGeneration.test.ts`, `src/engine/wolfFamily.test.ts`, and `src/services/rewardSave.test.ts`.
- Reviewed `git diff --cached -- <scope>` (empty), `git diff -- <scope>` (all 11 files modified), `git diff d3c689985e7e4553a85148ba2a5ea3be7685cb1f...HEAD -- <scope>` (empty because HEAD is the base), and the in-scope result of `git ls-files --others --exclude-standard` (no new core source files). Other untracked ticket, spec, report, and Phase4 work was outside the code-review scope. UI E component/projection/style work was explicitly excluded while being written.
- Final-content fingerprint: patch SHA-256 `43b59f94dcdf855108840080da6229c6ee473f74fd7009fe3a20e721a6d093d4`; per-file SHA-256 values are recorded in the companion JSON report.
- Reviewer: `g6-luna-max-phase4-deep-reviewer`, assigned as an independent core reviewer and not involved in implementation. GPT-6 Luna Max/max was the requested routing; runtime telemetry was not available to independently verify the backend identity.

## Standards

**PASS; no actionable finding.** The change keeps source-specific balance in the reward data, leaves the shared rarity and affix definitions intact, and adds a narrow optional combat context whose default preserves existing callers. The boss base's intrinsic penetration is optional and defaults to zero for all existing bases, so strict instance recomputation retains their existing values. The pure expectation projection returns detached objects and does not mutate game state. These choices fit the repository's scoped-change and compatibility standards in `AGENTS.md` and the review contract.

## Spec

**PASS for the reviewed B/C/D core implementation.**

- **B — rank reward:** `WOLF_LOOT_RULES.profiles` defines the approved per-source rarity, material chance, and drop level values; the gray wolf retains its former profile. Award generation and `wolfRewardExpectation` use the same source profile. Existing rarity and affix definitions and the five normal loot-pool bases remain unchanged (`src/data/rewards.ts:57-81`, `src/engine/itemGeneration.ts:43-72,178-213`). These values are the approved starting balance; final measured distribution acceptance remains part of Phase4-F.
- **C — armor interaction:** the optional attack context doubles penetration only when `combatTurn` derives an active armored phase from a non-dungeon wolf encounter. Calls without the context retain the previous formula (`src/engine/actions.ts:168-172`, `src/engine/combatStats.ts:33-42`). Controlled tests cover baseline and active-phase damage, and the save/reload test compares the exact resulting states and RNG state.
- **D — boss identity:** the Wolf King award selects `moonFangSpear` and MoonStone; other ranks continue to use the unchanged five-base weighted table. The new base has the approved attack, sell value, intrinsic penetration, and affix eligibility (`src/data/rewards.ts:3-10,69-80`, `src/engine/itemGeneration.ts:200-213`). Its intrinsic stat is included in canonical rolled stats (`src/engine/gearStats.ts:6-11`), and existing strict save validation recomputes those stats (`src/services/rewardValidation.ts:71-100`).
- New reward randomness uses the existing `random(state)` service; no `Math.random()` call is present in the reviewed generation/combat paths. Caller option validation and sequence checks occur before generation RNG draws (`src/engine/itemGeneration.ts:87-127`). The invalid-source regression asserts the full state remains unchanged.
- Save schema and save-service code were not changed. Existing native V1 migration coverage checks preserved world data and exact save/reload (`src/services/rewardSave.test.ts:25-32`); the V2 reward-extension test checks unchanged seed, RNG, time, characters, NPCs, life, and history (`src/services/rewardSave.test.ts:10-23`). The new boss-instance tests round-trip through strict validation.

## Existing verification evidence reviewed

I did not rerun tests because the recorded slice evidence already covers the reviewed behavior and this review found no new reproduction hypothesis.

- B evidence records preserved RED/diagnostic runs, 125 generation/save regression tests, a 319-test full check, and build exit 0; these results apply to the B slice snapshot.
- C evidence records the expected RED result (14 expected, legacy 12), 83 targeted tests, and build exit 0; it also records the controlled 15/16 baseline and 14/12 armored-phase comparison plus exact save/reload behavior.
- D evidence records the expected RED failures for the absent base/award selection, 105 targeted tests, and a final build exit 0. The initial TypeScript error from the new optional base stat is retained alongside the successful correction and rerun.
- The original failures remain in the phase evidence artifacts; none were overwritten in this review.

## Limitations

The ticket remains `in_progress`. This report does not review UI E, final Monte Carlo/combat/economy balance F, integrated browser/agent QA G, or the full Adventure Loop and product gates. The existing B full-check result predates C/D; the strongest cumulative verification reviewed here is D's targeted 105-test run plus the successful final build.

---

## Delta review version 2 — first-discovery loot message

**Disposition remains ACCEPT WITH LIMITATIONS; no new finding.** Comparing the current snapshot with version 1, exactly two core files changed: `src/engine/itemGeneration.ts` and `src/engine/itemGeneration.test.ts`. The other nine reviewed core file hashes match version 1. The current core patch SHA-256 is recorded in the companion JSON.

The implementation computes `firstBaseDiscovery` immediately after item generation and before adding the base to `collection.bases` (`src/engine/itemGeneration.ts:212-231`). It prefixes the existing `loot.item` message with `新發現：` only when that check is true (`src/engine/itemGeneration.ts:237-240`). The same single conditional `emit` remains, with the same event type and category; `emit` increments `eventSequence` once per call (`src/engine/events.ts:11-16`). This delta adds no RNG call, loot calculation, reward field, schema key, or collection mutation.

The added test checks first versus repeat copy, same-seed RNG and reward equality, stable reward keys, and reward save/reload (`src/engine/itemGeneration.test.ts:153-170`). The recorded RED capture shows the test failed before the label was added because the first award lacked the prefix. The UI owner’s `ui-plan.md` reports the two-file command passed 28 tests and `npx vue-tsc --noEmit` passed. I inspected those artifacts but did not rerun them.

This version reviews the engine message delta only. UI component, projection, style, browser, and remaining Phase4-F/G work stay outside this core delta review. The earlier version’s phrase “UI E excluded” refers to those remaining UI files and runtime work.
