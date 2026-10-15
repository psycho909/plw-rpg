import { describe, expect, it } from 'vitest'
import { LIVING_EVENT_LIMITS } from '../data/livingEvents'
import { tryStartRegionalCrisis } from '../engine/regionalCrisis'
import { createGame, player } from '../engine/simulation'
import { projectGoalHints } from './goalHints'

describe('contextual goal hints', () => {
  it('only includes an open request and derives its reason and route from request state', () => {
    const state = createGame(901)
    state.life.requests.push({
      id: 'request-food-1', kind: 'food', npcId: null, arcId: null, createdAt: 0,
      expiresAt: state.worldTime + 3 * 1440, status: 'open', amount: 5, progress: 2,
    })
    const before = structuredClone(state)

    const hints = projectGoalHints(state)

    expect(hints).toContainEqual(expect.objectContaining({
      id: 'request:request-food-1', what: '回應「糧食供應」', why: expect.stringContaining('2／5'), where: '橡谷廣場',
      position: LIVING_EVENT_LIMITS.deliverySquare,
    }))
    expect(state).toEqual(before)
  })

  it('does not suggest closed requests or crops when every plot is occupied', () => {
    const state = createGame(902)
    state.life.requests.push({
      id: 'request-closed', kind: 'iron', npcId: null, arcId: null, createdAt: 0,
      expiresAt: state.worldTime + 100, status: 'completed', amount: 2, progress: 2,
    })
    const actor = player(state)
    actor.currentRegion = 'farmland'
    state.crops = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1, cropId: 'wheat', plantedAt: 0, growthDuration: 1, matureAt: 1, status: 'growing' as const,
    }))

    const hints = projectGoalHints(state)

    expect(hints.some(hint => hint.id.startsWith('request:'))).toBe(false)
    expect(hints.some(hint => hint.id.startsWith('crop:'))).toBe(false)
  })

  it('does not suggest an expired request while its world status is still open', () => {
    const state = createGame(908)
    state.life.requests.push({
      id: 'request-expired', kind: 'food', npcId: null, arcId: null, createdAt: 0,
      expiresAt: state.worldTime, status: 'open', amount: 1, progress: 0,
    })

    expect(projectGoalHints(state)).toEqual([])
  })

  it('only suggests a high-rank encounter when the engine eligibility projection allows it', () => {
    const state = createGame(903)
    const actor = player(state)
    actor.currentRegion = 'forest'
    actor.level = 10
    state.threat.threatLevel = 3
    state.threat.monsterPopulation = 80
    state.regions.forest.discovered = true

    const hints = projectGoalHints(state)

    expect(hints.some(hint => hint.id.startsWith('encounter:'))).toBe(true)
  })

  it('surfaces the wolf Boss only after the canonical wolf projection makes it eligible', () => {
    const state = createGame(909)
    const actor = player(state)
    actor.currentRegion = 'forest'
    state.threat.monsterPopulation = 40
    state.reward.collection.defeated.push('grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader')

    expect(projectGoalHints(state)).toContainEqual(expect.objectContaining({ id: 'wolf:wolfKing', what: expect.stringContaining('北林狼王') }))
  })

  it('surfaces the Goblin Chief only while its existing world-state flag is active', () => {
    const state = createGame(910)
    player(state).currentRegion = 'forest'
    state.threat.bossAlive = true

    expect(projectGoalHints(state)).toContainEqual(expect.objectContaining({ id: 'boss:goblin-chief', what: expect.stringContaining('哥布林酋長') }))
  })

  it('suggests a seasonal content crop only when the shared farm projection says it is plantable', () => {
    const state = createGame(905)
    player(state).currentRegion = 'farmland'

    const hints = projectGoalHints(state)

    expect(hints).toContainEqual(expect.objectContaining({ id: 'crop:spring_pea', what: expect.stringContaining('豌豆'), where: '東方農田' }))
  })

  it('surfaces a crisis only while the persisted crisis is in an actionable phase', () => {
    const state = createGame(906)
    state.settlement.food = 0
    state.settlement.safety = 25
    Object.assign(state.threat, { threatLevel: 3, monsterPopulation: 100, campLevel: 3, bossAlive: true })
    expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)

    expect(projectGoalHints(state)).toContainEqual(expect.objectContaining({ id: expect.stringMatching(/^crisis:/), where: '北方森林' }))
  })

  it('does not create goal hints without a matching world condition', () => {
    const state = createGame(907)

    expect(projectGoalHints(state)).toEqual([])
  })

  it('caps the returned contextual suggestions at five', () => {
    const state = createGame(904)
    for (let index = 0; index < 8; index++) state.life.requests.push({
      id: `request-${index}`, kind: 'food', npcId: null, arcId: null, createdAt: index,
      expiresAt: state.worldTime + 1440, status: 'open', amount: 1, progress: 0,
    })
    const actor = player(state)
    actor.currentRegion = 'forest'
    state.threat.monsterPopulation = 40
    state.threat.bossAlive = true
    state.reward.collection.defeated.push('grayWolf', 'scarredWolf', 'alphaWolf', 'packLeader')
    state.settlement.food = 0
    state.settlement.safety = 25
    Object.assign(state.threat, { threatLevel: 3, campLevel: 3 })
    expect(tryStartRegionalCrisis(state, () => 0)).toBe(true)

    expect(projectGoalHints(state)).toHaveLength(5)
    expect(projectGoalHints(state).length).toBeLessThanOrEqual(5)
  })
})
