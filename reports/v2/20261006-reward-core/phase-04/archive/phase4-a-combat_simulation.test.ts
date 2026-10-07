import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { generateItem } from '../../../../src/engine/itemGeneration'
import { createGame, gainExp, player } from '../../../../src/engine/simulation'
import { combatTurn } from '../../../../src/engine/actions'
import { encounterWolf, resolveWolfCombatStats, wolfCombatPhase, wolfCombatPresentation, wolfChargeHealing, wolfDefenseForTurn } from '../../../../src/engine/wolfFamily'
import { playerAttackDamage } from '../../../../src/engine/combatStats'
import { equipInstance } from '../../../../src/engine/rewardActions'
import { deserialize, serialize } from '../../../../src/services/saveService'
import type { GameState } from '../../../../src/domain/types'
import type { BossVariantId, ItemBaseId, ItemInstance, MonsterDefinitionId, MonsterTraitId, RarityId } from '../../../../src/domain/reward'

const root = process.cwd(), out = `${root}/reports/v2/20261006-reward-core/phase-04`
const requestedSeedCount = Number(process.env.PHASE4_COMBAT_SEEDS ?? 2)
const seeds = [17, 42, 77, 909, 2026, 2027, 8191, 9981].slice(0, requestedSeedCount)
const powerbands = ['early', 'edge', 'ready'] as const
const builds = ['legacy', 'earlygear', 'raw', 'crit', 'bleed', 'penetration', 'defense', 'common', 'rare', 'epic', 'boss'] as const
const policies = ['attack', 'cue'] as const
type Target = { id: MonsterDefinitionId; variant?: BossVariantId; traits?: MonsterTraitId[]; fixture?: string }
const targets: Target[] = [
  { id: 'grayWolf' }, { id: 'alphaWolf' }, { id: 'alphaWolf', traits: ['armored'], fixture: 'controlled-armored-elite' },
  { id: 'wolfKing', variant: 'wellFed' }, { id: 'wolfKing', variant: 'starved' }, { id: 'wolfKing', variant: 'moonlit' },
]
const focus: Partial<Record<typeof builds[number], string>> = { crit: 'keen', bleed: 'bleeding', penetration: 'piercing', defense: 'warding' }
const rarityFor: Partial<Record<typeof builds[number], RarityId>> = { earlygear: 'common', raw: 'common', common: 'common', rare: 'rare', epic: 'epic' }
type Result = { seed: number; powerband: string; build: string; policy: string; target: string; targetFixture: string; variant: string | null; traits: string[]; startingRngState: number; initialHp: number; enemyMaxHp: number; finalEnemyHp: number; won: boolean; died: boolean; turns: number; damageDealt: number; enemyHpNetRemoval: number; damageTakenGross: number; enemyHealing: number; potionsUsed: number; potionHealing: number; potionCost: number; goldEarned: number; reloads: number; commands: string[]; outcomeVsLegacy?: string }

function fixture(seed: number, powerband: typeof powerbands[number], target: Target) {
  const state = createGame(seed), c = player(state)
  c.currentRegion = 'forest'; c.position = { x: 7, y: 6 }
  if (powerband === 'edge') gainExp(state, c, 180, 'combat')
  if (powerband === 'ready') gainExp(state, c, 300, 'combat')
  state.reward.collection.defeated = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader']
  state.threat.monsterPopulation = 75; state.settlement.safety = 55
  return state
}

function gearFor(seed: number, powerband: typeof powerbands[number], build: typeof builds[number], ownerId: string, itemLevel: number): ItemInstance[] {
  if (build === 'legacy') return []
  const gearState = createGame((seed ^ (powerband === 'early' ? 0x101 : powerband === 'edge' ? 0x202 : 0x303)) >>> 0)
  const wantedRarity = rarityFor[build], items: ItemInstance[] = []
  for (const [slot, baseId] of [['weapon', build === 'raw' ? 'axe' : 'shortSword'], ['armor', build === 'earlygear' ? 'hideArmor' : 'chainArmor']] as const) {
    const wantedAffix = (slot === 'weapon' && ['crit', 'bleed', 'penetration'].includes(build)) || (slot === 'armor' && build === 'defense') ? focus[build] : undefined
    let selected: ItemInstance | undefined
    for (let attempt = 0; attempt < 1000 && !selected; attempt++) {
      const item = generateItem(gearState, { baseId: baseId as ItemBaseId, level: itemLevel,
        material: build === 'crit' ? 'moonStone' : build === 'bleed' || build === 'penetration' ? 'wolfFang' : build === 'defense' ? 'wolfHide' : undefined,
        bossSource: build === 'boss' ? 'wolfKing' : undefined })
      if (wantedRarity && item.rarity !== wantedRarity) continue
      if (wantedAffix && !item.affixes.some(affix => affix.id === wantedAffix)) continue
      selected = { ...item, ownerId }
    }
    expect(selected, `${build} ${slot} fixture must be obtainable through legal generation`).toBeDefined()
    items.push(selected!)
  }
  return items
}

function setup(seed: number, powerband: typeof powerbands[number], build: typeof builds[number], target: Target): GameState {
  const state = fixture(seed, powerband, target), c = player(state)
  if (build === 'legacy') { c.equipment.weapon = 'sword'; c.equipment.armor = 'armor' }
  else {
    const items = gearFor(seed, powerband, build, c.id, build === 'earlygear' ? 1 : c.level + 1)
    state.reward.instances.push(...items)
    state.reward.nextInstanceId = Math.max(...items.map(item => Number(item.instanceId.slice('item-'.length)))) + 1
    for (const item of items) {
      if (!state.reward.collection.bases.includes(item.baseId)) state.reward.collection.bases.push(item.baseId)
      if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
        if (!state.reward.collection.rareBases.includes(item.baseId)) state.reward.collection.rareBases.push(item.baseId)
      }
    }
    for (const item of items) expect(equipInstance(state, item.instanceId)).toBe('')
  }
  expect(encounterWolf(state, target.id)).toBe('')
  const family = state.combat!.familyEncounter!
  if (target.variant) family.variant = target.variant
  if (target.traits) family.traits = [...target.traits]
  if (target.variant || target.traits) {
    if (state.reward.wolfBossForm) Object.assign(state.reward.wolfBossForm, family)
    const stats = resolveWolfCombatStats(family)
    Object.assign(state.combat!, stats, { hp: stats.maxHp })
  }
  return state
}

function scenarioKey(row: Pick<Result, 'seed' | 'powerband' | 'policy' | 'target' | 'targetFixture' | 'variant'>) {
  return [row.seed, row.powerband, row.policy, row.target, row.targetFixture, row.variant ?? 'none'].join('|')
}

function run(seed: number, powerband: typeof powerbands[number], build: typeof builds[number], policy: typeof policies[number], target: Target, reload: boolean): { state: GameState; result: Result } {
  let state = setup(seed, powerband, build, target)
  const initialHp = player(state).hp, enemyMaxHp = state.combat!.maxHp, startingRngState = state.rngState
  const family = state.combat!.familyEncounter!, formation = structuredClone(family), commands: string[] = []
  const initialPotions = player(state).inventory.potion, initialGold = player(state).gold
  let damageDealt = 0, enemyHpNetRemoval = 0, damageTakenGross = 0, enemyHealing = 0, potionHealing = 0, reloads = 0, finalEnemyHp = state.combat!.hp
  for (let turn = 0; turn < 100 && state.combat && player(state).isAlive; turn++) {
    const c = player(state), cue = wolfCombatPresentation(state)?.cue ?? '', monster = state.combat!
    const command = c.hp <= c.maxHp * .45 && c.inventory.potion ? 'potion'
      : policy === 'cue' && /急襲|月襲|重擊/.test(cue) ? 'defend' : 'attack'
    const heroHpBefore = c.hp, potionHeal = command === 'potion' ? Math.min(45, c.maxHp - c.hp) : 0
    const enemyHpBefore = monster.hp, phase = wolfCombatPhase(monster.familyEncounter!, monster.hp, monster.maxHp)
    const effectiveDefense = wolfDefenseForTurn(monster.defense, phase)
    const liveRngBeforeDiagnostic = state.rngState, diagnosticState = structuredClone(state)
    const formulaDamage = command === 'attack' ? Math.min(enemyHpBefore, playerAttackDamage(diagnosticState, effectiveDefense, true)) : 0
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
    if (state.combat) damageTakenGross += Math.max(0, heroHpBefore + potionHeal - player(state).hp)
    else if (!wonOnTurn) damageTakenGross += Math.max(0, heroHpBefore + potionHeal - player(state).hp)
    if (reload && state.combat && turn % 3 === 2) { state = deserialize(serialize(state, 777)).state; reloads++ }
  }
  const c = player(state), won = state.events.some(event => event.type === 'combat.won')
  return { state, result: { seed, powerband, build, policy, target: target.id, targetFixture: target.fixture ?? 'public-natural', variant: target.variant ?? null,
    traits: formation.traits, startingRngState, initialHp, enemyMaxHp, finalEnemyHp, won, died: !c.isAlive, turns: commands.length,
    damageDealt, enemyHpNetRemoval, damageTakenGross, enemyHealing, potionsUsed: initialPotions - c.inventory.potion, potionHealing,
    potionCost: (initialPotions - c.inventory.potion) * 20, goldEarned: c.gold - initialGold,
    reloads, commands } }
}

const quantile = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((xs.length - 1) * q))] ?? 0
const sourceSha256 = Object.fromEntries(execFileSync('git', ['ls-files', 'src'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort().map(path => [path, createHash('sha256').update(readFileSync(`${root}/${path}`)).digest('hex')]))
const dominates = (a: Result, b: Result) => Number(a.won) >= Number(b.won) && Number(a.died) <= Number(b.died) && a.turns <= b.turns && a.damageTakenGross <= b.damageTakenGross && a.potionsUsed <= b.potionsUsed
function pairedClassification(row: Result, legacy: Result): string {
  const metricsEqual = row.won === legacy.won && row.died === legacy.died && row.turns === legacy.turns && row.damageTakenGross === legacy.damageTakenGross && row.potionsUsed === legacy.potionsUsed
  if (metricsEqual) return 'equivalent-to-legacy'
  if (dominates(row, legacy)) return 'outcome-upgrade'
  if (dominates(legacy, row)) return 'low-value-vs-legacy'
  return 'sidegrade-tradeoff'
}

it('compares actual wolf combat builds across power bands and boss variants with paired snapshots and exact replay', () => {
  expect(seeds.length).toBeGreaterThan(0)
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
    const subset = rows.filter(row => row.powerband === powerband && row.build === build && row.policy === policy && row.target === target.id && row.targetFixture === (target.fixture ?? 'public-natural') && row.variant === (target.variant ?? null))
    const gold = subset.reduce((n, r) => n + r.goldEarned, 0), potionCost = subset.reduce((n, r) => n + r.potionCost, 0)
    const key = `${powerband}|${build}|${policy}|${target.fixture ?? target.id}|${target.variant ?? 'none'}`
    groups[key] = { fights: subset.length, wins: subset.filter(row => row.won).length, deaths: subset.filter(row => row.died).length,
      winRate: subset.filter(row => row.won).length / subset.length, turnsP10: quantile(subset.map(row => row.turns), .1), turnsP50: quantile(subset.map(row => row.turns), .5), turnsP90: quantile(subset.map(row => row.turns), .9),
      damageDealtMedian: quantile(subset.map(row => row.damageDealt), .5), enemyHpNetRemovalMedian: quantile(subset.map(row => row.enemyHpNetRemoval), .5), grossDamageTakenMedian: quantile(subset.map(row => row.damageTakenGross), .5), enemyHealingMedian: quantile(subset.map(row => row.enemyHealing), .5),
      potionsMedian: quantile(subset.map(row => row.potionsUsed), .5), potionHealingMedian: quantile(subset.map(row => row.potionHealing), .5),
      potionCostPerGold: gold > 0 ? potionCost / gold : null, fightsWithGold: subset.filter(row => row.goldEarned > 0).length,
      outcomeVsLegacy: Object.fromEntries(['outcome-upgrade', 'equivalent-to-legacy', 'low-value-vs-legacy', 'sidegrade-tradeoff'].map(label => [label, subset.filter(row => row.outcomeVsLegacy === label).length])) }
    expect(subset.length).toBe(seeds.length)
  }
  const report = { schemaVersion: 2, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceSha256, harnessSha256: createHash('sha256').update(readFileSync(`${out}/combat_simulation.test.ts`)).digest('hex'), seeds, powerbands: { early: 'fresh engine character (Lv1/100 HP); controlled initial forest position', edge: 'engine gainExp(180) progression (Lv4 / combat Lv4); no injected gold/world resources', ready: 'engine gainExp(300) progression (Lv5 / combat Lv5); no injected gold/world resources' }, builds, policies, targets, repeatedFightPairs: rows.length, metricRows: rows.length, groups, rows, economy: { potionShopPriceGold: 20, potionCostPerGold: 'null if cohort has zero earned gold; sums fight potion-cost / sum combat gold otherwise', rawGoldIsOnlyRecordedOnWins: true }, pairedOutcomeClassification: 'Same-seed, same powerband/target snapshot/action policy comparison vs legacy. Outcome upgrade requires non-worse win, survival, turns, gross damage taken, and potions, with at least one strict improvement. Low-value is the reverse dominance. Exact equality is equivalent; non-dominating tradeoffs are sidegrades. These are paired actual fight outcomes, not arbitrary weighted-stat thresholds.', harnessPreflight: ['Prior sanity schemaVersion 1 report is retained as an earlier version in phase-04/playlog.jsonl.', 'Initial net HP delta mislabeled gross incoming damage; replaced by per-turn HP-loss accounting with actual potion heal removed; won turns have no incoming attack.', 'Initial end-state combat.hp expression counted every death as full enemy damage; replaced with public playerAttackDamage on cloned pre-turn state and checked against actual per-turn monster HP net removal plus separate healing.', 'Initial separate gear generation consumed the same encounter RNG stream; gear now uses detached legal generation, and build pairs assert identical target snapshot, hero HP, and live pre-battle RNG.'], fixtureNotes: ['public encounterWolf and combatTurn; actual wolf traits, RNG, attack formula and incoming damage', 'earlygear is generated as legal level-1 Common shortSword + hideArmor; common profile uses hero-level+1 shortSword + chainArmor', 'gear is generated legally on a detached RNG state and applied before encounter turn one, so all builds share same enemy snapshot, hero HP and live prebattle RNG state', 'armored elite replaces random elite traits with exactly armored before turn one; controlled snapshot is explicitly separated', 'three boss variants are selected before turn one; variant and traits do not change during fight', 'all builds use the same attack or cue policy within each paired comparison', 'formula damage uses public playerAttackDamage against a cloned pre-turn state; gross incoming damage removes only actual potion healing from HP delta, no party/healer fixture', 'each case is replayed once uninterrupted and once with save/reload every three turns; exact final state and command equality required'], elapsedMs: performance.now() - started, limitations: 'Two paired seeds per scenario by default for runner sanity; increase PHASE4_COMBAT_SEEDS for full baseline. Controlled engine progression and trait fixtures are headless simulations, not browser play or human evidence.' }
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', `${out}/combat-balance.json`, '--producer', 'g6-luna-med-phase4-sim-engineer'], { cwd: root, input: `${JSON.stringify(report, null, 2)}\n`, stdio: ['pipe', 'inherit', 'inherit'] })
}, 600000)
