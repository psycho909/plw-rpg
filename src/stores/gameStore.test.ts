import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createGame, player, simulate, walkTo } from '../engine/simulation'
import { BUILDINGS } from '../data/config'
import { rest } from '../engine/actions'
import { calendar } from '../engine/calendar'
import { SAVE_KEY, serialize } from '../services/saveService'
import { movePlayer } from '../engine/simulation'
import { emit } from '../engine/events'
import { unpackCheckpoint } from '../services/playJournal'
import * as playJournal from '../services/playJournal'
import { useGameStore } from './gameStore'

let saved: string | null
const storage = { getItem: () => saved, setItem: vi.fn((_key: string, value: string) => { saved = value }) }
beforeEach(() => { saved = null; storage.setItem.mockClear(); vi.stubGlobal('localStorage', storage); setActivePinia(createPinia()); vi.useFakeTimers(); vi.setSystemTime(100000) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

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
    expect(game.state.worldTime).toBe(time); expect(game.savedAt).toBe(100000); expect(game.speed).toBe(0)
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
    expect(game.saveError).toBe('存檔失敗：瀏覽器儲存空間不足或被停用，時間已暫停，請保留此頁。')
    expect(game.save()).toBe(true)
    expect(game.saveError).toBe('')
    expect(game.message).toBe('已到達。')
  })
  it('saves movement and time immediately without manual saving', () => {
    const game = useGameStore(), before = game.state.worldTime
    game.act(() => movePlayer(game.state, 1, 0))
    expect(unpackCheckpoint(saved!).state.characters[0]!.position).toEqual(game.character.position)
    expect(JSON.parse(saved!).playJournal.pending.at(-1).kind).toBe('action')
    game.advance(1440)
    expect(unpackCheckpoint(saved!).state.worldTime).toBe(before + 5 + 1440)
    expect(JSON.parse(saved!).playJournal.pending.at(-1).kind).toBe('time')
  })
  it('immediately saves death-interrupted lodging and its failure events', () => {
    const game = useGameStore(), character = game.character
    // Controlled fixture: reach the year boundary before exercising the real store action.
    walkTo(game.state, BUILDINGS.inn.position)
    simulate(game.state, 120 * 1440 - 30 - game.state.worldTime)
    character.birthYear = calendar(game.state.worldTime).year - character.lifespan + 1
    character.gold = 8; character.hp = 10
    const before = game.state.worldTime
    storage.setItem.mockClear()
    game.act(() => rest(game.state, 'inn'))
    expect(game.message).toBe('角色已離世，請選擇繼任者。')
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    const checkpoint = unpackCheckpoint(saved!)
    expect(checkpoint.state).toEqual(game.state)
    expect(checkpoint.state.worldTime).toBe(before + 480)
    expect(player(checkpoint.state)).toMatchObject({ isAlive: false, hp: 0, gold: 0 })
    const record = checkpoint.journal.pending.at(-1)!
    expect(record).toMatchObject({ kind: 'action', from: before, to: before + 480,
      characterId: character.id, message: '角色已離世，請選擇繼任者。' })
    expect(record.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'npc.died', category: 'player' }),
      expect.objectContaining({ type: 'world.newYear' }),
    ]))
    expect(record.events.some(event => event.type === 'player.rested')).toBe(false)
  })
  it('retains persisted pending records on reload without leaking metadata into the engine', () => {
    const first = useGameStore(); first.advance(1440)
    const pending = JSON.parse(saved!).playJournal.pending
    setActivePinia(createPinia())
    const second = useGameStore()
    expect(JSON.parse(saved!).playJournal.pending).toEqual(pending)
    expect(second.state).not.toHaveProperty('playJournal')
    expect(second.state.worldTime).toBe(first.state.worldTime)
  })
  it('records all events even when a single operation exceeds the visible log limit', () => {
    const game = useGameStore()
    game.act(() => { for (let i = 0; i < 220; i++) emit(game.state, 'test.event', 'world', `event ${i}`); return '' })
    expect(game.state.events).toHaveLength(150)
    const events = JSON.parse(saved!).playJournal.pending.at(-1).events
    expect(events).toHaveLength(220); expect(events[0].message).toBe('event 0')
  })
  it('retains the old world journal when explicitly rebuilding', () => {
    const game = useGameStore(), old = JSON.parse(saved!).playJournal
    game.reset()
    const current = JSON.parse(saved!).playJournal
    expect(current.worldId).not.toBe(old.worldId)
    expect(current.pending[0].id).toBe(old.pending[0].id)
    expect(current.pending.at(-1).kind).toBe('reset')
  })
  it.each([false, true])('reports a rejected journal batch and preserves newer progress (save failure: %s)', async (saveFails) => {
    const conflict = '同一紀錄編號的內容不同，已保留待送資料。'
    let rejectAppend!: (error: Error) => void
    const appendBatch = vi.fn((): Promise<void> => Promise.reject(new Error(conflict)))
    appendBatch.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectAppend = reject }))
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const game = useGameStore(), initialTime = game.state.worldTime
    // A newer checkpoint is saved while the initial journal transaction is unresolved.
    game.advance(10)
    const persistedCheckpoint = saved!, pending = unpackCheckpoint(persistedCheckpoint).journal.pending
    if (saveFails) {
      storage.setItem.mockImplementationOnce(() => { throw new Error('quota') })
      game.advance(5)
    }
    rejectAppend(new Error(conflict))
    await Promise.resolve()
    expect(saved).toBe(persistedCheckpoint)
    expect(unpackCheckpoint(saved!).state.worldTime).toBe(initialTime + 10)
    expect(unpackCheckpoint(saved!).journal.pending).toEqual(pending)
    expect(game.state.worldTime).toBe(initialTime + (saveFails ? 15 : 10))
    expect(game.pendingRecords).toBe(pending.length + (saveFails ? 1 : 0))
    expect(game.journalError).toContain(conflict)
    expect(game.journalError).toContain('遊玩紀錄尚待補寫。請重試存檔，或匯出保留。')
    if (saveFails) {
      expect(game.saveError).toContain('存檔失敗')
      expect(game.journalError).not.toContain('進度已存入本機')
    }
    expect(game.save()).toBe(true)
    await Promise.resolve()
    expect(unpackCheckpoint(saved!).state.worldTime).toBe(game.state.worldTime)
    expect(unpackCheckpoint(saved!).journal.pending.slice(0, pending.length)).toEqual(pending)
    expect(unpackCheckpoint(saved!).journal.pending).toHaveLength(game.pendingRecords)
    expect(game.journalError).toContain(conflict)
  })
})
