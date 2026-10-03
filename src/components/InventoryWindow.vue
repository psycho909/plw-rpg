<script setup lang="ts">
import { computed, ref } from 'vue'
import { EQUIPMENT, ITEMS } from '../data/config'
import type { ItemId } from '../domain/types'
import { combatTurn, equip, usePotion } from '../engine/actions'
import { itemIcons } from '../presentation/icons'
import { useGameStore } from '../stores/gameStore'
const game = useGameStore()
const selected = ref<ItemId>('potion')
const items = Object.keys(ITEMS) as ItemId[]
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
  <div class="inventory-layout">
    <div class="item-list" role="group" aria-label="選擇物品"><button v-for="item in items" :key="item" :aria-pressed="selected === item" :class="{ selected: selected === item }" @click="selected = item"><span>{{ itemIcons[item] }} {{ ITEMS[item].name }}</span><span>×{{ game.character.inventory[item] }}</span></button></div>
    <section class="item-detail" aria-live="polite"><span class="item-portrait" aria-hidden="true">{{ itemIcons[selected] }}</span><h3>{{ ITEMS[selected].name }}</h3><p>{{ descriptions[selected] }}</p><p class="muted">持有 {{ game.character.inventory[selected] }} · 出售 {{ ITEMS[selected].sell }} 金幣</p>
      <button v-if="['sword', 'armor', 'potion'].includes(selected)" class="primary" :disabled="!game.character.inventory[selected] || !game.character.isAlive || (selected !== 'potion' && !!game.state.combat)" @click="useSelected">{{ selected === 'potion' ? '使用藥水' : equipped ? '卸下裝備' : '裝備' }}</button>
      <p v-if="game.state.combat && selected !== 'potion'" class="muted">戰鬥中無法更換裝備。</p>
      <p v-if="!game.character.inventory[selected]" class="muted">背包裡還沒有這件物品。</p>
    </section>
  </div>
  <p class="muted help-text">素材交易請走到雜貨店；裝備購買請前往鐵匠鋪。</p>
</template>
