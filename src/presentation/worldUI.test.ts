import { describe, expect, it } from 'vitest'
import { createGame, player } from '../engine/simulation'
import { interactions, worldMarks, directionFor } from './worldUI'

describe('世界情境互動', () => {
  it('商店僅靠近時可開啟，打烊後仍能查看營業時間', () => {
    const state = createGame()
    expect(interactions(state).some(i => i.place === 'store')).toBe(false)
    player(state).position = { x: 10, y: 8 }
    state.worldTime = 21 * 60
    expect(interactions(state).find(i => i.place === 'store')?.label).toContain('雜貨店')
    expect(interactions(state).some(i => i.place === 'tavern')).toBe(false)
  })
  it('地圖呈現農作、聚落與怪物變化，且不洩露迷霧或改動世界', () => {
    const state = createGame()
    const before = JSON.stringify(state)
    const early = worldMarks(state)
    expect(early.get('8,3')?.label).toBe('灰狼蹤跡')
    expect(JSON.stringify(state)).toBe(before)
    state.settlement.stage = 'town'
    state.threat.monsterPopulation = 90
    state.threat.threatLevel = 3
    state.threat.campLevel = 3
    state.threat.bossAlive = true
    state.crops.push({ id: 1, plantedAt: 0, growthDuration: 2880, matureAt: 2880, status: 'mature' })
    const grown = worldMarks(state)
    expect(grown.get('16,10')?.label).toBe('成熟小麥，可收割')
    expect(grown.get('8,3')?.label).toBe('哥布林蹤跡')
    expect([...grown.values()].some(m => m.label.includes('酋長'))).toBe(true)
    expect([...grown.values()].filter(m => m.kind === 'home').length).toBeGreaterThan([...early.values()].filter(m => m.kind === 'home').length)
    const hidden = state.tiles.find(t => t.x === 8 && t.y === 3)!
    hidden.discovered = false
    expect(worldMarks(state).has('8,3')).toBe(false)
  })
  it('方向鍵與 WASD 支援大小寫且其他按鍵不移動', () => {
    expect(directionFor('W')).toEqual({ x: 0, y: -1 })
    expect(directionFor('ArrowLeft')).toEqual({ x: -1, y: 0 })
    expect(directionFor('d')).toEqual({ x: 1, y: 0 })
    expect(directionFor('Enter')).toBeNull()
  })
  it('採集區優先提示區域工作，附近居民仍可以另外互動', () => {
    const state = createGame()
    player(state).position = { x: 5, y: 4 }
    player(state).currentRegion = 'forest'
    state.npcs[0]!.position = { x: 5, y: 4 }
    expect(interactions(state)[0]?.place).toBe('forest')
    expect(interactions(state).some(i => i.npcId === state.npcs[0]!.id)).toBe(true)
  })
})
