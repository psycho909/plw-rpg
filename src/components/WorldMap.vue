<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { BUILDINGS, CONFIG } from '../data/config'
import type { Position, Tile } from '../domain/types'
import { stages } from '../presentation/icons'
import { projectWorld } from '../presentation/worldProjection'
import { useGameStore } from '../stores/gameStore'

const props = withDefaults(defineProps<{ overview?: boolean }>(), { overview: false })
const emit = defineEmits<{ travel: [position: Position] }>()
const game = useGameStore()
const viewport = ref<HTMLElement>()
const map = ref<HTMLElement>()
const cells = computed(() => projectWorld(game.state))
async function followPlayer() {
  await nextTick()
  if (props.overview || !viewport.value || !map.value) return
  const tile = map.value.querySelector<HTMLElement>('.is-player')
  if (tile) viewport.value.scrollTo({ left: map.value.offsetLeft + tile.offsetLeft - (viewport.value.clientWidth - tile.clientWidth) / 2, top: map.value.offsetTop + tile.offsetTop - (viewport.value.clientHeight - tile.clientHeight) / 2, behavior: 'instant' })
}
watch(() => [game.character.position.x, game.character.position.y], followPlayer)
onMounted(() => { void followPlayer(); window.addEventListener('resize', followPlayer) })
onUnmounted(() => window.removeEventListener('resize', followPlayer))
function blocked(tile: Tile) { return !tile.walkable || !game.character.isAlive || !!game.state.combat || game.state.dungeon.inDungeon }
</script>

<template>
  <div ref="viewport" class="map-scroll" :class="{ 'overview-scroll': overview }">
    <div ref="map" class="world-map" :class="{ 'overview-map': overview }" :tabindex="overview ? -1 : 0" aria-label="橡谷世界地圖，WASD 或方向鍵移動，Enter 互動" :style="{ '--columns': CONFIG.width }">
      <button v-for="cell in cells" :key="cell.key" class="tile" :class="[cell.tile.discovered ? cell.tile.terrain : 'fog', { 'is-player': cell.isPlayer, 'is-building': cell.building, 'has-npc': cell.people.length, 'has-object': cell.mark || cell.building, 'threat-mark': cell.mark?.kind === 'threat' }]" :data-position="cell.key" :disabled="blocked(cell.tile)" tabindex="-1" :aria-label="cell.label" :title="cell.label" @click="emit('travel', cell.tile)">
        <span aria-hidden="true">{{ cell.icon }}</span>
        <small v-if="cell.building && !overview" class="building-name" aria-hidden="true">{{ BUILDINGS[cell.building].name }}</small>
        <b v-if="cell.people.length && (cell.building || cell.isPlayer || cell.people.length > 1)" class="resident-count" aria-hidden="true">{{ cell.people.length }}</b>
      </button>
      <span class="map-region forest-label">北方森林</span>
      <span class="map-region village-label">{{ game.state.settlement.name }} · {{ stages[game.state.settlement.stage] }}</span>
      <span class="map-region farm-label">東方農田</span>
      <span class="map-region mine-label">{{ game.state.regions.unknown.discovered ? '迷霧山谷' : '未知之地' }}</span>
    </div>
  </div>
</template>
