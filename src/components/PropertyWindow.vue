<script setup lang="ts">
import { computed, ref } from 'vue'
import { BUILDINGS, ITEMS } from '../data/config'
import { MAX_FOOD_PER_SUPPLY, PROPERTY_DEFINITIONS, STORAGE_PER_ITEM_LIMIT } from '../data/ownership'
import type { PropertyKind } from '../engine/ownership'
import { buyProperty, homeRest, propertyEligibility, supplyFarmFood, transferStorage } from '../engine/ownership'
import { distance } from '../engine/simulation'
import { itemIcons } from '../presentation/icons'
import { projectProperties } from '../presentation/lifeProjection'
import { useGameStore } from '../stores/gameStore'
import type { ItemId, Position } from '../domain/types'

const emit = defineEmits<{ travel: [position: Position] }>()
const game = useGameStore()
const propertyKinds: PropertyKind[] = ['home', 'land', 'farmBusiness']
const itemIds: ItemId[] = ['wood', 'stone', 'iron', 'food', 'material', 'potion', 'sword', 'armor']
const storageAmount = ref(1)
const foodAmount = ref(1)
const actorId = computed(() => game.character.id)
const holdings = computed(() => projectProperties(game.state, actorId.value))
const home = computed(() => holdings.value.find(property => property.kind === 'home'))
const land = computed(() => holdings.value.find(property => property.kind === 'land'))
const farmBusiness = computed(() => holdings.value.find(property => property.kind === 'farmBusiness'))
const offers = computed(() => propertyKinds.map(kind => propertyEligibility(game.state, kind)))
const blocked = computed(() => !game.character.isAlive || !!game.state.combat || game.state.dungeon.inDungeon)
const nearHome = computed(() => !!home.value && distance(game.character.position, home.value.position) <= 1)
const nearFarm = computed(() => distance(game.character.position, BUILDINGS.farm.position) <= 1)
const storageItems = computed(() => itemIds.filter(item => (game.character.inventory[item] ?? 0) > 0 || (home.value?.storage[item] ?? 0) > 0).slice(0, 8))
const canSupply = computed(() => Number.isSafeInteger(foodAmount.value) && foodAmount.value > 0
  && foodAmount.value <= Math.min(game.character.inventory.food, MAX_FOOD_PER_SUPPLY))

function siteFor(kind: PropertyKind): Position {
  return BUILDINGS[PROPERTY_DEFINITIONS[kind].location].position
}
function nearSite(kind: PropertyKind) {
  return distance(game.character.position, siteFor(kind)) <= 1
}
function transferLimit(item: ItemId, deposit: boolean) {
  if (!home.value) return 0
  const carried = game.character.inventory[item] ?? 0
  const stored = home.value.storage[item] ?? 0
  return deposit ? Math.min(carried, STORAGE_PER_ITEM_LIMIT - stored) : stored
}
function canTransfer(item: ItemId, deposit: boolean) {
  return nearHome.value && !blocked.value && Number.isSafeInteger(storageAmount.value)
    && storageAmount.value > 0 && storageAmount.value <= transferLimit(item, deposit)
}
function buy(kind: PropertyKind) {
  game.act(() => buyProperty(game.state, kind))
}
function restAtHome() {
  game.act(() => homeRest(game.state))
}
function moveItem(item: ItemId, deposit: boolean) {
  game.act(() => transferStorage(game.state, item, storageAmount.value, deposit))
}
function provideFood() {
  game.act(() => supplyFarmFood(game.state, foodAmount.value))
}
</script>

<template>
  <section class="property-window" aria-labelledby="property-heading">
    <header class="property-intro">
      <p class="property-kicker">屬於這一代的生活據點</p>
      <h3 id="property-heading">住所、土地與農場</h3>
      <p class="muted">每項產業都在橡谷有實際位置。要取得或使用它，先走到附近。</p>
    </header>

    <section class="property-ledger-section" aria-labelledby="property-offers-heading">
      <h4 id="property-offers-heading">可以建立的據點</h4>
      <ul class="property-offers">
        <li v-for="offer in offers" :key="offer.kind" class="property-offer">
          <div class="property-offer-copy">
            <h5>{{ offer.label }}<span v-if="holdings.some(property => property.kind === offer.kind)" class="property-owned">已擁有</span></h5>
            <p class="property-cost">費用：{{ offer.cost.gold }} 金<span v-if="offer.cost.reputation"> · 地方聲望 {{ offer.cost.reputation }}</span></p>
            <ul v-if="!holdings.some(property => property.kind === offer.kind) && offer.reasons.length" class="property-reasons" :id="`property-reasons-${offer.kind}`">
              <li v-for="reason in offer.reasons" :key="reason">{{ reason }}</li>
            </ul>
            <p v-else class="muted property-ready">{{ holdings.some(property => property.kind === offer.kind) ? '這項產業已屬於你。' : '已符合取得條件。' }}</p>
          </div>
          <div class="property-offer-actions">
            <button v-if="!holdings.some(property => property.kind === offer.kind)" class="primary" :disabled="!offer.eligible" :aria-describedby="offer.reasons.length ? `property-reasons-${offer.kind}` : undefined" @click="buy(offer.kind)">取得{{ offer.label }}</button>
            <button v-if="!nearSite(offer.kind) && !holdings.some(property => property.kind === offer.kind)" @click="emit('travel', siteFor(offer.kind))">前往{{ PROPERTY_DEFINITIONS[offer.kind].location === 'house' ? '自宅' : '農田' }}</button>
          </div>
        </li>
      </ul>
    </section>

    <section class="property-ledger-section" aria-labelledby="property-home-heading">
      <h4 id="property-home-heading">自宅</h4>
      <template v-if="home">
        <p class="property-note">回到自己的屋簷下，能好好休息，也能把物品留在家中。</p>
        <p v-if="!nearHome" class="muted property-distance">目前不在自宅附近。需要走回家，才能休息或存取物品。</p>
        <div class="property-action-line">
          <button class="primary" :disabled="blocked || !nearHome" @click="restAtHome">在自宅休息一夜</button>
          <button v-if="!nearHome" @click="emit('travel', home.position)">前往自宅</button>
        </div>

        <div class="storage-ledger" aria-labelledby="property-storage-heading">
          <h5 id="property-storage-heading">家中儲物</h5>
          <label class="property-quantity" for="storage-amount">每次存取數量
            <input id="storage-amount" v-model.number="storageAmount" type="number" min="1" :max="STORAGE_PER_ITEM_LIMIT" step="1" inputmode="numeric">
          </label>
          <ul v-if="storageItems.length" class="storage-list">
            <li v-for="item in storageItems" :key="item">
              <div><strong>{{ itemIcons[item] }} {{ ITEMS[item].name }}</strong><small>背包 {{ game.character.inventory[item] }} · 家中 {{ home.storage[item] ?? 0 }} / {{ STORAGE_PER_ITEM_LIMIT }}</small></div>
              <div class="storage-actions">
                <button :disabled="!canTransfer(item, true)" @click="moveItem(item, true)">存入</button>
                <button :disabled="!canTransfer(item, false)" @click="moveItem(item, false)">取出</button>
              </div>
            </li>
          </ul>
          <p v-else class="empty-state">背包和家中目前都沒有可存取的物品。</p>
        </div>
      </template>
      <p v-else class="empty-state">取得自宅後，才能在附近休息與使用儲物空間。</p>
    </section>

    <section class="property-ledger-section" aria-labelledby="property-farm-heading">
      <h4 id="property-farm-heading">土地與農場事業</h4>
      <template v-if="land && farmBusiness">
        <p class="property-note">農場已在橡谷運作。你可以把背包裡的食物送進聚落的糧食供應。</p>
        <p class="property-supply-history">已提供 {{ farmBusiness.foodSupplied }} 份食物。</p>
        <label class="property-quantity" for="farm-food-amount">提供食物數量
          <input id="farm-food-amount" v-model.number="foodAmount" type="number" min="1" :max="Math.min(game.character.inventory.food, MAX_FOOD_PER_SUPPLY)" step="1" inputmode="numeric">
        </label>
        <p class="muted property-distance">背包食物：{{ game.character.inventory.food }} 份 · 每次最多 {{ MAX_FOOD_PER_SUPPLY }} 份；請在農田旁操作。</p>
        <div class="property-action-line">
          <button class="primary" :disabled="blocked || !nearFarm || !canSupply" @click="provideFood">提供給聚落</button>
          <button v-if="!nearFarm" @click="emit('travel', BUILDINGS.farm.position)">前往農田</button>
        </div>
      </template>
      <template v-else>
        <p class="property-note">先取得農地，再建立農場事業。農場不是自動收入；耕作與供糧仍由你親自參與。</p>
        <p v-if="!nearFarm" class="muted property-distance">農地與事業都在東方農田附近取得。</p>
        <button v-if="!nearFarm" @click="emit('travel', BUILDINGS.farm.position)">前往農田</button>
      </template>
    </section>
  </section>
</template>
