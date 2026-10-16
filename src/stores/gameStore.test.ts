import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { computed, isReactive, nextTick, watch, watchEffect } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createGame, player, simulate, walkTo } from '../engine/simulation'
import { BUILDINGS } from '../data/config'
import { equip, rest, usePotion } from '../engine/actions'
import { equipInstance } from '../engine/rewardActions'
import { generateItem } from '../engine/itemGeneration'
import { calendar } from '../engine/calendar'
import { SAVE_KEY, serialize } from '../services/saveService'
import { movePlayer } from '../engine/simulation'
import { emit } from '../engine/events'
import { unpackCheckpoint } from '../services/playJournal'
import * as playJournal from '../services/playJournal'
import { useGameStore } from './gameStore'

let saved: string | null
const storage = { getItem: () => saved, setItem: vi.fn((_key: string, value: string) => { saved = value }) }
beforeEach(() => {
  saved = null
  storage.setItem.mockReset().mockImplementation((_key, value) => { saved = value })
  vi.stubGlobal('localStorage', storage)
  // Existing single-store tests use a synchronously granted lease. The ownership
  // tests below exercise delayed grants, contention, rejection and disposal.
  vi.stubGlobal('navigator', { locks: { request: vi.fn((_name, _options, callback) => Promise.resolve(callback({ name: 'oakvale-v1:writer' }))) } })
  setActivePinia(createPinia()); vi.useFakeTimers(); vi.setSystemTime(100000)
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function startedGame() {
  const game = useGameStore()
  game.startLife()
  return game
}

function versionOneFixture(lastSavedAt = 1000) {
  const raw = JSON.parse(serialize(createGame(88), lastSavedAt))
  delete raw.life
  delete raw.reward
  delete raw.regionalCrisis
  raw.saveVersion = 1
  for (const actor of [...raw.characters, ...raw.npcs]) delete actor.skills.smithing
  for (const event of [...raw.events, ...raw.history]) delete event.tier
  return JSON.stringify(raw)
}

describe('legacy archive transfer before first checkpoint', () => {
  function legacy(messageSize = 300_000, count = 1) {
    const world = createGame(100016); world.life.openingSeen = true
    // Construct legacy journal fields directly to reproduce pre-cap checkpoints.
    const pending: playJournal.PlayRecord[] = Array.from({ length: count }, (_, index) => ({
      id: index ? `legacy-${index}` : 'legacy-large', worldId: 'legacy-world', at: 100000,
      kind: 'action', from: 480, to: 480, characterId: world.activeCharacterId,
      message: 'x'.repeat(messageSize), events: [],
    }))
    saved = playJournal.packCheckpoint(world, { version: 1, worldId: 'legacy-world', pending }, 100000)
    return { world, pending }
  }

  it('archives original legacy-large before any checkpoint write', async () => {
    const { world, pending } = legacy()
    let acknowledge!: () => void
    const appendBatch = vi.fn(() => new Promise<void>(resolve => { acknowledge = resolve }))
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const game = useGameStore()
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(game.writerReady).toBe(false)
    expect(game.writerPending).toBe(true)
    expect(appendBatch.mock.calls[0]).toEqual([pending])
    const action = vi.fn(() => true)
    game.act(action); game.advance(1); game.reset(); game.save()
    expect(action).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
    acknowledge()
    await vi.advanceTimersByTimeAsync(0)
    expect(game.writerReady).toBe(true)
    expect(unpackCheckpoint(saved!).state).toEqual(world)
    expect(unpackCheckpoint(storage.setItem.mock.calls[0][1]).journal.pending).toEqual([])
    expect(game.journalError).toBe('')
  })

  it('archives an over-quota checkpoint intact, continues, reloads and resets under quota', async () => {
    const { world, pending } = legacy(5_000_000)
    const appendBatch = vi.fn(async (_batch: playJournal.PlayRecord[]) => {})
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    storage.setItem.mockImplementation((_key, value) => {
      if (value.length > 5_000_000) throw new Error('quota')
      saved = value
    })
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(0)
    expect(appendBatch.mock.calls).toEqual([[pending]])
    expect(game.saveError).toBe('')
    expect(unpackCheckpoint(saved!).journal).toEqual({ version: 1, worldId: 'legacy-world', pending: [] })
    game.advance(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(game.state.worldTime).toBe(world.worldTime + 1)
    expect(game.state.worldSeed).toBe(world.worldSeed)
    const expected = JSON.parse(JSON.stringify(game.state)), calls = appendBatch.mock.calls.length
    game.$dispose(); setActivePinia(createPinia())
    const reopened = useGameStore()
    await vi.advanceTimersByTimeAsync(0)
    expect(reopened.state).toEqual(expected)
    expect(unpackCheckpoint(saved!).journal.worldId).toBe('legacy-world')
    expect(appendBatch).toHaveBeenCalledTimes(calls)
    reopened.reset()
    expect(unpackCheckpoint(saved!).journal.worldId).not.toBe('legacy-world')
    expect(unpackCheckpoint(saved!).state.worldTime).toBe(480)
    expect(saved!.length).toBeLessThan(5_000_000)
    expect(reopened.saveError).toBe('')
  })

  it.each(['reject', 'timeout'])('bounds %s retries and saves markers so the world continues', async mode => {
    const { pending } = legacy()
    const appendBatch = vi.fn((_batch: playJournal.PlayRecord[]) => mode === 'reject'
      ? Promise.reject(new Error('archive unavailable')) : new Promise<void>(() => {}))
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const game = useGameStore(), deadline = mode === 'reject' ? 3000 : 18000
    await vi.advanceTimersByTimeAsync(deadline - 1)
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(game.writerReady).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(appendBatch.mock.calls.slice(0, 3)).toEqual([[pending], [pending], [pending]])
    const first = unpackCheckpoint(storage.setItem.mock.calls[0][1])
    expect(first.journal.pending).toHaveLength(2)
    expect(first.journal.pending.map(record => record.message)).toEqual([
      expect.stringContaining('待補寫紀錄摘要：'), expect.stringContaining('紀錄缺口：'),
    ])
    expect(JSON.stringify(first.journal.pending).length).toBeLessThanOrEqual(256_000)
    game.advance(1)
    expect(game.state.worldTime).toBe(481)
  })

  it.each([false, true])('retries original content after one failure (lost ack: %s)', async lostAck => {
    const { pending } = legacy()
    const archived = new Map<string, playJournal.PlayRecord>()
    const appendBatch = vi.fn(async (batch: playJournal.PlayRecord[]) => {
      if (!lostAck && appendBatch.mock.calls.length === 1) throw new Error('unavailable')
      for (const record of batch) {
        if (archived.has(record.id)) expect(archived.get(record.id)).toEqual(record)
        else archived.set(record.id, JSON.parse(JSON.stringify(record)))
      }
      if (appendBatch.mock.calls.length === 1) throw new Error('lost ack')
    })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(999)
    expect(storage.setItem).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(appendBatch.mock.calls).toEqual([[pending], [pending]])
    expect([...archived.values()]).toEqual(pending)
    expect(unpackCheckpoint(saved!).journal.pending).toEqual([])
    expect(game.journalError).toBe('')
  })

  it('transfers count overflow in batches of 64 with mixed worlds and existing markers intact', async () => {
    const { world, pending } = legacy(10, 257)
    pending[0].worldId = 'older-world'; pending[0].message = '待補寫紀錄摘要：fixture'
    pending[1].worldId = 'older-world'; pending[1].message = '紀錄缺口：fixture'
    saved = playJournal.packCheckpoint(world, { version: 1, worldId: 'legacy-world', pending })
    const appendBatch = vi.fn(async (_batch: playJournal.PlayRecord[]) => {
      expect(storage.setItem).not.toHaveBeenCalled()
    })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    useGameStore()
    await vi.advanceTimersByTimeAsync(0)
    expect(appendBatch.mock.calls.map(([batch]) => batch.length)).toEqual([64, 64, 64, 64, 1])
    expect(appendBatch.mock.calls.flatMap(([batch]) => batch)).toEqual(pending)
    expect(unpackCheckpoint(saved!).journal).toEqual({ version: 1, worldId: 'legacy-world', pending: [] })
    for (const [, raw] of storage.setItem.mock.calls) {
      const records = unpackCheckpoint(raw).journal.pending
      expect(records.length).toBeLessThanOrEqual(256)
      expect(JSON.stringify(records).length).toBeLessThanOrEqual(256_000)
    }
  })

  it('keeps acknowledged batches archived when a later batch fails', async () => {
    const { pending } = legacy(10, 257)
    const appendBatch = vi.fn(async (_batch: playJournal.PlayRecord[]) => {
      if (appendBatch.mock.calls.length > 1) throw new Error('unavailable')
    })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    const first = unpackCheckpoint(storage.setItem.mock.calls[0][1]).journal.pending
    expect(first).toEqual(pending.slice(64))
    expect(appendBatch.mock.calls.slice(1, 4).map(([batch]) => batch)).toEqual([
      pending.slice(64, 128), pending.slice(64, 128), pending.slice(64, 128),
    ])
  })

  it.each(['in-flight', 'retry-delay'])('does not activate or save after disposal during %s', async phase => {
    legacy(10, 257)
    let acknowledge!: () => void
    const appendBatch = vi.fn(() => phase === 'retry-delay' ? Promise.reject(new Error('unavailable'))
      : new Promise<void>(resolve => { acknowledge = resolve }))
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(0)
    game.$dispose()
    if (phase === 'in-flight') acknowledge()
    await vi.advanceTimersByTimeAsync(18000)
    expect(game.writerReady).toBe(false)
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(appendBatch).toHaveBeenCalledTimes(1)
  })

  it('does not transfer or write legacy pending without the writer lock', async () => {
    legacy()
    vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, callback: (lock: null) => unknown) => Promise.resolve(callback(null)) } })
    const appendBatch = vi.fn(async () => {})
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(18000)
    expect(game.writerReady).toBe(false)
    expect(appendBatch).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('keeps normal-size pending on the synchronous ready/save/flush path', () => {
    legacy(10, 256)
    const appendBatch = vi.fn(async () => { expect(storage.setItem).toHaveBeenCalled() })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const game = useGameStore()
    expect(game.writerReady).toBe(true)
    expect(game.writerPending).toBe(false)
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    expect(appendBatch).toHaveBeenCalledTimes(1)
  })
})

describe('safe browser persistence', () => {
  it('returns a typed action result once and does not persist a denied no-op', () => {
    const game = startedGame(), result = { ok: false as const, message: '材料不足。' }
    storage.setItem.mockClear()
    let calls = 0
    const returned = game.act(() => { calls++; return result }, {
      message: value => value.message,
      succeeded: value => value.ok,
    })
    expect(returned).toBe(result)
    expect(calls).toBe(1)
    expect(game.message).toBe('材料不足。')
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('persists a typed successful action and journals its mapped message', () => {
    const game = startedGame()
    storage.setItem.mockClear()
    let calls = 0
    const returned = game.act(() => {
      calls++
      emit(game.state, 'craft.completed', 'player', '完成木石長矛。')
      return { ok: true as const, instanceId: 'gear-1' }
    }, {
      message: value => `已製作裝備 ${value.instanceId}。`,
      succeeded: value => value.ok,
    })
    expect(returned).toEqual({ ok: true, instanceId: 'gear-1' })
    expect(calls).toBe(1)
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    expect(unpackCheckpoint(saved!).journal.pending.at(-1)?.message).toBe('已製作裝備 gear-1。')
    expect(unpackCheckpoint(saved!).journal.pending.at(-1)?.events.map(event => event.type)).toContain('craft.completed')
  })

  it('surfaces boss defeat alongside the combat reward in the immediate action message', () => {
    const game = startedGame()
    game.act(() => {
      emit(game.state, 'boss.defeated', 'monster', '哥布林酋長被擊敗，北方商路暫時恢復平靜。', true)
      emit(game.state, 'combat.won', 'player', '戰鬥勝利！獲得 20 經驗與 10 金幣。')
      return ''
    })
    expect(game.message).toContain('哥布林酋長被擊敗')
    expect(game.message).toContain('獲得 20 經驗與 10 金幣')
  })

  it('records factual equip and unequip messages in the stored action journal', () => {
    const game = startedGame()
    const item = generateItem(game.state, { baseId: 'shortSword', level: 1 })
    game.state.reward.instances.push(item)
    emit(game.state, 'combat.won', 'player', '前一次戰鬥勝利。')

    game.act(() => equipInstance(game.state, item.instanceId))
    const equipped = unpackCheckpoint(saved!).journal.pending.at(-1)!
    const equipEvent = equipped.events.find(event => event.type === 'player.equipped')
    expect(equipEvent).toBeDefined()
    expect(equipped.message).toBe(equipEvent!.message)
    expect(equipped.message).not.toBe('前一次戰鬥勝利。')
    expect(equipped.message).toContain('穿戴')

    game.act(() => equipInstance(game.state, item.instanceId))
    const unequipped = unpackCheckpoint(saved!).journal.pending.at(-1)!
    const unequipEvent = unequipped.events.find(event => event.type === 'player.equipped')
    expect(unequipEvent).toBeDefined()
    expect(unequipped.message).toBe(unequipEvent!.message)
    expect(unequipped.message).toContain('卸下')
  })

  it('preserves corrupt saves and blocks automatic and manual overwrite', () => {
    saved = '{broken'
    const game = useGameStore()
    expect(game.message).not.toBe(''); expect(game.save()).toBe(false); expect(game.save(true)).toBe(false)
    expect(saved).toBe('{broken'); expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('preserves malformed reward extensions and blocks all progress instead of discarding owned gear', () => {
    const raw = JSON.parse(serialize(createGame(), 0))
    raw.reward.schemaVersion = 99
    const original = JSON.stringify(raw)
    saved = original
    const game = useGameStore()
    expect(game.saveBlocked).toBe(true)
    expect(game.save()).toBe(false)
    game.startLife(); game.setSpeed(20); game.advance(60)
    expect(saved).toBe(original)
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('migrates V1 without offline advancement and retains the historical world checkpoint', () => {
    const state = createGame(88); saved = versionOneFixture(1000)
    const game = useGameStore()
    expect(game.state.worldSeed).toBe(88)
    expect(game.state.worldTime).toBe(state.worldTime)
    expect(game.state.rngState).toBe(state.rngState)
    expect(game.state.saveVersion).toBe(8)
    expect(game.speed).toBe(1)
    expect(game.offline).toBe(null)
    expect(JSON.parse(saved!).saveVersion).toBe(8)
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
    expect(game.save()).toBe(true); expect(JSON.parse(saved!).saveVersion).toBe(8)
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
  it('compacts oversized legacy pending data so reset persists under quota', async () => {
    const appendBatch = vi.fn(async () => { throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const world = createGame(100016); world.life.openingSeen = true
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: 'legacy-world', pending: [{ id: 'legacy-large', worldId: 'legacy-world', at: 100000,
      kind: 'action', from: 480, to: 480, characterId: world.activeCharacterId, message: 'x'.repeat(5_000_000), events: [] }] }
    saved = JSON.stringify(envelope)
    expect(saved.length).toBeGreaterThan(5_000_000)
    storage.setItem.mockImplementation((_key, value) => {
      if (value.length > 5_000_000) throw new DOMException('localStorage quota exceeded', 'QuotaExceededError')
      saved = value
    })
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    expect(game.saveError).toBe('')
    expect(game.speed).toBe(1)
    const compactedCheckpoint = saved
    expect(compactedCheckpoint).not.toBeNull()
    expect(compactedCheckpoint!.length).toBeLessThan(5_000_000)
    expect(unpackCheckpoint(compactedCheckpoint!).journal.pending).toHaveLength(2)
    expect(unpackCheckpoint(compactedCheckpoint!).journal.pending.some(record => record.message.startsWith('待補寫紀錄摘要：'))).toBe(true)
    expect(unpackCheckpoint(compactedCheckpoint!).journal.pending.some(record => record.message.startsWith('紀錄缺口：'))).toBe(true)
    const oldCheckpoint = saved
    game.reset()
    expect(saved).not.toBe(oldCheckpoint)
    expect(game.saveError).toBe('')
    const reset = unpackCheckpoint(saved!)
    expect(reset.state.worldTime).toBe(480)
    expect(saved!.length).toBeLessThan(5_000_000)
    expect(reset.journal.pending).toHaveLength(3)
    expect(reset.journal.pending.some(record => record.message.startsWith('待補寫紀錄摘要：'))).toBe(true)
    expect(reset.journal.pending.some(record => record.message.startsWith('紀錄缺口：'))).toBe(true)
    const markers = reset.journal.pending.filter(record => record.kind === 'time')
    expect(markers).toHaveLength(2)
    expect(markers.every(record => record.worldId === 'legacy-world' && record.from === 480 && record.to === 480)).toBe(true)
    expect(reset.journal.worldId).not.toBe('legacy-world')
    expect(reset.journal.pending.at(-1)).toMatchObject({ kind: 'reset', worldId: reset.journal.worldId })
    expect(reset.journal.pending.some(record => record.kind === 'reset')).toBe(true)
  })
  it('compacts oversized legacy pending on load and continues the same world under quota', async () => {
    const appendBatch = vi.fn(async () => { throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const world = createGame(100016); world.life.openingSeen = true
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: 'legacy-world', pending: [{ id: 'legacy-large', worldId: 'legacy-world', at: 100000,
      kind: 'action', from: 480, to: 480, characterId: world.activeCharacterId, message: 'x'.repeat(5_000_000), events: [] }] }
    saved = JSON.stringify(envelope)
    storage.setItem.mockImplementation((_key, value) => {
      if (value.length > 5_000_000) throw new DOMException('localStorage quota exceeded', 'QuotaExceededError')
      saved = value
    })
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    const before = game.state.worldTime
    game.advance(1)
    const checkpoint = unpackCheckpoint(saved!)
    expect(game.state.worldTime).toBe(before + 1)
    expect(checkpoint.state.worldSeed).toBe(world.worldSeed)
    expect(checkpoint.state.worldTime).toBe(before + 1)
    expect(game.saveError).toBe('')
    expect(checkpoint.journal.pending.length).toBeLessThanOrEqual(256)
    expect(checkpoint.journal.pending.reduce((chars, record) => chars + JSON.stringify(record).length + 1, 0)).toBeLessThanOrEqual(256_000)
    const legacyMarkers = checkpoint.journal.pending.filter(record => record.worldId === 'legacy-world')
    expect(legacyMarkers.some(record => record.message.startsWith('待補寫紀錄摘要：'))).toBe(true)
    expect(legacyMarkers.some(record => record.message.startsWith('紀錄缺口：'))).toBe(true)
    expect(appendBatch).toHaveBeenCalled()
  })
  it('compacts mixed worlds into separate chronological source ranges', async () => {
    const appendBatch = vi.fn(async () => { throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const world = createGame(100016); world.life.openingSeen = true
    const pending: playJournal.PlayRecord[] = [
      { id: 'old-summary', worldId: 'old-world', at: 1, kind: 'time', from: 500, to: 550,
        characterId: world.activeCharacterId, message: '待補寫紀錄摘要：old', events: [] },
      { id: 'old-gap', worldId: 'old-world', at: 1, kind: 'time', from: 500, to: 550,
        characterId: world.activeCharacterId, message: '紀錄缺口：old', events: [] },
      { id: 'old-detail', worldId: 'old-world', at: 2, kind: 'action', from: 550, to: 600,
        characterId: world.activeCharacterId, message: 'x'.repeat(150_000), events: [] },
      { id: 'current-summary', worldId: 'current-world', at: 3, kind: 'time', from: 480, to: 490,
        characterId: world.activeCharacterId, message: '待補寫紀錄摘要：current', events: [] },
      { id: 'current-gap', worldId: 'current-world', at: 3, kind: 'time', from: 480, to: 490,
        characterId: world.activeCharacterId, message: '紀錄缺口：current', events: [] },
      { id: 'current-detail', worldId: 'current-world', at: 4, kind: 'action', from: 490, to: 510,
        characterId: world.activeCharacterId, message: 'x'.repeat(300_000), events: [] },
    ]
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: 'current-world', pending }
    saved = JSON.stringify(envelope)
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    game.act(() => true)
    const checkpoint = unpackCheckpoint(saved!), records = checkpoint.journal.pending
    const markers = records.filter(record => record.message.startsWith('待補寫紀錄摘要：') || record.message.startsWith('紀錄缺口：'))
    expect(markers.map(({ worldId, from, to }) => ({ worldId, from, to }))).toEqual([
      { worldId: 'old-world', from: 500, to: 600 }, { worldId: 'old-world', from: 500, to: 600 },
      { worldId: 'current-world', from: 480, to: 510 }, { worldId: 'current-world', from: 480, to: 510 },
    ])
    expect(records.at(-1)?.kind).toBe('action')
    expect(records.length).toBeLessThanOrEqual(256)
    expect(JSON.stringify(records).length).toBeLessThanOrEqual(256_000)
    // A second compaction must recognize all marker pairs, not just the leading pair.
    game.act(() => { game.message = 'y'.repeat(300_000); return true }, { message: () => game.message, succeeded: () => true })
    const again = unpackCheckpoint(saved!).journal.pending
    expect(again.filter(record => record.message.startsWith('待補寫紀錄摘要：')).map(record => record.worldId)).toEqual(['old-world', 'current-world'])
    expect(again.length).toBeLessThanOrEqual(256)
    expect(JSON.stringify(again).length).toBeLessThanOrEqual(256_000)
  })
  it('keeps source world markers within the pending record count cap', async () => {
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({
      appendBatch: async () => { throw new Error('archive unavailable') }, readAll: async () => [],
    })
    const world = createGame(100016); world.life.openingSeen = true
    const pending: playJournal.PlayRecord[] = Array.from({ length: 300 }, (_, index) => ({
      id: `detail-${index}`, worldId: index < 20 ? 'old-world' : 'current-world', at: index,
      kind: 'action', from: index < 20 ? 1000 + index : 480 + index - 20,
      to: index < 20 ? 1001 + index : 481 + index - 20,
      characterId: world.activeCharacterId, message: 'detail', events: [],
    }))
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: 'current-world', pending }
    saved = JSON.stringify(envelope)
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    game.act(() => true)
    const records = unpackCheckpoint(saved!).journal.pending
    expect(records).toHaveLength(256)
    expect(records.slice(0, 4).map(({ worldId, from, to }) => ({ worldId, from, to }))).toEqual([
      { worldId: 'old-world', from: 1000, to: 1020 }, { worldId: 'old-world', from: 1000, to: 1020 },
      { worldId: 'current-world', from: 480, to: 509 }, { worldId: 'current-world', from: 480, to: 509 },
    ])
    expect(records.slice(4, -1)).toEqual(pending.slice(49))
    expect(records.at(-1)?.kind).toBe('action')
  })
  it.each([129, 1000])('bounds %s pending worlds with explicit oldest-world merging', async (worldCount) => {
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({
      appendBatch: async () => { throw new Error('archive unavailable') }, readAll: async () => [],
    })
    const world = createGame(100016); world.life.openingSeen = true
    const pending: playJournal.PlayRecord[] = Array.from({ length: worldCount }, (_, index) =>
      ['待補寫紀錄摘要：', '紀錄缺口：'].map((prefix, offset) => ({
        id: `world-${index}-${offset}`, worldId: `world-${index}`, at: index, kind: 'time' as const,
        from: 480, to: 500 + index, characterId: world.activeCharacterId, message: `${prefix}fixture`, events: [],
      }))).flat()
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: `world-${worldCount - 1}`, pending }
    saved = JSON.stringify(envelope)
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    game.act(() => true)
    const records = unpackCheckpoint(saved!).journal.pending
    expect(records.length).toBeLessThanOrEqual(256)
    expect(JSON.stringify(records).length).toBeLessThanOrEqual(256_000)
    // 126 individual pairs + one combined pair + the newest action fit in 255 slots.
    expect(records.slice(0, 2).map(record => record.message)).toEqual([
      expect.stringContaining(`待補寫紀錄摘要：較舊 ${worldCount - 126} 個世界`),
      expect.stringContaining(`紀錄缺口：較舊 ${worldCount - 126} 個世界`),
    ])
    expect(records.slice(-3, -1)).toEqual(pending.slice(-2))
    expect(records.at(-1)).toMatchObject({ kind: 'action', worldId: `world-${worldCount - 1}` })
    expect(game.journalError).not.toBe('')
  })
  it('preserves per-world attribution when prefix compaction alone fits many worlds', async () => {
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({
      appendBatch: async () => { throw new Error('archive unavailable') }, readAll: async () => [],
    })
    const world = createGame(100016); world.life.openingSeen = true
    const pending: playJournal.PlayRecord[] = Array.from({ length: 328 }, (_, index) => ({
      id: `detail-${index}`, worldId: index < 200 ? 'old-world' : `world-${index - 200}`, at: index,
      kind: 'action', from: 480, to: 500, characterId: world.activeCharacterId, message: 'detail', events: [],
    }))
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: 'world-127', pending }
    saved = JSON.stringify(envelope)
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    game.act(() => true)
    const records = unpackCheckpoint(saved!).journal.pending
    expect(records).toHaveLength(256)
    expect(records.slice(0, 2).map(record => record.worldId)).toEqual(['old-world', 'old-world'])
    expect(records.some(record => record.message.includes('個世界的紀錄缺口已合併'))).toBe(false)
    expect(records.slice(2, -1)).toEqual(pending.slice(75))
  })
  it('keeps combined world counts cumulative across checkpoint reload and compaction', async () => {
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({
      appendBatch: async () => { throw new Error('archive unavailable') }, readAll: async () => [],
    })
    const world = createGame(100016); world.life.openingSeen = true
    const envelope = JSON.parse(serialize(world, 100000))
    const pair = (worldId: string, count = 0): playJournal.PlayRecord[] =>
      ['待補寫紀錄摘要：', '紀錄缺口：'].map((prefix, offset) => ({
        id: `${worldId}-${offset}`, worldId, at: 1, kind: 'time', from: 480, to: 500,
        characterId: world.activeCharacterId, message: `${prefix}${count ? `較舊 ${count} 個世界的紀錄缺口已合併；` : 'fixture'}`, events: [],
      }))
    envelope.playJournal = { version: 1, worldId: 'world-127', pending: [
      ...pair('journal-combined-worlds', 100),
      ...Array.from({ length: 128 }, (_, index) => pair(`world-${index}`)).flat(),
    ] }
    saved = JSON.stringify(envelope)
    let game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    game.act(() => true)
    let checkpoint = unpackCheckpoint(saved!)
    expect(checkpoint.journal.pending.slice(0, 2).every(record => record.message.includes('較舊 102 個世界'))).toBe(true)
    // Rehydrate with ten more worlds while the archive remains unavailable.
    checkpoint.journal.pending.push(...Array.from({ length: 10 }, (_, index) => pair(`later-${index}`)).flat())
    saved = playJournal.packCheckpoint(checkpoint.state, checkpoint.journal, 100000)
    setActivePinia(createPinia()); game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    game.act(() => true)
    checkpoint = unpackCheckpoint(saved!)
    expect(checkpoint.journal.pending.slice(0, 2).every(record => record.message.includes('較舊 112 個世界'))).toBe(true)
    expect(checkpoint.journal.pending.length).toBeLessThanOrEqual(256)
    expect(JSON.stringify(checkpoint.journal.pending).length).toBeLessThanOrEqual(256_000)
    expect(checkpoint.journal.pending.slice(-3, -1)).toEqual(pair('later-9'))
  })
  it('retains a large newest record by merging oldest world pairs under character pressure', async () => {
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({
      appendBatch: async () => { throw new Error('archive unavailable') }, readAll: async () => [],
    })
    const world = createGame(100016); world.life.openingSeen = true
    const pending: playJournal.PlayRecord[] = Array.from({ length: 120 }, (_, index) => ({
      id: `large-world-${index}`, worldId: `world-${index}`, at: index, kind: 'action', from: 480, to: 500,
      characterId: world.activeCharacterId, message: 'x'.repeat(3000), events: [],
    }))
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: 'world-119', pending }
    saved = JSON.stringify(envelope)
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    game.act(() => true, { message: () => 'newest'.repeat(41_000), succeeded: () => true })
    const records = unpackCheckpoint(saved!).journal.pending
    expect(records.at(-1)?.message === 'newest'.repeat(41_000)).toBe(true)
    expect(records[0]?.message).toContain('待補寫紀錄摘要：較舊 ')
    expect(records.length).toBeLessThanOrEqual(256)
    expect(JSON.stringify(records).length).toBeLessThanOrEqual(256_000)
  })
  it('bounds markers even when legacy character metadata exceeds the pending character cap', async () => {
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({
      appendBatch: async () => { throw new Error('archive unavailable') }, readAll: async () => [],
    })
    const world = createGame(100016); world.life.openingSeen = true
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: 'current-world', pending: [{
      id: 'huge-metadata', worldId: 'old-world', at: 1, kind: 'action', from: 480, to: 500,
      characterId: 'legacy'.repeat(50_000), message: 'detail', events: [],
    }] }
    saved = JSON.stringify(envelope)
    const game = useGameStore()
    await vi.advanceTimersByTimeAsync(3000)
    game.act(() => true)
    const records = unpackCheckpoint(saved!).journal.pending
    expect(records.slice(0, 2).map(record => record.worldId)).toEqual(['old-world', 'old-world'])
    expect(records.at(-1)?.kind).toBe('action')
    expect(records.length).toBeLessThanOrEqual(256)
    expect(JSON.stringify(records).length).toBeLessThanOrEqual(256_000)
  })
  it('extends only the current world markers after the time event cap is exceeded', async () => {
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({
      appendBatch: async () => { throw new Error('archive unavailable') }, readAll: async () => [],
    })
    const world = createGame(100016); world.life.openingSeen = true
    const markers: playJournal.PlayRecord[] = ['old-world', 'current-world'].flatMap((worldId, index) =>
      ['待補寫紀錄摘要：', '紀錄缺口：'].map((message, offset) => ({
        id: `marker-${index}-${offset}`, worldId, at: index, kind: 'time' as const,
        from: index ? 480 : 1000, to: index ? 480 : 1100,
        characterId: world.activeCharacterId, message, events: [],
      })))
    const tail: playJournal.PlayRecord = { id: 'tail', worldId: 'current-world', at: 3, kind: 'time', from: 480, to: 480,
      characterId: world.activeCharacterId, message: 'time', events: Array.from({ length: 129 }, (_, index) => ({
        id: index + 1, at: 480, type: 'test.event', message: `event ${index}`, category: 'world',
      })) }
    const envelope = JSON.parse(serialize(world, 100000))
    envelope.playJournal = { version: 1, worldId: 'current-world', pending: [...markers, tail] }
    saved = JSON.stringify(envelope)
    const game = useGameStore()
    await Promise.resolve(); await Promise.resolve()
    game.advance(1)
    const records = unpackCheckpoint(saved!).journal.pending
    expect(records.slice(0, 2)).toEqual(markers.slice(0, 2))
    expect(records.slice(2, 4).map(({ worldId, from, to }) => ({ worldId, from, to }))).toEqual([
      { worldId: 'current-world', from: 480, to: 481 }, { worldId: 'current-world', from: 480, to: 481 },
    ])
    expect(records).toHaveLength(5)
    expect(records.at(-1)?.events).toHaveLength(128)
  })
  it('merges consecutive pending time records into one range without losing events', async () => {
    const appendBatch = vi.fn(async () => { throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const game = startedGame()
    await Promise.resolve(); await Promise.resolve()
    const from = game.state.worldTime
    game.advance(1440)
    const first = unpackCheckpoint(saved!).journal.pending.filter(record => record.kind === 'time').at(-1)!
    const sequenceBeforeSecond = game.state.eventSequence
    await Promise.resolve(); await Promise.resolve()
    game.advance(1440)
    const secondEvents = game.state.events.filter(event => event.id > sequenceBeforeSecond)
    const times = unpackCheckpoint(saved!).journal.pending.filter(record => record.kind === 'time')
    expect(times).toHaveLength(1)
    expect(times[0]).toMatchObject({ from, to: from + 2880 })
    expect(times[0]!.id).not.toBe(first.id)
    expect(times[0]!.events).toEqual([...first.events, ...secondEvents])
  })
  it.each([false, true])('replaces checkpointed time with a new id and safely reloads after lost archive acknowledgement (save failure: %s)', async (saveFails) => {
    const archived = new Map<string, playJournal.PlayRecord>()
    const appendBatch = vi.fn(async (batch: playJournal.PlayRecord[]) => {
      for (const record of batch) {
        const old = archived.get(record.id)
        if (old && JSON.stringify(old) !== JSON.stringify(record)) throw new Error('same-id/different-content')
        archived.set(record.id, structuredClone(record))
      }
      throw new Error('acknowledgement lost')
    })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const game = startedGame(), before = game.state.worldTime
    await Promise.resolve(); await Promise.resolve()
    game.advance(1440)
    // Retry commits the first time record, but its acknowledgement is lost.
    game.save(true)
    await Promise.resolve(); await Promise.resolve()
    const oldCheckpoint = saved!
    const first = unpackCheckpoint(oldCheckpoint).journal.pending.find(record => record.kind === 'time')!
    const firstReference = appendBatch.mock.calls.at(-1)![0].find(record => record.id === first.id)!
    expect(archived.get(first.id)).toEqual(first)
    const checkpointSpy = vi.spyOn(playJournal, 'packCheckpoint')
    if (saveFails) storage.setItem.mockImplementationOnce(() => { throw new Error('quota') })
    game.advance(1440)
    expect(firstReference).toEqual(first)
    expect(archived.get(first.id)).toEqual(first)
    if (saveFails) expect(saved).toBe(oldCheckpoint)
    // Observe the attempted checkpoint even if its write failed.
    const merged = checkpointSpy.mock.calls.at(-1)![1].pending.filter(record => record.kind === 'time')
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ from: before, to: before + 2880 })
    expect(merged[0]!.id).not.toBe(first.id)
    expect(checkpointSpy.mock.calls.at(-1)![1].pending.some(record => record.id === first.id)).toBe(false)
    // Reload immediately, retaining the older checkpoint when the write failed.
    const reloadedRaw = saved!
    setActivePinia(createPinia())
    const reloaded = useGameStore()
    await Promise.resolve(); await Promise.resolve()
    expect(reloaded.state.worldTime).toBe(before + (saveFails ? 1440 : 2880))
    expect(unpackCheckpoint(saved!).journal.pending).toEqual(unpackCheckpoint(reloadedRaw).journal.pending)
    expect(reloaded.journalError).toContain('acknowledgement lost')
    expect(reloaded.journalError).not.toContain('same-id/different-content')
  })
  it.each(['待補寫紀錄摘要：', '紀錄缺口：', '待補寫紀錄摘要：較舊 100 個世界', '紀錄缺口：較舊 100 個世界'])('does not coalesce time into an unpersisted marker: %s', async (prefix) => {
    const appendBatch = vi.fn(async () => { throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const checkpointSpy = vi.spyOn(playJournal, 'packCheckpoint')
    const game = startedGame(), before = game.state.worldTime
    await Promise.resolve(); await Promise.resolve()
    // Inject an uncheckpointed outbox fixture at the public persistence boundary.
    // These literals are the real marker prefixes; this id has never been saved or sent.
    const journal = checkpointSpy.mock.calls.at(-1)![1]
    if (prefix.includes('100 個世界')) journal.worldId = 'journal-combined-worlds'
    const marker: playJournal.PlayRecord = { id: 'unpersisted-marker', worldId: journal.worldId, at: 100000, kind: 'time',
      from: before - 60, to: before, characterId: game.state.activeCharacterId, message: `${prefix}fixture`, events: [] }
    journal.pending.push(marker)
    const original = structuredClone(marker)
    game.advance(1440)
    const pending = unpackCheckpoint(saved!).journal.pending
    expect(pending.find(record => record.id === marker.id)).toEqual(original)
    expect(pending.at(-1)).toMatchObject({ kind: 'time', from: before, to: before + 1440 })
    expect(pending.at(-1)!.id).not.toBe(marker.id)
  })
  it('keeps 25,000 time advances resumable with a bounded checkpoint during archive failure', async () => {
    const appendBatch = vi.fn(async () => { throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const game = startedGame(), before = game.state.worldTime
    await Promise.resolve(); await Promise.resolve()
    storage.setItem.mockImplementation((_key, value) => {
      if (value.length > 5_000_000) throw new DOMException('localStorage quota exceeded', 'QuotaExceededError')
      saved = value
    })

    for (let i = 0; i < 25_000; i++) {
      game.advance(1)
      if (i % 100 === 99) storage.setItem.mockClear()
    }
    const checkpoint = unpackCheckpoint(saved!)
    const ranges = checkpoint.journal.pending.filter(record => record.kind === 'time')
    expect(game.state.worldTime).toBe(before + 25_000)
    expect(game.speed).toBe(1)
    expect(game.saveError).toBe('')
    expect(game.pendingRecords).toBeLessThanOrEqual(256)
    expect(ranges.length).toBeLessThanOrEqual(3)
    expect(Math.min(...ranges.map(record => record.from))).toBe(before)
    expect(Math.max(...ranges.map(record => record.to))).toBe(before + 25_000)
    expect(saved!.length).toBeLessThan(5_000_000)
  }, 120_000)
  it('retries a rejected journal append after a backoff delay', async () => {
    let attempts = 0
    const appendBatch = vi.fn(async () => { if (++attempts === 1) throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const game = startedGame()
    await Promise.resolve(); await Promise.resolve()
    expect(appendBatch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(appendBatch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await Promise.resolve(); await Promise.resolve()
    expect(appendBatch).toHaveBeenCalledTimes(2)
    expect(game.pendingRecords).toBe(0)
  })
  it('flushes checkpointed records even when a later local checkpoint write fails', async () => {
    let fail = true
    const appendBatch = vi.fn(async () => { if (fail) throw new Error('archive unavailable') })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValueOnce({ appendBatch, readAll: async () => [] })
    const game = startedGame()
    await Promise.resolve(); await Promise.resolve()
    expect(appendBatch).toHaveBeenCalledTimes(1)
    fail = false; appendBatch.mockClear()
    storage.setItem.mockImplementationOnce(() => { throw new DOMException('localStorage quota exceeded', 'QuotaExceededError') })
    game.advance(1)
    expect(appendBatch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(appendBatch).toHaveBeenCalled()
    expect(game.saveError).toBe('')
    expect(unpackCheckpoint(saved!).state).toEqual(game.state)
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
    expect(game.pendingRecords).toBe(pending.length)
    expect(game.journalError).toContain(conflict)
    expect(game.journalError).toContain('遊玩紀錄尚待補寫。請重試存檔，或匯出保留。')
    if (saveFails) {
      expect(game.saveError).toContain('存檔失敗')
      expect(game.journalError).not.toContain('進度已存入本機')
    }
    expect(game.save()).toBe(true)
    await Promise.resolve()
    expect(unpackCheckpoint(saved!).state.worldTime).toBe(game.state.worldTime)
    const retriedPending = unpackCheckpoint(saved!).journal.pending
    expect(retriedPending).toHaveLength(game.pendingRecords)
    expect(retriedPending[0]).toMatchObject({ id: pending[0]!.id })
    expect(retriedPending.at(-1)).toMatchObject({ kind: 'time', from: initialTime,
      to: initialTime + (saveFails ? 15 : 10) })
    expect(game.journalError).toContain(conflict)
  })
})


describe('exclusive checkpoint writer', () => {
  it('prevents a second tab from overwriting newer progress or appending its own journal', async () => {
    let occupied = false
    vi.stubGlobal('navigator', { locks: { request: vi.fn((_name, _options, callback) => {
      const granted = !occupied; occupied = true
      return Promise.resolve(callback(granted ? { name: 'oakvale-v1:writer' } : null))
    }) } })
    const appendBatch = vi.fn(async () => {})
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const first = startedGame()
    setActivePinia(createPinia())
    const second = useGameStore()
    first.act(() => movePlayer(first.state, 0, 1))
    await Promise.resolve(); await Promise.resolve()
    const latest = saved, pending = appendBatch.mock.calls.length
    expect(second.save(true)).toBe(false)
    const action = vi.fn(() => true)
    second.act(action); second.advance(60); second.setSpeed(20); second.startLife(); second.reset()
    await Promise.resolve()
    expect(action).not.toHaveBeenCalled()
    expect(second.speed).toBe(0)
    expect(second.saveError).toContain('另一個')
    expect(saved).toBe(latest)
    expect(appendBatch).toHaveBeenCalledTimes(pending)
    expect(unpackCheckpoint(saved!).state.worldTime).toBe(485)
  })
})

it('exports the latest persisted checkpoint from a blocked tab, not its stale preview', async () => {
  const first = startedGame()
  vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, callback: (lock: null) => unknown) => Promise.resolve(callback(null)) } })
  setActivePinia(createPinia())
  const blocked = useGameStore()
  first.act(() => movePlayer(first.state, 0, 1))
  const blobs: Blob[] = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { if (!(blob instanceof Blob)) throw new Error('Expected Blob export'); blobs.push(blob); return 'blob:test' })
  vi.stubGlobal('document', { createElement: () => ({ click: vi.fn() }) })
  await blocked.exportJournal()
  const data = JSON.parse(await blobs[0]!.text())
  expect(data.checkpoint.worldTime).toBe(485)
  expect(data.checkpoint.characters.find((c: { id: string }) => c.id === data.checkpoint.activeCharacterId).position).toEqual({ x: 7, y: 10 })
})

it('does not write before asynchronous lock acquisition and re-reads the winning checkpoint', () => {
  let grant: (() => unknown) | undefined
  vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, callback: (lock: object) => unknown) => {
    grant = () => callback({ name: 'oakvale-v1:writer' })
    return new Promise(() => {})
  } } })
  const game = useGameStore(), action = vi.fn(() => true)
  expect(game.writerPending).toBe(true)
  game.act(action); game.startLife(); game.advance(60); game.setSpeed(20); game.reset(); game.save(true)
  expect(storage.setItem).not.toHaveBeenCalled()
  expect(action).not.toHaveBeenCalled()
  const winner = createGame(777); winner.life.openingSeen = true; simulate(winner, 150)
  saved = serialize(winner, 99000)
  grant!()
  expect(game.writerReady).toBe(true)
  expect(game.writerPending).toBe(false)
  expect(game.state).toEqual(winner)
  expect(unpackCheckpoint(saved!).state).toEqual(winner)
})

it.each(['unsupported', 'rejected'])('fails closed with %s browser lock support', async kind => {
  vi.stubGlobal('navigator', kind === 'unsupported' ? {} : { locks: { request: () => Promise.reject(new Error('denied')) } })
  const game = useGameStore(), action = vi.fn(() => true)
  await Promise.resolve()
  game.act(action); game.startLife(); game.advance(60); game.reset(); game.setSpeed(20)
  expect(game.save(true)).toBe(false)
  expect(game.writerReady).toBe(false)
  expect(game.speed).toBe(0)
  expect(game.saveError).toContain('無法安全協調')
  expect(action).not.toHaveBeenCalled()
  expect(storage.setItem).not.toHaveBeenCalled()
})

it('releases ownership on store disposal and a new session reads the latest save', async () => {
  let occupied = false
  vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, callback: (lock: object | null) => unknown) => {
    if (occupied) return Promise.resolve(callback(null))
    occupied = true
    return Promise.resolve(callback({ name: 'oakvale-v1:writer' })).finally(() => { occupied = false })
  } } })
  const first = startedGame()
  first.act(() => movePlayer(first.state, 0, 1))
  const expected = JSON.parse(JSON.stringify(first.state))
  first.$dispose()
  expect(first.save()).toBe(false)
  await Promise.resolve(); await Promise.resolve()
  setActivePinia(createPinia())
  const reopened = useGameStore()
  expect(reopened.writerReady).toBe(true)
  expect(reopened.state).toEqual(expected)
})

it('does not activate an asynchronously granted lease after store disposal', () => {
  let grant: (() => unknown) | undefined
  vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, callback: (lock: object) => unknown) => {
    grant = () => callback({ name: 'oakvale-v1:writer' }); return new Promise(() => {})
  } } })
  const game = useGameStore(); game.$dispose(); grant!()
  expect(game.writerReady).toBe(false)
  expect(storage.setItem).not.toHaveBeenCalled()
})
