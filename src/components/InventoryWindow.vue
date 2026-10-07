<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { EQUIPMENT, ITEMS } from '../data/config'
import { AFFIXES, ITEM_BASES, MATERIALS, RARITIES, WOLF_MONSTERS } from '../data/rewards'
import type { EquipmentSlot, ItemBaseId, MaterialId, MonsterDefinitionId, RarityId } from '../domain/reward'
import type { ItemId } from '../domain/types'
import { combatTurn, equip, usePotion } from '../engine/actions'
import { canVisit } from '../engine/actions'
import { calendar } from '../engine/calendar'
import { equipInstance, itemSellPrice, sellInstance, tradeMaterial } from '../engine/rewardActions'
import { itemIcons } from '../presentation/icons'
import { affixMechanics, GEAR_PAGE_SIZE, projectCraftProvenance, projectGearComparison, projectGearPage, projectLatestLootFeedback, statDeltaText, statKeys, statLabels, statText } from '../presentation/rewardProjection'
import { useGameStore } from '../stores/gameStore'
const props = defineProps<{ focusInstanceId?: string | null }>()
const emit = defineEmits<{ (event: 'focus-consumed'): void }>()
const game = useGameStore()
const selected = ref<ItemId>('potion')
const items = Object.keys(ITEMS) as ItemId[]
const categories = [{ id: 'supplies', name: '日常物品' }, { id: 'gear', name: '獵獲裝備' }, { id: 'materials', name: '狼族素材' }, { id: 'discovery', name: '見聞收藏' }] as const
const category = ref<(typeof categories)[number]['id']>('supplies')
const slot = ref<EquipmentSlot | 'all'>('all'), rarity = ref<RarityId | 'all'>('all'), page = ref(0), selectedGear = ref<string | null>(null)
const slots = [{ id: 'all', name: '全部' }, { id: 'weapon', name: '武器' }, { id: 'armor', name: '防具' }] as const
const rarities = Object.keys(RARITIES) as RarityId[]
const materials = Object.keys(MATERIALS) as MaterialId[]
const gearPage = computed(() => projectGearPage(game.state, page.value, slot.value, rarity.value))
const gear = computed(() => gearPage.value.items.find(item => item.instanceId === selectedGear.value) ?? gearPage.value.items[0] ?? null)
const comparison = computed(() => gear.value ? projectGearComparison(game.state, gear.value.instanceId) : null)
const craftProvenance = computed(() => gear.value ? projectCraftProvenance(game.state, gear.value) : null)
const gearEquipped = computed(() => !!gear.value && game.state.reward.equipped[game.state.activeCharacterId]?.[ITEM_BASES[gear.value.baseId].slot] === gear.value.instanceId)
const materialStacks = computed(() => game.state.reward.materials[game.state.activeCharacterId])
const collection = computed(() => game.state.reward.collection)
const lootFeedback = computed(() => projectLatestLootFeedback(game.state))
function wolfNames(ids: MonsterDefinitionId[]) { return ids.map(monsterId => WOLF_MONSTERS[monsterId].name).join('、') }
function baseNames(ids: ItemBaseId[]) { return ids.map(baseId => ITEM_BASES[baseId].name).join('、') }
function materialNames(ids: MaterialId[]) { return ids.map(materialId => MATERIALS[materialId].name).join('、') }
const pendingSale = ref<string | null>(null), cancelSale = ref<HTMLButtonElement | null>(null)
let saleTrigger: HTMLButtonElement | null = null
watch([slot, rarity], () => { page.value = 0; selectedGear.value = null })
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
  food: '農田收穫的食物，可以到雜貨店出售。', material: '怪物留下的素材，可以到雜貨店出售。', potion: '恢復 45 生命。戰鬥中使用會消耗一回合。',
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
    <p class="muted">符合條件 {{ gearPage.total }} 件 · 每頁最多 20 件；篩選不會丟棄裝備。</p>
    <p v-if="!gear" class="empty-state">目前沒有符合條件的獵獲裝備。清除篩選，或前往北方森林擊退灰狼，尋找下一件裝備。</p>
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
        <p v-if="gear.provenance" class="muted">留名裝備 · 誕生於第 {{ calendar(gear.provenance.createdAt).year }} 年{{ gear.provenance.bossSource ? ` · 來源：${WOLF_MONSTERS[gear.provenance.bossSource].name}` : '' }}</p>
        <p v-if="craftProvenance" class="muted" data-craft-provenance><strong v-if="craftProvenance.masterpiece" class="masterpiece-label">鍛造傑作</strong><span v-else>鍛造裝備</span> · 原製作者 {{ craftProvenance.creatorName }} · {{ craftProvenance.createdAtLabel }} · 配方：{{ craftProvenance.recipeName }}</p>
        <div class="action-buttons"><button class="primary" :disabled="!game.character.isAlive || !!game.state.combat" @click="equipGear">{{ gearEquipped ? '卸下獵獲裝備' : '穿戴獵獲裝備' }}</button><button :disabled="gearEquipped || !canVisit(game.state, 'blacksmith')" @click="requestSale">出售 {{ itemSellPrice(gear) }} 金</button></div>
        <p v-if="game.state.combat" class="muted">戰鬥中無法更換裝備。</p><p v-if="!game.state.settlement.buildings.includes('blacksmith')" class="muted">聚落發展成村莊、開設鐵匠鋪後，才能出售獵獲裝備。</p><p v-else-if="!canVisit(game.state, 'blacksmith')" class="muted">出售請在營業時間靠近鐵匠鋪；已穿戴的裝備請先卸下。</p>
        <section v-if="pendingSale === gear.instanceId" class="gear-sale-confirm" role="group" aria-labelledby="gear-sale-title"><h4 id="gear-sale-title">出售{{ RARITIES[gear.rarity].name }}{{ ITEM_BASES[gear.baseId].name }}？</h4><p>取得 {{ itemSellPrice(gear) }} 金，這件裝備將永久離開背包。</p><div class="action-buttons"><button ref="cancelSale" @click="keepGear">保留這件裝備</button><button class="danger" :disabled="!canVisit(game.state, 'blacksmith') || gearEquipped" @click="confirmSale">確認出售這件裝備</button></div></section>
      </section>
    </div>
    <div class="gear-pagination" role="group" aria-label="裝備分頁"><button :disabled="gearPage.page === 0" @click="page = gearPage.page - 1">上一頁</button><span>第 {{ gearPage.page + 1 }}／{{ gearPage.pages }} 頁</span><button :disabled="gearPage.page + 1 >= gearPage.pages" @click="page = gearPage.page + 1">下一頁</button></div>
    <p class="muted help-text">每個部位只能穿戴一件；穿戴獵獲裝備會替換同部位的固定裝備，替下的物品仍在背包。比較只列出能力與機制差異，不把不同效果合併成總戰力分數。</p>
  </template>
  <template v-else-if="category === 'materials'">
    <section v-for="id in materials" :key="id" class="reward-material"><h3>{{ MATERIALS[id].name }} · 持有 {{ materialStacks?.[id] ?? 0 }}</h3><p class="muted">{{ MATERIALS[id].description }}</p><button :disabled="!canVisit(game.state, 'store') || !(materialStacks?.[id] ?? 0)" @click="game.act(() => tradeMaterial(game.state, id))">出售一份{{ MATERIALS[id].name }} · {{ MATERIALS[id].sell }} 金</button></section>
    <p class="muted help-text">請在營業時間靠近雜貨店交易；每次出售花費 5 分鐘。素材不會自動轉換或消失。</p>
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
