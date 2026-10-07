import { describe, expect, it } from 'vitest'
import { createGame } from '../engine/simulation'
import { tryStartRegionalCrisis } from '../engine/regionalCrisis'
import { projectCrisis } from './crisisProjection'

describe('projectCrisis', () => {
  it('projects an active warning without changing world state or RNG', () => {
    const state = createGame(); state.threat.monsterPopulation = 30; state.threat.threatLevel = 2; state.threat.campLevel = 2; state.settlement.safety = 60
    tryStartRegionalCrisis(state, () => 0)
    const before = structuredClone(state)
    const view = projectCrisis(state)
    expect(view).toMatchObject({ phase: 'warning', phaseLabel: '危機警訊', readiness: expect.any(String) })
    expect(state).toEqual(before)
  })
  it('keeps missing legacy summaries unknown', () => {
    const state = createGame(); state.threat.monsterPopulation = 30; state.threat.threatLevel = 2; state.threat.campLevel = 2; state.settlement.safety = 60
    tryStartRegionalCrisis(state, () => 0)
    const crisis = state.regionalCrisis
    if (crisis.phase === 'dormant') throw new Error('warning expected')
    state.regionalCrisis = { ...crisis, phase: 'aftermath', phaseStartedAt: state.worldTime, phaseEndsAt: state.worldTime + 100, outcome: 'local_defeat', resolvedAt: state.worldTime, resolutionSummary: null }
    expect(projectCrisis(state)).toMatchObject({ result: '較早的危機紀錄沒有結算摘要，結果未知。', recovery: '舊紀錄未保存救援狀態。' })
  })
})
