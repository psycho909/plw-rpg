import { computed, onScopeDispose, ref, shallowRef, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import { createGame, simulate } from '../engine/simulation'
import { projectCharacter } from '../presentation/lifeProjection'
import { captureEvents } from '../engine/events'
import { SAVE_KEY } from '../services/saveService'
import { holdSaveWriter } from '../services/saveWriter'
import { createPlayJournal, emptyJournal, packCheckpoint, unpackCheckpoint, type PlayRecord } from '../services/playJournal'
import type { WorldEvent } from '../domain/types'

const MAX_PENDING_RECORDS = 256
const MAX_PENDING_CHARS = 256_000
const JOURNAL_SUMMARY_PREFIX = '待補寫紀錄摘要：'
const JOURNAL_GAP_PREFIX = '紀錄缺口：'
const COMBINED_JOURNAL_WORLD = 'journal-combined-worlds'

export const useGameStore = defineStore('game', () => {
  const state = shallowRef(createGame()), speed = ref(0), message = ref(''), savedAt = ref<number | null>(null)
  const saveBlocked = ref(false), saveError = ref(''), offline = ref<{
    minutes: number; populationChange: number; matured: number; threatBefore: number; threatAfter: number
    stageBefore: string; stage: string; stageAfter: string; contractsEnded: number; years: number
  } | null>(null)
  const writerReady = ref(false), writerPending = ref(true)
  const journalError = ref(''), pendingRecords = ref(0), repository = createPlayJournal()
  let journal = emptyJournal(), flushing = false, persisted = new Set<string>(), inFlight = new Set<string>()
  let retryTimer: ReturnType<typeof setTimeout> | null = null, retryDelay = 1000
  function isJournalMarker(record: PlayRecord) {
    return record.message.startsWith(JOURNAL_SUMMARY_PREFIX) || record.message.startsWith(JOURNAL_GAP_PREFIX)
  }
  function combinedWorldCount(record: PlayRecord) {
    if (record.worldId !== COMBINED_JOURNAL_WORLD || !isJournalMarker(record)) return 0
    return Number(record.message.match(/：較舊 (\d+) 個世界/)?.[1] ?? 0)
  }
  function gapMarkers(source: PlayRecord, from: number, to: number, mergedWorlds = 0): PlayRecord[] {
    // This reserved, schema-valid id keeps combined markers separate from the current
    // world's event-gap markers. Counts live in both messages, so old schemas load them.
    const base = { worldId: mergedWorlds ? COMBINED_JOURNAL_WORLD : source.worldId, at: source.at, kind: 'time' as const, from, to,
      // Legacy checkpoints allow arbitrary character strings; markers must stay bounded.
      characterId: source.characterId.length <= 128 ? source.characterId : '' }
    const combined = mergedWorlds ? `較舊 ${mergedWorlds} 個世界的紀錄缺口已合併；時間範圍跨世界。` : ''
    return [
      { ...base, id: crypto.randomUUID(), message: `${JOURNAL_SUMMARY_PREFIX}${combined}為控制本機存檔大小，部分較舊紀錄已摘要。`, events: [] },
      { ...base, id: crypto.randomUUID(), message: `${JOURNAL_GAP_PREFIX}${combined}部分逐筆訊息與事件未保留；可由選單匯出目前剩餘紀錄。`, events: [] },
    ]
  }
  function markJournalGap(from: number, to: number) {
    const first = journal.pending.findIndex(record => record.worldId === journal.worldId && isJournalMarker(record))
    const source = first >= 0 ? journal.pending[first] : journal.pending.at(-1)!
    const records = journal.pending.filter(record => {
      if (record.worldId !== journal.worldId || !isJournalMarker(record)) return true
      from = Math.min(from, record.from); to = Math.max(to, record.to)
      return false
    })
    records.splice(first >= 0 ? first : records.length - 1, 0, ...gapMarkers(source, from, to))
    journal.pending = records
    pendingRecords.value = journal.pending.length
    journalError.value = '遊玩紀錄待補寫資料超過上限：較舊逐筆訊息與事件已移除，僅保留時間摘要與缺口標記。可用「匯出遊玩紀錄」保留目前剩餘資料。'
  }
  function compactPending() {
    let pendingChars = 0
    for (const record of journal.pending) pendingChars += JSON.stringify(record).length + 1
    if (journal.pending.length <= MAX_PENDING_RECORDS && pendingChars + 1 <= MAX_PENDING_CHARS) return
    const records = journal.pending
    const size = (items: PlayRecord[]) => items.reduce((sum, item) => sum + JSON.stringify(item).length + 1, 0)
    const worlds = new Map<string, { source: PlayRecord; from: number; to: number; count: number }>()
    for (const record of records) {
      const existing = worlds.get(record.worldId)
      worlds.set(record.worldId, { source: existing?.source ?? record,
        from: Math.min(record.from, existing?.from ?? record.from), to: Math.max(record.to, existing?.to ?? record.to),
        count: Math.max(existing?.count ?? 0, combinedWorldCount(record) || 1) })
    }
    // Reserve space for the newest record when it can fit. Only when per-world
    // pairs cannot fit this budget do we combine oldest worlds, preserving newer pairs.
    const newestChars = size(records.slice(-1))
    const allWorlds = [...worlds.values()]
    const entireRange = allWorlds.reduce((range, world) => ({ from: Math.min(range.from, world.from), to: Math.max(range.to, world.to) }),
      { from: records[0].from, to: records[0].to })
    const smallestSummary = gapMarkers(records[0],
      entireRange.from, entireRange.to,
      allWorlds.reduce((sum, world) => sum + world.count, 0))
    const reserveChars = newestChars + size(smallestSummary) + 1 <= MAX_PENDING_CHARS ? newestChars : 0
    const merged = new Set<string>()
    let compacted = consumePrefix(merged)
    // Preserve round-5 attribution whenever ordinary prefix compaction suffices.
    // Retry with combined worlds only for overflow or avoidable loss of the newest record.
    if (compacted.pending.length > MAX_PENDING_RECORDS || size(compacted.pending) + 1 > MAX_PENDING_CHARS
      || (!compacted.retained && reserveChars > 0)) {
      let projectedCount = worlds.size * 2
      let projectedChars = [...worlds.values()].reduce((sum, world) => sum + size(gapMarkers(world.source, world.from, world.to, world.source.worldId === COMBINED_JOURNAL_WORLD ? world.count : 0)), 0)
      let combined: PlayRecord[] = [], mergedCount = 0
      for (const [worldId, world] of worlds) {
        if (projectedCount + 1 <= MAX_PENDING_RECORDS && projectedChars + reserveChars + 1 <= MAX_PENDING_CHARS) break
        projectedCount -= combined.length ? 2 : 0
        projectedChars -= size(combined) + size(gapMarkers(world.source, world.from, world.to, worldId === COMBINED_JOURNAL_WORLD ? world.count : 0))
        merged.add(worldId); mergedCount += world.count
        combined = gapMarkers(combined[0] ?? world.source,
          Math.min(world.from, combined[0]?.from ?? world.from), Math.max(world.to, combined[0]?.to ?? world.to), mergedCount)
        projectedChars += size(combined)
      }
      compacted = consumePrefix(merged)
    }
    journal.pending = compacted.pending
    pendingRecords.value = journal.pending.length
    journalError.value = '遊玩紀錄待補寫資料超過上限：較舊逐筆訊息與事件已移除，僅保留時間摘要與缺口標記。可用「匯出遊玩紀錄」保留目前剩餘資料。'

    function consumePrefix(merged: Set<string>) {
      const markersByWorld = new Map<string, PlayRecord[]>()
      let remainingChars = pendingChars
      const consumedWorlds = new Set<string>()
      let consumedMergedCount = 0
      let firstRetained = 0, markerChars = 0
      // Consume only an oldest prefix. World times restart on reset, so queue order
      // (and the source timestamp), rather than from/to, defines chronology.
      while (firstRetained < records.length) {
        const next = records[firstRetained]
        const key = merged.has(next.worldId) ? COMBINED_JOURNAL_WORLD : next.worldId
        if (records.length - firstRetained + markersByWorld.size * 2 <= MAX_PENDING_RECORDS
          && remainingChars + markerChars + 1 <= MAX_PENDING_CHARS
          && !(isJournalMarker(next) && markersByWorld.has(key))) break
        firstRetained++
        remainingChars -= JSON.stringify(next).length + 1
        const existing = markersByWorld.get(key)
        if (merged.has(next.worldId) && !consumedWorlds.has(next.worldId)) {
          consumedMergedCount += worlds.get(next.worldId)!.count
          consumedWorlds.add(next.worldId)
        }
        if (existing) markerChars -= existing.reduce((size, marker) => size + JSON.stringify(marker).length + 1, 0)
        const markers = gapMarkers(existing?.[0] ?? next,
          Math.min(next.from, existing?.[0].from ?? next.from), Math.max(next.to, existing?.[0].to ?? next.to),
          key === COMBINED_JOURNAL_WORLD ? consumedMergedCount || worlds.get(key)!.count : 0)
        markersByWorld.set(key, markers)
        markerChars += markers.reduce((size, marker) => size + JSON.stringify(marker).length + 1, 0)
      }
      return { pending: [...markersByWorld.values()].flat().concat(records.slice(firstRetained)), retained: firstRetained < records.length }
    }
  }
  function record(kind: PlayRecord['kind'], from: number, events: WorldEvent[], result: string) {
    let previous = journal.pending.at(-1)
    if (kind === 'time' && previous?.kind === 'time' && previous.worldId === journal.worldId
      && !inFlight.has(previous.id)
      && !previous.message.startsWith(JOURNAL_SUMMARY_PREFIX) && !previous.message.startsWith(JOURNAL_GAP_PREFIX)) {
      if (persisted.has(previous.id)) {
        // An older checkpoint may replay the old id after a failed save or lost acknowledgement.
        previous = { ...previous, id: crypto.randomUUID() }
        journal.pending[journal.pending.length - 1] = previous
      }
      previous.at = Date.now(); previous.to = state.value.worldTime
      const combinedEvents = [...previous.events, ...events]
      if (combinedEvents.length > 128) {
        previous.events = combinedEvents.slice(-128)
        markJournalGap(previous.from, previous.to)
      } else previous.events = combinedEvents
      previous.message = `世界時間由 ${previous.from} 推進至 ${previous.to} 分鐘。`
    } else {
      journal.pending.push({ id: crypto.randomUUID(), worldId: journal.worldId, at: Date.now(), kind, from, to: state.value.worldTime,
        characterId: state.value.activeCharacterId, message: result, events })
    }
    pendingRecords.value = journal.pending.length
    compactPending()
  }
  function loadCheckpoint(writable: boolean) {
    speed.value = 0; saveBlocked.value = false; savedAt.value = null
    journal = emptyJournal(); persisted = new Set(); pendingRecords.value = 0
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) {
        const loaded = unpackCheckpoint(raw); state.value = loaded.state; journal = loaded.journal
        persisted = new Set(journal.pending.map(r => r.id)); pendingRecords.value = journal.pending.length
        if (writable && loaded.imported) record('imported', state.value.worldTime, state.value.events.map(e => ({ ...e })), '啟用追加紀錄；較早的完整遊玩紀錄未追溯補齊。')
        speed.value = writable && state.value.life.openingSeen ? 1 : 0
        savedAt.value = loaded.lastSavedAt
      } else {
        state.value = createGame()
        if (writable) record('created', state.value.worldTime, state.value.events.map(e => ({ ...e })), '新的世界開始了。')
      }
    } catch (error) { message.value = error instanceof Error ? error.message : '無法讀取存檔。'; saveBlocked.value = true }
  }
  // Read-only preview. Acquisition re-reads under the lock before any write or action.
  loadCheckpoint(false)
  const character = computed(() => projectCharacter(state.value))
  function scheduleJournalRetry() {
    if (retryTimer || saveBlocked.value || !writerReady.value) return
    const delay = retryDelay
    retryDelay = Math.min(retryDelay * 2, 60_000)
    retryTimer = setTimeout(() => { retryTimer = null; void flushJournal() }, delay)
  }
  async function flushJournal() {
    if (flushing || retryTimer || saveBlocked.value || !writerReady.value) return
    flushing = true
    try {
      while (true) {
        const batch = journal.pending.filter(r => persisted.has(r.id)).slice(0, 64)
        if (!batch.length) break
        inFlight = new Set(batch.map(r => r.id))
        await repository.appendBatch(batch)
        inFlight.clear()
        const acknowledged = new Set(batch.map(r => r.id))
        // Work from the latest queue and latest world, never the pre-await snapshot.
        journal.pending = journal.pending.filter(r => !acknowledged.has(r.id)); pendingRecords.value = journal.pending.length
        journalError.value = ''; retryDelay = 1000
        if (!save(false, false)) break
      }
    } catch (error) {
      journalError.value = `${error instanceof Error ? error.message : ''} 遊玩紀錄尚待補寫。請重試存檔，或匯出保留。`.trim()
      scheduleJournalRetry()
    }
    finally { inFlight.clear(); flushing = false }
  }
  function requestJournalFlush(manual: boolean) {
    if (retryTimer) {
      if (!manual) return
      clearTimeout(retryTimer); retryTimer = null; retryDelay = 1000
    }
    void flushJournal()
  }
  function save(manual = false, flush = true) {
    if (!writerReady.value) return false
    if (saveBlocked.value) { if (manual) message.value = '原始存檔已保留。請確認後使用「重建世界」。'; return false }
    try {
      const recoveringMessage = !!saveError.value && message.value === saveError.value
      const now = Date.now()
      compactPending()
      localStorage.setItem(SAVE_KEY, packCheckpoint(state.value, journal, now)); savedAt.value = now; saveError.value = ''
      persisted = new Set(journal.pending.map(r => r.id))
      if (flush) requestJournalFlush(manual)
      if (manual || recoveringMessage) message.value = '世界已儲存。'; return true
    } catch {
      speed.value = 0; saveError.value = '存檔失敗：瀏覽器儲存空間不足或被停用，時間已暫停，請保留此頁。'; message.value = saveError.value
      if (flush) requestJournalFlush(manual)
      return false
    }
  }
  function adoptCheckpoint(raw: string) {
    if (!writerReady.value) throw new Error('只有持有存檔寫入權的分頁可以載入雲端存檔。')
    unpackCheckpoint(raw)
    const previousSpeed = speed.value
    writerReady.value = false; speed.value = 0
    try { localStorage.setItem(SAVE_KEY, raw) }
    catch (error) {
      writerReady.value = true; speed.value = previousSpeed
      saveError.value = '存檔失敗：瀏覽器儲存空間不足或被停用，時間已暫停，請保留此頁。'; message.value = saveError.value
      throw error
    }
    location.reload()
  }
  function reset() {
    if (!writerReady.value) return
    const before = state.value.worldTime, pending = journal.pending
    state.value = createGame(); offline.value = null; speed.value = 0; saveBlocked.value = false
    journal = { ...emptyJournal(), pending }; record('reset', before, state.value.events.map(e => ({ ...e })), '重建新的世界；先前遊玩紀錄保留。'); save(true)
  }
  function canProgress() { return writerReady.value && !saveBlocked.value && (!saveError.value || save()) }
  function setSpeed(next: number) {
    if (next && (!state.value.life.openingSeen || !canProgress())) return
    speed.value = next
  }
  function startLife() {
    if (saveBlocked.value) return false
    if (!canProgress()) return false
    state.value.life.openingSeen = true
    triggerRef(state)
    if (!save()) return false
    speed.value = 1
    return true
  }
  function advance(minutes: number) {
    if (!state.value.life.openingSeen || !canProgress()) return
    const before = state.value.worldTime, captured = captureEvents(state.value, () => simulate(state.value, minutes))
    triggerRef(state)
    if (state.value.worldTime !== before) { record('time', before, captured.events, '世界時間繼續前進。'); save() }
  }
  type ActPolicy<T> = { message: (result: T, events: WorldEvent[]) => string; succeeded: (result: T) => boolean }
  function act<T extends string | boolean>(action: () => T): T | undefined
  function act<T>(action: () => T, policy: ActPolicy<T>): T | undefined
  function act<T>(action: () => T, policy?: ActPolicy<T>): T | undefined {
    if (!state.value.life.openingSeen || !canProgress()) return undefined
    const before = state.value.worldTime, sequence = state.value.eventSequence, captured = captureEvents(state.value, action), result = captured.result
    triggerRef(state)
    const bossDefeat = captured.events.find(event => event.type === 'boss.defeated'
      || event.type === 'wolf.boss.defeated' || event.type === 'content.boss.defeated')
    const combatVictory = captured.events.find(event => event.type === 'combat.won')
    const bossVictoryMessage = bossDefeat && combatVictory ? `${bossDefeat.message} ${combatVictory.message}` : null
    message.value = policy
      ? policy.message(result, captured.events)
      : typeof result === 'string' ? result || bossVictoryMessage || state.value.events.at(-1)?.message || '完成。' : result ? '已到達。' : '目前無法移動。'
    const succeeded = policy ? policy.succeeded(result) : result === '' || result === true
    if (succeeded || before !== state.value.worldTime || sequence !== state.value.eventSequence) {
      record('action', before, captured.events, message.value); save()
    }
    return result
  }
  async function exportJournal() {
    let records: Awaited<ReturnType<typeof repository.readAll>> = [], archiveAvailable = true
    try { records = await repository.readAll() } catch { archiveAvailable = false }
    let checkpoint: unknown, pending = journal.pending
    if (writerReady.value) checkpoint = JSON.parse(packCheckpoint(state.value, journal))
    else {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        pending = raw ? unpackCheckpoint(raw).journal.pending : []
        checkpoint = raw ? JSON.parse(raw) : null
      } catch { message.value = '無法讀取最新存檔，請回到正在遊玩的頁面匯出紀錄。'; return }
    }
    const data = { version: 1, exportedAt: Date.now(), archiveAvailable, records, pending, checkpoint }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'oakvale-play-records.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    if (!archiveAvailable) journalError.value = '紀錄庫暫時無法讀取；匯出包含待補寫紀錄與目前進度，尚未包含全部舊紀錄。'
  }
  let disposed = false
  async function transferLegacyPending() {
    while (!disposed && journal.pending.length) {
      const batch = journal.pending.slice(0, 64)
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await new Promise(resolve => setTimeout(resolve, attempt * 1000))
        if (disposed) return
        let timeout: ReturnType<typeof setTimeout> | undefined
        try {
          await Promise.race([
            repository.appendBatch(batch),
            new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('遊玩紀錄轉移逾時。')), 5000) }),
          ])
          if (disposed) return
          const acknowledged = new Set(batch.map(record => record.id))
          journal.pending = journal.pending.filter(record => !acknowledged.has(record.id))
          pendingRecords.value = journal.pending.length
          break
        } catch {
          if (attempt === 2) return
        } finally { if (timeout !== undefined) clearTimeout(timeout) }
      }
    }
  }
  saveError.value = '正在確認存檔使用狀態，請稍候。'
  const releaseWriter = holdSaveWriter(() => {
    loadCheckpoint(true)
    const pendingChars = journal.pending.reduce((sum, record) => sum + JSON.stringify(record).length + 1, 0)
    if (journal.pending.length > MAX_PENDING_RECORDS || pendingChars + 1 > MAX_PENDING_CHARS) {
      void transferLegacyPending().then(() => {
        if (disposed) return
        saveError.value = ''; writerReady.value = true; writerPending.value = false
        if (!saveBlocked.value) save()
      })
      return
    }
    saveError.value = ''; writerReady.value = true; writerPending.value = false
    if (!saveBlocked.value) save()
  }, error => { writerReady.value = false; writerPending.value = false; speed.value = 0; saveError.value = error; message.value = error })
  onScopeDispose(() => {
    disposed = true
    writerReady.value = false; writerPending.value = false; speed.value = 0
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null; releaseWriter()
  })
  return { state, speed, setSpeed, startLife, message, savedAt, saveBlocked, saveError, writerReady, writerPending, offline, character, save, reset, adoptCheckpoint, advance, act, journalError, pendingRecords, exportJournal }
})
