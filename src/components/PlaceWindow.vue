<script setup lang="ts">
import { computed, ref } from 'vue'
import { BUILDINGS, CONFIG, DUNGEON, ITEMS, REGIONS } from '../data/config'
import { CRAFTING_RECIPES } from '../data/crafting'
import { ITEM_BASES, MATERIALS, RARITIES } from '../data/rewards'
import type { MaterialId, MonsterDefinitionId, RarityId } from '../domain/reward'
import type { ItemId } from '../domain/types'
import { buyPrice, canVisit, encounter, enterDungeon, farm, gather, hire, hireTerms, rest, trade, startRegionalCampRaid } from '../engine/actions'
import { wolfRewardExpectation } from '../engine/itemGeneration'
import { npcCanWork } from '../engine/npcLife'
import { encounterWolf, wolfEncounterOptions } from '../engine/wolfFamily'
import { craft, type CraftResult } from '../engine/crafting'
import { distance, stageIndex } from '../engine/simulation'
import { buildingIcons, itemIcons, materialIcons } from '../presentation/icons'
import { projectCrafting } from '../presentation/craftingProjection'
import type { PlaceId } from '../presentation/worldUI'
import { useGameStore } from '../stores/gameStore'
import PixelMeter from './PixelMeter.vue'

const props = defineProps<{ place: PlaceId }>()
const emit = defineEmits<{ (event: 'inspect-gear', instanceId: string): void }>()
const game = useGameStore()
const c = computed(() => game.character)
const shop = computed(() => props.place === 'store' || props.place === 'blacksmith' ? props.place : null)
const workbenchPlace = computed(() => shop.value !== null || props.place === 'house')
const selectedRecipeId = ref<keyof typeof CRAFTING_RECIPES>('starterSpear')
const selectedInfluenceMaterial = ref<MaterialId | null>(null)
const crafting = computed(() => workbenchPlace.value ? projectCrafting(game.state, selectedRecipeId.value, selectedInfluenceMaterial.value) : null)
const craftingPlan = computed(() => crafting.value?.plan ?? null)
const lastCraftResult = ref<Extract<CraftResult, { ok: true }> | null>(null)
const products = computed(() => (Object.keys(ITEMS) as ItemId[]).filter(i => props.place === 'blacksmith' ? ['sword', 'armor'].includes(i) : !['sword', 'armor'].includes(i)))
const mercenaries = computed(() => game.state.npcs.filter(n => n.job === 'mercenary' && npcCanWork(game.state, n.id) && !game.state.party.some(p => p.npcId === n.id))
  .map(npc => ({ id: npc.id, name: npc.name, age: npc.age, level: npc.level, injuredUntil: npc.injuredUntil })))
const terms = computed(() => hireTerms(game.state))
const blocked = computed(() => !c.value.isAlive || !!game.state.combat || game.state.dungeon.inDungeon)
const price = (item: ItemId) => buyPrice(game.state, item)
const hourLabel = (hour: number | null) => hour === null ? '—' : `${String(hour).padStart(2, '0')}:00`
function chooseRecipe(recipeId: keyof typeof CRAFTING_RECIPES) {
  selectedRecipeId.value = recipeId
  if (selectedInfluenceMaterial.value && !CRAFTING_RECIPES[recipeId].allowedBiasMaterials.includes(selectedInfluenceMaterial.value)) {
    selectedInfluenceMaterial.value = null
  }
  lastCraftResult.value = null
}
function chooseInfluenceMaterial(material: MaterialId | null) {
  selectedInfluenceMaterial.value = material
  lastCraftResult.value = null
}
function craftSelectedRecipe() {
  const result = game.act(() => craft(game.state, {
    recipeId: selectedRecipeId.value,
    influenceMaterial: selectedInfluenceMaterial.value,
  }), {
    message: result => result.ok
      ? `${result.masterpiece ? '鍛造傑作完成' : '製作完成'}：${ITEM_BASES[result.baseId].name}。`
      : result.message,
    succeeded: result => result.ok,
  })
  lastCraftResult.value = result?.ok ? result : null
}
const canSell = (item: ItemId) => c.value.inventory[item] > (c.value.equipment.weapon === item || c.value.equipment.armor === item ? 1 : 0)
const rumor = computed(() => game.state.threat.bossAlive ? '北方出現了哥布林酋長，商人都不敢出門了。' : game.state.threat.threatLevel >= 2 ? '森林裡的腳步聲愈來愈多，出門記得找個伴。' : '最近林子還算安靜。聽說山谷裡藏著一座舊礦坑。')
const wolfOptions = computed(() => props.place === 'forest' ? wolfEncounterOptions(game.state) : [])
const wolfExpectations = computed(() => Object.fromEntries(wolfOptions.value.map(option => [option.definitionId, wolfRewardExpectation(option.definitionId)])))
const adventureGoal = computed(() => {
  const defeated = new Set(game.state.reward.collection.defeated)
  const nextUndiscovered = wolfOptions.value.find(option => !defeated.has(option.definitionId))
  if (nextUndiscovered) return nextUndiscovered.eligible
    ? `追蹤${nextUndiscovered.label}，繼續認識北林狼族。`
    : nextUndiscovered.reason ?? `先完成前一段狼族追蹤，再尋找${nextUndiscovered.label}。`

  const boss = wolfOptions.value.find(option => option.rank === 'boss')
  if (boss?.eligible) return `再次挑戰${boss.label}，尋找首領限定裝備與不同變種。`
  const elite = wolfOptions.value.find(option => option.definitionId === 'alphaWolf')
  if (elite?.eligible) return `追蹤${elite.label}，比較高品質裝備與不同詞綴用途。`
  return boss?.reason ?? wolfOptions.value.find(option => option.reason)?.reason ?? '狼族蹤跡暫時中斷；探索北方森林，等待新的線索。'
})
const percent = (value: number) => new Intl.NumberFormat('zh-TW', { style: 'percent', maximumFractionDigits: 1 }).format(value)
function rewardExpectationText(definitionId: MonsterDefinitionId) {
  const expectation = wolfExpectations.value[definitionId]
  const rarities = (Object.entries(expectation.rarityChances) as [RarityId, number][])
    .filter(([, chance]) => chance > 0).map(([id, chance]) => `${RARITIES[id].name} ${percent(chance)}`).join('、')
  const guaranteed = (Object.entries(expectation.guaranteedMaterials) as [MaterialId, number][])
    .map(([id, amount]) => `${MATERIALS[id].name} ×${amount}`).join('、') || '無'
  const chance = (Object.entries(expectation.chanceMaterials) as [MaterialId, number][])
    .map(([id, value]) => `${MATERIALS[id].name} ${percent(value)}`).join('、') || '無'
  const exclusive = expectation.exclusiveBase ? ` · 首領限定裝備：${ITEM_BASES[expectation.exclusiveBase].name}` : ''
  return `獵裝 ${percent(expectation.gearChance)} · 掉落 Lv.${expectation.dropLevel} · 品質（掉落裝備時） ${rarities} · 保底 ${guaranteed} · 機率素材 ${chance}${exclusive}`
}
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
      <template v-if="place === 'forest' && (game.state.regionalCrisis.phase === 'warning' || game.state.regionalCrisis.phase === 'preparation' || game.state.regionalCrisis.phase === 'active')">
        <button class="primary" data-camp-raid :disabled="blocked || game.state.regionalCrisis.adventure.campRaidAt !== null" @click="game.act(() => startRegionalCampRaid(game.state, game.state.regionalCrisis.phase === 'dormant' ? '' : game.state.regionalCrisis.id))">{{ game.state.regionalCrisis.adventure.campRaidAt !== null ? '哥布林營地已遭突襲' : '突襲哥布林營地 · 體力 8' }}</button>
        <p class="muted help-text">突襲只在勝利後記錄成果；錯過時機仍可繼續森林生活。世界時間照常流動。</p>
      </template>
    </div>
    <p v-if="place === 'forest'" class="rumor">{{ rumor }}</p>
    <section v-if="place === 'forest'" aria-labelledby="wolf-track-title">
      <h3 id="wolf-track-title" class="section-title">狼族蹤跡</h3>
      <p class="muted help-text">沿著擊退紀錄追蹤更深處的狼群。每次追蹤花費 8 體力；先準備裝備與藥水，再留意戰鬥中的下一回合提示。</p>
      <p class="adventure-goal" data-adventure-goal><strong>下一個冒險目標</strong> · {{ adventureGoal }}</p>
      <div class="wolf-track-list"><div v-for="option in wolfOptions" :key="option.definitionId" class="wolf-track-row" :data-wolf-track="option.definitionId" :data-rank="option.rank"><button :class="{ danger: option.rank === 'boss' }" :disabled="!option.eligible" @click="game.act(() => encounterWolf(game.state, option.definitionId))">{{ option.label }}</button><span v-if="option.reason" class="muted">{{ option.reason }}</span><p class="wolf-track-reward" data-wolf-reward-expectation>{{ rewardExpectationText(option.definitionId) }}</p></div></div>
    </section>
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
    <h3 class="section-title">找一位同行者 · {{ game.state.party.length }}/2</h3><p class="muted">契約 3 日、日薪 4 金；聘金 {{ terms.hireCost }} 金。最多兩名同行者，休養中的傭兵無法加入。</p>
    <p v-if="!terms.eligible" class="inline-warning">傭兵目前不願接受你的委託；先修復與橡谷的信任。</p>
    <p v-if="!mercenaries.length" class="empty-state">今天沒有可聘請的傭兵。</p>
    <div v-for="npc in mercenaries" :key="npc.id" class="mercenary"><div>⚔️ {{ npc.name }}<small>{{ npc.age }} 歲 · Lv.{{ npc.level }} · {{ npc.injuredUntil > game.state.worldTime ? '休養中' : '可同行' }}</small></div><button :disabled="!canVisit(game.state, 'tavern') || game.state.party.length >= 2 || npc.injuredUntil > game.state.worldTime || !terms.eligible || c.gold < terms.hireCost" @click="game.act(() => hire(game.state, npc.id))">聘請</button></div>
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
  <section v-if="crafting && craftingPlan" class="crafting-workbench" aria-labelledby="workbench-title">
    <h3 id="workbench-title" class="section-title">工作台</h3>
    <p class="muted">實際工作台 {{ crafting.stationName }} · 服務時間 {{ hourLabel(crafting.opensAtHour) }}–{{ hourLabel(crafting.closesAtHour) }}。</p>
    <p v-if="place === 'house' && crafting.hasHomeWorkbench" class="muted help-text">在自有住所附近，基礎與進階配方可於家中鍛造並減少服務費；實際站點、時段與費用依下方計畫顯示。高階鐵短劍仍需前往鐵匠鋪。</p>
    <h4 class="crafting-subheading">選擇配方</h4>
    <div class="filter-buttons crafting-recipe-options" role="group" aria-label="選擇鍛造配方">
      <button v-for="recipe in crafting.recipes" :key="recipe.id" :data-craft-recipe="recipe.id"
        :aria-pressed="selectedRecipeId === recipe.id" :class="{ selected: selectedRecipeId === recipe.id }"
        @click="chooseRecipe(recipe.id)">{{ recipe.name }}<small>{{ recipe.unlocked ? `Smithing Lv.${recipe.requiredSmithing} 已解鎖` : `Smithing Lv.${recipe.requiredSmithing} 解鎖` }}</small></button>
    </div>
    <p class="crafting-recipe-name">{{ crafting.recipeName }}</p>
    <h4 class="crafting-subheading">影響素材</h4>
    <p class="muted help-text">素材會消耗 1 份，依選擇調整詞綴權重或條件式特性機率；不保證指定結果。品質機率只依鍛造熟練度能力調整。</p>
    <div class="filter-buttons crafting-material-options" role="group" aria-label="選擇影響素材">
      <button data-crafting-material="none" :aria-pressed="selectedInfluenceMaterial === null" :class="{ selected: selectedInfluenceMaterial === null }" @click="chooseInfluenceMaterial(null)">不使用素材</button>
      <button v-for="option in crafting.influenceMaterials" :key="option.id" :data-crafting-material="option.id" :aria-pressed="selectedInfluenceMaterial === option.id" :class="{ selected: selectedInfluenceMaterial === option.id }" @click="chooseInfluenceMaterial(option.id)">{{ materialIcons[option.id] }} {{ option.name }} · 持有 {{ option.owned }}</button>
    </div>
    <p v-if="!crafting.influenceMaterials.length" class="muted help-text">這項配方沒有影響素材選項。</p>
    <p v-if="crafting.selectedInfluence" class="crafting-influence-copy" data-crafting-influence-copy>{{ crafting.selectedInfluence.influenceText }}</p>
    <dl class="crafting-preview">
      <dt>成品</dt><dd>{{ crafting.outputName }} · {{ crafting.outputSlotName }} · Lv.{{ crafting.outputLevel }}</dd>
      <dt>材料</dt><dd><ul><li v-for="input in crafting.inputs" :key="input.key">{{ input.name }} ×{{ input.required }} <span class="muted">／持有 {{ input.current ?? '—' }}</span></li></ul></dd>
      <dt>費用</dt><dd>{{ craftingPlan.gold.required }} 金 <span class="muted">／持有 {{ craftingPlan.gold.current ?? '—' }}</span></dd>
      <dt>體力與時間</dt><dd>體力 {{ craftingPlan.stamina.required }} <span class="muted">／目前 {{ craftingPlan.stamina.current ?? '—' }}</span> · {{ craftingPlan.durationMinutes }} 分鐘</dd>
      <dt>鍛造熟練度</dt><dd>需求 Lv.{{ craftingPlan.skill.required }} <span class="muted">／目前 Lv.{{ craftingPlan.skill.current ?? '—' }}</span></dd>
      <dt>品質能力</dt><dd>{{ crafting.quality.floorName ? `目前最低品質：${crafting.quality.floorName}` : '目前使用基礎品質權重' }}<span class="muted"> · {{ crafting.quality.weightsText }}</span></dd>
      <dt>成功練習</dt><dd>{{ crafting.practice.graduated ? `本配方已達熟練上限 Lv.${crafting.practice.capLevel}` : `成功後鍛造熟練 +${crafting.practice.xpAward} XP，上限 Lv.${crafting.practice.capLevel}` }}</dd>
    </dl>
    <p v-if="crafting.quality.nextFloorName && crafting.quality.nextFloorAtSmithing" class="muted help-text">下一個品質能力：Smithing Lv.{{ crafting.quality.nextFloorAtSmithing }} 可達最低{{ crafting.quality.nextFloorName }}。</p>
    <p v-if="crafting.practice.nextUnlock" class="muted help-text">下一項配方目標：Smithing Lv.{{ crafting.practice.nextUnlock.requiredSmithing }} 解鎖{{ crafting.practice.nextUnlock.name }}。</p>
    <p v-else-if="craftingPlan.practice.graduated" class="muted help-text">此配方已完成熟練；可製作其他配方或追求更高品質能力。</p>
    <p v-if="!craftingPlan.ok" class="inline-warning" role="status">{{ craftingPlan.message }}</p>
    <button class="primary" data-craft-submit :disabled="!craftingPlan.ok" @click="craftSelectedRecipe">製作{{ crafting.recipeName }}</button>
    <p v-if="lastCraftResult" class="reward-feedback" role="status" aria-live="polite" data-craft-result>
      <strong v-if="lastCraftResult.masterpiece" class="masterpiece-label">鍛造傑作 · </strong>已製作：{{ ITEM_BASES[lastCraftResult.baseId].name }} · <button @click="emit('inspect-gear', lastCraftResult.instanceId)">檢視裝備</button>
    </p>
  </section>
</template>
