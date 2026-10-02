<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { BUILDINGS, CONFIG, DUNGEON, ITEMS, JOBS, MONSTERS, REGIONS } from './data/config'
import type { BuildingId, Category, ItemId, RegionId, Tile } from './domain/types'
import { calendar, clockLabel } from './engine/calendar'
import { combatTurn, encounter, enterDungeon, equip, farm, gather, hire, leaveDungeon, rest, trade, usePotion, canVisit } from './engine/actions'
import { startLoop } from './engine/gameLoop'
import { chooseSuccessor, distance, movePlayer, population, stageIndex, walkTo } from './engine/simulation'
import { activities, buildingIcons, itemIcons, jobIcons, lifeStages, monsterIcons, regionIcons, stages, terrainIcons } from './presentation/icons'
import { useGameStore } from './stores/gameStore'

const game = useGameStore()
const view = ref('world'), filter = ref<Category | 'all'>('all'), showPeople = ref(false)
const time = computed(() => calendar(game.state.worldTime))
const c = computed(() => game.character)
const successorDialog = ref<HTMLDialogElement | null>(null)
watch(() => c.value.isAlive, async alive => {
  await nextTick()
  if (!alive) successorDialog.value?.showModal()
}, { immediate: true })
const tabs = [{ id: 'world', icon: '⌘', label: '世界' }, { id: 'character', icon: '♙', label: '角色' }, { id: 'inventory', icon: '▣', label: '背包' }, { id: 'journal', icon: '☷', label: '旅人筆記' }, { id: 'history', icon: '◷', label: '世界歷史' }]
const filters: { id: Category | 'all'; label: string }[] = [{ id: 'all', label: '全部' }, { id: 'player', label: '自己' }, { id: 'npc', label: '居民' }, { id: 'world', label: '世界' }, { id: 'monster', label: '威脅' }, { id: 'settlement', label: '聚落' }]
const logs = computed(() => game.state.events.filter(e => filter.value === 'all' || e.category === filter.value).slice(-35).reverse())
const residents = computed(() => game.state.npcs.filter(n => n.isAlive))
const mercenaries = computed(() => residents.value.filter(n => n.job === 'mercenary' && n.age >= 15 && !game.state.party.some(p => p.npcId === n.id)))
const currentRegion = computed(() => REGIONS[c.value.currentRegion])
const monster = computed(() => game.state.combat ? MONSTERS[game.state.combat.monsterId as keyof typeof MONSTERS] : null)
const paths: { label: string; region: RegionId; position: { x: number; y: number } }[] = [
  { label: '回家', region: 'village', position: BUILDINGS.house.position }, { label: '農田', region: 'farmland', position: BUILDINGS.farm.position },
  { label: '森林', region: 'forest', position: { x: 5, y: 4 } }, { label: '礦場', region: 'mine', position: { x: 19, y: 5 } },
  { label: '探索迷霧', region: 'unknown', position: DUNGEON.position },
]
const items = Object.keys(ITEMS) as ItemId[]
const buildingIds = Object.keys(BUILDINGS) as BuildingId[]
const npcTiles = computed(() => {
  const map = new Map<string, typeof game.state.npcs>()
  for (const npc of residents.value) {
    const key = `${npc.position.x},${npc.position.y}`
    map.set(key, [...(map.get(key) || []), npc])
  }
  return map
})
function tileIcon(tile: Tile) {
  if (!tile.discovered) return '·'
  if (c.value.isAlive && distance(c.value.position, tile) === 0) return '🙂'
  if (tile.x === DUNGEON.position.x && tile.y === DUNGEON.position.y && game.state.dungeon.discovered) return '🕳️'
  if (tile.building && game.state.settlement.buildings.includes(tile.building)) return buildingIcons[tile.building]
  const npc = npcTiles.value.get(`${tile.x},${tile.y}`)?.[0]
  if (npc) return jobIcons[npc.job]
  return terrainIcons[tile.terrain]
}
function tileLabel(tile: Tile) {
  const names = npcTiles.value.get(`${tile.x},${tile.y}`)?.map(n => n.name).join('、')
  return `${tile.x}, ${tile.y}：${tile.discovered ? REGIONS[tile.regionId].name : '未知區域'}${tile.building && game.state.settlement.buildings.includes(tile.building) ? ` ${BUILDINGS[tile.building].name}` : ''}${names ? ` ${names}` : ''}`
}
function go(position: { x: number; y: number }) { game.act(() => walkTo(game.state, position)); view.value = 'world' }
function wait(minutes: number) {
  if (game.state.combat || game.state.dungeon.inDungeon) { game.message = '請先完成戰鬥或離開礦坑。'; return }
  game.advance(minutes); game.message = '時間繼續前進。聚落與森林都有自己的生活。'
}
function reset() { if (window.confirm('重建世界會覆蓋目前存檔與所有歷史。確定重新開始？')) game.reset() }
function keydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable))) return
  const directions: Record<string, [number, number]> = { w: [0, -1], ArrowUp: [0, -1], s: [0, 1], ArrowDown: [0, 1], a: [-1, 0], ArrowLeft: [-1, 0], d: [1, 0], ArrowRight: [1, 0] }
  const direction = directions[event.key] || directions[event.key.toLowerCase()]
  if (direction && view.value === 'world') { event.preventDefault(); game.act(() => movePlayer(game.state, ...direction)) }
}
let stop: (() => void) | undefined
const saveOnHide = () => { if (document.hidden) game.save() }
const saveOnExit = () => game.save()
onMounted(() => { stop = startLoop(game.advance, () => game.speed, () => game.save()); window.addEventListener('keydown', keydown); window.addEventListener('pagehide', saveOnExit); document.addEventListener('visibilitychange', saveOnHide) })
onUnmounted(() => { stop?.(); window.removeEventListener('keydown', keydown); window.removeEventListener('pagehide', saveOnExit); document.removeEventListener('visibilitychange', saveOnHide) })
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <a class="wordmark" href="#" @click.prevent="view = 'world'"><span class="crest">♣</span><span>Oakvale<small>在世界裡，好好生活。</small></span></a>
      <div class="world-clock"><span class="season-mark">{{ ['✿', '☀', '❧', '❄'][time.season] }}</span><span>第 {{ time.year }} 年 · {{ CONFIG.seasons[time.season] }} {{ time.day }} 日<strong>{{ String(time.hour).padStart(2, '0') }}:{{ String(time.minute).padStart(2, '0') }}</strong></span></div>
      <div class="speed-controls" aria-label="世界時間速度"><button v-for="speed in [0, 1, 5, 20]" :key="speed" :class="{ selected: game.speed === speed }" :aria-pressed="game.speed === speed" @click="game.speed = speed">{{ speed ? `×${speed}` : '暫停' }}</button></div>
      <button class="save-button" @click="game.save(true)">儲存世界 <span aria-hidden="true">↧</span></button>
    </header>

    <div v-if="game.offline" class="away-banner"><div><strong>歡迎回來。你不在時，世界繼續前進。</strong><p>經過 {{ Math.floor(game.offline.minutes / 1440) }} 日 {{ Math.floor(game.offline.minutes % 1440 / 60) }} 小時 · 人口 {{ game.offline.populationChange >= 0 ? '+' : '' }}{{ game.offline.populationChange }} · {{ game.offline.matured }} 塊田成熟 · 森林威脅 {{ game.offline.threatBefore }} → {{ game.offline.threatAfter }} · 聚落 {{ stages[game.offline.stageAfter] }} · {{ game.offline.contractsEnded }} 份契約結束</p></div><button @click="game.offline = null" aria-label="關閉離線摘要">×</button></div>
    <div class="workspace">
      <nav class="sidebar" aria-label="遊戲頁面">
        <div class="nav-items"><button v-for="tab in tabs" :key="tab.id" :class="{ active: view === tab.id }" :aria-pressed="view === tab.id" @click="view = tab.id"><span>{{ tab.icon }}</span>{{ tab.label }}</button></div>
        <div class="sidebar-bottom"><span class="live-dot" :class="{ paused: game.speed === 0 }"></span>{{ game.speed ? '世界正在流動' : '時間已暫停' }}<small>即使站著不動，<br>故事也會繼續。</small><button @click="reset">重建世界</button></div>
      </nav>

      <main>
        <div class="view-heading"><div><p>你的旅程，第 {{ Math.floor(game.state.worldTime / 1440) + 1 }} 天</p><h1>{{ view === 'world' ? '一個正在生活的世界' : tabs.find(t => t.id === view)?.label }}</h1></div><span class="location-tag">{{ regionIcons[c.currentRegion] }} {{ currentRegion.name }}</span></div>

        <template v-if="view === 'world'">
          <section class="map-panel" aria-label="橡谷世界地圖">
            <div class="map-toolbar"><span>橡谷與周邊</span><small>WASD / 方向鍵移動 · 點地圖步行前往</small><span class="map-coordinates">{{ c.position.x }}, {{ c.position.y }}</span></div>
            <div class="map-scroll"><div class="world-map" tabindex="0" aria-label="世界地圖，使用 WASD 或方向鍵移動" :style="{ '--columns': CONFIG.width }">
              <button v-for="tile in game.state.tiles" :key="`${tile.x},${tile.y}`" class="tile" :class="[tile.discovered ? tile.terrain : 'fog', { 'is-player': c.isAlive && distance(c.position, tile) === 0, 'is-building': tile.building && game.state.settlement.buildings.includes(tile.building), 'has-npc': npcTiles.has(`${tile.x},${tile.y}`) }]" :disabled="!tile.walkable || !!game.state.combat || game.state.dungeon.inDungeon" tabindex="-1" :aria-label="tileLabel(tile)" :title="tileLabel(tile)" @click="go(tile)"><span>{{ tileIcon(tile) }}</span><small v-if="tile.building && game.state.settlement.buildings.includes(tile.building) && distance(c.position, tile) !== 0">{{ BUILDINGS[tile.building].name }}</small></button>
              <span class="map-region forest-label">北方森林</span><span class="map-region farm-label">東方農田</span><span class="map-region village-label">{{ game.state.settlement.name }}{{ stages[game.state.settlement.stage] }}</span><span class="map-region mine-label">{{ game.state.regions.unknown.discovered ? '迷霧山谷' : '未知的山谷' }}</span>
            </div></div>
            <div class="map-footer"><span><i class="legend-player"></i> 你</span><span><i class="legend-npc"></i> 自主生活的居民</span><span><i class="legend-fog"></i> 未探索</span><div class="direction-buttons"><button aria-label="往左" @click="game.act(() => movePlayer(game.state, -1, 0))">←</button><button aria-label="往上" @click="game.act(() => movePlayer(game.state, 0, -1))">↑</button><button aria-label="往下" @click="game.act(() => movePlayer(game.state, 0, 1))">↓</button><button aria-label="往右" @click="game.act(() => movePlayer(game.state, 1, 0))">→</button></div></div>
          </section>
          <div class="travel-row"><span>步行前往</span><button v-for="path in paths" :key="path.region" @click="go(path.position)">{{ regionIcons[path.region] }} {{ path.label }}</button></div>

          <section class="activity-panel">
            <div class="section-heading"><div><h2>{{ game.state.dungeon.inDungeon ? '廢棄礦坑' : currentRegion.name }}</h2><p>{{ game.state.dungeon.inDungeon ? `探索 ${game.state.dungeon.stage + 1} / 3 · 威脅 Lv.${game.state.dungeon.threat}` : currentRegion.subtitle }}</p></div><button class="quiet" @click="wait(1440)">等待 1 日</button></div>
            <div v-if="game.state.combat && monster" class="combat-panel"><div class="enemy"><span>{{ monsterIcons[game.state.combat.monsterId as keyof typeof monsterIcons] }}</span><div><strong>{{ game.state.combat.elite ? '精英 ' : '' }}{{ monster.name }}</strong><progress aria-label="怪物生命" :value="game.state.combat.hp" :max="game.state.combat.maxHp" /><small>HP {{ game.state.combat.hp }} / {{ game.state.combat.maxHp }}</small></div></div><div class="action-buttons"><button v-for="command in [{ id: 'attack' as const, label: '攻擊' }, { id: 'defend' as const, label: '防禦' }, { id: 'potion' as const, label: '喝藥水' }, { id: 'run' as const, label: '逃跑' }]" :key="command.id" @click="game.act(() => combatTurn(game.state, command.id))">{{ command.label }}</button></div></div>
            <div v-else-if="game.state.dungeon.inDungeon" class="action-buttons"><button class="primary" @click="game.act(() => encounter(game.state))">探索下一層</button><button @click="game.act(() => leaveDungeon(game.state))">離開礦坑</button></div>
            <template v-else>
              <div v-if="c.currentRegion === 'farmland'" class="farm-content"><div class="plot-row"><div v-for="i in CONFIG.maxPlots" :key="i" class="plot"><span>{{ game.state.crops[i - 1] ? game.state.crops[i - 1]!.status === 'mature' ? '🌾' : '🌱' : i <= game.state.crops.length + game.state.preparedPlots ? '▤' : '·' }}</span><small>{{ game.state.crops[i - 1] ? game.state.crops[i - 1]!.status === 'mature' ? '可收割' : `剩 ${Math.ceil((game.state.crops[i - 1]!.matureAt - game.state.worldTime) / 60)} 小時` : i <= game.state.crops.length + game.state.preparedPlots ? '已整地' : '空田' }}</small></div></div><div class="action-buttons"><button @click="game.act(() => farm(game.state, 'prepare'))">整地 · 20 分</button><button @click="game.act(() => farm(game.state, 'plant'))">播種 · 10 分</button><button class="primary" @click="game.act(() => farm(game.state, 'harvest'))">收割</button></div></div>
              <div v-if="c.currentRegion === 'forest'" class="action-buttons"><button @click="game.act(() => gather(game.state, 'wood'))">🪓 伐木</button><button class="primary" @click="game.act(() => encounter(game.state))">⚔️ 尋找怪物</button><button v-if="game.state.threat.bossAlive" class="danger" @click="game.act(() => encounter(game.state, true))">挑戰哥布林酋長</button></div>
              <div v-if="c.currentRegion === 'mine'" class="action-buttons"><button @click="game.act(() => gather(game.state, 'stone'))">🪨 採石</button><button class="primary" @click="game.act(() => gather(game.state, 'iron'))">⛏️ 採鐵礦</button></div>
              <div v-if="c.currentRegion === 'unknown'" class="action-buttons"><button class="primary" :disabled="distance(c.position, DUNGEON.position) > 1" @click="game.act(() => enterDungeon(game.state))">🕳️ 進入廢棄礦坑</button><span class="muted">入口在 {{ DUNGEON.position.x }}, {{ DUNGEON.position.y }}</span></div>
              <div v-if="c.currentRegion === 'village'" class="action-buttons"><button @click="game.act(() => rest(game.state, 'rest'))">休息 · 1 小時</button><button v-for="b in buildingIds.filter(id => !['house', 'farm'].includes(id))" :key="b" :disabled="!game.state.settlement.buildings.includes(b)" @click="go(BUILDINGS[b].position)">{{ buildingIcons[b] }} {{ BUILDINGS[b].name }}{{ !game.state.settlement.buildings.includes(b) ? '（村莊解鎖）' : '' }}</button></div>
              <div v-if="canVisit(game.state, 'inn')" class="service-panel"><strong>旅店 · 隨時營業</strong><button @click="game.act(() => rest(game.state, 'inn'))">住宿 · 8 金幣 / 8 小時</button></div>
              <div v-if="canVisit(game.state, 'store') || canVisit(game.state, 'blacksmith')" class="shop-panel"><h3>{{ canVisit(game.state, 'blacksmith') ? '鐵匠鋪' : '雜貨店' }} · {{ stageIndex(game.state) === 2 ? '城鎮優惠 8 折' : '歡迎光臨' }}</h3><div v-for="item in items.filter(i => canVisit(game.state, 'blacksmith') ? ['sword', 'armor'].includes(i) : !['sword', 'armor'].includes(i))" :key="item" class="shop-item"><span>{{ itemIcons[item] }} {{ ITEMS[item].name }} <small>持有 {{ c.inventory[item] }}</small></span><button @click="game.act(() => trade(game.state, item, true))">買 {{ Math.ceil(ITEMS[item].price * (stageIndex(game.state) === 2 ? .8 : 1)) }} 金</button><button :disabled="!c.inventory[item]" @click="game.act(() => trade(game.state, item, false))">賣 {{ ITEMS[item].sell }} 金</button></div></div>
              <div v-if="canVisit(game.state, 'tavern')" class="tavern-panel"><h3>酒館 · 17:00–24:00</h3><p class="rumor">「{{ game.state.threat.bossAlive ? '北方出現哥布林酋長，商人都不敢出門了。' : game.state.threat.threatLevel >= 2 ? '森林裡的哥布林愈來愈多，出門記得找個伴。' : '最近林子還算安靜。聽說山谷藏著一座舊礦坑。' }}」</p><button @click="game.act(() => rest(game.state, 'tavern'))">喝一杯、歇歇腳 · 3 金</button><div v-for="npc in mercenaries" :key="npc.id" class="mercenary"><span>⚔️ {{ npc.name }} <small>Lv.{{ npc.level }} · {{ npc.age }} 歲 · {{ npc.injuredUntil > game.state.worldTime ? '休養中' : '可同行' }}</small></span><button :disabled="game.state.party.length >= 2 || npc.injuredUntil > game.state.worldTime" @click="game.act(() => hire(game.state, npc.id))">聘請 · {{ 20 + stageIndex(game.state) * 5 }} 金</button></div><small>契約 3 日，日薪 4 金；最多 2 名同行者。</small></div>
              <p v-if="c.currentRegion === 'village'" class="muted service-hint">靠近建築即可使用服務。雜貨店 08–20 時，鐵匠鋪 08–18 時，酒館 17–24 時。</p>
            </template>
          </section>
        </template>

        <section v-if="view === 'character'" class="detail-panel"><div class="character-banner"><span>🙂</span><div><h2>{{ c.name }}</h2><p>{{ c.age }} 歲 · {{ lifeStages[c.lifeStage] }} · {{ c.isAlive ? '橡谷居民' : '已離世' }}</p></div><strong>Lv.{{ c.level }}</strong></div><h3>角色經驗 {{ c.exp }} / {{ c.level * 30 }}</h3><progress aria-label="角色經驗" :value="c.exp" :max="c.level * 30" /><div class="stats-grid"><div v-for="(value, stat) in c.stats" :key="stat"><small>{{ { strength: '力量', vitality: '體質', dexterity: '敏捷', intelligence: '智力' }[stat] }}</small><strong>{{ value }}</strong></div></div><h3>熟練度</h3><div v-for="(skill, id) in c.skills" :key="id" class="skill-row"><span>{{ { combat: '⚔️ 戰鬥', farming: '🌾 耕作', mining: '⛏️ 採礦', woodcutting: '🪓 伐木' }[id] }}</span><progress :aria-label="id" :value="skill.exp" :max="skill.level * 20" /><strong>Lv.{{ skill.level }}</strong></div><p class="muted">耕作等級提高收成；採集熟練度增加產量並縮短工作時間；戰鬥熟練度增加傷害。年齡會改變體力上限。</p></section>

        <section v-if="view === 'inventory'" class="detail-panel"><div class="section-heading"><h2>隨身背包</h2><strong>🪙 {{ c.gold }} 金幣</strong></div><div class="inventory-grid"><div v-for="item in items" :key="item" class="inventory-item"><span>{{ itemIcons[item] }}</span><strong>{{ ITEMS[item].name }}</strong><b>× {{ c.inventory[item] }}</b><button v-if="item === 'sword' || item === 'armor'" :disabled="!c.inventory[item]" @click="game.act(() => equip(game.state, item as 'sword' | 'armor'))">{{ c.equipment.weapon === item || c.equipment.armor === item ? '卸下' : '裝備' }}</button><button v-else-if="item === 'potion'" :disabled="!c.inventory.potion || !c.isAlive" @click="game.act(() => game.state.combat ? combatTurn(game.state, 'potion') : usePotion(game.state))">使用 · +45 HP</button></div></div><p class="muted">出售素材請前往雜貨店；購買裝備請前往村莊的鐵匠鋪。</p><button @click="go(BUILDINGS.store.position)">步行前往雜貨店</button></section>

        <section v-if="view === 'journal'" class="detail-panel journal"><h2>今天，想怎麼過？</h2><div v-for="entry in [{ title: '過一點平凡日子', text: '到東方農田整地、播種，兩日後收割。到森林伐木或礦場採礦，再把素材賣給雜貨店。', icon: '🌾' }, { title: '出門看看', text: '步行進入迷霧山谷，尋找廢棄礦坑。帶足藥水，找同行者，再挑戰更危險的地方。', icon: '🧭' }, { title: '聽聽世界的聲音', text: '居民每天上班與休息。聚落會自己成長，森林的怪物也會聚集。你的選擇不是世界唯一的故事。', icon: '🌲' }]" :key="entry.title" class="journal-entry"><span>{{ entry.icon }}</span><div><h3>{{ entry.title }}</h3><p>{{ entry.text }}</p></div></div><h3>讓時間往前走</h3><div class="action-buttons"><button @click="wait(1440)">等待 1 日</button><button @click="wait(CONFIG.daysPerSeason * 1440)">度過一季</button><button @click="wait(CONFIG.daysPerSeason * 4 * 1440)">度過一年</button></div><p class="muted">時間會影響所有人。田地成熟、契約到期、居民衰老，森林威脅也會成長。等待期間不會自動恢復生命與體力。</p><h3>你的同行者 · {{ game.state.party.length }} / 2</h3><p v-if="!game.state.party.length">目前獨自旅行。橡谷成長為村莊後，去酒館找找夥伴。</p><div v-for="p in game.state.party" :key="p.npcId" class="journal-entry"><span>⚔️</span><div>{{ residents.find(n => n.id === p.npcId)?.name }}<p>{{ p.archetype === 'healer' ? '生命不足時協助治療' : '戰鬥中自動攻擊並掩護你' }} · 契約至 {{ clockLabel(p.contractEnd) }}</p></div></div></section>

        <section v-if="view === 'history'" class="detail-panel"><h2>世界會記得</h2><p class="muted">{{ game.state.history.length }} 個重要時刻，顯示最近 100 筆。</p><ol class="history-list"><li v-for="event in game.state.history.slice(-100).reverse()" :key="event.id"><time>{{ clockLabel(event.at) }}</time><p>{{ event.message }}</p></li></ol></section>

        <section class="event-panel"><div class="section-heading"><h2>世界的聲音 <span class="live-dot"></span></h2><small>持續發生的日常</small></div><div class="event-filters"><button v-for="f in filters" :key="f.id" :class="{ selected: filter === f.id }" :aria-pressed="filter === f.id" @click="filter = f.id">{{ f.label }}</button></div><div class="event-list"><p v-if="!logs.length" class="muted">這個分類還沒有事件，世界正在前進。</p><div v-for="event in logs" :key="event.id" class="event" :class="event.category"><time>{{ clockLabel(event.at) }}</time><span class="event-dot"></span><p>{{ event.message }}</p></div></div></section>
      </main>

      <aside class="inspector" aria-label="角色與世界狀態">
        <section class="player-panel"><div class="player-title"><span class="portrait">🙂</span><div><h2>{{ c.name }}</h2><small>{{ c.age }} 歲 · {{ lifeStages[c.lifeStage] }}</small></div><b>Lv.{{ c.level }}</b></div><div class="meter-label"><span>生命</span><strong>{{ c.hp }} <small>/ {{ c.maxHp }}</small></strong></div><progress aria-label="主角生命" class="hp" :value="c.hp" :max="c.maxHp" /><div class="meter-label"><span>體力</span><strong>{{ c.stamina }} <small>/ {{ c.maxStamina }}</small></strong></div><progress aria-label="主角體力" class="stamina" :value="c.stamina" :max="c.maxStamina" /><div class="player-wallet"><span>🪙 {{ c.gold }} <small>金幣</small></span><span>同行 {{ game.state.party.length }} / 2</span></div><div class="equipment-line"><span>{{ c.equipment.weapon ? '⚔️ 鐵劍' : '徒手' }}</span><span>{{ c.equipment.armor ? '🦺 皮甲' : '便服' }}</span></div></section>
        <section class="settlement-panel"><div class="section-heading"><h2>{{ game.state.settlement.name }}</h2><span class="stage-badge">{{ stages[game.state.settlement.stage] }}</span></div><div class="population"><strong>{{ population(game.state) }}</strong><span>位居民<small>容量 {{ game.state.settlement.capacity }}</small></span><span>🏘️</span></div><div v-for="stat in [{ key: 'food' as const, label: '糧食', color: 'food' }, { key: 'prosperity' as const, label: '繁榮', color: 'prosperity' }, { key: 'safety' as const, label: '安全', color: 'safety' }]" :key="stat.key" class="settlement-stat"><span>{{ stat.label }}</span><progress :aria-label="stat.label" :class="stat.color" :value="game.state.settlement[stat.key]" max="100" /><b>{{ Math.round(game.state.settlement[stat.key]) }}</b></div><div class="buildings-line"><span v-for="b in game.state.settlement.buildings" :key="b" :title="BUILDINGS[b].name">{{ buildingIcons[b] }}</span></div><p class="muted small-note">居民的工作會讓聚落自然成長。</p><button class="people-toggle" @click="showPeople = !showPeople">{{ showPeople ? '收起居民日常' : '看看居民在做什麼' }} {{ showPeople ? '−' : '+' }}</button><div v-if="showPeople" class="people-list"><div v-for="npc in residents" :key="npc.id"><span>{{ jobIcons[npc.job] }}</span><div><strong>{{ npc.name }}</strong><small>{{ npc.age }} 歲 · {{ JOBS[npc.job].name }} · {{ activities[npc.currentActivity] }}</small></div></div></div></section>
        <section class="threat-panel"><div class="section-heading"><h2>北方森林</h2><span class="threat-badge">威脅 {{ game.state.threat.threatLevel }}</span></div><div class="threat-bars"><i v-for="i in 5" :key="i" :class="{ filled: i <= game.state.threat.threatLevel }"></i></div><p>👺 哥布林營地 <b>Lv.{{ game.state.threat.campLevel }}</b></p><p>怪物數量 <b>{{ Math.round(game.state.threat.monsterPopulation) }}</b></p><p v-if="game.state.threat.bossAlive" class="boss-warning">👹 酋長已出現，商路受阻。</p><p v-else class="threat-hint">{{ game.state.threat.bossProgress >= 75 ? '商人回報北方道路遇襲。' : game.state.threat.bossProgress >= 35 ? '樵夫注意到怪物開始聚集。' : '林間仍然平靜，但怪物正在聚集。' }}</p><div class="dungeon-threat"><span>🕳️ {{ game.state.dungeon.discovered ? '廢棄礦坑' : '尚未發現的礦坑' }}</span><b>Lv.{{ game.state.dungeon.threat }}</b></div></section>
        <p class="save-status">{{ game.savedAt ? '✓ 世界已存於此瀏覽器' : '自動存檔每 10 秒' }}<br>離線最多延續 8 小時</p>
      </aside>
    </div>
    <div v-if="game.message" class="notice" role="status"><span>{{ game.message }}</span><button aria-label="關閉訊息" @click="game.message = ''">×</button></div>
    <dialog v-if="!c.isAlive" ref="successorDialog" class="successor-overlay" aria-labelledby="successor-title" @cancel.prevent><section><span class="memorial">❧</span><h2 id="successor-title">旅程結束，世界繼續。</h2><p>{{ c.name }} 享年 {{ c.age }} 歲。橡谷的時間與歷史仍在。</p><h3>選擇一位成年居民，接續旅程</h3><div class="successor-list"><button v-for="npc in residents.filter(n => n.age >= 15)" :key="npc.id" @click="game.act(() => chooseSuccessor(game.state, npc.id))">{{ jobIcons[npc.job] }} {{ npc.name }} · {{ npc.age }} 歲 · Lv.{{ npc.level }}</button><button v-if="!residents.some(n => n.age >= 15)" @click="wait(15 * 1440)">等待新居民抵達 · 15 日</button></div></section></dialog>
  </div>
</template>
