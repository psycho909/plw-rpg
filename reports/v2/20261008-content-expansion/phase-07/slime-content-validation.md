# Phase 7-C Slime Data Pack Validation — Economics Correction

The previous report version is preserved in `playlog.jsonl`. The source change for this update is limited to `slime_resin_guard_recipe.goldCost`, from 8 to 11, in `src/data/content/slime.ts`. Current data module SHA-256: `0f91295536535f55679a770d3d09b368ec188c7ff322104f059e048589e55ead`. Current serialized `SLIME_CONTENT` pack SHA-256: `a59fb46f120390a4a37bef4084ffe9c3700ae0c107af79e5cc9e387055cfeb97`.

## Original failure and approved resolution

The core economics check found a genuine small arbitrage for the resin guard recipe. At the prior authored fee of 8, expected premium-item sale value was 32.782 while complete replacement cost was 31: three slime resin at 3 each (9), two wood at the discounted shop price of 7 each (14), and the 8-gold recipe fee. The expected sale margin was 1.782.

Root approved changing only the authored fee to 11. Replacement cost is now 34 (9 + 14 + 11), leaving a 1.218 deficit against expected premium sale value 32.782. Recipe stats, material sell values, item sell values, and generator behavior are unchanged. This is the exact bounded correction; no other source field was edited.

## Updated data validation

Vite serialized the current `SLIME_CONTENT` module and directly invoked `validateContentPack` once against the Phase 7 baseline. Result: **PASS**, 0 errors and 0 warnings; 11 qualifying monsters; 16 unique authoring-qualified item IDs (8 equipment + 8 usable materials); 8 usable materials. All 11 monsters and the family have controlled spawn witnesses. Natural exposure remains unmeasured.

The updated serialized pack contains 1 family, 11 monsters (6 normal, 2 elite, 2 mini-boss, 1 boss), 12 loot tables (one family fallback plus 11 monster-selected tables), 8 equipment bases, 8 materials, and 4 recipes. All Slime Heart forms retain the fixed charged-attack/heal core; `stillwater`, `surging`, and `starved` only add guard, rush, and retaliation mechanics respectively. They do not suppress healing or override attack cadence.

No unit tests, typecheck, broad regression, or production build were rerun for this one-number economics change. Max owns the separate targeted crafted-sale bound check, including material sales.

## Limits

Natural encounter exposure is not measured; controlled witnesses establish predicate satisfiability only. The Slime Heart selected loot table and `bossRules` both declare `slime_heart_gel` guaranteed; C runtime must union/deduplicate those guarantees and award exactly one. Runtime save/reload, combat, real loot generation, recipe execution, equipment use, the accepted `food +3` boss consequence, and shared-registry integration remain core integration work. This pack remains data-only and is not added to a shared registry/runtime entry point; Cave Insects remains held.

Baseline source fingerprint recorded in the approved content plan: `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`. Prior serialized pack SHA-256 before the economics correction: `4447318fce02c655744b165e46d0284b0d2085ae427a63fdb95682e749ed5f6a`.
