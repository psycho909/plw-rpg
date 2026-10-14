export const MATRIX_BANDS = Object.freeze(['early', 'mid', 'late'])
export const MATRIX_SOURCES = Object.freeze(['legacy', 'adventure-loot', 'crafted', 'boss-gear', 'masterpiece'])
export const MATRIX_STYLES = Object.freeze(['damage', 'crit-speed', 'bleed', 'penetration', 'defense'])
export const MATRIX_BOSS_IDS = Object.freeze([
  'slime_heart', 'cave_insect_queen', 'wild_beast_apex', 'frontier_goblin_warlord',
  'fog_undead_cryptlord', 'mine_construct_heart', 'chief', 'wolfKing',
])

export const MATRIX_REPRESENTATIVE_TARGETS = Object.freeze([
  { definitionId: 'grayWolf', rank: 'normal', familyId: 'wolf', familyRegion: 'forest',
    selectionRationale: 'Wolf chain baseline: first legal member and repeatable Normal target.' },
  { definitionId: 'alphaWolf', rank: 'elite', familyId: 'wolf', familyRegion: 'forest',
    selectionRationale: 'Wolf chain Elite step; distinguishes the first higher-rank gate.' },
  { definitionId: 'packLeader', rank: 'miniBoss', familyId: 'wolf', familyRegion: 'forest',
    selectionRationale: 'Wolf chain MiniBoss step with the authored howl/control mechanic.' },
  { definitionId: 'cave_insect_digger', rank: 'normal', familyId: 'cave_insects', familyRegion: 'mine',
    selectionRationale: 'Mine Normal baseline with periodic shell guard.' },
  { definitionId: 'cave_insect_razor', rank: 'elite', familyId: 'cave_insects', familyRegion: 'mine',
    selectionRationale: 'Mine Elite with frequent telegraphed rush.' },
  { definitionId: 'cave_insect_broodguard', rank: 'miniBoss', familyId: 'cave_insects', familyRegion: 'mine',
    selectionRationale: 'Mine MiniBoss combining guard and rally mechanics.' },
  { definitionId: 'wild_beast_stonehorn', rank: 'normal', familyId: 'wild_beasts', familyRegion: 'forest',
    selectionRationale: 'Forest Normal baseline with periodic guard.' },
  { definitionId: 'wild_beast_bristleback', rank: 'elite', familyId: 'wild_beasts', familyRegion: 'forest',
    selectionRationale: 'Forest Elite with a high-impact telegraphed heavy strike.' },
  { definitionId: 'wild_beast_old_matriarch', rank: 'miniBoss', familyId: 'wild_beasts', familyRegion: 'forest',
    selectionRationale: 'Forest MiniBoss with a recurring rally attack.' },
])

export const MATRIX_ACQUISITION_PATHS = Object.freeze({
  legacy: 'Buy the legacy sword/armor through the public trade action after blacksmith access; record actual gold paid. Fresh-save equipment is empty.',
  'adventure-loot': 'Win a legal encounter through public encounter/combat actions; use the awarded owned ItemInstance and retain drop provenance.',
  crafted: 'Use public planCraft, satisfy recipe unlock/station/time/material/gold/stamina gates, then call public craft; retain recipe and input provenance.',
  'boss-gear': 'Win a different Boss before the target first-kill fixture, then use that Boss reward; exclude the target Boss own drops from first-kill loadouts.',
  masterpiece: 'Complete a public masterpiece-enabled craft after meeting its Smithing, recipe, station and input requirements; require craftProvenance.masterpiece=true.',
})

export const MATRIX_STYLE_AFFIXES = Object.freeze({
  damage: ['striking'],
  'crit-speed': ['keen'],
  bleed: ['bleeding'],
  penetration: ['piercing'],
  defense: ['sturdy', 'blocking', 'warding'],
})

/** Select all Bosses plus one representative per non-Boss rank/family-region. */
export function selectCombatMatrixTargets(allTargets) {
  if (!Array.isArray(allTargets)) throw new TypeError('matrix targets must be an array')
  const byId = new Map(allTargets.map(target => [target.definitionId, target]))
  const bossTargets = MATRIX_BOSS_IDS.map(definitionId => {
    const target = byId.get(definitionId)
    if (!target || target.rank !== 'boss') throw new RangeError(`required Boss target is missing or misranked: ${definitionId}`)
    return { ...target, familyRegion: target.familyRegion ?? target.region ?? null,
      selectionRationale: 'Include every authored Boss ID for per-ID risk coverage.' }
  })
  const representatives = MATRIX_REPRESENTATIVE_TARGETS.map(selection => {
    const target = byId.get(selection.definitionId)
    if (!target || target.rank !== selection.rank) {
      throw new RangeError(`representative target is missing or misranked: ${selection.definitionId}`)
    }
    return { ...target, familyRegion: selection.familyRegion, selectionRationale: selection.selectionRationale }
  })
  const selected = [...bossTargets, ...representatives]
  const unique = [...new Map(selected.map(target => [target.definitionId, target])).values()]
  const counts = new Map()
  for (const target of unique) {
    if (target.rank === 'boss') continue
    const key = `${target.rank}/${target.familyId}/${target.familyRegion}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  if ([...counts.values()].some(count => count > 2)) throw new RangeError('representative cap exceeded: at most two definitions per rank/family-region')
  return unique
}

export function controlledCellNaReason(source, style) {
  if (source === 'legacy' && !['damage', 'defense'].includes(style)) {
    return 'Legacy sword/armor provide the static damage/defense baselines and have no rolled affixes for this style.'
  }
  return null
}

export function controlledSampleSeed(seed, definitionId, band, source, style, sampleIndex) {
  if (!Number.isSafeInteger(seed) || seed < 0 || !Number.isSafeInteger(sampleIndex) || sampleIndex < 0) {
    throw new RangeError('sample seed and index must be non-negative safe integers')
  }
  const key = `${seed}|${definitionId}|${band}|${source}|${style}|${sampleIndex}`
  let hash = 2166136261
  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function buildCombatCellManifest({ targets, seeds = [61101, 61102, 61103], samplesPerSeed = 100 }) {
  if (!Array.isArray(targets) || targets.length === 0) throw new RangeError('matrix manifest requires target definitions')
  if (seeds.length !== 3 || new Set(seeds).size !== 3 || seeds.some(seed => !Number.isSafeInteger(seed) || seed < 0)) {
    throw new RangeError('matrix requires the three distinct Phase8 control seeds')
  }
  if (!Number.isSafeInteger(samplesPerSeed) || samplesPerSeed <= 0) throw new RangeError('samplesPerSeed must be positive')

  const uniqueTargets = [...new Map(targets.map(target => [target.definitionId, target])).values()]
  const cells = uniqueTargets.flatMap(target => MATRIX_BANDS.flatMap(band => MATRIX_SOURCES.flatMap(source => MATRIX_STYLES.map(style => ({
    definitionId: target.definitionId,
    rank: target.rank,
    familyId: target.familyId ?? null,
    band,
    source,
    style,
    acquisitionPath: MATRIX_ACQUISITION_PATHS[source],
    requiredAffixes: MATRIX_STYLE_AFFIXES[style],
    bossIdStratified: target.rank === 'boss',
    excludeTargetBossDropOnFirstKill: target.rank === 'boss' && source === 'boss-gear',
    status: 'PENDING_LEGAL_ACQUISITION_WITNESS',
    naReason: controlledCellNaReason(source, style),
    samplesPerSeed,
    seeds: [...seeds],
  })))))

  const maxRows = cells.filter(cell => cell.naReason === null).length * samplesPerSeed * seeds.length
  const maxRowsPerBandSourceJob = uniqueTargets.length * MATRIX_STYLES.length * samplesPerSeed * seeds.length
  const jobs = MATRIX_BANDS.flatMap(band => MATRIX_SOURCES.map(source => ({ band, source,
    expectedRows: cells.filter(cell => cell.band === band && cell.source === source && cell.naReason === null).length * samplesPerSeed * seeds.length })))
  const maxRowsPerJob = Math.max(...jobs.map(job => job.expectedRows))
  // Phase7 controlled-combat reference: 118,800 rows in 72 seconds. Apply a 5x
  // allowance for setup, legal acquisition-path witnesses, and metric bookkeeping.
  const measuredRowsPerSecond = 118_800 / 72
  const estimatedTotalSeconds = Math.ceil(maxRows / measuredRowsPerSecond * 5)
  const estimatedMaxJobSeconds = Math.ceil(maxRowsPerJob / measuredRowsPerSecond * 5)
  if (estimatedTotalSeconds > 20 * 60) throw new RangeError(`controlled matrix exceeds the 20-minute estimated wall-time cap (${estimatedTotalSeconds}s)`)
  const plannedBossRows = cells.filter(cell => cell.rank === 'boss').length
  const bossIds = [...new Set(uniqueTargets.filter(target => target.rank === 'boss').map(target => target.definitionId))].sort()

  return {
    schema: 1,
    status: 'PLAN_ONLY_LEGAL_WITNESSES_PENDING',
    seeds: [...seeds],
    samplesPerCellPerSeed: samplesPerSeed,
    targets: uniqueTargets,
    dimensions: { bands: MATRIX_BANDS, sources: MATRIX_SOURCES, styles: MATRIX_STYLES,
      ranks: ['normal', 'elite', 'miniBoss', 'boss'] },
    targetCount: uniqueTargets.length,
    targetSelection: {
      bossRule: 'All eight Boss IDs are included.',
      nonBossRule: 'One representative Normal, Elite, and MiniBoss from each of three family-region slices; never more than two definitions per rank/family-region.',
      representatives: uniqueTargets.filter(target => target.rank !== 'boss').map(({ definitionId, rank, familyId, familyRegion, selectionRationale }) =>
        ({ definitionId, rank, familyId, familyRegion, selectionRationale })),
    },
    candidateCellCount: cells.length,
    candidateCellCountAfterKnownLegacyNAs: cells.filter(cell => cell.naReason === null).length,
    knownLegacyNACellCount: cells.filter(cell => cell.naReason !== null).length,
    maxCombatSamplesAfterKnownLegacyNAs: maxRows,
    bossIds,
    bossCellCount: plannedBossRows,
    grossDamage: 'Runner-side reconstruction only: exact for rows with known healing; mark NOT MEASURED and propose an optional applied-incoming-damage observer for any state with untracked companion healing. No src hook is added.',
    potionUse: 'Exact inventory potion delta per combat action.',
    riskAdjustedReward: 'Gold-only P(win)*victoryGold - P(retreat)*retreatGoldCost - P(death)*deathGoldLoss; potion/material/time/stamina stay separate and unpriced.',
    executionPlan: {
      splitAxes: ['band', 'source'],
      jobCount: jobs.length,
      jobs,
      upperBoundSamplesPerJob: maxRowsPerBandSourceJob,
      maxRowsPerJobAfterKnownNAs: maxRowsPerJob,
      estimatedWallClockMinutesPerJob: Math.ceil(estimatedMaxJobSeconds / 60),
      estimatedWallClockMinutesTotal: Math.ceil(estimatedTotalSeconds / 60),
      reference: 'Phase7 combat-attempt-05 completed 118,800 controlled rows in 72 seconds; estimate applies 5x setup/acquisition/ledger allowance.',
      maxSingleRunMinutes: 15,
      hardStopMinutesPerJob: 14,
      splitFurtherIfExceeded: '--band <band> --source <source> --target <definitionId> (one target per command)',
    },
    acquisitionPaths: MATRIX_ACQUISITION_PATHS,
    cells,
    limits: [
      'Cell counts are an upper-bound candidate manifest; only public acquisition/spawn witness success may promote a cell to runnable.',
      'Unavailable band/profile/build acquisition combinations must be recorded as N/A with the failed gate, never filled by direct output injection.',
      'Unexpected public acquisition action/reward-contract failure or encounter/combat action rejection is RUNNER_ERROR, not N/A; preserve partial rows.',
      'Controlled fixtures do not estimate natural encounter frequency.',
    ],
  }
}
