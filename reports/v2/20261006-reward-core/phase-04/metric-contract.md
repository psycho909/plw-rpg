# Phase4 metric / acceptance contract

本輪 source baseline d3c689985e7e4553a85148ba2a5ea3be7685cb1f；正式 ticket20261006-v2x-04。

## Loot / Effective combat value

PF02 舊 raw-slot96.50%不是垃圾率，不抹除歷史數據。Baseline先量，不設定任意 PASS 升級百分比。分別比較未裝備/early progress、固定legacy7atk/5def、代表Common/Rare/Epic/Boss裝備；不能把fixedlegacy強於normal低等掉落解讀為無用途。

逐roll rarity/affix count/id/tier、gear/no-gear、材料、boss exclusive、duplicate-like簽名(定義與分母必列)、sell price與來源rank。≥100000 total loot rolls，rank分母獨立、relative/absoluterate分開，同seed/action exactrepeat。

實戰用actualpubliccombatTurn與合法snapshot（controlled hero/gear/variant fixtures清楚標示）；win/death、turnsp10/50/90與median、damage dealt/taken、potion consumption、same-seed pairedbaseline。傷害進入公式/殺怪不代表有builddecisionvalue；實戰outcomes與normalUI路線都要驗證。Crit導致RNGdraw不同不能把differentbuild之間rngState差別誤判determinism；同initialstate+samebuild+sameactions才exactreplay。

Upgrade/sidegrade/lowvalue的分類規則須明示：statdominance與outcome improvement分開；沒有實戰的sample不可叫EffectiveCombatValue。Sell-value是用途，但「可賣」不能獨自滿足RewardSystemGate。多build比較若一種所有情境支配，保留ChoiceCollapse，不為平衡令所有build相同。

## Runtime / Exploratory

Stress為正常freshSave productionChromium>=1200real秒，前後fingerprints不變，UI操作不inject state/時間/gold；controlledfixtures另列。Exploration以當前state/讀得懂的trait/loot/目標決策，log whatwanted/why/changedbehavior，規則式runner有限、Agent不等於真人fun。實際wallclock不足不得誇大；只硬指定五狼流程可作regression，不可獨自證明自然AdventureLoop。

Heap/DOM/listener只對實測CP比較first/last趨勢；最後CP≠actualfinal，序列endpoints≠distribution min/max。C01–03續留；新明確持續growth才依spec§41升級長soak，短測不清除長測歷史疑慮。Economy需金幣inflow、sell value、potioncost、shop用途與資源cost，不能只平均gold。

## Gate

Engineering / RewardSystem / RiskReward / Build / AdventureLoop分開，§61三題有simulation+Browser+Agent evidence才可驗收；限制/findings留報告，不以沒有crash宣告遊戲好玩。HumanDEFERRED不阻擋development；noPhase5–10/noProductReady。
