<script setup lang="ts">
import { computed } from 'vue'
import { BUILDINGS, CONFIG, DUNGEON, ITEMS, REGIONS } from '../data/config'
import type { ItemId } from '../domain/types'
import { canVisit, encounter, enterDungeon, farm, gather, hire, rest, trade } from '../engine/actions'
import { distance, stageIndex } from '../engine/simulation'
import { buildingIcons, itemIcons } from '../presentation/icons'
import type { PlaceId } from '../presentation/worldUI'
import { useGameStore } from '../stores/gameStore'
import PixelMeter from './PixelMeter.vue'

const props = defineProps<{ place: PlaceId }>()
const game = useGameStore()
const c = computed(() => game.character)
const shop = computed(() => props.place === 'store' || props.place === 'blacksmith' ? props.place : null)
const products = computed(() => (Object.keys(ITEMS) as ItemId[]).filter(i => props.place === 'blacksmith' ? ['sword', 'armor'].includes(i) : !['sword', 'armor'].includes(i)))
const mercenaries = computed(() => game.state.npcs.filter(n => n.isAlive && n.job === 'mercenary' && n.age >= 15 && !game.state.party.some(p => p.npcId === n.id)))
const blocked = computed(() => !c.value.isAlive || !!game.state.combat || game.state.dungeon.inDungeon)
const price = (item: ItemId) => Math.ceil(ITEMS[item].price * (stageIndex(game.state) === 2 ? .8 : 1))
const canSell = (item: ItemId) => c.value.inventory[item] > (c.value.equipment.weapon === item || c.value.equipment.armor === item ? 1 : 0)
const rumor = computed(() => game.state.threat.bossAlive ? '北方出現了哥布林酋長，商人都不敢出門了。' : game.state.threat.threatLevel >= 2 ? '森林裡的腳步聲愈來愈多，出門記得找個伴。' : '最近林子還算安靜。聽說山谷裡藏著一座舊礦坑。')
</script>

<template>
  <template v-if="place === 'farm'">
    <p class="scene-description">🌾 東方農田 · 今天種下的，兩日後收穫。</p>
    <div class="plot-row"><section v-for="i in CONFIG.maxPlots" :key="i" class="plot">
      <span aria-hidden="true">{{ game.state.crops[i - 1] ? game.state.crops[i - 1]!.status === 'mature' ? '🌾' : '🌱' : i <= game.state.crops.length + game.state.preparedPlots ? '▤' : '≋' }}</span>
      <h3>田 {{ i }}</h3><p>{{ game.state.crops[i - 1] ? game.state.crops[i - 1]!.status === 'mature' ? '可收割' : `剩 ${Math.max(0, Math.ceil((game.state.crops[i - 1]!.matureAt - game.state.worldTime) / 60))} 小時` : i <= game.state.crops.length + game.state.preparedPlots ? '已整地' : '未整地' }}</p>
      <PixelMeter v-if="game.state.crops[i - 1]" :label="`田 ${i} 生長`" :value="Math.min(100, (game.state.worldTime - game.state.crops[i - 1]!.plantedAt) / game.state.crops[i - 1]!.growthDuration * 100)" :max="100" compact />
    </section></div>
    <div class="action-buttons"><button :disabled="blocked || c.stamina < 6 || game.state.crops.length + game.state.preparedPlots >= CONFIG.maxPlots" @click="game.act(() => farm(game.state, 'prepare'))">整地 · 體力 6／20 分</button><button :disabled="blocked || c.stamina < 4 || !game.state.preparedPlots" @click="game.act(() => farm(game.state, 'plant'))">播種 · 體力 4／10 分</button><button class="primary" :disabled="blocked || c.stamina < 4 || !game.state.crops.some(p => p.status === 'mature')" @click="game.act(() => farm(game.state, 'harvest'))">收割 · 體力 4／15 分</button></div>
    <p class="muted help-text">先整地，再播種。未成熟時可到別處生活；世界時間會讓小麥成長。體力不足時回聚落休息。</p>
  </template>
  <template v-else-if="place === 'forest' || place === 'mine'">
    <div class="scene-illustration" aria-hidden="true">{{ place === 'forest' ? '🌲　🌲　♣　🌲　🌲' : '▲　⛰️　▲　🪨　▲' }}</div>
    <p class="scene-description">{{ REGIONS[place].name }} · 資源餘量 {{ Math.floor(game.state.regions[place].remainingAmount) }}</p>
    <p class="muted">採集花費 10 體力，獲得素材與 4 金幣；資源每日恢復。</p>
    <div class="action-buttons"><button v-for="kind in place === 'forest' ? ['wood' as const] : ['stone' as const, 'iron' as const]" :key="kind" :disabled="blocked || c.stamina < 10 || game.state.regions[place].remainingAmount < 2 + Math.floor((c.skills[place === 'forest' ? 'woodcutting' : 'mining'].level - 1) / 2)" @click="game.act(() => gather(game.state, kind))">{{ itemIcons[kind] }} {{ kind === 'wood' ? '伐木' : kind === 'stone' ? '採石' : '採鐵礦' }}</button>
      <button v-if="place === 'forest'" class="primary" :disabled="blocked || c.stamina < 8 || game.state.threat.monsterPopulation < 1" @click="game.act(() => encounter(game.state))">尋找怪物 · 體力 8</button>
      <button v-if="place === 'forest' && game.state.threat.bossAlive" class="danger" :disabled="blocked || c.stamina < 8" @click="game.act(() => encounter(game.state, true))">👹 挑戰哥布林酋長</button>
    </div>
    <p v-if="place === 'forest'" class="rumor">{{ rumor }}</p>
  </template>
  <template v-else-if="place === 'unknown'">
    <div class="scene-illustration" aria-hidden="true">▲　░　🕳️　░　▲</div>
    <p>{{ game.state.dungeon.discovered ? '迷霧散開，山谷裡有一座廢棄礦坑。' : '山谷仍在迷霧中，走進去看看。' }}</p>
    <p class="muted help-text">入口 {{ DUNGEON.position.x }}, {{ DUNGEON.position.y }} · 普通怪、精英、守衛首領，三段探索。</p>
    <button class="primary" :disabled="blocked || !game.state.dungeon.discovered || distance(c.position, DUNGEON.position) > 1 || c.stamina < 5" @click="game.act(() => enterDungeon(game.state))">進入廢棄礦坑 · 體力 5</button>
    <p class="muted help-text">靠近入口才能進入。準備藥水與同行者，再挑戰深處。</p>
  </template>
  <template v-else-if="shop">
    <p class="scene-description">{{ buildingIcons[shop] }} {{ BUILDINGS[shop].name }} · {{ BUILDINGS[shop].opens }}:00–{{ BUILDINGS[shop].closes }}:00</p>
    <p v-if="!canVisit(game.state, shop)" class="inline-warning">現在無法交易。請在營業時間靠近店門。</p>
    <p v-else class="muted">{{ stageIndex(game.state) === 2 ? '城鎮商品享八折優惠。' : '歡迎光臨，買賣每次花費 5 分鐘。' }}</p>
    <div class="shop-list"><div v-for="item in products" :key="item" class="shop-item"><div>{{ itemIcons[item] }} {{ ITEMS[item].name }}<small>持有 {{ c.inventory[item] }}{{ ITEMS[item].minStage > stageIndex(game.state) ? ' · 村莊解鎖' : '' }}</small></div><button :disabled="!canVisit(game.state, shop) || c.gold < price(item) || stageIndex(game.state) < ITEMS[item].minStage" @click="game.act(() => trade(game.state, item, true))">買 {{ price(item) }} 金</button><button :disabled="!canVisit(game.state, shop) || !canSell(item)" @click="game.act(() => trade(game.state, item, false))">賣 {{ ITEMS[item].sell }} 金</button></div></div>
    <p class="muted help-text">金幣不足時無法購買；穿戴中的裝備請先在物品視窗卸下再出售。</p>
  </template>
  <template v-else-if="place === 'tavern'">
    <p class="scene-description">🍺 酒館 · 17:00–24:00</p><p class="rumor">「{{ rumor }}」</p>
    <p v-if="!canVisit(game.state, 'tavern')" class="inline-warning">尚未營業或離店門太遠。傍晚再來坐坐。</p>
    <button :disabled="!canVisit(game.state, 'tavern') || c.gold < 3" @click="game.act(() => rest(game.state, 'tavern'))">喝一杯、歇歇腳 · 3 金／1 小時</button>
    <h3 class="section-title">找一位同行者 · {{ game.state.party.length }}/2</h3><p class="muted">契約 3 日、日薪 4 金；聘金 {{ 20 + stageIndex(game.state) * 5 }} 金。最多兩名同行者，休養中的傭兵無法加入。</p>
    <p v-if="!mercenaries.length" class="empty-state">今天沒有可聘請的傭兵。</p>
    <div v-for="npc in mercenaries" :key="npc.id" class="mercenary"><div>⚔️ {{ npc.name }}<small>{{ npc.age }} 歲 · Lv.{{ npc.level }} · {{ npc.injuredUntil > game.state.worldTime ? '休養中' : '可同行' }}</small></div><button :disabled="!canVisit(game.state, 'tavern') || game.state.party.length >= 2 || npc.injuredUntil > game.state.worldTime || c.gold < 20 + stageIndex(game.state) * 5" @click="game.act(() => hire(game.state, npc.id))">聘請</button></div>
  </template>
  <template v-else-if="place === 'inn'">
    <div class="scene-illustration" aria-hidden="true">┌─┐　🛏️　┌─┐</div><p>旅店隨時營業。睡一晚，恢復生命與體力。</p>
    <div class="action-buttons"><button class="primary" :disabled="!canVisit(game.state, 'inn') || c.gold < 8" @click="game.act(() => rest(game.state, 'inn'))">住宿 · 8 金／8 小時</button></div>
  </template>
  <template v-else>
    <div class="scene-illustration" aria-hidden="true">{{ place === 'house' ? '┌──┐　🏠　┌──┐' : '🏠　━━　🏪　━━　🏠' }}</div>
    <p>{{ place === 'house' ? '回到家了，歇一會兒吧。' : '橡谷有自己的日常。居民工作，聚落也慢慢成長。' }}</p>
    <div class="action-buttons"><button class="primary" :disabled="blocked || c.currentRegion !== 'village'" @click="game.act(() => rest(game.state, 'rest'))">休息 · 1 小時</button></div><p class="muted help-text">恢復 15 生命與 35 體力，不花金幣。時間會繼續前進。</p>
  </template>
</template>
