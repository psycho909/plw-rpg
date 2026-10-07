# Phase4 slice decisions

Baseline accepted source d3c689985e7e4553a85148ba2a5ea3be7685cb1f, frozen run20261006T114305162114Z. Root/Orchestrator decisions serve authorized §47 scope; source implementation remains staged B→C→D→E, not all phases mixed.

Elite and miniboss conditional rarity match ordinary loot (59.54% Common); rank source pools improve quality anticipation without changing immutable old bases/affixes/count/maxTier. Gray retains current drop/quality. Scarred C/U/R/E/L45/35/16/3.6/.4; elite20/45/28/6.5/.5 Lv5; mini0/35/50/14/1 Lv7. Boss85/14/1 Lv7 unchanged: actual baseline does not justify universal gear stat or boss quality buffs. Actual final simulations decide whether these new choices are reasonable; probabilities are design starting points, not arbitrary PASS thresholds.

Penetration and bleed equal numeric tiers give bleed unconditional per-hit damage while penetration is capped by enemy defense. One-affix controlled comparison first, then new contextual doubled penetration on an actual family armored-phase; elsewhere original mechanics remain. No new affixes, no DOT subsystem, no rewriting existing item values. Crit/defense already change variance/survival/cost; leave them for measured final audit.

Boss-specific identity uses one new moonFangSpear/月牙獵矛 (Atk5, Def0, sale20, basePenetration2, keen/piercing/bleeding pool). Only WolfKing award chooses this base, on MoonStone material; not normal or other rank pools. Base optional intrinsic stat default0 for old five bases keeps saved instance recomputation equal. Boss gear level7 and rare/epic/legendary85/14/1 retained, actual award comparison required, not synthetic hero-level+1 boss-quality profile. No masterpiece/crafter/workshop/content pack.

UI compares stat deltas/affixes in the same window and says what mechanics do, no invented overall power score; expected rewards derive actual engine config. Scope remains Phase4. HumanDEFERRED, no ProductREADY.

## B acceptance / C reproduction checkpoint

B accepted: b-engineering-verification.json records source fingerprints, original RED/diagnostic failures and GREEN, 125 save/generation tests plus 319 full tests and production typecheck/build. These verify the B slice only, not the final C/D/E application. Final F/G remain required.

C controlled pre-change engine baseline: same seed48041, hero, level5 rare shortSword, canonical rolled stats, strikingT1 fixed and piercingT2 versus bleedingT2. Normal effective defense1 yields15/16 damage; armored active defense5 yields12/12. Both variants round-trip exactly and share RNG result2588073568. Reproduction evidence: c-baseline-penetration.txt / c-baseline-verification.json. Planned new interaction remains scoped to active family armor phase, never a global old-affix stat rewrite.

## C acceptance / D release

C accepted after actual diff inspection: controlled engine damages normal15/16 unchanged; active armor Pen14/Bleed12. Targeted83 tests and typecheck/build passed, exact save/reload verified; original RED expected14/actual12 remains. API playerAttackDamage(state, defense, againstWolf=false, context={}) has wolfArmoredPhase optional; actions supplies it only from actual family phase. D release follows the original one-base decision above, without changing boss rarity/level or prior saved item values. Final F diagnostics must pass this same explicit context when predicting actual damage.

## D acceptance / E release

D accepted from actual domain/data/generation/gear formula and tests: wolfKing awards only moonFangSpear via WOLF_LOOT_RULES.bossExclusiveBase; pure expectation exposes exclusiveBase only for boss. New intrinsic penetration2 works in canonical rolledStats; old bases default0 retain values. Generation rejects exclusive base with nonboss dropSource before RNG; direct legacy bossSource old bases remain supported. 105 targeted tests and production typecheck/build passed; original TS2339 and successful typed ItemBaseDefinition retry are preserved in d-engineering-verification.json. E released within approved comparison/goal/presentation scope; final F/G and independent review remain pending.
