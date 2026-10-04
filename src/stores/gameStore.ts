import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createGame, player, simulate } from '../engine/simulation'
import { captureEvents } from '../engine/events'
import { offlineProgress, SAVE_KEY } from '../services/saveService'
import { createPlayJournal, emptyJournal, packCheckpoint, unpackCheckpoint, type PlayRecord } from '../services/playJournal'
import type { WorldEvent } from '../domain/types'

export const useGameStore = defineStore('game', () => {
  const state = ref(createGame()), speed = ref(1), message = ref(''), savedAt = ref<number | null>(null)
  const saveBlocked = ref(false), saveError = ref(''), offline = ref<ReturnType<typeof offlineProgress>>(null)
  const journalError = ref(''), pendingRecords = ref(0), repository = createPlayJournal()
  let journal = emptyJournal(), flushing = false, persisted = new Set<string>()
  function record(kind: PlayRecord['kind'], from: number, events: WorldEvent[], result: string) {
    journal.pending.push({ id: crypto.randomUUID(), worldId: journal.worldId, at: Date.now(), kind, from, to: state.value.worldTime,
      characterId: state.value.activeCharacterId, message: result, events })
    pendingRecords.value = journal.pending.length
  }
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const loaded = unpackCheckpoint(raw); state.value = loaded.state; journal = loaded.journal
      persisted = new Set(journal.pending.map(r => r.id)); pendingRecords.value = journal.pending.length
      if (loaded.imported) record('imported', state.value.worldTime, state.value.events.map(e => ({ ...e })), '啟用追加紀錄；較早的完整遊玩紀錄未追溯補齊。')
      const before = state.value.worldTime, captured = captureEvents(state.value, () => offlineProgress(state.value, loaded.lastSavedAt))
      offline.value = captured.result; savedAt.value = loaded.lastSavedAt
      if (state.value.worldTime !== before) record('offline', before, captured.events, '離線世界進度。')
    } else record('created', state.value.worldTime, state.value.events.map(e => ({ ...e })), '新的世界開始了。')
  } catch (error) { message.value = error instanceof Error ? error.message : '無法讀取存檔。'; saveBlocked.value = true }
  const character = computed(() => player(state.value))
  async function flushJournal() {
    if (flushing || saveBlocked.value) return
    flushing = true
    try {
      while (true) {
        const batch = journal.pending.filter(r => persisted.has(r.id))
        if (!batch.length) break
        await repository.appendBatch(batch)
        const acknowledged = new Set(batch.map(r => r.id))
        // Work from the latest queue and latest world, never the pre-await snapshot.
        journal.pending = journal.pending.filter(r => !acknowledged.has(r.id)); pendingRecords.value = journal.pending.length
        journalError.value = ''
        if (!save(false, false)) break
      }
    } catch (error) {
      journalError.value = `${error instanceof Error ? error.message : ''} 遊玩紀錄尚待補寫。請重試存檔，或匯出保留。`.trim()
    }
    finally { flushing = false }
  }
  function save(manual = false, flush = true) {
    if (saveBlocked.value) { if (manual) message.value = '原始存檔已保留。請確認後使用「重建世界」。'; return false }
    try {
      const recoveringMessage = !!saveError.value && message.value === saveError.value
      const now = Date.now()
      localStorage.setItem(SAVE_KEY, packCheckpoint(state.value, journal, now)); savedAt.value = now; saveError.value = ''
      persisted = new Set(journal.pending.map(r => r.id))
      if (flush) void flushJournal()
      if (manual || recoveringMessage) message.value = '世界已儲存。'; return true
    } catch { speed.value = 0; saveError.value = '存檔失敗：瀏覽器儲存空間不足或被停用，時間已暫停，請保留此頁。'; message.value = saveError.value; return false }
  }
  function reset() {
    const before = state.value.worldTime, pending = journal.pending
    state.value = createGame(); offline.value = null; speed.value = 1; saveBlocked.value = false
    journal = { ...emptyJournal(), pending }; record('reset', before, state.value.events.map(e => ({ ...e })), '重建新的世界；先前遊玩紀錄保留。'); save(true)
  }
  function canProgress() { return !saveError.value || save() }
  function setSpeed(next: number) {
    if (next && !canProgress()) return
    speed.value = next
  }
  function advance(minutes: number) {
    if (!canProgress()) return
    const before = state.value.worldTime, captured = captureEvents(state.value, () => simulate(state.value, minutes))
    if (state.value.worldTime !== before) { record('time', before, captured.events, '世界時間繼續前進。'); save() }
  }
  function act(action: () => string | boolean) {
    if (!canProgress()) return
    const before = state.value.worldTime, sequence = state.value.eventSequence, captured = captureEvents(state.value, action), result = captured.result
    message.value = typeof result === 'string' ? result || state.value.events.at(-1)?.message || '完成。' : result ? '已到達。' : '目前無法移動。'
    if (result === '' || result === true || before !== state.value.worldTime || sequence !== state.value.eventSequence) {
      record('action', before, captured.events, message.value); save()
    }
  }
  async function exportJournal() {
    let records: Awaited<ReturnType<typeof repository.readAll>> = [], archiveAvailable = true
    try { records = await repository.readAll() } catch { archiveAvailable = false }
    const data = { version: 1, exportedAt: Date.now(), archiveAvailable, records, pending: journal.pending, checkpoint: JSON.parse(packCheckpoint(state.value, journal)) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'oakvale-play-records.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    if (!archiveAvailable) journalError.value = '紀錄庫暫時無法讀取；匯出包含待補寫紀錄與目前進度，尚未包含全部舊紀錄。'
  }
  if (!saveBlocked.value) save()
  return { state, speed, setSpeed, message, savedAt, saveBlocked, saveError, offline, character, save, reset, advance, act, journalError, pendingRecords, exportJournal }
})
