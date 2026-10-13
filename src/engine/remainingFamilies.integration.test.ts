import { describe, expect, it } from 'vitest'
import { BUILDINGS, CONFIG } from '../data/config'
import {
  CONTENT_EQUIPMENT, CONTENT_FAMILIES, CONTENT_LOOT_TABLES, CONTENT_MATERIALS, CONTENT_MONSTERS, CONTENT_RECIPES,
} from '../data/contentRegistry'
import { combatTurn } from './actions'
import {
  contentAttackForTurn, contentCombatPhase, contentCombatPresentation, contentDefenseForTurn,
  contentEncounterOptions, encounterContentMonster,
} from './contentFamilies'
import { craft } from './crafting'
import { equipInstance } from './rewardActions'
import { createGame, player } from './simulation'
import { deserialize, serialize } from '../services/saveService'
import type { ContentMonster, ContentSeason, ContentSettlementStage, ContentSpawnPredicate } from '../domain/content'
import type { BuildingId, GameState, RegionId } from '../domain/types'

const contentSeasons: readonly ContentSeason[] = ['春', '夏', '秋', '冬']
const contentStages: readonly ContentSettlementStage[] = ['hamlet', 'village', 'town']

const familyCases = [
  {
    familyId: 'wild_beasts',
    normalIds: ['wild_beast_brush_hare', 'wild_beast_stonehorn', 'wild_beast_redtail', 'wild_beast_fernback', 'wild_beast_marshstag', 'wild_beast_amberfox'],
    eliteIds: ['wild_beast_bristleback', 'wild_beast_galehorn'],
    mechanicId: 'wild_beast_stonehorn',
    recipeId: 'wild_beast_tendon_spear_recipe',
  },
  {
    familyId: 'frontier_goblins',
    normalIds: ['frontier_goblin_scout', 'frontier_goblin_slinger', 'frontier_goblin_tinker', 'frontier_goblin_lookout', 'frontier_goblin_hauler', 'frontier_goblin_trapper'],
    eliteIds: ['frontier_goblin_breaker', 'frontier_goblin_duelist'],
    mechanicId: 'frontier_goblin_tinker',
    recipeId: 'frontier_goblin_scrap_spear_recipe',
  },
  {
    familyId: 'fog_undead',
    normalIds: ['fog_undead_bonewalker', 'fog_undead_lantern_wisp', 'fog_undead_gravehound', 'fog_undead_crypt_guard', 'fog_undead_mourner', 'fog_undead_bellkeeper'],
    eliteIds: ['fog_undead_wight', 'fog_undead_blackguard'],
    mechanicId: 'fog_undead_bonewalker',
    recipeId: 'fog_undead_cryptblade_recipe',
  },
  {
    familyId: 'mine_constructs',
    normalIds: ['mine_construct_shardling', 'mine_construct_sentinel', 'mine_construct_pylon', 'mine_construct_crawler', 'mine_construct_mason', 'mine_construct_veinwatcher'],
    eliteIds: ['mine_construct_ram', 'mine_construct_warder'],
    mechanicId: 'mine_construct_sentinel',
    recipeId: 'mine_construct_shardpike_recipe',
  },
] as const

/** Controlled world-state witnesses prove predicate satisfiability, not natural encounter frequency. */
function controlledEncounterState(state: GameState, familyId: string, definitionId: string): GameState {
  const character = player(state)
  const family = CONTENT_FAMILIES[familyId]!
  const definition = CONTENT_MONSTERS[definitionId]!
  character.hp = character.maxHp
  character.stats.strength = 1000
  character.stamina = 100
  character.exp = 0
  character.status = 'idle'
  state.combat = null
  state.dungeon.inDungeon = false
  state.settlement.stage = 'village'
  const familyProfiles = family.spawnProfiles
  const monsterProfiles = definition.spawnProfiles ?? family.spawnProfiles
  const matches = (profile: ContentSpawnPredicate, region: RegionId, level: number, threat: number,
    season: ContentSeason, hour: number, stage: ContentSettlementStage) => profile.region === region
    && (profile.minPlayerLevel === undefined || level >= profile.minPlayerLevel)
    && (profile.maxPlayerLevel === undefined || level <= profile.maxPlayerLevel)
    && (profile.minThreatLevel === undefined || threat >= profile.minThreatLevel)
    && (profile.maxThreatLevel === undefined || threat <= profile.maxThreatLevel)
    && (!profile.seasons || profile.seasons.includes(season))
    && (!profile.hours || (profile.hours.start <= profile.hours.end
      ? hour >= profile.hours.start && hour < profile.hours.end
      : hour >= profile.hours.start || hour < profile.hours.end))
    && (!profile.settlementStages || profile.settlementStages.includes(stage))
    && (profile.minSafety === undefined || state.settlement.safety >= profile.minSafety)
    && (profile.maxSafety === undefined || state.settlement.safety <= profile.maxSafety)

  for (const familyProfile of familyProfiles) {
    for (const monsterProfile of monsterProfiles) {
      if (familyProfile.region !== monsterProfile.region) continue
      const region = familyProfile.region
      const level = Math.max(familyProfile.minPlayerLevel ?? 1, monsterProfile.minPlayerLevel ?? 1)
      const threat = Math.max(familyProfile.minThreatLevel ?? 1, monsterProfile.minThreatLevel ?? 1)
      const stages = contentStages.filter(stage =>
        (!familyProfile.settlementStages || familyProfile.settlementStages.includes(stage))
        && (!monsterProfile.settlementStages || monsterProfile.settlementStages.includes(stage)))
      const allowedSeasons = contentSeasons.filter(season =>
        (!familyProfile.seasons || familyProfile.seasons.includes(season))
        && (!monsterProfile.seasons || monsterProfile.seasons.includes(season)))
      const hours = Array.from({ length: 24 }, (_, hour) => hour).filter(hour =>
        (!familyProfile.hours || (familyProfile.hours.start <= familyProfile.hours.end
          ? hour >= familyProfile.hours.start && hour < familyProfile.hours.end
          : hour >= familyProfile.hours.start || hour < familyProfile.hours.end))
        && (!monsterProfile.hours || (monsterProfile.hours.start <= monsterProfile.hours.end
          ? hour >= monsterProfile.hours.start && hour < monsterProfile.hours.end
          : hour >= monsterProfile.hours.start || hour < monsterProfile.hours.end)))
      if (level > Math.min(familyProfile.maxPlayerLevel ?? Number.MAX_SAFE_INTEGER, monsterProfile.maxPlayerLevel ?? Number.MAX_SAFE_INTEGER)
        || threat > Math.min(familyProfile.maxThreatLevel ?? 3, monsterProfile.maxThreatLevel ?? 3)
        || !stages.length || !allowedSeasons.length || !hours.length) continue
      const firstDay = Math.floor(state.worldTime / CONFIG.minutesPerDay)
      const earliestEncounterTime = state.worldTime
      for (let dayOffset = 0; dayOffset < CONFIG.daysPerSeason * CONFIG.seasons.length * 2; dayOffset++) {
        const day = firstDay + dayOffset
        const seasonIndex = Math.floor(day / CONFIG.daysPerSeason) % contentSeasons.length
        const season = contentSeasons[seasonIndex]!
        if (!allowedSeasons.includes(season)) continue
        for (const hour of hours) {
          const encounterTime = day * CONFIG.minutesPerDay + hour * 60
          if (encounterTime < earliestEncounterTime) continue
          character.currentRegion = region
          character.level = level
          state.threat.threatLevel = threat
          state.settlement.stage = stages[0]!
          state.worldTime = encounterTime
          state.regions[region]!.discovered = true
          if (matches(familyProfile, region, level, threat, season, hour, state.settlement.stage)
            && matches(monsterProfile, region, level, threat, season, hour, state.settlement.stage)
            && contentEncounterOptions(state, familyId).find(option => option.definitionId === definitionId)?.eligible) return state
        }
      }
    }
  }

  throw new Error(`No controlled witness satisfies ${definition.id} in ${family.id}`)
}

function assertCanonicalMechanic(state: GameState, definition: ContentMonster) {
  const encounter = state.combat?.contentEncounter
  expect(encounter?.definitionId).toBe(definition.id)
  const mechanic = definition.mechanics[0]!
  const dueEncounter = { ...encounter!, turn: mechanic.everyTurns - 1 }
  const phase = contentCombatPhase(dueEncounter)
  expect(phase.dueMechanics.map(entry => entry.kind)).toContain(mechanic.kind)
  expect(phase.dueMechanics.map(entry => entry.telegraph['zh-TW']).join(' ')).toContain(mechanic.telegraph['zh-TW'])
  if (mechanic.kind === 'guard') {
    expect(contentDefenseForTurn(10, phase)).toBe(10 + mechanic.defenseBonus)
  } else {
    expect(contentAttackForTurn(10, false, phase)).toBe(Math.ceil(10 * (1 + mechanic.bonusFraction)))
  }
}

function guaranteedSource(familyId: string, materialId: string): ContentMonster {
  const family = CONTENT_FAMILIES[familyId]!
  const sourceId = [...family.monsterIds, ...family.eliteIds].find(id =>
    CONTENT_LOOT_TABLES[CONTENT_MONSTERS[id]!.lootTableId]?.guaranteedMaterialIds.includes(materialId))
  if (!sourceId) throw new Error(`${materialId} has no guaranteed normal/Elite loot source in ${familyId}`)
  return CONTENT_MONSTERS[sourceId]!
}

function defeatForGuaranteedLoot(state: GameState, familyId: string, definitionId: string) {
  const character = player(state)
  const materialIds = CONTENT_LOOT_TABLES[CONTENT_MONSTERS[definitionId]!.lootTableId]!.guaranteedMaterialIds
  const before = { ...(state.reward.materials[character.id] ?? {}) }
  controlledEncounterState(state, familyId, definitionId)
  expect(contentEncounterOptions(state, familyId).find(option => option.definitionId === definitionId))
    .toMatchObject({ eligible: true, reason: null })
  expect(encounterContentMonster(state, definitionId)).toBe('')
  expect(contentCombatPresentation(state)?.definitionId).toBe(definitionId)
  expect(combatTurn(state, 'attack')).toBe('')
  expect(state.combat).toBeNull()
  for (const materialId of materialIds) {
    expect(state.reward.materials[character.id]?.[materialId] ?? 0)
      .toBe((before[materialId] ?? 0) + 1)
  }
}

function craftAndReloadFromSourcedLoot(state: GameState, recipeId: string) {
  const recipe = CONTENT_RECIPES[recipeId]!
  const character = player(state)
  const craftTime = Math.floor(state.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay + 10 * 60
  state.worldTime = craftTime < state.worldTime ? craftTime + CONFIG.minutesPerDay : craftTime
  character.currentRegion = 'village'
  character.position = { ...BUILDINGS.blacksmith.position }
  character.inventory.wood = 20
  character.inventory.iron = 20
  character.gold = 500
  character.stamina = 100
  character.skills.smithing.level = recipe.requiredSmithing
  const buildings = new Set<BuildingId>(state.settlement.buildings)
  buildings.add('blacksmith')
  state.settlement.buildings = [...buildings]
  const materialsBeforeCraft = { ...(state.reward.materials[character.id] ?? {}) }
  const result = craft(state, { recipeId })
  if (!result.ok) throw new Error(result.message)
  expect(result.baseId).toBe(recipe.outputBase)
  expect(equipInstance(state, result.instanceId)).toBe('')

  const loaded = deserialize(serialize(state, 72830)).state
  expect(loaded.reward.equipped[character.id]?.[recipe.category]).toBe(result.instanceId)
  expect(loaded.reward.instances.find(item => item.instanceId === result.instanceId)?.baseId).toBe(recipe.outputBase)
  for (const input of recipe.inputs.filter(candidate => candidate.source === 'material')) {
    expect(loaded.reward.materials[character.id]?.[input.materialId])
      .toBe((materialsBeforeCraft[input.materialId] ?? 0) - input.amount)
  }
}

const correctedBridgeRecipes = [
  { familyId: 'wild_beasts', recipeId: 'wild_beast_horn_knife_recipe' },
  { familyId: 'frontier_goblins', recipeId: 'frontier_goblin_wire_knife_recipe' },
  { familyId: 'frontier_goblins', recipeId: 'frontier_goblin_signal_coat_recipe' },
] as const

describe('remaining D family runtime integration', () => {
  it.each(familyCases)('$familyId registers six normal and two Elite encounters', ({ familyId, normalIds, eliteIds }) => {
    expect(CONTENT_FAMILIES[familyId]).toBeDefined()
    const options = contentEncounterOptions(createGame(72800), familyId)
    expect(options).toHaveLength(8)
    expect(options.filter(option => option.rank === 'normal').map(option => option.definitionId).sort())
      .toEqual([...normalIds].sort())
    expect(options.filter(option => option.rank === 'elite').map(option => option.definitionId).sort())
      .toEqual([...eliteIds].sort())
    for (const id of [...normalIds, ...eliteIds]) {
      expect(CONTENT_MONSTERS[id]).toMatchObject({ familyId, lootTableId: expect.stringContaining(familyId.split('_')[0]!) })
      expect(CONTENT_LOOT_TABLES[CONTENT_MONSTERS[id]!.lootTableId]).toBeDefined()
      expect(CONTENT_MONSTERS[id]!.mechanics.length).toBeGreaterThan(0)
    }
  })

  it.each(familyCases)('$familyId completes a controlled encounter, sourced loot, planned craft, equipment and save reload', ({ familyId, mechanicId, recipeId }) => {
    const recipe = CONTENT_RECIPES[recipeId]!
    expect(recipe).toBeDefined()
    const state = controlledEncounterState(createGame(72810), familyId, mechanicId)
    const character = player(state)
    const definition = CONTENT_MONSTERS[mechanicId]!
    expect(contentEncounterOptions(state, familyId).find(option => option.definitionId === mechanicId))
      .toMatchObject({ eligible: true, reason: null })
    expect(encounterContentMonster(state, mechanicId)).toBe('')
    assertCanonicalMechanic(state, definition)
    while (state.combat) expect(combatTurn(state, 'attack')).toBe('')
    const requiredMaterialInputs = recipe.inputs.filter(input => input.source === 'material')
    for (const input of requiredMaterialInputs) {
      const source = guaranteedSource(familyId, input.materialId)
      for (let amount = 0; amount < input.amount; amount++) {
        defeatForGuaranteedLoot(state, familyId, source.id)
      }
    }
    expect(Object.keys(state.reward.materials[character.id] ?? {}).some(id => id.startsWith(familyId.split('_')[0]!))).toBe(true)

    craftAndReloadFromSourcedLoot(state, recipeId)
  })

  it.each(correctedBridgeRecipes)('$recipeId crafts from actual selected loot and survives equip/save reload', ({ familyId, recipeId }) => {
    const state = createGame(72840)
    for (const input of CONTENT_RECIPES[recipeId]!.inputs.filter(candidate => candidate.source === 'material')) {
      const source = guaranteedSource(familyId, input.materialId)
      for (let amount = 0; amount < input.amount; amount++) {
        defeatForGuaranteedLoot(state, familyId, source.id)
      }
    }
    craftAndReloadFromSourcedLoot(state, recipeId)
  })

  it('keeps Wild and Frontier bias materials compatible with their recipe outputs and exposes planned gear in selected loot', () => {
    const wildRecipeIds = ['wild_beast_tendon_spear_recipe', 'wild_beast_horn_knife_recipe', 'wild_beast_hide_coat_recipe']
    const goblinRecipeIds = ['frontier_goblin_scrap_spear_recipe', 'frontier_goblin_plate_vest_recipe',
      'frontier_goblin_wire_knife_recipe', 'frontier_goblin_signal_coat_recipe']
    for (const recipeId of [...wildRecipeIds, ...goblinRecipeIds]) {
      const recipe = CONTENT_RECIPES[recipeId]!
      const equipment = CONTENT_EQUIPMENT[recipe.outputBase]!
      expect(recipe.allowedBiasMaterials.length).toBeGreaterThan(0)
      for (const materialId of recipe.allowedBiasMaterials) {
        const biasAffixes = Object.keys(CONTENT_MATERIALS[materialId]!.bias)
        expect(biasAffixes.some(affixId => equipment.affixIds.includes(affixId))).toBe(true)
      }
    }
    expect(CONTENT_LOOT_TABLES.wild_beasts_loot_stonehorn.weightedEquipment.map(drop => drop.equipmentId))
      .toContain('wild_beast_horn_knife')
    expect(CONTENT_LOOT_TABLES.frontier_goblins_loot_slinger.weightedEquipment.map(drop => drop.equipmentId))
      .toContain('frontier_goblin_wire_knife')
    expect(CONTENT_LOOT_TABLES.frontier_goblins_loot_lookout.weightedEquipment.map(drop => drop.equipmentId))
      .toContain('frontier_goblin_signal_coat')
    expect(CONTENT_MONSTERS.wild_beast_redtail.description['zh-TW']).not.toContain('繞到獵物側面')
    for (const [tableId, commonMaterial, chance] of [
      ['wild_beasts_loot_bristleback', 'wild_beast_fur', 0.12],
      ['wild_beasts_loot_galehorn', 'wild_beast_antler', 0.16],
      ['frontier_goblins_loot_breaker', 'frontier_goblin_ironbits', 0.12],
      ['frontier_goblins_loot_duelist', 'frontier_goblin_wire', 0.16],
    ] as const) {
      expect(CONTENT_LOOT_TABLES[tableId].guaranteedMaterialIds).toEqual([commonMaterial])
      expect(CONTENT_LOOT_TABLES[tableId].rareMaterials).toContainEqual({
        materialId: tableId.startsWith('wild_') ? 'wild_beast_amber_sinew' : 'frontier_goblin_forgecore', chance,
      })
    }
  })

  it('keeps the Fog Bellkeeper available by the approved town OR threat-three night routes', () => {
    const state = createGame(72860)
    const character = player(state)
    character.currentRegion = 'unknown'
    character.level = 6
    state.regions.unknown!.discovered = true
    state.worldTime = 20 * 60
    state.threat.threatLevel = 2
    state.settlement.stage = 'hamlet'
    expect(contentEncounterOptions(state, 'fog_undead').find(option => option.definitionId === 'fog_undead_bellkeeper')?.eligible).toBe(false)
    state.settlement.stage = 'town'
    expect(contentEncounterOptions(state, 'fog_undead').find(option => option.definitionId === 'fog_undead_bellkeeper')?.eligible).toBe(true)
    state.settlement.stage = 'hamlet'
    state.threat.threatLevel = 3
    expect(contentEncounterOptions(state, 'fog_undead').find(option => option.definitionId === 'fog_undead_bellkeeper')?.eligible).toBe(true)
  })
})
