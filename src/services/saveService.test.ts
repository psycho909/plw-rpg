import { describe, expect, it } from 'vitest'
import { CONFIG, ITEMS } from '../data/config'
import { combatTurn, encounter, equip, farm } from '../engine/actions'
import { generateItem } from '../engine/itemGeneration'
import { chooseSuccessor, createGame, die, player, simulate, walkTo } from '../engine/simulation'
import { deserialize, serialize } from './saveService'
import historicalV1 from '../../reports/v2/20261007-life-craftsmanship/phase-05/fixtures/legacy-v1-after-boss.save.json'
import historicalV2 from '../../reports/v2/20261007-life-craftsmanship/phase-05/fixtures/phase4-v2-stress-final.save.json'

function versionOneFixture(seed = 88, lastSavedAt = 1000) {
  const raw = JSON.parse(serialize(createGame(seed), lastSavedAt))
  delete raw.life
  delete raw.reward
  raw.saveVersion = 1
  for (const character of [...raw.characters, ...raw.npcs]) delete character.skills.smithing
  for (const event of [...raw.events, ...raw.history]) delete event.tier
  return raw
}

function versionTwoFixture(seed = 88, lastSavedAt = 1000) {
  const state = createGame(seed)
  state.reward.instances.push(generateItem(state, { baseId: 'spear', level: 2 }))
  const raw = JSON.parse(serialize(state, lastSavedAt))
  raw.saveVersion = 2
  for (const character of [...raw.characters, ...raw.npcs]) delete character.skills.smithing
  for (const life of Object.values(raw.life.characters) as Record<string, unknown>[]) delete (life.actions as Record<string, unknown>).smithing
  raw.reward.schemaVersion = 1
  for (const item of raw.reward.instances) delete item.craftProvenance
  return raw
}

describe('versioned saves and deterministic continuation', () => {
  it('migrates a complete V2 world and its rolled items once without consuming RNG or changing world state', () => {
    const raw = versionTwoFixture(915, 4321)
    raw.nativeExtension = { generation: 2, data: ['kept'] }
    const expected = structuredClone(raw)
    delete expected.lastSavedAt
    delete expected.saveVersion

    const loaded = deserialize(JSON.stringify(raw))
    const legacyProjection = structuredClone(loaded.state) as unknown as Record<string, any>
    delete legacyProjection.saveVersion
    for (const character of [...legacyProjection.characters, ...legacyProjection.npcs]) delete character.skills.smithing
    for (const life of Object.values(legacyProjection.life.characters) as Record<string, any>[]) delete life.actions.smithing
    legacyProjection.reward.schemaVersion = 1
    for (const item of legacyProjection.reward.instances) delete item.craftProvenance

    expect(loaded.state.saveVersion).toBe(3)
    expect(loaded.state.reward.schemaVersion).toBe(2)
    expect(loaded.state.reward.instances[0]?.craftProvenance).toBeNull()
    expect(legacyProjection).toEqual(expected)
    expect(loaded.state.rngState).toBe(raw.rngState)
    expect(loaded.state.worldTime).toBe(raw.worldTime)
    expect(loaded.lastSavedAt).toBe(4321)
    expect(deserialize(serialize(loaded.state, 5678)).state).toEqual(loaded.state)
  })

  it('migrates the archived historical V1 save without changing its old world fields or RNG', () => {
    const raw = structuredClone(historicalV1) as Record<string, any>
    const expected = structuredClone(raw)
    delete expected.lastSavedAt
    delete expected.saveVersion
    const loaded = deserialize(JSON.stringify(raw))
    const legacyProjection = structuredClone(loaded.state) as unknown as Record<string, any>
    delete legacyProjection.life
    delete legacyProjection.reward
    delete legacyProjection.saveVersion
    for (const actor of [...legacyProjection.characters, ...legacyProjection.npcs]) delete actor.skills.smithing

    expect(legacyProjection).toEqual(expected)
    expect(loaded.state.saveVersion).toBe(3)
    expect(loaded.state.rngState).toBe(raw.rngState)
    expect(loaded.state.worldTime).toBe(raw.worldTime)
    expect(deserialize(serialize(loaded.state)).state).toEqual(loaded.state)
  })

  it('migrates the archived Phase4 V2 stress save while preserving every old item roll', () => {
    const raw = structuredClone(historicalV2) as Record<string, any>
    const expected = structuredClone(raw)
    delete expected.lastSavedAt
    const loaded = deserialize(JSON.stringify(raw))
    const legacyProjection = structuredClone(loaded.state) as unknown as Record<string, any>
    legacyProjection.saveVersion = 2
    for (const actor of [...legacyProjection.characters, ...legacyProjection.npcs]) delete actor.skills.smithing
    for (const life of Object.values(legacyProjection.life.characters) as Record<string, any>[]) delete life.actions.smithing
    legacyProjection.reward.schemaVersion = 1
    for (const item of legacyProjection.reward.instances) delete item.craftProvenance

    expect(legacyProjection).toEqual(expected)
    expect(loaded.state.saveVersion).toBe(3)
    expect(loaded.state.reward.schemaVersion).toBe(2)
    expect(loaded.state.reward.instances).toHaveLength(4)
    expect(loaded.state.reward.instances.every(item => item.craftProvenance === null)).toBe(true)
    expect(loaded.state.rngState).toBe(raw.rngState)
    expect(loaded.state.worldTime).toBe(raw.worldTime)
    expect(deserialize(serialize(loaded.state)).state).toEqual(loaded.state)
  })

  it.each(['smithing-skill-in-v2', 'craft-provenance-in-v1'] as const)(
    'rejects fields from the newer schema in a V2 save before adding defaults: %s', kind => {
      const raw = versionTwoFixture()
      if (kind === 'smithing-skill-in-v2') raw.characters[0].skills.smithing = { level: 1, exp: 0 }
      if (kind === 'craft-provenance-in-v1') raw.reward.instances[0].craftProvenance = { forged: true }
      expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
    })

  it('rejects G-only identities in a V2 save before migrating it to V3', () => {
    const raw = structuredClone(historicalV2) as Record<string, any>
    const characterId = Object.keys(raw.life.characters)[0]!
    raw.life.characters[characterId].identities.push('masterpieceCrafter')

    expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  })

  it.each(['origin', 'identity', 'trait', 'career'] as const)('rejects coercible arrays where a V2 %s enum string is required', kind => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    const life = raw.life.characters[raw.activeCharacterId], npcLife = raw.life.npcs[raw.npcs[0].id]
    if (kind === 'origin') life.origin = ['OTHER_WORLD']
    if (kind === 'identity') life.identities[0] = ['resident']
    if (kind === 'trait') npcLife.traits[0] = [npcLife.traits[0]]
    if (kind === 'career') npcLife.career = ['resident']
    expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  })
  it('validates a complete V1 world before migration and preserves every legacy world field and RNG', () => {
    const raw = versionOneFixture(909, 4321)
    raw.nativeExtension = { generation: 1, data: ['kept'] }
    const expected = structuredClone(raw)
    delete expected.lastSavedAt
    delete expected.saveVersion
    const loaded = deserialize(JSON.stringify(raw))
    const migrated = { ...loaded.state } as Record<string, unknown>
    delete migrated.life
    delete migrated.reward
    delete migrated.saveVersion
    for (const actor of [...migrated.characters as any[], ...migrated.npcs as any[]]) delete actor.skills.smithing
    expect(migrated).toEqual(expected)
    expect(loaded.state.saveVersion).toBe(3)
    expect(loaded.state.life.openingSeen).toBe(true)
    expect(loaded.state.rngState).toBe(raw.rngState)
    expect(loaded.state.worldTime).toBe(raw.worldTime)
    expect(loaded.lastSavedAt).toBe(4321)
  })

  it.each(['world-time', 'missing-world-field', 'bad-reference'] as const)('rejects a corrupt V1 world before migration: %s', kind => {
    const raw = versionOneFixture()
    if (kind === 'world-time') raw.worldTime = -1
    if (kind === 'missing-world-field') delete raw.regions
    if (kind === 'bad-reference') raw.activeCharacterId = 'missing-character'
    expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  })

  it('rejects a V1 payload that already contains life metadata instead of overwriting it', () => {
    const raw = versionOneFixture()
    raw.life = { future: 'unknown V1 data' }
    expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  })

  it.each(['canon', 'extra-life-field', 'origin', 'reputation', 'character-reference', 'npc-reference', 'property-owner', 'property-bounds', 'property-day', 'property-daily-total', 'milestone-bound'] as const)(
    'rejects malformed V2 life data: %s', kind => {
      const raw = JSON.parse(serialize(createGame(), 1000))
      const characterId = raw.activeCharacterId
      const npcId = raw.npcs[0].id
      if (kind === 'canon') raw.life.canon = 'OTHER_WORLD'
      if (kind === 'extra-life-field') raw.life.unknown = true
      if (kind === 'origin') raw.life.characters[characterId].origin = 'unknown-origin'
      if (kind === 'reputation') raw.life.characters[characterId].reputation = 101
      if (kind === 'character-reference') delete raw.life.characters[characterId]
      if (kind === 'npc-reference') delete raw.life.npcs[npcId]
      if (kind === 'property-owner') raw.life.properties.push({ id: 'home-1', kind: 'home', ownerId: 'missing', acquiredAt: raw.worldTime,
        position: { x: 7, y: 9 }, storage: Object.fromEntries(Object.keys(ITEMS).map(id => [id, 0])), foodSupplied: 0,
        suppliedDay: Math.floor(raw.worldTime / CONFIG.minutesPerDay), suppliedToday: 0 })
      if (kind === 'property-bounds') raw.life.properties.push({ id: 'home-1', kind: 'home', ownerId: characterId, acquiredAt: raw.worldTime,
        position: { x: CONFIG.width, y: 9 }, storage: Object.fromEntries(Object.keys(ITEMS).map(id => [id, 0])), foodSupplied: 0,
        suppliedDay: Math.floor(raw.worldTime / CONFIG.minutesPerDay), suppliedToday: 0 })
      if (kind === 'property-day') raw.life.properties.push({ id: 'home-1', kind: 'home', ownerId: characterId, acquiredAt: raw.worldTime,
        position: { x: 7, y: 9 }, storage: Object.fromEntries(Object.keys(ITEMS).map(id => [id, 0])), foodSupplied: 0,
        suppliedDay: Math.floor(raw.worldTime / CONFIG.minutesPerDay) + 1, suppliedToday: 0 })
      if (kind === 'property-daily-total') raw.life.properties.push({ id: 'farm-1', kind: 'farmBusiness', ownerId: characterId, acquiredAt: raw.worldTime,
        position: { x: 7, y: 9 }, storage: Object.fromEntries(Object.keys(ITEMS).map(id => [id, 0])), foodSupplied: 200,
        suppliedDay: Math.floor(raw.worldTime / CONFIG.minutesPerDay), suppliedToday: 61 })
      if (kind === 'milestone-bound') raw.life.characters[characterId].milestones = Array.from({ length: 33 }, (_, i) => ({ id: `m-${i}`, at: raw.worldTime, text: '里程碑' }))
      expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
    })

  it('rejects a null crop with the standard preserved-save error', () => {
    const raw = JSON.parse(serialize(createGame(), 0))
    raw.crops = [null]
    expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  })

  it.each(['creator', 'recipe-output'] as const)('rejects forged crafted-item provenance: %s', kind => {
    const state = createGame(915)
    state.reward.instances.push(generateItem(state, { baseId: 'spear', level: 2,
      context: { kind: 'craft', recipeId: 'starterSpear' } }))
    const raw = JSON.parse(serialize(state, 0))
    if (kind === 'creator') raw.reward.instances[0].craftProvenance.createdBy = 'missing'
    if (kind === 'recipe-output') raw.reward.instances[0].craftProvenance.recipeId = 'unknown-recipe'
    expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
  })

  it('rejects a crafted legendary with a legacy boss source while keeping both generated paths valid', () => {
    const craftedState = createGame(915)
    // This predecessor makes the next seeded LCG draw land in the default Legendary bucket.
    craftedState.rngState = 653637408
    const crafted = generateItem(craftedState, { baseId: 'spear', level: 2,
      context: { kind: 'craft', recipeId: 'starterSpear' } })
    expect(crafted.rarity).toBe('legendary')
    expect(crafted.provenance?.bossSource).toBeNull()
    craftedState.reward.instances.push(crafted)
    expect(deserialize(serialize(craftedState, 0)).state).toEqual(craftedState)

    const forged = JSON.parse(serialize(craftedState, 0))
    forged.reward.instances[0].provenance.bossSource = 'wolfKing'
    expect(() => deserialize(JSON.stringify(forged))).toThrow('原始存檔已保留')

    const bossState = createGame(916)
    bossState.rngState = 653637408
    const bossDrop = generateItem(bossState, { baseId: 'spear', level: 2, bossSource: 'wolfKing' })
    expect(bossDrop.rarity).toBe('legendary')
    expect(bossDrop.provenance?.bossSource).toBe('wolfKing')
    bossState.reward.instances.push(bossDrop)
    expect(deserialize(serialize(bossState, 0)).state).toEqual(bossState)
  })

  it('preserves the original crafter separately from the current item owner', () => {
    const state = createGame(915)
    const item = generateItem(state, { baseId: 'spear', level: 2,
      context: { kind: 'craft', recipeId: 'starterSpear' } })
    state.reward.instances.push(item)
    const originalCrafter = item.craftProvenance!.createdBy
    die(state, player(state), '測試交接')
    const heir = state.npcs.find(candidate => candidate.isAlive && candidate.age >= 15)!
    expect(chooseSuccessor(state, heir.id)).toBe(true)
    item.ownerId = heir.id

    const loaded = deserialize(serialize(state, 0)).state
    const loadedItem = loaded.reward.instances[0]!
    expect(loadedItem.ownerId).toBe(heir.id)
    expect(loadedItem.craftProvenance?.createdBy).toBe(originalCrafter)
    expect(loadedItem.craftProvenance?.createdBy).toBe(state.characters[0]!.id)
  })

  it.each([-1, 0, 1.5, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe nextNpcId %s', value => {
    const s = createGame(); s.nextNpcId = value
    expect(() => deserialize(serialize(s, 0))).toThrow('原始存檔已保留')
  })
  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe eventSequence %s', value => {
    const s = createGame(); s.eventSequence = value
    expect(() => deserialize(serialize(s, 0))).toThrow('原始存檔已保留')
  })
  it.each(['events', 'history', 'crops'] as const)('rejects a sequence behind an ID in %s', collection => {
    const s = createGame()
    walkTo(s, { x: 16, y: 10 }); farm(s, 'prepare'); farm(s, 'plant')
    // A saved JSON world has separate objects in the recent and historic lists.
    s.events = s.events.map(event => ({ ...event }))
    s.history = s.history.map(event => ({ ...event }))
    s[collection][0]!.id = s.eventSequence + 1
    for (const other of ['events', 'history', 'crops'] as const) {
      if (other !== collection) expect(s[other].every(entry => entry.id <= s.eventSequence)).toBe(true)
    }
    expect(() => deserialize(serialize(s, 0))).toThrow('原始存檔已保留')
  })
  it.each([0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe crop ID %s', value => {
    const s = createGame()
    walkTo(s, { x: 16, y: 10 }); farm(s, 'prepare'); farm(s, 'plant')
    s.crops[0]!.id = value
    expect(() => deserialize(serialize(s, 0))).toThrow('原始存檔已保留')
  })
  it('checks the NPC counter against inherited characters as well as remaining NPCs', () => {
    const s = createGame(), heir = s.npcs.at(-1)!
    die(s, player(s), '戰鬥傷勢')
    expect(chooseSuccessor(s, heir.id)).toBe(true)
    expect(deserialize(serialize(s, 0)).state).toEqual(s)
    s.nextNpcId = Number(heir.id.slice(4))
    expect(s.npcs.every(n => Number(n.id.slice(4)) < s.nextNpcId)).toBe(true)
    expect(() => deserialize(serialize(s, 0))).toThrow('原始存檔已保留')
  })
  it('round trips four normally planted crops and harvests exactly one at a time', () => {
    const s = createGame(); walkTo(s, { x: 16, y: 10 })
    for (let i = 0; i < 4; i++) {
      expect(farm(s, 'prepare')).toBe(''); expect(farm(s, 'plant')).toBe('')
    }
    simulate(s, 2 * 1440)
    const loaded = deserialize(serialize(s, 0)).state
    for (let remaining = 3; remaining >= 0; remaining--) {
      expect(farm(loaded, 'harvest')).toBe('')
      expect(loaded.crops).toHaveLength(remaining)
      expect(deserialize(serialize(loaded, 0)).state).toEqual(loaded)
    }
  })
  it('round trips 500 years of history, natural deaths and successors and continues deterministically', () => {
    const s = createGame(909)
    for (let year = 0; year < 500; year++) {
      simulate(s, 120 * 1440)
      if (!player(s).isAlive) {
        const heir = s.npcs.find(n => n.isAlive && n.age >= 15)
        expect(heir).toBeDefined(); expect(chooseSuccessor(s, heir!.id)).toBe(true)
      }
    }
    expect(s.characters.length).toBeGreaterThan(2)
    expect(s.history.length).toBeGreaterThan(150)
    expect(s.events).toHaveLength(150)
    const loaded = deserialize(serialize(s, 0)).state
    expect(loaded).toEqual(s)
    simulate(s, 15 * 1440); simulate(loaded, 15 * 1440)
    expect(loaded).toEqual(s)
    expect(deserialize(serialize(loaded, 0)).state).toEqual(loaded)
  }, 15000)

  it('rejects a rolled-back event sequence before planting duplicates a crop ID', () => {
    const s = createGame(909)
    walkTo(s, { x: 16, y: 10 })
    expect(farm(s, 'prepare')).toBe(''); expect(farm(s, 'prepare')).toBe('')
    expect(farm(s, 'plant')).toBe('')
    s.eventSequence = s.crops[0]!.id - 1
    expect(() => deserialize(serialize(s, 0))).toThrow('原始存檔已保留')
  })

  it('rejects duplicate crop IDs before harvesting can remove an extra plot', () => {
    const s = createGame(909)
    walkTo(s, { x: 16, y: 10 })
    for (let i = 0; i < 2; i++) {
      expect(farm(s, 'prepare')).toBe(''); expect(farm(s, 'plant')).toBe('')
    }
    simulate(s, 2 * 1440)
    s.crops[1]!.id = s.crops[0]!.id
    expect(() => deserialize(serialize(s, 0))).toThrow('原始存檔已保留')
  })

  it('rejects an NPC counter that would collide with an existing resident', () => {
    const s = createGame(909)
    s.nextNpcId = 1
    expect(() => deserialize(serialize(s, 0))).toThrow('原始存檔已保留')
  })

  it('round trips a living world and preserves future simulation', () => {
    const s = createGame(32); simulate(s, 100 * 1440)
    const saved = deserialize(serialize(s, 1000))
    expect(saved.state).toEqual(s); expect(saved.lastSavedAt).toBe(1000)
    simulate(s, 1440); simulate(saved.state, 1440); expect(saved.state).toEqual(s)
  })
  it('round trips a deceased character instead of discarding the world', () => {
    const s = createGame(); die(s, player(s), '戰鬥傷勢')
    expect(deserialize(serialize(s, 1000)).state).toEqual(s)
  })
  it('round trips an equipped character in active combat and continues the encounter', () => {
    const s = createGame(); walkTo(s, { x: 5, y: 4 }); player(s).inventory.sword = 1; equip(s, 'sword'); encounter(s)
    const loaded = deserialize(serialize(s, 1000)).state
    expect(loaded).toEqual(s)
    combatTurn(s, 'attack'); combatTurn(loaded, 'attack'); expect(loaded).toEqual(s)
  })
  it('rejects unsupported versions, missing fields and invalid JSON', () => {
    const s = createGame(), raw = JSON.parse(serialize(s, 1000))
    raw.saveVersion = 99; expect(() => deserialize(JSON.stringify(raw))).toThrow('版本')
    raw.saveVersion = 1; delete raw.npcs; expect(() => deserialize(JSON.stringify(raw))).toThrow('資料')
    expect(() => deserialize('{')).toThrow()
  })
  it('rejects fractional prepared plots on the first load (PT-001)', () => {
    const s = createGame()
    s.preparedPlots = 0.5
    expect(() => deserialize(serialize(s, 1000))).toThrow('原始存檔已保留')
  })
  it.each([0, 1, 2, 3, 4])('round trips %s whole prepared plots', preparedPlots => {
    const s = createGame()
    s.preparedPlots = preparedPlots
    expect(deserialize(serialize(s, 1000)).state).toEqual(s)
  })
  it('round trips normal farming at capacity and continues planting', () => {
    const s = createGame()
    walkTo(s, { x: 16, y: 10 })
    for (let i = 0; i < 4; i++) expect(farm(s, 'prepare')).toBe('')
    expect(s.preparedPlots).toBe(4)
    expect(farm(s, 'plant')).toBe('')
    expect(s.preparedPlots).toBe(3)
    expect(s.crops).toHaveLength(1)
    const loaded = deserialize(serialize(s, 1000)).state
    expect(loaded).toEqual(s)
    expect(farm(loaded, 'plant')).toBe('')
    expect(loaded.preparedPlots).toBe(2)
    expect(loaded.crops).toHaveLength(2)
    expect(deserialize(serialize(loaded, 2000)).state).toEqual(loaded)
  })
  it.each(['invalid-calendar', 'invalid-character-stage', 'invalid-event', 'invalid-combat'])('rejects a corrupt %s save', kind => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    if (kind === 'invalid-calendar') raw.worldTime = -10
    if (kind === 'invalid-character-stage') raw.characters[0].lifeStage = 'unknown-stage'
    if (kind === 'invalid-event') raw.events[0].category = 'bogus'
    if (kind === 'invalid-combat') raw.combat = 'not-a-combat-object'
    expect(() => deserialize(JSON.stringify(raw))).toThrow()
  })
  it('matures crops at the same instant in batch and minute-by-minute simulation', () => {
    const s = createGame(); walkTo(s, { x: 16, y: 10 }); farm(s, 'prepare'); farm(s, 'plant')
    const granular = deserialize(serialize(s, 1000)).state
    simulate(s, 3000)
    for (let i = 0; i < 3000; i++) simulate(granular, 1)
    expect(granular).toEqual(s)
  })
  it.each(['character-exp', 'npc-skill-exp', 'skill-level', 'schedule-midnight', 'schedule-order', 'schedule-start', 'dungeon-stage', 'dungeon-combat'])('rejects unsafe continuation: %s', kind => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    if (kind === 'character-exp') raw.characters[0].exp = 1e308
    if (kind === 'npc-skill-exp') raw.npcs[0].skills.farming.exp = 1e308
    if (kind === 'skill-level') raw.npcs[0].skills.farming.level = -1e100
    if (kind === 'schedule-midnight') raw.npcs[0].schedule = [{ start: 500, activity: 'work', destination: 'workplace' }]
    if (kind === 'schedule-order') raw.npcs[0].schedule[2].start = 400
    if (kind === 'schedule-start') raw.npcs[0].schedule[1].start = 420.5
    if (kind === 'dungeon-stage') { raw.dungeon.stage = 3; raw.dungeon.inDungeon = true }
    if (kind === 'dungeon-combat') raw.combat = { monsterId: 'slime', hp: 18, maxHp: 18, attack: 4, defense: 0, exp: 10, gold: 5, elite: false, dungeon: true }
    expect(() => deserialize(JSON.stringify(raw))).toThrow('資料')
  })
  it.each([CONFIG.width, 0.5])('rejects an incomplete grid caused by tile x=%s', x => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    raw.tiles.find((tile: { x: number; y: number }) => tile.x === 7 && tile.y === 10).x = x
    expect(() => deserialize(JSON.stringify(raw))).toThrow('資料')
  })
  it.each(['player', 'npc', 'home', 'workplace', 'threat'])('rejects invalid world locations or encounter levels: %s', kind => {
    const raw = JSON.parse(serialize(createGame(), 1000))
    if (kind === 'player') raw.characters[0].position.x = 7.5
    if (kind === 'npc') raw.npcs[0].position.y = CONFIG.height
    if (kind === 'home') raw.npcs[0].home.x = 7.5
    if (kind === 'workplace') raw.npcs[0].workplace.y = -1
    if (kind === 'threat') raw.threat.threatLevel = 0
    expect(() => deserialize(JSON.stringify(raw))).toThrow('資料')
  })
})
