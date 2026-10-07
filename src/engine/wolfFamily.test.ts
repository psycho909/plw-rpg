import { describe, expect, it } from 'vitest'
import { BOSS_VARIANTS, MONSTER_TRAITS, WOLF_MONSTERS } from '../data/rewards'
import type { FamilyEncounter, MonsterDefinitionId, MonsterTraitId } from '../domain/reward'
import type { GameState } from '../domain/types'
import { combatTurn } from './actions'
import { createGame, player, walkTo } from './simulation'
import {
  encounterWolf,
  resolveWolfCombatStats,
  wolfCombatPresentation,
  wolfEncounterOptions,
} from './wolfFamily'

function forest(state: GameState) { walkTo(state, { x: 5, y: 4 }) }

function bossUnlocked(state: GameState) {
  state.reward.collection.defeated = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']
}

function snapshot(
  state: GameState,
  definitionId: MonsterDefinitionId,
  traits: MonsterTraitId[] = [],
  variant: FamilyEncounter['variant'] = null,
  turn = 0,
): FamilyEncounter {
  const definition = WOLF_MONSTERS[definitionId]
  return {
    definitionId, traits, variant, turn, formedAt: state.worldTime,
    context: { population: 12, hunted: 0, safety: 88 },
    howlActive: definition.core === 'howl' && turn % 3 === 2,
  }
}

function installCombat(state: GameState, encounter: FamilyEncounter) {
  const stats = resolveWolfCombatStats(encounter)
  state.combat = { monsterId: 'wolf', hp: stats.maxHp, maxHp: stats.maxHp, attack: stats.attack,
    defense: stats.defense, exp: stats.exp, gold: stats.gold, elite: stats.elite, dungeon: false,
    familyEncounter: structuredClone(encounter) }
  player(state).status = 'combat'
  if (WOLF_MONSTERS[encounter.definitionId].rank === 'boss') {
    state.reward.wolfBossForm = { ...structuredClone(encounter), turn: 0, howlActive: false }
  }
}

describe('wolf family encounters', () => {
  it('explains the active hard-skin penetration effect in the armor trait cue', () => {
    expect(MONSTER_TRAITS.armored.description).toContain('防線啟動時穿透效力加倍')
  })

  it('projects all five definitions and progression reasons without changing the world', () => {
    const state = createGame(31)
    forest(state)
    const before = structuredClone(state)

    const options = wolfEncounterOptions(state)

    expect(options.map(option => option.definitionId)).toEqual(Object.keys(WOLF_MONSTERS))
    expect(options[0]).toMatchObject({ definitionId: 'grayWolf', eligible: true, reason: null })
    expect(options.slice(1).every(option => !option.eligible && option.reason)).toBe(true)
    expect(state).toEqual(before)
  })

  it('blocks invalid starts before spending stamina, advancing time, or drawing RNG', () => {
    const state = createGame(32)
    const village = structuredClone(state)
    expect(encounterWolf(state, 'grayWolf')).not.toBe('')
    expect(state).toEqual(village)

    forest(state)
    player(state).stamina = 7
    const tired = structuredClone(state)
    expect(encounterWolf(state, 'grayWolf')).not.toBe('')
    expect(state).toEqual(tired)

    player(state).stamina = player(state).maxStamina
    state.threat.monsterPopulation = 0
    const quiet = structuredClone(state)
    expect(encounterWolf(state, 'grayWolf')).not.toBe('')
    expect(state).toEqual(quiet)
  })

  it('forms deterministic tagged combat snapshots and records discovery only on a legal start', () => {
    const left = createGame(77), right = createGame(77)
    forest(left); forest(right)
    const optionsBefore = left.rngState

    expect(encounterWolf(left, 'grayWolf')).toBe('')
    expect(left.rngState).not.toBe(optionsBefore)
    expect(encounterWolf(right, 'grayWolf')).toBe('')
    expect(left.combat).toEqual(right.combat)
    expect(left.combat).toMatchObject({ monsterId: 'wolf', dungeon: false, elite: false, familyEncounter: { definitionId: 'grayWolf' } })
    expect(left.reward.collection.seen).toContain('grayWolf')
    expect(left.combat!.maxHp).toBe(resolveWolfCombatStats(left.combat!.familyEncounter!).maxHp)
  })

  it('keeps trait counts inside each rank contract', () => {
    const fixtures: { id: MonsterDefinitionId; defeated: MonsterDefinitionId[] }[] = [
      { id: 'grayWolf', defeated: [] },
      { id: 'scarredWolf', defeated: ['grayWolf'] },
      { id: 'alphaWolf', defeated: ['grayWolf', 'scarredWolf'] },
      { id: 'packLeader', defeated: ['grayWolf', 'scarredWolf', 'alphaWolf'] },
      { id: 'wolfKing', defeated: ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader'] },
    ]
    for (const [index, fixture] of fixtures.entries()) {
      const state = createGame(120 + index)
      forest(state); state.reward.collection.defeated = fixture.defeated
      expect(encounterWolf(state, fixture.id)).toBe('')
      const encounter = state.combat!.familyEncounter!
      const rank = WOLF_MONSTERS[fixture.id].rank
      if (rank === 'normal') expect(encounter.traits.length).toBeLessThanOrEqual(1)
      else if (rank === 'miniBoss') expect(encounter.traits).toEqual(['swift', 'armored'])
      else expect(encounter.traits.length).toBeGreaterThanOrEqual(1)
      expect(encounter.traits.length).toBeLessThanOrEqual(rank === 'normal' ? 1 : 2)
      if (rank === 'boss') expect(encounter.variant).toBeTruthy()
      else expect(encounter.variant).toBeNull()
    }
  })

  it('gates wolf king behind the full collection path and a seven game-day defeat cooldown', () => {
    const state = createGame(78)
    forest(state)
    expect(wolfEncounterOptions(state).find(option => option.definitionId === 'wolfKing')?.eligible).toBe(false)
    bossUnlocked(state)
    expect(wolfEncounterOptions(state).find(option => option.definitionId === 'wolfKing')).toMatchObject({ eligible: true, reason: null })
    state.reward.wolfBossDefeatedAt = state.worldTime
    expect(wolfEncounterOptions(state).find(option => option.definitionId === 'wolfKing')?.reason).toContain('7')
    state.worldTime += 7 * 1440
    expect(wolfEncounterOptions(state).find(option => option.definitionId === 'wolfKing')?.eligible).toBe(true)
  })

  it('uses the actual encounter definition and shared regional-defense effects without goblin-chief side effects', () => {
    const state = createGame(81)
    forest(state); bossUnlocked(state)
    player(state).stats.strength = 500
    // Forest victories reduce shared regional pressure without resolving goblin-boss state.
    state.threat.bossProgress = 30
    state.threat.warningLevel = 2
    state.threat.bossAlive = true
    const initialReputation = state.life.characters[state.activeCharacterId]!.reputation
    expect(initialReputation).toBeLessThan(88)
    expect(encounterWolf(state, 'wolfKing')).toBe('')

    expect(combatTurn(state, 'attack')).toBe('')

    expect(state.reward.collection.defeated).toContain('wolfKing')
    expect(state.reward.collection.bosses).toContain('wolfKing')
    expect(state.reward.materials[state.activeCharacterId]?.moonStone).toBe(1)
    expect(state.characters[0]!.inventory.material).toBe(0)
    expect(state.reward.wolfBossForm).toBeNull()
    expect(state.reward.wolfBossDefeatedAt).toBe(state.worldTime - 1)
    expect(state.threat.bossAlive).toBe(true)
    expect(state.threat.bossProgress).toBe(20)
    expect(state.threat.warningLevel).toBe(2)
    expect(state.life.characters[state.activeCharacterId]!.reputation).toBe(initialReputation + 12)
    expect(state.life.worldMemories.some(memory => memory.kind === 'GOBLIN_CHIEF_DEFEATED')).toBe(false)
  })

  it('keeps a formed boss variant across flee, save, reload, and re-challenge', async () => {
    const state = createGame(92)
    forest(state); bossUnlocked(state)
    expect(encounterWolf(state, 'wolfKing')).toBe('')
    const formed = structuredClone(state.reward.wolfBossForm)
    expect(formed).toBeTruthy()
    expect(state.combat!.familyEncounter).toMatchObject({ definitionId: 'wolfKing', variant: formed!.variant })

    expect(combatTurn(state, 'run')).toBe('')
    const afterFlee = structuredClone(state.reward.wolfBossForm)
    const { serialize, deserialize } = await import('../services/saveService')
    const loaded = deserialize(serialize(state)).state
    expect(loaded.reward.wolfBossForm).toEqual(afterFlee)
    const seed = loaded.rngState
    expect(encounterWolf(loaded, 'wolfKing')).toBe('')
    expect(loaded.rngState).toBe(seed)
    expect(loaded.combat!.familyEncounter).toMatchObject({ definitionId: 'wolfKing', variant: formed!.variant,
      traits: formed!.traits, formedAt: formed!.formedAt, context: formed!.context })
  })

  it('makes fast rushes and armored turns change combat damage, with cues from those same phases', () => {
    const rushing = createGame(101), guarded = createGame(102)
    const rush = snapshot(rushing, 'alphaWolf', ['swift'], null, 2)
    installCombat(rushing, rush)
    installCombat(guarded, structuredClone(rush))
    const presentation = wolfCombatPresentation(rushing)
    expect(presentation?.cue).toContain('防禦')
    const beforeRush = player(rushing).hp, beforeGuard = player(guarded).hp
    combatTurn(rushing, 'attack'); combatTurn(guarded, 'defend')
    expect(beforeRush - player(rushing).hp).toBeGreaterThan(beforeGuard - player(guarded).hp)

    const armored = createGame(103), unarmored = createGame(104)
    const guardedWolf = snapshot(armored, 'scarredWolf', ['armored'], null, 2)
    installCombat(armored, guardedWolf)
    installCombat(unarmored, snapshot(unarmored, 'scarredWolf', [], null, 2))
    player(armored).stats.strength = 20; player(unarmored).stats.strength = 20
    expect(wolfCombatPresentation(armored)?.cue).toContain('穿透')
    const armoredHp = armored.combat!.hp, plainHp = unarmored.combat!.hp
    combatTurn(armored, 'attack'); combatTurn(unarmored, 'attack')
    expect(armoredHp - armored.combat!.hp).toBeLessThan(plainHp - unarmored.combat!.hp)

    const companionArmored = createGame(110), companionPlain = createGame(110)
    installCombat(companionArmored, snapshot(companionArmored, 'scarredWolf', ['armored'], null, 2))
    installCombat(companionPlain, snapshot(companionPlain, 'scarredWolf', [], null, 2))
    for (const state of [companionArmored, companionPlain]) {
      player(state).stats.strength = 1
      state.party.push({ npcId: state.npcs[0]!.id, hireCost: 0, dailyWage: 0, contractEnd: 1000, archetype: 'fighter' })
    }
    const companionArmoredHp = companionArmored.combat!.hp, companionPlainHp = companionPlain.combat!.hp
    combatTurn(companionArmored, 'attack'); combatTurn(companionPlain, 'attack')
    expect(companionArmoredHp - companionArmored.combat!.hp).toBeLessThan(companionPlainHp - companionPlain.combat!.hp)
  })

  it('uses the boss variant in the next-turn cue and applies moonlit healing before a charge', () => {
    const state = createGame(105)
    const moonlit = snapshot(state, 'wolfKing', [], BOSS_VARIANTS.moonlit.id, 3)
    installCombat(state, moonlit)
    state.combat!.hp = 60
    expect(wolfCombatPresentation(state)?.cue).toContain('恢復生命')
    const hpBefore = state.combat!.hp

    combatTurn(state, 'defend')

    expect(state.combat!.hp).toBeGreaterThan(hpBefore)
  })

  it('makes a starved boss charge at half health a turn early and well-fed charge hit harder', () => {
    const starved = createGame(107), starvedControl = createGame(111), fed = createGame(108), ordinary = createGame(109)
    const early = snapshot(starved, 'wolfKing', [], BOSS_VARIANTS.starved.id, 2)
    installCombat(starved, early)
    starved.combat!.hp = starved.combat!.maxHp / 2
    installCombat(starvedControl, snapshot(starvedControl, 'wolfKing', [], BOSS_VARIANTS.moonlit.id, 2))
    starvedControl.combat!.hp = starvedControl.combat!.maxHp / 2
    const fedSnapshot = snapshot(fed, 'wolfKing', [], BOSS_VARIANTS.wellFed.id, 3)
    const ordinarySnapshot = snapshot(ordinary, 'wolfKing', [], BOSS_VARIANTS.moonlit.id, 3)
    installCombat(fed, fedSnapshot); installCombat(ordinary, ordinarySnapshot)
    fed.combat!.hp = 50; ordinary.combat!.hp = 50

    expect(wolfCombatPresentation(starved)?.cue).toContain('半血後')
    const starvedBefore = player(starved).hp, controlBefore = player(starvedControl).hp
    combatTurn(starved, 'defend'); combatTurn(starvedControl, 'defend')
    expect(starvedBefore - player(starved).hp).toBeGreaterThan(controlBefore - player(starvedControl).hp)
    const fedBefore = player(fed).hp, ordinaryBefore = player(ordinary).hp
    combatTurn(fed, 'defend'); combatTurn(ordinary, 'defend')
    expect(fedBefore - player(fed).hp).toBeGreaterThan(ordinaryBefore - player(ordinary).hp)
  })

  it('persists the howl phase only on its legal third-round window', () => {
    const state = createGame(106)
    const packLeader = snapshot(state, 'packLeader', ['swift', 'armored'], null, 2)
    installCombat(state, packLeader)
    expect(state.combat!.familyEncounter?.howlActive).toBe(true)
    expect(wolfCombatPresentation(state)?.cue).toContain('戰吼')
  })
})
