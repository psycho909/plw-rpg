import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createGame, player, simulate } from '../engine/simulation'
import { deserialize, offlineProgress, SAVE_KEY, serialize } from '../services/saveService'

export const useGameStore = defineStore('game', () => {
  const state = ref(createGame()), speed = ref(1), message = ref(''), savedAt = ref<number | null>(null)
  const saveBlocked = ref(false), saveError = ref(''), offline = ref<ReturnType<typeof offlineProgress>>(null)
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const loaded = deserialize(raw); state.value = loaded.state
      offline.value = offlineProgress(state.value, loaded.lastSavedAt); savedAt.value = loaded.lastSavedAt
    }
  } catch (error) { message.value = error instanceof Error ? error.message : '無法讀取存檔。'; saveBlocked.value = true }
  const character = computed(() => player(state.value))
  function save(manual = false) {
    if (saveBlocked.value) { if (manual) message.value = '原始存檔已保留。請確認後使用「重建世界」。'; return false }
    try {
      const recoveringMessage = !!saveError.value && message.value === saveError.value
      localStorage.setItem(SAVE_KEY, serialize(state.value)); savedAt.value = Date.now(); saveError.value = ''
      if (manual || recoveringMessage) message.value = '世界已儲存。'; return true
    } catch { saveError.value = '存檔失敗：瀏覽器儲存空間不足或被停用，請保留此頁。'; message.value = saveError.value; return false }
  }
  function reset() {
    state.value = createGame(); offline.value = null; speed.value = 1; saveBlocked.value = false; save(true)
  }
  function advance(minutes: number) { simulate(state.value, minutes) }
  function act(action: () => string | boolean) {
    const result = action()
    message.value = typeof result === 'string' ? result || state.value.events.at(-1)?.message || '完成。' : result ? '已到達。' : '目前無法移動。'
  }
  return { state, speed, message, savedAt, saveBlocked, saveError, offline, character, save, reset, advance, act }
})
