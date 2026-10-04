import { describe, expect, it } from 'vitest'
import { createGame } from '../engine/simulation'
import { projectWorld } from './worldProjection'
import { npcLod } from '../engine/lod'

describe('world projection boundary', () => {
  it('exposes display fields without character inventories or simulation counters', () => {
    const state = createGame(17), before = JSON.stringify(state)
    const cells = projectWorld(state)
    expect(cells).toHaveLength(384)
    expect(JSON.stringify(state)).toBe(before)
    const people = cells.flatMap(cell => cell.people)
    expect(people.length).toBeGreaterThan(0)
    expect(people.every(n => !('inventory' in n) && !('skills' in n))).toBe(true)
    expect(cells.every(cell => !('rngState' in cell))).toBe(true)
  })
  it('never projects NPC names or markers through undiscovered tiles', () => {
    const state = createGame(), n = state.npcs[0]!
    n.position = { x: 20, y: 2 }
    const cell = projectWorld(state).find(c => c.key === '20,2')!
    expect(cell.people).toEqual([])
    expect(cell.icon).toBe('░')
    expect(cell.label).not.toContain(n.name)
  })
  it('classifies nearby, featured and distant NPCs without materializing monsters', () => {
    const state = createGame(), n = state.npcs[10]!
    n.position = { ...state.characters[0]!.position }
    expect(npcLod(state, n)).toBe('active')
    n.position = { x: 21, y: 4 }; n.currentRegion = 'mine'
    expect(npcLod(state, n)).toBe('abstract')
    state.life.npcs[n.id]!.featured = true
    expect(npcLod(state, n)).toBe('simulated')
    expect(state.combat).toBeNull()
  })
})
