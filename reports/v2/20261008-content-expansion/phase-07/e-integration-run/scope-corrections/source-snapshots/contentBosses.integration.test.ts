import { describe, expect, it } from 'vitest'
import { BUILDINGS, CONFIG } from '../data/config'
import {
  CONTENT_EQUIPMENT, CONTENT_FAMILIES, CONTENT_LOOT_TABLES, CONTENT_MATERIALS, CONTENT_MONSTERS, CONTENT_RECIPES,
} from '../data/contentRegistry'
import type { ContentSeason, ContentSpawnPredicate } from '../domain/content'
import type { GameState, RegionId } from '../domain/types'
import { combatTurn } from './actions'
import { craft } from './crafting'
import {
  contentCombatPhase, contentCombatPresentation, contentEncounterOptions, encounterContentMonster,
} from './contentFamilies'
import { createGame, player, simulate } from './simulation'
import { deserialize, serialize } from '../services/saveService'

const bossIds = [
  'slime_heart', 'cave_insect_queen', 'wild_beast_apex', 'frontier_goblin_warlord',
  'fog_undead_cryptlord', 'mine_construct_heart',
] as const

const seasons: readonly ContentSeason[] = ['春', '夏', '秋', '冬']
const stages = ['hamlet', 'village', 'town'] as const

/** A controlled witness proves predicate reachability; it says nothing about natural spawn frequency. */
function setWitness(state: GameState, definitionId: string, maxThreat = 3) {
  const definition = CONTENT_MONSTERS[definitionId]!
  const family = CONTENT_FAMILIES[definition.familyId]!
  const character = player(state)
  const monsterProfiles = definition.spawnProfiles ?? family.spawnProfiles
  for (const familyProfile of family.spawnProfiles) {
    for (const monsterProfile of monsterProfiles) {
      if (familyProfile.region !== monsterProfile.region) continue
      const level = Math.max(familyProfile.minPlayerLevel ?? 1, monsterProfile.minPlayerLevel ?? 1)
      const threat = Math.max(familyProfile.minThreatLevel ?? 1, monsterProfile.minThreatLevel ?? 1)
      if (threat > maxThreat || threat > Math.min(familyProfile.maxThreatLevel ?? 3, monsterProfile.maxThreatLevel ?? 3)) continue
      if (level > Math.min(familyProfile.maxPlayerLevel ?? 99, monsterProfile.maxPlayerLevel ?? 99)) continue
      const minSafety = Math.max(familyProfile.minSafety ?? 0, monsterProfile.minSafety ?? 0)
      const maxSafety = Math.min(familyProfile.maxSafety ?? 100, monsterProfile.maxSafety ?? 100)
      if (minSafety > maxSafety) continue
      const safety = Math.max(minSafety, Math.min(state.settlement.safety, maxSafety))
      const allowedSeasons = seasons.filter(season =>
        (!familyProfile.seasons || familyProfile.seasons.includes(season))
        && (!monsterProfile.seasons || monsterProfile.seasons.includes(season)))
      const allowedHours = Array.from({ length: 24 }, (_, hour) => hour).filter(hour => hourAllowed(hour, familyProfile.hours)
        && hourAllowed(hour, monsterProfile.hours))
      const allowedStages = stages.filter(stage =>
        (!familyProfile.settlementStages || familyProfile.settlementStages.includes(stage))
        && (!monsterProfile.settlementStages || monsterProfile.settlementStages.includes(stage)))
      if (!allowedSeasons.length || !allowedHours.length || !allowedStages.length) continue
      const season = allowedSeasons[0]!
      const seasonIndex = seasons.indexOf(season)
      const day = seasonIndex * CONFIG.daysPerSeason
      const hour = allowedHours[0]!
      character.currentRegion = familyProfile.region as RegionId
      character.level = level
      character.hp = character.maxHp
      character.stamina = 100
      character.stats.strength = 1000
      character.status = 'idle'
      state.combat = null
      state.dungeon.inDungeon = false
      state.settlement.stage = allowedStages[0]!
      state.threat.threatLevel = threat
      state.settlement.safety = safety
      state.worldTime = day * CONFIG.minutesPerDay + hour * 60
      state.regions[character.currentRegion]!.discovered = true
      const option = contentEncounterOptions(state, definition.familyId).find(candidate => candidate.definitionId === definitionId)
      if (option?.eligible) return state
    }
  }
  throw new Error(`No controlled eligibility witness for ${definitionId} at threat <= ${maxThreat}`)
}

function hourAllowed(hour: number, hours?: ContentSpawnPredicate['hours']) {
  if (!hours) return true
  return hours.start <= hours.end ? hour >= hours.start && hour < hours.end : hour >= hours.start || hour < hours.end
}

function advanceTo(state: GameState, time: number) {
  simulate(state, time - state.worldTime)
}

function gcd(left: number, right: number): number {
  return right === 0 ? left : gcd(right, left % right)
}

function lcm(values: readonly number[]) {
  return values.reduce((result, value) => result * value / gcd(result, value), 1)
}

describe('content boss public integration', () => {
  it.each(bossIds)('%s supports alternate low threat access, frozen form reload, sourced victory loot, bounded settlement effect and canonical cooldown', id => {
    const definition = CONTENT_MONSTERS[id]!
    const family = CONTENT_FAMILIES[definition.familyId]!
    const rules = definition.bossRules!
    expect(definition.rank).toBe('boss')
    expect(rules).toBeDefined()
    expect(rules.variants).toHaveLength(3)
    expect(rules.guaranteedMaterialIds).toHaveLength(1)
    expect(CONTENT_LOOT_TABLES[definition.lootTableId]).toBeDefined()

    const alternate = setWitness(createGame(81000), id, 2)
    expect(alternate.threat.threatLevel).toBeLessThan(3)
    const beforeQuery = structuredClone(alternate)
    expect(family.regions).toContain(player(alternate).currentRegion)
    expect(contentEncounterOptions(alternate, definition.familyId).find(option => option.definitionId === id))
      .toMatchObject({ eligible: true, reason: null, region: player(alternate).currentRegion })
    expect(alternate).toEqual(beforeQuery)
    alternate.reward.bossForms[id] = { kind: 'cooldownUntil', availableAt: alternate.worldTime + CONFIG.minutesPerDay }
    const beforeDenied = structuredClone(alternate)
    const deniedRng = alternate.rngState
    expect(encounterContentMonster(alternate, id)).toBeTruthy()
    expect(alternate.rngState).toBe(deniedRng)
    expect(alternate).toEqual(beforeDenied)

    const escaped = setWitness(createGame(81001), id, 2)
    expect(encounterContentMonster(escaped, id)).toBe('')
    const formed = structuredClone(escaped.combat!.contentEncounter!)
    expect(formed.definitionId).toBe(id)
    expect(rules.variants.map(variant => variant.id)).toContain(formed.variantId)
    const chosenVariant = rules.variants.find(variant => variant.id === formed.variantId)!
    const coreAndVariantMechanics = [...definition.mechanics, ...chosenVariant.mechanics]
    escaped.combat!.contentEncounter!.turn = lcm(coreAndVariantMechanics.map(mechanic => mechanic.everyTurns)) - 1
    const presentation = contentCombatPresentation(escaped)!
    expect(presentation).toMatchObject({ definitionId: id, variant: { id: formed.variantId } })
    const phase = contentCombatPhase(escaped.combat!.contentEncounter!)
    const presentedCue = phase.dueMechanics.map(mechanic => mechanic.telegraph['zh-TW']).join(' ')
    for (const mechanic of coreAndVariantMechanics) expect(presentedCue).toContain(mechanic.telegraph['zh-TW'])
    const rngAtFormation = escaped.rngState
    escaped.combat!.contentEncounter!.turn = 0
    expect(combatTurn(escaped, 'run')).toBe('')
    const savedFlee = deserialize(serialize(escaped, 81002)).state
    expect(savedFlee.reward.bossForms[id]).toMatchObject({ kind: 'frozenEncounter', encounter: { definitionId: id, variantId: formed.variantId } })
    const rngAfterLoad = savedFlee.rngState
    expect(encounterContentMonster(savedFlee, id)).toBe('')
    expect(savedFlee.combat!.contentEncounter!.variantId).toBe(formed.variantId)
    expect(savedFlee.rngState).toBe(rngAfterLoad)
    expect(rngAfterLoad).toBe(rngAtFormation)

    const defeated = setWitness(createGame(81003), id, 2)
    const consequence = rules.worldConsequence
    const settlementBefore = structuredClone(defeated.settlement)
    const threatBefore = structuredClone(defeated.threat)
    const crisisBefore = structuredClone(defeated.regionalCrisis)
    const instancesBefore = defeated.reward.instances.map(instance => instance.instanceId)
    const lootTable = CONTENT_LOOT_TABLES[definition.lootTableId]!
    expect(encounterContentMonster(defeated, id)).toBe('')
    defeated.combat!.hp = 1
    expect(combatTurn(defeated, 'attack')).toBe('')
    expect(defeated.combat).toBeNull()
    const characterId = defeated.activeCharacterId
    for (const materialId of rules.guaranteedMaterialIds) {
      expect(defeated.reward.materials[characterId]?.[materialId]).toBe(1)
      expect(lootTable.guaranteedMaterialIds).toContain(materialId)
    }
    const actualDrop = defeated.reward.instances.find(instance => !instancesBefore.includes(instance.instanceId))
    expect(actualDrop?.baseId).toBe(rules.exclusiveEquipmentId)
    expect(defeated.settlement[consequence.field]).toBe(Math.max(0, Math.min(100,
      settlementBefore[consequence.field] + consequence.delta)))
    for (const field of ['food', 'safety', 'prosperity'] as const) {
      if (field !== consequence.field) expect(defeated.settlement[field]).toBe(settlementBefore[field])
    }
    expect(defeated.threat).toEqual(threatBefore)
    expect(defeated.regionalCrisis).toEqual(crisisBefore)
    expect(defeated.reward.bossForms[id]).toMatchObject({ kind: 'cooldownUntil' })
    const availableAt = defeated.reward.bossForms[id]!.kind === 'cooldownUntil'
      ? defeated.reward.bossForms[id]!.availableAt : 0
    const deniedAfterDefeat = structuredClone(defeated)
    const postDefeatRng = defeated.rngState
    expect(encounterContentMonster(defeated, id)).toBeTruthy()
    expect(defeated.rngState).toBe(postDefeatRng)
    expect(defeated.reward.bossForms).toEqual(deniedAfterDefeat.reward.bossForms)
    const savedCooldown = deserialize(serialize(defeated, 81004)).state
    expect(savedCooldown.reward.bossForms[id]).toMatchObject({ kind: 'cooldownUntil', availableAt })
    expect(contentEncounterOptions(savedCooldown, definition.familyId).find(option => option.definitionId === id)?.eligible).toBe(false)
    advanceTo(savedCooldown, availableAt)
    expect(savedCooldown.worldTime).toBe(availableAt)
    for (let day = 0; day < CONFIG.daysPerSeason * CONFIG.seasons.length; day++) {
      if (contentEncounterOptions(savedCooldown, definition.familyId).find(option => option.definitionId === id)?.eligible) break
      simulate(savedCooldown, CONFIG.minutesPerDay)
    }
    expect(contentEncounterOptions(savedCooldown, definition.familyId).find(option => option.definitionId === id))
      .toMatchObject({ eligible: true, reason: null })
  })

  it.each(['cave_insects', 'wild_beasts', 'frontier_goblins', 'fog_undead', 'mine_constructs'] as const)(
    '%s exposes two reachable Mini Bosses as non-boss encounters', familyId => {
      const family = CONTENT_FAMILIES[familyId]!
      expect(family.miniBossIds).toHaveLength(2)
      for (const id of family.miniBossIds) {
        const definition = CONTENT_MONSTERS[id]!
        expect(definition.rank).toBe('miniBoss')
        expect(definition.bossRules).toBeUndefined()
        const state = setWitness(createGame(81100), id)
        expect(contentEncounterOptions(state, familyId).find(option => option.definitionId === id))
          .toMatchObject({ eligible: true, reason: null })
      }
    },
  )

  it('keeps each boss-only material optional for a positive slot-compatible recipe bias and consumes Apex core from actual loot', () => {
    for (const id of bossIds) {
      const definition = CONTENT_MONSTERS[id]!
      const materialId = definition.bossRules!.guaranteedMaterialIds[0]!
      const material = CONTENT_MATERIALS[materialId]!
      const consumers = Object.values(CONTENT_RECIPES).filter(recipe => recipe.allowedBiasMaterials.includes(materialId))
      expect(consumers.length, `${materialId} needs an optional recipe bias consumer`).toBeGreaterThan(0)
      expect(consumers.some(recipe => {
        const equipment = CONTENT_EQUIPMENT[recipe.outputBase]!
        return Object.entries(material.bias).some(([affixId, amount]) => amount > 0 && equipment.affixIds.includes(affixId))
      }), `${materialId} needs a positive bias supported by a recipe output slot`).toBe(true)
    }

    const state = setWitness(createGame(81200), 'wild_beast_apex', 2)
    expect(encounterContentMonster(state, 'wild_beast_apex')).toBe('')
    state.combat!.hp = 1
    expect(combatTurn(state, 'attack')).toBe('')
    const character = player(state)
    const characterId = character.id
    expect(state.reward.materials[characterId]?.wild_beast_apex_core).toBe(1)

    character.level = 4
    character.stats.strength = 1000
    character.stamina = 100
    state.threat.threatLevel = 2
    for (let hunt = 0; hunt < 2; hunt++) {
      expect(contentEncounterOptions(state, 'wild_beasts').find(option => option.definitionId === 'wild_beast_stonehorn'))
        .toMatchObject({ eligible: true, reason: null })
      expect(encounterContentMonster(state, 'wild_beast_stonehorn')).toBe('')
      expect(combatTurn(state, 'attack')).toBe('')
    }
    expect(state.reward.materials[characterId]?.wild_beast_horn).toBe(2)

    character.currentRegion = 'village'
    character.position = { ...BUILDINGS.blacksmith.position }
    character.skills.smithing.level = 3
    character.gold = 500
    character.stamina = 100
    character.inventory.wood = 2
    character.inventory.iron = 1
    if (!state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith')
    const nextOpenDay = Math.floor(state.worldTime / CONFIG.minutesPerDay) + (state.worldTime % CONFIG.minutesPerDay >= 10 * 60 ? 1 : 0)
    const blacksmithOpen = nextOpenDay * CONFIG.minutesPerDay + 10 * 60
    simulate(state, blacksmithOpen - state.worldTime)

    const result = craft(state, { recipeId: 'wild_beast_horn_knife_recipe', influenceMaterial: 'wild_beast_apex_core' })
    if (!result.ok) throw new Error(result.message)
    expect(result.baseId).toBe('wild_beast_horn_knife')
    expect(state.reward.instances.find(item => item.instanceId === result.instanceId)?.craftProvenance?.influenceMaterial)
      .toBe('wild_beast_apex_core')
    expect(state.reward.materials[characterId]?.wild_beast_apex_core).toBe(0)
  })
})
