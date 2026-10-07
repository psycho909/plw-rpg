import type { GameState } from '../domain/types'
import { deriveCivilDefense } from '../engine/civilDefense'

export type ReadinessWord = 'poor' | 'adequate' | 'strong'
export interface CrisisPresentation {
  phase: string
  phaseLabel: string
  readiness: ReadinessWord
  needs: { id: string; label: string; state: 'needed' | 'covered' }[]
  result: string | null
  recovery: string | null
  campRaidComplete: boolean
  chiefDefeated: boolean
}

const outcomeLabels = { decisive_success: '守住了橡谷', costly_success: '橡谷守住了，但付出代價', setback: '北方局勢惡化', local_defeat: '北方防線失守' } as const

export function projectCrisis(state: GameState): CrisisPresentation | null {
  const crisis = state.regionalCrisis
  if (crisis.phase === 'dormant') return null
  const active = crisis.phase === 'warning' || crisis.phase === 'preparation' || crisis.phase === 'active' || crisis.phase === 'resolution'
  const defense = active ? deriveCivilDefense(state, crisis) : null
  const readiness: ReadinessWord = !defense || defense.readiness < 40 ? 'poor' : defense.readiness < 70 ? 'adequate' : 'strong'
  const needs: CrisisPresentation['needs'] = defense ? defense.needs.filter(item => item.shortage > 0).map(item => ({
    id: item.id,
    label: item.id === 'defenders' ? '需要更多防衛者' : item.id === 'food' ? '需要補足糧食' : item.id === 'equipment' ? '仍有防衛裝備空缺' : '後勤仍可支援',
    state: 'needed' as const,
  })) : []
  if (defense) {
    for (const item of defense.needs.filter(item => item.shortage === 0)) needs.push({
      id: item.id, label: item.id === 'defenders' ? '防衛人手已足' : item.id === 'food' ? '糧食預測穩定' : item.id === 'equipment' ? '防衛裝備已備妥' : '後勤支援充足', state: 'covered',
    })
  }
  let result: string | null = null
  let recovery: string | null = null
  if (crisis.phase === 'aftermath' || crisis.phase === 'cooldown') {
    result = crisis.resolutionSummary ? outcomeLabels[crisis.outcome] : '較早的危機紀錄沒有結算摘要，結果未知。'
    const status = crisis.resolutionSummary?.recovery.status
    recovery = status === 'pending' ? '救援居民預計稍後抵達。' : status === 'granted' ? '救援居民已抵達橡谷。' : status === 'cancelled' ? '救援安排已取消。' : status === 'not_required' ? '目前不需要額外救援。' : '舊紀錄未保存救援狀態。'
  }
  return { phase: crisis.phase, phaseLabel: ({ warning: '危機警訊', preparation: '備戰期間', active: '防衛戰正在進行', resolution: '防衛結果結算中', aftermath: '危機後續', cooldown: '休養與重整' } as Record<string, string>)[crisis.phase], readiness, needs, result, recovery, campRaidComplete: crisis.adventure.campRaidAt !== null, chiefDefeated: crisis.chiefOutcome !== null }
}
