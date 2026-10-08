import { expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import type { ItemInstance } from '../domain/reward'
import { rolledItemStats } from './gearStats'
import { chooseSuccessor, createGame, die, player, simulate } from './simulation'
import { tryStartRegionalCrisis } from './regionalCrisis'
import { contributeCrisisEquipment, contributeCrisisFood, contributeCrisisGold } from './crisisContributions'
import { availableCivilDefenseDefenders, civilDefenseGearEffect, deriveCivilDefense } from './civilDefense'
import { deserialize, serialize } from '../services/saveService'

function crisisWorld() {
  const state = createGame(6301)
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
  if (state.regionalCrisis.phase !== 'warning') throw new Error('expected warning')
  const character = state.characters[0]!
  character.position = { x: 8, y: 10 }
  character.currentRegion = 'village'
  const defender = state.npcs[0]!
  defender.job = 'guard'
  defender.age = 30
  defender.isAlive = true
  defender.injuredUntil = state.worldTime
  defender.equipment.weapon = null
  defender.equipment.armor = null
  state.life.npcs[defender.id]!.career = 'worker'
  state.life.npcs[defender.id]!.careerJob = 'guard'
  pointPlayerAtCommunitySquare(state)
  return { state, character, defender, crisis: state.regionalCrisis }
}

function item(instanceId = 'item-1', ownerId = 'alden', baseId: ItemInstance['baseId'] = 'shortSword'): ItemInstance {
  return { instanceId, ownerId, baseId, level: 1, material: null, rarity: 'common',
    rolledStats: rolledItemStats(baseId, 1, []), affixes: [], specialTrait: null, provenance: null, craftProvenance: null }
}

function strongItem(instanceId = 'item-1', ownerId = 'alden'): ItemInstance {
  const affixes: ItemInstance['affixes'] = [
    { id: 'striking', tier: 3, value: 4 },
    { id: 'keen', tier: 3, value: 10 },
    { id: 'piercing', tier: 3, value: 3 },
  ]
  return { instanceId, ownerId, baseId: 'shortSword', level: 10, material: null, rarity: 'legendary',
    rolledStats: rolledItemStats('shortSword', 10, affixes), affixes, specialTrait: null, provenance: null, craftProvenance: null }
}

function craftedItem(instanceId: string, ownerId: string, creatorId: string): ItemInstance {
  const affixes: ItemInstance['affixes'] = [{ id: 'piercing', tier: 1, value: 1 }]
  return {
    instanceId, ownerId, baseId: 'spear', level: 2, material: null, rarity: 'uncommon',
    rolledStats: rolledItemStats('spear', 2, affixes), affixes, specialTrait: null, provenance: null,
    craftProvenance: {
      recipeId: 'starterSpear', createdBy: creatorId, createdAt: 0, influenceMaterial: null, masterpiece: false,
    },
  }
}

function pointPlayerAtCommunitySquare(state: ReturnType<typeof createGame>) {
  const character = player(state)
  character.position = { x: 8, y: 10 }
  character.currentRegion = 'village'
}

function allNpcJobs(state: ReturnType<typeof createGame>, job: 'guard' | 'woodcutter') {
  for (const npc of state.npcs) {
    npc.job = job
    state.life.npcs[npc.id]!.careerJob = job
    if (state.life.npcs[npc.id]!.career === 'retired') state.life.npcs[npc.id]!.career = 'worker'
  }
}

it('accepts an owned unequipped item for a current crisis defender without time or RNG advancement', () => {
  const { state, character, defender, crisis } = crisisWorld()
  const sourceItem = item()
  state.reward.instances.push(sourceItem)
  state.reward.nextInstanceId = 2
  const time = state.worldTime, rng = state.rngState
  const baseline = deriveCivilDefense(state, crisis)!

  expect(contributeCrisisEquipment(state, crisis.id, defender.id, sourceItem.instanceId)).toBe('')

  expect(state.reward.instances).toEqual([])
  expect(state.worldTime).toBe(time)
  expect(state.rngState).toBe(rng)
  expect(state.regionalCrisis.phase).toBe('warning')
  expect(state.events.at(-1)?.type).toBe('regional-crisis.contribution.equipment')
  expect(character.equipment.weapon).toBeNull()
  expect(deriveCivilDefense(state, state.regionalCrisis)?.factors.find(factor => factor.id === 'equipment')?.points)
    .toBeGreaterThan(baseline.factors.find(factor => factor.id === 'equipment')!.points)
  expect(deserialize(serialize(state, 700)).state).toEqual(state)
})

it('turns actual weapon stats and defender suitability into capped equipment readiness', () => {
  const weak = crisisWorld()
  const weakItem = item()
  weak.state.reward.instances.push(weakItem)
  weak.state.reward.nextInstanceId = 2
  expect(contributeCrisisEquipment(weak.state, weak.crisis.id, weak.defender.id, weakItem.instanceId)).toBe('')
  const weakPoints = deriveCivilDefense(weak.state, weak.crisis)!.factors.find(factor => factor.id === 'equipment')!.points

  const strong = crisisWorld()
  const strongItemInstance = strongItem()
  strong.state.reward.instances.push(strongItemInstance)
  strong.state.reward.nextInstanceId = 2
  strong.defender.skills.combat.level = 10
  expect(contributeCrisisEquipment(strong.state, strong.crisis.id, strong.defender.id, strongItemInstance.instanceId)).toBe('')
  const strongPoints = deriveCivilDefense(strong.state, strong.crisis)!.factors.find(factor => factor.id === 'equipment')!.points

  expect(strongPoints).toBeGreaterThan(weakPoints)
  expect(strongPoints).toBeLessThanOrEqual(10)
})

it.each(['stale-crisis', 'outside-village', 'combat', 'dead-player', 'dungeon', 'active-phase', 'event-capacity',
  'unowned-item', 'equipped-item', 'no-free-slot'] as const)(
  'rejects an invalid equipment contribution atomically: %s', kind => {
    const { state, defender, crisis } = crisisWorld()
    const sourceItem = item()
    state.reward.instances.push(sourceItem)
    state.reward.nextInstanceId = 2
    let crisisId = crisis.id
    if (kind === 'stale-crisis') crisisId = `${crisisId}:stale`
    if (kind === 'outside-village') {
      player(state).position = { x: 5, y: 4 }
      player(state).currentRegion = 'forest'
    }
    if (kind === 'combat') {
      player(state).status = 'combat'
      state.combat = { monsterId: 'goblin', hp: 1, maxHp: 1, attack: 1, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false }
    }
    if (kind === 'dead-player') player(state).isAlive = false
    if (kind === 'dungeon') state.dungeon.inDungeon = true
    if (kind === 'active-phase') {
      state.regionalCrisis = { ...crisis, phase: 'active', phaseStartedAt: crisis.phaseEndsAt }
    }
    if (kind === 'event-capacity') state.eventSequence = Number.MAX_SAFE_INTEGER - 1
    if (kind === 'unowned-item') sourceItem.ownerId = 'missing-character'
    if (kind === 'equipped-item') state.reward.equipped.alden = { weapon: sourceItem.instanceId, armor: null }
    if (kind === 'no-free-slot') defender.equipment.weapon = 'sword'
    const before = structuredClone(state)

    expect(contributeCrisisEquipment(state, crisisId, defender.id, sourceItem.instanceId)).not.toBe('')
    expect(state).toEqual(before)
  },
)

it('accepts food only when it improves the raw forecast and bounded supply need', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  state.threat.bossAlive = true
  state.settlement.food = 0
  player(state).inventory.food = 25
  while (state.npcs.length < 52) {
    const source = state.npcs[0]!
    const npc = structuredClone(source)
    npc.id = `npc-${state.nextNpcId++}`
    npc.name = `guard-${npc.id}`
    state.npcs.push(npc)
    state.life.npcs[npc.id] = { ...structuredClone(state.life.npcs[source.id]!), careerJob: 'guard', career: 'worker' }
  }
  const before = deriveCivilDefense(state, crisis)!
  expect(before.food.rawProjectedAtResolution).toBeCloseTo(-50.04)

  const noEffect = structuredClone(state)
  expect(contributeCrisisFood(state, crisis.id, 6)).toContain('農夫')
  expect(state).toEqual(noEffect)
  expect(contributeCrisisFood(state, crisis.id, 25)).toBe('')
  expect(player(state).inventory.food).toBe(0)
  expect(state.settlement.food).toBe(100)
  expect(state.regionalCrisis.phase === 'dormant' ? 0 : state.regionalCrisis.contributions.food.supplied).toBe(100)
  expect(deriveCivilDefense(state, crisis)!.food.rawProjectedAtResolution).toBeCloseTo(49.96)

  // Model one natural daily food loss; the contribution cap still blocks restocking the same crisis.
  state.worldTime += 1440
  state.settlement.food = 94.44
  player(state).inventory.food = 1
  const exhaustedCapacity = structuredClone(state)
  expect(deriveCivilDefense(state, state.regionalCrisis)!.food.rawProjectedAtResolution).toBeCloseTo(49.96)
  expect(contributeCrisisFood(state, crisis.id, 1)).not.toBe('')
  expect(state).toEqual(exhaustedCapacity)
})

it('does not tell the player to add farmers when a negative forecast can reach need but the request is oversized', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  state.npcs[1]!.job = 'farmer'
  state.life.npcs[state.npcs[1]!.id]!.careerJob = 'farmer'
  state.npcs[2]!.job = 'farmer'
  state.life.npcs[state.npcs[2]!.id]!.careerJob = 'farmer'
  state.threat.bossAlive = true
  state.settlement.food = 23.84
  player(state).inventory.food = 15
  while (state.npcs.length < 52) {
    const source = state.npcs[0]!
    const npc = structuredClone(source)
    npc.id = `npc-${state.nextNpcId++}`
    npc.name = `guard-${npc.id}`
    state.npcs.push(npc)
    state.life.npcs[npc.id] = { ...structuredClone(state.life.npcs[source.id]!), careerJob: 'guard', career: 'worker' }
  }
  const model = deriveCivilDefense(state, crisis)!
  expect(model.food.rawProjectedAtResolution).toBeCloseTo(-1)
  const before = structuredClone(state)

  const error = contributeCrisisFood(state, crisis.id, 15)

  expect(error).not.toContain('農夫')
  expect(state).toEqual(before)
})

it('retains equipment provenance and historical NPC/donor references through death and succession', () => {
  const { state, character, defender, crisis } = crisisWorld()
  const sourceItem = strongItem()
  state.reward.instances.push(sourceItem)
  state.reward.nextInstanceId = 2
  expect(contributeCrisisEquipment(state, crisis.id, defender.id, sourceItem.instanceId)).toBe('')

  die(state, defender, '危機傷勢')
  die(state, character, '危機傷勢')
  const heir = state.npcs.find(npc => npc.isAlive && npc.age >= 15 && npc.id !== defender.id)!
  expect(chooseSuccessor(state, heir.id)).toBe(true)

  const loaded = deserialize(serialize(state, 702)).state
  if (loaded.regionalCrisis.phase === 'dormant') throw new Error('expected retained crisis')
  expect(loaded.regionalCrisis.contributions.equipment[0]).toMatchObject({
    defenderNpcId: defender.id, donorId: character.id, sourceItem: { instanceId: sourceItem.instanceId, ownerId: character.id },
  })
  expect(loaded.characters.find(candidate => candidate.id === character.id)?.isAlive).toBe(false)
})

it('rejects forged consumed-item provenance in a V5 contribution ledger', () => {
  const { state, defender, crisis } = crisisWorld()
  const sourceItem = item()
  state.reward.instances.push(sourceItem)
  state.reward.nextInstanceId = 2
  expect(contributeCrisisEquipment(state, crisis.id, defender.id, sourceItem.instanceId)).toBe('')
  const raw = JSON.parse(serialize(state, 703)) as Record<string, any>
  raw.regionalCrisis.contributions.equipment[0].sourceItem.rolledStats.attack++
  expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
})

it('retains an allocated defender reference after daily simulation prunes its dead nonfeatured NPC record', () => {
  const { state, defender, crisis } = crisisWorld()
  state.life.npcs[defender.id]!.featured = false
  const sourceItem = item()
  state.reward.instances.push(sourceItem)
  state.reward.nextInstanceId = 2
  expect(contributeCrisisEquipment(state, crisis.id, defender.id, sourceItem.instanceId)).toBe('')
  die(state, defender, '危機傷勢')
  simulate(state, CONFIG.minutesPerDay)

  expect(state.npcs.some(npc => npc.id === defender.id)).toBe(false)
  expect(state.life.npcs[defender.id]).toBeUndefined()
  expect(state.regionalCrisis.phase === 'dormant' ? 0 : state.regionalCrisis.contributions.equipment.length).toBe(1)
  const loaded = deserialize(serialize(state, 704)).state
  if (loaded.regionalCrisis.phase === 'dormant') throw new Error('expected retained active crisis')
  expect(loaded.regionalCrisis.contributions.equipment[0]).toMatchObject({ defenderNpcId: defender.id, donorId: 'alden' })
})

it('adds capped gold to the workforce-derived emergency logistics need', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  player(state).gold = 200
  const baseline = deriveCivilDefense(state, crisis)!
  expect(baseline.capacity.gold).toBe(100)
  expect(baseline.factors.find(factor => factor.id === 'adult_logistics')?.points).toBe(0)

  expect(contributeCrisisGold(state, crisis.id, 25)).toBe('')
  expect(player(state).gold).toBe(175)
  const supported = deriveCivilDefense(state, crisis)!
  expect(supported.factors.find(factor => factor.id === 'adult_logistics')?.points).toBe(2)
  expect(supported.needs.find(need => need.id === 'gold')).toMatchObject({ current: 25, required: 100, shortage: 75 })

  const before = structuredClone(state)
  expect(contributeCrisisGold(state, crisis.id, 76)).not.toBe('')
  expect(state).toEqual(before)
  expect(deserialize(serialize(state, 701)).state).toEqual(state)
})

it('recognizes a donor once when combined food and gold supply crosses five normalized credits', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  state.threat.bossAlive = true
  state.settlement.food = 0
  player(state).gold = 200
  player(state).inventory.food = 4
  while (state.npcs.length < 52) {
    const source = state.npcs[0]!
    const npc = structuredClone(source)
    npc.id = `npc-${state.nextNpcId++}`
    npc.name = `guard-${npc.id}`
    state.npcs.push(npc)
    state.life.npcs[npc.id] = { ...structuredClone(state.life.npcs[source.id]!), careerJob: 'guard', career: 'worker' }
  }
  for (const farmer of state.npcs.slice(0, 7)) {
    farmer.job = 'farmer'
    state.life.npcs[farmer.id]!.careerJob = 'farmer'
  }
  const characterId = state.activeCharacterId
  const reputation = state.life.characters[characterId]!.reputation
  const worldTime = state.worldTime
  const rngState = state.rngState
  const baseline = deriveCivilDefense(state, crisis)!
  expect(baseline.food.rawProjectedAtResolution).toBeGreaterThan(0)
  expect(baseline.food.rawProjectedAtResolution).toBeLessThan(55)

  expect(contributeCrisisFood(state, crisis.id, 4)).toBe('')
  expect(state.life.characters[characterId]!.reputation).toBe(reputation)
  expect(state.worldTime).toBe(worldTime)
  expect(state.rngState).toBe(rngState)
  expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(0)
  expect(state.events.at(-1)?.type).toBe('regional-crisis.contribution.food')

  expect(contributeCrisisGold(state, crisis.id, 5)).toBe('')
  expect(state.life.characters[characterId]!.reputation).toBe(reputation + 3)
  expect(state.life.characters[characterId]!.reputationHistory.at(-1)).toMatchObject({ delta: 3 })
  expect(state.worldTime).toBe(worldTime)
  expect(state.rngState).toBe(rngState)
  expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(1)
  expect(state.events.filter(event => event.type === 'regional-crisis.contribution.food')).toHaveLength(1)
  expect(state.events.filter(event => event.type === 'regional-crisis.contribution.gold')).toHaveLength(1)

  const loaded = deserialize(serialize(state, 705)).state
  expect(loaded).toEqual(state)
  expect(loaded.worldTime).toBe(worldTime)
  expect(loaded.rngState).toBe(rngState)
  expect(contributeCrisisGold(loaded, crisis.id, 1)).toBe('')
  expect(loaded.life.characters[characterId]!.reputation).toBe(reputation + 3)
  expect(loaded.worldTime).toBe(worldTime)
  expect(loaded.rngState).toBe(rngState)
  expect(loaded.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(1)
})

it('credits summed defense craft by original crafter across creators, never the successor item owner', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  for (const npc of state.npcs) npc.age = 30
  const originalCrafter = player(state)
  const originalCrafterId = originalCrafter.id
  const originalCrafterName = originalCrafter.name
  const originalReputation = state.life.characters[originalCrafterId]!.reputation
  const successorNpc = state.npcs.find(npc => npc.isAlive && npc.age >= 15)!
  die(state, originalCrafter, '鍛造測試')
  expect(chooseSuccessor(state, successorNpc.id)).toBe(true)
  pointPlayerAtCommunitySquare(state)
  const successor = player(state)
  const successorReputation = state.life.characters[successor.id]!.reputation
  const worldTime = state.worldTime
  const rngState = state.rngState
  const effectPerItem = civilDefenseGearEffect(craftedItem('measure', successor.id, originalCrafterId).rolledStats, 'weapon', 10)
  expect(effectPerItem).toBeLessThan(1)
  expect(effectPerItem * 2).toBeGreaterThanOrEqual(1)

  const creatorIds = [originalCrafterId, successor.id, originalCrafterId, successor.id]
  const items = creatorIds.map((creatorId, index) => craftedItem(`item-${index + 1}`, successor.id, creatorId))
  state.reward.instances.push(...items)
  state.reward.nextInstanceId = 5
  const defenders = availableCivilDefenseDefenders(state).slice(0, 4)
  expect(defenders).toHaveLength(4)

  for (let index = 0; index < items.length; index++) {
    expect(contributeCrisisEquipment(state, crisis.id, defenders[index]!.id, items[index]!.instanceId)).toBe('')
    expect(state.life.characters[successor.id]!.reputation).toBe(successorReputation + (index === 3 ? 3 : 0))
    expect(state.life.characters[originalCrafterId]!.reputation).toBe(originalReputation)
    expect(state.worldTime).toBe(worldTime)
    expect(state.rngState).toBe(rngState)
    expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(index < 2 ? 0 : index - 1)
  }

  const craftRecognitions = state.history.filter(event => event.type === 'regional-crisis.contribution.major')
  expect(craftRecognitions[0]!.message).toContain(originalCrafterName)
  expect(craftRecognitions[0]!.message).toContain(originalCrafterId)
  expect(craftRecognitions[1]!.message).toContain(successor.name)
  expect(craftRecognitions[1]!.message).toContain(successor.id)
  expect(state.regionalCrisis.phase === 'dormant' ? [] : state.regionalCrisis.contributions.equipment)
    .toHaveLength(4)
  const loaded = deserialize(serialize(state, 706)).state
  expect(loaded).toEqual(state)
  expect(loaded.worldTime).toBe(worldTime)
  expect(loaded.rngState).toBe(rngState)
})

it('rejects a major supply threshold crossing atomically without room for its complete event path', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  player(state).gold = 200
  state.eventSequence = Number.MAX_SAFE_INTEGER - 3
  const before = structuredClone(state)

  expect(contributeCrisisGold(state, crisis.id, 25)).toContain('安全上限')
  expect(state).toEqual(before)
})

it('keeps a threshold-crossing crafted asset and ledger intact when event capacity is short', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  for (const npc of state.npcs) npc.age = 30
  const creatorId = state.activeCharacterId
  const items = [1, 2].map(index => craftedItem(`item-${index}`, creatorId, creatorId))
  state.reward.instances.push(...items)
  state.reward.nextInstanceId = 3
  const defenders = availableCivilDefenseDefenders(state).slice(0, 2)
  expect(defenders).toHaveLength(2)

  expect(contributeCrisisEquipment(state, crisis.id, defenders[0]!.id, items[0]!.instanceId)).toBe('')
  state.eventSequence = Number.MAX_SAFE_INTEGER - 3
  const before = structuredClone(state)

  expect(contributeCrisisEquipment(state, crisis.id, defenders[1]!.id, items[1]!.instanceId)).toContain('安全上限')
  expect(state).toEqual(before)
})

it('admits the full three-event supply path at the last saveable event sequence', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  player(state).gold = 200
  state.life.characters[state.activeCharacterId]!.reputation = 24
  state.eventSequence = Number.MAX_SAFE_INTEGER - 4

  expect(contributeCrisisGold(state, crisis.id, 25)).toBe('')

  expect(state.eventSequence).toBe(Number.MAX_SAFE_INTEGER - 1)
  expect(state.events.slice(-3).map(event => event.type)).toEqual([
    'regional-crisis.contribution.gold', 'reputation.rankChanged', 'regional-crisis.contribution.major',
  ])
  expect(deserialize(serialize(state, 707)).state).toEqual(state)
})

it('does not replay recognition for a loaded ledger already above the supply threshold', () => {
  const { state, crisis } = crisisWorld()
  allNpcJobs(state, 'guard')
  player(state).gold = 200
  crisis.contributions.gold.spent = 25
  crisis.contributions.gold.credits = [{ donorId: state.activeCharacterId, amount: 25 }]
  const loaded = deserialize(serialize(state, 708)).state
  const characterId = loaded.activeCharacterId
  const reputation = loaded.life.characters[characterId]!.reputation

  expect(contributeCrisisGold(loaded, crisis.id, 1)).toBe('')

  expect(loaded.life.characters[characterId]!.reputation).toBe(reputation)
  expect(loaded.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(0)
})
