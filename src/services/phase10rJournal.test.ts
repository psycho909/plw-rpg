import { describe, expect, it } from 'vitest'
import { createGame } from '../engine/simulation'
import { serialize } from './saveService'
import { unpackCheckpoint, type PlayRecord } from './playJournal'

describe('phase 10R journal compatibility', () => {
  it('loads an old version-one checkpoint with per-tick pending time records unchanged', () => {
    const state = createGame(101016)
    const records: PlayRecord[] = [
      { id: 'legacy-time-1', worldId: 'legacy-world', at: 100001, kind: 'time', from: 480, to: 481,
        characterId: state.activeCharacterId, message: '世界時間繼續前進。', events: [] },
      { id: 'legacy-time-2', worldId: 'legacy-world', at: 100002, kind: 'time', from: 481, to: 482,
        characterId: state.activeCharacterId, message: '世界時間繼續前進。', events: [] },
    ]
    const checkpoint = JSON.parse(serialize(state, 100000))
    checkpoint.playJournal = { version: 1, worldId: 'legacy-world', pending: records }

    const loaded = unpackCheckpoint(JSON.stringify(checkpoint))

    expect(loaded.state).toEqual(state)
    expect(loaded.imported).toBe(false)
    expect(loaded.journal.pending).toEqual(records)
  })
})
