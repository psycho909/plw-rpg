import { CONFIG, EQUIPMENT } from '../data/config'
import { REGIONAL_CRISIS_CONTRIBUTION_LIMITS, type RegionalCrisisState } from '../domain/crisis'
import type { EquipmentSlot, GearStats } from '../domain/reward'
import type { GameState, NPC } from '../domain/types'
import { npcCanWork } from './npcLife'
import { population } from './simulation'

const DAY = CONFIG.minutesPerDay
const FOOD_THRESHOLD = CONFIG.regionalCrisis.lowFoodThreshold

type CivilDefensePhase = 'warning' | 'preparation' | 'active' | 'resolution'
type ActiveCrisis = Extract<RegionalCrisisState, { phase: CivilDefensePhase }>
type FactorId = 'defenders' | 'combat' | 'equipment' | 'supply' | 'safety' | 'adult_logistics'
  | 'stage' | 'prosperity' | 'infrastructure'
type NeedId = 'defenders' | 'food' | 'equipment' | 'gold'

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
    rawProjectedAtResolution: number
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
    gold: number
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

/** Exposes the same current workforce predicate to atomic contribution actions. */
export function availableCivilDefenseDefenders(state: GameState): NPC[] {
  return eligibleWorkers(state).filter(npc => npc.job === 'guard' || npc.job === 'mercenary')
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

export function civilDefenseGearEffect(stats: GearStats, slot: EquipmentSlot, combatSkill: number) {
  const core = slot === 'weapon'
    ? stats.attack + stats.penetration * 0.5 + stats.bleed * 0.25 + stats.critical * 0.1
    : stats.defense + stats.block * 0.25 + stats.reduction * 0.5
  const benchmark = slot === 'weapon' ? EQUIPMENT.sword.attack : EQUIPMENT.armor.defense
  const suitability = clamp(0.5 + clamp(combatSkill, 1, 10) / 20, 0.55, 1)
  return clamp(core / benchmark * suitability, 0, 1)
}

/** Derive current world readiness for an in-progress crisis without changing state or RNG. */
export function deriveCivilDefense(state: GameState, crisis: RegionalCrisisState): CivilDefenseReadiness | null {
  if (!isActiveCrisis(crisis)) return null

  const workers = eligibleWorkers(state)
  const defenders = availableCivilDefenseDefenders(state)
  const targetDefenders = Math.min(8, 2 + 2 * clamp(crisis.severity, 1, 3))
  const activeDefenders = defenders.slice(0, targetDefenders)
  const defenderCapacity = activeDefenders.length
  const equipmentCapacity = defenderCapacity * 2
  let equippedSlots = 0
  let equipmentEffect = 0
  for (const npc of activeDefenders) {
    for (const slot of ['weapon', 'armor'] as const) {
      const allocation = crisis.contributions.equipment.find(entry => entry.defenderNpcId === npc.id && entry.slot === slot)
      const legacyItem = slot === 'weapon' ? npc.equipment.weapon : npc.equipment.armor
      if (allocation) {
        equippedSlots++
        equipmentEffect += civilDefenseGearEffect(allocation.sourceItem.rolledStats, slot, npc.skills.combat.level)
      } else if (legacyItem !== null) {
        equippedSlots++
        const legacyStats: GearStats = { attack: 0, defense: 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 }
        if (slot === 'weapon') legacyStats.attack = EQUIPMENT.sword.attack
        else legacyStats.defense = EQUIPMENT.armor.defense
        equipmentEffect += civilDefenseGearEffect(legacyStats, slot, npc.skills.combat.level)
      }
    }
  }
  const averageCombatSkill = defenders.length === 0 ? 0 : defenders.reduce((total, npc) =>
    total + clamp(npc.skills.combat.level, 1, 10), 0) / defenders.length
  const otherWorkers = Math.max(0, workers.length - defenders.length)
  const days = phaseDays(state, crisis)
  const foodPopulation = population(state)
  const farmers = workers.filter(npc => npc.job === 'farmer').length
  const dailyFoodNet = 1.8 + farmers * 1.4 - foodPopulation * 0.12 - (state.threat.bossAlive ? 1 : 0)
  const rawProjectedFood = state.settlement.food + dailyFoodNet * days.foodForecastDays
  const projectedFood = clamp(rawProjectedFood, 0, 100)
  const foodShortage = clamp(Math.max(0, FOOD_THRESHOLD - projectedFood), 0, FOOD_THRESHOLD)
  const foodCoverage = FOOD_THRESHOLD === 0 ? 1 : clamp((FOOD_THRESHOLD - foodShortage) / FOOD_THRESHOLD, 0, 1)
  const supplyCapacity = 12
  const equipmentCoverage = equipmentCapacity === 0 ? 0 : clamp(equipmentEffect / equipmentCapacity, 0, 1)
  const safety = clamp(state.settlement.safety, 0, 100)
  const stagePoints = state.settlement.stage === 'town' ? 5 : state.settlement.stage === 'village' ? 2.5 : 0
  const defenderPoints = 30 * clamp(defenders.length / targetDefenders, 0, 1)
  const combatPoints = 15 * clamp((averageCombatSkill - 1) / 9, 0, 1)
  const equipmentPoints = 10 * equipmentCoverage
  const goldCapacity = Math.min(REGIONAL_CRISIS_CONTRIBUTION_LIMITS.gold,
    Math.max(0, REGIONAL_CRISIS_CONTRIBUTION_LIMITS.logisticsWorkers - otherWorkers)
      * REGIONAL_CRISIS_CONTRIBUTION_LIMITS.goldPerLogisticsWorker)
  const effectiveGold = Math.min(crisis.contributions.gold.spent, goldCapacity)
  const logisticsEquivalent = otherWorkers + effectiveGold / REGIONAL_CRISIS_CONTRIBUTION_LIMITS.goldPerLogisticsWorker
  const logisticsPoints = 8 * clamp(logisticsEquivalent / REGIONAL_CRISIS_CONTRIBUTION_LIMITS.logisticsWorkers, 0, 1)
  const factors = [
    factor('defenders', defenders.length, defenderPoints, 30),
    factor('combat', averageCombatSkill, combatPoints, 15),
    factor('equipment', equipmentEffect, equipmentPoints, 10),
    factor('supply', foodCoverage, supplyCapacity * foodCoverage, supplyCapacity),
    factor('safety', safety, safety * 0.1, 10),
    factor('adult_logistics', logisticsEquivalent, logisticsPoints, 8),
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
      rawProjectedAtResolution: rawProjectedFood,
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
      { id: 'gold', current: crisis.contributions.gold.spent, required: goldCapacity,
        shortage: Math.max(0, goldCapacity - crisis.contributions.gold.spent) },
    ],
    capacity: {
      defenderSlots: targetDefenders,
      equipmentSlots: equipmentCapacity,
      foodPoints: FOOD_THRESHOLD,
      gold: goldCapacity,
    },
  }
}
