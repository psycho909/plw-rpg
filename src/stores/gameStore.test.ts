import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createGame } from '../engine/simulation'
import { SAVE_KEY, serialize } from '../services/saveService'
import { useGameStore } from './gameStore'

let saved: string | null
const storage = { getItem: () => saved, setItem: vi.fn((_key: string, value: string) => { saved = value }) }
beforeEach(() => { saved = null; storage.setItem.mockClear(); vi.stubGlobal('localStorage', storage); setActivePinia(createPinia()); vi.useFakeTimers(); vi.setSystemTime(100000) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('safe browser persistence', () => {
  it('preserves corrupt saves and blocks automatic and manual overwrite', () => {
    saved = '{broken'
    const game = useGameStore()
    expect(game.message).not.toBe(''); expect(game.save()).toBe(false); expect(game.save(true)).toBe(false)
    expect(saved).toBe('{broken'); expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('loads a valid world and applies offline time only through the shared simulation', () => {
    const state = createGame(88); saved = serialize(state, 90000)
    const game = useGameStore()
    expect(game.state.worldSeed).toBe(88); expect(game.state.worldTime).toBe(state.worldTime + 20)
    expect(game.offline?.minutes).toBe(20)
    expect(game.save(true)).toBe(true); expect(game.savedAt).toBe(100000)
  })
  it('reports storage failure without silently clearing state', () => {
    const game = useGameStore(), time = game.state.worldTime
    storage.setItem.mockImplementationOnce(() => { throw new Error('quota') })
    expect(game.save(true)).toBe(false); expect(game.message).toContain('存檔失敗')
    expect(game.state.worldTime).toBe(time); expect(game.savedAt).toBeNull()
  })
  it('replaces the stale failure message when automatic saving recovers', () => {
    const game = useGameStore()
    storage.setItem.mockImplementationOnce(() => { throw new Error('quota') })
    expect(game.save()).toBe(false)
    expect(game.message).toContain('存檔失敗')
    expect(game.save()).toBe(true)
    expect(game.saveError).toBe('')
    expect(game.message).toBe('世界已儲存。')
    expect(JSON.parse(saved!).worldSeed).toBe(game.state.worldSeed)
  })
  it('allows explicit reset to replace corrupt data after the UI confirmation', () => {
    saved = '{broken'; const game = useGameStore(); game.reset()
    expect(game.save()).toBe(true); expect(JSON.parse(saved!).saveVersion).toBe(1)
  })
  it('keeps a storage failure visible through actions until saving succeeds', () => {
    const game = useGameStore()
    storage.setItem.mockImplementationOnce(() => { throw new Error('quota') })
    game.save(true)
    game.act(() => '已到達。')
    expect(game.saveError).toBe('存檔失敗：瀏覽器儲存空間不足或被停用，請保留此頁。')
    expect(game.save()).toBe(true)
    expect(game.saveError).toBe('')
    expect(game.message).toBe('已到達。')
  })
})
