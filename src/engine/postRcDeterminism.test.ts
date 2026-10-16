import { describe, expect, it } from 'vitest'
import { BUILDINGS, CONFIG } from '../data/config'
import type { RegionalCrisisState } from '../domain/crisis'
import { deserialize, serialize } from '../services/saveService'
import { contributeCrisisGold } from './crisisContributions'
import { craft } from './crafting'
import { tryStartRegionalCrisis } from './regionalCrisis'
import { chooseSuccessor, createGame, die, player, simulate } from './simulation'

const SEED = 20261016
const SAVE_TIME = 0

function replay(withReloads: boolean) {
  let state = createGame(SEED)
  const character = player(state)
  character.position = { ...BUILDINGS.store.position }
  character.inventory.wood = 20
  character.inventory.stone = 20
  character.gold = 200
  character.stamina = character.maxStamina
  const crafted = craft(state, { recipeId: 'starterSpear' })
  expect(crafted.ok).toBe(true)
  if (withReloads) state = reload(state)

  // Match the existing legal crisis-entry fixture: only eligibility conditions are controlled.
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  for (const npc of state.npcs) {
    npc.job = 'guard'
    state.life.npcs[npc.id]!.careerJob = 'guard'
  }
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
  if (state.regionalCrisis.phase !== 'warning') throw new Error('expected warning crisis')
  player(state).position = { x: 8, y: 10 }
  player(state).currentRegion = 'village'
  simulate(state, (CONFIG.regionalCrisis.warningDays + 1) * CONFIG.minutesPerDay)
  expect(state.regionalCrisis.phase).toBe('preparation')
  const crisisId = (state.regionalCrisis as Exclude<RegionalCrisisState, { phase: 'dormant' }>).id
  expect(contributeCrisisGold(state, crisisId, 25)).toBe('')
  if (withReloads) state = reload(state)
  simulate(state, CONFIG.regionalCrisis.preparationDays * CONFIG.minutesPerDay)
  expect(state.regionalCrisis.phase).toBe('active')

  const successor = state.npcs.find(npc => npc.isAlive && npc.age >= 15)
  if (!successor) throw new Error('expected eligible successor')
  die(state, player(state), '測試中的世界事故')
  expect(chooseSuccessor(state, successor.id)).toBe(true)
  if (withReloads) state = reload(state)

  simulate(state, CONFIG.minutesPerDay)
  return state
}

function reload(state: ReturnType<typeof createGame>) {
  const beforeReload = serialize(state, SAVE_TIME)
  const restored = deserialize(beforeReload).state
  expect(serialize(restored, SAVE_TIME)).toBe(beforeReload)
  return restored
}

describe('post-RC cross-system determinism', () => {
  it('keeps a public-action replay equivalent across craft, crisis, save and succession reload boundaries', () => {
    const continuous = replay(false)
    const reloaded = replay(true)

    expect(reloaded.rngState).toBe(continuous.rngState)
    expect(reloaded.worldTime).toBe(continuous.worldTime)
    expect(reloaded.activeCharacterId).toBe(continuous.activeCharacterId)
    expect(reloaded.characters).toEqual(continuous.characters)
    expect(reloaded.characters.map(({ id, inventory }) => ({ id, inventory })))
      .toEqual(continuous.characters.map(({ id, inventory }) => ({ id, inventory })))
    expect(reloaded.npcs).toEqual(continuous.npcs)
    expect(reloaded.reward).toEqual(continuous.reward)
    expect(reloaded.reward.equipped).toEqual(continuous.reward.equipped)
    expect(reloaded.regionalCrisis).toEqual(continuous.regionalCrisis)
    expect(reloaded.history).toEqual(continuous.history)
    expect(reloaded.events).toEqual(continuous.events)
    expect(serialize(reloaded, SAVE_TIME)).toBe(serialize(continuous, SAVE_TIME))
  })
})
