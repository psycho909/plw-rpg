import { CRAFTING_RECIPES } from '../data/crafting'
import { BOSS, BUILDINGS, CONFIG, JOBS } from '../data/config'
import { IDENTITY_LIMITS, IDENTITY_RULES, REPUTATION_BOUNDS } from '../data/identity'
import { ITEM_BASES, MATERIALS, RARITIES } from '../data/rewards'
import type {
  CraftInventoryItemId, CraftRecipeId, CraftStationId, CraftingInput, ItemBaseId, MaterialId, RarityId,
} from '../domain/reward'
import type { GameState } from '../domain/types'
import { calendar } from './calendar'
import { emit } from './events'
import { awardIdentity, changeReputation, recordLifeAction } from './identity'
import { craftQualityProfile, generateItem } from './itemGeneration'
import { gainExp, preflightRegionalCrisisAction, simulate } from './simulation'

export interface CraftRequest { recipeId: CraftRecipeId; influenceMaterial?: MaterialId | null }

export type CraftFailureReasonCode =
  | 'invalid_request' | 'unknown_recipe' | 'world_state_invalid' | 'character_missing'
  | 'dead' | 'in_combat' | 'in_dungeon' | 'station_unavailable' | 'too_far' | 'station_closed'
  | 'skill_required' | 'materials_required' | 'gold_required' | 'stamina_required'
  | 'material_not_allowed' | 'time_overflow' | 'event_capacity' | 'item_capacity'

export type CraftInputPreview = CraftingInput & { required: number; current: number | null }

export interface CraftPlanContext {
  recipeId: CraftRecipeId | null
  influenceMaterial: MaterialId | null
  output: { baseId: ItemBaseId; name: string; level: number; slot: 'weapon' | 'armor' } | null
  inputs: CraftInputPreview[]
  gold: { required: number | null; current: number | null }
  stamina: { required: number | null; current: number | null }
  durationMinutes: number | null
  skill: { id: 'smithing'; required: number | null; current: number | null; unlocked: boolean }
  practice: { xpAward: number; capLevel: number | null; graduated: boolean }
  masterpiece: { requiredSmithing: number | null; eligible: boolean; chance: number }
  quality: {
    floor: RarityId | null
    rarityWeights: Record<RarityId, number>
    nextFloor: RarityId | null
    nextFloorAtSmithing: number | null
  }
  station: {
    id: CraftStationId | null
    site: 'home' | CraftStationId | null
    opensAtHour: number | null
    closesAtHour: number | null
    built: boolean
    nearby: boolean
    open: boolean
    available: boolean
  }
  access: { alive: boolean; inCombat: boolean; inDungeon: boolean; available: boolean }
}

export type CraftPlan = CraftPlanContext & (
  | { ok: true; reasonCode: null; message: null }
  | { ok: false; reasonCode: CraftFailureReasonCode; message: string }
)

export type CraftResult =
  | { ok: true; instanceId: string; recipeId: CraftRecipeId; baseId: ItemBaseId; masterpiece: boolean }
  | { ok: false; reasonCode: CraftFailureReasonCode; message: string }

const MAX_ARRAY_LENGTH = 0xffff_ffff
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER)

interface CraftCapacityBudget {
  eventIds: bigint
  npcIds: bigint
  directorIds: bigint
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function safeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function canonicalExperience(exp: unknown, level: unknown, threshold: number): boolean {
  return safeCount(exp) && Number.isSafeInteger(level) && (level as number) >= 1
    && (exp as number) < (level as number) * threshold
}

/**
 * Bound every emit reachable from this craft before generation mutates RNG or state.
 * A craft may emit two XP levels, every missing life identity, a masterpiece identity,
 * one reputation tier, and its completion. Each crossing day can also mature every crop.
 * Per day, characters can each die once; every NPC can emit a visitor departure, a death,
 * a career milestone, and one general plus one job-skill XP level. Fixed daily sources are
 * new year (1), settlement growth (2), immigration/birth (2), threat increase (1), boss
 * spawn/injury/dungeon threat (3), living events (3), regional-crisis phase/resolution (2), up to three
 * crisis-injury events, and one zero-population relief immigrant,
 * plus each warning and party slot.
 * Daily simulation can allocate up to four NPC IDs (immigration, birth, traveler, crisis relief) and four
 * living-director IDs (medicine request/news or arc request/news) per crossed day.
 */
function craftCapacityBudget(state: GameState, character: GameState['characters'][number], endTime: number): CraftCapacityBudget | null {
  if (!canonicalExperience(character.exp, character.level, 30)
    || !canonicalExperience(character.skills.smithing.exp, character.skills.smithing.level, 20)) return null

  const dayCount = Math.floor(endTime / CONFIG.minutesPerDay) - Math.floor(state.worldTime / CONFIG.minutesPerDay)
  let budget = BigInt(state.crops.length)
    + 2n // general and Smithing level-up events
    + BigInt(Object.keys(IDENTITY_RULES).length) // recordLifeAction may form any currently missing identity
    + 3n // masterpiece identity, reputation tier, and craft completion
  if (dayCount <= 0) return { eventIds: budget, npcIds: 0n, directorIds: 0n }

  // Daily NPC XP emits at most one general and one job-skill event for canonical saves.
  // Check the same XP invariant enforced by save validation before relying on that bound.
  for (const npc of state.npcs) {
    const skillId = JOBS[npc.job]?.skill
    const skill = skillId && record(npc.skills) ? npc.skills[skillId] : undefined
    if (!skillId || !canonicalExperience(npc.exp, npc.level, 30)
      || !record(skill) || !canonicalExperience(skill.exp, skill.level, 20)) return null
  }

  const days = BigInt(dayCount)
  const npcCount = BigInt(state.npcs.length)
  const characterCount = BigInt(state.characters.length)
  const partyCount = BigInt(state.party.length)
  // A daily living event can add one traveler; settlement can add an immigrant and a child,
  // and a zero-population crisis recovery can add one adult. Their later daily events are budgeted too.
  const npcDays = days * npcCount + 4n * days * (days - 1n) / 2n
  const fixedDailyEvents = 18n + BigInt(BOSS.warnings.length) + partyCount
  budget += days * (characterCount + fixedDailyEvents) + 5n * npcDays
  return { eventIds: budget, npcIds: 4n * days, directorIds: 4n * days }
}

function catalogKey<T extends object>(catalog: T, value: unknown): value is keyof T & string {
  return typeof value === 'string' && Object.hasOwn(catalog, value)
}

function ownedHomeStatus(state: GameState | null, characterId: string | undefined): { invalid: boolean; nearby: boolean } {
  if (!state || !characterId) return { invalid: false, nearby: false }
  if (!record(state.life) || !Array.isArray(state.life.properties) || !state.life.properties.every(record)) {
    return { invalid: true, nearby: false }
  }
  const homes = state.life.properties.filter(property => property.ownerId === characterId && property.kind === 'home')
  if (homes.length > 1) return { invalid: true, nearby: false }
  const home = homes[0]
  if (!home) return { invalid: false, nearby: false }
  const position = home.position
  if (typeof home.id !== 'string' || home.id.length < 1 || home.id.length > 128
    || !safeCount(home.acquiredAt) || home.acquiredAt > state.worldTime
    || !record(position) || !safeCount(position.x) || !safeCount(position.y)
    || !Array.isArray(state.tiles)) return { invalid: true, nearby: false }
  const tile = state.tiles.find(candidate => record(candidate) && candidate.x === position.x && candidate.y === position.y)
  if (!tile || tile.walkable !== true) return { invalid: true, nearby: false }
  const character = state.characters.find(candidate => candidate.id === characterId)
  const characterPosition = character?.position
  if (!record(characterPosition) || !safeCount(characterPosition.x) || !safeCount(characterPosition.y)) {
    return { invalid: true, nearby: false }
  }
  return {
    invalid: false,
    nearby: Math.abs(characterPosition.x - position.x) + Math.abs(characterPosition.y - position.y) <= 1,
  }
}

function validIdentityState(value: unknown, worldTime: number): boolean {
  if (!record(value)) return false
  const identityIds = ['resident', ...Object.keys(IDENTITY_RULES)]
  if (!Array.isArray(value.identities) || value.identities.length < 1 || value.identities.length > identityIds.length
    || !value.identities.every(identity => typeof identity === 'string' && identityIds.includes(identity))
    || new Set(value.identities).size !== value.identities.length
    || typeof value.reputation !== 'number' || !Number.isFinite(value.reputation)
    || value.reputation < REPUTATION_BOUNDS.min || value.reputation > REPUTATION_BOUNDS.max
    || !Array.isArray(value.reputationHistory) || value.reputationHistory.length > IDENTITY_LIMITS.reputationHistory
    || !value.reputationHistory.every(entry => record(entry) && Object.keys(entry).length === 3
      && Object.hasOwn(entry, 'at') && Object.hasOwn(entry, 'delta') && Object.hasOwn(entry, 'reason')
      && safeCount(entry.at) && entry.at <= worldTime
      && typeof entry.delta === 'number' && Number.isFinite(entry.delta) && entry.delta >= -200 && entry.delta <= 200
      && typeof entry.reason === 'string' && entry.reason.length >= 1 && entry.reason.length <= 500)) return false
  return true
}

function blankContext(recipeId: CraftRecipeId | null, state: GameState | null, influenceMaterial: MaterialId | null = null): CraftPlanContext {
  const recipe = recipeId ? CRAFTING_RECIPES[recipeId] : undefined
  const character = state && Array.isArray(state.characters)
    ? state.characters.find(candidate => candidate.id === state.activeCharacterId)
    : undefined
  const worldTime = state && Number.isSafeInteger(state.worldTime) && state.worldTime >= 0 ? state.worldTime : null
  const hour = worldTime === null ? null : calendar(worldTime).hour
  const homeStatus = recipe?.station === 'store' ? ownedHomeStatus(state, character?.id) : { invalid: false, nearby: false }
  const usesHome = recipe?.station === 'store' && homeStatus.nearby
  const site = recipe ? usesHome ? 'home' : recipe.station : null
  const building = recipe && !usesHome ? BUILDINGS[recipe.station] : undefined
  const built = usesHome || (!!recipe && Array.isArray(state?.settlement?.buildings) && state.settlement.buildings.includes(recipe.station))
  const nearby = usesHome || (!!building && !!character && record(character.position)
    && Number.isSafeInteger(character.position.x) && Number.isSafeInteger(character.position.y)
    && Math.abs(character.position.x - building.position.x) + Math.abs(character.position.y - building.position.y) <= 1)
  const opensAtHour = usesHome ? 0 : recipe?.opensAtHour ?? null
  const closesAtHour = usesHome ? 24 : recipe?.closesAtHour ?? null
  const open = !!recipe && hour !== null && opensAtHour !== null && closesAtHour !== null && hour >= opensAtHour && hour < closesAtHour
  const stationAvailable = built && nearby && open
  const alive = character?.isAlive === true
  const inCombat = state?.combat !== null
  const inDungeon = state?.dungeon?.inDungeon === true
  const accessAvailable = alive && !inCombat && !inDungeon && stationAvailable
  const skillValue = character && record(character.skills) && record(character.skills.smithing)
    && safeCount(character.skills.smithing.level) ? character.skills.smithing.level : null
  const skillUnlocked = !!recipe && skillValue !== null && skillValue >= recipe.requiredSmithing
  const masterpieceEligible = !!recipe?.masterpieceRules && skillValue !== null
    && skillValue >= recipe.masterpieceRules.requiredSmithing
  const practiceCap = recipe?.practiceCap ?? null
  const graduated = practiceCap !== null && skillValue !== null && skillValue >= practiceCap
  const quality = recipe
    ? craftQualityProfile(recipe.id, skillValue)
    : { floor: null, rarityWeights: Object.fromEntries(Object.values(RARITIES).map(definition => [definition.id, definition.weight])) as Record<RarityId, number>,
      nextFloor: null, nextFloorAtSmithing: null }
  const goldValue = character && safeCount(character.gold) ? character.gold : null
  const staminaValue = character && safeCount(character.stamina) ? character.stamina : null
  const plannedInputs: CraftingInput[] = recipe ? [
    ...recipe.inputs,
    ...(influenceMaterial && recipe.allowedBiasMaterials.includes(influenceMaterial)
      ? [{ source: 'material' as const, materialId: influenceMaterial, amount: 1 }]
      : []),
  ] : []
  const inputs: CraftInputPreview[] = plannedInputs.map(input => ({
    ...input,
    required: input.amount,
    current: currentInput(state, character?.id, character, input),
  }))
  return {
    recipeId: recipe?.id ?? null,
    influenceMaterial,
    output: recipe ? {
      baseId: recipe.outputBase,
      name: ITEM_BASES[recipe.outputBase].name,
      level: recipe.outputLevel,
      slot: ITEM_BASES[recipe.outputBase].slot,
    } : null,
    inputs,
    gold: { required: recipe ? usesHome ? Math.max(3, recipe.goldCost - 1) : recipe.goldCost : null, current: goldValue },
    stamina: { required: recipe?.staminaCost ?? null, current: staminaValue },
    durationMinutes: recipe?.durationMinutes ?? null,
    skill: { id: 'smithing', required: recipe?.requiredSmithing ?? null, current: skillValue, unlocked: skillUnlocked },
    practice: { xpAward: practiceCap !== null && skillUnlocked && !graduated ? 10 : 0,
      capLevel: practiceCap, graduated },
    masterpiece: recipe?.masterpieceRules
      ? { requiredSmithing: recipe.masterpieceRules.requiredSmithing, eligible: masterpieceEligible,
        chance: masterpieceEligible ? recipe.masterpieceRules.chance : 0 }
      : { requiredSmithing: null, eligible: false, chance: 0 },
    quality,
    station: {
      id: recipe?.station ?? null,
      site,
      opensAtHour,
      closesAtHour,
      built,
      nearby,
      open,
      available: stationAvailable,
    },
    access: { alive, inCombat, inDungeon, available: accessAvailable },
  }
}

function currentInput(
  state: GameState | null,
  ownerId: string | undefined,
  character: GameState['characters'][number] | undefined,
  input: CraftingInput,
): number | null {
  if (!state || !ownerId) return null
  if (input.source === 'inventory') {
    if (!character || !record(character.inventory)) return null
    const value = character.inventory[input.itemId]
    return safeCount(value) ? value : null
  }
  if (!record(state.reward) || !record(state.reward.materials)) return null
  const counts = state.reward.materials[ownerId]
  if (counts === undefined) return 0
  if (!record(counts)) return null
  const value = counts[input.materialId]
  return safeCount(value) ? value : null
}

function fail(reasonCode: CraftFailureReasonCode): { ok: false; reasonCode: CraftFailureReasonCode; message: string } {
  const messages: Record<CraftFailureReasonCode, string> = {
    invalid_request: '鍛造配方資料無效。',
    unknown_recipe: '沒有這項鍛造配方。',
    world_state_invalid: '目前世界資料無法進行鍛造。',
    character_missing: '找不到目前角色。',
    dead: '角色離世後無法鍛造。',
    in_combat: '戰鬥中無法鍛造。',
    in_dungeon: '礦坑內無法鍛造。',
    station_unavailable: '這項配方的工作台尚未開放。',
    too_far: '請靠近雜貨店工作台。',
    station_closed: '工作台目前未營業，請於 08:00–18:00 前往。',
    skill_required: '鍛造熟練度不足。',
    materials_required: '鍛造材料不足。',
    material_not_allowed: '這項配方不能使用所選的影響素材。',
    gold_required: '金幣不足。',
    stamina_required: '體力不足，請先休息。',
    time_overflow: '世界時間已達安全上限。',
    event_capacity: '世界紀錄已達安全上限。',
    item_capacity: '物品清單已達安全上限。',
  }
  return { ok: false, reasonCode, message: messages[reasonCode] }
}

function parsedRequest(request: unknown): { valid: boolean; recipeId: CraftRecipeId | null; influenceMaterial: MaterialId | null } {
  if (!record(request) || !Object.hasOwn(request, 'recipeId')
    || Object.keys(request).some(key => key !== 'recipeId' && key !== 'influenceMaterial')
    || typeof request.recipeId !== 'string') return { valid: false, recipeId: null, influenceMaterial: null }
  let influenceMaterial: MaterialId | null = null
  if (Object.hasOwn(request, 'influenceMaterial')) {
    if (request.influenceMaterial !== null && !catalogKey(MATERIALS, request.influenceMaterial)) {
      return { valid: false, recipeId: null, influenceMaterial: null }
    }
    influenceMaterial = request.influenceMaterial as MaterialId | null
  }
  if (!Object.hasOwn(CRAFTING_RECIPES, request.recipeId)) return { valid: true, recipeId: null, influenceMaterial }
  return { valid: true, recipeId: request.recipeId as CraftRecipeId, influenceMaterial }
}

function stateFailure(state: GameState, context: CraftPlanContext): CraftFailureReasonCode | null {
  if (!Array.isArray(state.characters) || typeof state.activeCharacterId !== 'string') return 'world_state_invalid'
  const character = state.characters.find(candidate => candidate.id === state.activeCharacterId)
  if (!character) return 'character_missing'
  if (character.isAlive !== true) return 'dead'
  if (state.combat !== null) return 'in_combat'
  if (!state.dungeon || state.dungeon.inDungeon !== false) return 'in_dungeon'
  if (!Number.isSafeInteger(state.worldTime) || state.worldTime < 0) return 'world_state_invalid'
  if (!state.life || !record(state.life.director) || !record(state.life.characters) || !Array.isArray(state.life.properties) || !Array.isArray(state.history)
    || state.history.length > 20000 || !Array.isArray(state.events) || !Array.isArray(state.crops)
    || !Array.isArray(state.npcs) || !Array.isArray(state.party) || !record(character.inventory) || !record(character.skills)
    || !record(character.skills.smithing)) return 'world_state_invalid'
  if (ownedHomeStatus(state, character.id).invalid) return 'world_state_invalid'
  if (context.station.id === null || !context.station.built) return 'station_unavailable'
  if (!context.station.nearby) return 'too_far'
  if (!context.station.open) return 'station_closed'
  return null
}

function transactionFailure(state: GameState, context: CraftPlanContext): CraftFailureReasonCode | null {
  const recipe = context.recipeId ? CRAFTING_RECIPES[context.recipeId] : undefined
  const character = state.characters.find(candidate => candidate.id === state.activeCharacterId)
  if (!recipe || !character || !context.output) return 'world_state_invalid'
  if (context.skill.current === null || !safeCount(character.skills.smithing.level)) return 'world_state_invalid'
  if (character.skills.smithing.level < recipe.requiredSmithing) return 'skill_required'
  if (context.inputs.some(input => input.current === null)) return 'world_state_invalid'
  if (context.inputs.some(input => input.current! < input.required)) return 'materials_required'
  if (context.gold.current === null || context.stamina.current === null) return 'world_state_invalid'
  if (context.gold.required === null) return 'world_state_invalid'
  if (context.gold.current < context.gold.required) return 'gold_required'
  if (context.stamina.current < recipe.staminaCost) return 'stamina_required'

  const endTime = state.worldTime + recipe.durationMinutes
  if (!Number.isSafeInteger(state.worldTime) || !Number.isSafeInteger(endTime) || state.worldTime < 0) return 'time_overflow'
  if (!Number.isSafeInteger(state.eventSequence) || state.eventSequence < 0) return 'world_state_invalid'
  if (!state.reward || !Array.isArray(state.reward.instances) || !Number.isSafeInteger(state.reward.nextInstanceId)
    || state.reward.nextInstanceId < 1 || state.reward.nextInstanceId >= Number.MAX_SAFE_INTEGER - 1
    || state.reward.instances.length >= MAX_ARRAY_LENGTH
    || state.reward.instances.some(item => item.instanceId === `item-${state.reward.nextInstanceId}`)) return 'item_capacity'
  if (!state.reward.collection || !Array.isArray(state.reward.collection.bases) || !Array.isArray(state.reward.collection.rareBases)) {
    return 'world_state_invalid'
  }
  const characterLife = record(state.life.characters[character.id]) ? state.life.characters[character.id] : null
  if (!characterLife || !Array.isArray(characterLife.milestones) || characterLife.milestones.length > IDENTITY_LIMITS.milestones
    || characterLife.milestones.some(milestone => !record(milestone) || Object.keys(milestone).length !== 3
      || !Object.hasOwn(milestone, 'id') || !Object.hasOwn(milestone, 'at') || !Object.hasOwn(milestone, 'text')
      || typeof milestone.id !== 'string' || milestone.id.length < 1 || milestone.id.length > 128
      || typeof milestone.text !== 'string' || milestone.text.length < 1 || milestone.text.length > 500
      || !Number.isSafeInteger(milestone.at) || milestone.at < 0 || milestone.at > state.worldTime)
    || !validIdentityState(characterLife, state.worldTime)
    || !safeCount(character.gold) || !safeCount(character.stamina)
    || !Number.isSafeInteger(character.inventory.wood) || character.inventory.wood < 0
    || !Number.isSafeInteger(character.inventory.stone) || character.inventory.stone < 0
    || !safeCount(character.level) || character.level < 1
    || !canonicalExperience(character.exp, character.level, 30)
    || !Number.isSafeInteger(character.skills.smithing.level) || character.skills.smithing.level < 1
    || !Number.isSafeInteger(character.skills.smithing.exp) || character.skills.smithing.exp < 0
    || !canonicalExperience(character.skills.smithing.exp, character.skills.smithing.level, 20)
    || character.skills.smithing.exp > Number.MAX_SAFE_INTEGER - context.practice.xpAward
    || !Number.isSafeInteger(character.exp) || character.exp < 0 || character.exp > Number.MAX_SAFE_INTEGER - context.practice.xpAward
    || !record(state.life.characters[character.id]) || !record(state.life.characters[character.id].actions)
    || !safeCount(state.life.characters[character.id].actions.smithing)
    || state.life.characters[character.id].actions.smithing >= Number.MAX_SAFE_INTEGER
    || !Number.isSafeInteger(state.life.director.lastPlayerActivity) || state.life.director.lastPlayerActivity < 0) {
    return 'world_state_invalid'
  }
  const capacityBudget = craftCapacityBudget(state, character, endTime)
  if (capacityBudget === null) return 'world_state_invalid'
  if (BigInt(state.eventSequence) + capacityBudget.eventIds >= MAX_SAFE_INTEGER_BIGINT) return 'event_capacity'
  if (capacityBudget.npcIds > 0n) {
    if (!safeCount(state.nextNpcId) || state.nextNpcId < 1 || !safeCount(state.life.director.sequence)) return 'world_state_invalid'
    if (BigInt(state.nextNpcId) + capacityBudget.npcIds >= MAX_SAFE_INTEGER_BIGINT
      || BigInt(state.life.director.sequence) + capacityBudget.directorIds > MAX_SAFE_INTEGER_BIGINT) return 'event_capacity'
  }
  return null
}

function plan(state: GameState | null, request: unknown): CraftPlan {
  const parsed = parsedRequest(request)
  if (!parsed.valid) return { ...blankContext(null, state), ...fail('invalid_request') }
  if (!parsed.recipeId) return { ...blankContext(null, state, parsed.influenceMaterial), ...fail('unknown_recipe') }

  const context = blankContext(parsed.recipeId, state, parsed.influenceMaterial)
  if (parsed.influenceMaterial && !CRAFTING_RECIPES[parsed.recipeId].allowedBiasMaterials.includes(parsed.influenceMaterial)) {
    return { ...context, ...fail('material_not_allowed') }
  }
  if (!state) return { ...context, ...fail('world_state_invalid') }
  const accessFailure = stateFailure(state, context)
  if (accessFailure) return { ...context, ...fail(accessFailure) }
  const transactionProblem = transactionFailure(state, context)
  if (transactionProblem) return { ...context, ...fail(transactionProblem) }
  return { ...context, ok: true, reasonCode: null, message: null }
}

/** Read-only preview; all craft legality and costs come from this function. */
export function planCraft(state: GameState, request: CraftRequest): CraftPlan {
  return plan(state, request)
}

/** Execute one validated recipe through the shared item generator. */
export function craft(state: GameState, request: CraftRequest): CraftResult {
  const parsed = parsedRequest(request)
  const validation = plan(state, request)
  if (!validation.ok) return { ok: false, reasonCode: validation.reasonCode, message: validation.message }
  const minutes = parsed.valid && parsed.recipeId ? CRAFTING_RECIPES[parsed.recipeId].durationMinutes : undefined
  if (minutes !== undefined) preflightRegionalCrisisAction(state, minutes, preview => craftInternal(preview, request))
  return craftInternal(state, request, validation)
}

function craftInternal(state: GameState, request: CraftRequest, planned: CraftPlan = plan(state, request)): CraftResult {
  const result = planned
  if (!result.ok) return { ok: false, reasonCode: result.reasonCode, message: result.message }

  const recipe = CRAFTING_RECIPES[result.recipeId!]
  const character = state.characters.find(candidate => candidate.id === state.activeCharacterId)!
  const crafterId = character.id
  const startedAt = state.worldTime
  const item = generateItem(state, {
    baseId: recipe.outputBase,
    level: recipe.outputLevel,
    material: result.influenceMaterial,
    context: { kind: 'craft', recipeId: recipe.id },
  })
  for (const input of result.inputs) {
    if (input.source === 'inventory') character.inventory[input.itemId as CraftInventoryItemId] -= input.amount
    else state.reward.materials[character.id]![input.materialId] -= input.amount
  }
  character.gold -= result.gold.required!
  character.stamina -= recipe.staminaCost
  state.reward.instances.push(item)
  if (!state.reward.collection.bases.includes(item.baseId)) state.reward.collection.bases.push(item.baseId)
  if ((item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary')
    && !state.reward.collection.rareBases.includes(item.baseId)) state.reward.collection.rareBases.push(item.baseId)

  const masterpiece = item.craftProvenance?.masterpiece === true
  const importantCraft = masterpiece || item.rarity === 'legendary'
  if (masterpiece && awardIdentity(state, crafterId, 'masterpieceCrafter')) {
    changeReputation(state, 3, '首次鍛造傑作', crafterId)
  }
  if (importantCraft) {
    const life = state.life.characters[crafterId]!
    life.milestones.push({
      id: `craft:${item.instanceId}`,
      at: startedAt,
      text: masterpiece ? `鍛造傑作：${recipe.name}（${RARITIES[item.rarity].name}）` : `打造傳說裝備：${recipe.name}`,
    })
    if (life.milestones.length > IDENTITY_LIMITS.milestones) {
      life.milestones.splice(0, life.milestones.length - IDENTITY_LIMITS.milestones)
    }
  }

  simulate(state, recipe.durationMinutes)
  if (character.isAlive) {
    if (result.practice.xpAward > 0) gainExp(state, character, result.practice.xpAward, 'smithing')
    recordLifeAction(state, 'smithing')
  }
  state.life.director.lastPlayerActivity = state.worldTime
  emit(state, 'craft.completed', 'player', `打造完成：${RARITIES[item.rarity].name}${ITEM_BASES[item.baseId].name}${masterpiece ? '（鍛造傑作）' : ''}。`, importantCraft)
  return { ok: true, instanceId: item.instanceId, recipeId: recipe.id, baseId: item.baseId, masterpiece }
}
