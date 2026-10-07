
## Evidence-backed product and runner findings

### H: material influence result and causal-combat limit

The accepted short H route consumed one `wolfFang` to craft a Common item without an affix. That is a product-finding risk for early material perceived usefulness under a probabilistic influence design: assess whether previews and expectation-setting communicate the possibility of no visible modifier, and whether users understand the material's value. This evidence does not authorize a probability or balance buff. See [H evidence](hybrid-loop.md).

The H return-combat comparison changed actor level, HP, game time, and RNG alongside equipped gear. It therefore cannot establish a causal gear effect; that is an evidence limitation, not a product bug.

### J Life: runner-policy wall candidate, not a demonstrated product hardlock

The terminal [Life run](browser-runs/life-20261007T103239Z-pid7426/life-result.json) met the 1,800-second runtime target (1,803.22s; 13,936 UI operations; 155 reloads; 158 checkpoints). At 10/20/30-minute notes, world time advanced from 31,060 to 78,266 and identity/skill progress continued, while gold declined from 5 to 1 and Smithing stayed at Lv5. At 30 minutes, the live public-store workbench showed `starterSpear` selected and capped, a 4-gold fee with 1 gold held, while `ironShortSword` was listed as unlocked. The runner-derived long goal named `ironShortSword`, but its visible UI policy kept revisiting store/house/rest; the runner does not route to the advanced blacksmith station or sell goods for gold. This is a runner-policy wall / coverage gap and a product progression risk worth targeted follow-up, not proof that players are inevitably blocked. No ownership purchase routine was exercised either. Human fun and retention remain unassessed; no subjective conclusion is claimed.

The timed note projection has `recipeId: null` for 159 instances because its projection reads the wrong level. The full `lastLifeNoteState.reward.instances` and `result.crafts` have real provenance on 153 crafts: 58 `starterSpear`, 49 `fieldArmor`, and 46 `fieldSpear`; material use was 12 `wolfFang` and 3 `wolfHide`; none was `ironShortSword`. In the point-in-time full state, identities were resident/miner/smith/skilledMiner/adventurer, smithing actions 153, reputation 26, rank “熟面孔” at game time 73,959, and `life.properties` was empty. As the runner has no property-purchase action, that empty property list is not an ownership bug. A focused scenario should test station travel and sustainable gold generation before concluding there is a product progression block. See [Life run analysis](agent-life.md).

## Historical QA telemetry coverage gap: ownership projection (P3, fixed)

The earlier source-`82d73b11` stress and interrupted-Life checkpoints recorded `state.ownership: null`. This was a runner projection gap, not evidence that saves lacked assets: that driver's `state_summary()` read legacy `state.ownership` / `state.settlement.ownership` paths instead of the actual `GameState.life.properties` schema. Preserve the affected [stress checkpoints](browser-runs/stress-20261007T093801Z-pid3466/checkpoints.jsonl) and [interrupted Life checkpoints](browser-runs/life-20261007T093801Z-pid3464/checkpoints.jsonl) as historical evidence.

The current reviewed driver (`5c20b23…`) reads `state.life.properties`. The latest stress and Life results now report `ownership: []`, matching their fresh-save state; the Life result's full `lastLifeNoteState.life.properties` is also empty at its timed-note point. This resolves the telemetry projection gap for the current runs, but does not prove that ownership acquisition was exercised. The runner has no property-purchase routine, so the empty array is not a product ownership failure. Existing G ownership implementation/test evidence remains valid for its recorded unit scope; no duplicate full regression is required.
