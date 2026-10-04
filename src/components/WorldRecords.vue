<script setup lang="ts">
import { computed, ref } from 'vue'
import { BUILDINGS, CONFIG, DUNGEON } from '../data/config'
import type { Category, Position } from '../domain/types'
import { clockLabel } from '../engine/calendar'
import { population } from '../engine/simulation'
import { activities, buildingIcons, jobIcons, stages } from '../presentation/icons'
import { useGameStore } from '../stores/gameStore'
import { projectNpc } from '../presentation/lifeProjection'
import PixelMeter from './PixelMeter.vue'
import WorldMap from './WorldMap.vue'
defineProps<{ kind: 'world' | 'log' | 'history' | 'notes' }>()
const emit = defineEmits<{ travel: [position: Position]; npc: [id: string]; wait: [minutes: number] }>()
const game = useGameStore()
const section = ref('map')
const filter = ref<Category | 'all'>('all')
const filters: { id: Category | 'all'; label: string }[] = [{ id: 'all', label: '全部' }, { id: 'player', label: '自己' }, { id: 'npc', label: '居民' }, { id: 'world', label: '世界' }, { id: 'monster', label: '威脅' }, { id: 'settlement', label: '聚落' }]
const logs = computed(() => game.state.events.filter(e => filter.value === 'all' || e.category === filter.value).slice(-100).reverse())
const people = computed(() => game.state.npcs.filter(n => n.isAlive).map(npc => projectNpc(game.state, npc.id)!))
const northernNews = computed(() => {
  if (game.state.threat.bossAlive) return '哥布林酋長已在北方現身。商路傳來襲擊消息，前往森林前先備妥裝備。'
  if (game.state.threat.threatLevel >= 3) return '北方怪物活動頻繁，居民開始擔心往來商路。'
  if (game.state.threat.threatLevel >= 2) return '樵夫看見林間足跡與營火，北方道路不再讓人安心。'
  return '林間暫時安靜，偶爾仍能看見野狼的蹤跡。'
})
const paths = [{ label: '家', position: BUILDINGS.house.position }, { label: '農田', position: BUILDINGS.farm.position }, { label: '森林', position: { x: 5, y: 4 } }, { label: '礦場', position: { x: 19, y: 5 } }, { label: '探索迷霧', position: DUNGEON.position }]
</script>

<template>
  <template v-if="kind === 'world'">
    <div class="filter-buttons" role="group" aria-label="世界資訊分類"><button v-for="s in [{ id: 'map', label: '地圖' }, { id: 'settlement', label: '聚落' }, { id: 'people', label: '居民' }, { id: 'threat', label: '威脅' }]" :key="s.id" :aria-pressed="section === s.id" :class="{ selected: section === s.id }" @click="section = s.id">{{ s.label }}</button></div>
    <template v-if="section === 'map'"><WorldMap overview @travel="emit('travel', $event)" /><p class="muted help-text">🙂 你 · 職業圖示為居民 · ░ 未探索 · 怪物圖示為區域蹤跡。點圖格或目的地會逐格步行並推進時間。</p><div class="action-buttons"><button v-for="path in paths" :key="path.label" @click="emit('travel', path.position)">前往{{ path.label }}</button></div></template>
    <section v-else-if="section === 'settlement'"><div class="character-heading"><span class="portrait" aria-hidden="true">{{ game.state.settlement.stage === 'town' ? '🏙️' : '🏘️' }}</span><div><h3>{{ game.state.settlement.name }} · {{ stages[game.state.settlement.stage] }}</h3><p>{{ population(game.state) }} 位居民／容量 {{ game.state.settlement.capacity }}</p></div></div><PixelMeter v-for="stat in [{ id: 'food' as const, label: '糧食' }, { id: 'prosperity' as const, label: '繁榮' }, { id: 'safety' as const, label: '安全' }, { id: 'infrastructure' as const, label: '建設' }]" :key="stat.id" :label="stat.label" :value="game.state.settlement[stat.id]" :max="100" /><h3 class="section-title">已有建築</h3><p class="building-list"><span v-for="id in game.state.settlement.buildings" :key="id">{{ buildingIcons[id] }} {{ BUILDINGS[id].name }}</span></p><p class="muted help-text">居民工作讓聚落自然成長。村莊解鎖酒館與鐵匠鋪；城鎮提供商品優惠。</p></section>
    <section v-else-if="section === 'people'"><p class="muted">{{ people.length }} 位居民，各自沿著日程生活。選擇居民查看近況。</p><div class="people-list"><button v-for="npc in people" :key="npc.id" @click="emit('npc', npc.id)"><span>{{ jobIcons[npc.job] }} {{ npc.name }}</span><small>{{ npc.age }} 歲 · {{ activities[npc.currentActivity] }}</small></button></div><p v-if="!people.length" class="empty-state">聚落裡暫時沒有居民。</p></section>
    <section aria-label="北方與山谷近況"><h3>北方森林</h3><p class="rumor">{{ northernNews }}</p><h3 class="section-title">山谷礦坑</h3><p>{{ game.state.dungeon.discovered ? `廢棄礦坑 · 已完成 ${game.state.dungeon.runs} 次探索` : '尚未發現。走入東北方的迷霧，看看山谷裡有什麼。' }}</p></section>
  </template>
  <template v-else-if="kind === 'log'"><div class="filter-buttons" role="group" aria-label="日誌分類"><button v-for="f in filters" :key="f.id" :aria-pressed="filter === f.id" :class="{ selected: filter === f.id }" @click="filter = f.id">{{ f.label }}</button></div><p class="muted">最新 {{ logs.length }} 筆，最多顯示 100 筆。時間為遊戲世界時間。</p><p v-if="!logs.length" class="empty-state">這個分類還沒有事件。世界正在前進。</p><ol class="event-list"><li v-for="event in logs" :key="event.id"><time>{{ clockLabel(event.at) }}</time><p>{{ event.message }}</p></li></ol></template>
  <template v-else-if="kind === 'history'"><p class="muted">世界記得 {{ game.state.history.length }} 個重要時刻，顯示最近 100 筆。時間為遊戲世界時間。</p><p v-if="!game.state.history.length" class="empty-state">還沒有歷史紀錄。你的旅程才剛開始。</p><ol class="event-list history-list"><li v-for="event in game.state.history.slice(-100).reverse()" :key="event.id"><time>{{ clockLabel(event.at) }}</time><p>{{ event.message }}</p></li></ol></template>
  <template v-else><h3>今天，想去哪裡？</h3><p class="help-text">去東方農田種小麥，到森林伐木，或到礦場採石。素材可以賣給雜貨店。也可以走入迷霧山谷，探索廢棄礦坑。</p><p class="muted">這裡沒有每日任務。居民、聚落與怪物會隨自己的時間繼續生活。</p><h3 class="section-title">讓時間往前走</h3><p class="inline-warning">等待不會自動恢復生命與體力。田地會成熟、契約會到期，所有人也會衰老。</p><div class="action-buttons"><button v-for="w in [{ label: '等待 1 日', days: 1 }, { label: '度過一季', days: CONFIG.daysPerSeason }, { label: '度過一年', days: CONFIG.daysPerSeason * 4 }]" :key="w.days" :disabled="!!game.state.combat || game.state.dungeon.inDungeon || !game.character.isAlive" @click="emit('wait', w.days * 1440)">{{ w.label }}</button></div><h3 class="section-title">同行者 · {{ game.state.party.length }}/2</h3><p v-if="!game.state.party.length" class="empty-state">目前獨自旅行。村莊的酒館裡，或許有人願意同行。</p><div v-for="p in game.state.party" :key="p.npcId" class="party-detail"><h4>⚔️ {{ people.find(n => n.id === p.npcId)?.name }}</h4><p>{{ p.archetype === 'healer' ? '生命不足時協助治療' : '戰鬥中攻擊並掩護你' }} · 日薪 {{ p.dailyWage }} 金</p><small>契約至 {{ clockLabel(p.contractEnd) }}</small></div><h3 class="section-title">操作</h3><p class="shortcut-help"><kbd>WASD</kbd>／方向鍵移動 · <kbd>Enter</kbd> 互動 · <kbd>Esc</kbd> 選單<br><kbd>C</kbd> 角色 · <kbd>I</kbd> 物品 · <kbd>L</kbd> 日誌 · <kbd>M</kbd> 地圖</p><p class="muted">開啟視窗後世界時間仍會前進，可隨時用視窗底部按鈕暫停。</p></template>
</template>
