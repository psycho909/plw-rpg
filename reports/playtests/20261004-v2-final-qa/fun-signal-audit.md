# Reward / Retention / Fun Signal Audit

Source commit: `441e3c2b435f199a50cb78ee5b19521bcc084593`。三路有效 Agent 探索已達一小時；以下為系統性 Agent 信號分析。 Agent分析不能證明遊戲好玩，不能代填真人八題。

## 分析方法

從三路正常UI的decision／motivation／actual state／timeline，每10～15分鐘記錄short reward、mid/long goal、unexpected event、meaningful choice、new information、progress。暫停閱讀屬有效探索；debug／quota／無觀察區間排除。不以純數值有增加就宣告reward有效，也不以event數量證明世界有趣。

## 已見正向信號

- Life由45g發現80g自宅門檻，選擇伐木收入；實際購屋並儲存1wood，免費休息有utility，資產有可描述用途。三輪耕作後farming actions9／rep3；第10行動正常觸發「農夫」，形成行為身份。後續村莊自然升級開啟酒館／鐵匠，改變原本反覆耕作計畫。
- Adventure自宅在raw elapsed 480.0s（8:00）已由正常UI購得；第一次Boss勝利是在34m46.6s，緊接的34m46.7s observation確認mine run 1/stage 3、離開地下城、+100g/+150XP與clear history。村莊第一次觀察到stage升級是在52m04.3s；55m38.2–38.6s購買鐵劍／皮甲，59m20.8s聘用Lucy。第二次Boss在63m34.4s擊敗，63m34.6s observation確認run 2完成及loot。這些raw位置依各自action/observation時間列示，不把前後列回顧事件當成本列發生。
- Hybrid 正常工作／交易購得土地，四格農地兩輪各產32food／4rep；戰鬥取得地下城Boss loot與adventurer identity，再投入耕作／農場事業準備。傭兵Nora記得聘用並在交談中回應，兩次日薪與到期離隊有真實成本。最後出售8food取得40g，持有222g／rep21，下一目標為rep25的farm business；兩條路線可共享資本、身份、名聲與NPC記憶。

## Product Findings（不偷偷重設）

| ID / severity | Finding | Evidence | Recommended direction |
| --- | --- | --- | --- |
| PF01 / P2 | Life前期可能形成重複收入／成熟等待wall | Life多次伐木4g、種植等待，地／農場受village＋rep＋資金門檻；村莊升級主要自然等待 | 真人驗證等待與重複感；後續顯示可選目標與差異化用途 |
| PF02 / P2 | 身份門檻與中期progress可見性不足 | farmingLv3仍resident直到actions10，Adventure多次戰鬥才形成title；不代表計算bug | 讓玩家理解行動累积／身份形成，避免強制Class |
| PF03 / P2 | Life對road危機缺乏同等有意義介入手段 | 現行road request交hunt；不戰鬥可活，但supply/food natural多數cap，3seed被動100年未見food/ironarc | 檢視需求自然形成與非戰鬥貢獻設計；不要求與戰鬥同結果 |
| PF04 / P2 | NPC attachment有資料，但主動追人有friction | NPC會移動／睡眠，Adventure按區域找Mira31到場後已不在nearby，熟悉度低對話受限 | 真人確認是否願意追蹤；改善清楚定位與回應可見性 |
| PF05 / P2 | Boss後低階encounter很快變一擊grind | Adventure完成Boss後兩次slime同18HP/15XP/8g，被一擊；自主下一進階目標待驗 | 評估下一風險／區域／準備目標是否足夠明確；不新增V3 |
| PF06 / P2 | 所有權長期價值與繼承期待可能不一致 | 自宅免費rest＋storage有utility；土地實際擴充4格農作、Hybrid兩輪各32food/+4rep；農場manual不自動收入；100年alden資產保留但successor不自動取得 | 說明現行用途／留下什麼；是否新增繼承由使用者判斷 |
| PF07 / P3 | 收成聲望reason與cap糧倉反馈可能造成誤解 | `收成補充橡谷糧食`可增加rep，但food100cap不能據此稱實際糧倉增加 | 真人觀察訊息是否被理解；若調整文案需保留因果準確 |

Severity表示本次產品風險優先順序，不等同工程bug。生活無combat build未觀察強制Game Over，社會防禦也不是100%成功；這些只支持可自由生活，尚不能證明冒險存在感／Lifeagency已達Human Gate。

## 已完成路線的 10～15 分鐘矩陣

下表使用各路runner raw clock定位事件，**不是每列等量有效時間**；完整有效時間扣除式分別見Life／Adventure文件。`drought` 是Agent的產品疑慮，尚無真人主觀證據。

| 路線／raw區間 | Short reward | Mid / long goal | Unexpected / meaningful choice | New information / progress | Retention finding |
| --- | --- | --- | --- | --- | --- |
| Life 0–10m | 2wood＋4g工資 | 80g自宅／穩定生活 | 少花起始食物，選低資本伐木 | 可先在公共農地種植 | 首個目標清楚，無已確認goal drought |
| Life 10–20m | 購屋、儲物、免費rest | 種植→首收／未來自有地 | 在工資與作物等待間切換 | 房屋有實際恢復與存放用途 | 自宅milestone有用途；不只是gold |
| Life 20–30m | 5～8food、rep＋1、skill | farmer identity／140g土地 | 留食物或出售；看店鋪時間 | 一件一賣與成熟等待 | 重複wall候選，非完全沒有回報 |
| Life 30–40m | 正常第10farming action取得farmer | rep10與土地／農場事業 | 森林風險提高後維持非戰鬥 | 身份靠行動形成；NPC有職務concern | 身份門檻可見性不足；不代表算錯 |
| Life 40–50m | 自然village開smith/tavern | 留糧、繼續資產目標 | 25g傭兵負擔不起而放棄 | 村莊成長、road影響safety/supply | 世界有變化；Life危機介入選項弱 |
| Life 50m–最後觀察 | 更多收成、rep7、food47 | 自有地→business | 合法UI一日等待成熟、save/reload | Mira認可farmer，但熟悉度／共享memory仍空 | 中期金錢門檻遠，重複農作仍最明顯下一步 |
| Adventure 0–15m | 工資、25XP／12g狼loot；8:00以80g購得自宅 | 地下城準備／住處用途 | HP100→88後衡量風險 | 地圖森林／商店價格／escape | 短reward清楚；購屋milestone已在此列完成 |
| Adventure 15–30m | 地下城slime／elite進度；約26m33s中止不利的裸裝chief嘗試 | 補給與等待村莊服務解鎖，再準備boss | 退出、休息、購買potion | 地下城固定順序；save/reload保留stage | 重打前段是repetition候選，不是假bug；自宅不是本列購得 |
| Adventure 30–45m | 首次chief於34m46.6s擊敗；下一筆34m46.7s observation確認run1完成、+150XP/+100g及mine-clear history；後續收成5food／Farming Lv2 | 裝備、村莊新店 | 追Mira31未接觸成功，改種植 | NPC會移動；共同糧倉已cap | 勝利由戰後狀態、loot與history確認，不只battle close；NPC追蹤friction、news/requests多空 |
| Adventure 45–60m | Village stage首見於52m04.3s；55m38.2–38.6s購買125g劍甲並隨後裝備；59m20.8s聘用Lucy | 裝備／招募／第二輪mine | 配合smith／tavern營業時間 | 容量由40變60，history記錄新酒館／鐵匠 | 升級有新goal，但之前trigger難作玩家行動目標；未獨立證明傭兵貢獻 |
| Adventure 60–65m56.660s | 第二次chief於63m34.4s擊敗；63m34.6s observation確認run2完成、+150XP/+100g/+3iron/+1material；其後在家休息 | rep10土地、下一高風險目標 | 用前一列已購的劍甲與已聘的Lucy重跑mine | armor/damage收益清楚、party契約保留 | 小怪很快one-shot；戰鬥未顯示獨立傭兵行動，不能歸功 |

Adventure raw milestone、action/observation indices及戰後勝利確認見 [`review/adventure-milestone-timing.json`](review/adventure-milestone-timing.json)。它的最後direct observation在15:02:37.145 UTC；扣除143.229s harness-error union與67.9s明確未觀察的boss後review區間後，Adventure credit為3,745.531s，仍超過3,600s。各表列是事件的raw clock位置，並非等量有效遊玩時間；Agent探索證據支持個人目標／資產用途／風險準備／世界後果存在，**不支持直接宣告「好玩」或真人會留存**。

## Hybrid 完成路線的 10～15 分鐘矩陣

可信段02／03分別706.055s／451.136s；本表定位最長的段04 raw clock，段04有效3227.410s，三段總有效4384.601s（73m4.601s）。原段01因外部debug時間無法完整核對，正式credit為0，僅保留質性背景。各段間空檔不計時；最後direct observation之後的關閉／報告時間不計時。

| 段04 raw區間 | Short reward | Mid / long goal | Unexpected / meaningful choice | New information / progress | Retention finding |
| --- | --- | --- | --- | --- | --- |
| 0–15m | 正常採礦工作3iron／4g、交易所得 | 140g土地／220g農場事業 | 商店閉門，改在pause下交易；保留劍供冒險 | 原save rep10、home＋sword，資本用途明確 | 前期低工資重複；兩次disabled locator屬harness時間，已扣除 |
| 15–30m | 土地購得、四格容量；地下城slime／elite loot | 耕作與Boss回收資本 | 採集交易達140g，購地142→2g；出發mine | 公開行動取得土地，combat自然形成adventurer | 生活資產有容量utility，較純數字有明確用途 |
| 30–45m | Chief勝利188XP／125g、額外鐵；home恢复 | 聘用同伴、開始四格播種 | HP53退出回家，再以25g聘Nora | 完整mine run1、正常save/reload；Nora共享聘用記憶與具體對話 | 冒險報酬可投入生活；party效果未單獨可見，不能把更快戰鬥全歸傭兵 |
| 45–最後direct 60m3.209s | 森林狼31XP／15g；兩輪每輪32food／4rep；售8food40g | 222g已達business金額、rep21→25成下一目標 | Nora契約在成熟等待中到期；以自宅休息維持耕作 | 兩次4g日薪、正常到期離隊；Lv8／farming5，resident＋farmer＋adventurer | 下一步清楚，但仍是更多耕作；跨日觀看價值有限、rep門檻可能形成repetition wall |

四格第一輪harvest位於raw51m36.7s～52m7.1s，第二輪位於raw57m43.4s～57m45.6s；完整原始action／NPC before-after表見[Hybrid](agent-playtest-hybrid.md)與[段04](hybrid-final/resumed-segment-04/attempt-02/results.json)。20:35:09.925–20:37:23.881 UTC 的133.956s報告／無觀察空檔已扣除，不能拿世界自行推進算作Agent參與。

## Signal 判讀與限制

- **Personal Goal / Anticipation：有Agent證據。** Life買房與耕作身份、Adventure準備Boss／裝備、Hybrid以冒險收入投入土地並追求rep25；不是代替真人Q1／Q8答案。
- **Attachment：有初步系統證據，仍待真人。** Home免費rest／storage、land四格效用與Nora記得聘用，提供可記憶事物；多數NPC仍未被Agent主動長期追蹤。
- **Reward Drought：候選。** Life成熟／低工資循環與Adventure等服務開放；不是宣稱每段都沒有獎勵。
- **Goal Drought：中期可見性疑慮。** Village解鎖與Identity門檻不易變成可追蹤目標；Hybrid最後有明確business目標，故不能概括三路都不知道下一步。
- **Repetition Wall：較強候選。** 低tier one-shot、反覆一件一賣、耕作→休息→等待。Agent知道目標，但部分路程只剩重複。
- **Meaningless Reward：未證實全面存在。** Gold可買home／land／gear／hire，food可種／吃／賣；共享food已cap時的聲望文案與傭兵單独貢獻則缺乏因果清晰度。

不增加V2.x或V3功能。以上Finding由使用者依真人1～2小時回答判斷優先順序；Human Fun Gate八題與觀察欄保持空白，狀態PENDING。
