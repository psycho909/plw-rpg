import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js'
import { useGameStore } from './gameStore'
import { SAVE_KEY } from '../services/saveService'
import { unpackCheckpoint } from '../services/playJournal'
import { classifyCloudError, CloudSaveError, fetchCloudSave, uploadCheckpoint, validateCheckpoint, type CloudSave } from '../services/cloudSave'

export const SYNC_KEY = 'oakvale-cloud-sync-v1'
export const SYNC_INTERVAL = 5 * 60 * 1000
interface SyncMetadata { userId: string; revision: number; checksum: string; worldId: string; syncedAt: number }

export const useCloudStore = defineStore('cloud', () => {
  const game = useGameStore()
  const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const enabled = ref(!!url && !!key)
  let client: ReturnType<typeof createClient> | null = null
  try {
    if (enabled.value) client = createClient(url!, key!, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  } catch { enabled.value = false }
  const session = shallowRef<Session | null>(null), cloud = shallowRef<CloudSave | null>(null)
  const metadata = ref<SyncMetadata | null>(null), conflict = ref(false), busy = ref(false)
  const online = ref(typeof navigator === 'undefined' || navigator.onLine !== false)
  const status = ref(enabled.value ? 'signed-out' : 'disabled')
  const errorMessage = ref('')
  const authRequired = ref(false)
  const account = computed(() => session.value?.user.user_metadata?.user_name ?? session.value?.user.email ?? session.value?.user.id ?? '')
  const lastSyncedAt = computed(() => metadata.value?.syncedAt ?? null)
  let authGeneration = 0
  let failedAccessToken: string | undefined
  function fail(error: unknown) {
    const failure = classifyCloudError(error)
    if (failure.kind === 'auth') { authRequired.value = true; failedAccessToken = session.value?.access_token }
    status.value = failure.kind
    errorMessage.value = failure.kind === 'auth' ? '請重新登入。' : failure.kind === 'offline' ? '雲端連線失敗，本機進度仍保留；下次存檔再試。'
      : failure.kind === 'conflict' ? '雲端已有不同版本，請選擇保留的進度。' : '存檔毀損、超過 8 MiB 或雲端回傳不符，已拒絕使用。'
    if (failure.kind === 'conflict') { conflict.value = true; cloud.value = failure.cloud }
    if (failure.refetchFailure) fail(failure.refetchFailure)
  }
  function readMetadata(uid: string) {
    metadata.value = null
    try {
      const raw = localStorage.getItem(SYNC_KEY)
      const value = raw ? JSON.parse(raw) : null
      if (value?.userId === uid && Number.isSafeInteger(value.revision) && value.revision > 0
        && typeof value.checksum === 'string' && /^[a-f0-9]{64}$/.test(value.checksum)
        && typeof value.worldId === 'string' && value.worldId && Number.isSafeInteger(value.syncedAt) && value.syncedAt >= 0) metadata.value = value
    } catch { /* Metadata is advisory; never alter the game save to recover it. */ }
  }
  function remember(row: CloudSave) {
    metadata.value = { userId: row.user_id, revision: row.revision, checksum: row.checksum, worldId: row.world_id, syncedAt: Date.now() }
    try { localStorage.setItem(SYNC_KEY, JSON.stringify(metadata.value)) }
    catch { errorMessage.value = '同步已成功，但瀏覽器無法保存同步資訊；重新登入時可能需要確認衝突。' }
  }
  function allowed() {
    return !!client && !!session.value && game.writerReady && online.value && !authRequired.value && !busy.value
  }
  async function refresh() {
    if (!client || !session.value || busy.value || !online.value || authRequired.value) return
    const uid = session.value.user.id, generation = authGeneration
    busy.value = true
    try {
      const row = await fetchCloudSave(client, uid)
      if (generation !== authGeneration) return
      cloud.value = row
      if (row && (!metadata.value || metadata.value.revision !== row.revision || metadata.value.checksum !== row.checksum)) {
        fail(new CloudSaveError('conflict', row))
      } else { status.value = conflict.value ? 'conflict' : 'ready'; errorMessage.value = '' }
    } catch (error) { if (generation === authGeneration) fail(error) }
    finally { busy.value = false }
  }
  function acceptSession(next: Session | null, event?: AuthChangeEvent) {
    if (next && session.value?.user.id === next.user.id) {
      session.value = next
      if (authRequired.value && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
        && next.access_token && next.access_token !== failedAccessToken) {
        authRequired.value = false; failedAccessToken = undefined
        status.value = conflict.value ? 'conflict' : 'ready'
        errorMessage.value = conflict.value ? '雲端已有不同版本，請選擇保留的進度。' : ''
      }
      return
    }
    authGeneration++
    authRequired.value = false; failedAccessToken = undefined
    session.value = next; cloud.value = null; conflict.value = false; errorMessage.value = ''
    if (next) { readMetadata(next.user.id); status.value = 'ready' }
    else { metadata.value = null; status.value = 'signed-out' }
  }
  let unsubscribe: (() => void) | undefined
  if (client) {
    const { data } = client.auth.onAuthStateChange((event, next) => { acceptSession(next, event) })
    unsubscribe = () => data.subscription.unsubscribe()
    const generation = authGeneration
    void client.auth.getSession().then(({ data, error }) => {
      if (generation !== authGeneration) return
      if (error) fail(error)
      else acceptSession(data.session)
    }).catch(fail)
  }
  watch(() => session.value?.user.id, () => { void refresh() })
  async function login() {
    if (!client || busy.value) return
    try {
      const { error } = await client.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.origin + location.pathname } })
      if (error) fail(error)
    } catch (error) { fail(error) }
  }
  async function logout() {
    if (!client || busy.value) return
    try { const { error } = await client.auth.signOut(); if (error) fail(error); else acceptSession(null) }
    catch (error) { fail(error) }
  }
  async function uploadExpected(expected: number | null) {
    if (!allowed()) return false
    const uid = session.value!.user.id, generation = authGeneration
    busy.value = true
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) throw new CloudSaveError('invalid')
      const row = await uploadCheckpoint(client!, uid, raw, expected)
      if (generation !== authGeneration) return false
      cloud.value = row; conflict.value = false; status.value = 'ready'; errorMessage.value = ''; remember(row)
      return true
    } catch (error) { if (generation === authGeneration) fail(error); return false }
    finally { busy.value = false }
  }
  async function upload() {
    if (conflict.value) return false
    return uploadExpected(metadata.value?.revision ?? null)
  }
  async function overwriteCloud(confirm: (row: CloudSave | null) => boolean) {
    if (!allowed()) return false
    const uid = session.value!.user.id, generation = authGeneration
    busy.value = true
    let latest: CloudSave | null
    try {
      latest = await fetchCloudSave(client!, uid)
      if (generation !== authGeneration || !game.writerReady || !confirm(latest)) return false
    } catch (error) { if (generation === authGeneration) fail(error); return false }
    finally { busy.value = false }
    return uploadExpected(latest?.revision ?? null)
  }
  async function loadCloud(backup: (raw: string) => boolean, confirm: (row: CloudSave, local: string) => boolean) {
    if (!allowed()) return false
    const uid = session.value!.user.id, generation = authGeneration
    busy.value = true
    try {
      const row = await fetchCloudSave(client!, uid)
      if (!row) { errorMessage.value = '尚無雲端存檔。'; return false }
      if (generation !== authGeneration || !game.writerReady || !game.save()) return false
      const local = localStorage.getItem(SAVE_KEY)
      if (!local) throw new CloudSaveError('invalid')
      validateCheckpoint(local)
      if (!backup(local) || !confirm(row, local) || generation !== authGeneration || !game.writerReady) return false
      game.adoptCheckpoint(row.checkpoint)
      remember(row)
      cloud.value = row; conflict.value = false; status.value = 'ready'
      return true
    } catch (error) { if (generation === authGeneration) fail(error); return false }
    finally { busy.value = false }
  }
  watch(() => game.savedAt, async savedAt => {
    if (!savedAt || !allowed() || conflict.value || Date.now() - (metadata.value?.syncedAt ?? 0) < SYNC_INTERVAL) return
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (metadata.value && raw && unpackCheckpoint(raw).journal.worldId !== metadata.value.worldId) {
        fail(new CloudSaveError('conflict', cloud.value)); return
      }
      await upload()
    } catch (error) { fail(error) }
  })
  const onOnline = () => { online.value = true; if (status.value === 'offline') status.value = authRequired.value ? 'auth' : conflict.value ? 'conflict' : session.value ? 'ready' : 'signed-out' }
  const onOffline = () => { online.value = false; status.value = 'offline' }
  if (typeof window !== 'undefined') { window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline) }
  onScopeDispose(() => {
    authGeneration++; unsubscribe?.()
    if (typeof window !== 'undefined') { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  })
  return { enabled, session, account, cloud, metadata, lastSyncedAt, conflict, busy, online, status, authRequired, errorMessage, login, logout, refresh, upload, overwriteCloud, loadCloud }
})
