import { BUILDINGS, CONFIG, DUNGEON, JOBS, MONSTERS } from '../data/config'
import { LIVING_EVENT_LIMITS } from '../data/livingEvents'
import { CONTENT_CROPS } from '../data/contentRegistry'
import { WOLF_ENCOUNTER_RULES, WOLF_MONSTERS } from '../data/rewards'
import type { GameState, Position, RegionId } from '../domain/types'
import { contentEncounterOptions } from '../engine/contentFamilies'
import { farmCropChoices } from '../engine/crops'
import { wolfEncounterOptions } from '../engine/wolfFamily'

export interface GoalHint {
  id: string
  what: string
  why: string
  where: string
  position: Position
}

const REGION_DESTINATIONS: Record<RegionId, { label: string; position: Position }> = {
  village: { label: '橡谷廣場', position: LIVING_EVENT_LIMITS.deliverySquare },
  farmland: { label: '東方農田', position: BUILDINGS.farm.position },
  forest: { label: '北方森林', position: JOBS.woodcutter.workplace },
  mine: { label: '灰石礦場', position: JOBS.miner.workplace },
  unknown: { label: DUNGEON.name, position: DUNGEON.position },
}

function requestDestination(state: GameState, request: GameState['life']['requests'][number]) {
  if (request.kind === 'medicine') {
    const npc = state.npcs.find(candidate => candidate.id === request.npcId && candidate.isAlive)
    return npc ? { label: `前往${npc.name}身邊`, position: npc.position } : null
  }
  if (request.kind === 'hunt' && request.progress < request.amount) return REGION_DESTINATIONS.forest
  return REGION_DESTINATIONS.village
}

/**
 * Contextual, display-only suggestions. Every candidate comes from persisted state or an
 * existing canonical projection; this never creates a quest, reserves an action, or mutates state.
 */
export function projectGoalHints(state: GameState): GoalHint[] {
  const hints: GoalHint[] = []
  const add = (hint: GoalHint) => { if (hints.length < 5) hints.push(hint) }
  const character = state.characters.find(candidate => candidate.id === state.activeCharacterId)
  const currentRegion = character?.currentRegion

  // Existing request projection/UI route: LifeNewsWindow.requestRoute and WorldRequest progress.
  for (const request of state.life.requests.filter(item => item.status === 'open' && item.expiresAt > state.worldTime).slice(-2).reverse()) {
    const labels = { food: '糧食供應', hunt: '北方狩獵', iron: '鐵礦供應', medicine: '照料傷者' } as const
    const destination = requestDestination(state, request)
    if (!destination) continue
    const why = request.kind === 'hunt'
      ? `狩獵進度 ${request.progress}／${request.amount}，期限依委託資料為 ${Math.max(0, Math.ceil((request.expiresAt - state.worldTime) / CONFIG.minutesPerDay))} 日內。`
      : `目前進度 ${request.progress}／${request.amount}，請求狀態仍為開啟。`
    add({ id: `request:${request.id}`, what: `回應「${labels[request.kind]}」`, why, where: destination.label, position: destination.position })
  }

  // Regional crisis phase is the canonical current world-state; the forest coordinate is the existing PlaceWindow destination.
  const crisis = state.regionalCrisis
  if (crisis.phase === 'warning' || crisis.phase === 'preparation' || crisis.phase === 'active') {
    add({
      id: `crisis:${crisis.id}`,
      what: '查看進行中的北方危機',
      why: `目前階段：${crisis.phase === 'warning' ? '警訊' : crisis.phase === 'preparation' ? '備戰' : '危機進行中'}。`,
      where: REGION_DESTINATIONS.forest.label,
      position: REGION_DESTINATIONS.forest.position,
    })
  }

  // farmCropChoices is the shared seasonal/region eligibility projection; only suggest when a plot is available.
  const hasPlotCapacity = state.crops.length + state.preparedPlots < CONFIG.maxPlots
  const availableCrop = currentRegion === 'farmland' && hasPlotCapacity
    ? farmCropChoices(state).find(choice => choice.status === 'available' && choice.id in CONTENT_CROPS)
    : undefined
  if (availableCrop) {
    add({
      id: `crop:${availableCrop.id}`,
      what: `可在本季種植${availableCrop.name}`,
      why: `${availableCrop.name}的註冊季節包含目前時節；預估收成 ${availableCrop.harvestAmount} 份。`,
      where: REGION_DESTINATIONS.farmland.label,
      position: REGION_DESTINATIONS.farmland.position,
    })
  }

  // Eligibility and blocker reasons are read from the same engine projections used by PlaceWindow.
  const contentTarget = contentEncounterOptions(state).find(option => option.eligible && option.rank !== 'normal')
  if (contentTarget && currentRegion) {
    add({
      id: `encounter:${contentTarget.definitionId}`,
      what: `可追蹤${contentTarget.label}（${contentTarget.rank === 'boss' ? '首領' : contentTarget.rank === 'elite' ? '精英' : '小首領'}）`,
      why: `引擎資格投影目前允許追蹤此目標。`,
      where: REGION_DESTINATIONS[currentRegion].label,
      position: REGION_DESTINATIONS[currentRegion].position,
    })
  }

  const wolfBoss = wolfEncounterOptions(state).find(option => option.rank === 'boss' && option.eligible)
  if (wolfBoss && currentRegion === 'forest') {
    add({
      id: `wolf:${wolfBoss.definitionId}`,
      what: `可追蹤${wolfBoss.label}`,
      why: `狼族追蹤投影目前允許挑戰；追蹤消耗 ${WOLF_ENCOUNTER_RULES.staminaCost} 體力。`,
      where: REGION_DESTINATIONS.forest.label,
      position: REGION_DESTINATIONS.forest.position,
    })
  }

  // Existing chief spawn state and authored monster data; no threat formula is recomputed here.
  if (state.threat.bossAlive && currentRegion === 'forest' && hints.length < 5) {
    add({
      id: 'boss:goblin-chief',
      what: `哥布林酋長已現身（怪物 Lv.${MONSTERS.chief.level}）`,
      why: '現有世界狀態標記首領仍在場。',
      where: REGION_DESTINATIONS.forest.label,
      position: REGION_DESTINATIONS.forest.position,
    })
  }

  return hints.slice(0, 5)
}
