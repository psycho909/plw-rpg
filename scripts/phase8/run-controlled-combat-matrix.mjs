/**
 * Controlled Phase8 combat matrix. All gear/output acquisition is performed by
 * public game actions; this runner only builds bounded world-condition fixtures.
 */
import { createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { createGzip } from 'node:zlib'
import { finished } from 'node:stream/promises'
import { createServer } from 'vite'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCombatCellManifest, controlledSampleSeed, MATRIX_BOSS_IDS, MATRIX_STYLE_AFFIXES, selectCombatMatrixTargets,
} from './combat-matrix.mjs'
import {
  CONTROLLED_MATRIX_SAMPLE_COUNT, CONTROLLED_MATRIX_SEEDS, CONTROLLED_MATRIX_TURN_LIMIT,
  classifyControlledCell, controlledJobCellTransition, findNewBossExclusiveDrop, isEligibleDifferentBossDrop,
  isWithinControlledJobBudget, parseControlledMatrixArgs, summarizeControlledMatrix,
} from './controlled-matrix-core.mjs'
import { reconstructIncomingDamage } from './route-policy.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const args = parseControlledMatrixArgs(process.argv.slice(2))
const outputRoot = join(root, 'reports/v2/20261014-balance-tuning/phase-08/b-runner/controlled-matrix-attempts')
const started = new Date()
const stamp = started.toISOString().replaceAll(':', '').replaceAll('-', '').replaceAll('.', '')
const jobKey = `${args.band}-${args.source}${args.target ? `-${args.target}` : ''}`
const attempt = join(outputRoot, jobKey, `attempt-${stamp}`)
const SAMPLE_FUNDING = 1000
const ACQUISITION_ATTEMPT_CAP = 18
const CRAFT_ATTEMPT_CAP = 20
const MASTERPIECE_ATTEMPT_CAP = 16
const JOB_HARD_STOP_MINUTES = 14

function levelForBand(target, band) {
  const level = Number.isSafeInteger(target.level) && target.level > 0 ? target.level : 1
  if (band === 'early') return Math.max(1, level - 2)
  if (band === 'mid') return Math.max(5, level)
  return Math.max(12, level)
}

function addXpForLevel(state, runtime, level) {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError(`invalid fixture level: ${level}`)
  const character = runtime.player(state)
  if (character.level !== 1 || character.exp !== 0) throw new Error('level fixtures require a fresh character')
  if (level > 1) runtime.gainExp(state, character, 30 * level * (level - 1) / 2)
  character.hp = character.maxHp
  character.stamina = character.maxStamina
}

function freshFixture(seed, level, runtime) {
  const state = runtime.createGame(seed >>> 0)
  const character = runtime.player(state)
  addXpForLevel(state, runtime, level)
  character.gold = SAMPLE_FUNDING
  character.hp = character.maxHp
  character.stamina = character.maxStamina
  state.party = []
  return state
}

function ensureTownBlacksmith(state, runtime) {
  state.settlement.stage = 'town'
  if (!state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith')
  const character = runtime.player(state)
  character.position = { ...runtime.BUILDINGS.blacksmith.position }
  character.currentRegion = runtime.tileAt(state, character.position)?.regionId ?? 'village'
  state.worldTime = Math.floor(state.worldTime / runtime.CONFIG.minutesPerDay) * runtime.CONFIG.minutesPerDay + 8 * 60
}

function makeDefinitionRows(registry, config, rewards) {
  const all = [
    ...Object.values(registry.CONTENT_MONSTERS).map(monster => ({
      definitionId: monster.id, rank: monster.rank, familyId: monster.familyId,
      familyRegion: registry.CONTENT_FAMILIES[monster.familyId]?.regions[0] ?? null, level: monster.level,
    })),
    ...Object.values(rewards.WOLF_MONSTERS).map(monster => ({
      definitionId: monster.id, rank: monster.rank, familyId: monster.family, familyRegion: 'forest', level: monster.level,
    })),
    ...Object.entries(config.MONSTERS).map(([definitionId, monster]) => ({
      definitionId, rank: monster.boss ? 'boss' : 'normal', familyId: 'legacy', familyRegion: 'forest', level: monster.level,
    })),
  ]
  return selectCombatMatrixTargets(all)
}

function positionInRegion(state, character, region) {
  const tile = state.tiles.find(candidate => candidate.regionId === region && candidate.walkable)
  if (!tile) return false
  character.currentRegion = region
  character.position = { x: tile.x, y: tile.y }
  return true
}

function setThreatBand(state, threatLevel) {
  const population = [12, 30, 65][threatLevel - 1]
  state.threat.threatLevel = threatLevel
  state.threat.campLevel = threatLevel
  state.threat.monsterPopulation = population
}

function wolfPrerequisites(state, definitionId, rewards) {
  const chain = rewards.WOLF_ENCOUNTER_RULES.order
  const index = chain.indexOf(definitionId)
  if (index < 0) return []
  const previous = chain.slice(0, index)
  for (const id of previous) if (!state.reward.collection.defeated.includes(id)) state.reward.collection.defeated.push(id)
  return previous
}

function* witnessCandidates(startAt, config, safetyValues) {
  const minutesPerDay = config.CONFIG.minutesPerDay
  const seasonMinutes = config.CONFIG.daysPerSeason * minutesPerDay
  const yearMinutes = seasonMinutes * config.CONFIG.seasons.length
  const firstYear = Math.max(0, Math.floor(startAt / yearMinutes))
  for (let year = firstYear; year <= firstYear + 4; year++) {
    for (let season = 0; season < config.CONFIG.seasons.length; season++) {
      for (let hour = 0; hour < 24; hour++) {
        const worldTime = year * yearMinutes + season * seasonMinutes + hour * 60
        if (worldTime < startAt) continue
        for (const stage of ['hamlet', 'village', 'town']) {
          for (const threatLevel of [1, 2, 3]) {
            for (const safety of safetyValues) {
              yield { worldTime, stage, threatLevel, safety, season: config.CONFIG.seasons[season], hour }
            }
          }
        }
      }
    }
  }
}

function safetyCandidates(definition, family) {
  const values = new Set([0, 88, 100])
  const profiles = [...(family?.spawnProfiles ?? []), ...(definition.spawnProfiles ?? family?.spawnProfiles ?? [])]
  for (const profile of profiles) {
    for (const field of ['minSafety', 'maxSafety']) {
      const value = profile[field]
      if (!Number.isFinite(value)) continue
      values.add(Math.max(0, Math.min(100, value)))
      values.add(Math.max(0, Math.min(100, field === 'minSafety' ? value - 1 : value + 1)))
    }
  }
  return [...values].sort((left, right) => left - right)
}

function findSpawnWitness(state, target, startAt, runtime) {
  const character = runtime.player(state)
  if (target.familyId === 'wolf') {
    if (!positionInRegion(state, character, 'forest')) return { ok: false, reason: 'Wolf forest tile is unavailable.' }
    state.worldTime = Math.max(startAt, state.worldTime)
    state.threat.monsterPopulation = Math.max(1, state.threat.monsterPopulation)
    const prerequisites = wolfPrerequisites(state, target.definitionId, runtime.rewards)
    const option = runtime.wolfEncounterOptions(state).find(row => row.definitionId === target.definitionId)
    return option?.eligible ? { ok: true, witness: {
      method: 'wolfEncounterOptions followed by public encounterWolf', region: 'forest', worldTime: state.worldTime,
      prerequisites, eligible: option.eligible, reason: option.reason ?? null,
    } } : { ok: false, reason: option?.reason ?? 'Wolf target is absent from wolfEncounterOptions.' }
  }
  if (target.definitionId === 'chief') {
    if (!positionInRegion(state, character, 'forest')) return { ok: false, reason: 'Legacy Boss forest tile is unavailable.' }
    state.worldTime = Math.max(startAt, state.worldTime)
    state.threat.bossAlive = true
    state.threat.bossProgress = runtime.CONFIG.bossThreshold
    state.threat.threatLevel = Math.max(1, state.threat.threatLevel)
    character.stamina = Math.max(8, character.stamina)
    return { ok: true, witness: { method: 'bossAlive fixture followed by public encounter(state, true)',
      region: 'forest', worldTime: state.worldTime, bossAlive: true, bossProgress: state.threat.bossProgress } }
  }
  const definition = runtime.registry.CONTENT_MONSTERS[target.definitionId]
  if (!definition) return { ok: false, reason: `No content definition or public encounter projection for ${target.definitionId}.` }
  const family = runtime.registry.CONTENT_FAMILIES[definition.familyId]
  const safetyValues = safetyCandidates(definition, family)
  for (const region of family?.regions ?? []) {
    if (!state.regions[region]?.discovered || !positionInRegion(state, character, region)) continue
    character.stamina = character.maxStamina
    for (const candidate of witnessCandidates(startAt, runtime, safetyValues)) {
      state.worldTime = candidate.worldTime
      state.settlement.stage = candidate.stage
      state.settlement.safety = candidate.safety
      setThreatBand(state, candidate.threatLevel)
      const option = runtime.contentEncounterOptions(state, definition.familyId)
        .find(row => row.definitionId === definition.id)
      if (!option?.eligible) continue
      return { ok: true, witness: {
        method: 'contentEncounterOptions followed by public encounterContentMonster',
        region, worldTime: candidate.worldTime, season: candidate.season, hour: candidate.hour,
        settlementStage: candidate.stage, threatLevel: candidate.threatLevel,
        monsterPopulation: state.threat.monsterPopulation, safety: candidate.safety,
        playerLevel: character.level, option: { definitionId: option.definitionId, rank: option.rank, eligible: option.eligible },
      } }
    }
  }
  return { ok: false, reason: `No canonical legal spawn witness for ${target.definitionId} at player level ${character.level} in the next four in-game years.` }
}

function startTargetEncounter(state, target, runtime) {
  if (target.familyId === 'wolf') return runtime.encounterWolf(state, target.definitionId)
  if (target.definitionId === 'chief') return runtime.encounter(state, true)
  return runtime.encounterContentMonster(state, target.definitionId)
}

function recordEncounterEntryCost(state, fight, staminaBeforeEntry, runtime) {
  const spentAtEntry = staminaBeforeEntry - runtime.player(state).stamina
  fight.staminaSpent += Math.max(0, spentAtEntry)
  return fight
}

function materialSnapshot(state, characterId) {
  const character = state.characters.find(row => row.id === characterId)
  const result = Object.fromEntries(['wood', 'stone', 'iron', 'food', 'material', 'potion'].map(id => [id, character?.inventory[id] ?? 0]))
  for (const [id, amount] of Object.entries(state.reward.materials[characterId] ?? {})) result[id] = amount
  return result
}

function numericDelta(before, after) {
  return Object.fromEntries([...new Set([...Object.keys(before), ...Object.keys(after)])]
    .map(id => [id, (after[id] ?? 0) - (before[id] ?? 0)]).filter(([, amount]) => amount !== 0))
}

function publicAction(state, actionName, action, runtime, ledger) {
  const character = runtime.player(state)
  const before = { gold: character.gold, stamina: character.stamina, worldTime: state.worldTime,
    materials: materialSnapshot(state, character.id) }
  const result = action()
  ledger.push({ action: actionName, result: result ?? null,
    goldDelta: character.gold - before.gold, staminaDelta: character.stamina - before.stamina,
    timeDeltaMinutes: state.worldTime - before.worldTime,
    materialDelta: numericDelta(before.materials, materialSnapshot(state, character.id)) })
  return result
}

function itemForStyle(item, style, runtime) {
  const required = MATRIX_STYLE_AFFIXES[style] ?? []
  return item && required.some(affixId => item.affixes?.some(affix => affix.id === affixId))
}

function baseSupportsStyle(baseId, style, runtime) {
  const definition = runtime.rewards.ITEM_BASES[baseId]
  const affixes = definition?.affixes ?? runtime.registry.CONTENT_EQUIPMENT[baseId]?.affixIds ?? []
  return (MATRIX_STYLE_AFFIXES[style] ?? []).some(id => affixes.includes(id))
}

function findCompatibleAdventureSources(style, runtime) {
  const rows = []
  for (const monster of Object.values(runtime.registry.CONTENT_MONSTERS)) {
    if (monster.rank === 'boss' || monster.lootProfile.equipmentChance <= 0) continue
    const table = runtime.registry.CONTENT_LOOT_TABLES[monster.lootTableId]
    if (!table?.weightedEquipment.some(entry => baseSupportsStyle(entry.equipmentId, style, runtime))) continue
    rows.push({ definitionId: monster.id, rank: monster.rank, familyId: monster.familyId,
      familyRegion: runtime.registry.CONTENT_FAMILIES[monster.familyId]?.regions[0] ?? null, level: monster.level,
      lootChance: monster.lootProfile.equipmentChance, sourceType: 'content' })
  }
  for (const monster of Object.values(runtime.rewards.WOLF_MONSTERS)) {
    if (monster.rank === 'boss') continue
    const table = runtime.rewards.LOOT_TABLES[monster.lootTable]
    if (!table?.weighted.some(entry => baseSupportsStyle(entry.baseId, style, runtime))) continue
    rows.push({ definitionId: monster.id, rank: monster.rank, familyId: 'wolf', familyRegion: 'forest',
      level: monster.level, lootChance: monster.rank === 'normal' ? runtime.rewards.WOLF_LOOT_RULES.normalGearChance : 1,
      sourceType: 'wolf' })
  }
  const rankOrder = { normal: 0, elite: 1, miniBoss: 2 }
  return rows.sort((left, right) => (rankOrder[left.rank] - rankOrder[right.rank])
    || left.level - right.level || right.lootChance - left.lootChance || left.definitionId.localeCompare(right.definitionId))
}

function bossSourceDefinitions(style, runtime) {
  const bosses = Object.values(runtime.registry.CONTENT_MONSTERS).filter(monster => monster.rank === 'boss')
    .map(monster => ({ definitionId: monster.id, rank: monster.rank, familyId: monster.familyId,
      familyRegion: runtime.registry.CONTENT_FAMILIES[monster.familyId]?.regions[0] ?? null, level: monster.level,
      baseId: monster.bossRules?.exclusiveEquipmentId }))
  const wolfBoss = runtime.rewards.WOLF_MONSTERS.wolfKing
  bosses.push({ definitionId: wolfBoss.id, rank: wolfBoss.rank, familyId: 'wolf', familyRegion: 'forest',
    level: wolfBoss.level, baseId: runtime.rewards.WOLF_LOOT_RULES.bossExclusiveBase })
  return bosses.filter(boss => boss.baseId && baseSupportsStyle(boss.baseId, style, runtime))
    .sort((left, right) => left.definitionId.localeCompare(right.definitionId))
}

function bossExclusiveBaseFor(definitionId, runtime) {
  const contentBoss = runtime.registry.CONTENT_MONSTERS[definitionId]
  if (contentBoss?.rank === 'boss') return contentBoss.bossRules?.exclusiveEquipmentId ?? null
  const wolfBoss = runtime.rewards.WOLF_MONSTERS[definitionId]
  if (wolfBoss?.rank === 'boss') return runtime.rewards.WOLF_LOOT_RULES.bossExclusiveBase
  return null
}

function currentCost(state, runtime, start) {
  const character = runtime.player(state)
  return {
    startGold: start.gold, endGold: character.gold, goldDelta: character.gold - start.gold,
    startWorldTime: start.worldTime, endWorldTime: state.worldTime, timeMinutes: state.worldTime - start.worldTime,
    startStamina: start.stamina, endStamina: character.stamina, staminaSpent: start.stamina - character.stamina,
    materialDelta: numericDelta(start.materials, materialSnapshot(state, character.id)),
  }
}

function startSnapshot(state, runtime) {
  const character = runtime.player(state)
  return { gold: character.gold, worldTime: state.worldTime, stamina: character.stamina,
    materials: materialSnapshot(state, character.id) }
}

function runCombatToResult(state, runtime, sourceItemIds = new Set()) {
  const character = runtime.player(state)
  const goldBefore = character.gold
  const staminaBefore = character.stamina
  const timeBefore = state.worldTime
  const potionBefore = character.inventory.potion
  const materialsBefore = materialSnapshot(state, character.id)
  const itemIdsBefore = new Set(state.reward.instances.map(item => item.instanceId))
  let turns = 0
  let grossDamageTaken = 0
  let grossDamageStatus = 'MEASURED'
  let actionError = null
  while (state.combat && character.isAlive && turns < CONTROLLED_MATRIX_TURN_LIMIT) {
    const hpBefore = character.hp
    const maxHpBefore = character.maxHp
    const potionBeforeTurn = character.inventory.potion
    const command = character.hp <= character.maxHp * .45 && character.inventory.potion > 0 ? 'potion' : 'attack'
    actionError = runtime.combatTurn(state, command)
    if (actionError) break
    turns++
    const potionUses = Math.max(0, potionBeforeTurn - character.inventory.potion)
    const receivedAttack = state.combat !== null || !character.isAlive
    const damage = reconstructIncomingDamage({ hpBefore, hpAfter: character.hp, maxHp: maxHpBefore,
      potionUses, receivedAttack, otherHealing: 0, healingUnknown: state.party.length > 0 })
    if (damage === null) grossDamageStatus = 'NOT_MEASURED'
    else grossDamageTaken += damage
  }
  let outcome
  if (actionError) outcome = 'error'
  else if (!character.isAlive) outcome = 'death'
  else if (!state.combat) outcome = 'win'
  else {
    const retreatError = runtime.combatTurn(state, 'run')
    if (retreatError) { actionError = retreatError; outcome = 'error' }
    else outcome = 'retreat'
  }
  const rewardItems = state.reward.instances.filter(item => !itemIdsBefore.has(item.instanceId))
  return {
    outcome, error: actionError, turns, hpAfter: character.hp, hpMaxAfter: character.maxHp,
    potionUse: potionBefore - character.inventory.potion,
    grossDamageTaken: grossDamageStatus === 'MEASURED' ? grossDamageTaken : null,
    grossDamageStatus,
    goldDelta: character.gold - goldBefore,
    staminaSpent: staminaBefore - character.stamina,
    timeDeltaMinutes: state.worldTime - timeBefore,
    materialDelta: numericDelta(materialsBefore, materialSnapshot(state, character.id)),
    rewardReceipt: { goldDelta: character.gold - goldBefore, newItems: rewardItems.map(item => ({
      instanceId: item.instanceId, baseId: item.baseId, bossSource: item.provenance?.bossSource ?? null,
      provenance: item.provenance, craftProvenance: item.craftProvenance,
    })) },
    loadoutInstanceIds: [...sourceItemIds],
  }
}

function acquisitionRecord(state, runtime, start, { method, target, witness, attempts, outcome = null, item = null, ledger = [] }) {
  return {
    method, targetDefinitionId: target.definitionId, witness, attempts, outcome,
    item: item ? {
      instanceId: item.instanceId, baseId: item.baseId, level: item.level, rarity: item.rarity,
      affixes: item.affixes, provenance: item.provenance, craftProvenance: item.craftProvenance,
    } : null,
    cost: currentCost(state, runtime, start), actions: ledger,
    endedAt: state.worldTime,
  }
}

function getNewMatchingItem(state, beforeIds, style, runtime, filter = () => true) {
  return [...state.reward.instances].reverse().find(item => !beforeIds.has(item.instanceId)
    && itemForStyle(item, style, runtime) && filter(item)) ?? null
}

function applyLoadedItem(state, item, runtime) {
  const character = runtime.player(state)
  const copy = structuredClone(item)
  copy.ownerId = character.id
  state.reward.instances.push(copy)
  const suffix = Number(copy.instanceId.slice('item-'.length))
  if (Number.isSafeInteger(suffix)) state.reward.nextInstanceId = Math.max(state.reward.nextInstanceId, suffix + 1)
  if (!state.reward.collection.bases.includes(copy.baseId)) state.reward.collection.bases.push(copy.baseId)
  const equipResult = runtime.equipInstance(state, copy.instanceId)
  if (equipResult) throw new Error(`legal acquired item could not be equipped: ${equipResult}`)
  return copy
}

function tradeLegacyGear(state, style, runtime, ledger) {
  ensureTownBlacksmith(state, runtime)
  const itemId = style === 'damage' ? 'sword' : 'armor'
  let result = publicAction(state, `trade(${itemId}, buy)`, () => runtime.trade(state, itemId, true), runtime, ledger)
  if (result) return { ok: false, reason: result }
  result = publicAction(state, `equip(${itemId})`, () => runtime.equip(state, itemId), runtime, ledger)
  return result ? { ok: false, reason: result } : { ok: true, legacyItem: itemId }
}

function addLegacyBossSupport(state, runtime, ledger) {
  ensureTownBlacksmith(state, runtime)
  for (const itemId of ['sword', 'armor']) {
    const bought = publicAction(state, `trade(${itemId}, buy)`, () => runtime.trade(state, itemId, true), runtime, ledger)
    if (bought) return { ok: false, reason: bought }
    const equipped = publicAction(state, `equip(${itemId})`, () => runtime.equip(state, itemId), runtime, ledger)
    if (equipped) return { ok: false, reason: equipped }
  }
  return { ok: true }
}

async function prepareCraftAction(state, recipe, runtime, ledger) {
  const character = runtime.player(state)
  state.settlement.stage = recipe.station === 'blacksmith' ? 'town' : state.settlement.stage
  if (recipe.station === 'blacksmith' && !state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith')
  for (const input of recipe.inputs) {
    if (input.source !== 'inventory') return { ok: false, reason: `Recipe ${recipe.id} needs an adventure material not present in this public-gather path: ${input.materialId}.` }
    const region = input.itemId === 'wood' ? 'forest' : 'mine'
    const tile = state.tiles.find(candidate => candidate.regionId === region && candidate.walkable)
    if (!tile) return { ok: false, reason: `No reachable ${region} gather tile for ${recipe.id}.` }
    while (character.inventory[input.itemId] < input.amount) {
      if (character.stamina < 10) {
        const inn = runtime.BUILDINGS.inn.position
        if (!runtime.walkTo(state, inn)) return { ok: false, reason: 'Could not reach the public inn to restore stamina.' }
        const hour = Math.floor(state.worldTime % runtime.CONFIG.minutesPerDay / 60)
        if (hour < runtime.BUILDINGS.inn.opens || hour >= runtime.BUILDINGS.inn.closes) {
          runtime.simulate(state, (Math.floor(state.worldTime / runtime.CONFIG.minutesPerDay) + 1) * runtime.CONFIG.minutesPerDay + runtime.BUILDINGS.inn.opens * 60 - state.worldTime)
        }
        const restResult = publicAction(state, "rest('inn')", () => runtime.rest(state, 'inn'), runtime, ledger)
        if (restResult) return { ok: false, reason: restResult }
      }
      if (!runtime.walkTo(state, { x: tile.x, y: tile.y })) return { ok: false, reason: `Could not reach ${region} gather tile.` }
      const gatherResult = publicAction(state, `gather('${input.itemId}')`, () => runtime.gather(state, input.itemId), runtime, ledger)
      if (gatherResult) return { ok: false, reason: gatherResult }
    }
  }
  const station = runtime.BUILDINGS[recipe.station]
  if (!station) return { ok: false, reason: `Missing public station definition for ${recipe.station}.` }
  if (!runtime.walkTo(state, station.position)) return { ok: false, reason: `Could not reach ${recipe.station}.` }
  const hour = Math.floor(state.worldTime % runtime.CONFIG.minutesPerDay / 60)
  if (hour < recipe.opensAtHour || hour >= recipe.closesAtHour) {
    runtime.simulate(state, (Math.floor(state.worldTime / runtime.CONFIG.minutesPerDay) + 1) * runtime.CONFIG.minutesPerDay + recipe.opensAtHour * 60 - state.worldTime)
    if (!runtime.walkTo(state, station.position)) return { ok: false, reason: `Could not return to ${recipe.station} after waiting for opening.` }
  }
  if (character.stamina < recipe.staminaCost) {
    if (!runtime.walkTo(state, runtime.BUILDINGS.inn.position)) return { ok: false, reason: 'Could not reach the public inn to restore crafting stamina.' }
    const restHour = Math.floor(state.worldTime % runtime.CONFIG.minutesPerDay / 60)
    if (restHour < runtime.BUILDINGS.inn.opens || restHour >= runtime.BUILDINGS.inn.closes) {
      runtime.simulate(state, (Math.floor(state.worldTime / runtime.CONFIG.minutesPerDay) + 1) * runtime.CONFIG.minutesPerDay + runtime.BUILDINGS.inn.opens * 60 - state.worldTime)
    }
    const restResult = publicAction(state, "rest('inn')", () => runtime.rest(state, 'inn'), runtime, ledger)
    if (restResult) return { ok: false, reason: restResult }
    if (!runtime.walkTo(state, station.position)) return { ok: false, reason: `Could not return to ${recipe.station} after resting.` }
    const backHour = Math.floor(state.worldTime % runtime.CONFIG.minutesPerDay / 60)
    if (backHour < recipe.opensAtHour || backHour >= recipe.closesAtHour) {
      runtime.simulate(state, (Math.floor(state.worldTime / runtime.CONFIG.minutesPerDay) + 1) * runtime.CONFIG.minutesPerDay + recipe.opensAtHour * 60 - state.worldTime)
      if (!runtime.walkTo(state, station.position)) return { ok: false, reason: `Could not return to ${recipe.station} after waiting.` }
    }
  }
  return { ok: true }
}

async function publicCraft(state, recipeId, runtime, ledger) {
  const recipe = runtime.craftingRecipes[recipeId]
  if (!recipe) return { ok: false, reason: `Unknown public recipe ${recipeId}.` }
  const prepared = await prepareCraftAction(state, recipe, runtime, ledger)
  if (!prepared.ok) return prepared
  const preview = runtime.planCraft(state, { recipeId })
  if (!preview.ok) return { ok: false, reason: `planCraft(${recipeId}) rejected: ${preview.reasonCode} ${preview.message ?? ''}`.trim() }
  const beforeIds = new Set(state.reward.instances.map(item => item.instanceId))
  const result = publicAction(state, `craft({ recipeId: '${recipeId}' })`, () => runtime.craft(state, { recipeId }), runtime, ledger)
  if (!result.ok) return { ok: false, runnerError: `craft(${recipeId}) rejected after planCraft approved it: ${result.reasonCode} ${result.message ?? ''}`.trim() }
  const item = state.reward.instances.find(candidate => candidate.instanceId === result.instanceId)
  if (!item || beforeIds.has(item.instanceId)) return { ok: false, runnerError: `craft(${recipeId}) returned no newly owned item.` }
  return { ok: true, item, result }
}

function recipesForStyle(style, runtime, masterpieceOnly = false) {
  const required = MATRIX_STYLE_AFFIXES[style] ?? []
  return Object.values(runtime.craftingRecipes).filter(recipe => {
    if (masterpieceOnly && !recipe.masterpieceRules) return false
    if (recipe.inputs.some(input => input.source !== 'inventory')) return false
    return baseSupportsStyle(recipe.outputBase, style, runtime)
      && required.some(id => (runtime.rewards.ITEM_BASES[recipe.outputBase]?.affixes ?? []).includes(id))
  }).sort((left, right) => left.requiredSmithing - right.requiredSmithing || left.id.localeCompare(right.id))
}

async function trainSmithingTo(state, targetSkill, runtime, ledger, deadline) {
  const trainingRecipeIds = ['starterSpear', 'fieldSpear', 'fieldArmor', 'ironShortSword']
  let attempts = 0
  while (runtime.player(state).skills.smithing.level < targetSkill && attempts < 32) {
    if (deadline && !isWithinControlledJobBudget(deadline.startedAt, Date.now(), JOB_HARD_STOP_MINUTES)) {
      return { ok: false, reason: '14-minute job hard stop reached during legal Smithing training.' }
    }
    const skill = runtime.player(state).skills.smithing.level
    let selected = null
    for (const id of trainingRecipeIds) {
      const recipe = runtime.craftingRecipes[id]
      if (!recipe || recipe.requiredSmithing > skill || recipe.practiceCap <= skill) continue
      const preview = runtime.planCraft(state, { recipeId: id })
      if (preview.practice.xpAward > 0) { selected = id; break }
    }
    if (!selected) return { ok: false, reason: `No legal public training recipe awards Smithing XP at skill ${skill}.` }
    const crafted = await publicCraft(state, selected, runtime, ledger)
    if (!crafted.ok) return crafted
    attempts++
  }
  return runtime.player(state).skills.smithing.level >= targetSkill
    ? { ok: true, trainingCrafts: attempts }
    : { ok: false, reason: `Smithing ${targetSkill} was not reached within 32 legal public training crafts.` }
}

async function acquireCraftedArtifact(style, target, band, seed, runtime, deadline, masterpieceOnly = false) {
  const level = levelForBand(target, band)
  const recipes = recipesForStyle(style, runtime, masterpieceOnly)
  if (!recipes.length) return { ok: false, reason: `No public ${masterpieceOnly ? 'masterpiece-enabled ' : ''}recipe output base supports ${style}.` }
  const recipe = recipes[0]
  const requiredSmithing = masterpieceOnly ? recipe.masterpieceRules.requiredSmithing : recipe.requiredSmithing
  const state = freshFixture(seed, level, runtime)
  ensureTownBlacksmith(state, runtime)
  const start = startSnapshot(state, runtime)
  const ledger = []
  const training = await trainSmithingTo(state, requiredSmithing, runtime, ledger, deadline)
  if (!training.ok) return { ok: false, reason: training.reason, runnerError: training.runnerError }
  const attemptCap = masterpieceOnly ? MASTERPIECE_ATTEMPT_CAP : CRAFT_ATTEMPT_CAP
  let lastReason = 'No matching owned crafted item was produced.'
  for (let attemptIndex = 0; attemptIndex < attemptCap; attemptIndex++) {
    if (!isWithinControlledJobBudget(deadline.startedAt, Date.now(), JOB_HARD_STOP_MINUTES)) {
      return { ok: false, reason: '14-minute job hard stop reached during public craft acquisition.' }
    }
    const crafted = await publicCraft(state, recipe.id, runtime, ledger)
    if (crafted.runnerError) return crafted
    if (!crafted.ok) { lastReason = crafted.reason; break }
    const isMasterpiece = crafted.item.craftProvenance?.masterpiece === true
    const itemMatches = itemForStyle(crafted.item, style, runtime)
      && (!masterpieceOnly || isMasterpiece)
    if (!itemMatches) { lastReason = masterpieceOnly
      ? `Public craft ${recipe.id} attempt ${attemptIndex + 1} was not a matching masterpiece.`
      : `Public craft ${recipe.id} attempt ${attemptIndex + 1} did not roll ${style}.`; continue }
    const equipResult = runtime.equipInstance(state, crafted.item.instanceId)
    if (equipResult) { lastReason = equipResult; break }
    return { ok: true, item: structuredClone(crafted.item), acquisition: acquisitionRecord(state, runtime, start, {
      method: masterpieceOnly
        ? 'public planCraft + public craft at masterpiece Smithing gate; verified craftProvenance.masterpiece=true'
        : 'public planCraft + public craft using publicly gathered recipe inputs',
      target, witness: { recipeId: recipe.id, station: recipe.station, requiredSmithing,
        playerSmithing: runtime.player(state).skills.smithing.level, trainingCrafts: training.trainingCrafts,
        legalInputs: recipe.inputs }, attempts: attemptIndex + 1, outcome: 'acquired', item: crafted.item, ledger,
    }) }
  }
  return { ok: false, reason: `${lastReason} (recipe=${recipe.id}, attempts<=${attemptCap}, Smithing=${runtime.player(state).skills.smithing.level}).` }
}

async function acquireAdventureArtifactWithDeadline(style, target, band, seed, runtime, deadline) {
  const level = levelForBand(target, band)
  const candidates = findCompatibleAdventureSources(style, runtime)
  if (!candidates.length) return { ok: false, reason: `No non-Boss legal loot table contains a ${style} base.` }
  const totalLimit = Math.min(ACQUISITION_ATTEMPT_CAP, candidates.length)
  let lastReason = 'No compatible item was awarded by the bounded public encounter search.'
  for (let attemptIndex = 0; attemptIndex < totalLimit; attemptIndex++) {
    if (!isWithinControlledJobBudget(deadline.startedAt, Date.now(), JOB_HARD_STOP_MINUTES)) return { ok: false, reason: '14-minute job hard stop reached during acquisition.' }
    const source = candidates[attemptIndex]
    const attemptSeed = controlledSampleSeed(seed, target.definitionId, band, 'adventure-acquire', style, attemptIndex) || 1
    const state = freshFixture(attemptSeed, level, runtime)
    const start = startSnapshot(state, runtime)
    const spawn = findSpawnWitness(state, source, state.worldTime, runtime)
    if (!spawn.ok) { lastReason = `${source.definitionId}: ${spawn.reason}`; continue }
    const beforeIds = new Set(state.reward.instances.map(item => item.instanceId))
    const startResult = startTargetEncounter(state, source, runtime)
    if (startResult) return { ok: false, runnerError: `${source.definitionId}: encounter rejected a canonical eligible witness: ${startResult}` }
    const fight = runCombatToResult(state, runtime)
    if (fight.outcome === 'error') return { ok: false, runnerError: `${source.definitionId}: combat action rejected: ${fight.error}` }
    if (fight.outcome !== 'win') { lastReason = `${source.definitionId}: legal acquisition fight ended ${fight.outcome}${fight.error ? ` (${fight.error})` : ''}`; continue }
    const item = getNewMatchingItem(state, beforeIds, style, runtime, candidate => candidate.provenance?.bossSource == null)
    if (!item) { lastReason = `${source.definitionId}: victory did not award an owned ${style} item.`; continue }
    const equipResult = runtime.equipInstance(state, item.instanceId)
    if (equipResult) return { ok: false, reason: `acquired ${item.instanceId} but public equipInstance rejected it: ${equipResult}` }
    return { ok: true, item: structuredClone(item), acquisition: acquisitionRecord(state, runtime, start, {
      method: 'legal public encounter + combat victory + actual loot ItemInstance', target: source,
      witness: spawn.witness, attempts: attemptIndex + 1, outcome: fight.outcome,
      item, ledger: [{ action: 'encounter/combat', outcome: fight.outcome, turns: fight.turns,
        goldDelta: fight.goldDelta, potionUse: fight.potionUse, timeDeltaMinutes: fight.timeDeltaMinutes,
        staminaSpent: fight.staminaSpent, grossDamageStatus: fight.grossDamageStatus }],
    }) }
  }
  return { ok: false, reason: `${lastReason} (bounded attempts=${totalLimit}).` }
}

async function acquireBossSourceArtifact(sourceBoss, target, band, seed, runtime, deadline) {
  const level = levelForBand(target, band)
  const state = freshFixture(controlledSampleSeed(seed, target.definitionId, band, `boss-gear-${sourceBoss.definitionId}`, 'damage', 0) || 1,
    level, runtime)
  const start = startSnapshot(state, runtime)
  const ledger = []
  const support = addLegacyBossSupport(state, runtime, ledger)
  if (!support.ok) return { ok: false, reason: `Legacy support purchase blocked: ${support.reason}` }
  const spawn = findSpawnWitness(state, sourceBoss, state.worldTime, runtime)
  if (!spawn.ok) return { ok: false, reason: `${sourceBoss.definitionId}: ${spawn.reason}` }
  if (!isWithinControlledJobBudget(deadline.startedAt, Date.now(), JOB_HARD_STOP_MINUTES)) return { ok: false, reason: '14-minute job hard stop reached during Boss gear acquisition.' }
  const beforeIds = new Set(state.reward.instances.map(item => item.instanceId))
  const startResult = startTargetEncounter(state, sourceBoss, runtime)
  if (startResult) return { ok: false, runnerError: `${sourceBoss.definitionId}: encounter rejected a canonical eligible witness: ${startResult}` }
  const fight = runCombatToResult(state, runtime)
  if (fight.outcome === 'error') return { ok: false, runnerError: `${sourceBoss.definitionId}: combat action rejected: ${fight.error}` }
  if (fight.outcome !== 'win') return { ok: false, reason: `${sourceBoss.definitionId}: source Boss fight ended ${fight.outcome}${fight.error ? ` (${fight.error})` : ''}.` }
  const item = findNewBossExclusiveDrop(state.reward.instances, beforeIds, sourceBoss, runtime.player(state).id)
  if (!item) return { ok: false, runnerError: sourceBoss.definitionId
    + ': victory produced no new owned ItemInstance matching exclusive base ' + sourceBoss.baseId + '.' }
  const equipResult = runtime.equipInstance(state, item.instanceId)
  if (equipResult) return { ok: false, reason: `${sourceBoss.definitionId}: public equipInstance rejected the Boss reward: ${equipResult}` }
  return { ok: true, item: structuredClone(item), acquisition: acquisitionRecord(state, runtime, start, {
    method: 'public legacy support purchase + legal different-Boss encounter/combat victory + actual Boss reward',
    target: sourceBoss, witness: spawn.witness,
    attempts: 1, outcome: fight.outcome, item,
    ledger: [...ledger, { action: 'source Boss encounter/combat', outcome: fight.outcome, turns: fight.turns,
      goldDelta: fight.goldDelta, potionUse: fight.potionUse, timeDeltaMinutes: fight.timeDeltaMinutes,
      staminaSpent: fight.staminaSpent, grossDamageStatus: fight.grossDamageStatus }],
  }) }
}

async function runJob() {
  await mkdir(join(outputRoot, jobKey), { recursive: true })
  await mkdir(attempt, { recursive: false })
  const streamFile = join(attempt, 'combat-samples.jsonl.gz')
  const gzip = createGzip({ level: 6 })
  const output = createWriteStream(streamFile, { flags: 'wx' })
  const streamDone = finished(output)
  gzip.pipe(output)
  let vite
  let status = 'PASS'
  let failure = null
  let sampleRows = 0
  const startedAt = Date.now()
  const deadline = { startedAt }
  const acquisitionRows = []
  const compactRows = []
  const cellResults = []
  let targets = []
  let jobCells = []
  let manifest = null
  let runtime = null
  const artifactCache = new Map()
  const bossArtifactCache = new Map()

  const writeSample = async row => {
    if (!gzip.write(`${JSON.stringify(row)}\n`)) await once(gzip, 'drain')
    sampleRows++
    compactRows.push({ definitionId: row.definitionId, rank: row.rank, band: row.band, source: row.source, style: row.style,
      outcome: row.outcome, turns: row.turns, hpAfter: row.hpAfter, hpMaxAfter: row.hpMaxAfter, potionUse: row.potionUse,
      grossDamageStatus: row.grossDamageStatus, grossDamageTaken: row.grossDamageTaken,
      goldDelta: row.goldDelta, timeDeltaMinutes: row.timeDeltaMinutes, staminaSpent: row.staminaSpent })
  }

  try {
    vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom',
      logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
    const [registry, config, rewards, actions, simulation, contentEngine, wolfEngine, craftingEngine,
      rewardActions, craftingData] = await Promise.all([
      vite.ssrLoadModule('/src/data/contentRegistry.ts'), vite.ssrLoadModule('/src/data/config.ts'),
      vite.ssrLoadModule('/src/data/rewards.ts'), vite.ssrLoadModule('/src/engine/actions.ts'),
      vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/contentFamilies.ts'),
      vite.ssrLoadModule('/src/engine/wolfFamily.ts'), vite.ssrLoadModule('/src/engine/crafting.ts'),
      vite.ssrLoadModule('/src/engine/rewardActions.ts'), vite.ssrLoadModule('/src/data/crafting.ts'),
    ])
    runtime = {
      registry, CONFIG: config.CONFIG, BUILDINGS: config.BUILDINGS,
      rewards, craftingRecipes: craftingData.CRAFTING_RECIPES,
      createGame: simulation.createGame, player: simulation.player, gainExp: simulation.gainExp,
      simulate: simulation.simulate, tileAt: simulation.tileAt, walkTo: simulation.walkTo,
      trade: actions.trade, equip: actions.equip, gather: actions.gather, rest: actions.rest,
      encounter: actions.encounter, combatTurn: actions.combatTurn,
      encounterContentMonster: contentEngine.encounterContentMonster,
      contentEncounterOptions: contentEngine.contentEncounterOptions,
      encounterWolf: wolfEngine.encounterWolf, wolfEncounterOptions: wolfEngine.wolfEncounterOptions,
      planCraft: craftingEngine.planCraft, craft: craftingEngine.craft,
      equipInstance: rewardActions.equipInstance, equippedInstance: rewardActions.equippedInstance,
    }
    targets = makeDefinitionRows(registry, config, rewards)
    if (JSON.stringify(targets.filter(target => target.rank === 'boss').map(target => target.definitionId).sort())
      !== JSON.stringify([...MATRIX_BOSS_IDS].sort())) throw new Error('Runtime matrix Boss ID set no longer matches the approved eight Bosses.')
    manifest = buildCombatCellManifest({ targets, seeds: CONTROLLED_MATRIX_SEEDS, samplesPerSeed: CONTROLLED_MATRIX_SAMPLE_COUNT })
    const targetById = new Map(targets.map(target => [target.definitionId, target]))
    jobCells = manifest.cells.filter(cell => cell.band === args.band && cell.source === args.source
      && (!args.target || cell.definitionId === args.target))
    if (!jobCells.length) throw new RangeError(`No planned matrix cells for ${jobKey}.`)
    if (args.target && !targetById.has(args.target)) throw new RangeError(`Unknown scoped matrix target: ${args.target}`)
    await writeFile(join(attempt, 'manifest.json'), `${JSON.stringify({ schema: 1, job: args, command:
      `node scripts/phase8/run-controlled-combat-matrix.mjs --band ${args.band} --source ${args.source}${args.target ? ` --target ${args.target}` : ''}`,
      generatedAt: new Date().toISOString(), phase7BandClassifier: 'early=max(1, targetLevel-2); mid=max(5,targetLevel); late=max(12,targetLevel).',
      scope: { targetCount: targets.length, selectedTargetIds: targets.map(target => target.definitionId),
        band: args.band, source: args.source, seedStrata: CONTROLLED_MATRIX_SEEDS,
        samplesPerCellPerSeed: CONTROLLED_MATRIX_SAMPLE_COUNT, expectedJobCells: jobCells.length,
        estimatedTotalMinutes: manifest.executionPlan.estimatedWallClockMinutesTotal,
        estimatedMaxJobMinutes: manifest.executionPlan.estimatedWallClockMinutesPerJob,
        hardStopMinutes: JOB_HARD_STOP_MINUTES },
      targetSelection: manifest.targetSelection, legalAcquisitionPaths: manifest.acquisitionPaths,
      fixturePolicy: { publicAcquisitionOnly: true, sourceItemReplay: 'A source item is generated once by a legal public acquisition checkpoint and copied unchanged into independent combat fixtures; no generator or reward-award helper is called directly.',
        level: 'Set through simulation.gainExp to the Phase7 relative band level.',
        worldGates: 'Region, season, hour, threat, safety, settlement stage, Wolf chain predecessors and Chief bossAlive are explicit controlled preconditions, then verified through canonical encounter option projections/public encounter actions.',
        startingGold: `Controlled preparation wallet ${SAMPLE_FUNDING}; every gear/material transaction uses public actions and actual deltas are recorded. This endowment is not counted as fight reward.`,
        companions: 'No companions; gross incoming damage is reconstructed from action-boundary HP and measured potion deltas.' },
      cells: jobCells }, null, 2)}\n`, { flag: 'wx' })

    for (const cell of jobCells) {
      const target = targetById.get(cell.definitionId)
      if (cell.naReason) {
        cellResults.push({ ...cell, status: 'NOT_APPLICABLE', attemptedSamples: 0, naReason: cell.naReason })
        continue
      }
      let attemptedSamples = 0
      let naReason = null
      let executionError = null
      let timeLimitReached = false
      const acquisitionForCell = []
      for (const controlSeed of CONTROLLED_MATRIX_SEEDS) {
        let artifact = null
        const level = levelForBand(target, args.band)
        if (args.source !== 'legacy') {
          const cacheKey = [args.source, controlSeed, level, cell.style,
            args.source === 'boss-gear' ? target.definitionId : 'shared'].join('|')
          if (!artifactCache.has(cacheKey)) {
            let result
            if (args.source === 'adventure-loot') {
              result = await acquireAdventureArtifactWithDeadline(cell.style, target, args.band, controlSeed, runtime, deadline)
            } else if (args.source === 'crafted') {
              result = await acquireCraftedArtifact(cell.style, target, args.band, controlSeed, runtime, deadline, false)
            } else if (args.source === 'masterpiece') {
              result = await acquireCraftedArtifact(cell.style, target, args.band, controlSeed, runtime, deadline, true)
            } else {
              result = await acquireBossGearArtifact(cell.style, target, args.band, controlSeed, runtime, deadline, bossArtifactCache)
            }
            artifactCache.set(cacheKey, result)
          }
          artifact = artifactCache.get(cacheKey)
          if (!artifact?.ok) {
            if (artifact?.runnerError) executionError = artifact.runnerError
            else {
              naReason = artifact?.reason ?? 'No legal source witness was produced.'
              if (naReason.includes('14-minute job hard stop')) timeLimitReached = true
            }
            break
          }
          acquisitionForCell.push({ seed: controlSeed, acquisition: artifact.acquisition,
            itemInstanceId: artifact.item?.instanceId ?? null })
          const acquisitionWitnessId = `${args.source}/${controlSeed}/${target.definitionId}/${cell.style}`
          acquisitionRows.push({ acquisitionWitnessId, controlSeed, band: args.band, source: args.source,
            style: cell.style, combatTargetDefinitionId: target.definitionId,
            acquisitionTargetDefinitionId: artifact.acquisition?.targetDefinitionId ?? null,
            itemInstanceId: artifact.item?.instanceId ?? null, acquisition: artifact.acquisition })
        }
        const templateState = freshFixture(controlSeed, level, runtime)
        let legacy = null
        let acquisition
        if (args.source === 'legacy') {
          const sourceStart = startSnapshot(templateState, runtime)
          const actionLedger = []
          const purchased = tradeLegacyGear(templateState, cell.style, runtime, actionLedger)
          if (!purchased.ok) { naReason = purchased.reason; break }
          legacy = { item: purchased.legacyItem, actions: actionLedger,
            cost: currentCost(templateState, runtime, sourceStart), endedAt: templateState.worldTime }
          acquisition = legacy
          acquisitionForCell.push({ seed: controlSeed, acquisition: legacy,
            itemInstanceId: null })
          const acquisitionWitnessId = `${args.source}/${controlSeed}/${target.definitionId}/${cell.style}`
          acquisitionRows.push({ acquisitionWitnessId, controlSeed, band: args.band, source: args.source,
            style: cell.style, combatTargetDefinitionId: target.definitionId,
            acquisitionTargetDefinitionId: target.definitionId, itemInstanceId: null,
            acquisition: { method: 'public trade/equip checkpoint replayed across combat samples',
              targetDefinitionId: target.definitionId, endedAt: legacy.endedAt, cost: legacy.cost, actions: legacy.actions } })
        } else {
          // This is a checkpoint replay of the actual public-acquired item, not new gear generation.
          applyLoadedItem(templateState, artifact.item, runtime)
          acquisition = artifact.acquisition
        }
        const spawn = findSpawnWitness(templateState, target, acquisition?.endedAt ?? templateState.worldTime, runtime)
        if (!spawn.ok) { naReason = spawn.reason; break }
        const acquisitionWitnessId = `${args.source}/${controlSeed}/${target.definitionId}/${cell.style}`
        for (let sampleIndex = 0; sampleIndex < CONTROLLED_MATRIX_SAMPLE_COUNT; sampleIndex++) {
          if (!isWithinControlledJobBudget(startedAt, Date.now(), JOB_HARD_STOP_MINUTES)) {
            timeLimitReached = true
            break
          }
          const sampleSeed = controlledSampleSeed(controlSeed, target.definitionId, args.band, args.source, cell.style, sampleIndex) || 1
          const state = structuredClone(templateState)
          state.worldSeed = sampleSeed
          state.rngState = sampleSeed
          const character = runtime.player(state)
          character.hp = character.maxHp
          character.stamina = character.maxStamina
          const itemIds = new Set(state.reward.instances.map(item => item.instanceId))
          const staminaBeforeEntry = character.stamina
          const startResult = startTargetEncounter(state, target, runtime)
          if (startResult) { executionError = `Public target encounter rejected the canonical witness: ${startResult}`; break }
          const fight = recordEncounterEntryCost(state, runCombatToResult(state, runtime, new Set([...itemIds])), staminaBeforeEntry, runtime)
          if (fight.outcome === 'error') { executionError = `combatTurn rejected a sample action: ${fight.error}`; break }
          const instance = args.source === 'legacy' ? null
            : runtime.equippedInstance(state, runtime.rewards.ITEM_BASES[artifact.item.baseId].slot)
          const row = {
            controlSeed, sampleSeed, sampleIndex, definitionId: target.definitionId, rank: target.rank,
            familyId: target.familyId, familyRegion: target.familyRegion, band: args.band, requestedPlayerLevel: level,
            source: args.source, style: cell.style, sourceItemInstanceId: instance?.instanceId ?? null,
            sourceItemBaseId: instance?.baseId ?? legacy?.item ?? null,
            sourceItemAffixes: instance?.affixes ?? [], sourceItemProvenance: instance?.provenance ?? null,
            sourceItemCraftProvenance: instance?.craftProvenance ?? null,
            targetBossOwnDropExcluded: target.rank === 'boss' && args.source === 'boss-gear'
              ? isEligibleDifferentBossDrop(instance, target.definitionId,
                bossExclusiveBaseFor(target.definitionId, runtime)) : null,
            targetSpawnWitness: spawn.witness, acquisitionWitnessId,
            acquisitionCost: acquisition?.cost ?? null,
            controlledWindowOffsetMinutes: Math.max(0, spawn.witness.worldTime - (acquisition?.endedAt ?? spawn.witness.worldTime)),
            ...fight,
          }
          if (target.rank === 'boss' && args.source === 'boss-gear' && row.targetBossOwnDropExcluded !== true) {
            naReason = 'Target Boss first-kill loadout contained its own Boss drop.'
            break
          }
          await writeSample(row)
          attemptedSamples++
        }
        if (naReason || executionError || timeLimitReached) break
      }
      const classified = classifyControlledCell({ executionError, timeLimitReached, naReason, attemptedSamples,
        expectedSamples: CONTROLLED_MATRIX_SAMPLE_COUNT * CONTROLLED_MATRIX_SEEDS.length })
      cellResults.push({ ...cell, ...classified,
        attemptedSamples, expectedSamples: CONTROLLED_MATRIX_SAMPLE_COUNT * CONTROLLED_MATRIX_SEEDS.length,
        acquisitionWitnesses: acquisitionForCell })
      const transition = controlledJobCellTransition(status, { executionError, timeLimitReached })
      status = transition.status
      if (transition.stop) {
        for (const pending of jobCells.slice(jobCells.indexOf(cell) + 1)) {
          if (!cellResults.some(result => result.definitionId === pending.definitionId && result.style === pending.style)) {
            cellResults.push({ ...pending, status: 'NOT_RUN_TIME_LIMIT', attemptedSamples: 0,
              naReason: '14-minute job hard stop reached before this cell.' })
          }
        }
        break
      }
    }
    if (status === 'PASS' && cellResults.some(cell => cell.status === 'INCOMPLETE')) status = 'PARTIAL'
  } catch (error) {
    status = 'FAIL'
    failure = { message: String(error), stack: error?.stack ?? null }
  } finally {
    await vite?.close()
    gzip.end()
    await streamDone
    const summaries = summarizeControlledMatrix(compactRows)
    const summaryByCell = new Map(summaries.map(row => [[row.definitionId, row.source, row.style].join('/'), row]))
    const finalizedCells = cellResults.map(cell => ({ ...cell,
      summary: summaryByCell.get([cell.definitionId, cell.source, cell.style].join('/')) ?? null }))
    const completion = { status, failure, startedAt: started.toISOString(), endedAt: new Date().toISOString(),
      elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)), jobHardStopMinutes: JOB_HARD_STOP_MINUTES,
      sampleRows, expectedJobCells: jobCells.length, rows: { cellResults: finalizedCells.length,
        acquisitionWitnesses: acquisitionRows.length, summaries: summaries.length },
      outcomeCounts: compactRows.reduce((counts, row) => ({ ...counts, [row.outcome]: (counts[row.outcome] ?? 0) + 1 }), {}),
      grossDamage: compactRows.some(row => row.grossDamageStatus !== 'MEASURED')
        ? 'Some rows are NOT MEASURED; see per-row status and cell summary.' : 'MEASURED by runner-side HP/potion reconstruction; no companions present.',
      totalLegalTargetCount: targets.length }
    if (manifest) completion.estimate = manifest.executionPlan
    await writeFile(join(attempt, 'cell-results.json'), `${JSON.stringify({ cells: finalizedCells, summaries }, null, 2)}\n`, { flag: 'wx' })
    await writeFile(join(attempt, 'acquisition-witnesses.json'), `${JSON.stringify(acquisitionRows, null, 2)}\n`, { flag: 'wx' })
    await writeFile(join(attempt, 'completion.json'), `${JSON.stringify(completion, null, 2)}\n`, { flag: 'wx' })
  }
  console.log(JSON.stringify({ attempt, status, job: args, sampleRows, cellRows: cellResults.length }, null, 2))
  if (status !== 'PASS') process.exitCode = 1
}

async function acquireBossGearArtifact(style, target, band, seed, runtime, deadline, cache) {
  const sources = bossSourceDefinitions(style, runtime).filter(source => source.definitionId !== target.definitionId)
  if (!sources.length) return { ok: false, reason: `No different Boss has an exclusive equipment base compatible with ${style}.` }
  let lastReason = 'No compatible different Boss produced an owned item with the requested style affix.'
  const level = levelForBand(target, band)
  for (const sourceBoss of sources) {
    const cacheKey = `${seed}/${level}/${sourceBoss.definitionId}`
    if (!cache.has(cacheKey)) cache.set(cacheKey, await acquireBossSourceArtifact(sourceBoss, target, band, seed, runtime, deadline))
    const artifact = cache.get(cacheKey)
    if (artifact?.runnerError) return artifact
    if (!artifact?.ok) { lastReason = artifact?.reason ?? lastReason; continue }
    if (artifact.item.provenance?.bossSource === target.definitionId) {
      lastReason = `Boss source ${sourceBoss.definitionId} violates target-own-drop exclusion.`
      continue
    }
    if (!itemForStyle(artifact.item, style, runtime)) {
      lastReason = `${sourceBoss.definitionId} reward ${artifact.item.baseId} did not roll ${style}.`
      continue
    }
    return artifact
  }
  return { ok: false, reason: lastReason }
}

await runJob()
