# Phase7 Content Plan — Root Approved

Source baseline: `2d6af37cb36c9616cb832fc4d839bfd6ea7ef7c9`；91 src 的 compact sorted-JSON mapping fingerprint `c9fd3e455af08f18c50bc7eaa3677ecdd950b2e0c177bc779fe39b1fb3ca2cbb`。A fresh check531/28files/type/build PASS；精確現有IDs見content-baseline.json，legacy與程序definitions分開不混算。

## 內容預算與分批

**核定作者目標：66 新怪物、107 新物品、24 新配方、作物總12種。** 最終硬門檻仍為50合格新怪物及100有實際用途新items；候選/變體/instances不計数。每個不合格定義移除計數並補足品質，不能降低門檻。

6新Families：Wild Beasts（林地野獸，排除既有wolf）、Slime（黏怪）、Goblin（新角色，不重算既有Goblin/Chief）、Cave Insects（洞穴蛛蟲）、Undead（霧谷亡骨）、Constructs（礦道岩構）。沿既有forest/mine/farmland/unknown可達區域，unknown沿探索解鎖，不大地圖、不Faction/完整魔法或Theme Pack。

每Family預算6normal＋2elite＋2mini-boss＋1boss＝11；合計36normal/12elite/12mini/6boss。不是以顏色、等級或HP倍率湊數。每monster至少兩個實際identity軸，允許重用少量會telegraph的戰術，但同family不得大量同效果、同loot、同生成角色的複製。

| 新Item分類 | 作者預算 | 合格用途 |
| --- | ---: | --- |
| Procedural equipment bases | 48（每family8） | 30 weapon／18 armor目標；不同有效stat tradeoff、affix eligibility、context source；現有2slots及generateItem |
| Ecology/craft material goods | 48（每family8） | 24新recipes的消耗/合法material bias，及售賣；其中至少18rare/exclusive目標；不得僅改名賣價 |
| Crop harvest goods | 11 | 每種保留harvest output身份及實際food/supply/economy用途；與CropDefinition本身不重複計數 |
| 合計 | 107 | registry中同ID僅一次；quality/usability/reachability自動確認 |

24新recipes（每family4），24新craftablebases，其餘24loot取得；所有mats提供來源→用途，不讓沒有recipe/bias/use的素材空轉。新family配方至少使用實際探索/生產取得的素材；不靠所有原料無限買入再高價賣出。舊裝備/配方/稀有度規則不nerf。新作物11＋legacywheat1，差異使用growth/yield/cost/season/food/sale等現有系統可理解的選擇，不能只food+5/+7。

## 架構／相容性決策

1. **保留單一裝備生成與既有wolf行為。** generalize必要family encounter/phase/loot/material lookup，保留legacy入口及seeded抽取順序；有限可讀mechanics，不開大型skill語言。B先validation契約，C才將1–2family閉環接入runtime。
2. **新可堆疊物品放Reward materials**，不把100keys複製進每NPC inventory/property storage；舊ItemId固定欄位不變。Crop harvest goods若使用該map，也必須有可消耗food/supply或出售的真實動作，不只Catalog文字。
3. **必要持久欄位：save8／reward3。** Crop record加穩定cropId，7→8 deterministic映射舊作物wheat；reward2→3補新known material keys為0。保留嚴格known-ID驗證，不用寬鬆unknown map逃避migration。必要boss form map只保存少量encounter identity/variant/context，絕不存整份registry。
4. **Boss escape/reload保持已形成的form，defeat/cooldown後才再形成。** 合法世界候選、受控variant、exclusive loot、telegraph、有限world effect與獨立cooldown；新boss不冒充Goblin Chief、不替換Phase6危機狀態。既有life.director.cooldowns可使用有限stable content-boss keys；保留100key安全界線，不按每次遇敵產生新key。
5. **世界生成不添加額外daily RNG。** Region/progression/threat/time/season/world条件筛合法pool，只有接受的canonical探索行動才抽取遭遇；availability查詢/拒絕不消耗RNG。不將新families的生態等同Goblin全域人口。Boss後果沿有界現有聚落/歷史/冷卻，不能額外重構危機。
6. **資料authoring pack有清楚ownership。** 共用core入口只Max owner；family modules分檔由Low各自持有。Medium ownsvalidator與UX/projection；先完成一批generic public API contract後才並行大量data，避免registry衝突。Impl不自充IndependentReview。

## A→K 交付及驗證

A精確baseline＋此plan；BvalidatorSchema/refs/localization/2-axisidentity/duplicate-like/safety/usage/spawnpredicate reachability/negative fixtures；C先1–2family，證明Explore→Combat→Loot→Craft/Use→Discover→Save闭环。D–G按核定pack分批完成新增數量；H核World/Crisis；I必要search/filter/pages/來源用途；J100000loot分層、representativecombatmatrix/economy/3seeds10/50/100年；K最新全量與Chromium1200s stress＋1800scontentAgent、IndependentReview及17reports/外部reviewhandoff。

每批validator→targeted public-seam tests→recorded report，不把data候選或fixture當自然Encounter證據。Reachability要區分合法controlled witness、正常遊玩和長模擬的實際覆蓋；不可宣稱100年自然遇到全部內容。

Phase6自然Life供給及No-Player自治成功率不足、C01 export/C02 journal/C03 DOM資料保留；只處理可重現本次退化，不因舊finding大重構。Human DEFERRED / NOT APPLICABLE AT THIS STAGE。Phase7 Gate後停，不Phase8–10/V3，不merge/deploy/代做外部Claude review。

## Root A acceptance

2026-10-08（Asia/Taipei）：A ACCEPTED；內容baseline及fresh工程baseline均完成。B RELEASED，只先契約/validator，C及大量資料尚未release。新核心接縫高風險Save/RNG/Director由Max；一般validator/UX由Medium；Low批次data及QA。當實際schema不能支援上述預算，先回Root判斷窄幅必要擴充，不悄悄改數量或新增大系統。

## Corrected baseline acceptance / B restored

Legacy ITEMS 正確基線為 8（wood/stone/iron/food/material/potion/sword/armor），AST 全 registry enumeration 已獨立核對。91 檔來源指紋 C9 與 fresh 531 項工程基線有效。新增 66/107/24/12 預算不變。原錯誤 Markdown 版本可還原，原錯誤 JSON 沒有初始封存，此限制不隱藏。B contracts/validator 已恢復；C 尚未 release。

## B count semantics clarified

Spec §3 明列 Crafting Materials／Rare Materials，因此 usableNewItems 計數 unique equipment + 合格有實際消費用途的 ecology materials + crop goods；usableNewMaterials 是 subset，不能另外重複加總。crop goods 在 runtime MATERIALS 中的 mirror 不可重複計數。107 預算不變。Spawn 採現有 region/discovery 加 level/threat/season/time predicates，不新增 dungeon-depth 系統；Boss 後果採有限小量現有 food/safety/prosperity 增減，具體 bounds 隨核心驗證確立。
