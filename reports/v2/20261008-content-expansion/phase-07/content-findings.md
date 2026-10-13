# Phase 7 Product Findings — Engineering Evidence Only

Frozen K verification source: branch v2x/reward-core, test-time HEAD e05cc78f1ef452e2672df223f2febf48444dcbd3, recursive src fingerprint 585f5e6656d1c63c1de876895750ed6c82ef8f915e6b9613c6234350b480ef58. This report separates confirmed bugs from design and evidence questions. It contains no human survey response.

## Content quality and natural reachability

**Evidence:** Six new families contain 66 definitions. Validator and controlled-witness checks provide legal contexts for all definitions. Loot, equipment, materials, recipes, crop goods, and crisis-food paths have public-API consumers and regression coverage.

**Finding:** The authored content and code provide a broad possible set. The long-world lane records no player encounters or natural content Boss defeats, so natural encounter frequency, choice variety, and whether inventory remains readable are unknown.

**Severity:** P2 evidence gap, not a confirmed bug.

**Recommended direction:** Gather ordinary route-focused play traces and human feedback before natural encounter or inventory-balance tuning. Keep natural exposure marked not measured until sampled without controlled witnesses.

## Boss and combat goals

**Evidence:** Controlled combat covered 118,800 fixtures across 1,188 cells. Normal win rate was 100%; Elite 98.6%; Mini Boss 93.0%; Boss 34.2%. Boss win rates by early/mid/late build band were 11.1%, 20.5%, and 71.1%. Two real Browser runs observed Boss progression to alive/cooldown but no player Boss defeat. All nine 10/50/100-year headless checkpoints had no player encounter actions.

**Finding:** The controlled Boss fixtures signal a high preparation bar, especially early/mid game. The available evidence cannot decide if that is an intentional long-term goal or a progression wall.

**Severity:** P2 product/balance signal, not a confirmed defect.

**Recommended direction:** Compare ordinary gear, level, consumable, and tactic acquisition before deciding whether to tune Boss difficulty. Do not infer natural win probability from controlled fixtures or autonomous simulation.

## Economy and crop choices

**Evidence:** All 24 new recipes completed public planning/transaction tests with exact material use. Craft fees were below output sale prices in that limited comparison. Purchase prices, merchant stock volume/restock, and natural material acquisition were not modeled. Eleven crop goods have tested food and existing trade/farm/crisis consumers; seasonal throughput varies.

**Finding:** Functional consumers exist, but the data does not establish a complete purchase/craft/sale loop or year-round crop strategy.

**Severity:** P2 evidence gap; no exploit confirmed.

**Recommended direction:** Test merchant purchase/stock/restock economics and multi-season crop rotations before changing prices or yield.

## Long world and storage

**Evidence:** Three current-source seeds passed 10-, 50-, and 100-year checkpoints with save/reload and continuation equality. At year 100, serialized saves were 576,378–611,123 bytes; event rows were capped at 150; history held 1,960–1,996 rows. The 7,200-second and 3,600-second real Chromium runs had zero recorded Browser/storage errors and exact normal reloads. IndexedDB rows increased 13→14,847 in the two-hour lane and 13→7,403 in the one-hour lane; bounded serialized-record estimates were 3.82 MB and 1.91 MB respectively at the final checkpoints.

**Finding:** Tested save round-trips are stable and the event collection is bounded. Browser journal rows/estimated serialization bytes grow in the tested sessions; actual IndexedDB bytes, compaction, and quota behavior remain unmeasured.

**Severity:** P2 follow-up measurement, not a confirmed leak or quota defect.

**Recommended direction:** Measure actual object-store usage, quota, and retention/compaction after longer world durations. Keep serialized game save size and Browser journal storage as separate measures.

## Agent route coverage

The one-hour runner-driven heuristic did actions in farming, equipment, combat, exploration, home/property, and general UI. Its repeated Wait 1 day and window cycling did not establish a deliberate Life, Adventure, or Hybrid goal. It recorded 247/840 no-progress actions, zero Browser errors, and matched reloads. This is an automated playtest coverage finding, not evidence that human players will be bored or lost. See the route-specific reports and fun-signal-audit.md.

## Human evidence

Human Fun Gate answers are DEFERRED / NOT APPLICABLE AT THIS STAGE. No Agent/Playwright observation is presented as a human response. These findings do not authorize new features or balance changes in the QA closeout.
