import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { computed, isReactive, nextTick, watch, watchEffect } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createGame, player, simulate, walkTo } from '../engine/simulation'
import { BUILDINGS } from '../data/config'
import { equip, rest, usePotion } from '../engine/actions'
import { calendar } from '../engine/calendar'
import { SAVE_KEY, serialize } from '../services/saveService'
import { movePlayer } from '../engine/simulation'
import { emit } from '../engine/events'
import { unpackCheckpoint } from '../services/playJournal'
import * as playJournal from '../services/playJournal'
import { useGameStore } from './gameStore'

let saved: string | null
const storage = { getItem: () => saved, setItem: vi.fn((_key: string, value: string) => { saved = value }) }
beforeEach(() => { saved = null; storage.setItem.mockReset().mockImplementation((_key, value) => { saved = value }); vi.stubGlobal('localStorage', storage); setActivePinia(createPinia()); vi.useFakeTimers(); vi.setSystemTime(100000) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function startedGame() {
  const game = useGameStore()
  game.startLife()
  return game
}

function versionOneFixture(lastSavedAt = 1000) {
  const raw = JSON.parse(serialize(createGame(88), lastSavedAt))
  delete raw.life
  raw.saveVersion = 1
  return JSON.stringify(raw)
}

describe('safe browser persistence', () => {
  it('preserves corrupt saves and blocks automatic and manual overwrite', () => {
    saved = '{broken'
    const game = useGameStore()
    expect(game.message).not.toBe(''); expect(game.save()).toBe(false); expect(game.save(true)).toBe(false)
    expect(saved).toBe('{broken'); expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('migrates V1 without offline advancement and retains the historical world checkpoint', () => {
    const state = createGame(88); saved = versionOneFixture(1000)
    const game = useGameStore()
    expect(game.state.worldSeed).toBe(88)
    expect(game.state.worldTime).toBe(state.worldTime)
    expect(game.state.rngState).toBe(state.rngState)
    expect(game.state.saveVersion).toBe(2)
    expect(game.speed).toBe(1)
    expect(game.offline).toBe(null)
    expect(JSON.parse(saved!).saveVersion).toBe(2)
    expect(game.savedAt).toBe(100000)
  })
  it('keeps historical offline journal records but adds no offline load record', () => {
    const raw = JSON.parse(versionOneFixture(1000)), worldTime = raw.worldTime
    const historical = { id: 'old-offline', worldId: 'old-world', at: 90000, kind: 'offline', from: worldTime,
      to: worldTime + 480, characterId: raw.activeCharacterId, message: '既有紀錄', events: [] }
    raw.playJournal = { version: 1, worldId: 'old-world', pending: [historical] }
    saved = JSON.stringify(raw)
    const game = useGameStore()
    expect(game.state.worldTime).toBe(worldTime)
    expect(unpackCheckpoint(saved!).journal.pending).toEqual([historical])
    expect(unpackCheckpoint(saved!).journal.pending.some(record => record.kind === 'offline')).toBe(true)
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
    expect(game.save()).toBe(true); expect(JSON.parse(saved!).saveVersion).toBe(2)
    expect(game.speed).toBe(0); expect(game.state.life.openingSeen).toBe(false)
  })
  it('keeps a new world paused until startLife and triggers shallow world updates', () => {
    const game = useGameStore(), before = game.state.worldTime
    expect(SAVE_KEY).toBe('oakvale-v1')
    expect(game.speed).toBe(0)
    expect(game.state.life.openingSeen).toBe(false)
    expect(isReactive(game.state)).toBe(false)
    expect(isReactive(game.state.characters)).toBe(false)
    game.setSpeed(20)
    game.advance(60)
    expect(game.speed).toBe(0)
    expect(game.state.worldTime).toBe(before)

    expect(game.startLife()).toBe(true)
    expect(game.state.life.openingSeen).toBe(true)
    expect(game.speed).toBe(1)
    const observed = vi.fn()
    const unwatch = watch(() => game.state.worldTime, observed, { flush: 'sync' })
    game.advance(10)
    expect(game.state.worldTime).toBe(before + 10)
    expect(observed).toHaveBeenCalledWith(before + 10, before, expect.any(Function))
    unwatch()
  })
  it('blocks the next action until the failed checkpoint can be saved', () => {
    const game = startedGame(), oldRaw = saved, before = game.state.worldTime, pending = game.pendingRecords
    storage.setItem.mockImplementation(() => { throw new Error('quota') })
    game.act(() => movePlayer(game.state, 1, 0))
    expect(game.state.worldTime).toBe(before + 5)
    expect(game.pendingRecords).toBe(pending + 1)
    expect(saved).toBe(oldRaw)
    const failedState = JSON.stringify(game.state), action = vi.fn(() => movePlayer(game.state, 1, 0))
    game.act(action)
    expect(action).not.toHaveBeenCalled()
    expect(JSON.stringify(game.state)).toBe(failedState)
    expect(game.pendingRecords).toBe(pending + 1)
    expect(saved).toBe(oldRaw)
    expect(game.saveError).toBe('存檔失敗：瀏覽器儲存空間不足或被停用，時間已暫停，請保留此頁。')
    expect(game.message).toBe(game.saveError)
    expect(game.speed).toBe(0)
    storage.setItem.mockImplementation((_key, value) => { saved = value })
    expect(game.save()).toBe(true)
    expect(game.saveError).toBe('')
    expect(game.message).toBe('世界已儲存。')
    expect(unpackCheckpoint(saved!).state).toEqual(JSON.parse(failedState))
  })
  it('updates character display dependencies after health, equipment and life changes', async () => {
    const game = startedGame(), character = player(game.state)
    character.hp = 10
    character.inventory.sword = 1
    const equipped = computed(() => game.character.equipment.weapon === 'sword')
    let display = { hp: 0, potions: 0, equipped: false }
    const stopDisplay = watchEffect(() => {
      display = { hp: game.character.hp, potions: game.character.inventory.potion, equipped: equipped.value }
    })
    const lifeChanged = vi.fn()
    const stopLife = watch(() => game.character.isAlive, lifeChanged)
    try {
      expect(display).toEqual({ hp: 10, potions: 2, equipped: false })
      game.act(() => usePotion(game.state))
      await nextTick()
      expect(display).toEqual({ hp: 55, potions: 1, equipped: false })
      game.act(() => equip(game.state, 'sword'))
      await nextTick()
      expect(display.equipped).toBe(true)
      game.act(() => { character.isAlive = false; character.hp = 0; return '' })
      await nextTick()
      expect(display.hp).toBe(0)
      expect(lifeChanged).toHaveBeenCalledWith(false, true, expect.any(Function))
      expect(isReactive(game.state)).toBe(false)
    } finally { stopDisplay(); stopLife() }
  })
  it('blocks further time advancement while the failed checkpoint still cannot be saved', () => {
    const game = startedGame(), oldRaw = saved
    storage.setItem.mockImplementation(() => { throw new Error('quota') })
    game.act(() => movePlayer(game.state, 1, 0))
    const failedState = JSON.stringify(game.state), pending = game.pendingRecords
    storage.setItem.mockClear()
    game.advance(43200)
    expect(JSON.stringify(game.state)).toBe(failedState)
    expect(game.pendingRecords).toBe(pending)
    expect(saved).toBe(oldRaw)
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    expect(game.speed).toBe(0)
    expect(game.message).toBe(game.saveError)
  })
  it.each([1, 5, 20])('retries the checkpoint before resuming at speed %s', (speed) => {
    const game = startedGame(), oldRaw = saved, state = JSON.stringify(game.state), pending = game.pendingRecords
    storage.setItem.mockImplementation(() => { throw new Error('quota') })
    game.save()
    expect(game.setSpeed).toBeTypeOf('function')
    storage.setItem.mockClear()
    game.setSpeed(0)
    expect(storage.setItem).not.toHaveBeenCalled()
    game.setSpeed(speed)
    expect(game.speed).toBe(0)
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(game.state)).toBe(state)
    expect(game.pendingRecords).toBe(pending)
    expect(saved).toBe(oldRaw)
    storage.setItem.mockImplementation((_key, value) => { expect(game.speed).toBe(0); saved = value })
    game.setSpeed(speed)
    expect(game.speed).toBe(speed)
    expect(game.saveError).toBe('')
    expect(unpackCheckpoint(saved!).state).toEqual(JSON.parse(state))
  })
  it('saves the retained operation before the next action and commits each record once after recovery', async () => {
    const appended: playJournal.PlayRecord[] = []
    const appendBatch = vi.fn(async (batch: playJournal.PlayRecord[]) => { appended.push(...batch) })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const game = startedGame(), before = game.state.worldTime
    await Promise.resolve()
    expect(game.pendingRecords).toBe(0)
    const oldRaw = saved
    storage.setItem.mockImplementation(() => { throw new Error('quota') })
    game.act(() => movePlayer(game.state, 1, 0))
    expect(saved).toBe(oldRaw)
    expect(game.pendingRecords).toBe(1)
    expect(appended).toHaveLength(1)
    const retained = JSON.stringify(game.state)
    storage.setItem.mockImplementation((_key, value) => { saved = value })
    const nextAction = vi.fn(() => {
      // The earlier operation must already be durable before invoking another callback.
      const checkpoint = unpackCheckpoint(saved!)
      expect(checkpoint.state).toEqual(JSON.parse(retained))
      expect(checkpoint.journal.pending).toHaveLength(1)
      expect(checkpoint.journal.pending[0]).toMatchObject({ kind: 'action', from: before, to: before + 5 })
      return movePlayer(game.state, 1, 0)
    })
    game.act(nextAction)
    expect(nextAction).toHaveBeenCalledTimes(1)
    expect(game.state.worldTime).toBe(before + 10)
    const pending = unpackCheckpoint(saved!).journal.pending
    expect(pending).toHaveLength(2)
    await Promise.resolve(); await Promise.resolve()
    expect(game.pendingRecords).toBe(0)
    expect(unpackCheckpoint(saved!).journal.pending).toEqual([])
    expect(unpackCheckpoint(saved!).state).toEqual(game.state)
    expect(appended).toHaveLength(3)
    for (const record of pending) expect(appended.filter(r => r.id === record.id)).toEqual([record])
    expect(game.saveError).toBe('')
    expect(game.journalError).toBe('')
  })
  it('continues actions, time, and resume when only the journal archive is unavailable', async () => {
    const appendBatch = vi.fn(async () => { throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const game = startedGame(), before = game.state.worldTime
    await Promise.resolve()
    expect(game.journalError).toContain('archive unavailable')
    expect(game.saveError).toBe('')
    storage.setItem.mockClear()
    game.setSpeed(0); game.setSpeed(20)
    expect(game.speed).toBe(20)
    expect(storage.setItem).not.toHaveBeenCalled()
    game.act(() => movePlayer(game.state, 1, 0))
    game.advance(1440)
    expect(game.state.worldTime).toBe(before + 5 + 1440)
    expect(storage.setItem).toHaveBeenCalledTimes(2)
    expect(unpackCheckpoint(saved!).state).toEqual(game.state)
    expect(unpackCheckpoint(saved!).journal.pending).toHaveLength(3)
    await Promise.resolve()
    expect(game.journalError).toContain('archive unavailable')
    expect(game.saveError).toBe('')
    expect(game.speed).toBe(20)
  })
  it('allows confirmed reset during both storage failures and retains the old pending records', async () => {
    let archiveFails = true
    const appended: playJournal.PlayRecord[] = []
    const appendBatch = vi.fn(async (batch: playJournal.PlayRecord[]) => {
      if (archiveFails) throw new Error('archive unavailable')
      appended.push(...batch)
    })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const game = startedGame(), oldRaw = saved!, old = unpackCheckpoint(oldRaw).journal
    await Promise.resolve()
    storage.setItem.mockImplementation(() => { throw new Error('quota') })
    game.act(() => movePlayer(game.state, 1, 0))
    expect(game.pendingRecords).toBe(2)
    expect(game.saveError).not.toBe('')
    expect(game.journalError).not.toBe('')
    game.reset()
    expect(game.state.worldTime).toBe(480)
    expect(game.pendingRecords).toBe(3)
    expect(saved).toBe(oldRaw)
    expect(game.speed).toBe(0)
    storage.setItem.mockImplementation((_key, value) => { saved = value })
    expect(game.save(true)).toBe(true)
    const pending = unpackCheckpoint(saved!).journal.pending
    expect(unpackCheckpoint(saved!).journal.worldId).not.toBe(old.worldId)
    expect(pending.map(r => r.kind)).toEqual(['created', 'action', 'reset'])
    expect(pending[0]).toEqual(old.pending[0])
    expect(pending[1]).toMatchObject({ worldId: old.worldId, from: 480, to: 485 })
    await Promise.resolve()
    archiveFails = false
    expect(game.save(true)).toBe(true)
    await Promise.resolve()
    expect(appended).toEqual(pending)
    expect(game.pendingRecords).toBe(0)
    expect(unpackCheckpoint(saved!).journal.pending).toEqual([])
    expect(game.saveError).toBe('')
    expect(game.journalError).toBe('')
  })
  it('saves movement and time immediately without manual saving', () => {
    const game = startedGame(), before = game.state.worldTime
    game.act(() => movePlayer(game.state, 1, 0))
    expect(unpackCheckpoint(saved!).state.characters[0]!.position).toEqual(game.character.position)
    expect(JSON.parse(saved!).playJournal.pending.at(-1).kind).toBe('action')
    game.advance(1440)
    expect(unpackCheckpoint(saved!).state.worldTime).toBe(before + 5 + 1440)
    expect(JSON.parse(saved!).playJournal.pending.at(-1).kind).toBe('time')
  })
  it('immediately saves death-interrupted lodging and its failure events', () => {
    const game = startedGame(), character = player(game.state)
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
    const first = startedGame(); first.advance(1440)
    const pending = JSON.parse(saved!).playJournal.pending
    setActivePinia(createPinia())
    const second = useGameStore()
    expect(JSON.parse(saved!).playJournal.pending).toEqual(pending)
    expect(second.state).not.toHaveProperty('playJournal')
    expect(second.state.worldTime).toBe(first.state.worldTime)
  })
  it('records all events even when a single operation exceeds the visible log limit', () => {
    const game = startedGame()
    game.act(() => { for (let i = 0; i < 220; i++) emit(game.state, 'test.event', 'world', `event ${i}`); return '' })
    expect(game.state.events).toHaveLength(150)
    const events = JSON.parse(saved!).playJournal.pending.at(-1).events
    expect(events).toHaveLength(220); expect(events[0].message).toBe('event 0')
  })
  it('retains the old world journal when explicitly rebuilding', () => {
    const game = startedGame(), old = JSON.parse(saved!).playJournal
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
    const game = startedGame(), initialTime = game.state.worldTime
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
