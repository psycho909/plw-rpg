import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { CONTENT_LOOT_TABLES, CONTENT_MONSTERS, CONTENT_RECIPES } from '../data/contentRegistry'
import { combatTurn } from './actions'
import {
  contentAttackForTurn, contentCombatPhase, contentCombatPresentation, contentDefenseForTurn,
  contentEncounterOptions, encounterContentMonster,
} from './contentFamilies'
import { craft } from './crafting'
import { awardContentLoot } from './itemGeneration'
import { equipInstance } from './rewardActions'
import { createGame, player, walkTo } from './simulation'
import { deserialize, serialize } from '../services/saveService'
import type { ContentFamilyEncounter } from '../domain/reward'

const caveInsectIds = [
  'cave_insect_digger', 'cave_insect_skitter', 'cave_insect_spitter', 'cave_insect_carrier',
  'cave_insect_shellback', 'cave_insect_lurker', 'cave_insect_razor', 'cave_insect_warden',
] as const

describe('Cave Insects runtime integration', () => {
  it('registers six normal and two Elite canonical mine encounters with their progression predicates', () => {
    const state = createGame(72601)
    const character = player(state)
    character.currentRegion = 'mine'
    character.position = { x: 18, y: 5 }
    character.level = 6
    state.settlement.stage = 'hamlet'
    state.threat.threatLevel = 1
    state.worldTime = 12 * 60
    expect(contentEncounterOptions(state, 'cave_insects').every(option => !option.eligible)).toBe(true)

    state.settlement.stage = 'village'
    const villageThreatOne = new Set(['cave_insect_digger', 'cave_insect_skitter', 'cave_insect_spitter', 'cave_insect_carrier', 'cave_insect_shellback'])
    for (const id of villageThreatOne) {
      const hours = CONTENT_MONSTERS[id].spawnProfiles?.[0]?.hours
      state.worldTime = 12 * 60
      if (hours) state.worldTime = hours.start * 60
      expect(contentEncounterOptions(state, 'cave_insects').find(option => option.definitionId === id))
        .toMatchObject({ eligible: true, reason: null })
    }

    state.settlement.stage = 'hamlet'
    state.threat.threatLevel = 2

    const expected = new Map([
      ['cave_insect_digger', 3], ['cave_insect_skitter', 3], ['cave_insect_spitter', 4],
      ['cave_insect_carrier', 4], ['cave_insect_shellback', 4], ['cave_insect_lurker', 5],
      ['cave_insect_razor', 6], ['cave_insect_warden', 7],
    ])
    for (const id of caveInsectIds) {
      const definition = CONTENT_MONSTERS[id]
      expect(definition).toBeDefined()
      expect(definition.level).toBe(expected.get(id))
      expect(definition.rank).toBe(id.endsWith('razor') || id.endsWith('warden') ? 'elite' : 'normal')
      expect(definition.spawnProfiles?.every(profile => profile.region === 'mine')).toBe(true)
      const mechanic = definition.mechanics[0]!
      const snapshot: ContentFamilyEncounter = {
        familyId: definition.familyId, definitionId: definition.id, variantId: null,
        turn: mechanic.everyTurns - 1, formedAt: 0,
        context: { region: 'mine', population: 0, hunted: 0, safety: 0, threatLevel: 1 },
      }
      const phase = contentCombatPhase(snapshot)
      expect(phase.dueMechanics.map(entry => entry.kind)).toContain(mechanic.kind)
      expect(phase.dueMechanics.map(entry => entry.telegraph['zh-TW']).join(' ')).toContain(mechanic.telegraph['zh-TW'])
      if (mechanic.kind === 'guard') {
        expect(contentDefenseForTurn(5, phase)).toBe(5 + mechanic.defenseBonus)
      } else {
        expect(contentAttackForTurn(10, false, phase)).toBe(Math.ceil(10 * (1 + mechanic.bonusFraction)))
      }
      const hour = definition.spawnProfiles?.[0]?.hours?.start ?? 12
      state.threat.threatLevel = 2
      state.worldTime = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay + hour * 60
      expect(contentEncounterOptions(state, 'cave_insects').find(option => option.definitionId === id))
        .toMatchObject({ eligible: true, reason: null, region: 'mine' })
    }
    const originalPackOptions = contentEncounterOptions(state, 'cave_insects')
      .filter(option => option.rank === 'normal' || option.rank === 'elite')
    expect(originalPackOptions).toHaveLength(8)
    expect(originalPackOptions.filter(option => option.rank === 'normal')).toHaveLength(6)
    expect(originalPackOptions.filter(option => option.rank === 'elite')).toHaveLength(2)

    character.level = 2
    expect(contentEncounterOptions(state, 'cave_insects').every(option => !option.eligible)).toBe(true)
    character.currentRegion = 'farmland'
    character.level = 6
    state.threat.threatLevel = 1
    expect(contentEncounterOptions(state, 'cave_insects').every(option => !option.eligible)).toBe(true)
  })

  it('runs authored mechanics in combat and awards the selected monster loot source', () => {
    const state = createGame(72602)
    const character = player(state)
    character.currentRegion = 'mine'
    character.position = { x: 18, y: 5 }
    character.level = 6
    character.stats.strength = 12
    state.settlement.stage = 'village'
    state.threat.threatLevel = 1
    state.worldTime = 12 * 60

    expect(encounterContentMonster(state, 'cave_insect_digger')).toBe('')
    expect(contentCombatPresentation(state)).toMatchObject({ familyId: 'cave_insects', definitionId: 'cave_insect_digger', rankLabel: '普通', cue: null })
    expect(combatTurn(state, 'defend')).toBe('')
    expect(combatTurn(state, 'defend')).toBe('')
    expect(state.combat!.contentEncounter!.turn).toBe(2)
    const guardTelegraph = CONTENT_MONSTERS.cave_insect_digger.mechanics[0]!.telegraph['zh-TW']
    expect(contentCombatPresentation(state)?.cue).toBe(guardTelegraph)
    const diggerGuard = CONTENT_MONSTERS.cave_insect_digger.mechanics[0]!
    expect(diggerGuard.kind).toBe('guard')
    const guardBonus = diggerGuard.kind === 'guard' ? diggerGuard.defenseBonus : 0
    const unguardedDamage = character.stats.strength + character.skills.combat.level - CONTENT_MONSTERS.cave_insect_digger.stats.defense
    const hpBeforeGuardedAttack = state.combat!.hp
    expect(combatTurn(state, 'attack')).toBe('')
    const guardedDamage = hpBeforeGuardedAttack - state.combat!.hp
    expect(guardedDamage).toBeLessThan(unguardedDamage)
    expect(guardedDamage).toBe(unguardedDamage - guardBonus)
    character.stats.strength = 1000
    while (state.combat) expect(combatTurn(state, 'attack')).toBe('')
    expect(state.combat).toBeNull()
    expect(state.reward.materials[character.id]?.cave_insect_chitin).toBe(1)
    expect(CONTENT_MONSTERS.cave_insect_digger.lootTableId).toBe('cave_insect_loot_digger')
    expect(CONTENT_LOOT_TABLES.cave_insect_loot_digger.guaranteedMaterialIds).toEqual(['cave_insect_chitin'])

    const selectedSkitterLoot = awardContentLoot(state, { definitionId: 'cave_insect_skitter' })
    expect(selectedSkitterLoot.materials).toMatchObject({ cave_insect_leg: 1 })
    expect(state.reward.materials[character.id]?.cave_insect_leg).toBe(1)
    expect(CONTENT_MONSTERS.cave_insect_skitter.lootTableId).toBe('cave_insect_loot_skitter')
  })

  it('crafts the chitin spear from the real recipe, equips it, and preserves it across save reload', () => {
    const state = createGame(72603)
    const character = player(state)
    character.level = 6
    character.stats.strength = 1000
    state.threat.threatLevel = 1
    state.settlement.stage = 'village'
    state.settlement.capacity = 60
    state.settlement.buildings.push('blacksmith')
    state.worldTime = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay + 10 * 60
    character.skills.smithing.level = 4
    character.gold = 100
    character.inventory.wood = 3
    character.inventory.iron = 1

    expect(walkTo(state, { x: 18, y: 5 })).toBe(true)
    expect(character.currentRegion).toBe('mine')
    for (let hunt = 0; hunt < 2; hunt++) {
      expect(encounterContentMonster(state, 'cave_insect_digger')).toBe('')
      while (state.combat) expect(combatTurn(state, 'attack')).toBe('')
    }
    expect(state.reward.materials[character.id]?.cave_insect_chitin).toBe(2)
    expect(walkTo(state, { x: 12, y: 8 })).toBe(true)
    expect(character.currentRegion).toBe('village')

    expect(CONTENT_RECIPES.cave_insect_chitin_spear_recipe.inputs).toEqual([
      { source: 'material', materialId: 'cave_insect_chitin', amount: 2 },
      { source: 'inventory', itemId: 'wood', amount: 3 },
      { source: 'inventory', itemId: 'iron', amount: 1 },
    ])
    const result = craft(state, { recipeId: 'cave_insect_chitin_spear_recipe' })
    if (!result.ok) throw new Error(result.message)
    expect(result.baseId).toBe('cave_insect_chitin_spear')
    expect(state.reward.materials[character.id]?.cave_insect_chitin).toBe(0)
    expect(equipInstance(state, result.instanceId)).toBe('')

    const loaded = deserialize(serialize(state, 72604)).state
    expect(loaded.reward.equipped[character.id]?.weapon).toBe(result.instanceId)
    expect(loaded.reward.instances.find(item => item.instanceId === result.instanceId)?.baseId).toBe('cave_insect_chitin_spear')
    expect(loaded.reward.materials[character.id]?.cave_insect_chitin).toBe(0)
  })
})
