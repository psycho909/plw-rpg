import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '../engine/simulation'
import { serialize } from './saveService'
import { createPlayJournal, emptyJournal, packCheckpoint, unpackCheckpoint, type PlayRecord } from './playJournal'

function versionOneFixture(lastSavedAt = 100000) {
  const raw = JSON.parse(serialize(createGame(88), lastSavedAt))
  delete raw.life
  delete raw.reward
  delete raw.regionalCrisis
  raw.saveVersion = 1
  for (const actor of [...raw.characters, ...raw.npcs]) delete actor.skills.smithing
  for (const event of [...raw.events, ...raw.history]) delete event.tier
  return JSON.stringify(raw)
}

afterEach(() => vi.unstubAllGlobals())

describe('atomic local checkpoint envelope', () => {
  it('migrates a valid V1 world and starts a separate journal', () => {
    const loaded = unpackCheckpoint(versionOneFixture())
    expect(loaded.state.saveVersion).toBe(6); expect(loaded.state.life.openingSeen).toBe(true); expect(loaded.imported).toBe(true)
    expect(loaded.journal.pending).toEqual([])
  })
  it('preserves historical offline journal entries unchanged during V1 migration', () => {
    const raw = JSON.parse(versionOneFixture()), journal = emptyJournal()
    journal.worldId = 'world-1'
    journal.pending.push({ id: 'offline-old', worldId: journal.worldId, at: 90000, kind: 'offline', from: 480, to: 960,
      characterId: 'player-1', message: '既有的 V1 離線紀錄', events: [] })
    raw.playJournal = journal
    const loaded = unpackCheckpoint(JSON.stringify(raw))
    expect(loaded.state.worldTime).toBe(480)
    expect(loaded.journal.pending).toEqual(journal.pending)
    expect(loaded.imported).toBe(false)
  })
  it('round trips both the checkpoint and pending records without engine metadata', () => {
    const state = createGame(), journal = emptyJournal()
    journal.pending.push({ id: 'pending-1', worldId: journal.worldId, at: 100000, kind: 'action', from: 480, to: 485,
      characterId: state.activeCharacterId, message: '已移動', events: [] })
    const loaded = unpackCheckpoint(packCheckpoint(state, journal, 100000))
    expect(loaded.state).toEqual(state); expect(loaded.journal).toEqual(journal); expect(loaded.imported).toBe(false)
  })
  it('protects a checkpoint with damaged pending-record metadata', () => {
    const value = JSON.parse(packCheckpoint(createGame(), emptyJournal(), 100000))
    value.playJournal.pending = [{ id: 'broken' }]
    expect(() => unpackCheckpoint(JSON.stringify(value))).toThrow('原始存檔已保留')
  })
})

describe('journal transaction failure lifecycle', () => {
  it.each(['conflict', 'quota'] as const)('rejects with the final %s reason after a request error precedes abort', async (failure) => {
    const record: PlayRecord = { id: 'record-1', worldId: 'world-1', at: 100000, kind: 'action',
      from: 480, to: 485, characterId: 'player-1', message: 'new body', events: [] }
    const conflict = '同一紀錄編號的內容不同，已保留待送資料。'
    const quota = new DOMException('Journal quota exceeded', 'QuotaExceededError')
    const events: string[] = []
    let aborted = false
    // Thin event-order model: explicit abort also emits errors for queued requests;
    // transaction.error can still be null when those errors bubble to onerror.
    const transaction: {
      error: DOMException | null; onerror?: () => void; onabort?: () => void; oncomplete?: () => void
      objectStore: () => typeof store; abort: () => void
    } = { error: null, objectStore: () => store, abort: () => terminate(null) }
    function terminate(error: DOMException | null) {
      aborted = true
      queueMicrotask(() => {
        events.push('error'); transaction.onerror?.()
        transaction.error = error
        events.push('abort'); transaction.onabort?.()
      })
    }
    const store = {
      index: () => ({ get: () => {
        const request: { result: (PlayRecord & { ordinal: number }) | undefined; onsuccess?: () => void } = {
          result: failure === 'conflict' ? { ...record, ordinal: 1, message: 'original body' } : undefined,
        }
        queueMicrotask(() => { if (!aborted) request.onsuccess?.() })
        return request
      } }),
      add: () => terminate(quota),
    }
    vi.stubGlobal('indexedDB', { open: () => {
      const request = { result: { transaction: () => transaction }, onsuccess: undefined as (() => void) | undefined }
      queueMicrotask(() => request.onsuccess?.())
      return request
    } })
    const writing = createPlayJournal().appendBatch([record, { ...record, id: 'record-2' }])
    await expect(writing).rejects.toMatchObject({ message: failure === 'conflict' ? conflict : quota.message })
    expect(events).toEqual(['error', 'abort'])
  })
})
