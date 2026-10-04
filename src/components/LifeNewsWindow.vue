<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Position } from '../domain/types'
import type { WorldRequest, WorldNews } from '../domain/life'
import { clockLabel } from '../engine/calendar'
import { fulfillRequest, projectLivingNews } from '../engine/livingEvents'
import { useGameStore } from '../stores/gameStore'

const emit = defineEmits<{ travel: [position: Position] }>()
const game = useGameStore()
const selectedScope = ref<WorldNews['scope'] | 'all'>('all')
const scopeFilters: { id: WorldNews['scope'] | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'local', label: '地方' },
  { id: 'regional', label: '區域' },
  { id: 'rumor', label: '傳聞' },
  { id: 'major', label: '重大' },
]
const scopeLabels: Record<WorldNews['scope'], string> = {
  local: '地方', regional: '區域', rumor: '傳聞', major: '重大',
}
const requestLabels: Record<WorldRequest['kind'], string> = {
  food: '糧食供應', hunt: '北方狩獵', iron: '鐵礦供應', medicine: '照料傷者',
}
const requestActions: Record<WorldRequest['kind'], string> = {
  food: '交付食物', hunt: '完成狩獵請求', iron: '交付鐵礦', medicine: '送上治療藥水',
}
const news = computed(() => projectLivingNews(game.state, 24)
  .filter(item => selectedScope.value === 'all' || item.scope === selectedScope.value))
const requests = computed(() => game.state.life.requests
  .filter(request => request.status === 'open')
  .slice(-8)
  .reverse())
const northernNews = computed(() => {
  if (game.state.threat.bossAlive) return '哥布林酋長已在北方現身。商路傳來襲擊消息，前往森林前先備妥裝備。'
  if (game.state.threat.threatLevel >= 3) return '北方怪物活動頻繁，居民開始擔心往來商路。'
  if (game.state.threat.threatLevel >= 2) return '樵夫看見林間足跡與營火，北方道路不再讓人安心。'
  return '林間暫時安靜，偶爾仍能看見野狼的蹤跡。'
})
const blocked = computed(() => !game.character.isAlive || !!game.state.combat || game.state.dungeon.inDungeon)

function deliverRequest(id: string) {
  game.act(() => fulfillRequest(game.state, id))
}

function requestRoute(request: WorldRequest) {
  if (request.kind === 'medicine') {
    const target = game.state.npcs.find(npc => npc.id === request.npcId && npc.isAlive)
    return target ? { position: target.position, label: `前往${target.name}身邊` } : null
  }
  if (request.kind === 'hunt' && request.progress < request.amount) {
    return { position: { x: 5, y: 4 }, label: '前往北方森林' }
  }
  return { position: { x: 10, y: 10 }, label: '前往橡谷廣場' }
}

function requestProgress(request: WorldRequest) {
  if (request.kind === 'hunt') return `狩獵進度 ${request.progress}／${request.amount}`
  if (request.kind === 'medicine') return `需要 ${request.amount} 瓶治療藥水`
  return `需要 ${request.amount} 份${request.kind === 'food' ? '食物' : '鐵礦'}`
}

function fulfill(request: WorldRequest) {
  deliverRequest(request.id)
}
</script>

<template>
  <section class="life-news-window" aria-labelledby="life-news-heading">
    <header class="life-news-intro">
      <p class="life-news-kicker">橡谷與周邊</p>
      <h3 id="life-news-heading">地方消息與委託</h3>
      <p class="muted">消息來自居民的近況、沿路傳聞，以及世界裡正在發生的事。</p>
    </header>

    <section class="life-news-threat" aria-labelledby="life-news-north-heading">
      <h4 id="life-news-north-heading">北方近況</h4>
      <p>{{ northernNews }}</p>
    </section>

    <section class="life-news-requests" aria-labelledby="life-news-requests-heading">
      <h4 id="life-news-requests-heading">眼前的請求</h4>
      <ul v-if="requests.length" class="request-list">
        <li v-for="request in requests" :key="request.id" class="request-entry">
          <div class="request-copy">
            <h5>{{ requestLabels[request.kind] }}</h5>
            <p>{{ requestProgress(request) }}</p>
            <small v-if="request.kind === 'medicine' && request.npcId">{{ game.state.npcs.find(npc => npc.id === request.npcId)?.name ?? '受傷居民' }}</small>
            <small>請於 {{ clockLabel(request.expiresAt) }} 前處理</small>
          </div>
          <div class="request-actions">
            <button class="primary" :disabled="blocked || request.expiresAt <= game.state.worldTime" @click="fulfill(request)">{{ requestActions[request.kind] }}</button>
            <button v-if="requestRoute(request)" :disabled="blocked" @click="emit('travel', requestRoute(request)!.position)">{{ requestRoute(request)!.label }}</button>
          </div>
          <p v-if="request.expiresAt <= game.state.worldTime" class="muted request-requirement">期限已過，等待世界更新這項請求的狀態。</p>
          <p v-else class="muted request-requirement">
            <template v-if="request.kind === 'hunt'">狩獵完成後，回到橡谷廣場附近交付。</template>
            <template v-else-if="request.kind === 'medicine'">靠近受傷居民，交付後會消耗治療藥水。</template>
            <template v-else>帶著所需物資，到橡谷廣場附近交付。</template>
          </p>
        </li>
      </ul>
      <p v-else class="empty-state">目前沒有待處理的請求。居民的需要會隨橡谷的生活而改變。</p>
    </section>

    <section class="life-news-ledger" aria-labelledby="life-news-recent-heading">
      <h4 id="life-news-recent-heading">最近的消息</h4>
      <div class="filter-buttons" role="group" aria-label="消息分類">
        <button v-for="filter in scopeFilters" :key="filter.id" :aria-pressed="selectedScope === filter.id" :class="{ selected: selectedScope === filter.id }" @click="selectedScope = filter.id">{{ filter.label }}</button>
      </div>
      <p v-if="!news.length" class="empty-state">這個分類暫時沒有新消息。過些日子，橡谷又會有自己的故事。</p>
      <ol v-else class="life-news-list">
        <li v-for="item in news" :key="item.id">
          <div class="life-news-meta"><time>{{ clockLabel(item.at) }}</time><span>{{ scopeLabels[item.scope] }}</span></div>
          <p>{{ item.text }}</p>
        </li>
      </ol>
    </section>
  </section>
</template>
