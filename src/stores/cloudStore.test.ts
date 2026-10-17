import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { createGame } from '../engine/simulation'
import { emptyJournal, packCheckpoint } from '../services/playJournal'
import * as playJournal from '../services/playJournal'
import { startLoop } from '../engine/gameLoop'
import { SAVE_KEY } from '../services/saveService'
import { sha256 } from '../services/cloudSave'
import { useCloudStore, SYNC_INTERVAL, SYNC_KEY } from './cloudStore'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), game: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('./gameStore', () => ({ useGameStore: mocks.game }))

const session: Session = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_in: 3600,
  token_type: 'bearer', user: { id: 'u1', user_metadata: { user_name: 'tester' }, app_metadata: {}, aud: 'authenticated', created_at: '2026-10-17T00:00:00Z' } }
let pinia: ReturnType<typeof createPinia>
let game: { writerReady: boolean; savedAt: number | null; save: ReturnType<typeof vi.fn>; adoptCheckpoint: ReturnType<typeof vi.fn> }
let authChanged: (event: string, value: Session | null) => void
let responses: unknown[], storeData: Map<string, string>, raw: string
let query: { select: ReturnType<typeof vi.fn>; insert: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn>; then: ReturnType<typeof vi.fn> }
let auth: { getSession: ReturnType<typeof vi.fn>; onAuthStateChange: ReturnType<typeof vi.fn>; signInWithOAuth: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> }
let events: EventTarget
const settle = async () => { for (let i = 0; i < 8; i++) { await nextTick(); await new Promise(resolve => setTimeout(resolve, 0)) } }
async function row(revision = 1) {
  const value = JSON.parse(raw)
  return { user_id: 'u1', slot_id: 'primary', revision, checkpoint: raw, checksum: await sha256(raw),
    world_id: value.playJournal.worldId, world_time: value.worldTime, save_version: value.saveVersion }
}
beforeEach(() => {
  pinia = createPinia(); setActivePinia(pinia)
  raw = packCheckpoint(createGame(88), emptyJournal(), 1000)
  storeData = new Map([[SAVE_KEY, raw]])
  vi.stubGlobal('localStorage', { getItem: (key: string) => storeData.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => storeData.set(key, value)) })
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('location', { origin: 'https://example.test', pathname: '/game', reload: vi.fn() })
  events = new EventTarget(); vi.stubGlobal('window', events)
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
  game = reactive({ writerReady: true, savedAt: null, save: vi.fn(() => true), adoptCheckpoint: vi.fn() })
  mocks.game.mockReturnValue(game)
  responses = [{ data: null, error: null }]
  query = { select: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), then: vi.fn() }
  for (const name of ['select', 'insert', 'update', 'eq', 'maybeSingle'] as const) query[name].mockReturnValue(query)
  query.then.mockImplementation((resolve, reject) => {
    const value = responses.shift() ?? { data: null, error: null }
    return value instanceof Error ? Promise.reject(value).then(resolve, reject) : Promise.resolve(value).then(resolve, reject)
  })
  auth = { getSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: vi.fn(callback => { authChanged = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } }),
    signInWithOAuth: vi.fn(async () => ({ error: null })), signOut: vi.fn(async () => ({ error: null })) }
  mocks.createClient.mockReset().mockReturnValue({ auth, from: vi.fn(() => query) })
})
afterEach(() => { disposePinia(pinia); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('cloud store lifecycle and safeguards', () => {
  it('disables cloud when config is missing without touching local progress', async () => {
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    const cloud = useCloudStore()
    expect(cloud.enabled).toBe(false); expect(cloud.status).toBe('disabled')
    expect(mocks.createClient).not.toHaveBeenCalled()
    await cloud.upload(); expect(storeData.get(SAVE_KEY)).toBe(raw)
  })
  it('restores auth and uses PKCE plus the current origin/path redirect', async () => {
    const cloud = useCloudStore(); await settle()
    expect(cloud.account).toBe('tester')
    expect(mocks.createClient.mock.calls[0][2].auth).toEqual({ flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true })
    await cloud.login()
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'github', options: { redirectTo: 'https://example.test/game' } })
    await cloud.logout(); expect(cloud.session).toBeNull(); expect(storeData.get(SAVE_KEY)).toBe(raw)
  })
  it.each(['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'])('keeps the re-login prompt on same-token %s replay', async event => {
    const cloud = useCloudStore(); await settle()
    responses.push({ error: {}, status: 401 })
    await cloud.refresh()
    expect(cloud.status).toBe('auth')
    authChanged(event, { ...session })
    expect(cloud.status).toBe('auth')
    expect(cloud.errorMessage).toBe('請重新登入。')
    expect(storeData.get(SAVE_KEY)).toBe(raw)
  })
  it.each(['SIGNED_IN', 'TOKEN_REFRESHED'])('clears auth only on a new-token %s and permits successful cloud read', async event => {
    const cloud = useCloudStore(); await settle()
    responses.push({ error: {}, status: 401 })
    await cloud.refresh()
    const next = { ...session, access_token: 'test-renewed-access-token' }
    authChanged('INITIAL_SESSION', next)
    expect(cloud.status).toBe('auth'); expect(cloud.errorMessage).toBe('請重新登入。')
    authChanged(event, next)
    expect(cloud.status).toBe('ready'); expect(cloud.errorMessage).toBe('')
    responses.push({ data: null, error: null })
    await cloud.refresh()
    expect(cloud.status).toBe('ready'); expect(cloud.errorMessage).toBe('')
    expect(storeData.get(SAVE_KEY)).toBe(raw)
  })
  it('keeps re-login required across offline and online until a different token refreshes', async () => {
    const cloud = useCloudStore(); await settle()
    responses.push({ error: {}, status: 401 })
    await cloud.refresh()
    events.dispatchEvent(new Event('offline'))
    const loginVisibleOffline = !cloud.session || cloud.authRequired
    events.dispatchEvent(new Event('online'))
    expect(cloud.status).toBe('auth')
    expect(loginVisibleOffline).toBe(true)
    expect(!cloud.session || cloud.authRequired).toBe(true)
    const calls = query.select.mock.calls.length
    await cloud.refresh(); await cloud.upload()
    expect(query.select).toHaveBeenCalledTimes(calls)
    authChanged('TOKEN_REFRESHED', { ...session })
    expect(cloud.status).toBe('auth')
    authChanged('TOKEN_REFRESHED', { ...session, access_token: 'test-renewed-access-token' })
    expect(cloud.authRequired).toBe(false); expect(cloud.status).toBe('ready')
    responses.push({ data: null, error: null }); await cloud.refresh()
    expect(query.select).toHaveBeenCalledTimes(calls + 1)
  })
  it('auto-syncs only a logged-in online writer after the interval and successful local save', async () => {
    const cloud = useCloudStore(); await settle()
    game.writerReady = false; game.savedAt = 1; await settle(); expect(query.insert).not.toHaveBeenCalled()
    game.writerReady = true
    authChanged('SIGNED_OUT', null); game.savedAt = 2; await settle(); expect(query.insert).not.toHaveBeenCalled()
    authChanged('SIGNED_IN', session); await settle()
    responses.push({ data: [await row()], error: null })
    game.savedAt = Date.now(); await settle(); expect(query.insert).toHaveBeenCalledOnce()
    const syncedAt = cloud.lastSyncedAt!
    game.savedAt++; await settle(); expect(query.update).not.toHaveBeenCalled()
    vi.spyOn(Date, 'now').mockReturnValue(syncedAt + SYNC_INTERVAL)
    responses.push({ data: [await row(2)], error: null })
    game.savedAt++; await settle(); expect(query.update).toHaveBeenCalledOnce()
    expect(JSON.parse(storeData.get(SYNC_KEY)!)).toMatchObject({ userId: 'u1', revision: 2 })
  })
  it('stops auto-sync on conflict and preserves conflict across token refresh', async () => {
    responses = [{ data: await row(4), error: null }]
    const cloud = useCloudStore(); await settle()
    expect(cloud.conflict).toBe(true)
    authChanged('TOKEN_REFRESHED', session)
    game.savedAt = Date.now(); await settle()
    expect(cloud.conflict).toBe(true); expect(query.insert).not.toHaveBeenCalled()
    expect(storeData.get(SAVE_KEY)).toBe(raw)
  })
  it('stops auto-sync when a conflict refetch needs re-login', async () => {
    const cloud = useCloudStore(); await settle()
    responses.push({ data: [], error: null }, { error: {}, status: 401 })
    await cloud.upload()
    expect(cloud.conflict).toBe(true); expect(cloud.status).toBe('auth')
    game.savedAt = Date.now(); await settle(); expect(query.insert).toHaveBeenCalledOnce()
    authChanged('TOKEN_REFRESHED', { ...session, access_token: 'test-renewed-access-token' })
    expect(cloud.status).toBe('conflict'); expect(cloud.errorMessage).not.toContain('重新登入')
  })
  it.each([{ result: new Error('network'), status: 'offline' }, { result: { error: {}, status: 401 }, status: 'auth' }])('keeps local data on $status error', async ({ result, status }) => {
    const cloud = useCloudStore(); await settle(); responses.push(result)
    await cloud.upload(); expect(cloud.status).toBe(status); expect(storeData.get(SAVE_KEY)).toBe(raw)
    expect(game.adoptCheckpoint).not.toHaveBeenCalled()
  })
  it('blocks network operations offline and retries only after coming online', async () => {
    const cloud = useCloudStore(); await settle()
    events.dispatchEvent(new Event('offline')); game.savedAt = 1; await settle()
    expect(cloud.online).toBe(false); expect(query.insert).not.toHaveBeenCalled()
    events.dispatchEvent(new Event('online'))
    responses.push({ data: [await row()], error: null }); game.savedAt = 2; await settle()
    expect(query.insert).toHaveBeenCalledOnce()
  })
  it('requires backup success followed by explicit confirmation before adoption', async () => {
    const cloud = useCloudStore(); await settle()
    const backup = vi.fn(() => false), confirm = vi.fn(() => true)
    responses.push({ data: await row(), error: null })
    expect(await cloud.loadCloud(backup, confirm)).toBe(false)
    expect(confirm).not.toHaveBeenCalled(); expect(game.adoptCheckpoint).not.toHaveBeenCalled()
    backup.mockReturnValue(true); confirm.mockReturnValue(false)
    responses.push({ data: await row(), error: null }); await cloud.loadCloud(backup, confirm)
    expect(game.adoptCheckpoint).not.toHaveBeenCalled()
    confirm.mockImplementation(() => { expect(backup).toHaveBeenCalledWith(raw); return true })
    responses.push({ data: await row(), error: null }); expect(await cloud.loadCloud(backup, confirm)).toBe(true)
    expect(game.adoptCheckpoint).toHaveBeenCalledWith(raw)
  })
  it('refuses corrupt cloud before backup and refuses a non-writer load', async () => {
    const cloud = useCloudStore(); await settle()
    const backup = vi.fn(() => true), confirm = vi.fn(() => true)
    responses.push({ data: { ...await row(), checksum: 'broken' }, error: null })
    await cloud.loadCloud(backup, confirm); expect(backup).not.toHaveBeenCalled()
    game.writerReady = false; await cloud.loadCloud(backup, confirm)
    expect(game.adoptCheckpoint).not.toHaveBeenCalled()
  })
  it('reports failed adoption to the caller without recording a successful sync', async () => {
    const cloud = useCloudStore(); await settle()
    game.adoptCheckpoint.mockImplementation(() => { throw new Error('quota') })
    responses.push({ data: await row(), error: null })
    expect(await cloud.loadCloud(() => true, () => true)).toBe(false)
    expect(cloud.metadata).toBeNull(); expect(storeData.has(SYNC_KEY)).toBe(false)
    expect(location.reload).not.toHaveBeenCalled()
  })
  it('refetches before confirmed overwrite and does not retry a second revision conflict', async () => {
    const cloud = useCloudStore(); await settle()
    responses.push({ data: await row(5), error: null }, { data: [], error: null }, { data: await row(6), error: null })
    const confirm = vi.fn(() => true)
    expect(await cloud.overwriteCloud(confirm)).toBe(false)
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ revision: 5 }))
    expect(query.eq).toHaveBeenCalledWith('revision', 5)
    expect(query.update).toHaveBeenCalledOnce(); expect(cloud.conflict).toBe(true)
  })
  it('ignores stale results after switching accounts', async () => {
    const cloud = useCloudStore(); await settle()
    let resolve!: (value: unknown) => void
    query.then.mockImplementationOnce(callback => new Promise(done => { resolve = value => done(callback(value)) }))
    const uploading = cloud.upload(); await settle()
    authChanged('SIGNED_OUT', null)
    resolve({ data: [await row()], error: null }); await uploading
    expect(cloud.metadata).toBeNull(); expect(cloud.session).toBeNull()
    expect(storeData.has(SYNC_KEY)).toBe(false)
  })
})

describe('real game adoptCheckpoint seam', () => {
  it('rejects invalid checkpoint and non-writer without changing local data', async () => {
    vi.stubGlobal('navigator', { locks: { request: vi.fn((_name, _options, callback) => Promise.resolve(callback({}))) } })
    const actual = await vi.importActual<typeof import('./gameStore')>('./gameStore')
    const realGame = actual.useGameStore()
    const before = storeData.get(SAVE_KEY)
    vi.mocked(localStorage.setItem).mockClear()
    expect(() => realGame.adoptCheckpoint('{')).toThrow()
    expect(storeData.get(SAVE_KEY) === before).toBe(true)
    realGame.writerReady = false
    expect(() => realGame.adoptCheckpoint(raw)).toThrow()
    expect(localStorage.setItem).not.toHaveBeenCalled()
    expect(location.reload).not.toHaveBeenCalled()
  })
  it.each(['retry', 'in-flight'])('preserves adopted checkpoint through lifecycle events, loop timers and journal %s', async journalMode => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { locks: { request: vi.fn((_name, _options, callback) => Promise.resolve(callback({}))) } })
    const documentEvents = Object.assign(new EventTarget(), { hidden: true })
    vi.stubGlobal('document', documentEvents)
    let acknowledge!: () => void
    const appendBatch = vi.fn(() => journalMode === 'retry' ? Promise.reject(new Error('archive unavailable'))
      : new Promise<void>(resolve => { acknowledge = resolve }))
    vi.spyOn(playJournal, 'createPlayJournal').mockReturnValue({ appendBatch, readAll: async () => [] })
    const actual = await vi.importActual<typeof import('./gameStore')>('./gameStore')
    const realGame = actual.useGameStore()
    realGame.startLife(); realGame.advance(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(appendBatch).toHaveBeenCalledOnce()
    realGame.speed = 5
    const save = vi.fn(() => realGame.save())
    const stop = startLoop(realGame.advance, () => realGame.speed, save)
    // Exercise the same lifecycle wiring as App.vue with the real loop and store.
    const onExit = () => { stop.flush(); save() }
    const onHide = () => { stop.flush(); if (document.hidden) save() }
    events.addEventListener('pagehide', onExit)
    documentEvents.addEventListener('visibilitychange', onHide)
    const next = packCheckpoint(createGame(99), emptyJournal(), 2000)
    vi.mocked(localStorage.setItem).mockImplementationOnce((key, value) => {
      expect(realGame.writerReady).toBe(false); expect(realGame.speed).toBe(0); storeData.set(key, value)
    })
    try {
      realGame.adoptCheckpoint(next)
      expect(storeData.get(SAVE_KEY)).toBe(next); expect(location.reload).toHaveBeenCalledOnce()
      vi.mocked(localStorage.setItem).mockClear()
      events.dispatchEvent(new Event('pagehide'))
      documentEvents.dispatchEvent(new Event('visibilitychange'))
      expect(save).toHaveBeenCalledTimes(4)
      if (journalMode === 'in-flight') acknowledge()
      await vi.advanceTimersByTimeAsync(60_000)
      expect(save.mock.calls.length).toBeGreaterThan(4)
      expect(appendBatch).toHaveBeenCalledOnce()
      expect(realGame.save()).toBe(false)
      expect(storeData.get(SAVE_KEY)).toBe(next)
      expect(vi.mocked(localStorage.setItem).mock.calls.filter(([key]) => key === SAVE_KEY)).toEqual([])
    } finally {
      stop(); events.removeEventListener('pagehide', onExit)
      documentEvents.removeEventListener('visibilitychange', onHide)
      vi.useRealTimers()
    }
  })
})
