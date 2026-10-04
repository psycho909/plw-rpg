import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/config'
import { IDENTITY_LIMITS } from '../data/identity'
import { calendar } from './calendar'
import { buyProperty, homeRest, propertyEligibility, supplyFarmFood, transferStorage } from './ownership'
import { createGame, player, simulate, walkTo } from './simulation'

describe('ownership', () => {
  it('projects the home price and money blocker without mutating the world', () => {
    const state = createGame()
    const before = structuredClone(state)

    expect(propertyEligibility(state, 'home')).toEqual({
      kind: 'home', label: '自宅', eligible: false,
      cost: { gold: 80, reputation: 0 }, reasons: ['金幣不足（需要 80）。'],
    })
    expect(state).toEqual(before)

    player(state).gold = 80
    expect(propertyEligibility(state, 'home').eligible).toBe(true)
  })

  it('buys a home once for the active character and keeps it in the world after death', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 100
    const start = state.worldTime

    expect(buyProperty(state, 'home')).toBe('')
    expect(c.gold).toBe(20)
    expect(state.worldTime).toBe(start + 30)
    expect(state.life.director.lastPlayerActivity).toBe(start + 30)
    expect(state.life.properties).toMatchObject([{
      id: `property:home:${c.id}`, kind: 'home', ownerId: c.id, acquiredAt: start + 30,
      position: { x: 7, y: 10 }, foodSupplied: 0, suppliedDay: Math.floor((start + 30) / 1440), suppliedToday: 0,
    }])
    expect(state.life.characters[c.id]!.milestones).toContainEqual({
      id: 'ownership:home', at: start + 30, text: '取得自宅',
    })
    expect(state.history.at(-1)).toMatchObject({ type: 'property.acquired', category: 'player' })
    expect(propertyEligibility(state, 'home').eligible).toBe(false)

    c.isAlive = false
    const successorId = 'successor'
    state.activeCharacterId = successorId
    state.characters.push({ ...structuredClone(c), id: successorId, isAlive: true, status: 'idle', gold: 100 })
    state.life.characters[successorId] = { ...structuredClone(state.life.characters[c.id]!), reputation: 0 }
    expect(state.life.properties[0]!.ownerId).toBe(c.id)
    expect(propertyEligibility(state, 'home').eligible).toBe(true)
  })

  it('keeps character milestone history within the identity limit when adding ownership', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 100
    const life = state.life.characters[c.id]!
    life.milestones = Array.from({ length: IDENTITY_LIMITS.milestones }, (_, index) => ({
      id: `prior:${index}`, at: index, text: `Prior ${index}`,
    }))

    expect(buyProperty(state, 'home')).toBe('')
    expect(life.milestones).toHaveLength(IDENTITY_LIMITS.milestones)
    expect(life.milestones.at(-1)).toEqual({ id: 'ownership:home', at: state.worldTime, text: '取得自宅' })
  })

  it('requires the settlement stage and reputation for land, then land for the farm business', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 1000
    walkTo(state, BUILDINGS.farm.position)
    expect(propertyEligibility(state, 'land').reasons).toContain('橡谷尚未成長為村莊。')

    state.settlement.stage = 'village'
    expect(propertyEligibility(state, 'land').reasons).toContain('地方聲望不足（需要 10）。')
    state.life.characters[c.id]!.reputation = 30
    expect(propertyEligibility(state, 'land').eligible).toBe(true)
    expect(buyProperty(state, 'land')).toBe('')
    expect(propertyEligibility(state, 'farmBusiness').eligible).toBe(true)
    expect(propertyEligibility(state, 'farmBusiness').reasons).not.toContain('必須先取得農地。')
    expect(buyProperty(state, 'farmBusiness')).toBe('')
    expect(state.life.properties.map(property => property.kind)).toEqual(['land', 'farmBusiness'])
    expect(state.life.characters[c.id]!.identities).toContain('farmOwner')
    expect(state.npcs.some(npc => npc.job === 'farmer'
      && state.life.npcs[npc.id]?.memories.some(memory => memory.kind === 'PLAYER_OWNS_FARM'))).toBe(true)
  })

  it('keeps farm business income manual rather than generating food or money over time', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 1000
    state.settlement.stage = 'village'
    state.life.characters[c.id]!.reputation = 30
    walkTo(state, BUILDINGS.farm.position)
    expect(buyProperty(state, 'land')).toBe('')
    expect(buyProperty(state, 'farmBusiness')).toBe('')
    const business = state.life.properties.find(property => property.kind === 'farmBusiness')!
    const food = c.inventory.food
    const gold = c.gold

    simulate(state, 1440)

    expect(c.inventory.food).toBe(food)
    expect(c.gold).toBe(gold)
    expect(business.foodSupplied).toBe(0)
  })

  it('blocks ownership purchases away from the site, while dead, in combat, or in a dungeon', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 100
    c.position = { x: 10, y: 8 }
    const before = structuredClone(state)
    expect(buyProperty(state, 'home')).toBe('請前往家旁。')
    expect(state).toEqual(before)

    c.position = { ...BUILDINGS.house.position }
    c.isAlive = false
    expect(propertyEligibility(state, 'home').reasons[0]).toBe('角色已離世，請選擇繼任者。')
    expect(buyProperty(state, 'home')).toBe('角色已離世，請選擇繼任者。')
    c.isAlive = true
    c.status = 'combat'
    expect(buyProperty(state, 'home')).toBe('目前無法進行這項活動。')
    c.status = 'idle'
    state.combat = { monsterId: 'slime', hp: 1, maxHp: 1, attack: 1, defense: 0, exp: 0, gold: 0, elite: false, dungeon: false }
    expect(buyProperty(state, 'home')).toBe('目前無法進行這項活動。')
    state.combat = null
    state.dungeon.inDungeon = true
    expect(buyProperty(state, 'home')).toBe('目前無法進行這項活動。')
  })

  it('does not grant a purchase when the actor dies during the paid transaction', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 100
    const beforeNewYear = 120 * 1440 - 30 - state.worldTime
    state.worldTime += beforeNewYear
    c.birthYear = calendar(state.worldTime).year - c.lifespan + 1
    const start = state.worldTime

    expect(buyProperty(state, 'home')).toBe('角色已離世，請選擇繼任者。')
    expect(c.gold).toBe(20)
    expect(c.isAlive).toBe(false)
    expect(state.worldTime).toBe(start + 30)
    expect(state.life.properties).toHaveLength(0)
  })

  it('rests at an owned home, restores the living owner, and blocks a distant owner', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 100
    expect(buyProperty(state, 'home')).toBe('')
    c.hp = 20
    c.stamina = 10
    const start = state.worldTime

    expect(homeRest(state)).toBe('')
    expect(state.worldTime).toBe(start + 480)
    expect(state.life.director.lastPlayerActivity).toBe(start + 480)
    expect(c.hp).toBe(c.maxHp)
    expect(c.stamina).toBe(c.maxStamina)

    c.position = { x: 10, y: 8 }
    const before = structuredClone(state)
    expect(homeRest(state)).toBe('請回到自宅旁休息。')
    expect(state).toEqual(before)
  })

  it('does not restore the owner if a home rest crosses their death', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 100
    expect(buyProperty(state, 'home')).toBe('')
    state.worldTime = 120 * 1440 - 480
    c.birthYear = calendar(state.worldTime).year - c.lifespan + 1
    c.hp = 20
    c.stamina = 10

    expect(homeRest(state)).toBe('角色已離世，請選擇繼任者。')
    expect(c.isAlive).toBe(false)
    expect(c.hp).toBe(0)
    expect(c.stamina).toBe(10)
    expect(state.life.properties[0]!.ownerId).toBe(c.id)
  })

  it('moves exact item quantities through home storage without creating or losing items', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 100
    expect(buyProperty(state, 'home')).toBe('')
    const home = state.life.properties[0]!
    const start = state.worldTime
    state.life.director.lastPlayerActivity = start - 1

    expect(transferStorage(state, 'food', 2, true)).toBe('')
    expect(c.inventory.food).toBe(1)
    expect(home.storage.food).toBe(2)
    expect(transferStorage(state, 'food', 1, false)).toBe('')
    expect(c.inventory.food).toBe(2)
    expect(home.storage.food).toBe(1)
    expect(c.inventory.food + home.storage.food).toBe(3)
    expect(state.worldTime).toBe(start)
    expect(state.life.director.lastPlayerActivity).toBe(start)
  })

  it('rejects invalid, unavailable, or over-capacity storage transfers without mutation', () => {
    const state = createGame()
    const c = player(state)
    expect(transferStorage(state, 'food', 1, true)).toBe('這一代尚未擁有自宅。')
    c.gold = 100
    expect(buyProperty(state, 'home')).toBe('')
    const home = state.life.properties[0]!
    home.storage.food = 99
    c.inventory.food = 1
    const before = structuredClone(state)

    expect(transferStorage(state, 'food', 1, true)).toBe('自宅儲物空間不足。')
    expect(transferStorage(state, 'food', 0, true)).toBe('數量必須是正整數。')
    expect(transferStorage(state, 'food', Number.MAX_SAFE_INTEGER + 1, true)).toBe('數量必須是正整數。')
    expect(state.life.properties[0]!.storage.food).toBe(before.life.properties[0]!.storage.food)
    expect(player(state).inventory.food).toBe(before.characters[0]!.inventory.food)

    c.position = { x: 10, y: 8 }
    expect(transferStorage(state, 'food', 1, true)).toBe('請回到自宅旁使用儲物空間。')

    c.position = { ...BUILDINGS.house.position }
    c.inventory.sword = 1
    c.equipment.weapon = 'sword'
    expect(transferStorage(state, 'sword', 1, true)).toBe('已裝備的物品至少保留一件在背包中。')
    expect(c.inventory.sword).toBe(1)
    expect(home.storage.sword).toBe(0)
  })

  it('consumes supplied food and records bounded settlement impact, reputation, and memory', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 1000
    state.settlement.stage = 'village'
    state.settlement.food = 40
    state.life.characters[c.id]!.reputation = 30
    walkTo(state, BUILDINGS.farm.position)
    expect(buyProperty(state, 'land')).toBe('')
    expect(buyProperty(state, 'farmBusiness')).toBe('')
    const business = state.life.properties.find(property => property.kind === 'farmBusiness')!
    c.inventory.food = 8
    const startReputation = state.life.characters[c.id]!.reputation

    expect(supplyFarmFood(state, 4)).toBe('')
    expect(c.inventory.food).toBe(4)
    expect(state.settlement.food).toBe(44)
    expect(business.foodSupplied).toBe(4)
    expect(business.suppliedToday).toBe(4)
    expect(state.life.director.lastPlayerActivity).toBe(state.worldTime)
    expect(state.life.characters[c.id]!.reputation).toBe(startReputation + 2)
    expect(state.life.settlementMemories.at(-1)).toEqual({
      kind: 'PLAYER_SUPPORTED_FOOD', actorId: c.id, at: state.worldTime, detail: '供應橡谷 4 份食物。',
    })
    expect(state.life.worldMemories.at(-1)).toEqual(state.life.settlementMemories.at(-1))
    expect(state.history.at(-1)).toMatchObject({ type: 'food.supplied', category: 'settlement' })
    expect(state.npcs.some(npc => npc.job === 'farmer'
      && state.life.npcs[npc.id]?.memories.some(memory => memory.kind === 'PLAYER_SUPPORTED_FOOD'))).toBe(true)
  })

  it('rejects invalid food supplies and resets the daily cap on the next world day', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 1000
    state.settlement.stage = 'village'
    state.life.characters[c.id]!.reputation = 30
    walkTo(state, BUILDINGS.farm.position)
    expect(buyProperty(state, 'land')).toBe('')
    expect(buyProperty(state, 'farmBusiness')).toBe('')
    const business = state.life.properties.find(property => property.kind === 'farmBusiness')!
    c.position = { x: 10, y: 8 }
    expect(supplyFarmFood(state, 1)).toBe('請前往農田旁供應食物。')
    c.position = { ...BUILDINGS.farm.position }
    const before = structuredClone(state)
    expect(supplyFarmFood(state, 4)).toBe('背包裡沒有足夠食物。')
    expect(supplyFarmFood(state, 0)).toBe('供應數量必須是正整數。')
    expect(supplyFarmFood(state, 11)).toBe('每次最多供應 10 份食物。')
    expect(state).toEqual(before)

    c.inventory.food = 10
    state.worldTime = 1440 + 510
    business.suppliedDay = Math.floor(state.worldTime / 1440)
    business.suppliedToday = 59
    business.foodSupplied = 59
    expect(supplyFarmFood(state, 2)).toBe('農場事業今日的食物供應已達上限。')
    expect(business.foodSupplied).toBe(59)
    business.suppliedDay = 0
    state.settlement.food = 99
    expect(supplyFarmFood(state, 2)).toBe('聚落糧倉空間不足。')

    state.settlement.food = 40
    expect(supplyFarmFood(state, 2)).toBe('')
    expect(business.foodSupplied).toBe(61)
    expect(business.suppliedToday).toBe(2)
    expect(business.suppliedDay).toBe(Math.floor(state.worldTime / 1440))
  })

  it('does not accept a food gift from a dead or blocked actor', () => {
    const state = createGame()
    const c = player(state)
    c.gold = 1000
    state.settlement.stage = 'village'
    state.life.characters[c.id]!.reputation = 30
    walkTo(state, BUILDINGS.farm.position)
    expect(buyProperty(state, 'land')).toBe('')
    expect(buyProperty(state, 'farmBusiness')).toBe('')
    c.inventory.food = 8

    c.isAlive = false
    const deadState = structuredClone(state)
    expect(supplyFarmFood(state, 4)).toBe('角色已離世，請選擇繼任者。')
    expect(state).toEqual(deadState)

    c.isAlive = true
    c.status = 'combat'
    const combatState = structuredClone(state)
    expect(supplyFarmFood(state, 4)).toBe('目前無法進行這項活動。')
    expect(state).toEqual(combatState)

    c.status = 'idle'
    state.dungeon.inDungeon = true
    const dungeonState = structuredClone(state)
    expect(supplyFarmFood(state, 4)).toBe('目前無法進行這項活動。')
    expect(state).toEqual(dungeonState)
  })
})
