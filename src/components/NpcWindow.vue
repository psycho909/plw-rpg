<script setup lang="ts">
import { computed } from 'vue'
import { BUILDINGS, JOBS, REGIONS } from '../data/config'
import { NPC_CAREER_LABELS } from '../data/npcLife'
import type { ImportantMemory } from '../domain/life'
import type { Position } from '../domain/types'
import { clockLabel, lifeStage } from '../engine/calendar'
import { distance } from '../engine/simulation'
import { talkNpc } from '../engine/npcLife'
import { projectNpc, projectNpcLife } from '../presentation/lifeProjection'
import { activities, jobIcons, lifeStages } from '../presentation/icons'
import { useGameStore } from '../stores/gameStore'

const props = defineProps<{ npcId: string }>()
const emit = defineEmits<{ travel: [position: Position] }>()
const game = useGameStore()
const npc = computed(() => projectNpc(game.state, props.npcId))
const npcLife = computed(() => projectNpcLife(game.state, props.npcId))
const nearby = computed(() => !!npc.value && distance(game.character.position, npc.value.position) <= 1)
const location = computed(() => game.state.tiles.find(tile => npc.value && distance(npc.value.position, tile) === 0)?.regionId ?? 'village')
const visibleMemories = computed(() => (npcLife.value?.memories ?? [])
  .filter(memory => memory.actorId === game.character.id)
  .slice(-6)
  .reverse())
const personalMemoryCount = computed(() => (npcLife.value?.memories ?? []).filter(memory =>
  memory.actorId === game.character.id && PERSONAL_MEMORIES.has(memory.kind),
).length)
const familiarity = computed(() => personalMemoryCount.value === 0 ? '還不熟'
  : personalMemoryCount.value === 1 ? '對你有印象' : '記得和你經歷過的事')
const career = computed(() => npcLife.value?.career ?? 'resident')
const visitor = computed(() => {
  const current = npcLife.value?.visitor
  return current && current.until > game.state.worldTime ? current : undefined
})
const knownRole = computed(() => {
  if (visitor.value) return `${VISITOR_LABELS[visitor.value.kind]}旅人`
  if (!npc.value) return ''
  const job = npcLife.value?.careerJob ?? npc.value.job
  return `${NPC_CAREER_LABELS[career.value]} · ${JOBS[job].name}`
})
const visitorDeparture = computed(() => visitor.value
  ? `這位旅人預計在 ${clockLabel(visitor.value.until)} 離開橡谷。`
  : '')
const memoryText: Record<ImportantMemory['kind'], string> = {
  PLAYER_HELPED_ME: '你曾幫助過我',
  PLAYER_HIRED_ME: '你曾邀我同行',
  PLAYER_SAVED_ME: '你曾救過我',
  PLAYER_FAILED_ME: '我記得那次沒有成功',
  PLAYER_DEFENDED_OAKVALE: '我聽說你曾守住橡谷',
  PLAYER_OWNS_FARM: '我知道你在橡谷有一座農場',
  PLAYER_SUPPORTED_FOOD: '我記得你曾為聚落供應食物',
  GOBLIN_CHIEF_DEFEATED: '我聽說你擊退了哥布林酋長',
  DUNGEON_DISCOVERED: '我知道你發現了山谷裡的礦坑',
  MAJOR_DISASTER: '我記得你曾參與一場大事',
}
const PERSONAL_MEMORIES = new Set<ImportantMemory['kind']>([
  'PLAYER_HELPED_ME', 'PLAYER_HIRED_ME', 'PLAYER_SAVED_ME', 'PLAYER_FAILED_ME',
])
const VISITOR_LABELS = { elf: '精靈', mage: '法師', knight: '騎士', adventurer: '冒險者', merchant: '商人' } as const

function talk() {
  game.act(() => talkNpc(game.state, props.npcId))
}
</script>

<template>
  <section v-if="npc" class="npc-sheet" aria-labelledby="npc-name">
    <header class="character-heading">
      <span class="portrait" aria-hidden="true">{{ jobIcons[npc.job] }}</span>
      <div><h3 id="npc-name">{{ npc.name }}</h3><p>{{ npc.age }} 歲 · {{ lifeStages[lifeStage(npc.age)] }}</p></div>
    </header>

    <dl class="info-lines npc-life-facts">
      <dt>職涯</dt><dd>{{ NPC_CAREER_LABELS[career] }}</dd>
      <dt>大家認得</dt><dd>{{ knownRole }}</dd>
      <dt>正在做什麼</dt><dd>{{ activities[npc.currentActivity] }}</dd>
      <dt>所在位置</dt><dd>{{ REGIONS[location].name }}</dd>
      <dt>熟悉度</dt><dd>{{ familiarity }}</dd>
    </dl>

    <p v-if="visitorDeparture" class="muted npc-visitor-note">{{ visitorDeparture }}</p>

    <section class="npc-concern" aria-labelledby="npc-concern-heading">
      <h4 id="npc-concern-heading">眼前掛心的事</h4>
      <p>「{{ npcLife?.concern ?? '忙著過好今天。' }}」</p>
    </section>

    <section class="npc-known-memories" aria-labelledby="npc-memories-heading">
      <h4 id="npc-memories-heading">他記得與你有關的事</h4>
      <ul v-if="visibleMemories.length">
        <li v-for="memory in visibleMemories" :key="`${memory.kind}:${memory.at}`">
          <p>{{ memoryText[memory.kind] }}</p>
          <small>{{ clockLabel(memory.at) }}<span v-if="memory.detail"> · {{ memory.detail }}</span></small>
        </li>
      </ul>
      <p v-else class="muted">你們之間還沒有留下共同回憶。</p>
    </section>

    <p v-if="!nearby" class="muted npc-distance-note">居民已走遠。靠近後才可以交談。</p>
    <div class="action-buttons">
      <button class="primary" :disabled="!nearby || !game.character.isAlive || !!game.state.combat || game.state.dungeon.inDungeon" @click="talk">交談</button>
      <button v-if="npc.job === 'shopkeeper' || npc.job === 'blacksmith'" @click="emit('travel', BUILDINGS[npc.job === 'shopkeeper' ? 'store' : 'blacksmith'].position)">前往{{ npc.job === 'shopkeeper' ? '雜貨店' : '鐵匠鋪' }}</button>
      <button v-if="npc.job === 'mercenary' && game.state.settlement.buildings.includes('tavern')" @click="emit('travel', BUILDINGS.tavern.position)">前往酒館</button>
    </div>
    <p class="muted npc-dialogue-help">交談會留下當下的回應；居民只知道自己親身經歷或聽聞的事。</p>
  </section>
  <p v-else class="empty-state">這位居民已離世。世界歷史仍會記得他。</p>
</template>
