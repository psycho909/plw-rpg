import { expect, it } from 'vitest'
import { combatTurn, encounter, startRegionalCampRaid } from './actions'
import { deriveCivilDefense } from './civilDefense'
import { createGame, player, chooseSuccessor } from './simulation'
import {
  advanceRegionalCrisisState, completeRegionalCrisisTransition, tryStartRegionalCrisis,
} from './regionalCrisis'
import { deserialize, serialize } from '../services/saveService'

function crisisWorld(seed = 7210) {
  const state = createGame(seed)
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
  const character = player(state)
  const forest = state.tiles.find(tile => tile.regionId === 'forest' && tile.walkable)!
  character.position = { x: forest.x, y: forest.y }
  character.currentRegion = 'forest'
  character.stats.strength = 500
  if (state.regionalCrisis.phase === 'dormant') throw new Error('expected warning')
  return { state, character, crisis: state.regionalCrisis }
}

function moveToCrisisPhase(state: ReturnType<typeof createGame>, phase: 'preparation' | 'active') {
  let crisis = state.regionalCrisis
  while (crisis.phase !== phase) {
    if (crisis.phase !== 'warning' && crisis.phase !== 'preparation') throw new Error(`cannot advance from ${crisis.phase}`)
    state.worldTime = crisis.phaseEndsAt
    crisis = advanceRegionalCrisisState(crisis, state.worldTime)
    state.regionalCrisis = crisis
  }
}

function moveThroughResolutionToNextCrisis(state: ReturnType<typeof createGame>) {
  let crisis = state.regionalCrisis
  if (crisis.phase !== 'warning') throw new Error('expected first warning')
  state.worldTime = crisis.phaseEndsAt
  crisis = advanceRegionalCrisisState(crisis, state.worldTime)
  if (crisis.phase !== 'preparation') throw new Error('expected preparation')
  state.regionalCrisis = crisis
  state.worldTime = crisis.phaseEndsAt
  crisis = advanceRegionalCrisisState(crisis, state.worldTime)
  if (crisis.phase !== 'active') throw new Error('expected active')
  state.regionalCrisis = crisis
  state.worldTime = crisis.phaseEndsAt
  crisis = advanceRegionalCrisisState(crisis, state.worldTime)
  if (crisis.phase !== 'resolution') throw new Error('expected resolution')
  state.regionalCrisis = completeRegionalCrisisTransition(crisis, 'setback', state.worldTime)
  crisis = state.regionalCrisis
  if (crisis.phase !== 'aftermath') throw new Error('expected aftermath')
  state.worldTime = crisis.phaseEndsAt
  crisis = advanceRegionalCrisisState(crisis, state.worldTime)
  if (crisis.phase !== 'cooldown') throw new Error('expected cooldown')
  state.regionalCrisis = crisis
  state.worldTime = crisis.cooldownUntil
  state.regionalCrisis = advanceRegionalCrisisState(crisis, state.worldTime)
  if (state.regionalCrisis.phase !== 'dormant') throw new Error('expected dormant crisis')
  expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)
}

it('records a real Goblin camp victory once and improves odds when current pressure dominates', () => {
  const { state, crisis } = crisisWorld()
  const reputationBefore = state.life.characters[state.activeCharacterId]!.reputation
  state.threat.monsterPopulation = 100
  state.threat.threatLevel = 3
  state.threat.campLevel = 3
  state.threat.bossAlive = true
  const before = deriveCivilDefense(state, crisis)!
  expect(before.threatTrace.selected).toBe('current')
  const rngBefore = state.rngState

  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  expect(state.combat).toMatchObject({
    monsterId: 'goblin', dungeon: false,
    regionalCrisisObjective: { kind: 'camp_raid', crisisId: crisis.id, startedAt: state.worldTime },
  })
  const inFlight = deserialize(serialize(state, 7200)).state
  expect(inFlight).toEqual(state)
  moveToCrisisPhase(state, 'preparation')
  moveToCrisisPhase(inFlight, 'preparation')
  expect(deserialize(serialize(state, 7200)).state).toEqual(state)

  expect(combatTurn(state, 'attack')).toBe('')
  expect(combatTurn(inFlight, 'attack')).toBe('')
  expect(inFlight).toEqual(state)
  expect(state.combat).toBeNull()

  const after = deriveCivilDefense(state, state.regionalCrisis)!
  const creditedCrisis = state.regionalCrisis
  if (creditedCrisis.phase === 'dormant') throw new Error('expected the credited crisis')
  const noCampBenefit = deriveCivilDefense(state, { ...creditedCrisis, adventure: { campRaidAt: null } })!
  expect(creditedCrisis.adventure.campRaidAt).toBe(state.worldTime - 1)
  expect(after.threatTrace.specialRelief).toBe(6)
  expect(noCampBenefit.threatTrace.selected).toBe('current')
  expect(after.successChance).toBeGreaterThan(noCampBenefit.successChance)
  expect(state.rngState).toBe(rngBefore)
  expect(state.events.filter(event => event.type === 'combat.won')).toHaveLength(1)
  expect(state.life.characters[state.activeCharacterId]!.reputation).toBe(reputationBefore + 4)
  expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(1)
  expect(state.characters[0]!.gold).toBeGreaterThan(0)
  expect(deserialize(serialize(state, 7201)).state).toEqual(state)
  expect(startRegionalCampRaid(state, crisis.id)).not.toBe('')
})

it('rejects a camp raid before start when the event sequence cannot support one victory', () => {
  const { state, crisis } = crisisWorld()
  state.eventSequence = Number.MAX_SAFE_INTEGER - 2
  const before = structuredClone(state)

  expect(startRegionalCampRaid(state, crisis.id)).toContain('安全上限')
  expect(state).toEqual(before)
  expect(deserialize(serialize(state, 7200)).state).toEqual(state)
})

it('rejects a camp victory turn atomically when its exact outcome would exhaust the event sequence', () => {
  const { state, crisis } = crisisWorld()
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  state.eventSequence = Number.MAX_SAFE_INTEGER - 2
  const beforeTurn = structuredClone(state)

  expect(combatTurn(state, 'attack')).toContain('安全上限')
  expect(state).toEqual(beforeTurn)
  expect(deserialize(serialize(state, 7200)).state).toEqual(state)
})

it('preflights the camp victory and H recognition at the final saveable event sequence', () => {
  const measured = crisisWorld()
  const startingSequence = measured.state.eventSequence
  expect(startRegionalCampRaid(measured.state, measured.crisis.id)).toBe('')
  measured.state.combat!.hp = 1
  expect(combatTurn(measured.state, 'attack')).toBe('')
  expect(measured.state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(1)
  const requiredEvents = measured.state.eventSequence - startingSequence
  expect(requiredEvents).toBeGreaterThan(3)

  const exactFit = crisisWorld()
  exactFit.state.eventSequence = Number.MAX_SAFE_INTEGER - 1 - requiredEvents
  expect(startRegionalCampRaid(exactFit.state, exactFit.crisis.id)).toBe('')
  exactFit.state.combat!.hp = 1
  expect(combatTurn(exactFit.state, 'attack')).toBe('')

  expect(exactFit.state.eventSequence).toBe(Number.MAX_SAFE_INTEGER - 1)
  expect(exactFit.state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(1)
  expect(deserialize(serialize(exactFit.state, 7202)).state).toEqual(exactFit.state)
})

it('preflights daily-boundary combat events before applying damage or advancing time', () => {
  const { state, crisis, character } = crisisWorld()
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  state.eventSequence = Number.MAX_SAFE_INTEGER - 2
  state.worldTime = 1439
  state.crops = [1, 2].map(id => ({
    id, plantedAt: 0, growthDuration: 1440, matureAt: 1440, status: 'growing' as const,
  }))
  const before = structuredClone(state)

  expect(combatTurn(state, 'defend')).toContain('安全上限')
  expect(state).toEqual(before)
  expect(character.hp).toBe(before.characters[0]!.hp)
  expect(deserialize(serialize(state, 7200)).state).toEqual(state)
})

it.each(['warning', 'preparation', 'active'] as const)('allows a raid during %s before its deadline', phase => {
  const { state, crisis } = crisisWorld()
  if (phase !== 'warning') moveToCrisisPhase(state, phase)
  const current = state.regionalCrisis
  expect(current.phase).toBe(phase)
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  expect(state.combat?.regionalCrisisObjective).toEqual({
    kind: 'camp_raid', crisisId: crisis.id, startedAt: state.worldTime,
  })
})

it.each([
  'stale-id', 'outside-forest', 'mismatched-tile', 'combat', 'dead-player', 'dungeon', 'no-stamina',
  'expired', 'event-capacity', 'already-credited',
] as const)('rejects an unavailable camp raid atomically: %s', kind => {
  const { state, crisis, character } = crisisWorld()
  let crisisId = crisis.id
  if (kind === 'stale-id') crisisId = `${crisis.id}:stale`
  if (kind === 'outside-forest') { character.currentRegion = 'village'; character.position = { x: 8, y: 10 } }
  if (kind === 'mismatched-tile') character.position = { x: 8, y: 10 }
  if (kind === 'combat') {
    character.status = 'combat'
    state.combat = { monsterId: 'goblin', hp: 1, maxHp: 1, attack: 1, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false }
  }
  if (kind === 'dead-player') character.isAlive = false
  if (kind === 'dungeon') state.dungeon.inDungeon = true
  if (kind === 'no-stamina') character.stamina = 7
  if (kind === 'expired') {
    const current = state.regionalCrisis
    if (current.phase !== 'warning' && current.phase !== 'preparation' && current.phase !== 'active') throw new Error('expected live phase')
    state.worldTime = current.phaseEndsAt
  }
  if (kind === 'event-capacity') state.eventSequence = Number.MAX_SAFE_INTEGER - 1
  if (kind === 'already-credited') crisis.adventure.campRaidAt = state.worldTime
  const before = structuredClone(state)

  expect(startRegionalCampRaid(state, crisisId)).not.toBe('')
  expect(state).toEqual(before)
})

it('allows a genuine retry after fleeing without granting the camp benefit', () => {
  const { state, crisis } = crisisWorld()
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  expect(combatTurn(state, 'run')).toBe('')
  expect(state.regionalCrisis.phase === 'dormant' ? null : state.regionalCrisis.adventure.campRaidAt).toBeNull()
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
})

it('keeps a departed raid loadable through a new crisis but credits only its own current crisis', () => {
  const { state, crisis } = crisisWorld()
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  moveThroughResolutionToNextCrisis(state)
  if (state.regionalCrisis.phase === 'dormant') throw new Error('expected next warning')
  expect(state.regionalCrisis.id).not.toBe(crisis.id)

  const loaded = deserialize(serialize(state, 7350)).state
  expect(loaded.combat?.regionalCrisisObjective?.crisisId).toBe(crisis.id)
  const goldBefore = player(loaded).gold
  const expBefore = player(loaded).exp
  expect(combatTurn(loaded, 'attack')).toBe('')
  expect(player(loaded).gold).toBeGreaterThan(goldBefore)
  expect(player(loaded).exp).toBeGreaterThan(expBefore)
  if (loaded.regionalCrisis.phase === 'dormant') throw new Error('expected new crisis')
  expect(loaded.regionalCrisis.adventure.campRaidAt).toBeNull()
})

it.each([
  'other-world', 'future-sequence', 'future-start-time', 'other-monster', 'dungeon', 'wrong-kind',
] as const)('rejects malformed in-flight camp objective on save load: %s', kind => {
  const { state, crisis } = crisisWorld()
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  const raw = JSON.parse(serialize(state, 7200)) as Record<string, any>
  if (kind === 'other-world') raw.combat.regionalCrisisObjective.crisisId = 'goblin-regional:deadbeef:1'
  if (kind === 'future-sequence') {
    const seed = (raw.worldSeed >>> 0).toString(16).padStart(8, '0')
    raw.combat.regionalCrisisObjective.crisisId = `goblin-regional:${seed}:2`
  }
  if (kind === 'future-start-time') raw.combat.regionalCrisisObjective.startedAt = raw.worldTime + 1
  if (kind === 'other-monster') raw.combat.monsterId = 'wolf'
  if (kind === 'dungeon') {
    raw.combat.dungeon = true
    raw.dungeon.inDungeon = true
  }
  if (kind === 'wrong-kind') raw.combat.regionalCrisisObjective.kind = 'ordinary_hunt'

  expect(() => deserialize(JSON.stringify(raw))).toThrow('原始存檔已保留')
})

it('keeps late victory rewards ordinary and does not credit an expired crisis', () => {
  const { state, crisis } = crisisWorld()
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  if (crisis.phase !== 'warning' && crisis.phase !== 'preparation' && crisis.phase !== 'active') throw new Error('expected live phase')
  state.worldTime = crisis.phaseEndsAt
  const goldBefore = player(state).gold
  const expBefore = player(state).exp

  expect(combatTurn(state, 'attack')).toBe('')

  expect(player(state).gold).toBeGreaterThan(goldBefore)
  expect(player(state).exp).toBeGreaterThan(expBefore)
  if (state.regionalCrisis.phase === 'dormant') throw new Error('expected expired phase record')
  expect(state.regionalCrisis.adventure.campRaidAt).toBeNull()
})

it('does not credit an ordinary Goblin hunt as a camp raid', () => {
  const { state, crisis } = crisisWorld()
  state.threat.threatLevel = 3
  state.threat.campLevel = 3
  expect(encounter(state)).toBe('')
  expect(state.combat?.monsterId).toBe('goblin')
  expect(state.combat?.regionalCrisisObjective).toBeUndefined()

  expect(combatTurn(state, 'attack')).toBe('')

  if (state.regionalCrisis.phase === 'dormant') throw new Error('expected active crisis record')
  expect(state.regionalCrisis.adventure.campRaidAt).toBeNull()
  expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(0)
})

it('combines actual Chief and camp outcomes with bounded relief instead of guaranteeing victory', () => {
  const { state, crisis } = crisisWorld()
  state.threat.bossAlive = true
  const reputationBeforeChief = state.life.characters[state.activeCharacterId]!.reputation
  expect(encounter(state, true)).toBe('')
  expect(combatTurn(state, 'attack')).toBe('')
  if (state.regionalCrisis.phase === 'dormant') throw new Error('expected retained crisis')
  expect(state.regionalCrisis.chiefOutcome?.actorId).toBe(state.activeCharacterId)
  expect(state.life.characters[state.activeCharacterId]!.reputation).toBe(reputationBeforeChief + 12)
  expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(0)
  expect(deriveCivilDefense(state, state.regionalCrisis)?.threatTrace.specialRelief).toBe(8)

  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  expect(combatTurn(state, 'attack')).toBe('')
  const after = deriveCivilDefense(state, state.regionalCrisis)!
  expect(state.regionalCrisis.adventure.campRaidAt).toBe(state.worldTime - 1)
  expect(state.life.characters[state.activeCharacterId]!.reputation).toBe(reputationBeforeChief + 16)
  expect(state.history.filter(event => event.type === 'regional-crisis.contribution.major')).toHaveLength(1)
  expect(after.threatTrace.specialRelief).toBe(14)
  expect(after.successChance).toBeLessThan(1)
})

it('does not grant an in-flight raid credit when its player dies and the world continues after succession', () => {
  const { state, crisis, character } = crisisWorld()
  expect(startRegionalCampRaid(state, crisis.id)).toBe('')
  state.combat!.attack = 1000
  character.hp = 1
  const successor = state.npcs.find(npc => npc.isAlive && npc.age >= 15)!

  expect(combatTurn(state, 'defend')).toBe('')

  expect(character.isAlive).toBe(false)
  expect(state.combat).toBeNull()
  if (state.regionalCrisis.phase === 'dormant') throw new Error('expected crisis to continue')
  expect(state.regionalCrisis.adventure.campRaidAt).toBeNull()
  const crisisAfterDeath = structuredClone(state.regionalCrisis)
  expect(chooseSuccessor(state, successor.id)).toBe(true)
  expect(state.regionalCrisis).toEqual(crisisAfterDeath)
  expect(deserialize(serialize(state)).state).toEqual(state)
})
