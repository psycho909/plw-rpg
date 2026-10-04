import { describe, expect, it } from 'vitest'
import { IDENTITY_LIMITS } from '../data/identity'
import { newCharacterLife } from './lifeState'
import { createGame, player } from './simulation'
import { changeReputation, meetsSettlementReputation, recordLifeAction, refreshIdentity, reputationLabel } from './identity'

describe('life identity', () => {
  it('forms each identity once from sustained work and skill, then supports multiple identities', () => {
    const state = createGame(), character = player(state), life = state.life.characters[character.id]!
    character.skills.farming.level = 4
    character.skills.mining.level = 2
    character.skills.combat.level = 2

    recordLifeAction(state, 'farming', 12)
    expect(life.identities).toContain('farmer')
    recordLifeAction(state, 'farming', 27)
    expect(life.identities).not.toContain('skilledFarmer')
    recordLifeAction(state, 'farming')
    expect(life.identities).toContain('skilledFarmer')
    recordLifeAction(state, 'mining', 12)
    character.skills.mining.level = 4
    recordLifeAction(state, 'mining', 27)
    expect(life.identities).not.toContain('skilledMiner')
    recordLifeAction(state, 'mining')
    recordLifeAction(state, 'combat', 12)
    character.skills.combat.level = 5
    recordLifeAction(state, 'combat', 37)
    expect(life.identities).not.toContain('veteran')
    recordLifeAction(state, 'combat')
    expect(life.identities).toEqual(['resident', 'farmer', 'skilledFarmer', 'miner', 'skilledMiner', 'adventurer', 'veteran'])

    const identityEvents = state.history.filter(event => event.type === 'identity.formed')
    const identityMilestones = life.milestones.filter(milestone => milestone.id.startsWith('identity:'))
    refreshIdentity(state)
    expect(state.history.filter(event => event.type === 'identity.formed')).toHaveLength(identityEvents.length)
    expect(life.milestones.filter(milestone => milestone.id.startsWith('identity:'))).toHaveLength(identityMilestones.length)
  })

  it('forms farm owner identity from an owned farm business', () => {
    const state = createGame(), character = player(state)
    state.life.properties.push({ id: 'farm-1', kind: 'farmBusiness', ownerId: character.id,
      acquiredAt: state.worldTime, position: { x: 16, y: 10 },
      storage: { wood: 0, stone: 0, iron: 0, food: 0, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: 0, suppliedToday: 0 })

    expect(refreshIdentity(state)).toContain('farmOwner')
    expect(refreshIdentity(state)).not.toContain('farmOwner')
  })

  it('recognizes a successor’s retained career even before new actions accrue', () => {
    const state = createGame(), miner = state.npcs.find(npc => npc.job === 'miner')!
    state.characters.push(miner)
    state.life.characters[miner.id] = newCharacterLife(2, 'LOCAL_WORLD')

    expect(refreshIdentity(state, miner.id)).toContain('miner')
    expect(state.life.characters[miner.id]!.actions.mining).toBe(0)
  })

  it('requires both sustained actions and skill for an experience-based identity', () => {
    const state = createGame(), character = player(state)
    recordLifeAction(state, 'farming', 10)
    expect(state.life.characters[character.id]!.identities).not.toContain('farmer')

    character.skills.farming.level = 2
    expect(refreshIdentity(state)).toContain('farmer')
  })

  it('clamps negative reputation, changes the displayed label, and gates eligibility', () => {
    const state = createGame(), character = player(state), life = state.life.characters[character.id]!

    expect(changeReputation(state, -200, '拒絕供應')).toBe(-100)
    expect(reputationLabel(life.reputation)).toBe('不受歡迎')
    expect(meetsSettlementReputation(state, 10)).toBe(false)
    expect(changeReputation(state, 125, '供應糧食')).toBe(25)
    expect(reputationLabel(life.reputation)).toBe('熟面孔')
    expect(meetsSettlementReputation(state, 10)).toBe(true)
    expect(life.reputationHistory).toEqual([
      { at: state.worldTime, delta: -100, reason: '拒絕供應' },
      { at: state.worldTime, delta: 125, reason: '供應糧食' },
    ])
  })

  it('does not record a reputation change when clamping leaves the value unchanged', () => {
    const state = createGame(), character = player(state), life = state.life.characters[character.id]!
    changeReputation(state, -100, '地方衝突')
    const eventCount = state.history.filter(event => event.type === 'reputation.rankChanged').length

    expect(changeReputation(state, -20, '再次衝突')).toBe(-100)
    expect(life.reputationHistory).toHaveLength(1)
    expect(state.history.filter(event => event.type === 'reputation.rankChanged')).toHaveLength(eventCount)
  })

  it('bounds reputation history and milestones while keeping a deceased life intact', () => {
    const state = createGame(), character = player(state), life = state.life.characters[character.id]!
    character.skills.farming.level = 2
    recordLifeAction(state, 'farming', 12)
    const identityCount = life.identities.length
    changeReputation(state, 10, '曾協助村民')
    const reputationHistory = structuredClone(life.reputationHistory)
    character.isAlive = false
    recordLifeAction(state, 'mining', 100)
    refreshIdentity(state)
    expect(changeReputation(state, 50, '身後傳聞')).toBe(life.reputation)
    expect(life.identities).toHaveLength(identityCount)
    expect(life.identities).toContain('farmer')
    expect(life.actions.mining).toBe(0)
    expect(life.reputationHistory).toEqual(reputationHistory)

    character.isAlive = true
    life.milestones = Array.from({ length: IDENTITY_LIMITS.milestones }, (_, index) => ({
      id: `prior-${index}`, at: state.worldTime, text: `舊事 ${index}`,
    }))
    const oldestMilestone = life.milestones[0]!.id
    changeReputation(state, 25, '協助聚落')
    expect(life.milestones).toHaveLength(IDENTITY_LIMITS.milestones)
    expect(life.milestones.some(milestone => milestone.id === oldestMilestone)).toBe(false)

    for (let i = 0; i < IDENTITY_LIMITS.reputationHistory + 5; i++) changeReputation(state, 1, `事蹟 ${i}`)
    expect(life.reputationHistory).toHaveLength(IDENTITY_LIMITS.reputationHistory)
    expect(life.milestones.length).toBeLessThanOrEqual(IDENTITY_LIMITS.milestones)
  })
})
