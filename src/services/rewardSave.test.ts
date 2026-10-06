import { expect, it } from 'vitest'
import type { ItemInstance } from '../domain/reward'
import { encounterWolf } from '../engine/wolfFamily'
import { combatTurn } from '../engine/actions'
import { chooseSuccessor, createGame, walkTo } from '../engine/simulation'
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

function startedWolf(state = createGame(90), definitionId: 'wolfKing' | 'packLeader' = 'wolfKing') {
  walkTo(state, { x: 5, y: 4 })
  state.reward.collection.defeated = definitionId === 'wolfKing'
    ? ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']
    : ['grayWolf', 'scarredWolf', 'alphaWolf']
  expect(encounterWolf(state, definitionId)).toBe('')
  return state
}

it('round-trips canonical family stats and preserves a boss formation across live turns', () => {
  const state = startedWolf()
  expect(deserialize(serialize(state)).state).toEqual(state)

  combatTurn(state, 'attack')

  expect(state.combat?.familyEncounter?.turn).toBe(1)
  expect(deserialize(serialize(state)).state).toEqual(state)
})

it.each(['hp', 'maxHp', 'attack', 'defense', 'exp', 'gold', 'elite', 'root-traits', 'root-variant', 'root-formedAt', 'root-context', 'root-missing', 'turn', 'howl'] as const)(
  'rejects a wolf boss save with a forged %s before loading the world', kind => {
    const raw = JSON.parse(serialize(startedWolf()))
    if (kind === 'hp') raw.combat.hp = raw.combat.maxHp + 1
    if (kind === 'maxHp') raw.combat.maxHp++
    if (kind === 'attack') raw.combat.attack++
    if (kind === 'defense') raw.combat.defense++
    if (kind === 'exp') raw.combat.exp++
    if (kind === 'gold') raw.combat.gold++
    if (kind === 'elite') raw.combat.elite = true
    if (kind === 'root-traits') raw.reward.wolfBossForm.traits = ['swift']
    if (kind === 'root-variant') raw.reward.wolfBossForm.variant = raw.reward.wolfBossForm.variant === 'wellFed' ? 'moonlit' : 'wellFed'
    if (kind === 'root-formedAt') raw.reward.wolfBossForm.formedAt--
    if (kind === 'root-context') raw.reward.wolfBossForm.context.population++
    if (kind === 'root-missing') raw.reward.wolfBossForm = null
    if (kind === 'turn') raw.combat.familyEncounter.turn = raw.worldTime - raw.combat.familyEncounter.formedAt + 1
    if (kind === 'howl') raw.combat.familyEncounter.howlActive = true
    expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  })

it('accepts the fixed howl phase and rejects impossible turn/howl combinations', () => {
  const state = startedWolf(createGame(91), 'packLeader')
  combatTurn(state, 'defend'); combatTurn(state, 'defend')
  expect(state.combat?.familyEncounter).toMatchObject({ turn: 2, howlActive: true })
  expect(deserialize(serialize(state)).state).toEqual(state)

  const raw = JSON.parse(serialize(state))
  raw.combat.familyEncounter.howlActive = false
  expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  raw.combat.familyEncounter.turn = 1
  raw.combat.familyEncounter.howlActive = true
  expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
})

it('round-trips a fractional wolf HP caused by companion damage', () => {
  const state = startedWolf(createGame(94), 'packLeader')
  const companion = state.npcs[0]!
  companion.stats.strength = 15
  state.party.push({ npcId: companion.id, hireCost: 0, dailyWage: 0, contractEnd: 1000, archetype: 'fighter' })
  combatTurn(state, 'defend')
  expect(state.combat!.hp % 1).not.toBe(0)
  expect(deserialize(serialize(state)).state).toEqual(state)
})

it('keeps a boss form after death and lets a successor reuse it without another formation draw', () => {
  const state = startedWolf(createGame(95))
  const rootForm = structuredClone(state.reward.wolfBossForm)
  state.characters[0]!.hp = 1
  combatTurn(state, 'defend')
  expect(state.combat).toBeNull()
  expect(state.characters[0]!.isAlive).toBe(false)
  expect(state.reward.wolfBossForm).toEqual(rootForm)
  expect(deserialize(serialize(state)).state.reward.wolfBossForm).toEqual(rootForm)

  const heir = state.npcs.find(npc => npc.isAlive && npc.age >= 15)!
  expect(chooseSuccessor(state, heir.id)).toBe(true)
  walkTo(state, { x: 5, y: 4 })
  const rngBefore = state.rngState
  expect(encounterWolf(state, 'wolfKing')).toBe('')
  expect(state.rngState).toBe(rngBefore)
  expect(state.combat!.familyEncounter).toMatchObject({ definitionId: 'wolfKing', variant: rootForm!.variant,
    traits: rootForm!.traits, formedAt: rootForm!.formedAt, context: rootForm!.context })
})

it('keeps legacy untagged wolf and dungeon fights loadable', () => {
  const outdoor = createGame(92)
  outdoor.combat = { monsterId: 'wolf', hp: 20, maxHp: 30, attack: 8, defense: 1, exp: 20, gold: 5, elite: false, dungeon: false }
  expect(deserialize(serialize(outdoor)).state).toEqual(outdoor)

  const dungeon = createGame(93)
  dungeon.dungeon.inDungeon = true
  dungeon.combat = { monsterId: 'wolf', hp: 20, maxHp: 30, attack: 8, defense: 1, exp: 20, gold: 5, elite: false, dungeon: true }
  expect(deserialize(serialize(dungeon)).state).toEqual(dungeon)
})
