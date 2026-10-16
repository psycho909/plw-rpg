import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { createGame } from '../engine/simulation'
import { deserialize, serialize } from './saveService'

describe('phase 10 persistence contracts', () => {
  it('round trips a live NPC request with its arc and actor references intact', () => {
    const state = createGame(101016)
    const npc = state.npcs.find(candidate => candidate.isAlive)!
    const arc = {
      id: 'phase10-food-arc', kind: 'food' as const, stage: 'reaction' as const,
      startedAt: state.worldTime, stageAt: state.worldTime, resolved: false,
      outcome: 'pending' as const, participants: [npc.id],
    }
    const request = {
      id: 'phase10-food-request', kind: 'food' as const, npcId: npc.id, arcId: arc.id,
      createdAt: state.worldTime, expiresAt: state.worldTime + 7 * CONFIG.minutesPerDay,
      status: 'open' as const, amount: 4, progress: 1,
    }
    state.life.arcs.push(arc)
    state.life.requests.push(request)

    const loaded = deserialize(serialize(state, 1100))

    expect(loaded.lastSavedAt).toBe(1100)
    expect(loaded.state.life.arcs).toContainEqual(arc)
    expect(loaded.state.life.requests).toContainEqual(request)
    expect(loaded.state).toEqual(state)
  })
})
