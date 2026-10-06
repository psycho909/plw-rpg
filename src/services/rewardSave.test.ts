import { expect, it } from 'vitest'
import type { ItemInstance } from '../domain/reward'
import { createGame } from '../engine/simulation'
import { deserialize, serialize } from './saveService'
import nativeV1 from '../../reports/v2/20261004-life-emergence/fixtures/native-v1.json'

it('adds a reward extension to a native V2 save without consuming world RNG or replacing its world', () => {
  const legacy = JSON.parse(serialize(createGame(42), 1000))
  delete legacy.reward
  const loaded = deserialize(JSON.stringify(legacy))
  expect(loaded.state).toMatchObject({ reward: { schemaVersion: 1 } })
  expect(loaded.state.worldSeed).toBe(42)
  expect(loaded.state.rngState).toBe(legacy.rngState)
  expect(loaded.state.worldTime).toBe(legacy.worldTime)
  expect(loaded.state.characters).toEqual(legacy.characters)
  expect(loaded.state.npcs).toEqual(legacy.npcs)
  expect(loaded.state.life).toEqual(legacy.life)
  expect(loaded.state.history).toEqual(legacy.history)
  expect(loaded.lastSavedAt).toBe(1000)
})

it('migrates the committed native V1 fixture losslessly through V2.x save and reload', () => {
  const loaded = deserialize(JSON.stringify(nativeV1))
  const { saveVersion: _version, lastSavedAt: _at, ...legacyWorld } = nativeV1
  const { saveVersion: _newVersion, life: _life, reward: _reward, ...preservedWorld } = loaded.state
  expect(preservedWorld).toEqual(legacyWorld)
  expect(loaded.state.reward.schemaVersion).toBe(1)
  expect(deserialize(serialize(loaded.state, 456)).state).toEqual(loaded.state)
})

const instance = (): ItemInstance => ({ instanceId: 'item-1', ownerId: 'alden', baseId: 'shortSword', level: 1,
  material: null, rarity: 'uncommon', rolledStats: { attack: 4, defense: 0, critical: 3, penetration: 0, bleed: 0, block: 0, reduction: 0 },
  affixes: [{ id: 'keen', tier: 1, value: 3 }], specialTrait: null, provenance: null })

it('persists separate equipment instances and stackable materials without replacing fixed legacy gear', () => {
  const s = createGame(17)
  s.characters[0]!.inventory.sword = 2
  s.characters[0]!.equipment.weapon = 'sword'
  s.reward.nextInstanceId = 2
  s.reward.instances.push(instance())
  s.reward.materials.alden = { wolfFang: 7, wolfHide: 2, moonStone: 0 }
  const loaded = deserialize(serialize(s, 42))
  expect(loaded.state).toEqual(s)
  expect(deserialize(serialize(loaded.state, 43)).state).toEqual(s)
})

it.each(['schema', 'duplicate', 'owner', 'reference', 'dual-gear', 'stats', 'affix-slot', 'affix-value', 'materials', 'collection'])(
  'rejects malformed reward %s without recreating a world', kind => {
    const raw = JSON.parse(serialize(createGame(), 0))
    raw.reward.nextInstanceId = 2
    raw.reward.instances = [instance()]
    if (kind === 'schema') raw.reward.schemaVersion = 9
    if (kind === 'duplicate') raw.reward.instances.push(instance())
    if (kind === 'owner') raw.reward.instances[0].ownerId = 'missing'
    if (kind === 'reference') raw.reward.equipped.alden = { weapon: 'missing', armor: null }
    if (kind === 'dual-gear') { raw.reward.equipped.alden = { weapon: 'item-1', armor: null }; raw.characters[0].equipment.weapon = 'sword'; raw.characters[0].inventory.sword = 1 }
    if (kind === 'stats') raw.reward.instances[0].rolledStats.attack = -1
    if (kind === 'affix-slot') raw.reward.instances[0].affixes[0].id = 'sturdy'
    if (kind === 'affix-value') raw.reward.instances[0].affixes[0].value = 99
    if (kind === 'materials') raw.reward.materials.alden = { wolfFang: -1, wolfHide: 0, moonStone: 0 }
    if (kind === 'collection') raw.reward.collection.seen = ['grayWolf', 'grayWolf']
    expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  })
