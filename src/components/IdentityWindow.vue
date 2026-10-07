<script setup lang="ts">
import { computed } from 'vue'
import { PROPERTY_DEFINITIONS } from '../data/ownership'
import type { IdentityId } from '../domain/life'
import { clockLabel } from '../engine/calendar'
import { reputationLabel } from '../engine/identity'
import { projectCharacterLife } from '../presentation/lifeProjection'
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()
const life = computed(() => projectCharacterLife(game.state, game.character.id))
const identities: Record<IdentityId, string> = {
  resident: '居民',
  farmer: '農夫',
  skilledFarmer: '熟練農夫',
  miner: '礦工',
  skilledMiner: '熟練礦工',
  adventurer: '冒險者',
  veteran: '資深冒險者',
  farmOwner: '農場主人',
  smith: '鍛造師',
  masterpieceCrafter: '傑作匠師',
}
const knownIdentities = computed(() => (life.value?.identities ?? []).map(id => identities[id]))
const recentMilestones = computed(() => (life.value?.milestones ?? []).slice(-8).reverse())
const holdings = computed(() => game.state.life.properties
  .filter(property => property.ownerId === game.character.id)
  .slice(-6)
  .reverse())
const reputation = computed(() => life.value ? reputationLabel(life.value.reputation) : '尚未留下名聲')
const origin = computed(() => life.value?.origin === 'OTHER_WORLD' ? '來自另一個世界' : '在這個世界出生')
</script>

<template>
  <section class="identity-window" aria-labelledby="identity-heading">
    <header class="identity-intro">
      <p class="identity-kicker">第 {{ life?.generation ?? 1 }} 代 · {{ origin }}</p>
      <h3 id="identity-heading">{{ game.character.name }} 在橡谷留下的身分</h3>
    </header>

    <section class="identity-ledger-section" aria-labelledby="identity-roles-heading">
      <h4 id="identity-roles-heading">這一生的身分</h4>
      <ul v-if="knownIdentities.length" class="identity-roles">
        <li v-for="identity in knownIdentities" :key="identity"><span aria-hidden="true">▪</span>{{ identity }}</li>
      </ul>
      <p v-else class="empty-state">這段人生還沒有新的稱號。</p>
    </section>

    <section class="identity-reputation" aria-labelledby="identity-reputation-heading">
      <div>
        <h4 id="identity-reputation-heading">橡谷人們對你的印象</h4>
        <p class="identity-reputation-label">{{ reputation }}</p>
      </div>
      <p class="muted">地方聲望會影響居民如何認識你，也會影響土地資格與傭兵聘用條件。</p>
    </section>

    <section class="identity-ledger-section" aria-labelledby="identity-milestones-heading">
      <h4 id="identity-milestones-heading">人生記事</h4>
      <ol v-if="recentMilestones.length" class="life-timeline">
        <li v-for="milestone in recentMilestones" :key="milestone.id">
          <time>{{ clockLabel(milestone.at) }}</time>
          <p>{{ milestone.text }}</p>
        </li>
      </ol>
      <p v-else class="empty-state">日子還在累積。重要的轉變會留在這裡。</p>
    </section>

    <section class="identity-ledger-section" aria-labelledby="identity-holdings-heading">
      <h4 id="identity-holdings-heading">名下產業</h4>
      <ul v-if="holdings.length" class="identity-holdings">
        <li v-for="property in holdings" :key="property.id">
          <strong>{{ PROPERTY_DEFINITIONS[property.kind].label }}</strong>
          <time>取得於 {{ clockLabel(property.acquiredAt) }}</time>
        </li>
      </ul>
      <p v-else class="empty-state">目前還沒有屬於你的一處產業。</p>
    </section>
  </section>
</template>
