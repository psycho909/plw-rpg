# Persistent Living World RPG — V1 UI/UX 完整重製 Prompt

你現在要針對現有 **Persistent Living World RPG V1** 進行完整 UI / UX 視覺與操作體驗重製。

本次工作的核心不是把既有 UI 換成 Pixel Font，而是重新建立符合遊戲定位的完整介面語言。

遊戲核心體驗是：

> 玩家直接控制一名主角，自由生活、工作、種田、採集、打怪、探索、進地下城、與 NPC 互動；同時間 NPC、村莊、城鎮、怪物、地下城與整個世界都在自己的時間軸上持續變化。

因此 UI 必須讓玩家感受到：

> **我生活在這個世界裡。**

而不是：

> 我正在操作一個世界管理 Dashboard。

---

# 1. 開始前

修改前必須先：

1. 閱讀整個 Repository。
2. 閱讀適用的 `AGENTS.md`。
3. 閱讀現有遊戲規格。
4. 理解現有：
   - World
   - Player
   - NPC
   - Settlement
   - Farming
   - Combat
   - Threat
   - Dungeon
   - Tavern
   - Inventory
   - Event Log
   - History
5. 找出目前：
   - Layout
   - Components
   - SCSS
   - Design Tokens
   - Icon Mapping
6. 不修改 Simulation 規則。
7. 不做與本次 UI/UX 無關的重構。
8. 優先沿用合理的既有 Component。

---

# 2. UI/UX 核心定位

整體風格：

> **80～90 年代復古遊戲視覺 + 黑白像素介面 + 8-bit + Game Boy Inspired + 繁體中文 + Emoji 世界物件**

視覺關鍵詞：

```text
Retro RPG
8-bit Pixel Art
Game Boy Inspired
Monochrome
Black & White
Pixel UI
ASCII RPG
Old PC RPG
1990s Handheld Game
Living World Simulation
```

但不是直接模仿或複製任何既有遊戲。

不要直接複製：

- Pokémon
- Dragon Quest
- Final Fantasy
- Zelda
- Game Boy 系統 UI

只吸收：

```text
低解析視覺
像素框線
緊湊資訊
RPG 視窗
文字選單
Tile Map
黑白對比
快速回應
```

---

# 3. 最重要原則：World First

正常遊玩時：

> **世界本身必須是畫面的主角。**

不要讓：

```text
Navigation
Stats
Settlement
Event Log
```

永遠吃掉大量畫面。

正常狀態應該：

```text
70～90% 畫面
=
World / Map / Environment
```

其他資訊：

```text
Status
Inventory
NPC
Settlement
History
Threat
```

只有需要時才打開。

---

# 4. 禁止固定 Dashboard 化

不要把主畫面做成：

```text
左側 Navigation
+
中央 Map
+
右側 Statistics
+
底部 Event Log
```

永遠固定存在。

這會使遊戲感覺變成：

> 世界監控後台。

可以在特定檢視模式出現 Side Panel，但正常探索模式不能永遠如此。

---

# 5. Normal Exploration Mode

玩家大部分遊戲時間應看到：

```text
┌──────────────────────────────────┐
│ 第03年 春季12日 14:20     [5X]  │
├──────────────────────────────────┤
│                                  │
│                                  │
│          WORLD MAP               │
│                                  │
│   🌲🌲🌲🏠🏠🍺🌲                │
│   🌲🌾🌾🙂━━🏪🌲                │
│   🌲👨‍🌾━━⚒️━━🌲               │
│   🌲🌲🐺🌲🌲🌲🌲                │
│                                  │
│                                  │
├──────────────────────────────────┤
│ 🙂 Lv.08 ♥82/100  體44/70 🪙218 │
└──────────────────────────────────┘
```

重點：

```text
Map 最大
Status 最小
Menu 隱藏
Log 不長期佔畫面
```

---

# 6. Contextual Interaction

玩家不應主要透過 Menu：

```text
選擇 Farming
選擇 Tavern
選擇 Mining
```

而應：

```text
走到農田
→ Enter
→ 種田

走到酒館
→ Enter
→ 進入

走到 NPC
→ Enter
→ 互動

走到礦坑
→ Enter
→ 採礦

走進森林
→ 自然探索
```

UI 必須支援：

> 空間 → 行動。

---

# 7. Context Prompt

靠近互動物件時：

```text
🌾 農田

[Enter] 工作
```

例如：

```text
🍺 酒館

[Enter] 進入
```

NPC：

```text
⚒️ 馬庫斯

[Enter] 互動
```

Dungeon：

```text
🕳️ 廢棄礦坑

[Enter] 進入地下城
```

不要一直顯示大量 Action Button。

---

# 8. 語言

所有主要介面使用：

> **繁體中文（台灣用語）**

包括：

- 選單
- 角色
- NPC
- 地點
- 建築
- 怪物
- 裝備
- 道具
- 戰鬥
- 系統訊息
- 日誌
- 世界歷史
- Threat
- Dungeon
- Tavern
- Shop

例如：

```text
世界
角色
物品
日誌
歷史
```

不要：

```text
WORLD
CHARACTER
INVENTORY
```

除非是非常短的裝飾性 Retro Label。

---

# 9. Emoji 使用原則

允許 Emoji。

而且 Emoji 可以正式成為 V1 世界物件視覺的一部分。

例如：

```text
🙂 主角
👨‍🌾 農夫
⚒️ 鐵匠
🛡️ 守衛

🌲 森林
🌾 農田
⛰️ 山
🌊 水域
🪨 岩石
⛏️ 礦坑

🏠 房屋
🏘️ 村莊
🏙️ 城鎮
🍺 酒館
🏪 商店

🐺 野狼
🟢 史萊姆
👺 哥布林
👹 首領
🐉 龍
```

但遵守：

> Emoji = 世界物件圖示。

不是裝飾。

---

# 10. Emoji 禁止方式

不要：

```text
✨🔥💥‼️😱💫⭐❗
```

大量插在所有文字。

避免變成：

> Emoji 聊天介面。

合理：

```text
🐺 野狼
🌲 森林
⚔️ 鐵劍
```

不合理：

```text
✨⚔️🔥超強🔥⚔️✨
```

---

# 11. Emoji + 中文

任何重要資訊不能只靠 Emoji。

例如地圖可以：

```text
🐺
```

但點擊後：

```text
🐺 野狼

等級：4
生命：31 / 31
狀態：敵對
```

---

# 12. 主色

整體：

```text
Black
White
Gray
```

建議：

```scss
--bg: #080808;
--surface: #111111;
--surface-alt: #191919;

--text: #f0f0f0;
--text-muted: #aaaaaa;

--border: #eeeeee;
--border-muted: #606060;

--selected-bg: #eeeeee;
--selected-text: #080808;
```

Emoji 保留原生顏色。

不要另外使用大量主題色。

---

# 13. Game Boy Style 定義

Game Boy Inspired 指的是：

```text
低解析
硬邊框
簡單選單
掌機資訊密度
Pixel UI
有限色彩
```

不是：

```text
強制綠色 LCD Palette
160×144 模擬
4 色限制
```

目前保持黑／白／灰。

---

# 14. 禁止的現代 UI

不要：

```text
Gradient
Glassmorphism
Blur
Glow
Soft Shadow
Neumorphism
Material UI
iOS Card
SaaS Dashboard
Pill Button
大型圓角
```

Border Radius：

```text
0
```

或非常小。

---

# 15. Pixel Visual Language

主要 UI 使用：

```text
Square
Hard Edge
Pixel Border
High Contrast
Tight Spacing
```

如果使用圖片：

```css
image-rendering: pixelated;
```

---

# 16. Typography

繁體中文可讀性優先。

禁止使用：

> 缺中文字型的 Pixel Font。

策略：

```text
English / Number
→ Pixel / Monospace

Traditional Chinese
→ 高可讀中文字型
```

復古感主要透過：

```text
框線
字級
Spacing
Layout
Symbol
```

建立。

---

# 17. World Map

主世界採：

```text
Grid / Tile Based
```

例如：

```text
🌊🌊🌊🌊🌊🌊🌊🌊
🌊🌲🌲⛰️❓❓🌊🌊
🌊🌲🏘️━━🌾⛏️🌊🌊
🌊🌲🙂━━🏪🌲🌊🌊
🌊🌲🐺🌲🪨🌲🌊🌊
🌊🌲👺🕳️🌲🌲🌊🌊
🌊🌊🌊🌊🌊🌊🌊🌊
```

這不是靜態圖片。

所有 Tile 都應該來自 World State。

---

# 18. World Change Must Be Visible

世界變化不能只存在數值。

例如村莊成長：

Before：

```text
🌲🌲🌲🌲🌲
🌲🏠🌾🌲🌲
🌲🌾🌾🌲🌲
```

After：

```text
🌲🏠🏠🍺🌲
🏠━━🏪⚒️🌲
🌾🌾━━━🌲
```

玩家不用打開：

```text
Settlement Level = 3
```

也能看出：

> 村莊變大了。

---

# 19. Monster Growth Must Be Visible

例如：

Early：

```text
🌲🌲👺🌲
```

Later：

```text
🌲👺👺🌲
🌲🏕️👺🌲
```

Further:

```text
👺👺👹👺
👺🏰👺👺
```

Threat System 必須在世界畫面具備視覺變化。

---

# 20. Unknown Area

使用：

```text
❓
?
░
▒
▓
```

例如：

```text
🌲🌲❓❓❓
🌲⛰️❓❓❓
🏘️🌾❓❓❓
```

不要一開始顯示全部資訊。

---

# 21. Fog of Knowledge

區分：

```text
未探索
已探索但未知詳情
完全掌握
```

例如：

```text
❓
↓
🌲
↓
🌲 北方森林
Threat Lv.2
```

---

# 22. Main HUD

正常探索只顯示必要資訊。

例如：

```text
第03年 春季12日 14:20

🙂 Lv.08

HP
████████░░

體力
█████░░░░░

🪙 218
```

不要一直展示：

```text
STR
VIT
DEX
INT
所有 Skill
Settlement
Threat
Population
```

需要時才打開。

---

# 23. Character Screen

按：

```text
C
```

或 Menu 開啟。

```text
┌ 角色 ────────────────────┐

🙂 阿爾登

年齡：19
等級：08

生命
████████░░ 82 / 100

體力
█████░░░░░ 44 / 70

力量 14
體質 12
敏捷 10
智力 08

技能

⚔️ 戰鬥       Lv.06
🌾 農耕       Lv.04
⛏️ 採礦       Lv.07
🪓 伐木       Lv.02

🪙 金幣
218

└──────────────────────────┘
```

不要：

> Stats 分成很多 Cards。

---

# 24. Overlay / Window System

角色、物品、NPC 等使用：

```text
Pixel Window Overlay
```

世界仍隱約存在背景。

例如：

```text
WORLD
+
Character Window
```

而不是：

> 導航到另一個 Dashboard Page。

---

# 25. Inventory

```text
┌ 物品 ──────────────────┐

> ⚔️ 鐵劍           ×1
  🧪 藥水           ×3
  🪵 木材           ×12
  ⛏️ 鐵礦石         ×08
  🐺 狼皮           ×02

容量

███████░░░
26 / 40

└────────────────────────┘
```

選擇後右側／下方顯示：

```text
⚔️ 鐵劍

攻擊：+8
```

---

# 26. NPC Interaction

點／面向 NPC：

```text
⚒️ 馬庫斯
```

開啟：

```text
┌ ⚒️ 馬庫斯 ────────────┐

42 歲
鐵匠
Lv.11

目前：
工作中

位置：
鐵匠鋪

> 交談
  交易
  離開

└───────────────────────┘
```

不要一開始展示大量 NPC 數據。

---

# 27. NPC World Presence

玩家應直接看到 NPC：

```text
👨‍🌾 → 農田
⚒️ → 鐵匠鋪
🛡️ → 城門
🧳 → 酒館
```

不需要華麗 Animation。

Tile Movement 即可。

---

# 28. Tavern

玩家走進酒館才顯示：

```text
┌ 🍺 酒館 ─────────────────┐

「今晚比平常熱鬧。」

> 聽聽傳聞
  查看傭兵
  住宿
  離開

└──────────────────────────┘
```

---

# 29. Tavern Rumor

```text
┌ 傳聞 ───────────────────┐

「北方森林最近不太平靜。」

「昨晚有人看到哥布林
靠近商道。」

「廢棄礦坑附近似乎
出現了新的入口。」

[繼續]

└────────────────────────┘
```

Rumor 是重要世界資訊來源。

---

# 30. Mercenary

```text
┌ 可聘請傭兵 ──────────────┐

🛡️ 羅夫

等級：05
職業：戰士

生命：82
攻擊：12
防禦：15

每日：
30 🪙

> 聘請
  查看詳情
  返回

└──────────────────────────┘
```

---

# 31. Party

正常 HUD 可以顯示：

```text
隊伍

🙂 阿爾登
🛡️ 羅夫
🏹 米拉
```

最多只顯示小型 Party Strip。

不要做大型 Character Manager。

---

# 32. Settlement

Settlement 是世界中的地點。

玩家進入：

```text
🏘️ 橡木村
```

畫面仍然是地圖。

需要查看狀態時才開：

```text
┌ 🏘️ 橡木村 ─────────────┐

人口：48
繁榮：██████░░
安全：███████░
糧食：良好

主要建築

🏠 房屋
🌾 農田
🍺 酒館
🏪 商店
⚒️ 鐵匠鋪

近期：

> 新居民搬入
> 北方道路不安全

└────────────────────────┘
```

---

# 33. Settlement 不提供 God Controls

不要：

```text
Build
Upgrade
Assign Worker
Tax
Population Management
```

除非未來玩家角色取得相應身份。

V1 玩家主要：

```text
生活
觀察
互動
```

---

# 34. Farming

農田直接存在世界。

例如：

```text
⬛⬛⬛⬛⬛
⬛🌱🌱⬛⬛
⬛🌿🌿⬛⬛
⬛🌾🌾⬛⬛
```

互動：

```text
🌾 小麥

成長：
第 4 / 7 天

█████░░

[收成尚未成熟]
```

---

# 35. Resource Gathering

靠近：

```text
🌲 樹木
```

顯示：

```text
[Enter] 伐木
```

靠近：

```text
⛏️ 礦脈
```

顯示：

```text
[Enter] 採礦
```

不要透過 Menu 選擇活動。

---

# 36. Combat Transition

遭遇怪物時：

世界畫面可以直接切到：

```text
Battle Window
```

不需要大型 Scene Transition。

---

# 37. Combat UI

```text
┌ 戰鬥 ──────────────────┐

       🐺 野狼
       Lv.07

生命
█████░░░░░

--------------------------

       🙂 阿爾登
       Lv.09

生命
████████░░

體力
██████░░░░

> ⚔️ 攻擊
  🛡️ 防禦
  🧪 道具
  ↩ 逃跑

└────────────────────────┘
```

---

# 38. Combat Feedback

例如：

```text
阿爾登攻擊！
造成 14 點傷害。

野狼攻擊！
受到 7 點傷害。
```

允許：

```text
Pixel Flash
Damage Number
Small Shake
```

不要：

```text
大型特效
大量粒子
長動畫
```

---

# 39. Dungeon

地下城可以比戶外更 ASCII。

例如：

```text
████████████
█🙂...█....█
█.██..█.👺.█
█....██....█
██.......███
█......👹..█
████████████
```

或 Tile + Emoji 混合。

---

# 40. Threat UX

Threat 不是一直顯示數字。

玩家應該透過：

```text
世界變化
傳聞
日誌
NPC
地圖
```

逐漸感受到。

需要查看時：

```text
┌ ⚠️ 北方森林 ────────────┐

威脅：Lv.4

████████░░

👺 哥布林
數量：持續增加

🏕️ 哥布林營地
Lv.2

狀態：
!!! 危險上升 !!!

└─────────────────────────┘
```

---

# 41. Boss Warning

不要突然巨大華麗 Cutscene。

例如：

```text
################################

          !!! 警告 !!!

       👹 哥布林首領

           Lv.18

################################
```

搭配：

```text
黑白反轉
短暫 Flash
```

即可。

---

# 42. World Time

時間永遠存在於正常 HUD：

```text
第03年 春季12日 14:20
```

時間控制：

```text
[II]
[1X]
[5X]
[20X]
```

不要大型時間控制 Panel。

---

# 43. Season Transition

```text
======================

        夏季

       第03年

======================
```

短暫出現。

---

# 44. Year Transition

```text
======================

       第04年

======================
```

讓世界時間具有存在感。

---

# 45. Aging UX

不需要一直跳通知。

主角生日：

```text
阿爾登現在 24 歲了。
```

普通 NPC 年齡：

只寫入 World State。

重要 NPC：

```text
老鐵匠馬庫斯今年 70 歲。
```

死亡：

```text
==========================

⚒️ 馬庫斯
於 72 歲離世。

==========================
```

---

# 46. World History

世界重大事件才寫入：

```text
世界歷史
────────────────────

第01年
🏘️ 橡木聚落建立。

第04年
🏘️ 橡木聚落發展為村莊。

第07年
🕳️ 廢棄礦坑被發現。

第09年
👺 哥布林建立大型營地。

第11年
👹 哥布林首領出現。
```

---

# 47. Event Log

Event Log 很重要，但不能固定霸佔主畫面。

使用：

```text
[L]
```

開啟／收合。

收合時只顯示最後 1～3 條：

```text
14:20 🐺 北方狼群增加。
14:28 ⚒️ 馬庫斯結束工作。
```

展開：

```text
┌ 世界日誌 ─────────────────┐

[14:20] 北方狼群增加。
[14:28] 馬庫斯結束工作。
[14:40] 商人抵達橡木村。
[15:10] 哥布林襲擊商路。

└───────────────────────────┘
```

---

# 48. Event Importance

分：

```text
一般
重要
重大
```

一般：

```text
Log only
```

重要：

```text
Small Toast
```

重大：

```text
Retro Alert
```

不要所有事件都搶玩家注意力。

---

# 49. Menu

按：

```text
Esc
```

才開：

```text
┌ 選單 ──────────┐

> 角色
  物品
  日誌
  世界
  歷史
  儲存
  設定

└────────────────┘
```

不要永久 Sidebar。

---

# 50. Selection Style

使用：

```text
> 攻擊
  防禦
  道具
```

或：

```text
█ 攻擊
  防禦
```

Active 也可以：

```text
黑白反轉
```

---

# 51. Buttons

例如：

```text
[購買]
[出售]
[聘請]
[休息]
[離開]
```

不要：

```text
Pill Button
Shadow Button
Gradient Button
```

---

# 52. Progress Bar

統一：

```text
████████░░
```

例如：

```text
生命 ████████░░
體力 █████░░░░░
經驗 ██████░░░░
```

---

# 53. Dialog

```text
┌ 酒館老闆 ─────────────────┐

最近北方回來的商人說，
森林裡的哥布林似乎
比以前多了。

                 [繼續 >]

└───────────────────────────┘
```

不要現代 Modal。

---

# 54. Information Hierarchy

正常狀態只顯示：

```text
世界
時間
主角生命
體力
金幣
必要互動提示
```

其他內容按需打開。

---

# 55. Avoid Information Overload

不要主畫面同時顯示：

```text
Population
Threat
Settlement Growth
NPC Count
Food
Prosperity
Every Skill
Every Item
```

世界資訊應透過：

```text
探索
觀察
NPC
Rumor
Menu
```

取得。

---

# 56. Modern UX 保留

視覺可以復古。

操作不能真的退回 1990 年。

必須保留：

```text
Responsive
Keyboard
Mouse
Clear Focus
Tooltip
合理 Shortcut
Readable Chinese
Accessibility
快速 Save
```

---

# 57. Keyboard

支援：

```text
WASD
方向鍵
Enter
Esc
```

建議：

```text
C → 角色
I → 物品
L → 日誌
M → 世界地圖
```

若現有快捷鍵衝突則調整。

---

# 58. Mouse

所有主要操作仍需可用 Mouse。

不能因復古風格要求玩家只能 Keyboard。

---

# 59. Accessibility

必須：

```text
清楚 Focus
高 Contrast
Emoji 搭配文字
aria-label
Keyboard 可操作
狀態不能只靠顏色
```

---

# 60. Responsive Desktop

主要體驗：

```text
1440
1280
1024
```

地圖盡量大。

---

# 61. Tablet

768 左右：

資訊 Window 以 Overlay 為主。

避免三欄。

---

# 62. Mobile

Mobile：

```text
WORLD
```

仍然優先。

底部可有：

```text
[地圖]
[角色]
[物品]
[日誌]
```

但不要變成現代 Mobile App Tab Bar 視覺。

保持 Pixel Border。

---

# 63. Mobile Interaction

Mobile 需要：

```text
方向控制
互動
Menu
```

但 V1 Desktop 可以是主要開發優先級。

Mobile 不能完全壞版。

---

# 64. Animation

允許：

```text
Tile Movement
Cursor Blink
Pixel Flash
Damage Number
Warning Blink
Small Shake
```

Transition：

```text
0～120ms
```

不要：

```text
Smooth SaaS Fade
Spring
Long Slide
Parallax
```

---

# 65. CRT

非必要。

若加入：

```text
Very subtle scanline
```

且可以關閉。

不要：

```text
重度 Flicker
Noise
Curved Screen
Heavy Blur
```

---

# 66. Audio UI Hooks

不用本次完成音效。

但 Component 可以預留：

```text
menuMove
confirm
cancel
battleHit
levelUp
warning
```

供未來 8-bit SFX。

---

# 67. Design Tokens

集中：

```scss
$pixel-unit
$border-width

$bg
$surface
$text
$text-muted
$border

$font-ui
$font-mono

$space-1
$space-2
$space-3
$space-4

$tile-size
$panel-padding
```

不要 Component 任意定義。

---

# 68. Shared Components

依實際需求建立：

```text
PixelWindow
PixelPanel
PixelButton
PixelMenu
PixelProgress
PixelDialog
PixelTooltip
PixelList
PixelTabs
PixelAlert
PixelMapTile
ContextPrompt
PlayerHUD
WorldLog
```

不要過度抽象。

---

# 69. Empty State

不要：

```text
No Data
Empty
```

可以：

```text
目前沒有紀錄。
```

或：

```text
這裡目前什麼也沒有。
```

Inventory：

```text
背包是空的。
```

---

# 70. Loading

```text
正在載入世界...

[██████░░░░]
```

不要 Spinner。

---

# 71. Save

```text
正在儲存世界...
```

完成：

```text
世界已儲存。
```

---

# 72. Load

例如：

```text
第04年 夏季08日

🏘️ 橡木村

🙂 阿爾登
32 歲
Lv.21
```

---

# 73. New World

```text
建立新世界

角色名稱
> ________

世界種子
> 184029

[開始生活]
```

不要大型 Character Creator。

---

# 74. First-Time Tutorial

不要連續 Modal。

只使用 Contextual Hint。

例如：

```text
移動
WASD / 方向鍵
```

第一次看到互動物：

```text
[Enter] 互動
```

之後不再重複。

---

# 75. UX Philosophy

玩家不是在：

```text
解任務清單
領每日獎勵
清紅點
```

玩家是在：

> 自由生活。

所以不要加入：

```text
Daily Quest
Login Reward
Battle Pass
Claim
Red Dot
FOMO
```

---

# 76. World Information Discovery

不要把所有資訊直接放 UI。

例如森林：

第一次：

```text
🌲 北方森林

狀態：
未知
```

酒館聽聞：

```text
最近森林不太安全。
```

探索：

```text
👺 發現哥布林。
```

最後：

```text
🌲 北方森林

威脅 Lv.2

👺 哥布林活動
🏕️ 營地位置已知
```

---

# 77. World > UI

如果某項資訊：

> 可以直接透過世界畫面呈現。

不要優先做成數字。

例如：

村莊變大：

```text
增加建築
增加道路
增加 NPC
```

比：

```text
Village Level +1
```

更重要。

---

# 78. NPC > Statistics

NPC 年老：

盡量透過：

```text
名字
年齡
圖示
工作
世界事件
```

讓玩家感受到。

不要一直跳：

```text
NPC Aging +1
```

---

# 79. Monster > Threat Bar

Threat Bar 是輔助。

真正的威脅應反映：

```text
怪物增加
NPC 傳聞
商路異常
營地擴大
怪物靠近聚落
```

---

# 80. UI 成功標準

完成後必須符合：

### A

第一眼看起來是一款：

> 復古 RPG 遊戲。

不是網站後台。

### B

玩家大部分時間看：

> 世界。

不是 Menu。

### C

介面／物件：

> 繁體中文。

### D

Emoji：

> 有系統地代表世界物件。

### E

世界改變：

> 能直接從地圖觀察。

### F

即使沒有大量 Pixel Art：

> 仍具有完整遊戲感。

### G

UI 不妨礙：

> 自由生活。

---

# 81. 最終視覺比例

設計方向約：

```text
50% 80～90 年代 RPG
20% Game Boy / 8-bit
15% ASCII / Text RPG
15% 現代 UX
```

不是：

> 純 Game Boy 模擬。

---

# 82. 最終視覺定位

正式定調：

> **Monochrome Retro Living World**

構成：

```text
黑白／灰 UI
+
繁體中文
+
Emoji 世界物件
+
ASCII / Unicode
+
Pixel Border
+
Tile Map
+
Retro Window
```

---

# 83. 最終體驗關鍵句

所有 UI/UX 決策都必須服務這句話：

> **我自由地生活在這個世界裡，而在我生活的同時，其他人、村莊、怪物、地下城與整個世界，也正在過著屬於它們自己的時間。**

如果某個 UI 設計讓玩家感覺：

> 我是在管理數值。

而不是：

> 我人在世界裡。

就應重新設計。

---

# 84. 實作順序

## Phase 1 — Visual Foundation

完成：

```text
Color
Typography
Pixel Border
Button
Menu
Progress
Dialog
Window
Design Token
```

## Phase 2 — Exploration Shell

完成：

```text
World First Layout
Time HUD
Player HUD
Context Prompt
Overlay Window
```

## Phase 3 — World Map

完成：

```text
Terrain
Player
NPC
Monster
Building
Unknown Area
World Change
```

## Phase 4 — Life UI

完成：

```text
Farming
Gathering
NPC Interaction
Shop
Tavern
```

## Phase 5 — RPG UI

完成：

```text
Character
Inventory
Party
Combat
Dungeon
```

## Phase 6 — Living World

完成：

```text
Settlement
Threat
World Event
History
Log
```

## Phase 7 — Responsive

完成：

```text
Desktop
Tablet
Mobile
```

---

# 85. Verification

完成後執行：

```text
build
lint
test
```

並實際使用 Browser 驗證：

```text
New World
Move
Interact
Farm
Gather
Talk NPC
Enter Tavern
Hire Mercenary
Inventory
Character
Explore
Combat
Dungeon
Threat
Settlement Change
World Log
History
Save
Load
Responsive
Keyboard
Mouse
```

---

# 86. UI Review Checklist

確認：

```text
[ ] 主畫面不是 Dashboard
[ ] World Map 佔主要畫面
[ ] Menu 預設收合
[ ] Status 不遮擋世界
[ ] 所有主要文字繁體中文
[ ] Emoji 使用一致
[ ] Emoji 不取代文字資訊
[ ] 黑白仍是介面主調
[ ] 沒有過度現代 Card
[ ] 沒有大量圓角
[ ] 沒有 Gradient
[ ] NPC 在地圖上有存在感
[ ] 村莊成長直接反映地圖
[ ] Monster Threat 直接反映世界
[ ] 日誌不長期霸佔畫面
[ ] Keyboard 可操作
[ ] Mouse 可操作
[ ] 中文閱讀正常
```

---

# 87. 完成後回報

完成後提供：

1. 修改過的 UI 架構。
2. World First Layout 如何實作。
3. 哪些固定 Panel 被改成 Overlay / Context Window。
4. 中文化範圍。
5. Emoji Mapping。
6. Design Tokens。
7. 共用 Components。
8. World Map 的表現。
9. Settlement / Monster 世界變化如何視覺化。
10. Desktop / Tablet / Mobile 驗證。
11. Keyboard / Mouse 驗證。
12. Build / Lint / Test 結果。
13. 尚未完成與 V2 建議。

不要只回答：

> 完成。

必須提供實際驗證結果。

---

# 88. 最終要求

這次 UI/UX 重製最重要的不是：

> 讓畫面變得更漂亮。

而是：

> **讓玩家感覺自己真的住在這個持續運作的世界裡。**

畫面可以非常簡單。

甚至可以主要只有：

```text
Emoji
文字
符號
Pixel Border
Tile
```

但正常遊玩時必須讓玩家產生：

> 「我現在要去哪裡？」

而不是：

> 「我現在要點哪個管理頁面？」

這就是本次 UI/UX 是否成功的最高判斷標準。