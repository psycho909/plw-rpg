import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { movePlayer } from '../src/engine/simulation'
import * as playJournal from '../src/services/playJournal'
import type { PlayRecord } from '../src/services/playJournal'
import { unpackCheckpoint } from '../src/services/playJournal'
import { useGameStore } from '../src/stores/gameStore'

let saved: string | null
let ownerClaimed: boolean
const storage = {
  getItem: () => saved,
  setItem: vi.fn((_key: string, value: string) => { saved = value })
}

beforeEach(() => {
  saved = null
  ownerClaimed = false
  storage.setItem.mockReset().mockImplementation((_key, value) => { saved = value })
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('navigator', { locks: { request: vi.fn((_name, _options, callback) => {
    const lock = ownerClaimed ? null : { name: 'oakvale-v1:writer' }
    ownerClaimed = true
    return Promise.resolve(callback(lock))
  }) } })
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(100000)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function settleMicrotasks() {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

describe('blocked-tab export snapshot boundary', () => {
  it('includes a record when the archive read snapshot precedes owner ACK', async () => {
    const archive: Array<PlayRecord & { ordinal: number }> = []
    let releaseRead: ((snapshot: Array<PlayRecord & { ordinal: number }>) => void) | undefined
    const appendBatch = vi.fn(async (batch: PlayRecord[]) => {
      archive.push(...batch.map(record => ({ ...record, ordinal: archive.length + 1 })))
    })
    const readAll = vi.fn(() => {
      const snapshot = archive.map(record => ({ ...record }))
      return new Promise<Array<PlayRecord & { ordinal: number }>>(resolve => {
        releaseRead = () => resolve(snapshot)
      })
    })
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll })

    const owner = useGameStore()
    await settleMicrotasks()
    expect(owner.startLife()).toBe(true)

    setActivePinia(createPinia())
    const blocked = useGameStore()
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      blobs.push(blob as Blob)
      return 'blob:race'
    })
    vi.stubGlobal('document', { createElement: () => ({ click: vi.fn() }) })

    // readAll snapshots the archive now, then its promise is held until after
    // the owner appends and ACKs its next record in localStorage.
    const exportPromise = blocked.exportJournal()
    expect(readAll).toHaveBeenCalledTimes(1)
    const snapshotRead = archive.length
    owner.act(() => movePlayer(owner.state, 0, 1))
    const operation = unpackCheckpoint(saved!).journal.pending[0]!
    await settleMicrotasks()
    expect(archive.some(record => record.id === operation.id)).toBe(true)
    expect(unpackCheckpoint(saved!).journal.pending.some(record => record.id === operation.id)).toBe(false)

    releaseRead!([...archive].filter(record => record.ordinal <= snapshotRead))
    await exportPromise
    const data = JSON.parse(await blobs[0]!.text())
    const exported = [...data.records, ...data.pending]
    // This is the contract assertion. It fails if the two snapshots can cross
    // the append/ACK boundary and omit the operation from the downloaded JSON.
    expect(exported.some((record: PlayRecord) => record.id === operation.id)).toBe(true)
  })
})
