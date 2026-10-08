import type {
  ContentBaselineIds, ContentBossRules, ContentCombatMechanic, ContentEquipment,
  ContentId, ContentLootTable, ContentMaterial, ContentMonster, ContentMonsterFamily,
  ContentPack, ContentRecipe, ContentSpawnPredicate,
} from '../domain/content'
import type { RegionId } from '../domain/types'

export interface ContentIssue {
  code: string
  message: string
  id?: ContentId
  ids?: ContentId[]
  reference?: ContentId
  path?: string
}

export interface SpawnWitness {
  region: RegionId
  regionAccess: 'already-accessible' | 'explore-to-unlock'
  playerLevel: number
  threatLevel: number
  settlementStage: 'hamlet' | 'village' | 'town'
  season: '春' | '夏' | '秋' | '冬'
  hour: number
  safety: number
}

export interface ContentValidationReport {
  errors: ContentIssue[]
  warnings: ContentIssue[]
  reachability: Array<{ contentId: ContentId; status: 'controlled-witness' | 'unreachable'; witness?: SpawnWitness }>
  /** Controlled predicate satisfiability is not an estimate of normal-play frequency. */
  naturalExposure: 'not-measured'
  cropGoodEvidence: 'declared-food-binding-only-runtime-integration-unverified'
  saveCompatibility: 'stable-id-addition-only-runtime-migration-unverified'
  identityAxes: Record<ContentId, readonly ('combat' | 'loot' | 'world')[]>
  qualifyingMonsterIds: ContentId[]
  qualityCounts: { qualifyingNewMonsters: number; usableNewItems: number; usableNewMaterials: number }
  baseline: { exactMonsterIds: number; exactBossVariantIds: number; exactItemIds: number; excludedLegacyMonsterIds: number; excludedLegacyItemIds: number; excludedProceduralIds: number }
}

type UnknownRecord = Record<string, unknown>
const catalogs = ['families', 'monsters', 'lootTables', 'equipment', 'materials', 'crops', 'cropGoods', 'recipes', 'affixes'] as const
type Catalog = typeof catalogs[number]
const baselineKey: Record<Catalog, keyof ContentBaselineIds> = {
  families: 'familyIds', monsters: 'monsterIds', lootTables: 'lootTableIds', equipment: 'equipmentIds',
  materials: 'materialIds', crops: 'cropIds', cropGoods: 'materialIds', recipes: 'recipeIds', affixes: 'affixIds',
}
const emptyBaseline: ContentBaselineIds = {
  familyIds: [], monsterIds: [], bossVariantIds: [], lootTableIds: [], equipmentIds: [], materialIds: [], cropIds: [], baselineAffixSlots: [],
  recipeIds: [], affixIds: [], excludedLegacyMonsterIds: [], excludedLegacyItemIds: [], excludedProceduralIds: [],
}
const regions: RegionId[] = ['village', 'farmland', 'forest', 'mine', 'unknown']
const seasons = ['春', '夏', '秋', '冬'] as const
const stages = ['hamlet', 'village', 'town'] as const
const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
const gearStats = ['attack', 'defense', 'critical', 'penetration', 'bleed', 'block', 'reduction'] as const

const isRecord = (v: unknown): v is UnknownRecord => typeof v === 'object' && v !== null && !Array.isArray(v)
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const asArray = (v: unknown): unknown[] => Array.isArray(v) ? v : []
const text = (value: unknown): boolean => isRecord(value) && nonEmpty(value['zh-TW'])
const stable = (v: unknown): string => JSON.stringify(sortDeep(v))
function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep)
  if (!isRecord(v)) return v
  return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortDeep(v[k])]))
}
function signature<T>(value: T): string { return stable(value) }
function unique<T>(values: readonly T[]): T[] { return [...new Set(values)] }

/** Validates one authoring batch without mutating data or consulting runtime registries. */
export function validateContentPack(input: unknown, baseline: ContentBaselineIds = emptyBaseline): ContentValidationReport {
  const errors: ContentIssue[] = []
  const warnings: ContentIssue[] = []
  const reachability: ContentValidationReport['reachability'] = []
  const hasErrors = (id: string) => errors.some(issue => issue.id === id)
  const identityAxes: Record<ContentId, readonly ('combat' | 'loot' | 'world')[]> = {}
  const empty: ContentValidationReport = {
    errors, warnings, reachability, naturalExposure: 'not-measured', cropGoodEvidence: 'declared-food-binding-only-runtime-integration-unverified',
    saveCompatibility: 'stable-id-addition-only-runtime-migration-unverified', identityAxes,
    qualifyingMonsterIds: [], qualityCounts: { qualifyingNewMonsters: 0, usableNewItems: 0, usableNewMaterials: 0 },
    baseline: { exactMonsterIds: 0, exactBossVariantIds: 0, exactItemIds: 0, excludedLegacyMonsterIds: baseline.excludedLegacyMonsterIds?.length ?? 0,
      excludedLegacyItemIds: baseline.excludedLegacyItemIds?.length ?? 0, excludedProceduralIds: baseline.excludedProceduralIds?.length ?? 0 },
  }
  if (!isRecord(input) || catalogs.some(k => !Array.isArray(input[k]))) {
    errors.push({ code: 'invalid-schema', message: 'Content pack must provide all nine catalog arrays.' })
    return empty
  }
  const pack = input as unknown as ContentPack
  const list = (key: Catalog): readonly UnknownRecord[] => asArray(pack[key]).filter(isRecord)
  for (const key of catalogs) {
    asArray(input[key]).forEach((row, index) => {
      if (!isRecord(row) || !nonEmpty(row.id)) errors.push({ code: 'invalid-schema', path: `${key}[${index}]`, message: 'Catalog entry requires a non-empty string ID and object shape.' })
      if (isRecord(row)) validateFiniteTree(row, `${key}[${index}]`, errors)
    })
  }
  if (errors.some(issue => issue.code === 'invalid-schema')) return empty
  const rows = Object.fromEntries(catalogs.map(k => [k, list(k)])) as Record<Catalog, readonly UnknownRecord[]>
  const ids = new Map<Catalog, Set<ContentId>>()
  for (const key of catalogs) {
    const namespace = key === 'cropGoods' ? 'materials' : key
    const seen = ids.get(namespace) ?? new Set<ContentId>()
    const baselineScope = baseline[baselineKey[key]] as readonly ContentId[]
    const sameScopeBaseIds = new Set(baselineScope ?? [])
    if (namespace === 'monsters') for (const legacyId of baseline.excludedLegacyMonsterIds ?? []) sameScopeBaseIds.add(legacyId)
    if (['equipment', 'materials', 'cropGoods'].includes(key)) {
      for (const legacyId of baseline.excludedLegacyItemIds) sameScopeBaseIds.add(legacyId)
      for (const proceduralId of baseline.excludedProceduralIds) sameScopeBaseIds.add(proceduralId)
    }
    for (const row of rows[key]) {
      if (!nonEmpty(row.id)) continue
      const id = row.id
      if (seen.has(id)) errors.push({ code: 'duplicate-id', id, message: `ID is duplicated within the ${namespace} namespace.` })
      else seen.add(id)
      if (sameScopeBaseIds.has(id)) errors.push({ code: 'baseline-id-collision', id, message: `ID already exists in the exact ${namespace} baseline and cannot count as new.` })
    }
    ids.set(namespace, seen)
  }
  const baselineBossVariants = new Set(baseline.bossVariantIds)
  const seenBossVariants = new Set<string>()
  for (const monster of rows.monsters) if (isRecord(monster.bossRules)) for (const variant of asArray(monster.bossRules.variants)) if (isRecord(variant) && nonEmpty(variant.id)) {
    if (seenBossVariants.has(variant.id)) {
      errors.push({ code: 'duplicate-id', id: variant.id, message: 'Boss variant ID is duplicated within the boss-variant namespace.' })
      if (nonEmpty(monster.id)) errors.push({ code: 'invalid-boss-classification', id: monster.id, reference: variant.id, message: 'Boss contains a duplicate variant ID.' })
    }
    else seenBossVariants.add(variant.id)
    if (baselineBossVariants.has(variant.id)) {
      errors.push({ code: 'baseline-id-collision', id: variant.id, message: 'Boss variant ID already exists in the exact baseline and cannot count as new.' })
      if (nonEmpty(monster.id)) errors.push({ code: 'invalid-boss-classification', id: monster.id, reference: variant.id, message: 'Boss variant ID collides with an existing definition.' })
    }
  }

  const byId = (key: Catalog) => new Map(rows[key].filter(r => nonEmpty(r.id)).map(r => [r.id as string, r]))
  const familyMap = byId('families'), monsterMap = byId('monsters'), lootMap = byId('lootTables')
  const equipmentMap = byId('equipment'), materialMap = byId('materials'), cropMap = byId('crops')
  const cropGoodMap = byId('cropGoods'), recipeMap = byId('recipes'), affixMap = byId('affixes')
  const all = (key: keyof ContentBaselineIds, map: Map<string, UnknownRecord>) => new Set([...(baseline[key] as readonly string[] ?? []), ...map.keys()])
  const known = {
    family: all('familyIds', familyMap), monster: all('monsterIds', monsterMap), loot: all('lootTableIds', lootMap),
    equipment: all('equipmentIds', equipmentMap), material: all('materialIds', new Map([...materialMap, ...cropGoodMap])),
    crop: all('cropIds', cropMap), recipe: all('recipeIds', recipeMap), affix: all('affixIds', affixMap),
  }
  const ref = (id: unknown, set: Set<string>, owner: string, path: string) => {
    if (!nonEmpty(id) || !set.has(id)) errors.push({ code: 'unknown-reference', id: owner, reference: nonEmpty(id) ? id : undefined, path, message: `Reference ${String(id)} does not resolve.` })
  }
  const requireText = (record: UnknownRecord, field: string, owner: string) => { if (!text(record[field])) errors.push({ code: 'incomplete-localization', id: owner, path: field, message: `zh-TW ${field} must be non-empty.` }) }
  for (const key of catalogs) for (const row of rows[key]) {
    const owner = nonEmpty(row.id) ? row.id : key
    for (const field of ['name', 'description']) if (field in row) requireText(row, field, owner)
    else if (['families', 'monsters', 'equipment', 'materials', 'crops', 'cropGoods', 'recipes', 'affixes'].includes(key)) errors.push({ code: 'incomplete-localization', id: owner, path: field, message: `Missing localized ${field}.` })
  }

  // Core finite/range and reference checks.
  for (const row of rows.families) {
    const id = row.id as string
    for (const field of ['regions', 'spawnProfiles', 'monsterIds', 'eliteIds', 'miniBossIds', 'bossIds']) if (!Array.isArray(row[field])) errors.push({ code: 'invalid-schema', id, path: field, message: `${field} must be an array.` })
    if (row.threatChannel !== 'regional_ecology') errors.push({ code: 'invalid-threat-channel', id, message: 'Phase 7 families must use regional_ecology.' })
    ref(row.lootTableId, known.loot, id, 'lootTableId')
    const rawFamilyRegions = asArray(row.regions)
    if (!rawFamilyRegions.length || rawFamilyRegions.some(r => !regions.includes(r as RegionId))) errors.push({ code: 'invalid-region', id, message: 'Family must declare known region compatibility.' })
    const familyRegions = new Set(rawFamilyRegions.filter((r): r is RegionId => regions.includes(r as RegionId)))
    validatePredicates(row.spawnProfiles, id, 'family', familyRegions, errors, reachability)
    const pools = [['monsterIds', 'normal'], ['eliteIds', 'elite'], ['miniBossIds', 'miniBoss'], ['bossIds', 'boss']] as const
    const used = new Set<string>()
    for (const [field, rank] of pools) for (const member of asArray(row[field])) {
      ref(member, known.monster, id, field)
      if (typeof member !== 'string') continue
      if (used.has(member)) errors.push({ code: 'duplicate-family-member', id, reference: member, message: 'A monster appears in more than one family rank pool.' })
      used.add(member)
      const target = monsterMap.get(member)
      if (target && (target.familyId !== id || target.rank !== rank)) errors.push({ code: 'family-rank-mismatch', id, reference: member, message: `Family ${field} membership disagrees with monster family/rank.` })
    }
  }
  for (const row of rows.monsters) {
    const id = row.id as string
    ref(row.familyId, known.family, id, 'familyId'); ref(row.lootTableId, known.loot, id, 'lootTableId')
    const family = familyMap.get(String(row.familyId))
    if (family && row.lootTableId !== family.lootTableId) errors.push({ code: 'family-loot-mismatch', id, message: 'Monster loot table must match its family table.' })
    const rank = row.rank
    if (!['normal', 'elite', 'miniBoss', 'boss'].includes(String(rank))) errors.push({ code: 'invalid-rank', id, message: 'Unknown monster rank.' })
    if (!positive(row.level) || !Number.isInteger(row.level)) errors.push({ code: 'invalid-range', id, path: 'level', message: 'Level must be a positive integer.' })
    const stats = isRecord(row.stats) ? row.stats : {}
    const maxima: Record<string, number> = { hp: 10000, attack: 1000, defense: 1000, exp: 1_000_000, gold: 1_000_000 }
    for (const key of ['hp', 'attack', 'defense', 'exp', 'gold']) {
      if (!finite(stats[key])) errors.push({ code: 'invalid-schema', id, path: `stats.${key}`, message: `${key} must be a finite number.` })
      else if (stats[key] < 0 || (key === 'hp' && stats[key] < 1) || stats[key] > maxima[key] || (!['hp', 'attack', 'defense'].includes(key) && !Number.isInteger(stats[key]))) errors.push({ code: 'invalid-range', id, path: `stats.${key}`, message: `${key} is outside its legal range.` })
    }
    if (!['fast', 'bruiser', 'controller'].includes(String(row.role))) errors.push({ code: 'invalid-role', id, message: 'Unknown monster combat role.' })
    if (!Array.isArray(row.mechanics)) errors.push({ code: 'invalid-schema', id, path: 'mechanics', message: 'Monster mechanics must be an array, including when empty.' })
    const regionsForMonster = new Set(asArray(family?.regions).filter((r): r is RegionId => regions.includes(r as RegionId)))
    if (row.bossRules !== undefined && row.rank !== 'boss') errors.push({ code: 'invalid-boss-classification', id, message: 'Only bosses may define bossRules.' })
    if (row.rank === 'boss' && !isRecord(row.bossRules)) errors.push({ code: 'invalid-boss-classification', id, message: 'Boss requires bossRules.' })
    if (isRecord(row.bossRules)) {
      validateBossRules(row.bossRules as unknown as ContentBossRules, id, known.material, known.equipment, errors)
      for (const variant of asArray(row.bossRules.variants)) if (isRecord(variant) && variant.spawnProfiles !== undefined && family) {
        const familyProfiles = asArray(family.spawnProfiles).filter(isRecord) as unknown as ContentSpawnPredicate[]
        const baseProfiles = row.spawnProfiles === undefined ? familyProfiles : intersectProfiles(familyProfiles, asArray(row.spawnProfiles).filter(isRecord) as unknown as ContentSpawnPredicate[])
        const combined = intersectProfiles(baseProfiles, asArray(variant.spawnProfiles).filter(isRecord) as unknown as ContentSpawnPredicate[])
        validatePredicates(combined, nonEmpty(variant.id) ? variant.id : id, 'boss variant', regionsForMonster, errors, reachability)
      }
    }
    validateMechanics(row.mechanics, id, errors)
    validateLootProfile(row.lootProfile, id, errors)
    if (family) {
      const familyProfiles = asArray(family.spawnProfiles).filter(isRecord) as unknown as ContentSpawnPredicate[]
      if (row.spawnProfiles === undefined) validatePredicates(familyProfiles, id, 'monster', regionsForMonster, errors, reachability)
      else {
        // Validate authored bounds first, then prove the conjunction with family conditions.
        validatePredicates(row.spawnProfiles, id, 'monster', regionsForMonster, errors, reachability)
        reachability.pop()
        const combined = intersectProfiles(familyProfiles, asArray(row.spawnProfiles).filter(isRecord) as unknown as ContentSpawnPredicate[])
        validatePredicates(combined, id, 'monster', regionsForMonster, errors, reachability)
      }
    }
  }
  for (const row of rows.monsters) {
    const familyId = String(row.familyId)
    const family = familyMap.get(familyId)
    if (family && ![
      ...asArray(family.monsterIds), ...asArray(family.eliteIds), ...asArray(family.miniBossIds), ...asArray(family.bossIds),
    ].includes(row.id)) errors.push({ code: 'missing-family-membership', id: String(row.id), reference: familyId, message: 'Every monster must appear in exactly one rank pool of its family.' })
  }
  const hasReachableMember = (family: UnknownRecord) => [family.monsterIds, family.eliteIds, family.miniBossIds, family.bossIds].some(pool => asArray(pool).some(member => typeof member === 'string' && !hasErrors(member) && reachability.some(w => w.contentId === member && w.status === 'controlled-witness')))
  const familyReachableLoot = new Set(rows.families.filter(f => nonEmpty(f.id) && !hasErrors(f.id) && hasReachableMember(f)).map(row => row.lootTableId).filter((v): v is string => typeof v === 'string'))
  const equipmentDropEnabled = new Set(rows.monsters.filter(row => nonEmpty(row.id) && !hasErrors(row.id) && reachability.some(w => w.contentId === row.id && w.status === 'controlled-witness') && isRecord(row.lootProfile) && finite(row.lootProfile.equipmentChance) && row.lootProfile.equipmentChance > 0).map(row => row.lootTableId).filter((v): v is string => typeof v === 'string'))
  for (const row of rows.lootTables) {
    const id = row.id as string
    for (const field of ['guaranteedMaterialIds', 'weightedEquipment', 'rareMaterials']) if (!Array.isArray(row[field])) errors.push({ code: 'invalid-schema', id, path: field, message: `${field} must be an array.` })
    for (const m of asArray(row.guaranteedMaterialIds)) ref(m, known.material, id, 'guaranteedMaterialIds')
    for (const [index, entry] of asArray(row.rareMaterials).entries()) if (!isRecord(entry)) {
      errors.push({ code: 'invalid-schema', id, path: `rareMaterials[${index}]`, message: 'Rare material entries must be objects.' })
    } else {
      ref(entry.materialId, known.material, id, 'rareMaterials.materialId')
      if (!inUnit(entry.chance)) errors.push({ code: 'invalid-range', id, path: 'rareMaterials.chance', message: 'Drop chance must be in [0,1].' })
    }
    let weightSum = 0
    for (const [index, entry] of asArray(row.weightedEquipment).entries()) if (!isRecord(entry)) {
      errors.push({ code: 'invalid-schema', id, path: `weightedEquipment[${index}]`, message: 'Weighted equipment entries must be objects.' })
    } else {
      ref(entry.equipmentId, known.equipment, id, 'weightedEquipment.equipmentId')
      if (!finite(entry.weight) || entry.weight <= 0) errors.push({ code: 'invalid-range', id, path: 'weightedEquipment.weight', message: 'Loot weights must be finite and positive.' })
      else weightSum += entry.weight
    }
    if (asArray(row.weightedEquipment).length > 0 && (!finite(weightSum) || weightSum <= 0)) errors.push({ code: 'invalid-range', id, path: 'weightedEquipment', message: 'Weighted equipment must have a finite positive total.' })
  }
  for (const row of rows.equipment) {
    const id = row.id as string
    if (!Array.isArray(row.affixIds)) errors.push({ code: 'invalid-schema', id, path: 'affixIds', message: 'Equipment affixIds must be an array.' })
    for (const key of ['attack', 'defense', 'sell']) if (!finite(row[key])) errors.push({ code: 'invalid-schema', id, path: key, message: `${key} must be a finite number.` })
    if (!['weapon', 'armor'].includes(String(row.slot))) errors.push({ code: 'invalid-slot', id, message: 'Unknown equipment slot.' })
    const maxima: Record<string, number> = { attack: 500, defense: 500, sell: 1_000_000, penetration: 100 }
    for (const key of ['attack', 'defense', 'sell', 'penetration']) if (key in row && (!finite(row[key]) || row[key] < 0 || row[key] > maxima[key])) errors.push({ code: 'invalid-range', id, path: key, message: `${key} is outside the legal range.` })
    for (const a of asArray(row.affixIds)) {
      ref(a, known.affix, id, 'affixIds')
      const affix = affixMap.get(String(a))
      const baselineAffix = baseline.baselineAffixSlots.find(entry => entry.id === a)
      const slots = affix ? asArray(affix.slots) : baselineAffix?.slots ?? []
      if ((affix || baselineAffix) && !slots.some(slot => slot === row.slot)) errors.push({ code: 'affix-ineligible', id, reference: String(a), message: 'Affix is not eligible for this equipment slot.' })
      else if (!affix && !baselineAffix && baseline.affixIds.includes(String(a))) errors.push({ code: 'missing-baseline-affix-metadata', id, reference: String(a), message: 'Baseline affix slot metadata is required to prove equipment eligibility.' })
    }
  }
  for (const row of rows.affixes) {
    const id = row.id as string
    if (!gearStats.includes(row.stat as typeof gearStats[number])) errors.push({ code: 'invalid-affix-stat', id, message: 'Affix stat is not consumed by gear generation.' })
    if (!asArray(row.slots).length || asArray(row.slots).some(s => !['weapon', 'armor'].includes(String(s)))) errors.push({ code: 'invalid-slot', id, message: 'Affix requires known eligible slots.' })
    const tiers = asArray(row.tiers)
    if (!tiers.length || tiers.some(t => !finite(t) || t <= 0 || t > 10 || !Number.isInteger(t)) || new Set(tiers).size !== tiers.length) errors.push({ code: 'invalid-range', id, path: 'tiers', message: 'Affix tiers must be unique integers from 1 through 10.' })
  }
  const sourcedMaterials = new Set<string>()
  const usableEquipment = new Set<string>()
  for (const table of rows.lootTables) if (familyReachableLoot.has(String(table.id)) && !hasErrors(String(table.id))) {
    for (const id of asArray(table.guaranteedMaterialIds)) if (typeof id === 'string' && materialMap.has(id)) sourcedMaterials.add(id)
    for (const entry of asArray(table.rareMaterials)) if (isRecord(entry) && finite(entry.chance) && entry.chance > 0 && typeof entry.materialId === 'string' && materialMap.has(entry.materialId)) sourcedMaterials.add(entry.materialId)
    if (equipmentDropEnabled.has(String(table.id))) for (const entry of asArray(table.weightedEquipment)) if (isRecord(entry) && finite(entry.weight) && entry.weight > 0 && typeof entry.equipmentId === 'string' && equipmentMap.has(entry.equipmentId)) usableEquipment.add(entry.equipmentId)
  }
  for (const monster of rows.monsters) if (monster.rank === 'boss' && isRecord(monster.bossRules) && nonEmpty(monster.id) && !hasErrors(monster.id) && reachability.some(w => w.contentId === monster.id && w.status === 'controlled-witness') && familyReachableLoot.has(String(monster.lootTableId))) {
    for (const material of asArray(monster.bossRules.guaranteedMaterialIds)) if (typeof material === 'string' && materialMap.has(material)) sourcedMaterials.add(material)
    const exclusive = monster.bossRules.exclusiveEquipmentId
    if (typeof exclusive === 'string' && equipmentMap.has(exclusive)) usableEquipment.add(exclusive)
  }
  for (const row of rows.crops) {
    const id = row.id as string
    if (!asArray(row.regions).length || asArray(row.regions).some(r => !regions.includes(r as RegionId))) errors.push({ code: 'invalid-region', id, message: 'Crop must declare known harvest regions.' })
    if (!asArray(row.seasons).length || asArray(row.seasons).some(s => !seasons.includes(s as typeof seasons[number]))) errors.push({ code: 'invalid-season', id, message: 'Crop must declare supported seasons.' })
    if (!positiveIntegerIn(row.growthMinutes, 43200) || !positiveIntegerIn(row.harvestAmount, 100)) errors.push({ code: 'invalid-range', id, message: 'Crop growth must be 1 through 43200 whole minutes and harvest amount a positive integer up to 100.' })
    ref(row.harvestGoodId, known.material, id, 'harvestGoodId')
    const good = cropGoodMap.get(String(row.harvestGoodId))
    if (good && good.sourceCropId !== id) errors.push({ code: 'crop-good-source-mismatch', id, reference: String(row.harvestGoodId), message: 'Harvest good must point back to its source crop.' })
    if (typeof row.harvestGoodId === 'string' && cropGoodMap.has(row.harvestGoodId)) sourcedMaterials.add(row.harvestGoodId)
  }
  for (const row of rows.cropGoods) {
    const id = row.id as string
    ref(row.sourceCropId, known.crop, id, 'sourceCropId')
    if (!positiveIntegerIn(row.foodValue, 4)) errors.push({ code: 'unusable-crop-good', id, message: 'Crop goods require a positive integer food value from 1 through 4.' })
    if (!positiveIntegerIn(row.sell, 50)) errors.push({ code: 'invalid-range', id, path: 'sell', message: 'Crop good sell value must be an integer from 1 through 50.' })
  }
  const usedMaterials = new Set<string>()
  for (const row of rows.recipes) {
    const id = row.id as string
    if (!['weapon', 'armor'].includes(String(row.category))) errors.push({ code: 'invalid-recipe', id, path: 'category', message: 'Recipe category must be weapon or armor.' })
    if (!['store', 'blacksmith'].includes(String(row.station))) errors.push({ code: 'invalid-recipe', id, path: 'station', message: 'Recipe station must be store or blacksmith.' })
    if (row.affixRules !== 'default') errors.push({ code: 'invalid-recipe', id, path: 'affixRules', message: 'Recipe affixRules must use the supported default generator contract.' })
    if (!Array.isArray(row.allowedBiasMaterials)) errors.push({ code: 'invalid-recipe', id, path: 'allowedBiasMaterials', message: 'allowedBiasMaterials must be an array.' })
    ref(row.outputBase, known.equipment, id, 'outputBase')
    const out = equipmentMap.get(String(row.outputBase))
    if (out && out.slot !== row.category) errors.push({ code: 'recipe-output-slot-mismatch', id, message: 'Recipe category must match the output equipment slot.' })
    if (!asArray(row.inputs).length) errors.push({ code: 'invalid-recipe', id, path: 'inputs', message: 'Recipes must consume at least one input.' })
    for (const input of asArray(row.inputs)) {
      if (!isRecord(input)) { errors.push({ code: 'invalid-recipe', id, path: 'inputs', message: 'Every recipe input must be a valid input object.' }); continue }
      if (!positiveIntegerIn(input.amount, 1000)) errors.push({ code: 'invalid-range', id, path: 'inputs.amount', message: 'Input amounts must be positive safe integers up to 1000.' })
      if (input.source === 'material') {
        ref(input.materialId, known.material, id, 'inputs.materialId')
      } else if (input.source === 'inventory') ref(input.itemId, new Set([...known.equipment, ...baseline.excludedLegacyItemIds]), id, 'inputs.itemId')
      else errors.push({ code: 'invalid-recipe', id, path: 'inputs.source', message: 'Unknown crafting input source.' })
    }
    for (const material of asArray(row.allowedBiasMaterials)) {
      ref(material, known.material, id, 'allowedBiasMaterials')
    }
    const bounds: Record<string, number> = { goldCost: 1000, staminaCost: 100, durationMinutes: 43200, outputLevel: 100, requiredSmithing: 100, practiceCap: 100, opensAtHour: 23, closesAtHour: 23 }
    for (const field of ['goldCost', 'staminaCost', 'durationMinutes', 'outputLevel', 'requiredSmithing', 'practiceCap', 'opensAtHour', 'closesAtHour']) {
      const n = row[field]
      if (!finite(n) || n < 0 || n > bounds[field] || (['outputLevel','requiredSmithing','practiceCap','opensAtHour','closesAtHour'].includes(field) && !Number.isInteger(n))) errors.push({ code: 'invalid-range', id, path: field, message: `${field} is outside its finite legal range.` })
    }
    if (finite(row.durationMinutes) && row.durationMinutes === 0) errors.push({ code: 'invalid-range', id, path: 'durationMinutes', message: 'Duration must be positive.' })
    const q = isRecord(row.qualityRules) ? row.qualityRules : {}
    if (!finite(q.floorAtSmithing) || q.floorAtSmithing < 0 || q.floorAtSmithing > 100 || !Number.isInteger(q.floorAtSmithing) || !rarities.includes(q.minimumRarity as typeof rarities[number])) errors.push({ code: 'invalid-recipe', id, path: 'qualityRules', message: 'Invalid recipe quality rules.' })
    const masterpiece = row.masterpieceRules
    if (masterpiece !== undefined && (!isRecord(masterpiece) || !positive(masterpiece.requiredSmithing) || masterpiece.requiredSmithing > 100 || !Number.isInteger(masterpiece.requiredSmithing) || !inUnit(masterpiece.chance))) errors.push({ code: 'invalid-recipe', id, path: 'masterpieceRules', message: 'Masterpiece rules require bounded Smithing and chance in [0,1].' })
    if (!hasErrors(id) && typeof row.outputBase === 'string' && equipmentMap.has(row.outputBase) && !hasErrors(row.outputBase)) usableEquipment.add(row.outputBase)
  }
  // Recipe input/bias graph is computed separately from material source claims.
  for (const row of rows.recipes) if (nonEmpty(row.id) && !hasErrors(row.id)) {
    for (const input of asArray(row.inputs)) if (isRecord(input) && input.source === 'material' && typeof input.materialId === 'string' && materialMap.has(input.materialId)) usedMaterials.add(input.materialId)
    const output = equipmentMap.get(String(row.outputBase))
    if (output && !hasErrors(String(row.outputBase))) for (const materialId of asArray(row.allowedBiasMaterials)) {
      if (typeof materialId !== 'string') continue
      const material = materialMap.get(materialId)
      if (!material || hasErrors(materialId)) continue
      const bias = isRecord(material.bias) ? material.bias : {}
      const hasEffectiveBias = Object.entries(bias).some(([affixId, amount]) => finite(amount) && amount > 0 && asArray(output.affixIds).includes(affixId))
      const hasEffectiveSpecial = finite(material.specialBonus) && material.specialBonus > 0 && output.slot === 'weapon'
      if (hasEffectiveBias || hasEffectiveSpecial) usedMaterials.add(materialId)
    }
  }
  for (const row of rows.materials) {
    const id = row.id as string
    if (!isRecord(row.bias)) errors.push({ code: 'invalid-schema', id, path: 'bias', message: 'Material bias must be an object.' })
    if (!finite(row.sell)) errors.push({ code: 'invalid-schema', id, path: 'sell', message: 'Material sell value must be a finite number.' })
    if (!sourcedMaterials.has(id)) errors.push({ code: 'unreachable-material', id, message: 'Material has no reachable loot or crop source.' })
    if (!usedMaterials.has(id)) errors.push({ code: 'orphan-material', id, message: 'Material has no recipe input or legal generator bias consumer.' })
    for (const [affixId, value] of Object.entries(isRecord(row.bias) ? row.bias : {})) {
      ref(affixId, known.affix, id, 'bias')
      if (!finite(value) || value < 0 || value > 4) errors.push({ code: 'invalid-range', id, path: `bias.${affixId}`, message: 'Material bias must be finite and from 0 through 4.' })
      const affix = affixMap.get(affixId)
      const baselineSlots = baseline.baselineAffixSlots.find(entry => entry.id === affixId)?.slots
      const eligibleSlots = affix ? asArray(affix.slots) : baselineSlots ?? []
      if (!affix && baseline.affixIds.includes(affixId) && !baselineSlots) errors.push({ code: 'missing-baseline-affix-metadata', id, reference: affixId, message: 'Baseline affix slot metadata is required to prove material bias eligibility.' })
      else if ((affix || baselineSlots) && !rows.equipment.some(e => asArray(e.affixIds).includes(affixId) && eligibleSlots.some(slot => slot === e.slot))) errors.push({ code: 'affix-ineligible', id, reference: affixId, message: 'Material biases an affix with no compatible authored equipment.' })
    }
    if (!positiveIntegerIn(row.sell, 50)) errors.push({ code: 'invalid-range', id, path: 'sell', message: 'Material sell value must be an integer from 1 through 50.' })
    if (row.specialBonus !== undefined && !inUnit(row.specialBonus)) errors.push({ code: 'invalid-range', id, path: 'specialBonus', message: 'Special bonus must be in [0,1].' })
  }
  for (const row of rows.equipment) if (nonEmpty(row.id) && !usableEquipment.has(row.id)) errors.push({ code: 'unusable-equipment', id: row.id, message: 'Equipment has no loot or recipe-output path.' })

  // Effective identity ignores IDs and localized prose. Same mechanics, stats, spawn, and resolved loot are duplicates.
  const monsterFingerprints = new Map<string, string[]>()
  for (const row of rows.monsters) {
    if (!nonEmpty(row.id)) continue
    const family = familyMap.get(String(row.familyId))
    const table = lootMap.get(String(row.lootTableId))
    const effectiveLoot = table ? {
      guaranteed: asArray(table.guaranteedMaterialIds).map(id => materialSemantic(String(id), materialMap, cropGoodMap)).sort(),
      weighted: asArray(table.weightedEquipment).filter(isRecord).map(e => ({ item: equipmentSemantic(String(e.equipmentId), equipmentMap, affixMap), weight: e.weight })).sort((a,b) => stable(a).localeCompare(stable(b))),
      rare: asArray(table.rareMaterials).filter(isRecord).map(e => ({ item: materialSemantic(String(e.materialId), materialMap, cropGoodMap), chance: e.chance })).sort((a,b) => stable(a).localeCompare(stable(b))),
    } : null
    const fp = stable({ family: family ? { regions: [...asArray(family.regions)].sort(), spawnProfiles: predicateSetSemantic(family.spawnProfiles) } : null,
      rank: row.rank, level: row.level, stats: row.stats, role: row.role,
      mechanics: asArray(row.mechanics).map(mechanicSemantic).sort((a,b) => stable(a).localeCompare(stable(b))),
      spawn: predicateSetSemantic(row.spawnProfiles), loot: effectiveLoot, profile: row.lootProfile,
      boss: row.bossRules ? bossSemantic(row.bossRules as unknown as ContentBossRules, materialMap, cropGoodMap, equipmentMap, affixMap) : null })
    monsterFingerprints.set(fp, [...(monsterFingerprints.get(fp) ?? []), row.id])
  }
  const duplicateMonsterIds = new Set<string>()
  for (const matches of monsterFingerprints.values()) if (matches.length > 1) {
    warnings.push({ code: 'duplicate-like-monster', ids: matches.sort(), message: 'Monster definitions have the same effective combat, spawn, and loot profile after ignoring IDs and localized prose.' })
    matches.forEach(id => duplicateMonsterIds.add(id))
  }

  const warnDuplicates = (key: Catalog, fingerprint: (row: UnknownRecord) => unknown, code: string, message: string) => {
    const groups = new Map<string, string[]>()
    for (const row of rows[key]) if (nonEmpty(row.id)) {
      const fp = stable(fingerprint(row))
      groups.set(fp, [...(groups.get(fp) ?? []), row.id])
    }
    const duplicates = new Set<string>()
    for (const matches of groups.values()) if (matches.length > 1) {
      warnings.push({ code, ids: matches.sort(), message })
      matches.forEach(id => duplicates.add(id))
    }
    return duplicates
  }
  const duplicateEquipmentIds = warnDuplicates('equipment', row => equipmentSemantic(String(row.id), equipmentMap, affixMap), 'duplicate-like-equipment', 'Equipment definitions have the same effective slot, stats, and affix eligibility.')
  const duplicateMaterialIds = warnDuplicates('materials', row => ({ sell: row.sell, bias: Object.entries(isRecord(row.bias) ? row.bias : {}).map(([id, value]) => ({ effect: affixMap.get(id)?.stat, tiers: affixMap.get(id)?.tiers, value })).sort((a,b) => stable(a).localeCompare(stable(b))), specialBonus: row.specialBonus }), 'duplicate-like-material', 'Material definitions have the same effective economy and generation influence.')
  warnDuplicates('recipes', row => ({ category: row.category, inputs: asArray(row.inputs).map(i => isRecord(i) ? { source: i.source, amount: i.amount, item: i.source === 'material' ? materialSemantic(String(i.materialId), materialMap, cropGoodMap) : equipmentSemantic(String(i.itemId), equipmentMap, affixMap) } : null).sort((a,b) => stable(a).localeCompare(stable(b))), output: equipmentSemantic(String(row.outputBase), equipmentMap, affixMap), params: [row.goldCost,row.staminaCost,row.durationMinutes,row.outputLevel,row.requiredSmithing,row.practiceCap,row.station,row.opensAtHour,row.closesAtHour] }), 'duplicate-like-recipe', 'Recipes have the same effective inputs, output, and crafting conditions.')
  warnDuplicates('affixes', row => ({ stat: row.stat, slots: [...asArray(row.slots)].sort(), tiers: [...asArray(row.tiers)].sort() }), 'duplicate-like-affix', 'Affixes have identical effective stat eligibility and tier values.')
  warnDuplicates('crops', row => ({ regions: [...asArray(row.regions)].sort(), seasons: [...asArray(row.seasons)].sort(), growthMinutes: row.growthMinutes, harvestAmount: row.harvestAmount, good: materialSemantic(String(row.harvestGoodId), materialMap, cropGoodMap) }), 'duplicate-like-crop', 'Crop definitions have the same effective region, season, growth, yield, and harvest good.')
  warnDuplicates('lootTables', row => ({ guaranteed: asArray(row.guaranteedMaterialIds).map(id => materialSemantic(String(id), materialMap, cropGoodMap)).sort((a,b) => stable(a).localeCompare(stable(b))), weighted: asArray(row.weightedEquipment).filter(isRecord).map(item => ({ equipment: equipmentSemantic(String(item.equipmentId), equipmentMap, affixMap), weight: item.weight })).sort((a,b) => stable(a).localeCompare(stable(b))), rare: asArray(row.rareMaterials).filter(isRecord).map(item => ({ material: materialSemantic(String(item.materialId), materialMap, cropGoodMap), chance: item.chance })).sort((a,b) => stable(a).localeCompare(stable(b))) }), 'duplicate-like-loot-table', 'Loot tables have identical effective item and material distribution.')

  const referencedLoot = new Set(rows.families.map(f => f.lootTableId).filter((v): v is string => typeof v === 'string'))
  for (const row of rows.lootTables) if (nonEmpty(row.id) && !referencedLoot.has(row.id)) warnings.push({ code: 'unused-loot-table', id: row.id, message: 'Loot table is not assigned to a family.' })
  for (const row of rows.affixes) if (nonEmpty(row.id) && !rows.equipment.some(e => asArray(e.affixIds).includes(row.id))) warnings.push({ code: 'unused-affix', id: row.id, message: 'Affix is not eligible for any authored equipment.' })
  for (const row of rows.families) if (nonEmpty(row.id) && ![
    ...asArray(row.monsterIds), ...asArray(row.eliteIds), ...asArray(row.miniBossIds), ...asArray(row.bossIds),
  ].some(id => typeof id === 'string' && monsterMap.has(id))) warnings.push({ code: 'empty-family', id: row.id, message: 'Family has no authored monster definitions in its rank pools.' })

  const qualifyIds: string[] = []
  for (const row of rows.monsters) {
    if (!nonEmpty(row.id)) continue
    const id = row.id
    const family = familyMap.get(String(row.familyId))
    const table = lootMap.get(String(row.lootTableId))
    const combat = asArray(row.mechanics).some(isEffectiveMechanic)
    const graphValid = !hasErrors(id) && family !== undefined && !hasErrors(String(family.id)) && table !== undefined && !hasErrors(String(table.id))
    const familySpecificTable = rows.families.filter(f => f.lootTableId === row.lootTableId).length === 1
    const loot = Boolean(graphValid && familySpecificTable && family && table && (asArray(table.guaranteedMaterialIds).some(m => typeof m === 'string' && ((materialMap.has(m) && sourcedMaterials.has(m) && usedMaterials.has(m)) || cropGoodMap.has(m))) || asArray(table.rareMaterials).some(m => isRecord(m) && finite(m.chance) && m.chance > 0 && typeof m.materialId === 'string' && ((materialMap.has(m.materialId) && sourcedMaterials.has(m.materialId) && usedMaterials.has(m.materialId)) || cropGoodMap.has(m.materialId))) || asArray(table.weightedEquipment).some(e => isRecord(e) && finite(e.weight) && e.weight > 0 && equipmentDropEnabled.has(String(row.lootTableId)) && typeof e.equipmentId === 'string' && usableEquipment.has(e.equipmentId) && !hasErrors(e.equipmentId))))
    const reach = reachability.find(r => r.contentId === id)?.status === 'controlled-witness'
    const familyProfiles = asArray(family?.spawnProfiles).filter(isRecord) as unknown as ContentSpawnPredicate[]
    const effectiveSpawn = row.spawnProfiles === undefined ? familyProfiles : intersectProfiles(familyProfiles, asArray(row.spawnProfiles).filter(isRecord) as unknown as ContentSpawnPredicate[])
    const world = reach && (hasMeaningfulPredicate(effectiveSpawn) || row.rank === 'boss')
    const axes = [combat ? 'combat' : null, loot ? 'loot' : null, world ? 'world' : null].filter((v): v is 'combat' | 'loot' | 'world' => v !== null)
    identityAxes[id] = axes
    if (axes.length < 2 || !graphValid) errors.push({ code: 'insufficient-identity-axes', id, message: `Monster has ${axes.length} effective identity axes (${axes.join(', ') || 'none'}) or an invalid source graph; at least two effective axes are required.` })
    else if (!duplicateMonsterIds.has(id)) qualifyIds.push(id)
  }
  const excludedItemIds = new Set([...baseline.equipmentIds, ...baseline.materialIds, ...baseline.excludedLegacyItemIds, ...baseline.excludedProceduralIds])
  const usableNewMaterials = [...materialMap.keys()].filter(id => !excludedItemIds.has(id) && !hasErrors(id) && !duplicateMaterialIds.has(id) && sourcedMaterials.has(id) && usedMaterials.has(id)).length
  const duplicateCropGoods = new Set<string>()
  const cropGoodFingerprints = new Map<string, string[]>()
  for (const row of rows.cropGoods) if (nonEmpty(row.id)) {
    const key = stable({ foodValue: row.foodValue, sell: row.sell })
    cropGoodFingerprints.set(key, [...(cropGoodFingerprints.get(key) ?? []), row.id])
  }
  for (const matches of cropGoodFingerprints.values()) if (matches.length > 1) {
    warnings.push({ code: 'duplicate-like-crop-good', ids: matches.sort(), message: 'Crop goods have the same effective food and sale value after ignoring IDs and prose.' })
    matches.forEach(id => duplicateCropGoods.add(id))
  }
  const usableNewItems = unique([...usableEquipment].filter(id => !duplicateEquipmentIds.has(id)).concat([...cropGoodMap.keys()].filter(id => !duplicateCropGoods.has(id)), ...[...materialMap.keys()].filter(id => sourcedMaterials.has(id) && usedMaterials.has(id) && !duplicateMaterialIds.has(id)))
    .filter(id => !excludedItemIds.has(id) && !hasErrors(id))).length
  empty.qualifyingMonsterIds = qualifyIds
  empty.qualityCounts = { qualifyingNewMonsters: qualifyIds.filter(id => !baseline.monsterIds.includes(id)).length, usableNewItems, usableNewMaterials }
  empty.baseline = { ...empty.baseline, exactMonsterIds: baseline.monsterIds.length, exactBossVariantIds: baseline.bossVariantIds.length,
    exactItemIds: baseline.equipmentIds.length + baseline.materialIds.length }
  return empty
}

function validateFiniteTree(value: unknown, path: string, errors: ContentIssue[], active = new WeakSet<object>()): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errors.push({ code: 'non-finite-number', path, message: 'All numeric values must be finite.' })
    return
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value !== 'object') {
    errors.push({ code: 'invalid-schema', path, message: `Unsupported JSON value type: ${typeof value}.` })
    return
  }
  if (active.has(value)) {
    errors.push({ code: 'invalid-schema', path, message: 'Content input must be acyclic JSON data.' })
    return
  }
  active.add(value)
  if (Array.isArray(value)) value.forEach((v, i) => validateFiniteTree(v, `${path}[${i}]`, errors, active))
  else if (isRecord(value)) Object.entries(value).forEach(([k, v]) => validateFiniteTree(v, `${path}.${k}`, errors, active))
  active.delete(value)
}
function inUnit(value: unknown): value is number { return finite(value) && value >= 0 && value <= 1 }
function positive(value: unknown): value is number { return finite(value) && value > 0 }
function positiveIntegerIn(value: unknown, max: number): value is number {
  return finite(value) && Number.isSafeInteger(value) && value > 0 && value <= max
}
function validateMechanics(value: unknown, id: string, errors: ContentIssue[]): void {
  const supported = ['rush', 'guard', 'heavyStrike', 'rally', 'chargedAttack']
  if (!Array.isArray(value)) {
    errors.push({ code: 'invalid-schema', id, path: 'mechanics', message: 'Mechanics must be an array, including when empty.' })
    return
  }
  for (const mechanic of asArray(value)) {
    if (!isRecord(mechanic) || !supported.includes(String(mechanic.kind))) { errors.push({ code: 'invalid-mechanic', id, message: 'Mechanic is not part of the finite supported behavior set.' }); continue }
    if (!finite(mechanic.everyTurns) || mechanic.everyTurns < 2 || mechanic.everyTurns > 8 || !Number.isInteger(mechanic.everyTurns)) errors.push({ code: 'invalid-range', id, path: 'mechanics.everyTurns', message: 'Mechanic period must be an integer from 2 through 8.' })
    const magnitude = mechanic.kind === 'guard' ? mechanic.defenseBonus : mechanic.bonusFraction
    if (!finite(magnitude) || magnitude <= 0 || magnitude > (mechanic.kind === 'guard' ? 20 : 2)) errors.push({ code: 'invalid-range', id, path: 'mechanics.magnitude', message: 'Mechanic magnitude is outside its finite supported range.' })
    if (!text(mechanic.telegraph)) errors.push({ code: 'incomplete-localization', id, path: 'mechanics.telegraph', message: 'Every combat effect needs a zh-TW telegraph.' })
    if (mechanic.healAmount !== undefined && (!finite(mechanic.healAmount) || mechanic.healAmount <= 0 || mechanic.healAmount > 100)) errors.push({ code: 'invalid-range', id, path: 'mechanics.healAmount', message: 'Heal amount must be from 1 through 100.' })
  }
}
function isEffectiveMechanic(value: unknown): value is ContentCombatMechanic {
  if (!isRecord(value)) return false
  if (!['rush','guard','heavyStrike','rally','chargedAttack'].includes(String(value.kind)) || !text(value.telegraph)) return false
  if (!Number.isInteger(value.everyTurns) || !finite(value.everyTurns) || value.everyTurns < 2 || value.everyTurns > 8) return false
  const magnitude = value.kind === 'guard' ? value.defenseBonus : value.bonusFraction
  return finite(magnitude) && magnitude > 0 && magnitude <= (value.kind === 'guard' ? 20 : 2)
}
function validateLootProfile(value: unknown, id: string, errors: ContentIssue[]): void {
  if (!isRecord(value)) { errors.push({ code: 'invalid-schema', id, path: 'lootProfile', message: 'Monster needs a loot profile.' }); return }
  if (!positive(value.dropLevel) || !Number.isSafeInteger(value.dropLevel) || value.dropLevel > 100 || !inUnit(value.equipmentChance)) errors.push({ code: 'invalid-range', id, path: 'lootProfile', message: 'Drop level must be an integer from 1 through 100 and equipment chance in [0,1].' })
  const weights = isRecord(value.rarityWeights) ? value.rarityWeights : {}
  if (!isRecord(value.rarityWeights)) errors.push({ code: 'invalid-schema', id, path: 'lootProfile.rarityWeights', message: 'Rarity weights must be an object.' })
  for (const key of Object.keys(weights)) if (!rarities.includes(key as typeof rarities[number])) errors.push({ code: 'invalid-schema', id, path: `lootProfile.rarityWeights.${key}`, message: 'Unknown rarity weight key.' })
  let total = 0
  for (const rarity of rarities) {
    const weight = weights[rarity]
    if (!finite(weight) || weight < 0) errors.push({ code: 'invalid-range', id, path: `lootProfile.rarityWeights.${rarity}`, message: 'Rarity weights must be finite and non-negative.' })
    else total += weight
  }
  if (!finite(total) || total <= 0) errors.push({ code: 'invalid-range', id, path: 'lootProfile.rarityWeights', message: 'Rarity weights require a positive total.' })
}
function validateBossRules(value: ContentBossRules, id: string, materialIds: Set<string>, equipmentIds: Set<string>, errors: ContentIssue[]): void {
  if (!positive(value.cooldownDays) || value.cooldownDays > 365) errors.push({ code: 'invalid-range', id, path: 'bossRules.cooldownDays', message: 'Boss cooldown must be from 1 through 365 days.' })
  if (!Array.isArray(value.guaranteedMaterialIds)) errors.push({ code: 'invalid-schema', id, path: 'bossRules.guaranteedMaterialIds', message: 'Boss guaranteed materials must be an array.' })
  for (const material of asArray(value.guaranteedMaterialIds)) if (typeof material !== 'string' || !materialIds.has(material)) errors.push({ code: 'unknown-reference', id, reference: String(material), path: 'bossRules.guaranteedMaterialIds', message: 'Boss guaranteed material is unresolved.' })
  if (!nonEmpty(value.exclusiveEquipmentId) || !equipmentIds.has(value.exclusiveEquipmentId)) errors.push({ code: 'unknown-reference', id, reference: typeof value.exclusiveEquipmentId === 'string' ? value.exclusiveEquipmentId : undefined, path: 'bossRules.exclusiveEquipmentId', message: 'Boss exclusive equipment is unresolved.' })
  if (!Array.isArray(value.variants)) errors.push({ code: 'invalid-schema', id, path: 'bossRules.variants', message: 'Boss variants must be an array.' })
  const variants = asArray(value.variants)
  if (!variants.length) errors.push({ code: 'invalid-boss-classification', id, path: 'bossRules.variants', message: 'Boss requires at least one controlled variant.' })
  let total = 0
  for (const [index, variant] of variants.entries()) if (!isRecord(variant)) {
    errors.push({ code: 'invalid-schema', id, path: `bossRules.variants[${index}]`, message: 'Boss variants must be objects.' })
  } else {
    if (!nonEmpty(variant.id) || !text(variant.name) || !text(variant.description) || !positive(variant.weight)) errors.push({ code: 'invalid-boss-classification', id, path: 'bossRules.variants', message: 'Variant needs a stable ID, localized text, and positive weight.' })
    else total += variant.weight
    if (!Array.isArray(variant.mechanics)) errors.push({ code: 'invalid-schema', id, path: `bossRules.variants[${index}].mechanics`, message: 'Variant mechanics must be an array.' })
    if (variant.spawnProfiles !== undefined && !Array.isArray(variant.spawnProfiles)) errors.push({ code: 'invalid-schema', id, path: `bossRules.variants[${index}].spawnProfiles`, message: 'Variant spawnProfiles must be an array when present.' })
    validateMechanics(variant.mechanics, id, errors)
  }
  if (!finite(total) || total <= 0) errors.push({ code: 'invalid-range', id, path: 'bossRules.variants.weight', message: 'Variant weights require a finite positive total.' })
  const consequence = value.worldConsequence as unknown
  if (!isRecord(consequence) || consequence.trigger !== 'bossDefeated' || !['food','safety','prosperity'].includes(String(consequence.field)) || !finite(consequence.delta) || consequence.delta === 0 || Math.abs(consequence.delta) > 10) errors.push({ code: 'invalid-world-consequence', id, path: 'bossRules.worldConsequence', message: 'World consequence must be a small finite bossDefeated settlement delta.' })
}
function validatePredicates(value: unknown, id: string, owner: string, allowedRegions: Set<RegionId>, errors: ContentIssue[], reachability: ContentValidationReport['reachability']): void {
  const profiles = asArray(value)
  if (!profiles.length) { errors.push({ code: 'unreachable-spawn', id, message: `${owner} requires at least one spawn profile.` }); reachability.push({ contentId: id, status: 'unreachable' }); return }
  const witnesses = profiles.map(p => isRecord(p) ? findWitness(p as unknown as ContentSpawnPredicate, allowedRegions) : undefined).filter((w): w is SpawnWitness => Boolean(w))
  const invalid = profiles.some(p => !isRecord(p) || !regions.includes(p.region as RegionId) ||
    (p.minPlayerLevel !== undefined && (!positive(p.minPlayerLevel) || !Number.isInteger(p.minPlayerLevel))) || (p.maxPlayerLevel !== undefined && (!positive(p.maxPlayerLevel) || !Number.isInteger(p.maxPlayerLevel))) ||
    (p.minThreatLevel !== undefined && (!Number.isInteger(p.minThreatLevel) || !finite(p.minThreatLevel) || p.minThreatLevel < 1 || p.minThreatLevel > 3)) || (p.maxThreatLevel !== undefined && (!Number.isInteger(p.maxThreatLevel) || !finite(p.maxThreatLevel) || p.maxThreatLevel < 1 || p.maxThreatLevel > 3)) ||
    (p.minSafety !== undefined && (!Number.isInteger(p.minSafety) || !finite(p.minSafety) || p.minSafety < 0 || p.minSafety > 100)) || (p.maxSafety !== undefined && (!Number.isInteger(p.maxSafety) || !finite(p.maxSafety) || p.maxSafety < 0 || p.maxSafety > 100)) ||
    (p.hours !== undefined && (!isRecord(p.hours) || !finite(p.hours.start) || !finite(p.hours.end) || !Number.isInteger(p.hours.start) || !Number.isInteger(p.hours.end) || p.hours.start < 0 || p.hours.start > 23 || p.hours.end < 0 || p.hours.end > 23)) ||
    (p.settlementStages !== undefined && (!Array.isArray(p.settlementStages) || p.settlementStages.length === 0 || asArray(p.settlementStages).some(x => !stages.includes(x as typeof stages[number])))) || (p.seasons !== undefined && (!Array.isArray(p.seasons) || p.seasons.length === 0 || asArray(p.seasons).some(x => !seasons.includes(x as typeof seasons[number])))))
    if (invalid) errors.push({ code: 'invalid-spawn-predicate', id, message: 'Spawn predicate contains unsupported or out-of-range conditions.' })
  if (profiles.some(p => isRecord(p) && p.minPlayerLevel !== undefined && p.maxPlayerLevel !== undefined && (p.minPlayerLevel as number) > (p.maxPlayerLevel as number))) errors.push({ code: 'unreachable-spawn', id, message: 'Spawn predicate has mutually exclusive player-level bounds.' })
  const witness = witnesses[0]
  if (!witness) { errors.push({ code: 'unreachable-spawn', id, message: `${owner} spawn predicates have no legal bounded witness.` }); reachability.push({ contentId: id, status: 'unreachable' }) }
  else reachability.push({ contentId: id, status: 'controlled-witness', witness })
}
function findWitness(p: ContentSpawnPredicate, allowed: Set<RegionId>): SpawnWitness | undefined {
  if (!regions.includes(p.region) || !allowed.has(p.region)) return undefined
  for (let level = Math.max(1, Math.ceil(p.minPlayerLevel ?? 1)); level <= Math.min(100, Math.floor(p.maxPlayerLevel ?? 100)); level++)
    for (let threat = Math.max(1, Math.ceil(p.minThreatLevel ?? 1)); threat <= Math.min(3, Math.floor(p.maxThreatLevel ?? 3)); threat++)
      for (const stage of stages) if (!p.settlementStages?.length || p.settlementStages.includes(stage))
        for (const season of seasons) if (!p.seasons?.length || p.seasons.includes(season))
          for (let hour = 0; hour < 24; hour++) if (!p.hours || hourWithin(hour, p.hours.start, p.hours.end))
            for (let safety = Math.max(0, Math.ceil(p.minSafety ?? 0)); safety <= Math.min(100, Math.floor(p.maxSafety ?? 100)); safety++)
              return { region: p.region, regionAccess: p.region === 'unknown' ? 'explore-to-unlock' : 'already-accessible', playerLevel: level, threatLevel: threat, settlementStage: stage, season, hour, safety }
  return undefined
}
function intersectProfiles(family: readonly ContentSpawnPredicate[], own: readonly ContentSpawnPredicate[]): ContentSpawnPredicate[] {
  const result: ContentSpawnPredicate[] = []
  const intersectList = <T>(left: readonly T[] | undefined, right: readonly T[] | undefined): readonly T[] | undefined => {
    if (!left) return right
    if (!right) return left
    return left.filter(value => right.includes(value))
  }
  const max = (a: number | undefined, b: number | undefined) => a === undefined ? b : b === undefined ? a : Math.max(a, b)
  const min = (a: number | undefined, b: number | undefined) => a === undefined ? b : b === undefined ? a : Math.min(a, b)
  for (const a of family) for (const b of own) {
    if (a.region !== b.region) continue
    const settlementStages = intersectList(a.settlementStages, b.settlementStages)
    const selectedSeasons = intersectList(a.seasons, b.seasons)
    if (settlementStages?.length === 0 || selectedSeasons?.length === 0) continue
    const hours = Array.from({ length: 24 }, (_, hour) => hour).filter(hour =>
      (!a.hours || hourWithin(hour, a.hours.start, a.hours.end)) && (!b.hours || hourWithin(hour, b.hours.start, b.hours.end)))
    if (!hours.length) continue
    const minPlayerLevel = max(a.minPlayerLevel, b.minPlayerLevel)
    const maxPlayerLevel = min(a.maxPlayerLevel, b.maxPlayerLevel)
    const minThreatLevel = max(a.minThreatLevel, b.minThreatLevel)
    const maxThreatLevel = min(a.maxThreatLevel, b.maxThreatLevel)
    const minSafety = max(a.minSafety, b.minSafety)
    const maxSafety = min(a.maxSafety, b.maxSafety)
    if ((minPlayerLevel !== undefined && maxPlayerLevel !== undefined && minPlayerLevel > maxPlayerLevel) ||
        (minThreatLevel !== undefined && maxThreatLevel !== undefined && minThreatLevel > maxThreatLevel) ||
        (minSafety !== undefined && maxSafety !== undefined && minSafety > maxSafety)) continue
    for (const hour of hours) result.push({ region: a.region, minPlayerLevel, maxPlayerLevel,
      minThreatLevel, maxThreatLevel, minSafety, maxSafety, settlementStages, seasons: selectedSeasons, hours: { start: hour, end: hour } })
  }
  return result
}
function hourWithin(hour: number, start: number, end: number): boolean { return start <= end ? hour >= start && hour <= end : hour >= start || hour <= end }
function hasMeaningfulPredicate(value: unknown): boolean {
  return asArray(value).some(p => isRecord(p) && (p.minPlayerLevel !== undefined || p.maxPlayerLevel !== undefined || p.minThreatLevel !== undefined || p.maxThreatLevel !== undefined || p.settlementStages !== undefined || p.seasons !== undefined || p.hours !== undefined || p.minSafety !== undefined || p.maxSafety !== undefined))
}
function materialSemantic(id: string, materials: Map<string, UnknownRecord>, goods: Map<string, UnknownRecord>): unknown {
  const row = materials.get(id) ?? goods.get(id)
  return row ? { sell: row.sell, bias: row.bias, specialBonus: row.specialBonus, foodValue: row.foodValue } : { unresolved: true }
}
function equipmentSemantic(id: string, equipment: Map<string, UnknownRecord>, affixes: Map<string, UnknownRecord>): unknown {
  const row = equipment.get(id)
  if (!row) return { unresolved: true }
  return { slot: row.slot, attack: row.attack, defense: row.defense, sell: row.sell, penetration: row.penetration,
    affixes: asArray(row.affixIds).map(a => { const x = affixes.get(String(a)); return x ? { stat: x.stat, slots: x.slots, tiers: x.tiers } : null }).sort((a,b) => stable(a).localeCompare(stable(b))) }
}
function mechanicSemantic(value: unknown): unknown {
  if (!isRecord(value)) return value
  const { telegraph: _ignored, ...effect } = value
  return effect
}
function bossSemantic(value: ContentBossRules, materials: Map<string, UnknownRecord>, goods: Map<string, UnknownRecord>, equipment: Map<string, UnknownRecord>, affixes: Map<string, UnknownRecord>): unknown {
  return { cooldownDays: value.cooldownDays,
    guaranteed: asArray(value.guaranteedMaterialIds).map(id => materialSemantic(String(id), materials, goods)).sort((a,b) => stable(a).localeCompare(stable(b))),
    exclusive: equipmentSemantic(value.exclusiveEquipmentId, equipment, affixes),
    variants: asArray(value.variants).map(v => isRecord(v) ? ({ weight: v.weight, mechanics: asArray(v.mechanics).map(mechanicSemantic).sort((a,b) => stable(a).localeCompare(stable(b))), spawn: predicateSetSemantic(v.spawnProfiles) }) : null).sort((a,b) => stable(a).localeCompare(stable(b))), consequence: value.worldConsequence ? { field: value.worldConsequence.field, delta: value.worldConsequence.delta } : null }
}
function predicateSetSemantic(value: unknown): unknown {
  return asArray(value).filter(isRecord).map(profile => ({
    ...profile,
    settlementStages: profile.settlementStages === undefined ? undefined : [...asArray(profile.settlementStages)].sort(),
    seasons: profile.seasons === undefined ? undefined : [...asArray(profile.seasons)].sort(),
  })).sort((a,b) => stable(a).localeCompare(stable(b)))
}
