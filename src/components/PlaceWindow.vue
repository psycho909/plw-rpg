<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { BUILDINGS, CONFIG, DUNGEON, ITEMS, MONSTERS, REGIONS } from '../data/config'
import { CRAFTING_RECIPES } from '../data/crafting'
import { ITEM_BASES, MATERIALS, RARITIES, WOLF_ENCOUNTER_RULES, WOLF_MONSTERS } from '../data/rewards'
import { CONTENT_CROP_GOODS, CONTENT_CROPS, CONTENT_EQUIPMENT, CONTENT_FAMILIES, CONTENT_LOOT_TABLES, CONTENT_MATERIALS, CONTENT_MONSTERS } from '../data/contentRegistry'
import type { MaterialId, MonsterDefinitionId, MonsterRank, RarityId } from '../domain/reward'
import type { ContentMonsterRank, ContentSeason } from '../domain/content'
import type { ItemId } from '../domain/types'
import { buyPrice, canVisit, encounter, enterDungeon, farm, gather, hire, hireTerms, rest, trade, startRegionalCampRaid } from '../engine/actions'
import { wolfRewardExpectation } from '../engine/itemGeneration'
import { npcCanWork } from '../engine/npcLife'
import { encounterWolf, wolfEncounterOptions, wolfCombatPresentation, wolfCorePresentation } from '../engine/wolfFamily'
import { contentEncounterOptions, contentKnowledgeCatalog, encounterContentMonster } from '../engine/contentFamilies'
import { farmCropChoices, farmCropPlantingGuidance } from '../engine/crops'
import { craft, type CraftResult } from '../engine/crafting'
import { distance, stageIndex } from '../engine/simulation'
import { calendar } from '../engine/calendar'
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
const selectedCropId = ref('wheat')
const currentSeason = computed(() => CONFIG.seasons[calendar(game.state.worldTime).season]! as ContentSeason)
const allCropChoices = computed(() => farmCropChoices(game.state))
const cropChoices = computed(() => allCropChoices.value.filter(choice => choice.status === 'available'))
const unavailableCropChoices = computed(() => allCropChoices.value.filter(choice => choice.status !== 'available'))
const cropPlantingGuidance = computed(() => farmCropPlantingGuidance(game.state))
const selectedCrop = computed(() => cropChoices.value.find(choice => choice.id === selectedCropId.value) ?? cropChoices.value[0] ?? null)
watch(cropChoices, choices => {
  if (!choices.some(choice => choice.id === selectedCropId.value)) selectedCropId.value = choices.find(choice => choice.id === 'wheat')?.id ?? choices[0]?.id ?? 'wheat'
})
const selectedInfluenceMaterial = ref<MaterialId | null>(null)
const crafting = computed(() => workbenchPlace.value ? projectCrafting(game.state, selectedRecipeId.value, selectedInfluenceMaterial.value) : null)
const craftingPlan = computed(() => crafting.value?.plan ?? null)
const lastCraftResult = ref<Extract<CraftResult, { ok: true }> | null>(null)
const recipeSearch = ref(''), recipeSearchInput = ref<HTMLInputElement | null>(null)
const recipeGroup = ref<'all' | 'weapon' | 'armor'>('all')
const recipeGroups = [{ id: 'all', name: '全部配方' }, { id: 'weapon', name: '武器' }, { id: 'armor', name: '防具' }] as const
const visibleRecipes = computed(() => (crafting.value?.recipes ?? []).filter(recipe => {
  const query = recipeSearch.value.trim().toLocaleLowerCase('zh-TW')
  const searchable = `${recipe.name} ${recipe.outputName} ${recipe.outputSlotName} Lv.${recipe.requiredSmithing}`.toLocaleLowerCase('zh-TW')
  return (recipeGroup.value === 'all' || recipe.category === recipeGroup.value) && (!query || searchable.includes(query))
}))
const missingRecipeMaterials = computed(() => (crafting.value?.inputs ?? []).filter(input => input.materialId && (input.current ?? 0) < input.required))
const recipeMaterialKnowledge = computed(() => contentKnowledgeCatalog(game.state, missingRecipeMaterials.value.map(input => input.materialId!)))
const products = computed(() => (Object.keys(ITEMS) as ItemId[]).filter(i => props.place === 'blacksmith' ? ['sword', 'armor'].includes(i) : !['sword', 'armor'].includes(i)))
const mercenaries = computed(() => game.state.npcs.filter(n => n.job === 'mercenary' && npcCanWork(game.state, n.id) && !game.state.party.some(p => p.npcId === n.id))
  .map(npc => ({ id: npc.id, name: npc.name, age: npc.age, level: npc.level, injuredUntil: npc.injuredUntil })))
const terms = computed(() => hireTerms(game.state))
const blocked = computed(() => !c.value.isAlive || !!game.state.combat || game.state.dungeon.inDungeon)
const price = (item: ItemId) => buyPrice(game.state, item)
const materialIcon = (id: string) => materialIcons[id as keyof typeof materialIcons] ?? '◈'
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
function clearRecipeSearch() {
  recipeSearch.value = ''
  void nextTick(() => recipeSearchInput.value?.focus())
}
function clearMonsterSearch() {
  monsterSearch.value = ''
  void nextTick(() => monsterSearchInput.value?.focus())
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
const monsterSearch = ref(''), monsterSearchInput = ref<HTMLInputElement | null>(null)
const monsterFamilyFilter = ref('all'), monsterRankFilter = ref<'all' | ContentMonsterRank>('all')
const monsterRankFilters: { id: 'all' | ContentMonsterRank; name: string }[] = [
  { id: 'all', name: '全部階級' }, { id: 'normal', name: '普通' }, { id: 'elite', name: '精英' },
  { id: 'miniBoss', name: '小首領' }, { id: 'boss', name: '首領' },
]
const monsterRankNames: Record<ContentMonsterRank, string> = { normal: '普通', elite: '精英', miniBoss: '小首領', boss: '首領' }
const wolfRankNames: Record<MonsterRank, string> = { normal: '普通', elite: '精英', miniBoss: '小首領', boss: '首領' }
const contentOptions = computed(() => contentEncounterOptions(game.state))
const monsterFamilies = computed(() => [...new Set(contentOptions.value.map(option => option.familyId))]
  .map(id => ({ id, name: CONTENT_FAMILIES[id]?.name['zh-TW'] ?? id })))
function contentSeen(definitionId: string) {
  return game.state.reward.collection.seen.includes(definitionId)
    || game.state.reward.collection.defeated.includes(definitionId)
    || game.state.reward.collection.bosses.includes(definitionId)
}
function contentCombatDetails(definitionId: string) {
  const definition = CONTENT_MONSTERS[definitionId]
  if (!definition) return null
  if (!contentSeen(definitionId)) return { mechanics: ['情報不足：尚未遭遇。'], loot: [] as string[] }
  const lootTable = CONTENT_LOOT_TABLES[definition.lootTableId]
  const lootIds = new Set([
    ...(lootTable?.guaranteedMaterialIds ?? []),
    ...(lootTable?.rareMaterials.map(item => item.materialId) ?? []),
    ...(lootTable?.weightedEquipment.map(item => item.equipmentId) ?? []),
    ...(definition.bossRules?.guaranteedMaterialIds ?? []),
    ...(definition.bossRules?.exclusiveEquipmentId ? [definition.bossRules.exclusiveEquipmentId] : []),
  ])
  // The canonical knowledge projection gates source names by discovery of this monster and its region.
  const knowledge = contentKnowledgeCatalog(game.state, [...lootIds])
  const loot = [...lootIds].filter(id => knowledge[id]?.sources.some(source => source.label === `擊敗${definition.name['zh-TW']}`))
    .map(id => CONTENT_MATERIALS[id]?.name['zh-TW'] ?? CONTENT_EQUIPMENT[id]?.name['zh-TW'] ?? id)
  return { mechanics: definition.mechanics.map(mechanic => mechanic.telegraph['zh-TW']), loot }
}
function wolfKnown(definitionId: string) {
  const collection = game.state.reward.collection
  return collection.seen.includes(definitionId) || collection.defeated.includes(definitionId) || collection.bosses.includes(definitionId)
}
function wolfKnownMechanics(definitionId: string) {
  if (!wolfKnown(definitionId)) return ['情報不足：尚未遭遇。']
  const activeEncounter = game.state.combat?.familyEncounter
  if (activeEncounter?.definitionId === definitionId) {
    // Active encounter traits come from the canonical combat presentation, not a second UI rules table.
    const presentation = wolfCombatPresentation(game.state)
    return presentation?.traits.map(trait => `${trait.name}：${trait.description}`) ?? []
  }
  const corePreparation = wolfCorePresentation(definitionId as MonsterDefinitionId).preparation
  if (corePreparation) return [corePreparation]
  return ['收藏記錄此狼種曾遭遇；過往隨機特性未保存在收藏中。']
}
// This is a factual comparison of catalog level and active-character level, never an inferred danger rating.
function levelComparison(monsterLevel: number) {
  return `怪物 Lv.${monsterLevel} · 你 Lv.${c.value.level}`
}
// Cooldown values are read from the existing canonical rules/config, not copied numeric thresholds.
function cooldownText(kind: 'wolf' | 'content' | 'chief', definitionId?: string) {
  if (kind === 'wolf' && definitionId && WOLF_MONSTERS[definitionId as MonsterDefinitionId]?.rank === 'boss') {
    return `勝利後冷卻 ${WOLF_ENCOUNTER_RULES.bossCooldownDays} 日。`
  }
  if (kind === 'content' && definitionId) {
    const days = CONTENT_MONSTERS[definitionId]?.bossRules?.cooldownDays
    return days === undefined ? '此目標沒有首領冷卻規則。' : `勝利後冷卻 ${days} 日。`
  }
  return '沒有獨立冷卻；首領是否出現依既有世界威脅進度。'
}
function goblinChiefKnown() {
  return game.state.threat.bossAlive
    || game.state.history.some(event => event.type === 'boss.spawned' || event.type === 'boss.defeated')
    || game.state.life.worldMemories.some(memory => memory.kind === 'GOBLIN_CHIEF_DEFEATED')
}
const visibleContentOptions = computed(() => {
  const query = monsterSearch.value.trim().toLocaleLowerCase('zh-TW')
  return contentOptions.value.filter(option => {
    const familyName = CONTENT_FAMILIES[option.familyId]?.name['zh-TW'] ?? ''
    const known = contentSeen(option.definitionId)
    const searchable = `${option.label} ${familyName} ${known ? option.description : ''} ${monsterRankNames[option.rank]} ${known ? '已遇見' : '未曾相遇'}`.toLocaleLowerCase('zh-TW')
    return (monsterFamilyFilter.value === 'all' || option.familyId === monsterFamilyFilter.value)
      && (monsterRankFilter.value === 'all' || option.rank === monsterRankFilter.value)
      && (!query || searchable.includes(query))
  })
})
const contentFamilyGroups = computed(() => monsterFamilies.value.map(family => ({
  ...family,
  options: visibleContentOptions.value.filter(option => option.familyId === family.id),
})).filter(family => family.options.length))
const farmUseText = computed(() => {
  const good = selectedCrop.value?.harvestGoodId ? CONTENT_CROP_GOODS[selectedCrop.value.harvestGoodId] : null
  return good
    ? `收成品每份可轉為 ${good.foodValue} 份食物，或以 ${good.sell} 金幣出售。`
    : '收成會直接加入食物背包，也會補充聚落糧食。'
})
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
    <p class="scene-description">🌾 {{ REGIONS.farmland.name }} · {{ currentSeason }} · 依目前季節與農田區域列出可種作物。</p>
    <div class="filter-buttons" role="group" aria-label="選擇播種作物">
      <button v-for="crop in cropChoices" :key="crop.id" :data-crop-choice="crop.id" data-crop-state="available"
        :aria-pressed="selectedCropId === crop.id" aria-describedby="crop-guidance"
        :class="{ selected: selectedCropId === crop.id }" @click="selectedCropId = crop.id">{{ crop.name }} · {{ Math.ceil(crop.growthMinutes / 1440) }} 日</button>
    </div>
    <p v-for="crop in unavailableCropChoices" :key="crop.id" class="muted help-text" data-crop-guidance :data-crop-state="crop.status">
      {{ crop.name }}：{{ crop.reason }}
    </p>
    <p v-if="selectedCrop" id="crop-guidance" class="muted help-text" data-crop-guidance data-crop-state="available">
      {{ selectedCrop.name }} · 生長 {{ Math.ceil(selectedCrop.growthMinutes / 1440) }} 日 · 預估收成 {{ selectedCrop.harvestAmount }} 份。{{ farmUseText }}
    </p>
    <p v-if="cropPlantingGuidance" id="crop-planting-guidance" class="inline-warning" data-crop-guidance :data-crop-state="cropPlantingGuidance.status">{{ cropPlantingGuidance.reason }}</p>
    <div class="plot-row"><section v-for="i in CONFIG.maxPlots" :key="i" class="plot">
      <span aria-hidden="true">{{ game.state.crops[i - 1] ? game.state.crops[i - 1]!.status === 'mature' ? '🌾' : '🌱' : i <= game.state.crops.length + game.state.preparedPlots ? '▤' : '≋' }}</span>
      <h3>田 {{ i }}<span v-if="game.state.crops[i - 1]"> · {{ game.state.crops[i - 1]!.cropId === 'wheat' ? '小麥' : CONTENT_CROPS[game.state.crops[i - 1]!.cropId]?.name['zh-TW'] ?? '作物' }}</span></h3><p>{{ game.state.crops[i - 1] ? game.state.crops[i - 1]!.status === 'mature' ? '可收割' : `剩 ${Math.max(0, Math.ceil((game.state.crops[i - 1]!.matureAt - game.state.worldTime) / 60))} 小時` : i <= game.state.crops.length + game.state.preparedPlots ? '已整地' : '未整地' }}</p>
      <PixelMeter v-if="game.state.crops[i - 1]" :label="`田 ${i} 生長`" :value="Math.min(100, (game.state.worldTime - game.state.crops[i - 1]!.plantedAt) / game.state.crops[i - 1]!.growthDuration * 100)" :max="100" compact />
    </section></div>
    <div class="action-buttons"><button :disabled="blocked || c.stamina < 6 || game.state.crops.length + game.state.preparedPlots >= CONFIG.maxPlots" @click="game.act(() => farm(game.state, 'prepare'))">整地 · 體力 6／20 分</button><button :aria-describedby="cropPlantingGuidance ? 'crop-planting-guidance' : 'farm-action-help'" :disabled="blocked || c.stamina < 4 || !selectedCrop || !!cropPlantingGuidance" @click="game.act(() => farm(game.state, 'plant', selectedCropId))">播種{{ selectedCrop?.name ?? '作物' }} · 體力 4／10 分</button><button class="primary" :disabled="blocked || c.stamina < 4 || !game.state.crops.some(p => p.status === 'mature')" @click="game.act(() => farm(game.state, 'harvest'))">收割 · 體力 4／15 分</button></div>
    <p id="farm-action-help" class="muted help-text">先整地，再播種。未成熟時可到別處生活；世界時間會讓作物依品種生長。體力不足時回聚落休息。</p>
  </template>
  <template v-else-if="place === 'forest' || place === 'mine'">
    <div class="scene-illustration" aria-hidden="true">{{ place === 'forest' ? '🌲　🌲　♣　🌲　🌲' : '▲　⛰️　▲　🪨　▲' }}</div>
    <p class="scene-description">{{ REGIONS[place].name }} · 資源餘量 {{ Math.floor(game.state.regions[place].remainingAmount) }}</p>
    <p class="muted">採集花費 10 體力，獲得素材與 4 金幣；資源每日恢復。</p>
    <div class="action-buttons"><button v-for="kind in place === 'forest' ? ['wood' as const] : ['stone' as const, 'iron' as const]" :key="kind" :disabled="blocked || c.stamina < 10 || game.state.regions[place].remainingAmount < 2 + Math.floor((c.skills[place === 'forest' ? 'woodcutting' : 'mining'].level - 1) / 2)" @click="game.act(() => gather(game.state, kind))">{{ itemIcons[kind] }} {{ kind === 'wood' ? '伐木' : kind === 'stone' ? '採石' : '採鐵礦' }}</button>
      <button v-if="place === 'forest'" class="primary" :disabled="blocked || c.stamina < 8 || game.state.threat.monsterPopulation < 1" @click="game.act(() => encounter(game.state))">尋找怪物 · 體力 8</button>
      <button v-if="place === 'forest' && game.state.threat.bossAlive" class="danger" :disabled="blocked || c.stamina < 8" @click="game.act(() => encounter(game.state, true))">👹 挑戰哥布林酋長</button>
      <details v-if="place === 'forest' && game.state.threat.bossAlive" class="boss-preparation-details">
        <summary>哥布林酋長戰前情報</summary>
        <p class="muted">首領 · 已現身</p>
        <p>{{ levelComparison(MONSTERS.chief.level) }}</p>
        <p>{{ goblinChiefKnown() ? '特性情報：目前哥布林酋長資料未登錄額外特性或特殊招式。' : '情報不足：尚未遭遇。' }}</p>
        <p>{{ goblinChiefKnown() ? `已知掉落：${ITEMS[MONSTERS.chief.loot].name}；勝利可獲得戰鬥獎勵。` : '情報不足：尚未遭遇。' }}</p>
        <p>撤退會結束戰鬥並推進世界時間，不取得經驗或戰利品。{{ cooldownText('chief') }}</p>
      </details>
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
      <div class="wolf-track-list"><div v-for="option in wolfOptions" :key="option.definitionId" class="wolf-track-row" :data-wolf-track="option.definitionId" :data-rank="option.rank"><button :class="{ danger: option.rank === 'boss' }" :disabled="!option.eligible" @click="game.act(() => encounterWolf(game.state, option.definitionId))">{{ option.label }} · {{ wolfRankNames[option.rank] }}</button><span class="muted">{{ option.eligible ? '可挑戰' : option.reason }}</span><p class="wolf-track-reward" data-wolf-reward-expectation>{{ rewardExpectationText(option.definitionId) }}</p><details v-if="option.rank === 'elite' || option.rank === 'miniBoss' || option.rank === 'boss'" class="boss-preparation-details"><summary>戰前情報</summary><p>{{ levelComparison(WOLF_MONSTERS[option.definitionId].level) }}</p><p v-for="line in wolfKnownMechanics(option.definitionId)" :key="line">{{ line }}</p><p>戰利品預期：{{ rewardExpectationText(option.definitionId) }}</p><p>撤退會結束戰鬥並推進世界時間，不取得經驗或戰利品。{{ cooldownText('wolf', option.definitionId) }}</p></details></div></div>
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
  <section v-if="contentOptions.length" class="content-encounters" aria-labelledby="content-encounters-title">
    <h3 id="content-encounters-title" class="section-title">{{ REGIONS[c.currentRegion].name }}的已知蹤跡</h3>
    <p class="muted help-text">只列目前所在已探索區域可追蹤的族群。遇見紀錄會跨角色保留；追蹤資格與拒絕原因由世界狀態判定。</p>
    <div class="content-search-row">
      <label for="monster-content-search">搜尋蹤跡</label>
      <input id="monster-content-search" ref="monsterSearchInput" v-model="monsterSearch" type="search" autocomplete="off" data-content-search="monster" aria-controls="content-monster-results">
      <button v-if="monsterSearch" type="button" data-content-search-clear aria-label="清除蹤跡搜尋" @click="clearMonsterSearch">清除</button>
    </div>
    <div v-if="monsterFamilies.length > 1" class="filter-buttons" role="group" aria-label="怪物族群">
      <button :aria-pressed="monsterFamilyFilter === 'all'" :class="{ selected: monsterFamilyFilter === 'all' }" @click="monsterFamilyFilter = 'all'">全部族群</button>
      <button v-for="family in monsterFamilies" :key="family.id" :aria-pressed="monsterFamilyFilter === family.id" :class="{ selected: monsterFamilyFilter === family.id }" @click="monsterFamilyFilter = family.id">{{ family.name }}</button>
    </div>
    <div class="filter-buttons" role="group" aria-label="怪物階級">
      <button v-for="rank in monsterRankFilters" :key="rank.id" :aria-pressed="monsterRankFilter === rank.id" :class="{ selected: monsterRankFilter === rank.id }" @click="monsterRankFilter = rank.id">{{ rank.name }}</button>
    </div>
    <p class="muted" data-content-result-count="monster">找到 {{ visibleContentOptions.length }}／{{ contentOptions.length }} 個目標</p>
    <div id="content-monster-results">
      <p v-if="!visibleContentOptions.length" class="empty-state" data-content-empty="no-results">沒有符合條件的蹤跡。清除搜尋或改選族群、階級。</p>
      <div v-else class="content-family-list">
        <section v-for="family in contentFamilyGroups" :key="family.id" class="content-family" :data-content-family="family.id">
          <h4>{{ family.name }}</h4>
          <article v-for="option in family.options" :key="option.definitionId" class="content-monster-row" :data-content-monster="option.definitionId" :data-content-rank="option.rank">
            <button :aria-describedby="option.reason ? `content-reason-${option.definitionId}` : undefined" :disabled="!option.eligible" @click="game.act(() => encounterContentMonster(game.state, option.definitionId))">追蹤{{ option.label }} · {{ monsterRankNames[option.rank] }}</button>
            <span class="muted">{{ contentSeen(option.definitionId) ? '已遇見' : '尚未相遇' }} · {{ option.eligible ? '可追蹤 · 花費 8 體力' : '暫不可追蹤' }}</span>
            <p v-if="contentSeen(option.definitionId)" class="muted">{{ option.description }}</p>
            <p v-else class="muted">這片區域尚未留下足夠的相遇紀錄。</p>
            <p v-if="option.reason" :id="`content-reason-${option.definitionId}`" class="inline-warning">{{ option.reason }}</p>
            <details v-if="option.rank === 'elite' || option.rank === 'miniBoss' || option.rank === 'boss'" class="boss-preparation-details">
              <summary>戰前情報</summary>
              <p>{{ levelComparison(CONTENT_MONSTERS[option.definitionId]!.level) }}</p>
              <p v-for="line in contentCombatDetails(option.definitionId)?.mechanics ?? []" :key="line">{{ line }}</p>
              <p>已知戰利品：{{ contentCombatDetails(option.definitionId)?.loot.join('、') || (contentSeen(option.definitionId) ? '目前知識投影沒有已知掉落來源。' : '情報不足：尚未遭遇。') }}</p>
              <p>撤退會結束戰鬥並推進世界時間，不取得經驗或戰利品。{{ cooldownText('content', option.definitionId) }}</p>
            </details>
          </article>
        </section>
      </div>
    </div>
  </section>
  <section v-if="crafting && craftingPlan" class="crafting-workbench" aria-labelledby="workbench-title">
    <h3 id="workbench-title" class="section-title">工作台</h3>
    <p class="muted">實際工作台 {{ crafting.stationName }} · 服務時間 {{ hourLabel(crafting.opensAtHour) }}–{{ hourLabel(crafting.closesAtHour) }}。</p>
    <p v-if="place === 'house' && crafting.hasHomeWorkbench" class="muted help-text">在自有住所附近，基礎與進階配方可於家中鍛造並減少服務費；實際站點、時段與費用依下方計畫顯示。高階鐵短劍仍需前往鐵匠鋪。</p>
    <h4 class="crafting-subheading">選擇配方</h4>
    <div class="content-search-row">
      <label for="recipe-content-search">搜尋配方</label>
      <input id="recipe-content-search" ref="recipeSearchInput" v-model="recipeSearch" type="search" autocomplete="off" data-content-search="recipe" aria-controls="recipe-content-results">
      <button v-if="recipeSearch" type="button" data-content-search-clear aria-label="清除配方搜尋" @click="clearRecipeSearch">清除</button>
    </div>
    <div class="filter-buttons" role="group" aria-label="配方類別">
      <button v-for="group in recipeGroups" :key="group.id" :aria-pressed="recipeGroup === group.id" :class="{ selected: recipeGroup === group.id }" @click="recipeGroup = group.id">{{ group.name }}</button>
    </div>
    <p class="muted" data-content-result-count="recipe">找到 {{ visibleRecipes.length }}／{{ crafting.recipes.length }} 項配方</p>
    <div id="recipe-content-results">
    <p v-if="!visibleRecipes.length" class="empty-state" data-content-empty="no-results">找不到符合條件的配方。清除搜尋或改選類別；目前選擇與鍛造計畫仍保留。</p>
    <div v-else class="filter-buttons crafting-recipe-options" role="group" aria-label="選擇鍛造配方">
      <button v-for="recipe in visibleRecipes" :key="recipe.id" :data-craft-recipe="recipe.id"
        :aria-pressed="selectedRecipeId === recipe.id" :class="{ selected: selectedRecipeId === recipe.id }"
        @click="chooseRecipe(recipe.id)">{{ recipe.name }}<small>{{ recipe.unlocked ? `Smithing Lv.${recipe.requiredSmithing} 已解鎖` : `Smithing Lv.${recipe.requiredSmithing} 解鎖` }}</small></button>
    </div>
    </div>
    <p class="crafting-recipe-name">{{ crafting.recipeName }}</p>
    <h4 class="crafting-subheading">影響素材</h4>
    <p class="muted help-text">素材會消耗 1 份，依選擇調整詞綴權重或條件式特性機率；不保證指定結果。品質機率只依鍛造熟練度能力調整。</p>
    <div class="filter-buttons crafting-material-options" role="group" aria-label="選擇影響素材">
      <button data-crafting-material="none" :aria-pressed="selectedInfluenceMaterial === null" :class="{ selected: selectedInfluenceMaterial === null }" @click="chooseInfluenceMaterial(null)">不使用素材</button>
      <button v-for="option in crafting.influenceMaterials" :key="option.id" :data-crafting-material="option.id" :aria-pressed="selectedInfluenceMaterial === option.id" :class="{ selected: selectedInfluenceMaterial === option.id }" @click="chooseInfluenceMaterial(option.id)">{{ materialIcon(option.id) }} {{ option.name }} · 持有 {{ option.owned }}</button>
    </div>
    <p v-if="!crafting.influenceMaterials.length" class="muted help-text">這項配方沒有影響素材選項。</p>
    <p v-if="crafting.selectedInfluence" class="crafting-influence-copy" data-crafting-influence-copy>{{ crafting.selectedInfluence.influenceText }}</p>
    <dl class="crafting-preview">
      <dt>成品</dt><dd>{{ crafting.outputName }} · {{ crafting.outputSlotName }} · Lv.{{ crafting.outputLevel }}</dd>
      <dt>材料</dt><dd><ul><li v-for="input in crafting.inputs" :key="input.key">
        {{ input.name }} ×{{ input.required }} <span class="muted">／持有 {{ input.current ?? '—' }}</span>
        <small v-if="input.materialId && (input.current ?? 0) < input.required" class="content-hints">
          <span v-for="source in recipeMaterialKnowledge[input.materialId]?.sources ?? []" :key="`${source.label}-${source.region ?? 'unknown'}`" :data-content-source="input.materialId" :data-content-source-state="source.state">
            來源：{{ source.label }}<template v-if="source.region"> · {{ REGIONS[source.region].name }}</template><template v-if="source.reason"> · {{ source.reason }}</template>
          </span>
          <span v-for="use in recipeMaterialKnowledge[input.materialId]?.uses ?? []" :key="use" :data-content-use="input.materialId">用途：{{ use }}</span>
        </small>
      </li></ul></dd>
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

<style scoped>
.boss-preparation-details { grid-column: 1 / -1; }
</style>
