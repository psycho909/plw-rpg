import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { deserialize, serialize } from '../services/saveService'
import { combatTurn } from './actions'
import { createGame, player, simulate, walkTo } from './simulation'
import { encounterWolf } from './wolfFamily'

function replayWolfKingDefeat() {
  const state = createGame(101016)
  expect(walkTo(state, { x: 5, y: 4 })).toBe(true)

  // Establish the same legal boss encounter state before replaying the player actions.
  const character = player(state)
  character.stats.strength = 1000
  character.stamina = character.maxStamina
  state.threat.monsterPopulation = Math.max(1, state.threat.monsterPopulation)
  state.reward.collection.defeated = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']

  const encounterResult = encounterWolf(state, 'wolfKing')
  const combatResult = combatTurn(state, 'attack')
  const loot = structuredClone(state.reward.instances)
  const reloaded = deserialize(serialize(state, 0)).state

  simulate(state, CONFIG.minutesPerDay)
  simulate(reloaded, CONFIG.minutesPerDay)
  return { encounterResult, combatResult, loot, state, reloaded }
}

describe('phase 10 deterministic action replay', () => {
  it('replays identical actions, boss loot, world state and save continuation from one seed', () => {
    const first = replayWolfKingDefeat()
    const second = replayWolfKingDefeat()

    expect(first.encounterResult).toBe('')
    expect(first.combatResult).toBe('')
    expect(first.loot).toHaveLength(1)
    expect(first).toEqual(second)
    expect(first.state.rngState).toBe(second.state.rngState)
    expect(first.state.worldTime).toBe(second.state.worldTime)
    expect(first.state.reward.instances).toEqual(second.state.reward.instances)
    expect(first.state.npcs).toEqual(second.state.npcs)
    expect(first.state.regionalCrisis).toEqual(second.state.regionalCrisis)
    expect(first.state.history).toEqual(second.state.history)
    expect(first.reloaded).toEqual(first.state)
  })
})
