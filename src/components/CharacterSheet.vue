<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { lifeStages } from '../presentation/icons'
import { projectEquipmentSlot } from '../presentation/rewardProjection'
import PixelMeter from './PixelMeter.vue'
const game = useGameStore()
const stats = { strength: '力量', vitality: '體質', dexterity: '敏捷', intelligence: '智力' }
const skills = { combat: '戰鬥', farming: '耕作', mining: '採礦', woodcutting: '伐木', smithing: '鍛造' }
</script>

<template>
  <section class="character-sheet">
    <div class="character-heading"><span class="portrait" aria-hidden="true">🙂</span><div><h3>{{ game.character.name }}</h3><p>{{ game.character.age }} 歲 · {{ lifeStages[game.character.lifeStage] }}</p></div><strong>Lv.{{ game.character.level }}</strong></div>
    <PixelMeter label="生命" :value="game.character.hp" :max="game.character.maxHp" />
    <PixelMeter label="體力" :value="game.character.stamina" :max="game.character.maxStamina" />
    <PixelMeter label="經驗" :value="game.character.exp" :max="game.character.level * 30" />
    <dl class="stat-lines"><template v-for="(label, id) in stats" :key="id"><dt>{{ label }}</dt><dd>{{ game.character.stats[id] }}</dd></template></dl>
    <h3 class="section-title">裝備</h3><p class="equipment-line"><span>武器：{{ projectEquipmentSlot(game.state, 'weapon').name }}</span><span>防具：{{ projectEquipmentSlot(game.state, 'armor').name }}</span></p>
    <h3 class="section-title">熟練度</h3><div v-for="(label, id) in skills" :key="id" class="skill-line"><span>{{ label }} Lv.{{ game.character.skills[id].level }}</span><PixelMeter :label="`${label}經驗`" :value="game.character.skills[id].exp" :max="game.character.skills[id].level * 20" /></div>
    <p class="muted help-text">耕作提升收成，採集提升效率，戰鬥提升傷害，鍛造熟練度來自成功製作。年齡會改變體力上限。</p>
  </section>
</template>
