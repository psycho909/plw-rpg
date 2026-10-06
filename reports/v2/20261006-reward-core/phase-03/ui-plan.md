# Phase 3 UI scope and verification plan

Baseline source6568b466390d06e6be0af2585e7524b9415204b8（Phase2accepted＋remote匹配）。以下最小 UI 範圍已實作；314 個 tests、typecheck、78 modules production build、20 項 Chromium regression 和 strict audit 已通過。20 分鐘實際操作壓力測試仍在進行，不能提前列為通過。

- Canonical design rootDESIGN.md→docs/design/DESIGN.md、behavior docs/UI.md；沿用PixelWindow/PixelMeter/StatusNotice、既有tokens及390px響應式，不新增全域dashboard／primitive／theme。
- PlaceWindow的forest場景新增「狼族蹤跡」有限五種追蹤選項；資格／下一個目標原因全部來自純engine API。原尋找怪物、哥布林酋長、採集與礦坑流程保留。
- AdventureWindow對familyEncounter使用engine projection提供的名稱／level／rank／traits／variant／下一回合cue；生命仍讀取實際combat。UI不抽RNG、計算機制、形成boss或重算變種。
- 每個trait顯示名稱＋簡短能力，將準備／防禦時機放在原battle畫面。Save/reload/flee後同一formation；不讓開視窗造成世界或RNG變動。
- 新UI不得假顯crafting／accessory／專屬裝備槽；物品仍同兩slots、20件分頁＋完整ownership資料。
- 驗證：fresh完整tests/typecheck/build、strict static audit、20～30min production Chromium stress（combat/loot/boss/modal/gear/save/reload/ActiveIdle），100+cycles，desktop390px/reduced-motion/keyboard，heap/DOM/listeners/storage監控。
- 2h extended soak此次不預設；這份計畫不宣稱已跑長soak或清除既有C03疑慮。若短stress疑似線性growth，保留evidence並評估升級。

Root ownsUI/projection/styles/docs；Luna max ownsengine+R1validation/tests；Luna low only runner-driven長測。HumanGate DEFERRED / NOT APPLICABLE AT THIS STAGE。

Current-stage policy: human validation is deferred during this development slice and does not block engineering QA. Earlier historical Human-PENDING records describe the prior product-test stage; no human answer or product approval is fabricated.
