# UI selector fixture generation — attempt 01 (preserved failure)

- Source commit: `e05cc78f1ef452e2672df223f2febf48444dcbd3`
- Source fingerprint: `6a320cfcefc529bb06ad7dd815396fdde21097b1f8aab842ac6ec2fe63345ba3`
- Command: `node reports/v2/20261008-content-expansion/phase-07/k-ui-selector-20261013/fixture-generator.mjs`
- Result: fixture preparation failed; no browser was launched and no product source was modified.

The fixture intended to place `starterSpear` at the store workbench but mistakenly used the blacksmith coordinates. The canonical `planCraft` API correctly rejected that station context, proving this was a fixture construction error. The failure occurred before test execution and has been retained verbatim below.

```text
Error: recipe-satisfied: unexpected canonical planCraft result {"recipeId":"starterSpear","influenceMaterial":null,"output":{"baseId":"spear","name":"獵矛","level":2,"slot":"weapon"},"inputs":[{"source":"inventory","itemId":"wood","amount":3,"required":3,"current":3},{"source":"inventory","itemId":"stone","amount":2,"required":2,"current":2}],"gold":{"required":4,"current":1000},"stamina":{"required":10,"current":84},"durationMinutes":45,"skill":{"id":"smithing","required":1,"current":1,"unlocked":true},"practice":{"xpAward":10,"capLevel":3,"graduated":false},"masterpiece":{"requiredSmithing":null,"eligible":false,"chance":0},"quality":{"floor":null,"rarityWeights":{"common":60,"uncommon":27,"rare":10,"epic":2.8,"legendary":0.2},"nextFloor":"uncommon","nextFloorAtSmithing":3},"station":{"id":"store","site":"store","opensAtHour":8,"closesAtHour":18,"built":true,"nearby":false,"open":true,"available":false},"access":{"alive":true,"inCombat":false,"inDungeon":false,"available":false},"ok":false,"reasonCode":"too_far","message":"請靠近雜貨店工作台。"}
```

Corrective action: preserve the blacksmith location for inventory sale, and use the real store coordinates for the starter-spear workbench fixture. This only changes QA setup.
