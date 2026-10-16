import { describe, expect, it } from 'vitest'
import { CRAFTING_RECIPES } from '../data/crafting'
import { CONTENT_CROPS, CONTENT_CROP_GOODS, CONTENT_FAMILIES, CONTENT_LOOT_TABLES, CONTENT_MATERIALS, CONTENT_MONSTERS, CONTENT_RECIPES } from '../data/contentRegistry'
import { LOOT_TABLES, MATERIALS, WOLF_MONSTERS } from '../data/rewards'
import type { ContentSeason, ContentSettlementStage, ContentSpawnPredicate } from '../domain/content'
import type { BuildingId, GameState, RegionId } from '../domain/types'
import { contentEncounterOptions } from './contentFamilies'
import { farmCropChoices } from './crops'
import { planCraft } from './crafting'
import { createGame, player } from './simulation'
import { wolfEncounterOptions } from './wolfFamily'
import { gather } from './actions'
import { projectGoalHints } from '../presentation/goalHints'
import { BUILDINGS, CONFIG, DUNGEON, JOBS } from '../data/config'
import { LIVING_EVENT_LIMITS } from '../data/livingEvents'

const seasons: readonly ContentSeason[] = ['春', '夏', '秋', '冬']
const stages: readonly ContentSettlementStage[] = ['hamlet', 'village', 'town']
const gatherable = new Set(['wood', 'stone', 'iron'])

function profileAllows(profile: ContentSpawnPredicate, season: ContentSeason, stage: ContentSettlementStage) {
  return (!profile.seasons || profile.seasons.includes(season))
    && (!profile.settlementStages || profile.settlementStages.includes(stage))
    && (profile.minPlayerLevel ?? 1) <= (profile.maxPlayerLevel ?? 100)
    && (profile.minThreatLevel ?? 1) <= (profile.maxThreatLevel ?? 3)
    && (profile.minSafety ?? 0) <= (profile.maxSafety ?? 100)
}

function sourceExists(materialId: string) {
  if (gatherable.has(materialId)) return true
  if (!MATERIALS[materialId]) return false
  const contentDropSource = Object.values(CONTENT_MONSTERS).some(monster => {
    const table = CONTENT_LOOT_TABLES[monster.lootTableId]
    const dropsMaterial = table?.guaranteedMaterialIds.includes(materialId)
      || table?.rareMaterials.some(drop => drop.materialId === materialId && drop.chance > 0)
    return !!dropsMaterial && encounterWitness(monster.id, 0xc110 + monster.id.length) !== null
  })
  if (contentDropSource) return true
  const wolfDropSource = Object.values(WOLF_MONSTERS).some(monster => {
    const table = LOOT_TABLES[monster.lootTable]
    const dropsMaterial = table.guaranteed.includes(materialId)
      || (table.rare.materialId === materialId && table.rare.chance > 0)
      || (monster.rank === 'boss' && table.bossGuaranteed === materialId)
    return dropsMaterial && wolfEncounterOptionsForRank(monster.id)
  })
  if (wolfDropSource) return true
  const good = CONTENT_CROP_GOODS[materialId]
  if (!good) return false
  const crop = CONTENT_CROPS[good.sourceCropId]
  if (!crop || !crop.regions.includes('farmland') || !crop.seasons.length || crop.growthMinutes <= 0) return false
  return crop.seasons.some((season, index) => {
    const state = createGame(0xc120 + index)
    player(state).currentRegion = 'farmland'
    state.regions.farmland.discovered = true
    state.worldTime = index * CONFIG.daysPerSeason * CONFIG.minutesPerDay + 12 * 60
    return farmCropChoices(state).some(choice => choice.id === crop.id && choice.status === 'available')
  })
}

function wolfEncounterOptionsForRank(definitionId: string) {
  const index = Object.keys(WOLF_MONSTERS).indexOf(definitionId)
  const state = createGame(0xc130 + index)
  const actor = player(state)
  actor.currentRegion = 'forest'
  state.regions.forest.discovered = true
  state.threat.monsterPopulation = 100
  actor.stamina = actor.maxStamina
  state.reward.collection.defeated = Object.keys(WOLF_MONSTERS).slice(0, index)
  return wolfEncounterOptions(state).some(option => option.definitionId === definitionId && option.eligible)
}

function canonicalHintDestination(state: GameState, hint: ReturnType<typeof projectGoalHints>[number]) {
  const forest = { where: '北方森林', position: JOBS.woodcutter.workplace }
  const farmland = { where: '東方農田', position: BUILDINGS.farm.position }
  const village = { where: '橡谷廣場', position: LIVING_EVENT_LIMITS.deliverySquare }
  if (hint.id.startsWith('request:')) {
    const request = state.life.requests.find(item => `request:${item.id}` === hint.id)
    if (request?.kind === 'medicine') {
      const npc = state.npcs.find(candidate => candidate.id === request.npcId && candidate.isAlive)
      return npc ? { where: `前往${npc.name}身邊`, position: npc.position } : null
    }
    if (request?.kind === 'hunt' && request.progress < request.amount) return forest
    return request ? village : null
  }
  if (hint.id.startsWith('crisis:')) return forest
  if (hint.id.startsWith('crop:')) {
    const cropId = hint.id.slice('crop:'.length)
    return state.characters.find(candidate => candidate.id === state.activeCharacterId)?.currentRegion === 'farmland'
      && farmCropChoices(state).some(choice => choice.id === cropId && choice.status === 'available') ? farmland : null
  }
  if (hint.id.startsWith('encounter:')) {
    const option = contentEncounterOptions(state).find(candidate => `encounter:${candidate.definitionId}` === hint.id && candidate.eligible)
    const region = state.characters.find(candidate => candidate.id === state.activeCharacterId)?.currentRegion
    if (!option || !region) return null
    if (region === 'farmland') return farmland
    if (region === 'forest') return forest
    if (region === 'village') return village
    return region === 'mine' ? { where: '灰石礦場', position: JOBS.miner.workplace } : { where: DUNGEON.name, position: DUNGEON.position }
  }
  if (hint.id.startsWith('wolf:')) return wolfEncounterOptions(state).some(option => `wolf:${option.definitionId}` === hint.id && option.eligible)
    ? forest : null
  if (hint.id === 'boss:goblin-chief') return state.threat.bossAlive
    && state.characters.find(candidate => candidate.id === state.activeCharacterId)?.currentRegion === 'forest' ? forest : null
  return null
}

function hasCanonicalHintDestination(state: GameState, hint: ReturnType<typeof projectGoalHints>[number]) {
  const expected = canonicalHintDestination(state, hint)
  return expected !== null && hint.where === expected.where
    && hint.position.x === expected.position.x && hint.position.y === expected.position.y
}

function encounterWitness(definitionId: string, seed: number) {
  const monster = CONTENT_MONSTERS[definitionId]!
  const family = CONTENT_FAMILIES[monster.familyId]!
  const profiles = [family.spawnProfiles, monster.spawnProfiles ?? family.spawnProfiles]
  const state = createGame(seed)
  for (const familyProfile of profiles[0]!) for (const monsterProfile of profiles[1]!) {
    if (familyProfile.region !== monsterProfile.region || !family.regions.includes(familyProfile.region)) continue
    const region = familyProfile.region
    for (const season of seasons) for (const stage of stages) {
      if (!profileAllows(familyProfile, season, stage) || !profileAllows(monsterProfile, season, stage)) continue
      const minLevel = Math.max(1, familyProfile.minPlayerLevel ?? 1, monsterProfile.minPlayerLevel ?? 1)
      const maxLevel = Math.min(100, familyProfile.maxPlayerLevel ?? 100, monsterProfile.maxPlayerLevel ?? 100)
      const minThreat = Math.max(1, familyProfile.minThreatLevel ?? 1, monsterProfile.minThreatLevel ?? 1)
      const maxThreat = Math.min(3, familyProfile.maxThreatLevel ?? 3, monsterProfile.maxThreatLevel ?? 3)
      const minSafety = Math.max(0, familyProfile.minSafety ?? 0, monsterProfile.minSafety ?? 0)
      const maxSafety = Math.min(100, familyProfile.maxSafety ?? 100, monsterProfile.maxSafety ?? 100)
      if (minLevel > maxLevel || minThreat > maxThreat || minSafety > maxSafety) continue
      for (let hour = 0; hour < 24; hour++) {
        const hoursAllow = (profile: ContentSpawnPredicate) => !profile.hours || (profile.hours.start <= profile.hours.end
          ? hour >= profile.hours.start && hour < profile.hours.end
          : hour >= profile.hours.start || hour < profile.hours.end)
        if (!hoursAllow(familyProfile) || !hoursAllow(monsterProfile)) continue
        const actor = player(state)
        actor.currentRegion = region
        actor.level = minLevel
        actor.stamina = actor.maxStamina
        actor.hp = actor.maxHp
        actor.status = 'idle'
        state.worldTime = seasons.indexOf(season) * CONFIG.daysPerSeason * CONFIG.minutesPerDay + hour * 60
        state.settlement.stage = stage
        state.settlement.safety = minSafety
        state.threat.threatLevel = minThreat
        state.regions[region].discovered = true
        const option = contentEncounterOptions(state, monster.familyId).find(candidate => candidate.definitionId === definitionId)
        if (option?.eligible) return { state, region, season, option }
      }
    }
  }
  return null
}

describe('Phase10 goal continuity closure', () => {
  it('gives every recipe input material a registered legal source', () => {
    const missing = Object.values(CRAFTING_RECIPES).flatMap(recipe => recipe.inputs.map(input => input.source === 'inventory' ? input.itemId : input.materialId)
      .filter(itemId => !sourceExists(itemId)).map(itemId => `${recipe.id}:${itemId}`))
    expect(missing).toEqual([])
    for (const [seed, kind, region] of [[0xc107, 'wood', 'forest'], [0xc108, 'stone', 'mine'], [0xc109, 'iron', 'mine']] as const) {
      const state = createGame(seed)
      player(state).currentRegion = region
      const before = player(state).inventory[kind]
      expect(gather(state, kind)).toBe('')
      expect(player(state).inventory[kind]).toBeGreaterThan(before)
    }
  })

  it('keeps recipe and encounter unlock requirements attainable', () => {
    const impossibleRecipes = Object.values(CRAFTING_RECIPES).filter(recipe => !Number.isSafeInteger(recipe.requiredSmithing)
      || recipe.requiredSmithing < 1
      || !Number.isFinite(recipe.practiceCap) || recipe.practiceCap < 1
      || !(['store', 'blacksmith'] as const).includes(recipe.station))
    expect(impossibleRecipes.map(recipe => recipe.id)).toEqual([])
    const maxRequiredSmithing = Math.max(...Object.values(CRAFTING_RECIPES).map(recipe => recipe.requiredSmithing))
    for (let currentLevel = 1; currentLevel < maxRequiredSmithing; currentLevel++) {
      expect(Object.values(CRAFTING_RECIPES).some(recipe => recipe.requiredSmithing <= currentLevel && recipe.practiceCap > currentLevel),
        `no legal XP-yielding recipe at Smithing Lv.${currentLevel}`).toBe(true)
    }

    const noWitness = Object.values(CONTENT_MONSTERS).filter(monster => !encounterWitness(monster.id, 0xc100 + monster.id.length))
    expect(noWitness.map(monster => monster.id)).toEqual([])
    for (const family of Object.values(CONTENT_FAMILIES)) {
      const groups = [[family.monsterIds, 'normal'], [family.eliteIds, 'elite'], [family.miniBossIds, 'miniBoss'], [family.bossIds, 'boss']] as const
      for (const [ids, expectedRank] of groups) for (const id of ids) {
        expect(CONTENT_MONSTERS[id]?.rank, `${family.id}/${id}`).toBe(expectedRank)
        expect(encounterWitness(id, 0xc100 + id.length), `${family.id}/${id}`).not.toBeNull()
      }
    }
    expect(Object.keys(CONTENT_RECIPES).every(id => Boolean(CRAFTING_RECIPES[id]))).toBe(true)

    const craftState = createGame(0xc102)
    const actor = player(craftState)
    actor.gold = 100_000
    actor.stamina = actor.maxStamina
    actor.currentRegion = 'village'
    craftState.settlement.stage = 'town'
    craftState.settlement.buildings = [...new Set<BuildingId>([...craftState.settlement.buildings, 'store', 'blacksmith'])]
    for (const recipe of Object.values(CRAFTING_RECIPES)) {
      actor.skills.smithing.level = recipe.requiredSmithing
      actor.position = { ...BUILDINGS[recipe.station].position }
      craftState.worldTime = Math.floor(craftState.worldTime / CONFIG.minutesPerDay) * CONFIG.minutesPerDay + recipe.opensAtHour * 60
      craftState.reward.materials[actor.id] ??= Object.fromEntries(Object.keys(MATERIALS).map(id => [id, 0]))
      for (const input of recipe.inputs) {
        if (input.source === 'inventory') actor.inventory[input.itemId] = input.amount
        else craftState.reward.materials[actor.id]![input.materialId] = input.amount
      }
      const plan = planCraft(craftState, { recipeId: recipe.id })
      expect(plan.ok, `${recipe.id}: ${plan.reasonCode}`).toBe(true)
      if (recipe.requiredSmithing === 1) expect(plan.practice.xpAward).toBeGreaterThan(0)
    }

    const wolfState = createGame(0xc106)
    const wolfActor = player(wolfState)
    wolfActor.currentRegion = 'forest'
    wolfState.regions.forest.discovered = true
    wolfState.threat.monsterPopulation = 100
    wolfActor.stamina = wolfActor.maxStamina
    for (const [index, definitionId] of Object.keys(WOLF_MONSTERS).entries()) {
      wolfState.reward.collection.defeated = Object.keys(WOLF_MONSTERS).slice(0, index)
      expect(wolfEncounterOptions(wolfState).find(option => option.definitionId === definitionId)?.eligible, definitionId).toBe(true)
    }
  })

  it('emits only hints backed by a legal current action across seeded seasonal and regional states', () => {
    const regions: readonly RegionId[] = ['village', 'farmland', 'forest', 'mine']
    for (const seed of [0xc103, 0xc104, 0xc105]) for (const season of seasons) for (const region of regions) {
      const state: GameState = createGame(seed)
      const actor = player(state)
      actor.currentRegion = region
      state.regions[region].discovered = true
      state.worldTime = seasons.indexOf(season) * CONFIG.daysPerSeason * CONFIG.minutesPerDay + 12 * 60
      state.threat.threatLevel = 3
      state.threat.monsterPopulation = 100
      state.threat.bossAlive = true
      state.reward.collection.defeated.push('grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader')
      state.crops = []
      state.preparedPlots = 0
      state.life.requests.push({ id: `${seed}-${season}-${region}`, kind: 'food', npcId: null, arcId: null,
        createdAt: state.worldTime, expiresAt: state.worldTime + CONFIG.minutesPerDay, status: 'open', amount: 2, progress: 0 })

      const hints = projectGoalHints(state)
      expect(hints.length, `${seed}/${season}/${region}`).toBeLessThanOrEqual(5)
      for (const hint of hints) {
        expect(hasCanonicalHintDestination(state, hint), `${seed}/${season}/${region}/${hint.id} destination`).toBe(true)
        if (hint.id.startsWith('request:')) {
          const request = state.life.requests.find(item => `request:${item.id}` === hint.id)
          expect(request?.status === 'open' && request.expiresAt > state.worldTime, hint.id).toBe(true)
          if (request?.kind === 'medicine') expect(state.npcs.some(npc => npc.id === request.npcId && npc.isAlive), hint.id).toBe(true)
        } else if (hint.id.startsWith('crisis:')) {
          expect(['warning', 'preparation', 'active']).toContain(state.regionalCrisis.phase)
        } else if (hint.id.startsWith('crop:')) {
          expect(region).toBe('farmland')
          expect(farmCropChoices(state).some(choice => choice.id === hint.id.slice('crop:'.length) && choice.status === 'available'), hint.id).toBe(true)
        } else if (hint.id.startsWith('encounter:')) {
          expect(contentEncounterOptions(state).some(option => `encounter:${option.definitionId}` === hint.id && option.eligible), hint.id).toBe(true)
        } else if (hint.id.startsWith('wolf:')) {
          expect(wolfEncounterOptions(state).some(option => `wolf:${option.definitionId}` === hint.id && option.eligible), hint.id).toBe(true)
        } else if (hint.id === 'boss:goblin-chief') {
          expect(region === 'forest' && state.threat.bossAlive, hint.id).toBe(true)
        } else {
          throw new Error(`Unclassified goal hint ${hint.id}`)
        }
      }
    }

    const state = createGame(0xc105)
    const actor = player(state)
    actor.currentRegion = 'farmland'
    state.regions.farmland.discovered = true
    state.crops = []
    state.preparedPlots = 0
    const cropHint = projectGoalHints(state).find(hint => hint.id.startsWith('crop:'))
    expect(cropHint, 'fixture supplies a legal crop action').toBeDefined()
    const wrongDestination = { ...cropHint!, where: '灰石礦場', position: JOBS.miner.workplace }
    expect(hasCanonicalHintDestination(state, wrongDestination), 'reject a crop hint routed to the mine').toBe(false)
  })
})
