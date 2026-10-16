<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { EQUIPMENT, ITEMS, REGIONS } from '../data/config'
import { AFFIXES, ITEM_BASES, MATERIALS, RARITIES, WOLF_MONSTERS } from '../data/rewards'
import type { EquipmentSlot, ItemBaseId, MaterialId, MonsterDefinitionId, RarityId } from '../domain/reward'
import type { ItemId } from '../domain/types'
import { combatTurn, equip, usePotion } from '../engine/actions'
import { canVisit } from '../engine/actions'
import { calendar } from '../engine/calendar'
import { equipInstance, itemSellPrice, sellInstance, tradeMaterial } from '../engine/rewardActions'
import { itemIcons } from '../presentation/icons'
import { CONTENT_CROP_GOODS } from '../data/contentRegistry'
import { convertCropGoodToFood } from '../engine/rewardActions'
import { contentKnowledgeCatalog } from '../engine/contentFamilies'
import { affixMechanics, GEAR_PAGE_SIZE, projectCraftProvenance, projectGearComparison, projectGearPage, projectLatestLootFeedback, statDeltaText, statKeys, statLabels, statText } from '../presentation/rewardProjection'
import { projectMaterialOrigin, projectMaterialOriginLabel, projectMaterialSearchIndex } from '../presentation/craftingProjection'
import { useGameStore } from '../stores/gameStore'
const props = defineProps<{ focusInstanceId?: string | null }>()
const emit = defineEmits<{ (event: 'focus-consumed'): void }>()
const game = useGameStore()
const selected = ref<ItemId>('potion')
const items = Object.keys(ITEMS) as ItemId[]
const categories = [{ id: 'supplies', name: '日常物品' }, { id: 'gear', name: '獵獲裝備' }, { id: 'materials', name: '素材與收成' }, { id: 'discovery', name: '見聞收藏' }] as const
const category = ref<(typeof categories)[number]['id']>('supplies')
const slot = ref<EquipmentSlot | 'all'>('all'), rarity = ref<RarityId | 'all'>('all'), page = ref(0), selectedGear = ref<string | null>(null)
const gearSearch = ref(''), materialSearch = ref('')
const materialGroup = ref<'all' | 'harvest' | 'craft' | 'other'>('all')
const gearSearchInput = ref<HTMLInputElement | null>(null), materialSearchInput = ref<HTMLInputElement | null>(null)
const slots = [{ id: 'all', name: '全部' }, { id: 'weapon', name: '武器' }, { id: 'armor', name: '防具' }] as const
const rarities = Object.keys(RARITIES) as RarityId[]
const materials = computed(() => {
  const stacks = game.state.reward.materials[game.state.activeCharacterId] ?? {}
  const ids = new Set([...game.state.reward.collection.materials, ...Object.entries(stacks).filter(([, amount]) => amount > 0).map(([id]) => id)])
  return [...ids].filter((id): id is MaterialId => Object.hasOwn(MATERIALS, id))
})
const hasKnownMaterials = computed(() => materials.value.length > 0)
const materialGroups = [
  { id: 'all', name: '全部素材' }, { id: 'harvest', name: '作物收成' },
  { id: 'craft', name: '鍛造用途' }, { id: 'other', name: '其他素材' },
] as const
const gearPage = computed(() => projectGearPage(game.state, page.value, slot.value, rarity.value, gearSearch.value))
const gear = computed(() => gearPage.value.items.find(item => item.instanceId === selectedGear.value) ?? gearPage.value.items[0] ?? null)
const ownedGearCount = computed(() => game.state.reward.instances.filter(item => item.ownerId === game.state.activeCharacterId).length)
const gearHasNoResults = computed(() => gearPage.value.total === 0 && ownedGearCount.value > 0)
const comparison = computed(() => gear.value ? projectGearComparison(game.state, gear.value.instanceId) : null)
const craftProvenance = computed(() => gear.value ? projectCraftProvenance(game.state, gear.value) : null)
const gearEquipped = computed(() => !!gear.value && game.state.reward.equipped[game.state.activeCharacterId]?.[ITEM_BASES[gear.value.baseId].slot] === gear.value.instanceId)
const materialStacks = computed(() => game.state.reward.materials[game.state.activeCharacterId])
const collection = computed(() => game.state.reward.collection)
const lootFeedback = computed(() => projectLatestLootFeedback(game.state))
const materialKnowledge = computed(() => contentKnowledgeCatalog(game.state, materials.value))
const materialEntries = computed(() => materials.value.map(id => {
  const hints = materialKnowledge.value[id]
  const origin = projectMaterialOrigin(id)
  const isCraftMaterial = hints?.uses.some(use => use.startsWith('配方：') || use.startsWith('影響配方：')) ?? false
  const group = CONTENT_CROP_GOODS[id] ? 'harvest' : isCraftMaterial ? 'craft' : 'other'
  const searchable = projectMaterialSearchIndex(id, MATERIALS[id].name, MATERIALS[id].description,
    hints?.sources.map(source => source.label) ?? [], hints?.uses ?? [])
  return { id, hints, group, origin, searchable }
}).filter(entry => (materialGroup.value === 'all' || entry.group === materialGroup.value)
  && (!materialSearch.value.trim() || entry.searchable.includes(materialSearch.value.trim().toLocaleLowerCase('zh-TW')))))
function wolfNames(ids: readonly string[]) {
  return ids.filter((monsterId): monsterId is MonsterDefinitionId => Object.hasOwn(WOLF_MONSTERS, monsterId))
    .map(monsterId => WOLF_MONSTERS[monsterId].name).join('、')
}
function bossSourceName(id: string) { return Object.hasOwn(WOLF_MONSTERS, id) ? WOLF_MONSTERS[id as MonsterDefinitionId].name : id }
function baseNames(ids: ItemBaseId[]) { return ids.map(baseId => ITEM_BASES[baseId].name).join('、') }
function materialNames(ids: MaterialId[]) { return ids.map(materialId => MATERIALS[materialId].name).join('、') }
const pendingSale = ref<string | null>(null), cancelSale = ref<HTMLButtonElement | null>(null)
let saleTrigger: HTMLButtonElement | null = null
watch([slot, rarity, gearSearch], () => { page.value = 0; selectedGear.value = null; pendingSale.value = null })
watch(() => gearPage.value.page, value => { page.value = value })
watch(() => gear.value?.instanceId, () => { pendingSale.value = null })
watch(() => props.focusInstanceId, instanceId => {
  if (!instanceId) return
  const index = game.state.reward.instances.filter(item => item.ownerId === game.state.activeCharacterId)
    .findIndex(item => item.instanceId === instanceId)
  if (index >= 0) {
    category.value = 'gear'; slot.value = 'all'; rarity.value = 'all'
    const targetPage = Math.floor(index / GEAR_PAGE_SIZE)
    void nextTick(() => {
      page.value = targetPage; selectedGear.value = instanceId
      void nextTick(() => {
        const target = Array.from(document.querySelectorAll<HTMLButtonElement>('dialog [data-instance-id]'))
          .find(button => button.dataset.instanceId === instanceId)
        target?.focus()
        emit('focus-consumed')
      })
    })
    return
  }
  emit('focus-consumed')
}, { immediate: true })
function requestSale(event: Event) {
  if (!gear.value) return
  saleTrigger = event.currentTarget instanceof HTMLButtonElement ? event.currentTarget : null
  pendingSale.value = gear.value.instanceId
  void nextTick(() => cancelSale.value?.focus())
}
function clearGearSearch() {
  gearSearch.value = ''
  void nextTick(() => gearSearchInput.value?.focus())
}
function clearMaterialSearch() {
  materialSearch.value = ''
  void nextTick(() => materialSearchInput.value?.focus())
}
function keepGear() {
  pendingSale.value = null
  void nextTick(() => {
    if (saleTrigger?.isConnected && !saleTrigger.disabled) saleTrigger.focus()
    else document.querySelector<HTMLButtonElement>('dialog .filter-buttons button[aria-pressed="true"]')?.focus()
  })
}
function confirmSale() {
  const id = pendingSale.value
  if (!id) return
  game.act(() => {
    const error = sellInstance(game.state, id)
    if (!error) {
      pendingSale.value = null
      void nextTick(() => {
        const target = document.querySelector<HTMLButtonElement>('dialog .gear-layout .item-list button')
          ?? document.querySelector<HTMLButtonElement>('dialog .filter-buttons button[aria-pressed="true"]')
        target?.focus()
      })
    }
    return error
  })
}
function equipGear() {
  const id = gear.value?.instanceId
  if (id) game.act(() => equipInstance(game.state, id))
}
const equipped = computed(() => game.character.equipment.weapon === selected.value || game.character.equipment.armor === selected.value)
const descriptions: Record<ItemId, string> = {
  wood: '森林採集的木材，可以到雜貨店出售。', stone: '礦場採集的石材，可以到雜貨店出售。', iron: '礦場與地下城取得的鐵礦，可以出售。',
  food: '農田收穫的食物，可以到雜貨店出售。', material: '一般怪物掉落物，可出售；配方素材與收成品請在「素材與收成」查看。', potion: '恢復 45 生命。戰鬥中使用會消耗一回合。',
  sword: `裝備後攻擊增加 ${EQUIPMENT.sword.attack}。`, armor: `裝備後防禦增加 ${EQUIPMENT.armor.defense}。`,
}
function useSelected() {
  const item = selected.value
  if (item === 'sword' || item === 'armor') game.act(() => equip(game.state, item))
  else if (item === 'potion') game.act(() => game.state.combat ? combatTurn(game.state, 'potion') : usePotion(game.state))
}
</script>

<template>
  <p class="inventory-summary">隨身物品 <span>🪙 {{ game.character.gold }} 金幣</span></p>
  <p v-if="lootFeedback" class="reward-feedback" role="status" aria-live="polite" :data-loot-feedback="lootFeedback.kind"><strong>{{ lootFeedback.label }}</strong> · {{ lootFeedback.message }}</p>
  <div class="filter-buttons" role="group" aria-label="物品分類"><button v-for="tab in categories" :key="tab.id" :aria-pressed="category === tab.id" :class="{ selected: category === tab.id }" @click="category = tab.id; pendingSale = null">{{ tab.name }}</button></div>
  <div v-if="category === 'supplies'" class="inventory-layout">
    <div class="item-list" role="group" aria-label="選擇物品"><button v-for="item in items" :key="item" :aria-pressed="selected === item" :class="{ selected: selected === item }" @click="selected = item"><span>{{ itemIcons[item] }} {{ ITEMS[item].name }}</span><span>×{{ game.character.inventory[item] }}</span></button></div>
    <section class="item-detail" aria-live="polite"><span class="item-portrait" aria-hidden="true">{{ itemIcons[selected] }}</span><h3>{{ ITEMS[selected].name }}</h3><p>{{ descriptions[selected] }}</p><p class="muted">持有 {{ game.character.inventory[selected] }} · 出售 {{ ITEMS[selected].sell }} 金幣</p>
      <button v-if="['sword', 'armor', 'potion'].includes(selected)" class="primary" :disabled="!game.character.inventory[selected] || !game.character.isAlive || (selected !== 'potion' && !!game.state.combat)" @click="useSelected">{{ selected === 'potion' ? '使用藥水' : equipped ? '卸下裝備' : '裝備' }}</button>
      <p v-if="game.state.combat && selected !== 'potion'" class="muted">戰鬥中無法更換裝備。</p>
      <p v-if="!game.character.inventory[selected]" class="muted">背包裡還沒有這件物品。</p>
    </section>
  </div>
  <p v-if="category === 'supplies'" class="muted help-text">素材交易請走到雜貨店；裝備購買請前往鐵匠鋪。</p>
  <template v-else-if="category === 'gear'">
    <div class="filter-buttons" role="group" aria-label="裝備部位"><button v-for="filter in slots" :key="filter.id" :aria-pressed="slot === filter.id" :class="{ selected: slot === filter.id }" @click="slot = filter.id">{{ filter.name }}</button></div>
    <div class="filter-buttons" role="group" aria-label="裝備品質"><button :aria-pressed="rarity === 'all'" :class="{ selected: rarity === 'all' }" @click="rarity = 'all'">全部品質</button><button v-for="id in rarities" :key="id" :aria-pressed="rarity === id" :class="{ selected: rarity === id }" @click="rarity = id">{{ RARITIES[id].name }}</button></div>
    <div class="content-search-row">
      <label for="gear-content-search">搜尋裝備</label>
      <input id="gear-content-search" ref="gearSearchInput" v-model="gearSearch" type="search" autocomplete="off" data-content-search="gear" aria-controls="gear-content-results">
      <button v-if="gearSearch" type="button" data-content-search-clear aria-label="清除裝備搜尋" @click="clearGearSearch">清除</button>
    </div>
    <p class="muted" data-content-result-count="gear">符合條件 {{ gearPage.total }} 件 · 每頁最多 20 件；篩選不會丟棄裝備。</p>
    <div id="gear-content-results">
    <p v-if="!gear && gearHasNoResults" class="empty-state" data-content-empty="no-results">找不到符合條件的裝備。清除搜尋或調整部位、品質篩選。</p>
    <p v-else-if="!gear" class="empty-state">目前沒有獵獲裝備。前往北方森林探索狼族與其他生物。</p>
    <div v-else class="inventory-layout gear-layout">
      <div class="item-list" role="group" aria-label="選擇獵獲裝備"><button v-for="item in gearPage.items" :key="item.instanceId" :data-instance-id="item.instanceId" :data-craft-masterpiece="item.craftProvenance?.masterpiece ? 'true' : undefined" :aria-pressed="gear.instanceId === item.instanceId" :class="{ selected: gear.instanceId === item.instanceId }" @click="selectedGear = item.instanceId"><span>{{ RARITIES[item.rarity].name }} {{ ITEM_BASES[item.baseId].name }}<small v-if="item.craftProvenance?.masterpiece" class="masterpiece-label"> · 鍛造傑作</small></span><span>Lv.{{ item.level }}</span></button></div>
      <section class="item-detail gear-detail" aria-live="polite" data-gear-comparison>
        <p class="muted">{{ RARITIES[gear.rarity].name }} · {{ ITEM_BASES[gear.baseId].slot === 'weapon' ? '武器' : '防具' }} · Lv.{{ gear.level }}</p><h3>{{ ITEM_BASES[gear.baseId].name }}{{ gearEquipped ? ' · 已穿戴' : '' }}</h3>
        <p class="muted">目前同部位：{{ comparison?.current.name }} · {{ comparison?.current.rarity ? RARITIES[comparison.current.rarity].name : '固定裝備' }}</p>
        <dl class="gear-comparison"><dt>能力</dt><dd>候選裝備 <span class="muted">／目前</span> · 差值</dd><template v-for="key in statKeys" :key="key"><dt>{{ statLabels[key] }}</dt><dd>{{ statText(key, comparison?.candidate.stats[key] ?? gear.rolledStats[key]) }} <span class="muted">／ {{ statText(key, comparison?.current.stats[key] ?? 0) }}</span> · <strong :class="['gear-delta', (comparison?.delta[key] ?? 0) > 0 ? 'positive' : (comparison?.delta[key] ?? 0) < 0 ? 'negative' : 'zero']">{{ statDeltaText(key, comparison?.delta[key] ?? 0) }}</strong></dd></template></dl>
        <div class="gear-affix-compare">
          <section><h4>候選裝備詞綴</h4><ul class="gear-affixes"><li v-for="affix in gear.affixes" :key="affix.id">{{ AFFIXES[affix.id].name }} · 階 {{ affix.tier }} · {{ statLabels[AFFIXES[affix.id].stat] }} +{{ statText(AFFIXES[affix.id].stat, affix.value) }}<span class="muted"> {{ affixMechanics[AFFIXES[affix.id].stat] }}</span></li><li v-if="!gear.affixes.length" class="muted">沒有附加詞綴。</li></ul><p v-if="gear.specialTrait" class="gear-special-trait">月下獵手：對狼族每次攻擊額外造成 3 點傷害。</p></section>
          <section><h4>目前裝備詞綴</h4><ul class="gear-affixes"><li v-for="affix in comparison?.current.affixes ?? []" :key="affix.id">{{ AFFIXES[affix.id].name }} · 階 {{ affix.tier }} · {{ statLabels[AFFIXES[affix.id].stat] }} +{{ statText(AFFIXES[affix.id].stat, affix.value) }}<span class="muted"> {{ affixMechanics[AFFIXES[affix.id].stat] }}</span></li><li v-if="!comparison?.current.affixes.length" class="muted">{{ comparison?.current.specialTrait ? '沒有附加詞綴。' : '沒有附加詞綴或特殊特性。' }}</li></ul><p v-if="comparison?.current.specialTrait === 'moonHunter'" class="gear-special-trait">月下獵手：對狼族每次攻擊額外造成 3 點傷害。</p></section>
        </div>
        <p v-if="gear.material" class="muted">生成素材：{{ MATERIALS[gear.material].name }}</p>
        <p v-if="gear.provenance" class="muted">留名裝備 · 誕生於第 {{ calendar(gear.provenance.createdAt).year }} 年{{ gear.provenance.bossSource ? ` · 來源：${bossSourceName(gear.provenance.bossSource)}` : '' }}</p>
        <p v-if="craftProvenance" class="muted" data-craft-provenance><strong v-if="craftProvenance.masterpiece" class="masterpiece-label">鍛造傑作</strong><span v-else>鍛造裝備</span> · 原製作者 {{ craftProvenance.creatorName }} · {{ craftProvenance.createdAtLabel }} · 配方：{{ craftProvenance.recipeName }}</p>
        <div class="action-buttons"><button class="primary" :disabled="!game.character.isAlive || !!game.state.combat" @click="equipGear">{{ gearEquipped ? '卸下獵獲裝備' : '穿戴獵獲裝備' }}</button><button :disabled="gearEquipped || !canVisit(game.state, 'blacksmith')" @click="requestSale">出售 {{ itemSellPrice(gear) }} 金</button></div>
        <p v-if="game.state.combat" class="muted">戰鬥中無法更換裝備。</p><p v-if="!game.state.settlement.buildings.includes('blacksmith')" class="muted">聚落發展成村莊、開設鐵匠鋪後，才能出售獵獲裝備。</p><p v-else-if="!canVisit(game.state, 'blacksmith')" class="muted">出售請在營業時間靠近鐵匠鋪；已穿戴的裝備請先卸下。</p>
        <section v-if="pendingSale === gear.instanceId" class="gear-sale-confirm" role="group" aria-labelledby="gear-sale-title"><h4 id="gear-sale-title">出售{{ RARITIES[gear.rarity].name }}{{ ITEM_BASES[gear.baseId].name }}？</h4><p>取得 {{ itemSellPrice(gear) }} 金，這件裝備將永久離開背包。</p><div class="action-buttons"><button ref="cancelSale" @click="keepGear">保留這件裝備</button><button class="danger" :disabled="!canVisit(game.state, 'blacksmith') || gearEquipped" @click="confirmSale">確認出售這件裝備</button></div></section>
      </section>
    </div>
    </div>
    <div class="gear-pagination" role="group" aria-label="裝備分頁"><button :disabled="gearPage.page === 0" @click="page = gearPage.page - 1">上一頁</button><span>第 {{ gearPage.page + 1 }}／{{ gearPage.pages }} 頁</span><button :disabled="gearPage.page + 1 >= gearPage.pages" @click="page = gearPage.page + 1">下一頁</button></div>
    <p class="muted help-text">每個部位只能穿戴一件；穿戴獵獲裝備會替換同部位的固定裝備，替下的物品仍在背包。比較只列出能力與機制差異，不把不同效果合併成總戰力分數。</p>
  </template>
  <template v-else-if="category === 'materials'">
    <template v-if="hasKnownMaterials">
    <div class="content-search-row">
      <label for="material-content-search">搜尋素材</label>
      <input id="material-content-search" ref="materialSearchInput" v-model="materialSearch" type="search" autocomplete="off" data-content-search="material" aria-controls="material-content-results">
      <button v-if="materialSearch" type="button" data-content-search-clear aria-label="清除素材搜尋" @click="clearMaterialSearch">清除</button>
    </div>
    <div class="filter-buttons" role="group" aria-label="素材用途分類">
      <button v-for="group in materialGroups" :key="group.id" :aria-pressed="materialGroup === group.id" :class="{ selected: materialGroup === group.id }" @click="materialGroup = group.id">{{ group.name }}</button>
    </div>
    <p class="muted" data-content-result-count="material">找到 {{ materialEntries.length }} 種素材</p>
    <div id="material-content-results">
      <p v-if="!materialEntries.length" class="empty-state" data-content-empty="no-results">找不到符合條件的素材。清除搜尋或改選用途分類。</p>
      <div v-else>
      <section v-for="entry in materialEntries" :key="entry.id" class="reward-material" :data-material-group="entry.group">
        <h3>{{ MATERIALS[entry.id].name }} · 持有 {{ materialStacks?.[entry.id] ?? 0 }} <small class="material-origin" :data-material-origin="entry.origin">{{ projectMaterialOriginLabel(entry.origin) }}</small></h3>
        <p class="muted">{{ MATERIALS[entry.id].description }}</p>
        <div v-if="entry.hints?.sources.length" class="content-hints">
          <h4>已知來源</h4>
          <ul><li v-for="source in entry.hints.sources" :key="`${source.label}-${source.region ?? 'unknown'}`" :data-content-source="entry.id" :data-content-source-state="source.state">
            {{ source.label }}<span v-if="source.region"> · {{ REGIONS[source.region].name }}</span><span v-if="source.reason" class="muted"> · {{ source.reason }}</span>
          </li></ul>
        </div>
        <div v-if="entry.hints?.uses.length" class="content-hints">
          <h4>用途</h4><ul><li v-for="use in entry.hints.uses" :key="use" :data-content-use="entry.id">{{ use }}</li></ul>
        </div>
        <p v-else class="muted">目前沒有已記錄的用途。</p>
        <button :disabled="!canVisit(game.state, 'store') || !(materialStacks?.[entry.id] ?? 0)" @click="game.act(() => tradeMaterial(game.state, entry.id))">出售一份{{ MATERIALS[entry.id].name }} · {{ MATERIALS[entry.id].sell }} 金</button>
        <p v-if="CONTENT_CROP_GOODS[entry.id]" class="muted">每份可轉為 {{ CONTENT_CROP_GOODS[entry.id]!.foodValue }} 份食物。</p>
        <button v-if="CONTENT_CROP_GOODS[entry.id]" :disabled="!(materialStacks?.[entry.id] ?? 0)" @click="game.act(() => convertCropGoodToFood(game.state, entry.id, 1))">轉換 1 份{{ MATERIALS[entry.id].name }}為 {{ CONTENT_CROP_GOODS[entry.id]!.foodValue }} 份食物</button>
      </section>
      </div>
    </div>
    <p class="muted help-text">出售請在營業時間靠近雜貨店；每次出售花費 5 分鐘。收成品可逐份轉成標示數量的食物，轉換會扣除素材並加入背包食物。</p>
    </template>
    <p v-else class="empty-state">尚未發現素材或收成品。探索區域、擊退生物或收割作物後，已知內容會記錄在這裡。</p>
  </template>
  <section v-else class="reward-discovery">
    <h3>見聞與收藏</h3><p class="muted">記錄這個世界累積的發現，跨越角色世代保留。只列出已經見過或取得的內容。</p>
    <h4 class="section-title">曾遇見的狼族</h4><p>{{ wolfNames(collection.seen) || '尚未發現。前往北方森林尋找狼族。' }}</p>
    <h4 class="section-title">已擊退</h4><p>{{ wolfNames(collection.defeated) || '尚未擊退狼族。' }}</p>
    <h4 class="section-title">裝備基底 · 收藏已記錄</h4><p>{{ baseNames(collection.bases) || '尚未取得獵獲裝備。' }}</p>
    <h4 class="section-title">已見素材</h4><p>{{ materialNames(collection.materials) || '尚未取得狼族素材。' }}</p>
    <h4 class="section-title">稀有收藏</h4><p>{{ baseNames(collection.rareBases) || '尚未取得稀有以上裝備。' }}</p>
    <h4 class="section-title">首領紀錄</h4><p>{{ wolfNames(collection.bosses) || '尚未擊退狼族首領。' }}</p>
  </section>
</template>

<style scoped>
.material-origin { display: inline-block; border: 1px solid var(--border); padding: 0 4px; font-size: 11px; font-weight: 400; }
</style>
