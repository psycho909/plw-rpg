# 世界觀與系統完整性

本表對照目前 [SPEC](../../../SPEC.md) 實際存在的世界規則；Work Authority為 [Ticket](../../../tickets/20261003-comprehensive-playtest.md)。使用者已明確指定一個月為至少30個遊戲日。加速世界與正常UI路線各自記錄，不混算成實際瀏覽器時長。

| 世界面向 | 可驗證內容 | 本輪證據 |
| --- | --- | --- |
| 橡谷與周邊 | 聚落、農田、森林、礦區、迷霧山谷；所有308格內陸可達，水域不可走 | [8-seed全圖檢查](artifacts/movement-results.json)，生活／冒險正常UI、[UI回歸](artifacts/final-ui/results.json) |
| 農田與資源 | 四格田、整地播種成熟收割、分批成熟、技能改變產量、森林木材與礦區石／鐵、每天再生 | [生活紀錄](life/results.json)，[最終四田完整性](artifacts/final-integrity-results.json)，actions／simulation單元測試 |
| 聚落經濟 | Hamlet→Village→Town、解鎖酒館／鐵匠、雜貨買賣、城鎮八折、免費休息與住宿 | [生活路線](life/report.md)，[長期世界](longevity/report.md)，[付款邊界](artifacts/rest-wages-ui-fixed.json) |
| 居民 | 七種職業、睡眠／旅行／工作／休閒日程、工作技能、幼年／青年／成年／中年／老年、移民／出生／死亡 | [500年world](longevity/results.json)，simulation單元測試；[500年桌面／手機居民UI](artifacts/final-browser-results.json) |
| 日曆 | 每季30日、全年120日；春夏秋冬、日夜、年齡隨年份成長 | [20分鐘實時跨季](soak/report.md)，484,000日步、16,000季界、4,000年界檢查；calendar單元測試 |
| NPC互動與傳聞 | 只能控制主角，附近居民近況、酒館傳聞對應Threat／Boss，詳細居民清單 | UI回歸正常NPC交談、WorldRecords居民按鈕及NpcWindow；源碼／單元契約配合實際browser |
| 森林威脅 | 怪物增長、Camp升級、Boss兩次預警→累積Threat生成；安全與收入下降、道路傷勢、不直接Game Over | 8-seed500年各有兩次預警、Boss生成、NPC傷勢、聚落安全变化；[長期證據](longevity/results.json) |
| 森林Boss戰後 | 酋長自然出現、正常角色挑戰、擊敗記History、Threat重置後世界繼續 | [正常UI155.487日](adventure/report.md)；boss-threat-season-2生成→forest-chief-defeated→world-continues-after-boss，raw History確認boss.defeated |
| 山谷地下城 | 迷霧探索、入口→精英→守衛首領；退出／撤退與再次進入、三段clear、鐵礦獎勵 | [正常冒險](adventure/results.json)：dungeon-full-run-clear為同run三層、runs1、額外3鐵礦；離開後重入stage0為新run；高stats fixture分列 |
| 同行者 | 最多2人、fighter／healer作用、日薪、3日契約、死亡或欠薪解約 | [冒險正常路線](adventure/report.md)兩種同行者、第三人停用、午夜日薪8與到期後停扣；公式／死亡解約由actions／simulation單元及休息跨午夜回歸驗證 |
| 世界延續 | 自然主角死亡、成年NPC接續；保留時間、角色與歷史；死亡狀態可先保存 | baseline56次自然死亡／繼承，final-source另外56次；[最終結果](artifacts/final-integrity-results.json) |
| 歷史與保存 | 重大事件保存在世界；UI顯示最近100筆；version1、離線8h上限、原raw保護 | [存檔路線](persistence/report.md)、[500年UI保留1785歷史](artifacts/final-browser-results.json)，四項修復及[限制](BUGS.md) |

此版本不提供獨立地下城步行地圖；地下城是三段遭遇。世界地圖上的房屋、作物與森林威脅由現有世界狀態投影，不能把顯示物件當作新增模擬實體。本輪驗證既有規則；不額外宣稱未實作的任務、對話樹、家族或社交系統已被測試。
