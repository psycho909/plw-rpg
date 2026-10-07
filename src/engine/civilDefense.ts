import { CONFIG } from '../data/config'
import type { RegionalCrisisState } from '../domain/crisis'
import type { GameState } from '../domain/types'
import { npcCanWork } from './npcLife'
import { population } from './simulation'

const DAY = CONFIG.minutesPerDay
const FOOD_THRESHOLD = CONFIG.regionalCrisis.lowFoodThreshold

type CivilDefensePhase = 'warning' | 'preparation' | 'active' | 'resolution'
type ActiveCrisis = Extract<RegionalCrisisState, { phase: CivilDefensePhase }>
type FactorId = 'defenders' | 'combat' | 'equipment' | 'supply' | 'safety' | 'adult_logistics'
  | 'stage' | 'prosperity' | 'infrastructure'
type NeedId = 'defenders' | 'food' | 'equipment'

export interface CivilDefenseFactor {
  id: FactorId
  observed: number
  points: number
  maximum: number
}

export interface CivilDefenseNeed {
  id: NeedId
  current: number
  required: number
  shortage: number
}

export interface CivilDefenseReadiness {
  phase: CivilDefensePhase
  readiness: number
  threatDemand: number
  margin: number
  successChance: number
  availableDefenders: number
  targetDefenders: number
  equippedDefenderSlots: number
  timeline: {
    remainingWarningDays: number
    remainingPreparationDays: number
    remainingActiveDays: number
    foodForecastDays: number
    defenseWindowDays: number
  }
  food: {
    dailyNet: number
    projectedAtResolution: number
    shortage: number
    coverage: number
  }
  threatTrace: {
    causeFloor: number
    currentPressure: number
    selected: 'cause' | 'current'
  }
  factors: CivilDefenseFactor[]
  needs: CivilDefenseNeed[]
  capacity: {
    defenderSlots: number
    equipmentSlots: number
    foodPoints: number
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, value))
}

function isActiveCrisis(crisis: RegionalCrisisState): crisis is ActiveCrisis {
  return crisis.phase === 'warning' || crisis.phase === 'preparation'
    || crisis.phase === 'active' || crisis.phase === 'resolution'
}

function eligibleWorkers(state: GameState) {
  return state.npcs.filter(npc => npcCanWork(state, npc.id)
    && npc.injuredUntil <= state.worldTime
    && !state.party.some(contract => contract.npcId === npc.id))
}

function phaseDays(state: GameState, crisis: ActiveCrisis) {
  let warning = 0
  let preparation = 0
  let active = 0
  if (crisis.phase === 'warning') {
    warning = clamp((crisis.phaseEndsAt - state.worldTime) / DAY, 0, CONFIG.regionalCrisis.warningDays)
    preparation = CONFIG.regionalCrisis.preparationDays
    active = CONFIG.regionalCrisis.activeDays
  } else if (crisis.phase === 'preparation') {
    preparation = clamp((crisis.phaseEndsAt - state.worldTime) / DAY, 0, CONFIG.regionalCrisis.preparationDays)
    active = CONFIG.regionalCrisis.activeDays
  } else if (crisis.phase === 'active') {
    active = clamp((crisis.phaseEndsAt - state.worldTime) / DAY, 0, CONFIG.regionalCrisis.activeDays)
  }
  return {
    remainingWarningDays: warning,
    remainingPreparationDays: preparation,
    remainingActiveDays: active,
    foodForecastDays: warning + preparation + active,
    defenseWindowDays: preparation + active,
  }
}

function pressure(level: number, monsterPopulation: number, bossAlive: boolean) {
  return clamp(20 + 14 * clamp(level, 1, CONFIG.threatThresholds.length)
    + 0.2 * Math.max(0, clamp(monsterPopulation, 0, 100) - 30)
    + (bossAlive ? 8 : 0), 0, 100)
}

function factor(id: FactorId, observed: number, points: number, maximum: number): CivilDefenseFactor {
  return { id, observed, points: clamp(points, 0, maximum), maximum }
}

/** Derive current world readiness for an in-progress crisis without changing state or RNG. */
export function deriveCivilDefense(state: GameState, crisis: RegionalCrisisState): CivilDefenseReadiness | null {
  if (!isActiveCrisis(crisis)) return null

  const workers = eligibleWorkers(state)
  const defenders = workers.filter(npc => npc.job === 'guard' || npc.job === 'mercenary')
  const targetDefenders = Math.min(8, 2 + 2 * clamp(crisis.severity, 1, 3))
  const defenderCapacity = Math.min(defenders.length, targetDefenders)
  const equipmentCapacity = defenderCapacity * 2
  const equippedSlots = Math.min(equipmentCapacity, defenders.reduce((count, npc) => count
    + (npc.equipment.weapon === 'sword' ? 1 : 0)
    + (npc.equipment.armor === 'armor' ? 1 : 0), 0))
  const averageCombatSkill = defenders.length === 0 ? 0 : defenders.reduce((total, npc) =>
    total + clamp(npc.skills.combat.level, 1, 10), 0) / defenders.length
  const otherWorkers = Math.max(0, workers.length - defenders.length)
  const days = phaseDays(state, crisis)
  const foodPopulation = population(state)
  const farmers = workers.filter(npc => npc.job === 'farmer').length
  const dailyFoodNet = 1.8 + farmers * 1.4 - foodPopulation * 0.12 - (state.threat.bossAlive ? 1 : 0)
  const projectedFood = clamp(state.settlement.food + dailyFoodNet * days.foodForecastDays, 0, 100)
  const foodShortage = clamp(Math.max(0, FOOD_THRESHOLD - projectedFood), 0, FOOD_THRESHOLD)
  const foodCoverage = FOOD_THRESHOLD === 0 ? 1 : clamp((FOOD_THRESHOLD - foodShortage) / FOOD_THRESHOLD, 0, 1)
  const supplyCapacity = 12
  const equipmentCoverage = equipmentCapacity === 0 ? 0 : equippedSlots / equipmentCapacity
  const safety = clamp(state.settlement.safety, 0, 100)
  const stagePoints = state.settlement.stage === 'town' ? 5 : state.settlement.stage === 'village' ? 2.5 : 0
  const defenderPoints = 30 * clamp(defenders.length / targetDefenders, 0, 1)
  const combatPoints = 15 * clamp((averageCombatSkill - 1) / 9, 0, 1)
  const equipmentPoints = 10 * equipmentCoverage
  const logisticsPoints = 8 * clamp(otherWorkers / 20, 0, 1)
  const factors = [
    factor('defenders', defenders.length, defenderPoints, 30),
    factor('combat', averageCombatSkill, combatPoints, 15),
    factor('equipment', equippedSlots, equipmentPoints, 10),
    factor('supply', foodCoverage, supplyCapacity * foodCoverage, supplyCapacity),
    factor('safety', safety, safety * 0.1, 10),
    factor('adult_logistics', otherWorkers, logisticsPoints, 8),
    factor('stage', stagePoints, stagePoints, 5),
    factor('prosperity', clamp(state.settlement.prosperity, 0, 100), clamp(state.settlement.prosperity, 0, 100) * 0.05, 5),
    factor('infrastructure', clamp(state.settlement.infrastructure, 0, 100), clamp(state.settlement.infrastructure, 0, 100) * 0.05, 5),
  ]
  const readiness = clamp(factors.reduce((total, item) => total + item.points, 0), 0, 100)
  const causeFloor = pressure(crisis.cause.threatLevel, crisis.cause.monsterPopulation, crisis.cause.bossAlive)
  const currentPressure = pressure(state.threat.threatLevel, state.threat.monsterPopulation, state.threat.bossAlive)
  const threatDemand = Math.max(causeFloor, currentPressure)
  const margin = readiness - threatDemand
  const successChance = clamp(1 / (1 + Math.exp(-margin / 18)), 0.1, 0.9)
  const defenderShortage = Math.max(0, targetDefenders - defenders.length)
  const equipmentShortage = Math.max(0, equipmentCapacity - equippedSlots)

  return {
    phase: crisis.phase,
    readiness,
    threatDemand,
    margin,
    successChance,
    availableDefenders: defenders.length,
    targetDefenders,
    equippedDefenderSlots: equippedSlots,
    timeline: days,
    food: {
      dailyNet: dailyFoodNet,
      projectedAtResolution: projectedFood,
      shortage: foodShortage,
      coverage: foodCoverage,
    },
    threatTrace: {
      causeFloor,
      currentPressure,
      selected: currentPressure > causeFloor ? 'current' : 'cause',
    },
    factors,
    needs: [
      { id: 'defenders', current: defenders.length, required: targetDefenders, shortage: defenderShortage },
      { id: 'food', current: projectedFood, required: FOOD_THRESHOLD, shortage: foodShortage },
      { id: 'equipment', current: equippedSlots, required: equipmentCapacity, shortage: equipmentShortage },
    ],
    capacity: {
      defenderSlots: targetDefenders,
      equipmentSlots: equipmentCapacity,
      foodPoints: FOOD_THRESHOLD,
    },
  }
}
