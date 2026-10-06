import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { createGame, player } from '../../../../src/engine/simulation'
import { encounterWolf, wolfCombatPresentation } from '../../../../src/engine/wolfFamily'
import { combatTurn } from '../../../../src/engine/actions'
import { generateItem } from '../../../../src/engine/itemGeneration'
import { equipInstance } from '../../../../src/engine/rewardActions'
import { deserialize, serialize } from '../../../../src/services/saveService'
import type { GameState } from '../../../../src/domain/types'
import type { MonsterDefinitionId } from '../../../../src/domain/reward'

const output = process.cwd() + '/reports/v2/20261006-reward-core/phase-03'
mkdirSync(output, { recursive: true })
const stamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '')
const ids: MonsterDefinitionId[] = ['grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader', 'wolfKing']
const seeds = [1, 2, 3, 7, 17, 42, 77, 909, 2026, 2027, 8191, 9981]
function fixture(seed: number): GameState {
  const state = createGame(seed), c = player(state)
  // Controlled fight fixture, not normal/browser/Human play or a balance conclusion.
  c.position = { x: 7, y: 6 }; c.currentRegion = 'forest'
  c.level = 4; c.exp = 0; c.stats.strength = 14; c.stats.vitality = 12
  c.skills.combat.level = 4; c.skills.combat.exp = 0; c.maxHp = 140; c.hp = 140
  state.life.characters[c.id]!.actions.combat = seed % 3 === 0 ? 24 : seed % 3 === 1 ? 12 : 4
  state.threat.monsterPopulation = seed % 3 === 0 ? 10 : seed % 3 === 1 ? 45 : 75
  state.settlement.safety = seed % 3 === 0 ? 95 : seed % 3 === 1 ? 70 : 40
  state.reward.collection.seen = ids.slice(0, 4)
  state.reward.collection.defeated = ids.slice(0, 4)
  for (const baseId of ['shortSword', 'chainArmor'] as const) {
    const item = generateItem(state, { baseId, level: 5, material: baseId === 'shortSword' ? 'wolfFang' : 'wolfHide' })
    state.reward.instances.push(item)
    expect(equipInstance(state, item.instanceId)).toBe('')
  }
  return state
}
function fight(seed: number, id: MonsterDefinitionId, strategy: 'attack' | 'cue') {
  let state = fixture(seed)
  const initialHp = player(state).hp, initialPotion = player(state).inventory.potion
  expect(encounterWolf(state, id)).toBe('')
  const formation = structuredClone(state.combat!.familyEncounter)
  const commands: string[] = []
  let reloads = 0
  for (let turn = 0; turn < 80 && state.combat; turn++) {
    const c = player(state), cue = wolfCombatPresentation(state)?.cue ?? ''
    const command = c.hp < c.maxHp * .35 && c.inventory.potion
      ? 'potion' : strategy === 'cue' && /急襲|月襲|重擊/.test(cue) ? 'defend' : 'attack'
    commands.push(command)
    expect(combatTurn(state, command)).toBe('')
    if (state.combat && turn % 5 === 0) {
      const loaded = deserialize(serialize(state, 777)).state
      expect(loaded).toEqual(state)
      state = loaded; reloads++
    }
  }
  expect(state.combat).toBeNull()
  expect(deserialize(serialize(state, 777)).state).toEqual(state)
  const c = player(state), won = state.events.some(event => event.type === 'combat.won')
  return { state, sample: { seed, definitionId: id, strategy, formation, won, alive: c.isAlive,
    turns: commands.length, commands, reloads, initialHp, finalHp: c.hp,
    potionsUsed: initialPotion - c.inventory.potion, finalGold: c.gold, worldTime: state.worldTime,
    rngState: state.rngState, awardedGear: state.reward.instances.length - 2,
    materials: state.reward.materials[c.id] ?? null, bossFormRetained: state.reward.wolfBossForm !== null } }
}
it('replays multi-seed family fights and mid-combat saves with controlled, explicitly labelled fixtures', () => {
  const rows = []
  for (const seed of seeds) for (const id of ids) for (const strategy of ['attack', 'cue'] as const) {
    const a = fight(seed, id, strategy), b = fight(seed, id, strategy)
    expect(a.state).toEqual(b.state)
    expect(a.sample).toEqual(b.sample)
    rows.push(a.sample)
  }
  const summary = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    harnessSha256: createHash('sha256').update(readFileSync(output + '/fight_sim.test.ts')).digest('hex'),
    seeds, fixtureScenarios: rows.length, totalRepeatedFights: rows.length * 2, rows,
    limitation: 'Controlled headless Lv4/140HP/2 generated items fixture; no altered player gold/time. This is not normal play, human feedback, a comprehensive balance gate, or browser stress.' }
  appendFileSync(output + '/fight-samples-' + stamp + '.jsonl', JSON.stringify(summary) + '\n')
}, 60000)
