<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BUILDINGS, JOBS, REGIONS } from '../data/config'
import { activities, jobIcons, lifeStages } from '../presentation/icons'
import { distance } from '../engine/simulation'
import { useGameStore } from '../stores/gameStore'
import type { Position } from '../domain/types'
const props = defineProps<{ npcId: string }>()
const emit = defineEmits<{ travel: [position: Position] }>()
const game = useGameStore()
const talked = ref(false)
const npc = computed(() => game.state.npcs.find(n => n.id === props.npcId && n.isAlive))
const nearby = computed(() => !!npc.value && distance(game.character.position, npc.value.position) <= 1)
const location = computed(() => game.state.tiles.find(t => npc.value && distance(npc.value.position, t) === 0)?.regionId ?? 'village')
watch(() => props.npcId, () => talked.value = false)
const words = computed(() => {
  const n = npc.value
  if (!n) return ''
  if (n.currentActivity === 'sleep') return '今天先休息了，明天再聊吧。'
  if (game.state.threat.bossAlive) return '北方有酋長出沒。要去森林，記得準備好裝備。'
  if (n.job === 'farmer') return '小麥要長兩天。等它成熟時，我還會在田裡。'
  if (n.job === 'mercenary') return '想找同行的人？傍晚到酒館看看。'
  if (n.job === 'miner') return '礦場的石頭與鐵礦每天都會恢復，可以慢慢採。'
  return `我正在${REGIONS[location.value].name}${activities[n.currentActivity]}。橡谷每天都有些不一樣。`
})
</script>

<template>
  <section v-if="npc" class="npc-sheet"><div class="character-heading"><span class="portrait" aria-hidden="true">{{ jobIcons[npc.job] }}</span><div><h3>{{ npc.name }}</h3><p>{{ npc.age }} 歲 · {{ JOBS[npc.job].name }} · Lv.{{ npc.level }}</p></div></div>
    <dl class="info-lines"><dt>生命階段</dt><dd>{{ lifeStages[npc.lifeStage] }}</dd><dt>正在做什麼</dt><dd>{{ activities[npc.currentActivity] }}</dd><dt>所在位置</dt><dd>{{ REGIONS[location].name }} · {{ npc.position.x }}, {{ npc.position.y }}</dd></dl>
    <p v-if="talked" class="dialogue" aria-live="polite">「{{ words }}」</p><p v-if="!nearby" class="muted">居民已走遠。靠近後可以交談。</p>
    <div class="action-buttons"><button class="primary" :disabled="!nearby || !game.character.isAlive || !!game.state.combat || game.state.dungeon.inDungeon" @click="talked = true">交談</button><button v-if="npc.job === 'shopkeeper' || npc.job === 'blacksmith'" @click="emit('travel', BUILDINGS[npc.job === 'shopkeeper' ? 'store' : 'blacksmith'].position)">前往{{ npc.job === 'shopkeeper' ? '雜貨店' : '鐵匠鋪' }}</button><button v-if="npc.job === 'mercenary' && game.state.settlement.buildings.includes('tavern')" @click="emit('travel', BUILDINGS.tavern.position)">前往酒館</button></div>
  </section><p v-else class="empty-state">這位居民已離世。世界歷史仍會記得他。</p>
</template>
