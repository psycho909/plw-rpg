<script setup lang="ts">
import { computed } from 'vue'
import { DUNGEON, MONSTERS } from '../data/config'
import { ITEM_BASES, MATERIALS, RARITIES } from '../data/rewards'
import type { MaterialId, RarityId } from '../domain/reward'
import { combatTurn, encounter, leaveDungeon } from '../engine/actions'
import { wolfRewardExpectation } from '../engine/itemGeneration'
import { wolfCombatPresentation } from '../engine/wolfFamily'
import { monsterIcons } from '../presentation/icons'
import { useGameStore } from '../stores/gameStore'
import PixelMeter from './PixelMeter.vue'
const game = useGameStore()
const family = computed(() => wolfCombatPresentation(game.state))
const monster = computed(() => family.value ?? (game.state.combat ? MONSTERS[game.state.combat.monsterId as keyof typeof MONSTERS] : null))
const rewardForecast = computed(() => {
  const definitionId = game.state.combat?.familyEncounter?.definitionId
  if (!definitionId) return null
  const expectation = wolfRewardExpectation(definitionId)
  const rate = (value: number) => new Intl.NumberFormat('zh-TW', { style: 'percent', maximumFractionDigits: 1 }).format(value)
  const quality = (Object.entries(expectation.rarityChances) as [RarityId, number][])
    .filter(([, chance]) => chance > 0).map(([id, chance]) => `${RARITIES[id].name} ${rate(chance)}`).join('、')
  const materials = (Object.entries(expectation.guaranteedMaterials) as [MaterialId, number][])
    .map(([id, amount]) => `${MATERIALS[id].name} ×${amount}`).join('、')
  const chanceMaterials = (Object.entries(expectation.chanceMaterials) as [MaterialId, number][])
    .map(([id, chance]) => `${MATERIALS[id].name} ${rate(chance)}`).join('、') || '無'
  const exclusive = expectation.exclusiveBase ? ` · 首領限定：${ITEM_BASES[expectation.exclusiveBase].name}` : ''
  return `若擊退：獵裝 ${rate(expectation.gearChance)} · 掉落 Lv.${expectation.dropLevel} · 品質（掉落裝備時） ${quality} · 保底 ${materials || '無'} · 機率素材 ${chanceMaterials}${exclusive}`
})
const commands = [{ id: 'attack' as const, label: '攻擊' }, { id: 'defend' as const, label: '防禦' }, { id: 'potion' as const, label: '使用藥水' }, { id: 'run' as const, label: '逃跑' }]
</script>

<template>
  <section v-if="game.state.combat && monster" class="battle-scene">
    <div class="enemy-portrait" aria-hidden="true">{{ monsterIcons[game.state.combat.monsterId as keyof typeof monsterIcons] }}</div><h3>{{ !family && game.state.combat.elite ? '精英 ' : '' }}{{ monster.name }} · Lv.{{ monster.level }}</h3>
    <PixelMeter label="怪物生命" :value="game.state.combat.hp" :max="game.state.combat.maxHp" />
    <section v-if="family" class="wolf-fight-details" aria-label="狼族特性">
      <p class="muted">{{ family.rankLabel }}{{ family.variant ? ` · ${family.variant.name}` : '' }}</p>
      <p v-for="trait in family.traits" :key="trait.id" class="muted"><strong>{{ trait.name }}</strong> · {{ trait.description }}</p>
      <p v-if="family.variant" class="muted">{{ family.variant.description }}</p>
    </section>
    <p v-if="rewardForecast" class="wolf-reward-forecast" data-wolf-reward-forecast>{{ rewardForecast }}</p>
    <div class="battle-divider" aria-hidden="true">─────── ⚔ ───────</div>
    <p>🙂 {{ game.character.name }} · Lv.{{ game.character.level }}</p><PixelMeter label="主角生命" :value="game.character.hp" :max="game.character.maxHp" /><PixelMeter label="主角體力" :value="game.character.stamina" :max="game.character.maxStamina" />
    <p v-if="family?.cue" class="rumor wolf-turn-cue" role="status" aria-live="polite">{{ family.cue }}</p>
    <p class="muted help-text">回合制戰鬥 · 藥水 {{ game.character.inventory.potion }} · 防禦減少本回合傷害，逃跑會離開地下城。</p>
    <div class="battle-commands"><button v-for="command in commands" :key="command.id" :class="{ primary: command.id === 'attack' }" :disabled="command.id === 'potion' && !game.character.inventory.potion" @click="game.act(() => combatTurn(game.state, command.id))">{{ command.label }}</button></div>
  </section>
  <section v-else-if="game.state.dungeon.inDungeon" class="dungeon-scene"><p>🕳️ {{ DUNGEON.name }} · 第 {{ game.state.dungeon.stage + 1 }} 段／3</p>
    <div class="dungeon-route" aria-label="地下城進度"><div v-for="(name, i) in ['入口', '深處', '守衛首領']" :key="name" :class="{ selected: i === game.state.dungeon.stage }"><span>{{ i < game.state.dungeon.stage ? '✓' : i === game.state.dungeon.stage ? '🙂' : '?' }}</span><span>{{ name }}</span></div></div>
    <p class="muted">深處依序有普通怪、精英與守衛首領。這是探索進度，不是可步行的地下城地圖。</p>
    <div class="action-buttons"><button class="primary" :disabled="game.character.stamina < 8 || !game.character.isAlive" @click="game.act(() => encounter(game.state))">探索下一段 · 體力 8</button><button @click="game.act(() => leaveDungeon(game.state))">離開礦坑</button></div>
  </section>
</template>
