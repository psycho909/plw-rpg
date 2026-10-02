import { describe, expect, it } from 'vitest'
import { BUILDINGS, DUNGEON, MONSTERS } from '../data/config'
import type { GameState } from '../domain/types'
import { canVisit, combatTurn, encounter, enterDungeon, equip, farm, gather, hire, leaveDungeon, rest, trade, usePotion } from './actions'
import { calendar } from './calendar'
import { createGame, player, simulate, walkTo } from './simulation'

function forest(state: GameState) { walkTo(state, { x: 5, y: 4 }) }
function tavern(state: GameState) {
  simulate(state, 120 * 1440)
  walkTo(state, BUILDINGS.tavern.position)
  const hour = calendar(state.worldTime).hour
  if (hour < 17) simulate(state, (17 - hour) * 60)
  player(state).gold = 200
}
function finishFight(state: GameState) {
  for (let i = 0; i < 100 && state.combat; i++) {
    if (player(state).hp < 40 && player(state).inventory.potion) combatTurn(state, 'potion')
    else combatTurn(state, 'attack')
  }
  expect(state.combat).toBeNull()
}

it('selects wild encounters from configured spawn levels', () => {
  const s = createGame(); forest(s); s.threat.threatLevel = 2
  const prior = MONSTERS.goblin.spawnLevel
  try {
    MONSTERS.goblin.spawnLevel = 2
    expect(encounter(s)).toBe(''); expect(s.combat!.monsterId).toBe('goblin')
  } finally { MONSTERS.goblin.spawnLevel = prior }
})

describe('personal life activities', () => {
  it('requires farmland, preparation and exact world-time growth before harvest', () => {
    const s = createGame(), c = player(s)
    expect(farm(s, 'prepare')).not.toBe('')
    walkTo(s, BUILDINGS.farm.position)
    expect(farm(s, 'plant')).not.toBe('')
    expect(farm(s, 'prepare')).toBe(''); expect(farm(s, 'plant')).toBe('')
    const crop = s.crops[0]!, food = c.inventory.food
    simulate(s, crop.matureAt - s.worldTime - 1); expect(farm(s, 'harvest')).not.toBe('')
    simulate(s, 1); expect(crop.status).toBe('mature')
    expect(s.events.at(-1)!.at).toBe(crop.matureAt)
    expect(farm(s, 'harvest')).toBe(''); expect(c.inventory.food).toBeGreaterThan(food)
    expect(c.skills.farming.level).toBe(2)
  })
  it('limits farm plots and blocks work with insufficient stamina', () => {
    const s = createGame(); walkTo(s, BUILDINGS.farm.position)
    for (let i = 0; i < 4; i++) expect(farm(s, 'prepare')).toBe('')
    expect(farm(s, 'prepare')).not.toBe(''); expect(s.preparedPlots).toBe(4)
    player(s).stamina = 0; expect(farm(s, 'plant')).not.toBe(''); expect(s.crops).toHaveLength(0)
  })
  it('gathers wood, stone and iron through regional work and pays gold', () => {
    const s = createGame(), c = player(s)
    expect(gather(s, 'iron')).not.toBe('')
    forest(s); expect(gather(s, 'wood')).toBe(''); expect(c.inventory.wood).toBe(2); expect(c.gold).toBe(49)
    walkTo(s, { x: 19, y: 5 }); expect(gather(s, 'stone')).toBe(''); expect(gather(s, 'iron')).toBe('')
    expect(c.inventory.stone).toBe(2); expect(c.inventory.iron).toBe(2); expect(c.skills.mining.level).toBe(2)
  })
  it('improves yield and time as skills increase and regenerates depleted nodes', () => {
    const s = createGame(), c = player(s); forest(s)
    c.skills.woodcutting.level = 5
    const start = s.worldTime; expect(gather(s, 'wood')).toBe('')
    expect(s.worldTime - start).toBe(35); expect(c.inventory.wood).toBe(4)
    s.regions.forest.remainingAmount = 0; expect(gather(s, 'wood')).not.toBe('')
    simulate(s, 1440); expect(s.regions.forest.remainingAmount).toBe(10)
  })
  it('restores health and stamina through village rest or paid lodging', () => {
    const s = createGame(), c = player(s); c.hp = 10; c.stamina = 0
    expect(rest(s, 'rest')).toBe(''); expect(c.hp).toBe(25); expect(c.stamina).toBe(35)
    walkTo(s, BUILDINGS.inn.position); expect(rest(s, 'inn')).toBe('')
    expect(c.hp).toBe(c.maxHp); expect(c.stamina).toBe(c.maxStamina); expect(c.gold).toBe(37)
    forest(s); expect(rest(s, 'rest')).not.toBe('')
  })
})

describe('shop and equipment', () => {
  it('respects shop location, opening hours and money', () => {
    const s = createGame(), c = player(s)
    expect(trade(s, 'potion', true)).not.toBe('')
    walkTo(s, BUILDINGS.store.position); expect(canVisit(s, 'store')).toBe(true)
    expect(trade(s, 'potion', true)).toBe(''); expect(c.inventory.potion).toBe(3); expect(c.gold).toBe(25)
    c.gold = 0; expect(trade(s, 'potion', true)).not.toBe('')
    s.worldTime = 21 * 60; expect(canVisit(s, 'store')).toBe(false)
  })
  it('unlocks smith goods, equips items and prevents selling the equipped last copy', () => {
    const s = createGame(), c = player(s)
    simulate(s, 120 * 1440); walkTo(s, BUILDINGS.blacksmith.position); c.gold = 200
    expect(trade(s, 'sword', true)).toBe(''); expect(equip(s, 'sword')).toBe('')
    expect(trade(s, 'sword', false)).not.toBe(''); expect(c.inventory.sword).toBe(1)
    expect(trade(s, 'sword', true)).toBe(''); expect(trade(s, 'sword', false)).toBe('')
    expect(c.inventory.sword).toBe(1)
    equip(s, 'sword'); expect(trade(s, 'sword', false)).toBe(''); expect(c.inventory.sword).toBe(0)
  })
})

describe('combat and exploration', () => {
  it('earns combat EXP, loot and gold while reducing threat', () => {
    const s = createGame(), c = player(s); forest(s)
    const monsters = s.threat.monsterPopulation, gold = c.gold
    expect(encounter(s)).toBe(''); const expectedExp = s.combat!.exp
    expect(moveDuringCombat(s)).toBe(false)
    finishFight(s)
    expect(c.inventory.material).toBe(1); expect(c.gold).toBeGreaterThan(gold)
    expect(c.exp + (c.level > 1 ? 30 : 0)).toBe(expectedExp)
    expect(c.skills.combat.exp + (c.skills.combat.level > 1 ? 20 : 0)).toBe(expectedExp)
    expect(s.threat.monsterPopulation).toBe(monsters - 5)
  })
  it('reduces incoming damage when defending and uses a potion as a combat turn', () => {
    const a = createGame(), b = createGame(); forest(a); forest(b); encounter(a); encounter(b)
    const hp = player(a).hp
    combatTurn(a, 'defend'); combatTurn(b, 'attack')
    expect(hp - player(a).hp).toBeLessThan(hp - player(b).hp)
    player(a).hp = 30; const potions = player(a).inventory.potion
    expect(combatTurn(a, 'potion')).toBe(''); expect(player(a).inventory.potion).toBe(potions - 1)
    expect(player(a).hp).toBeGreaterThan(30)
  })
  it('clears combat on death while leaving time and history intact', () => {
    const s = createGame(); forest(s); encounter(s); player(s).hp = 1
    const time = s.worldTime; combatTurn(s, 'defend')
    expect(player(s).isAlive).toBe(false); expect(s.combat).toBeNull()
    expect(s.worldTime).toBe(time + 1); expect(s.history.some(e => e.type === 'npc.died')).toBe(true)
  })
  it('allows retreat without XP or loot and rejects empty potion use', () => {
    const s = createGame(); forest(s); encounter(s); const exp = player(s).exp
    expect(combatTurn(s, 'run')).toBe(''); expect(s.combat).toBeNull(); expect(player(s).exp).toBe(exp)
    player(s).inventory.potion = 0; expect(usePotion(s)).not.toBe('')
  })
  it('completes normal, elite and boss dungeon encounters with scaled loot', () => {
    const s = createGame(), c = player(s)
    expect(enterDungeon(s)).not.toBe('')
    walkTo(s, DUNGEON.position); expect(enterDungeon(s)).toBe('')
    c.stats.strength = 50
    for (let stage = 0; stage < 3; stage++) {
      expect(s.dungeon.stage).toBe(stage); expect(encounter(s)).toBe('')
      expect(s.combat!.elite).toBe(stage === 1)
      finishFight(s)
    }
    expect(s.dungeon.inDungeon).toBe(false); expect(s.dungeon.runs).toBe(1); expect(c.inventory.iron).toBeGreaterThan(0)
    expect(s.history.some(e => e.type === 'dungeon.cleared')).toBe(true)
    expect(leaveDungeon(s)).toBe('')
  })
  it('defeats the world boss and resets its threat buildup', () => {
    const s = createGame(); simulate(s, 3 * 120 * 1440); forest(s); player(s).stats.strength = 200
    expect(encounter(s, true)).toBe(''); finishFight(s)
    expect(s.threat.bossAlive).toBe(false); expect(s.threat.bossProgress).toBe(0)
    expect(s.history.some(e => e.type === 'boss.defeated')).toBe(true)
  })
})

function moveDuringCombat(s: GameState) { return walkTo(s, { x: 6, y: 4 }) }

describe('mercenary contracts and autonomous party', () => {
  it('hires at the tavern only, caps party size at two, and expires contracts', () => {
    const s = createGame(); tavern(s)
    const npcs = s.npcs.filter(n => n.job === 'mercenary')
    expect(hire(s, npcs[0]!.id)).toBe(''); expect(hire(s, npcs[0]!.id)).not.toBe('')
    expect(hire(s, npcs[1]!.id)).toBe(''); expect(hire(s, npcs[2]!.id)).not.toBe('')
    expect(s.party).toHaveLength(2)
    simulate(s, 3 * 1440); expect(s.party).toHaveLength(0)
    expect(s.events.some(e => e.type === 'party.expired')).toBe(true)
  })
  it('charges wages and ends a contract when the player cannot pay', () => {
    const s = createGame(); tavern(s); hire(s, s.npcs.find(n => n.job === 'mercenary')!.id)
    const gold = player(s).gold; simulate(s, 1440); expect(player(s).gold).toBe(gold - 4)
    player(s).gold = 0; simulate(s, 1440); expect(s.party).toHaveLength(0)
  })
  it('lets fighter and healer act autonomously in combat', () => {
    const s = createGame(); tavern(s)
    const npcs = s.npcs.filter(n => n.job === 'mercenary')
    hire(s, npcs[0]!.id); hire(s, npcs[1]!.id); forest(s); encounter(s)
    player(s).hp = 30; const hp = player(s).hp, enemyHp = s.combat!.hp
    combatTurn(s, 'defend')
    expect(player(s).hp).toBeGreaterThan(hp); expect(s.combat?.hp ?? 0).toBeLessThan(enemyHp)
  })
})
