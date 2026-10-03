import type { GameState, WorldEvent } from '../domain/types'
import { deserialize, serialize } from './saveService'

export interface PlayRecord {
  id: string; worldId: string; at: number; kind: 'created' | 'imported' | 'action' | 'time' | 'offline' | 'reset'
  from: number; to: number; characterId: string; message: string; events: WorldEvent[]
}
export interface JournalCheckpoint { version: 1; worldId: string; pending: PlayRecord[] }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9-]{1,128}$/.test(v)
const minute = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0
export function emptyJournal(): JournalCheckpoint { return { version: 1, worldId: crypto.randomUUID(), pending: [] } }

export function packCheckpoint(state: GameState, journal: JournalCheckpoint, now = Date.now()) {
  return JSON.stringify({ ...JSON.parse(serialize(state, now)), playJournal: journal })
}
export function unpackCheckpoint(raw: string) {
  const value: unknown = JSON.parse(raw)
  if (!object(value)) return { ...deserialize(raw), journal: emptyJournal(), imported: true }
  const { playJournal, ...game } = value
  const loaded = deserialize(JSON.stringify(game))
  if (playJournal === undefined) return { ...loaded, journal: emptyJournal(), imported: true }
  if (!object(playJournal) || playJournal.version !== 1 || !id(playJournal.worldId) || !Array.isArray(playJournal.pending)
    || !playJournal.pending.every(r => object(r) && id(r.id) && id(r.worldId) && minute(r.at) && minute(r.from) && minute(r.to)
      && typeof r.characterId === 'string' && typeof r.message === 'string' && typeof r.kind === 'string' && ['created', 'imported', 'action', 'time', 'offline', 'reset'].includes(r.kind)
      && Array.isArray(r.events) && r.events.every(e => object(e) && Number.isSafeInteger(e.id) && Number(e.id) > 0 && minute(e.at)
        && typeof e.type === 'string' && typeof e.message === 'string' && typeof e.category === 'string' && ['player', 'npc', 'world', 'monster', 'settlement'].includes(e.category)))
    || new Set(playJournal.pending.map(r => r.id)).size !== playJournal.pending.length) throw new Error('待補寫的遊玩紀錄不完整。原始存檔已保留。')
  return { ...loaded, journal: playJournal as unknown as JournalCheckpoint, imported: false }
}

type StoredRecord = PlayRecord & { ordinal: number }
export function createPlayJournal() {
  let opening: Promise<IDBDatabase> | null = null
  function database() {
    if (!opening) opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('此環境無法使用遊玩紀錄庫。')); return }
      const request = indexedDB.open('oakvale-play-journal', 1)
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('records', { keyPath: 'ordinal', autoIncrement: true })
        store.createIndex('id', 'id', { unique: true })
      }
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('請先關閉其他使用舊紀錄庫的分頁。'))
    }).catch(error => { opening = null; throw error })
    return opening
  }
  async function appendBatch(records: PlayRecord[]) {
    if (!records.length) return
    const db = await database()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite'), store = transaction.objectStore('records')
      let mismatch = false
      transaction.oncomplete = () => resolve()
      // Request errors can bubble before abort with a null transaction.error.
      // Only the terminal abort supplies the final reason and confirms rollback.
      transaction.onabort = () => reject(mismatch ? new Error('同一紀錄編號的內容不同，已保留待送資料。')
        : transaction.error ?? new Error('遊玩紀錄尚未追加成功。'))
      for (const record of records) {
        const request = store.index('id').get(record.id)
        request.onsuccess = () => {
          if (request.result === undefined) store.add(record)
          else {
            const { ordinal: _ordinal, ...saved } = request.result as StoredRecord
            if (JSON.stringify(saved) !== JSON.stringify(record)) { mismatch = true; transaction.abort() }
          }
        }
      }
    })
  }
  async function readAll(): Promise<StoredRecord[]> {
    const db = await database()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readonly'), request = transaction.objectStore('records').getAll()
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  }
  return { appendBatch, readAll }
}
