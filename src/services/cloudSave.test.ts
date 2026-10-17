import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createGame } from '../engine/simulation'
import { emptyJournal, packCheckpoint } from './playJournal'
import { fetchCloudSave, uploadCheckpoint, sha256, MAX_CHECKPOINT_BYTES } from './cloudSave'

const raw = packCheckpoint(createGame(88), emptyJournal(), 1000)
async function cloudRow(revision = 1) {
  const checkpoint = JSON.parse(raw)
  return { user_id: 'u1', slot_id: 'primary' as const, revision, world_id: checkpoint.playJournal.worldId,
    world_time: checkpoint.worldTime, save_version: checkpoint.saveVersion, checkpoint: raw, checksum: await sha256(raw) }
}
function mockClient(responses: unknown[]) {
  const query = { select: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), then: vi.fn() }
  for (const method of ['select', 'insert', 'update', 'eq', 'maybeSingle'] as const) query[method].mockReturnValue(query)
  query.then.mockImplementation((resolve: (value: unknown) => void, reject: (error: unknown) => void) => {
    const response = responses.shift()
    return response instanceof Error ? Promise.reject(response).then(resolve, reject) : Promise.resolve(response).then(resolve, reject)
  })
  // Test double implements only the fluent query seam exercised here.
  const client = { from: vi.fn(() => query) } as unknown as Pick<SupabaseClient, 'from'>
  return { client, query }
}
describe('cloud checkpoint service', () => {
  it('inserts revision 1 and conditionally advances the expected revision', async () => {
    const row = await cloudRow(), next = { ...row, revision: 2 }
    const { client, query } = mockClient([{ data: [row], error: null }, { data: [next], error: null }])
    expect(await uploadCheckpoint(client, 'u1', raw, null)).toEqual(row)
    expect(await uploadCheckpoint(client, 'u1', raw, 1)).toEqual(next)
    expect(query.insert).toHaveBeenCalledWith(row)
    expect(query.eq.mock.calls).toEqual([['user_id', 'u1'], ['slot_id', 'primary'], ['revision', 1]])
  })
  it.each([{ data: null, error: { code: '23505' } }, { data: [], error: null }])('refetches on insert race or zero-row update', async response => {
    const row = await cloudRow(3)
    const { client, query } = mockClient([response, { data: row, error: null }])
    await expect(uploadCheckpoint(client, 'u1', raw, response.error ? null : 1)).rejects.toMatchObject({ kind: 'conflict', cloud: row })
    expect(query.maybeSingle).toHaveBeenCalledOnce()
  })
  it.each(['checksum', 'json', 'schema', 'owner', 'revision'])('rejects corrupt download: %s', async kind => {
    const row = await cloudRow()
    if (kind === 'checksum') row.checksum = 'bad'
    if (kind === 'json' || kind === 'schema') { row.checkpoint = kind === 'json' ? '{' : '{}'; row.checksum = await sha256(row.checkpoint) }
    if (kind === 'owner') row.user_id = 'other'
    if (kind === 'revision') row.revision = 0
    const { client } = mockClient([{ data: row, error: null }])
    await expect(fetchCloudSave(client, 'u1')).rejects.toMatchObject({ kind: 'invalid' })
  })
  it('rejects oversized UTF-8 uploads before touching the client', async () => {
    const { client } = mockClient([])
    await expect(uploadCheckpoint(client, 'u1', '字'.repeat(Math.ceil(MAX_CHECKPOINT_BYTES / 3)), null)).rejects.toMatchObject({ kind: 'invalid' })
    expect(client.from).not.toHaveBeenCalled()
  })
  it.each([{ response: new Error('network'), kind: 'offline' }, { response: { error: { message: 'expired' }, status: 401 }, kind: 'auth' }])('classifies $kind failures', async ({ response, kind }) => {
    const { client } = mockClient([response])
    await expect(uploadCheckpoint(client, 'u1', raw, null)).rejects.toMatchObject({ kind })
  })
  it('refuses mismatched server acknowledgement', async () => {
    const { client } = mockClient([{ data: [await cloudRow(9)], error: null }])
    await expect(uploadCheckpoint(client, 'u1', raw, null)).rejects.toMatchObject({ kind: 'invalid' })
  })
  it('preserves conflict when the refetch fails', async () => {
    const { client } = mockClient([{ data: [], error: null }, new Error('network')])
    await expect(uploadCheckpoint(client, 'u1', raw, 1)).rejects.toMatchObject({ kind: 'conflict', refetchFailure: { kind: 'offline' } })
  })
})
