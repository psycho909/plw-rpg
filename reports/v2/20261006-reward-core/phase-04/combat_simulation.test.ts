import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { expect, it } from 'vitest'
import { AFFIXES, ITEM_BASES, ITEM_GENERATION_RULES, MATERIALS, WOLF_LOOT_RULES, WOLF_MONSTERS } from '../../../../src/data/rewards'
import { generateItem, awardWolfLoot } from '../../../../src/engine/itemGeneration'
import { rolledItemStats } from '../../../../src/engine/gearStats'
import { createGame, gainExp, player } from '../../../../src/engine/simulation'
import { combatTurn } from '../../../../src/engine/actions'
import { encounterWolf, resolveWolfCombatStats, wolfCombatPhase, wolfCombatPresentation, wolfChargeHealing, wolfDefenseForTurn } from '../../../../src/engine/wolfFamily'
import { playerAttackDamage } from '../../../../src/engine/combatStats'
import { equipInstance, equippedInstance } from '../../../../src/engine/rewardActions'
import { deserialize, serialize } from '../../../../src/services/saveService'
import type { GameState } from '../../../../src/domain/types'
import type { BossVariantId, ItemBaseId, ItemInstance, MonsterDefinitionId, MonsterTraitId, RarityId } from '../../../../src/domain/reward'

const root = process.cwd(), out = `${root}/reports/v2/20261006-reward-core/phase-04`
const requestedSeedCount = Number(process.env.PHASE4_COMBAT_SEEDS ?? 2)
const seeds = [17, 42, 77, 909, 2026, 2027, 8191, 9981].slice(0, requestedSeedCount)
const runLabel = process.env.PHASE4_RUN_LABEL ?? (requestedSeedCount >= 8 ? 'final' : 'sanity')
const powerbands = ['early', 'edge', 'ready'] as const
const builds = ['legacy', 'earlygear', 'raw', 'crit', 'bleed', 'penetration', 'affixControl', 'defense', 'common', 'rare', 'epic', 'eliteDrop', 'miniBossDrop', 'boss', 'bossStandardBody'] as const
const policies = ['attack', 'cue'] as const
type Build = typeof builds[number]
type Powerband = typeof powerbands[number]
type Target = { id: MonsterDefinitionId; variant?: BossVariantId; traits?: MonsterTraitId[]; fixture?: string }
const targets: Target[] = [
  { id: 'grayWolf' }, { id: 'alphaWolf' }, { id: 'alphaWolf', traits: ['armored'], fixture: 'controlled-armored-elite' },
  { id: 'wolfKing', variant: 'wellFed' }, { id: 'wolfKing', variant: 'starved' }, { id: 'wolfKing', variant: 'moonlit' },
]
const focus: Partial<Record<Build, string>> = { crit: 'keen', bleed: 'bleeding', penetration: 'piercing', defense: 'warding' }
const rarityFor: Partial<Record<Build, RarityId>> = { earlygear: 'common', raw: 'common', common: 'common', rare: 'rare', epic: 'epic' }
function allSourceFiles(directory = `${root}/src`): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...allSourceFiles(absolute))
    else if (entry.isFile() || (entry.isSymbolicLink() && statSync(absolute).isFile())) {
      files.push(relative(root, absolute).split(sep).join('/'))
    }
  }
  return files.sort()
}
function sourceSnapshot() {
  const sourceSha256 = Object.fromEntries(allSourceFiles().map(path => [path, createHash('sha256').update(readFileSync(`${root}/${path}`)).digest('hex')]))
  return { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceSha256,
    fingerprint: createHash('sha256').update(JSON.stringify(sourceSha256)).digest('hex') }
}
function checkSourceGuard(snapshot: ReturnType<typeof sourceSnapshot>) {
  const fullRun = requestedSeedCount >= 8
  const expectedCommit = process.env.PHASE4_EXPECT_SOURCE_COMMIT, expectedFingerprint = process.env.PHASE4_EXPECT_SOURCE_FINGERPRINT
  if (fullRun) {
    expect(expectedCommit, 'full combat run requires PHASE4_EXPECT_SOURCE_COMMIT').toBeTruthy()
    expect(expectedFingerprint, 'full combat run requires PHASE4_EXPECT_SOURCE_FINGERPRINT').toBeTruthy()
  }
  if (expectedCommit) expect(snapshot.commit).toBe(expectedCommit)
  if (expectedFingerprint) expect(snapshot.fingerprint).toBe(expectedFingerprint)
}
function harnessHash() { return createHash('sha256').update(readFileSync(`${out}/combat_simulation.test.ts`)).digest('hex') }

type Result = {
  seed: number; powerband: Powerband; build: Build; policy: string; target: string; targetFixture: string
  variant: string | null; traits: MonsterTraitId[]; heroLevel: number; combatLevel: number
  startingRngState: number; initialHp: number
  enemyMaxHp: number; finalEnemyHp: number; won: boolean; died: boolean; turns: number
  damageDealt: number; enemyHpNetRemoval: number; damageTakenGross: number; enemyHealing: number
  potionsUsed: number; potionHealing: number; potionCost: number; goldEarned: number
  armorContextChecks: number; reloads: number; commands: string[]; gearFixture: unknown; outcomeVsLegacy?: string
}

function applyProgression(state: GameState, band: Powerband) {
  const c = player(state)
  if (band === 'edge') gainExp(state, c, 180, 'combat')
  if (band === 'ready') gainExp(state, c, 300, 'combat')
}
function fixture(seed: number, powerband: Powerband) {
  const state = createGame(seed), c = player(state)
  c.currentRegion = 'forest'; c.position = { x: 7, y: 6 }
  applyProgression(state, powerband)
  state.reward.collection.defeated = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']
  state.threat.monsterPopulation = 75; state.settlement.safety = 55
  return state
}
function setRankContexts(seed: number, band: Powerband, id: MonsterDefinitionId, ownerId: string) {
  // This detached fixture shares the paired hero progression and world context, with its own RNG stream.
  const observed = fixture(seed, band)
  const result = awardWolfLoot(observed, { definitionId: id })
  expect(result.instance, `${id} actual rank award must contain gear`).toBeTruthy()
  return { ...result.instance!, ownerId }
}
function generatedPair(seed: number, powerband: Powerband, build: Build, ownerId: string, itemLevel: number): ItemInstance[] {
  const sourceBuild: Build = build === 'affixControl' ? 'penetration' : build
  const gearState = createGame((seed ^ (powerband === 'early' ? 0x101 : powerband === 'edge' ? 0x202 : 0x303)) >>> 0)
  const wantedRarity = rarityFor[sourceBuild], items: ItemInstance[] = []
  for (const [slot, baseId] of [['weapon', sourceBuild === 'raw' ? 'axe' : 'shortSword'], ['armor', sourceBuild === 'earlygear' ? 'hideArmor' : 'chainArmor']] as const) {
    const wantedAffix = (slot === 'weapon' && ['crit', 'bleed', 'penetration'].includes(sourceBuild))
      || (slot === 'armor' && sourceBuild === 'defense') ? focus[sourceBuild] : undefined
    let selected: ItemInstance | undefined
    for (let attempt = 0; attempt < 1000 && !selected; attempt++) {
      const item = generateItem(gearState, { baseId: baseId as ItemBaseId, level: itemLevel,
        material: sourceBuild === 'crit' ? 'moonStone' : sourceBuild === 'bleed' || sourceBuild === 'penetration' ? 'wolfFang' : sourceBuild === 'defense' ? 'wolfHide' : undefined })
      if (wantedRarity && item.rarity !== wantedRarity) continue
      if (wantedAffix && !item.affixes.some(affix => affix.id === wantedAffix)) continue
      if (sourceBuild === 'penetration' && item.affixes.some(affix => affix.id === 'bleeding')) continue
      selected = { ...item, ownerId }
    }
    expect(selected, `${sourceBuild} ${slot} legal fixture must be obtainable`).toBeDefined()
    items.push(selected!)
  }
  if (build === 'affixControl') {
    const [weapon] = items
    const piercing = weapon.affixes.find(affix => affix.id === 'piercing')
    expect(piercing, 'matched control requires a piercing affix to replace').toBeDefined()
    piercing!.id = 'bleeding'
    piercing!.value = AFFIXES.bleeding.tiers[piercing!.tier - 1]!
    weapon.rolledStats = rolledItemStats(weapon.baseId, weapon.level, weapon.affixes)
  }
  return items
}
function gearFor(seed: number, powerband: Powerband, build: Build, ownerId: string, itemLevel: number): ItemInstance[] {
  if (build === 'legacy') return []
  if (build === 'eliteDrop') return [setRankContexts(seed ^ 0x451, powerband, 'alphaWolf', ownerId)]
  if (build === 'miniBossDrop') return [setRankContexts(seed ^ 0x551, powerband, 'packLeader', ownerId)]
  if (build === 'boss' || build === 'bossStandardBody') {
    const actual = setRankContexts(seed ^ 0x751, powerband, 'wolfKing', ownerId)
    expect(actual.baseId).toBe(WOLF_LOOT_RULES.bossExclusiveBase)
    expect(actual.level).toBe(WOLF_MONSTERS.wolfKing.level)
    if (build === 'boss') return [actual]
    const standardBody = structuredClone(actual)
    standardBody.baseId = 'spear'
    standardBody.rolledStats = rolledItemStats('spear', standardBody.level, standardBody.affixes)
    return [standardBody]
  }
  return generatedPair(seed, powerband, build, ownerId, build === 'earlygear' ? 1 : itemLevel)
}
function equipBuild(state: GameState, seed: number, powerband: Powerband, build: Build) {
  const c = player(state)
  if (build === 'legacy') {
    c.equipment.weapon = 'sword'; c.equipment.armor = 'armor'
    return { items: [], description: 'fixed legacy sword/armor' }
  }
  const items = gearFor(seed, powerband, build, c.id, c.level)
  state.reward.instances.push(...items)
  state.reward.nextInstanceId = Math.max(state.reward.nextInstanceId, ...items.map(item => Number(item.instanceId.slice('item-'.length)) + 1))
  for (const item of items) {
    if (!state.reward.collection.bases.includes(item.baseId)) state.reward.collection.bases.push(item.baseId)
    if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
      if (!state.reward.collection.rareBases.includes(item.baseId)) state.reward.collection.rareBases.push(item.baseId)
    }
    expect(equipInstance(state, item.instanceId)).toBe('')
  }
  return { items, description: build === 'bossStandardBody' ? 'controlled matched-body clone of actual level-7 boss award; base changed to spear, other rolled data retained/recomputed' : build }
}
function setup(seed: number, powerband: Powerband, build: Build, target: Target): GameState {
  const state = fixture(seed, powerband), c = player(state)
  if (powerband === 'ready') {
    expect(c.level).toBe(5)
    expect(c.skills.combat.level).toBe(6)
  }
  equipBuild(state, seed, powerband, build)
  expect(encounterWolf(state, target.id)).toBe('')
  const family = state.combat!.familyEncounter!
  if (target.variant) family.variant = target.variant
  if (target.traits) family.traits = [...target.traits]
  if (target.variant || target.traits) {
    if (state.reward.wolfBossForm) Object.assign(state.reward.wolfBossForm, family)
    const stats = resolveWolfCombatStats(family)
    Object.assign(state.combat!, stats, { hp: stats.maxHp })
  }
  expect(player(state).hp).toBe(c.hp)
  return state
}
function gearSummary(state: GameState) {
  const character = player(state)
  return ['weapon', 'armor'].map(slot => {
    const item = equippedInstance(state, slot as 'weapon' | 'armor')
    return item ? { slot, baseId: item.baseId, level: item.level, rarity: item.rarity, affixes: item.affixes,
      rolledStats: item.rolledStats, material: item.material, provenance: item.provenance, specialTrait: item.specialTrait }
      : { slot, baseId: character.equipment[slot as 'weapon' | 'armor'] }
  })
}
function scenarioKey(row: Pick<Result, 'seed' | 'powerband' | 'policy' | 'target' | 'targetFixture' | 'variant'>) {
  return [row.seed, row.powerband, row.policy, row.target, row.targetFixture, row.variant ?? 'none'].join('|')
}
function run(seed: number, powerband: Powerband, build: Build, policy: typeof policies[number], target: Target, reload: boolean) {
  let state = setup(seed, powerband, build, target)
  const heroLevel = player(state).level, combatLevel = player(state).skills.combat.level
  const initialHp = player(state).hp, enemyMaxHp = state.combat!.maxHp, startingRngState = state.rngState
  const family = state.combat!.familyEncounter!, formation = structuredClone(family), gear = gearSummary(state), commands: string[] = []
  const initialPotions = player(state).inventory.potion, initialGold = player(state).gold
  let damageDealt = 0, enemyHpNetRemoval = 0, damageTakenGross = 0, enemyHealing = 0, potionHealing = 0, reloads = 0, armorContextChecks = 0
  let finalEnemyHp = state.combat!.hp
  for (let turn = 0; turn < 100 && state.combat && player(state).isAlive; turn++) {
    const c = player(state), cue = wolfCombatPresentation(state)?.cue ?? '', monster = state.combat!
    const command = c.hp <= c.maxHp * .45 && c.inventory.potion ? 'potion'
      : policy === 'cue' && /急襲|月襲|重擊/.test(cue) ? 'defend' : 'attack'
    const heroHpBefore = c.hp, potionHeal = command === 'potion' ? Math.min(45, c.maxHp - c.hp) : 0
    const enemyHpBefore = monster.hp, phase = wolfCombatPhase(monster.familyEncounter!, monster.hp, monster.maxHp)
    const effectiveDefense = wolfDefenseForTurn(monster.defense, phase)
    const armorContext = { wolfArmoredPhase: phase?.armored === true }
    if (armorContext.wolfArmoredPhase) armorContextChecks++
    const liveRngBeforeDiagnostic = state.rngState, diagnosticState = structuredClone(state)
    const formulaDamage = command === 'attack'
      ? Math.min(enemyHpBefore, playerAttackDamage(diagnosticState, effectiveDefense, true, armorContext)) : 0
    const enemyHpAfterHit = Math.max(0, enemyHpBefore - formulaDamage)
    const expectedEnemyHeal = enemyHpAfterHit > 0 ? wolfChargeHealing(monster.familyEncounter!, enemyHpAfterHit, monster.maxHp, phase) : 0
    expect(state.rngState).toBe(liveRngBeforeDiagnostic)
    commands.push(command)
    expect(combatTurn(state, command)).toBe('')
    const wonOnTurn = state.events.some(event => event.type === 'combat.won')
    damageDealt += formulaDamage
    if (!wonOnTurn) enemyHealing += expectedEnemyHeal
    enemyHpNetRemoval += enemyHpBefore - monster.hp
    finalEnemyHp = monster.hp
    expect(enemyHpBefore - monster.hp).toBe(formulaDamage - (wonOnTurn ? 0 : expectedEnemyHeal))
    potionHealing += potionHeal
    if (state.combat || !wonOnTurn) damageTakenGross += Math.max(0, heroHpBefore + potionHeal - player(state).hp)
    if (reload && state.combat && turn % 3 === 2) {
      try { state = deserialize(serialize(state, 777)).state }
      catch (error) { throw new Error(`reload failed seed=${seed} band=${powerband} build=${build} target=${target.id}/${target.fixture ?? target.variant ?? 'natural'} turn=${turn}: ${String(error)}`) }
      reloads++
    }
  }
  const c = player(state), won = state.events.some(event => event.type === 'combat.won')
  return { state, result: {
    seed, powerband, build, policy, target: target.id, targetFixture: target.fixture ?? 'public-natural',
    variant: target.variant ?? null, traits: formation.traits, heroLevel, combatLevel, startingRngState, initialHp, enemyMaxHp, finalEnemyHp,
    won, died: !c.isAlive, turns: commands.length, damageDealt, enemyHpNetRemoval, damageTakenGross, enemyHealing,
    potionsUsed: initialPotions - c.inventory.potion, potionHealing, potionCost: (initialPotions - c.inventory.potion) * 20,
    goldEarned: c.gold - initialGold, armorContextChecks, reloads, commands, gearFixture: gear,
  } as Result }
}

const quantile = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((xs.length - 1) * q))] ?? 0
const dominates = (a: Result, b: Result) => Number(a.won) >= Number(b.won) && Number(a.died) <= Number(b.died)
  && a.turns <= b.turns && a.damageTakenGross <= b.damageTakenGross && a.potionsUsed <= b.potionsUsed
function pairedClassification(row: Result, legacy: Result) {
  const equal = row.won === legacy.won && row.died === legacy.died && row.turns === legacy.turns
    && row.damageTakenGross === legacy.damageTakenGross && row.potionsUsed === legacy.potionsUsed
  if (equal) return 'equivalent-to-legacy'
  if (dominates(row, legacy)) return 'outcome-upgrade'
  if (dominates(legacy, row)) return 'low-value-vs-legacy'
  return 'sidegrade-tradeoff'
}

it('compares public wolf combat with generation-profile and canonical boss gear under exact replay', () => {
  expect(Number.isSafeInteger(requestedSeedCount) && requestedSeedCount > 0 && requestedSeedCount <= 8).toBe(true)
  expect(targets).toHaveLength(6)
  const startSource = sourceSnapshot(), startHarness = harnessHash()
  checkSourceGuard(startSource)
  const started = performance.now(), rows: Result[] = []
  for (const seed of seeds) for (const powerband of powerbands) for (const target of targets) for (const policy of policies) for (const build of builds) {
    const first = run(seed, powerband, build, policy, target, false), replay = run(seed, powerband, build, policy, target, true)
    expect(replay.state).toEqual(first.state)
    expect(replay.result.commands).toEqual(first.result.commands)
    expect(replay.result.startingRngState).toBe(first.result.startingRngState)
    rows.push(first.result)
  }
  const legacy = new Map(rows.filter(row => row.build === 'legacy').map(row => [scenarioKey(row), row]))
  for (const row of rows) if (row.build !== 'legacy') {
    const paired = legacy.get(scenarioKey(row))
    expect(paired).toBeDefined()
    expect(row.startingRngState).toBe(paired!.startingRngState)
    expect(row.initialHp).toBe(paired!.initialHp)
    expect(row.enemyMaxHp).toBe(paired!.enemyMaxHp)
    expect(row.traits).toEqual(paired!.traits)
    row.outcomeVsLegacy = pairedClassification(row, paired!)
  }
  const groups: Record<string, object> = {}
  for (const powerband of powerbands) for (const build of builds) for (const policy of policies) for (const target of targets) {
    const subset = rows.filter(row => row.powerband === powerband && row.build === build && row.policy === policy
      && row.target === target.id && row.targetFixture === (target.fixture ?? 'public-natural') && row.variant === (target.variant ?? null))
    const gold = subset.reduce((n, row) => n + row.goldEarned, 0), potionCost = subset.reduce((n, row) => n + row.potionCost, 0)
    const key = `${powerband}|${build}|${policy}|${target.fixture ?? target.id}|${target.variant ?? 'none'}`
    groups[key] = {
      fights: subset.length, wins: subset.filter(row => row.won).length, deaths: subset.filter(row => row.died).length,
      winRate: subset.filter(row => row.won).length / subset.length,
      turnsP10: quantile(subset.map(row => row.turns), .1), turnsP50: quantile(subset.map(row => row.turns), .5), turnsP90: quantile(subset.map(row => row.turns), .9),
      damageDealtMedian: quantile(subset.map(row => row.damageDealt), .5), enemyHpNetRemovalMedian: quantile(subset.map(row => row.enemyHpNetRemoval), .5),
      grossDamageTakenMedian: quantile(subset.map(row => row.damageTakenGross), .5), enemyHealingMedian: quantile(subset.map(row => row.enemyHealing), .5),
      potionsMedian: quantile(subset.map(row => row.potionsUsed), .5), potionHealingMedian: quantile(subset.map(row => row.potionHealing), .5),
      potionCostPerGold: gold > 0 ? potionCost / gold : null, potionCostGold: potionCost, goldEarned: gold,
      fightsWithGold: subset.filter(row => row.goldEarned > 0).length,
      outcomeVsLegacy: Object.fromEntries(['outcome-upgrade', 'equivalent-to-legacy', 'low-value-vs-legacy', 'sidegrade-tradeoff']
        .map(label => [label, subset.filter(row => row.outcomeVsLegacy === label).length])),
    }
    expect(subset.length).toBe(seeds.length)
  }
  const finalSource = sourceSnapshot(), finalHarness = harnessHash()
  expect(finalSource).toEqual(startSource)
  expect(finalHarness).toBe(startHarness)
  const report = {
    schemaVersion: 3, sourceCommit: startSource.commit, sourceSha256: startSource.sourceSha256, sourceFingerprint: startSource.fingerprint,
    harnessSha256: startHarness,
    sourceManifestAlgorithm: 'recursive filesystem walk of every file under src (including untracked; no ignore filtering), relative POSIX paths sorted lexicographically; fingerprint is SHA256(JSON.stringify(path-to-file-SHA256 map)).',
    seeds, powerbands: {
      early: 'fresh engine character (Lv1/100 HP); controlled initial forest position',
      edge: 'engine gainExp(180) progression (Lv4 / combat Lv4); no injected gold/world resources',
      ready: 'actual engine gainExp(300) progression; assertions require hero Lv5 and combat Lv6; every row records both levels',
    },
    builds, policies, targets, readyFixtureMetadata: { heroLevel: 5, combatLevel: 6, assertedInRunner: true },
    repeatedFightPairs: rows.length, actualFightRuns: rows.length * 2, metricRows: rows.length,
    groups, rows, economy: { potionShopPriceGold: 20,
      potionCostPerGold: 'null when group earns zero gold; otherwise sum potion cost / sum combat gold; raw gold is recorded only on wins.' },
    pairedOutcomeClassification: 'Same seed, powerband, target snapshot, and action policy versus legacy. Upgrade means no worse win, survival, turns, gross damage taken, or potion count and strict improvement on one or more; low-value is reverse dominance; exact equality is equivalent; other outcomes are tradeoffs.',
    harnessPreflight: [
      'Public playerAttackDamage diagnostic passes explicit { wolfArmoredPhase } exactly as combatTurn does; cloned state must preserve live RNG.',
      'Public combatTurn attack HP changes are asserted against cloned-formula damage minus separately expected boss healing, including death/state-clear cases.',
      'Gross incoming damage uses turn HP delta adjusted by actual potion healing; winning turn receives no incoming attack.',
      'Rank-profile and canonical boss equipment are awarded through awardWolfLoot on detached, same-powerband hero-equivalent state before encounter; fight RNG remains untouched.',
      'Boss standard-body comparison is an explicitly controlled clone of the actual level-7 moonFangSpear award, with only base changed to spear and rolled stats recomputed.',
      'Each case has exact uninterrupted versus save/reload-every-three-turn state and command equality; source manifest and runner hash are checked before/after.',
    ],
    fixtureNotes: [
      'Target matrix: natural gray wolf, natural alpha elite, controlled armored-only alpha, and three wolfKing variants set before turn one.',
      'Rank builds eliteDrop/miniBossDrop/boss use actual detached awardWolfLoot profiles; boss uses fixed Wolf King dropLevel 7 and exclusive moonFangSpear.',
      'bossStandardBody is a labeled counterfactual matched standard spear body; it is not another actual Wolf King drop.',
      'affixControl reuses the exact penetration gear fixture and replaces only piercing with same-tier bleeding; legal matched affix counterfactual.',
      'Ready is engine progression gainExp(300): hero Lv5/combat Lv6, asserted and recorded in every row.',
      'No party healer or companion fixture; no manual changes during a fight. All item setup occurs before encounter creation.',
    ],
    armorContext: { API: 'playerAttackDamage(state, effectiveDefense, true, { wolfArmoredPhase })',
      note: 'The boolean is computed from the same public wolfCombatPhase snapshot used by combatTurn; armor context is not inferred from target ID.' },
    elapsedMs: performance.now() - started,
    harnessGuard: { sourceStable: true, runnerStable: true, expectedSourceCommit: process.env.PHASE4_EXPECT_SOURCE_COMMIT ?? null,
      expectedSourceFingerprint: process.env.PHASE4_EXPECT_SOURCE_FINGERPRINT ?? null },
    limitations: 'Headless engine progression and controlled trait/gear counterfactuals are not browser or human evidence. Boss award profile is sampled once per seed/powerband, and observed fight outcomes must be interpreted with the paired metadata.',
  }
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', `${out}/${runLabel}-combat-balance.json`, '--producer', 'g6-luna-med-phase4-sim-engineer'],
    { cwd: root, input: `${JSON.stringify(report, null, 2)}\n`, stdio: ['pipe', 'inherit', 'inherit'] })
}, 900000)
