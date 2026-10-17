import type { SupabaseClient } from '@supabase/supabase-js'
import { unpackCheckpoint } from './playJournal'

export const CLOUD_TABLE = 'oakvale_cloud_saves'
export const MAX_CHECKPOINT_BYTES = 8 * 1024 * 1024
export interface CloudSave {
  user_id: string; slot_id: 'primary'; revision: number; world_id: string; world_time: number
  save_version: number; checkpoint: string; checksum: string; updated_at?: string
}
export class CloudSaveError extends Error {
  constructor(public kind: 'conflict' | 'offline' | 'auth' | 'invalid', public cloud: CloudSave | null = null, public refetchFailure?: CloudSaveError) {
    super(kind)
  }
}
export function classifyCloudError(error: unknown): CloudSaveError {
  if (error instanceof CloudSaveError) return error
  const value = error as { status?: number; code?: string } | null
  if (value?.status === 401 || value?.code === '401' || value?.code === 'PGRST301' || value?.code === 'PGRST303') return new CloudSaveError('auth')
  return new CloudSaveError('offline')
}
export async function sha256(raw: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
export function validateCheckpoint(raw: string) {
  try {
    if (new TextEncoder().encode(raw).byteLength > MAX_CHECKPOINT_BYTES) throw new Error('oversize')
    return unpackCheckpoint(raw)
  } catch { throw new CloudSaveError('invalid') }
}
export async function verifyCloudSave(value: unknown, uid: string): Promise<CloudSave> {
  const row = value as CloudSave | null
  if (!row || row.user_id !== uid || row.slot_id !== 'primary' || !Number.isSafeInteger(row.revision) || row.revision < 1
    || typeof row.checkpoint !== 'string' || typeof row.checksum !== 'string') throw new CloudSaveError('invalid')
  const loaded = validateCheckpoint(row.checkpoint)
  // Legacy checkpoints generate a journal id on import; their world id cannot be compared.
  if ((!loaded.imported && row.world_id !== loaded.journal.worldId) || typeof row.world_id !== 'string' || !row.world_id
    || row.world_time !== loaded.state.worldTime || row.save_version !== JSON.parse(row.checkpoint).saveVersion
    || await sha256(row.checkpoint) !== row.checksum) throw new CloudSaveError('invalid')
  return row
}
export async function fetchCloudSave(client: Pick<SupabaseClient, 'from'>, uid: string): Promise<CloudSave | null> {
  try {
    const { data, error, status } = await client.from(CLOUD_TABLE).select('*').eq('user_id', uid).eq('slot_id', 'primary').maybeSingle()
    if (error) throw { ...error, status }
    return data === null ? null : await verifyCloudSave(data, uid)
  } catch (error) { throw classifyCloudError(error) }
}
export async function uploadCheckpoint(client: Pick<SupabaseClient, 'from'>, uid: string, raw: string, expected: number | null): Promise<CloudSave> {
  const loaded = validateCheckpoint(raw)
  if (expected !== null && (!Number.isSafeInteger(expected) || expected < 1 || expected >= Number.MAX_SAFE_INTEGER)) throw new CloudSaveError('invalid')
  const row: CloudSave = { user_id: uid, slot_id: 'primary', revision: expected === null ? 1 : expected + 1,
    world_id: loaded.journal.worldId, world_time: loaded.state.worldTime, save_version: JSON.parse(raw).saveVersion,
    checkpoint: raw, checksum: await sha256(raw) }
  try {
    const query = expected === null ? client.from(CLOUD_TABLE).insert(row).select()
      : client.from(CLOUD_TABLE).update(row).eq('user_id', uid).eq('slot_id', 'primary').eq('revision', expected).select()
    const { data, error, status } = await query
    if (error?.code === '23505' || (!error && (!data || data.length === 0))) {
      let latest: CloudSave | null = null
      try { latest = await fetchCloudSave(client, uid) }
      catch (failure) { throw new CloudSaveError('conflict', null, classifyCloudError(failure)) }
      throw new CloudSaveError('conflict', latest)
    }
    if (error) throw { ...error, status }
    if (data.length !== 1) throw new CloudSaveError('invalid')
    const returned = await verifyCloudSave(data[0], uid)
    if (returned.revision !== row.revision || returned.checksum !== row.checksum) throw new CloudSaveError('invalid')
    return returned
  } catch (error) { throw classifyCloudError(error) }
}
