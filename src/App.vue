<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { BUILDINGS, CONFIG, JOBS, REGIONS } from './data/config'
import type { Position } from './domain/types'
import { calendar, clockLabel } from './engine/calendar'
import { startLoop } from './engine/gameLoop'
import { chooseSuccessor, movePlayer, walkTo } from './engine/simulation'
import { jobIcons, regionIcons } from './presentation/icons'
import { directionFor, interactions, type Interaction, type PlaceId } from './presentation/worldUI'
import { useGameStore } from './stores/gameStore'
import AdventureWindow from './components/AdventureWindow.vue'
import CharacterSheet from './components/CharacterSheet.vue'
import InventoryWindow from './components/InventoryWindow.vue'
import IdentityWindow from './components/IdentityWindow.vue'
import PropertyWindow from './components/PropertyWindow.vue'
import LifeNewsWindow from './components/LifeNewsWindow.vue'
import NpcWindow from './components/NpcWindow.vue'
import PixelMeter from './components/PixelMeter.vue'
import PixelWindow from './components/PixelWindow.vue'
import PlaceWindow from './components/PlaceWindow.vue'
import StatusNotice from './components/StatusNotice.vue'
import WorldMap from './components/WorldMap.vue'
import WorldRecords from './components/WorldRecords.vue'

type WindowId = 'menu' | 'character' | 'inventory' | 'log' | 'history' | 'world' | 'notes' | 'interact' | 'place' | 'npc' | 'battle' | 'dungeon' | 'reset' | 'successor' | 'opening' | 'identity' | 'property' | 'news'
const game = useGameStore()
const pane = ref<WindowId | null>(!game.state.life.openingSeen && !game.saveBlocked ? 'opening' : null)
const place = ref<PlaceId>('house')
const selectedNpc = ref('')
const craftedGearFocus = ref<string | null>(null)
const lastSpeed = ref(1)
const c = computed(() => game.character)
const time = computed(() => calendar(game.state.worldTime))
const nearby = computed(() => interactions(game.state))
const prompt = computed(() => !c.value.isAlive ? '接續旅程' : game.state.combat ? '返回戰鬥' : game.state.dungeon.inDungeon ? '繼續探索礦坑' : `${nearby.value[0]?.icon ?? ''} ${nearby.value[0]?.label ?? REGIONS[c.value.currentRegion].name}`)
const titles: Record<WindowId, string> = { menu: '選單', character: '角色', inventory: '物品', log: '世界日誌', history: '世界歷史', world: '地圖與世界', notes: '旅人筆記', interact: '附近的生活', place: '互動', npc: '居民近況', battle: '戰鬥', dungeon: '廢棄礦坑', reset: '重建世界', successor: '這一生結束，世界繼續', opening: '在陌生的天空下', identity: '這一生', property: '住所與產業', news: '地方消息與委託' }
const title = computed(() => pane.value === 'place' ? Object.hasOwn(BUILDINGS, place.value) ? BUILDINGS[place.value as keyof typeof BUILDINGS].name : REGIONS[place.value as keyof typeof REGIONS].name : pane.value ? titles[pane.value] : '世界')
const menus: { id: WindowId; label: string; key?: string }[] = [{ id: 'identity', label: '這一生' }, { id: 'property', label: '住所與產業' }, { id: 'news', label: '地方消息與委託' }, { id: 'character', label: '角色', key: 'C' }, { id: 'inventory', label: '物品', key: 'I' }, { id: 'log', label: '日誌', key: 'L' }, { id: 'world', label: '地圖與世界', key: 'M' }, { id: 'history', label: '世界歷史' }, { id: 'notes', label: '旅人筆記' }]
const records = computed(() => pane.value === 'world' || pane.value === 'log' || pane.value === 'history' || pane.value === 'notes' ? pane.value : null)
const successors = computed(() => game.state.npcs.filter(n => n.isAlive && n.age >= 15)
  .map(npc => ({ id: npc.id, name: npc.name, age: npc.age, job: npc.job, level: npc.level })))
const saveWarning = computed(() => game.saveBlocked ? '原始存檔已保留。現在的世界不會覆蓋它；確認後可從選單重建世界。' : [game.saveError, game.journalError].filter(Boolean).join(' '))
const crisisWarning = computed(() => game.state.regionalCrisis.phase === 'warning'
  ? [...game.state.history].reverse().find(event => event.type === 'regional-crisis.warning') ?? null : null)
function recoverSave() {
  if (game.writerPending) return
  if (!game.writerReady) window.location.reload()
  else if (game.saveBlocked) openWindow('reset')
  else game.save(true)
}
function openWindow(id: WindowId) { if (!game.state.life.openingSeen && !game.saveBlocked) return; if (c.value.isAlive || id === 'successor') pane.value = id }
function closeWindow() { if (c.value.isAlive && pane.value !== 'opening') pane.value = null }
function setSpeed(speed: number) { stop?.flush(); game.setSpeed(speed); if (game.speed) lastSpeed.value = game.speed }
function openNpc(id: string) { selectedNpc.value = id; openWindow('npc') }
function inspectCraftedGear(instanceId: string) { craftedGearFocus.value = instanceId; openWindow('inventory') }
function selectInteraction(target: Interaction) {
  if (target.npcId) openNpc(target.npcId)
  else if (target.place) { place.value = target.place; openWindow('place') }
}
function interact() {
  if (!c.value.isAlive) pane.value = 'successor'
  else if (game.state.combat) openWindow('battle')
  else if (game.state.dungeon.inDungeon) openWindow('dungeon')
  else if (nearby.value[0]) selectInteraction(nearby.value[0])
}
function go(position: Position) {
  closeWindow()
  game.act(() => walkTo(game.state, position))
}
function move(dx: number, dy: number) { game.act(() => movePlayer(game.state, dx, dy)) }
function wait(minutes: number) {
  if (game.state.combat || game.state.dungeon.inDungeon || !c.value.isAlive) { game.message = '請先完成戰鬥或離開礦坑。'; return }
  game.advance(minutes); if (!game.saveError) game.message = '時間繼續前進。聚落與森林都有自己的生活。'
}
function rebuild() { stop?.flush(); game.reset(); pane.value = 'opening' }
function beginLife() { stop?.flush(); if (game.startLife()) pane.value = null }
function keydown(event: KeyboardEvent) {
  const target = event.target
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable))) return
  if (event.key === 'Escape') {
    if (!pane.value) { event.preventDefault(); openWindow('menu') }
    return // An open PixelWindow owns Escape and its cancel behavior.
  }
  if (pane.value && pane.value !== 'menu') return
  const shortcut: Record<string, WindowId> = { c: 'character', i: 'inventory', l: 'log', m: 'world' }
  const destination = shortcut[event.key.toLowerCase()]
  if (destination) { event.preventDefault(); openWindow(destination); return }
  if (pane.value) return
  const direction = directionFor(event.key)
  if (direction) { event.preventDefault(); move(direction.x, direction.y) }
  else if (event.key === 'Enter' && !(target instanceof HTMLElement && target.closest('button, a'))) { event.preventDefault(); interact() }
}
watch(() => [game.writerReady, c.value.isAlive, !!game.state.combat, game.state.dungeon.inDungeon, game.state.life.openingSeen], ([ready, alive, battle, dungeon, openingSeen]) => {
  if (!ready) return
  if (!alive) pane.value = 'successor'
  else if (battle) pane.value = 'battle'
  else if (dungeon) pane.value = 'dungeon'
  else if (!openingSeen && !game.saveBlocked) pane.value = 'opening'
  else if (pane.value && ['battle', 'dungeon', 'successor', 'opening'].includes(pane.value)) pane.value = null
}, { immediate: true })
watch(title, value => document.title = `${value} — 橡谷`, { immediate: true })
let stop: ReturnType<typeof startLoop> | undefined
const saveOnHide = () => { stop?.flush(); if (document.hidden) game.save() }
const saveOnExit = () => { stop?.flush(); game.save() }
onMounted(() => {
  stop = startLoop(game.advance, () => game.speed, () => game.save())
  window.addEventListener('keydown', keydown)
  window.addEventListener('pagehide', saveOnExit)
  document.addEventListener('visibilitychange', saveOnHide)
})
onUnmounted(() => {
  stop?.(); window.removeEventListener('keydown', keydown); window.removeEventListener('pagehide', saveOnExit); document.removeEventListener('visibilitychange', saveOnHide)
})
</script>

<template>
  <div class="game-shell">
    <header class="time-hud">
      <span class="game-name">橡谷 <small>持續演化的世界</small></span>
      <div class="world-clock"><span>第 {{ time.year }} 年 {{ CONFIG.seasons[time.season] }} {{ time.day }} 日</span><strong>{{ String(time.hour).padStart(2, '0') }}:{{ String(time.minute).padStart(2, '0') }}</strong></div>
      <div class="speed-controls" role="group" aria-label="世界時間速度"><button v-for="speed in [0, 1, 5, 20]" :key="speed" :aria-pressed="game.speed === speed" :class="{ selected: game.speed === speed }" @click="setSpeed(speed)">{{ speed ? `×${speed}` : '暫停' }}</button></div>
      <button class="save-button" @click="game.save(true)">存檔</button>
      <button class="menu-trigger" @click="openWindow('menu')">選單 <kbd>Esc</kbd></button>
    </header>
    <main class="world-stage" aria-label="探索世界">
      <div v-if="!pane && (saveWarning || game.message)" class="world-notices">
        <div v-if="saveWarning" class="save-warning" role="alert"><span>{{ saveWarning }}</span><button :disabled="game.writerPending" @click="recoverSave">{{ game.writerPending ? '確認中' : !game.writerReady ? '重新整理' : game.saveBlocked ? '查看重建選項' : '重試存檔' }}</button></div>
        <StatusNotice :message="game.message" @dismiss="game.message = ''" />
      </div>
      <div class="world-caption"><span>{{ regionIcons[c.currentRegion] }} {{ REGIONS[c.currentRegion].name }} <small>{{ c.position.x }}, {{ c.position.y }}</small></span><span class="world-condition">{{ game.state.threat.bossAlive ? '北方傳來酋長出沒的消息' : game.speed ? '世界正在流動' : '時間已暫停' }}</span></div>
      <section class="world-frame" :class="{ 'boss-present': game.state.threat.bossAlive }" aria-label="橡谷與周邊">
        <WorldMap @travel="go" />

        <div class="context-prompt"><button class="context-action primary" @click="interact"><span>{{ prompt }}</span><span><kbd>Enter</kbd> {{ game.state.combat || game.state.dungeon.inDungeon ? '繼續' : '互動' }}</span></button><button v-if="nearby.length > 1" class="nearby-trigger" @click="openWindow('interact')">附近還有 {{ nearby.length - 1 }} 個互動 ›</button></div>
        <div class="direction-pad" role="group" aria-label="移動方向"><button class="up" aria-label="往上" :disabled="!!game.state.combat || game.state.dungeon.inDungeon || !c.isAlive" @click="move(0, -1)">↑</button><button class="left" aria-label="往左" :disabled="!!game.state.combat || game.state.dungeon.inDungeon || !c.isAlive" @click="move(-1, 0)">←</button><button class="down" aria-label="往下" :disabled="!!game.state.combat || game.state.dungeon.inDungeon || !c.isAlive" @click="move(0, 1)">↓</button><button class="right" aria-label="往右" :disabled="!!game.state.combat || game.state.dungeon.inDungeon || !c.isAlive" @click="move(1, 0)">→</button></div>
      </section>
      <div class="exploration-hint"><span><kbd>WASD</kbd>／方向鍵移動　<kbd>Enter</kbd> 互動　點地圖步行</span><button @click="openWindow('world')">查看地圖 <kbd>M</kbd></button></div>
    </main>
    <footer class="player-hud" aria-label="主角狀態"><button class="player-identity" @click="openWindow('character')"><span aria-hidden="true">🙂</span><span>{{ c.name }} <b>Lv.{{ c.level }}</b></span></button><PixelMeter label="生命" :value="c.hp" :max="c.maxHp" compact /><PixelMeter label="體力" :value="c.stamina" :max="c.maxStamina" compact /><span class="gold">🪙 {{ c.gold }}</span><span v-if="game.state.party.length" class="party-strip">同行 {{ game.state.party.map(p => game.state.npcs.find(n => n.id === p.npcId)?.name).join('、') }}</span></footer>
    <div class="world-bottom"><button class="recent-event" :class="{ 'crisis-warning-event': !!crisisWarning }" @click="openWindow('log')"><span v-if="crisisWarning" class="warning-label">危機警訊</span><span aria-hidden="true">›</span> {{ crisisWarning?.message ?? game.state.events.at(-1)?.message ?? '今天，想去哪裡？' }} <kbd>L</kbd></button><span class="desktop-shortcuts"><button @click="openWindow('inventory')">物品 <kbd>I</kbd></button><button @click="openWindow('notes')">旅人筆記</button></span></div>
    <nav class="mobile-nav" aria-label="遊戲選單"><button @click="openWindow('world')">地圖</button><button @click="openWindow('character')">角色</button><button @click="openWindow('inventory')">物品</button><button @click="openWindow('log')">日誌</button></nav>

    <PixelWindow v-if="pane" :title="title" :dismissible="pane !== 'successor' && pane !== 'opening'" @close="closeWindow">
      <div v-if="pane === 'menu'" class="pixel-menu"><p class="muted">世界正在你的身後繼續生活。</p><button v-for="menu in menus" :key="menu.id" :aria-label="menu.label" @click="openWindow(menu.id)"><span>{{ menu.label }}</span><kbd v-if="menu.key">{{ menu.key }}</kbd></button><button @click="game.save(true)">儲存世界 <small>{{ game.savedAt ? '已存於此瀏覽器 · 操作後立即保存' : '每次操作自動存檔' }}</small></button><button @click="game.exportJournal()">匯出遊玩紀錄 <small>{{ game.pendingRecords ? `待補寫 ${game.pendingRecords} 筆` : '紀錄只能追加' }}</small></button><button class="danger reset-trigger" @click="openWindow('reset')">重建世界</button></div>
      <section v-else-if="pane === 'opening'" class="life-opening"><p>你醒了過來。</p><p>陌生的天空，陌生的土地。</p><p>你記得另一個地方、另一段人生。但那已經結束了。</p><p>遠方似乎有炊煙。你得先想辦法活下去。</p><button class="primary" data-autofocus :disabled="!game.writerReady" @click="beginLife">起身</button></section>
      <IdentityWindow v-else-if="pane === 'identity'" />
      <PropertyWindow v-else-if="pane === 'property'" @travel="go" />
      <LifeNewsWindow v-else-if="pane === 'news'" @travel="go" />
      <CharacterSheet v-else-if="pane === 'character'" />
      <InventoryWindow v-else-if="pane === 'inventory'" :focus-instance-id="craftedGearFocus" @focus-consumed="craftedGearFocus = null" />
      <WorldRecords v-else-if="records" :kind="records" @travel="go" @npc="openNpc" @wait="wait" />
      <div v-else-if="pane === 'interact'" class="interaction-list"><p class="muted">你附近的人與地方。選一個，看看能做什麼。</p><button v-for="target in nearby" :key="target.id" @click="selectInteraction(target)">{{ target.icon }} {{ target.label }} <span aria-hidden="true">›</span></button><p v-if="!nearby.length" class="empty-state">目前沒有附近互動。請先完成戰鬥或接續旅程。</p></div>
      <PlaceWindow v-else-if="pane === 'place'" :place="place" @inspect-gear="inspectCraftedGear" />
      <NpcWindow v-else-if="pane === 'npc'" :npc-id="selectedNpc" @travel="go" />
      <AdventureWindow v-else-if="pane === 'battle' || pane === 'dungeon'" />
      <section v-else-if="pane === 'reset'"><h3>從頭開始一個世界？</h3><p class="help-text">目前世界的角色、田地、同行者與世界歷史會重新開始。已累積的遊玩紀錄會保留，可匯出查看；進度無法回退。</p><div class="action-buttons"><button class="primary" data-autofocus @click="closeWindow">保留目前世界</button><button class="danger" @click="rebuild">覆蓋存檔並重建世界</button></div></section>
      <section v-else-if="pane === 'successor'"><p class="memorial" aria-hidden="true">─── ◇ ───</p><p>{{ c.name }} 享年 {{ c.age }} 歲。這段人生已經結束；橡谷與他留下的痕跡仍在。</p><p class="muted">接續的是這個世界已有的成年居民，不是再次轉生。</p><h3 class="section-title">選一位居民，接續旅程</h3><div class="successor-list"><button v-for="npc in successors" :key="npc.id" @click="game.act(() => chooseSuccessor(game.state, npc.id))">{{ jobIcons[npc.job] }} {{ npc.name }} · {{ npc.age }} 歲 · {{ JOBS[npc.job].name }} · Lv.{{ npc.level }}</button><button v-if="!successors.length" @click="game.advance(15 * 1440)">等待新居民抵達 · 15 日</button></div></section>

      <template #footer>
        <p v-if="saveWarning" class="inline-warning" role="alert">{{ saveWarning }}<button v-if="!game.writerReady" :disabled="game.writerPending" @click="recoverSave">{{ game.writerPending ? '確認中' : '重新整理' }}</button></p>
        <StatusNotice :message="game.message" @dismiss="game.message = ''" />
        <div class="window-world-status"><small>{{ clockLabel(game.state.worldTime) }} · 生命 {{ c.hp }} · 體力 {{ c.stamina }} · {{ c.gold }} 金</small><button :aria-pressed="game.speed === 0" @click="setSpeed(game.speed ? 0 : lastSpeed)">{{ game.speed ? '暫停時間' : '繼續時間' }}</button></div>
      </template>
    </PixelWindow>
  </div>
</template>
