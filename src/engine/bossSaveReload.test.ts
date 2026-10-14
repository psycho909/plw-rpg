import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { combatTurn, encounter } from './actions'
import { createGame, player, walkTo } from './simulation'
import { wolfEncounterOptions, encounterWolf } from './wolfFamily'
import { deserialize, serialize } from '../services/saveService'

function forest(state: ReturnType<typeof createGame>) {
  walkTo(state, { x: 5, y: 4 })
}

describe('Boss progression save and reload', () => {
  it('round trips Goblin Chief alive/progress and keeps the cleared post-defeat state', () => {
    const state = createGame(88001)
    forest(state)
    const character = player(state)
    character.stats.strength = 1000
    character.stamina = character.maxStamina
    state.threat.bossAlive = true
    state.threat.bossProgress = CONFIG.bossThreshold
    state.threat.warningLevel = 2

    const loaded = deserialize(serialize(state, 88001)).state
    expect(loaded.threat).toMatchObject({ bossAlive: true, bossProgress: CONFIG.bossThreshold, warningLevel: 2 })
    expect(encounter(loaded, true)).toBe('')
    expect(combatTurn(loaded, 'attack')).toBe('')
    expect(loaded.combat).toBeNull()
    expect(loaded.threat).toMatchObject({ bossAlive: false, bossProgress: 0, warningLevel: 0 })

    const reloadedDefeat = deserialize(serialize(loaded, 88001)).state
    expect(reloadedDefeat.threat).toMatchObject({ bossAlive: false, bossProgress: 0, warningLevel: 0 })
  })

  it('preserves Wolf King post-defeat cooldown through save/reload', () => {
    const state = createGame(88002)
    forest(state)
    const character = player(state)
    character.stats.strength = 1000
    character.stamina = character.maxStamina
    state.threat.monsterPopulation = Math.max(1, state.threat.monsterPopulation)
    state.reward.collection.defeated = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']

    expect(wolfEncounterOptions(state).find(option => option.definitionId === 'wolfKing'))
      .toMatchObject({ eligible: true, reason: null })
    expect(encounterWolf(state, 'wolfKing')).toBe('')
    expect(combatTurn(state, 'attack')).toBe('')
    expect(state.reward.collection.defeated).toContain('wolfKing')
    expect(state.reward.wolfBossDefeatedAt).not.toBeNull()

    const defeatedAt = state.reward.wolfBossDefeatedAt!
    const loaded = deserialize(serialize(state, 88002)).state
    expect(loaded.reward.wolfBossDefeatedAt).toBe(defeatedAt)
    expect(loaded.reward.collection.defeated).toContain('wolfKing')
    expect(wolfEncounterOptions(loaded).find(option => option.definitionId === 'wolfKing'))
      .toMatchObject({ eligible: false })

    loaded.worldTime = defeatedAt + 7 * CONFIG.minutesPerDay - 1
    expect(wolfEncounterOptions(loaded).find(option => option.definitionId === 'wolfKing')?.eligible).toBe(false)
    loaded.worldTime++
    expect(wolfEncounterOptions(loaded).find(option => option.definitionId === 'wolfKing'))
      .toMatchObject({ eligible: true, reason: null })
  })
})
