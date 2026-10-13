import { describe, expect, it } from 'vitest'
import { CONFIG, DUNGEON } from '../data/config'
import { CONTENT_MONSTERS } from '../data/contentRegistry'
import type { ContentFamilyEncounter } from '../domain/reward'
import { combatTurn } from './actions'
import { awardContentLoot } from './itemGeneration'
import {
  contentAttackForTurn, contentChargeHealing, contentCombatPhase, contentCombatPresentation,
  contentDefenseForTurn, contentEncounterOptions, contentSourceHints, encounterContentMonster,
} from './contentFamilies'
import { craft } from './crafting'
import { equipInstance } from './rewardActions'
import { createGame, player, simulate, walkTo } from './simulation'
import { deserialize, serialize } from '../services/saveService'

describe('authored family runtime', () => {
  it('applies finite mechanics and exposes the same authored cue plus real source/use hints', () => {
    const snapshot: ContentFamilyEncounter = {
      familyId: 'slime', definitionId: 'slime_heart', variantId: 'slime_heart_stillwater',
      turn: 3, formedAt: 0, context: { region: 'forest', population: 20, hunted: 0, safety: 80, threatLevel: 3 },
    }
    const phase = contentCombatPhase(snapshot)
    expect(phase.dueMechanics.map(mechanic => mechanic.kind)).toEqual(['chargedAttack', 'guard'])
    expect(contentDefenseForTurn(6, phase)).toBe(10)
    expect(contentAttackForTurn(10, false, phase)).toBe(15)
    expect(contentChargeHealing(snapshot, 20, 100, phase)).toBe(8)
    expect(contentSourceHints('slime_resin')).toMatchObject({
      sources: expect.arrayContaining(['擊敗滑液黏怪']),
      uses: expect.arrayContaining(['出售（3 金幣）']),
    })
  })

  it('keeps availability a pure projection and rejects before stamina, time, or RNG change', () => {
    const state = createGame(62731)
    const beforeUnavailable = structuredClone(state)
    expect(encounterContentMonster(state, 'slime_slick')).toBeTruthy()
    expect(state).toEqual(beforeUnavailable)

    expect(walkTo(state, { x: 16, y: 10 })).toBe(true)
    const beforeQuery = structuredClone(state)
    const options = contentEncounterOptions(state)
    expect(options.find(option => option.definitionId === 'slime_slick')).toMatchObject({ eligible: true, reason: null })
    expect(state).toEqual(beforeQuery)

    player(state).stamina = 7
    const beforeBlocked = structuredClone(state)
    expect(encounterContentMonster(state, 'slime_slick')).toBeTruthy()
    expect(state).toEqual(beforeBlocked)
  })

  it('uses the selected monster loot table and closes a real loot-to-craft-to-equip-save loop', () => {
    const state = createGame(62732)
    expect(walkTo(state, { x: 16, y: 10 })).toBe(true)
    const worldThreat = structuredClone(state.threat)
    const crisis = structuredClone(state.regionalCrisis)
    expect(encounterContentMonster(state, 'slime_slick')).toBe('')
    state.combat!.hp = 1
    expect(combatTurn(state, 'attack')).toBe('')
    expect(state.combat).toBeNull()
    expect(state.reward.materials[state.activeCharacterId]?.slime_resin).toBe(1)
    expect(state.threat).toEqual(worldThreat)
    expect(state.regionalCrisis).toEqual(crisis)

    player(state).stats.strength = 1000
    for (let fight = 0; fight < 3; fight++) {
      expect(encounterContentMonster(state, 'slime_slick')).toBe('')
      state.combat!.hp = 1
      expect(combatTurn(state, 'attack')).toBe('')
      expect(state.combat).toBeNull()
    }
    expect(state.reward.materials[state.activeCharacterId]?.slime_resin).toBe(4)
    state.settlement.stage = 'village'
    state.settlement.capacity = 60
    if (!state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith')
    state.worldTime = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay + 10 * 60
    expect(walkTo(state, { x: 12, y: 8 })).toBe(true)
    player(state).skills.smithing.level = 2
    player(state).inventory.wood = 2
    const result = craft(state, { recipeId: 'slime_resin_guard_recipe', influenceMaterial: 'slime_resin' })
    if (!result.ok) throw new Error(result.message)
    expect(result.ok).toBe(true)
    expect(result.baseId).toBe('slime_resin_guard')
    expect(state.reward.materials[state.activeCharacterId]?.slime_resin).toBe(0)
    expect(equipInstance(state, result.instanceId!)).toBe('')

    const loaded = deserialize(serialize(state, 123456)).state
    expect(loaded.reward.equipped[state.activeCharacterId]?.armor).toBe(result.instanceId)
    expect(loaded.reward.instances.find(item => item.instanceId === result.instanceId)?.baseId).toBe('slime_resin_guard')
    expect(loaded.reward.materials[state.activeCharacterId]?.slime_resin).toBe(0)
    expect(CONTENT_MONSTERS.slime_slick.lootTableId).toBe('slime_loot_slick')
  })

  it('does not advance dungeon state or award dungeon-clear iron for an outdoor content win', () => {
    const state = createGame(62738)
    expect(walkTo(state, { x: 16, y: 10 })).toBe(true)
    state.dungeon.stage = DUNGEON.encounters.length - 1
    const dungeonBefore = structuredClone(state.dungeon)
    const ironBefore = player(state).inventory.iron
    expect(encounterContentMonster(state, 'slime_slick')).toBe('')
    state.combat!.hp = 1
    player(state).stats.strength = 1000

    expect(combatTurn(state, 'attack')).toBe('')

    expect.soft(state.dungeon).toEqual(dungeonBefore)
    expect.soft(player(state).inventory.iron).toBe(ironBefore)
  })

  it('freezes boss form over escape and reload, then applies bounded reward/cooldown without Goblin crisis changes', () => {
    const state = createGame(62733)
    state.worldTime = 60 * CONFIG.minutesPerDay + 18 * 60
    state.threat.threatLevel = 3
    player(state).level = 7
    expect(walkTo(state, { x: 5, y: 4 })).toBe(true)
    const optionsBefore = structuredClone(state)
    expect(contentEncounterOptions(state).find(option => option.definitionId === 'slime_heart')).toMatchObject({ eligible: true, reason: null })
    expect(state).toEqual(optionsBefore)

    expect(encounterContentMonster(state, 'slime_heart')).toBe('')
    const formedVariant = state.combat!.contentEncounter!.variantId
    const afterFormRng = state.rngState
    expect(state.reward.bossForms.slime_heart).toMatchObject({ kind: 'frozenEncounter', encounter: { variantId: formedVariant } })
    expect(combatTurn(state, 'run')).toBe('')
    expect(state.reward.bossForms.slime_heart).toMatchObject({ kind: 'frozenEncounter', encounter: { variantId: formedVariant } })

    const reloaded = deserialize(serialize(state, 123457)).state
    const beforeResumeRng = reloaded.rngState
    expect(encounterContentMonster(reloaded, 'slime_heart')).toBe('')
    expect(reloaded.combat!.contentEncounter!.variantId).toBe(formedVariant)
    expect(reloaded.rngState).toBe(beforeResumeRng)
    expect(beforeResumeRng).toBe(afterFormRng)

    const threatBefore = structuredClone(reloaded.threat)
    const crisisBefore = structuredClone(reloaded.regionalCrisis)
    const foodBefore = reloaded.settlement.food
    player(reloaded).stats.strength = 1000
    reloaded.combat!.hp = 1
    expect(combatTurn(reloaded, 'attack')).toBe('')
    expect(reloaded.combat).toBeNull()
    expect(reloaded.reward.bossForms.slime_heart).toMatchObject({ kind: 'cooldownUntil' })
    expect(reloaded.reward.bossForms.slime_heart).not.toHaveProperty('encounter')
    expect(reloaded.life.director.cooldowns['content-boss:slime_heart']).toBeUndefined()
    expect(reloaded.settlement.food).toBe(Math.min(100, foodBefore + 3))
    expect(reloaded.threat).toEqual(threatBefore)
    expect(reloaded.regionalCrisis).toEqual(crisisBefore)
    expect(contentCombatPresentation(reloaded)).toBeNull()
  })

  it('allows a saved boss cooldown to reform at expiry with one new formation draw', () => {
    const state = createGame(62741)
    state.worldTime = 60 * CONFIG.minutesPerDay + 18 * 60
    state.threat.threatLevel = 3
    player(state).level = 7
    expect(walkTo(state, { x: 5, y: 4 })).toBe(true)
    const availableAt = state.worldTime + CONFIG.minutesPerDay
    state.reward.bossForms.slime_heart = { kind: 'cooldownUntil', availableAt }
    expect(contentEncounterOptions(state).find(option => option.definitionId === 'slime_heart')).toMatchObject({ eligible: false })

    state.worldTime = availableAt
    const reloaded = deserialize(serialize(state, 123462)).state
    expect(contentEncounterOptions(reloaded).find(option => option.definitionId === 'slime_heart'))
      .toMatchObject({ eligible: true, reason: null })
    const rngBefore = reloaded.rngState

    expect(encounterContentMonster(reloaded, 'slime_heart')).toBe('')

    expect(reloaded.rngState).not.toBe(rngBefore)
    expect(reloaded.reward.bossForms.slime_heart).toMatchObject({ kind: 'frozenEncounter', encounter: { definitionId: 'slime_heart' } })
    expect(reloaded.life.director.cooldowns['content-boss:slime_heart']).toBeUndefined()
  })

  it('normalizes a legacy raw Reward3 frozen boss form deterministically and idempotently', () => {
    const state = createGame(62739)
    state.worldTime = 60 * CONFIG.minutesPerDay + 18 * 60
    state.threat.threatLevel = 3
    player(state).level = 7
    expect(walkTo(state, { x: 5, y: 4 })).toBe(true)
    expect(encounterContentMonster(state, 'slime_heart')).toBe('')
    const saved = JSON.parse(serialize(state, 123460)) as Record<string, any>
    saved.reward.bossForms.slime_heart = structuredClone(saved.combat.contentEncounter)
    const rngBefore = saved.rngState
    const worldTimeBefore = saved.worldTime

    const loaded = deserialize(JSON.stringify(saved)).state

    expect(loaded.reward.bossForms.slime_heart).toMatchObject({ kind: 'frozenEncounter', encounter: {
      definitionId: 'slime_heart', variantId: loaded.combat?.contentEncounter?.variantId,
    } })
    expect(loaded.rngState).toBe(rngBefore)
    expect(loaded.worldTime).toBe(worldTimeBefore)
    expect(deserialize(serialize(loaded, 123461)).state).toEqual(loaded)
  })

  it('rejects unknown boss IDs and malformed defeated cooldown entries', () => {
    const baseline = JSON.parse(serialize(createGame(62740))) as Record<string, any>
    const unknownBoss = structuredClone(baseline)
    unknownBoss.reward.bossForms.unknown_boss = { kind: 'cooldownUntil', availableAt: unknownBoss.worldTime + 100 }
    const negativeCooldown = structuredClone(baseline)
    negativeCooldown.reward.bossForms.slime_heart = { kind: 'cooldownUntil', availableAt: -1 }
    const unexpectedForm = structuredClone(baseline)
    unexpectedForm.reward.bossForms.slime_heart = { kind: 'cooldownUntil', availableAt: baseline.worldTime + 100, encounter: {} }

    for (const invalid of [unknownBoss, negativeCooldown, unexpectedForm]) {
      expect(() => deserialize(JSON.stringify(invalid))).toThrow('原始存檔已保留')
    }
  })

  it('keeps a boss defeat cooldown in bounded boss state when combat crosses a full director-key boundary', () => {
    const state = createGame(62737)
    expect(walkTo(state, { x: 5, y: 4 })).toBe(true)
    state.worldTime = 60 * CONFIG.minutesPerDay + 22 * 60 + 59
    state.threat.threatLevel = 3
    player(state).level = 7
    state.life.director.quietUntil = state.worldTime + 100 * CONFIG.minutesPerDay
    state.life.director.cooldowns = Object.fromEntries(Array.from({ length: 99 }, (_, index) => [
      `held:${index}`, state.worldTime + 100 * CONFIG.minutesPerDay,
    ]))

    expect(contentEncounterOptions(state).find(option => option.definitionId === 'slime_heart'))
      .toMatchObject({ eligible: true, reason: null })
    expect(encounterContentMonster(state, 'slime_heart')).toBe('')
    expect(Object.keys(state.life.director.cooldowns)).toHaveLength(99)

    // The marker uses the final slot; capacity filtering prevents any new event cooldown.
    simulate(state, 61)
    expect(Object.keys(state.life.director.cooldowns)).toHaveLength(100)
    expect(state.life.director.cooldowns['director:lastDailyTick']).toBe(state.worldTime)
    expect(() => deserialize(serialize(state, 123458))).not.toThrow()

    player(state).stats.strength = 1000
    state.combat!.hp = 1
    expect(combatTurn(state, 'attack')).toBe('')
    expect(state.combat).toBeNull()

    expect.soft(state.life.director.cooldowns['content-boss:slime_heart']).toBeUndefined()
    expect.soft(state.reward.bossForms.slime_heart).toMatchObject({ kind: 'cooldownUntil' })
    const saved = deserialize(serialize(state, 123459)).state
    expect.soft(saved.life.director.cooldowns['content-boss:slime_heart']).toBeUndefined()
    expect.soft(saved.reward.bossForms.slime_heart).toMatchObject({ kind: 'cooldownUntil' })
    expect.soft(Object.keys(saved.life.director.cooldowns)).toHaveLength(100)

    // On the next valid spawn window, the defeated boss must remain on cooldown.
    simulate(state, 18 * 60)
    expect(contentEncounterOptions(state).find(option => option.definitionId === 'slime_heart'))
      .toMatchObject({ eligible: false })
  })

  it('rejects unknown or unresolved loot sources before touching RNG or reward state', () => {
    const state = createGame(62734)
    const before = structuredClone(state)
    expect(() => awardContentLoot(state, { definitionId: 'missing_monster' })).toThrow()
    expect(state).toEqual(before)

    const monster = CONTENT_MONSTERS.slime_amber!
    const oldLootTableId = monster.lootTableId
    monster.lootTableId = 'unregistered_table'
    try {
      state.worldTime = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay + 10 * 60
      expect(walkTo(state, { x: 16, y: 10 })).toBe(true)
      const beforeInvalidEncounter = structuredClone(state)
      expect(encounterContentMonster(state, monster.id)).toContain('掉落資料')
      expect(state).toEqual(beforeInvalidEncounter)

      const beforeInvalidTable = structuredClone(state)
      expect(() => awardContentLoot(state, { definitionId: monster.id })).toThrow()
      expect(state).toEqual(beforeInvalidTable)
    } finally {
      monster.lootTableId = oldLootTableId
    }
  })

  it('uses the selected monster loot table and deduplicates overlapping boss guarantees', () => {
    const selected = createGame(62735)
    const amberLoot = awardContentLoot(selected, { definitionId: 'slime_amber' })
    expect(amberLoot.materials).toMatchObject({ slime_amber_gel: 1 })
    expect(selected.reward.materials[selected.activeCharacterId]?.slime_amber_gel).toBe(1)
    expect(selected.reward.materials[selected.activeCharacterId]?.slime_resin).toBe(0)

    const boss = createGame(62736)
    const bossLoot = awardContentLoot(boss, { definitionId: 'slime_heart' })
    expect(bossLoot.materials.slime_heart_gel).toBe(1)
    expect(boss.reward.materials[boss.activeCharacterId]?.slime_heart_gel).toBe(1)
    expect(bossLoot.instance?.baseId).toBe('slime_heartstaff')
    expect(boss.reward.instances.filter(item => item.baseId === 'slime_heartstaff')).toHaveLength(1)
  })
})
