import { describe, expect, it } from 'vitest'
import { chooseSuccessor, createGame, die, player } from './simulation'
import { JOBS } from '../data/config'
import type { ImportantMemory } from '../domain/life'
import { dailyNpcLife, npcCanWork, npcDialogue, rememberNpc, talkNpc } from './npcLife'
import { random } from './random'

describe('NPC life', () => {
  it('keeps old-life memories without attributing the previous owner achievements to a successor', () => {
    const state = createGame(47), npc = state.npcs[1]!, prior = player(state)
    npc.position = { ...prior.position }
    expect(rememberNpc(state, npc.id, { kind: 'PLAYER_OWNS_FARM', actorId: prior.id, at: state.worldTime, detail: '前一代的農場' })).toBe(true)
    const line = '聽說你有了自己的農場'
    const before: string[] = []
    for (let index = 0; index < 128; index++) { expect(talkNpc(state, npc.id)).toBe(''); before.push(state.events.at(-1)!.message) }
    expect(before.some(message => message.includes(line))).toBe(true)
    die(state, prior, '測試傷勢'); expect(chooseSuccessor(state, state.npcs[0]!.id)).toBe(true)
    npc.position = { ...player(state).position }
    for (let index = 0; index < 128; index++) {
      expect(talkNpc(state, npc.id)).toBe('')
      expect(state.events.at(-1)!.message).not.toContain(line)
    }
    expect(state.life.npcs[npc.id]!.memories[0]!.actorId).toBe(prior.id)
  })
  it('retires older residents and makes retirement visible to work eligibility', () => {
    const state = createGame(19)
    const npc = state.npcs[0]!
    npc.age = 70
    state.life.npcs[npc.id]!.career = 'senior'

    dailyNpcLife(state)

    expect(state.life.npcs[npc.id]!.career).toBe('retired')
    expect(npcCanWork(state, npc.id)).toBe(false)
    expect(npc.schedule.some(slot => slot.activity === 'work')).toBe(false)
  })

  it('advances skilled adults at the annual review without consuming world RNG', () => {
    const state = createGame(31)
    const npc = state.npcs[0]!
    npc.age = 32
    npc.skills.farming.level = 4
    state.life.npcs[npc.id]!.career = 'apprentice'
    state.worldTime = 120 * 1440
    const worldRng = state.rngState

    dailyNpcLife(state)

    expect(state.life.npcs[npc.id]!.career).toBe('experienced')
    expect(npc.job).toBe(state.life.npcs[npc.id]!.careerJob)
    expect(npc.workplace).toEqual(JOBS[npc.job].workplace)
    expect(state.rngState).toBe(worldRng)
  })

  it('preserves starting occupations until residents have learned their work', () => {
    const state = createGame(59)
    const originalJobs = state.npcs.map(npc => npc.job)

    dailyNpcLife(state)

    expect(state.npcs.map(npc => npc.job)).toEqual(originalJobs)
  })

  it('keeps personal memories with their named resident and shares local news only with witnesses', () => {
    const state = createGame(37)
    const resident = state.npcs[0]!, bystander = state.npcs[1]!
    const personal: ImportantMemory = { kind: 'PLAYER_HELPED_ME', actorId: 'alden', at: state.worldTime, detail: '受傷時送來藥水' }
    resident.position = { x: 1, y: 1 }
    state.life.npcs[resident.id]!.traits = ['solitary']
    expect(rememberNpc(state, resident.id, personal)).toBe(true)
    expect(rememberNpc(state, resident.id, personal)).toBe(false)
    expect(state.life.npcs[resident.id]!.memories).toEqual([personal])
    expect(state.life.npcs[bystander.id]!.memories).toHaveLength(0)

    const localNews: ImportantMemory = { kind: 'PLAYER_DEFENDED_OAKVALE', actorId: 'alden', at: state.worldTime, detail: '趕走了北方的哥布林' }
    expect(rememberNpc(state, resident.id, localNews)).toBe(false)
    resident.position = { x: 7, y: 10 }
    expect(rememberNpc(state, resident.id, localNews)).toBe(true)
  })

  it('bounds each resident memory list while preserving the most recent distinct entries', () => {
    const state = createGame(41), resident = state.npcs[0]!
    for (let index = 0; index < 40; index++) {
      const memory: ImportantMemory = {
        kind: 'PLAYER_HELPED_ME', actorId: `player-${index}`, at: index, detail: `事件 ${index}`,
      }
      expect(rememberNpc(state, resident.id, memory)).toBe(true)
    }
    const memories = state.life.npcs[resident.id]!.memories
    expect(memories).toHaveLength(32)
    expect(memories[0]!.actorId).toBe('player-8')
    expect(memories.at(-1)!.actorId).toBe('player-39')
  })

  it('projects dialogue without mutation and spends one world RNG draw only when spoken', () => {
    const state = createGame(47), npc = state.npcs[0]!
    npc.position = { ...state.characters[0]!.position }
    state.life.director.lastPlayerActivity = 0
    const beforeProjection = structuredClone(state)
    const projected = npcDialogue(state, npc.id)
    expect(projected).not.toBe('')
    expect(npcDialogue(state, npc.id)).toBe(projected)
    expect(state).toEqual(beforeProjection)

    const expected = structuredClone(state)
    random(expected)
    expect(talkNpc(state, npc.id)).toBe('')
    expect(state.rngState).toBe(expected.rngState)
    expect(state.life.director.lastPlayerActivity).toBe(state.worldTime)
    const event = state.events.at(-1)!
    expect(event.type).toBe('npc.dialogue')
    expect(event.message).toContain(npc.name)
    expect(event.message.length).toBeGreaterThan(npc.name.length)
  })

  it('rejects distant conversations without consuming world RNG', () => {
    const state = createGame(53), npc = state.npcs[0]!
    npc.position = { x: 1, y: 1 }
    const before = structuredClone(state)

    expect(talkNpc(state, npc.id)).not.toBe('')
    expect(state).toEqual(before)
  })
})
