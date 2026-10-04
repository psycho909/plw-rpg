import { describe, expect, it } from 'vitest'
import { createGame, player } from '../engine/simulation'
import { projectCharacter, projectCharacterLife, projectNpc, projectNpcLife, projectProperties } from './lifeProjection'

describe('detached life display snapshots', () => {
  it('keeps character and NPC display edits outside the simulation', () => {
    const state = createGame(), npc = state.npcs[0]!
    const character = projectCharacter(state)
    character.skills.combat.level = 20
    character.inventory.potion = 0
    character.position.x = 0
    expect(player(state).skills.combat.level).toBe(1)
    expect(player(state).inventory.potion).toBe(2)
    expect(player(state).position.x).not.toBe(0)
    const person = projectNpc(state, npc.id)!
    expect(Object.keys(person).sort()).toEqual(['age', 'currentActivity', 'currentRegion', 'id', 'isAlive', 'job', 'name', 'position'].sort())
    person.position.x = 0
    expect(npc.position.x).not.toBe(0)
    expect(projectNpc(state, 'missing')).toBeUndefined()
  })

  it('refreshes career, memory, identity and storage snapshots without retaining raw aliases', () => {
    const state = createGame(), actorId = state.activeCharacterId, npcId = state.npcs[0]!.id
    state.life.properties.push({ id: 'test-home', kind: 'home', ownerId: actorId, acquiredAt: state.worldTime,
      position: { x: 7, y: 9 }, storage: { wood: 0, stone: 0, iron: 0, food: 3, material: 0, potion: 0, sword: 0, armor: 0 },
      foodSupplied: 0, suppliedDay: 0, suppliedToday: 0 })
    const oldNpc = projectNpcLife(state, npcId)!, oldLife = projectCharacterLife(state, actorId)!
    const oldHome = projectProperties(state, actorId)[0]!
    state.life.npcs[npcId]!.career = 'worker'
    state.life.npcs[npcId]!.memories.push({ kind: 'PLAYER_HELPED_ME', actorId, at: state.worldTime, detail: '提供食物' })
    state.life.characters[actorId]!.identities.push('farmer')
    state.life.properties[0]!.storage.food = 8
    const currentNpc = projectNpcLife(state, npcId)!, currentLife = projectCharacterLife(state, actorId)!
    const currentHome = projectProperties(state, actorId)[0]!
    expect(oldNpc.career).toBe('resident')
    expect(oldNpc.memories).toEqual([])
    expect(oldLife.identities).toEqual(['resident'])
    expect(oldHome.storage.food).toBe(3)
    expect(currentNpc.career).toBe('worker')
    expect(currentNpc.memories[0]!.detail).toBe('提供食物')
    expect(currentLife.identities).toEqual(['resident', 'farmer'])
    expect(currentHome.storage.food).toBe(8)
    expect(currentNpc).not.toBe(oldNpc)
    expect(currentLife).not.toBe(oldLife)
    expect(currentHome).not.toBe(oldHome)
    currentNpc.memories[0]!.detail = 'display edit'
    currentLife.identities.pop()
    currentHome.storage.food = 0
    expect(state.life.npcs[npcId]!.memories[0]!.detail).toBe('提供食物')
    expect(state.life.characters[actorId]!.identities).toContain('farmer')
    expect(state.life.properties[0]!.storage.food).toBe(8)
    expect(projectProperties(state, 'different-owner')).toEqual([])
    expect(projectCharacterLife(state, 'missing')).toBeUndefined()
    expect(projectNpcLife(state, 'missing')).toBeUndefined()
  })
})
