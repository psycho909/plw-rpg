export function percentile(values, p) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil(p * sorted.length) - 1] ?? null
}

export function gapSummary(events, startAt, endAt, actionAt = () => 0) {
  const points = [...events].sort((a, b) => a.at - b.at)
  const gaps = []
  let priorAt = startAt, priorActions = 0
  for (const point of points) {
    gaps.push({ minutes: Math.max(0, point.at - priorAt), actions: Math.max(0, point.actionIndex - priorActions) })
    priorAt = point.at; priorActions = point.actionIndex
  }
  gaps.push({ minutes: Math.max(0, endAt - priorAt), actions: Math.max(0, actionAt(endAt) - priorActions) })
  return Object.fromEntries(['minutes', 'actions'].map(key => [key, {
    samples: gaps.length, median: percentile(gaps.map(gap => gap[key]), .5),
    p90: percentile(gaps.map(gap => gap[key]), .9), max: Math.max(0, ...gaps.map(gap => gap[key])),
  }]))
}

export function joinCraftEventsToDecisions(craftEvents, decisions) {
  const timeline = [...decisions].sort((a, b) => a.before.worldTime - b.before.worldTime)
  const craftDecisionIndexes = new Set(timeline.flatMap((row, index) =>
    row.chosenAction?.some(action => action.choice === 'craft') ? [index] : []))
  return craftEvents.map(event => {
    const candidates = [...craftDecisionIndexes].filter(index => {
      const decision = timeline[index]
      const nextDecision = timeline[index + 1]
      const start = decision.before.worldTime
      const end = nextDecision?.before.worldTime ?? Infinity
      return start <= event.at && event.at <= end
    })
    if (candidates.length !== 1) {
      throw new Error(`Craft event ${event.instanceId ?? event.eventId ?? event.at} matched ${candidates.length} decisions`)
    }
    const decision = timeline[candidates[0]]
    return { eventId: event.instanceId ?? event.eventId ?? null, eventAt: event.at, event, decision }
  })
}

export function joinZeroXpCraftEventsToDecisions(craftEvents, decisions) {
  return joinCraftEventsToDecisions(craftEvents.filter(event => event.practiceXpAward === 0), decisions)
}

export function classifyNoProgress(action, nearbyState = {}) {
  const choice = String(action.choice ?? ''), reason = String(action.reason ?? '')
  if (/daily-action-limit|decision-ceiling|harness-error/i.test(`${choice} ${reason}`)) return { category: 'runner policy defect', confidence: 'high' }
  if (/policy-no-action|policy-found-no-legal-progressing-action/i.test(`${choice} ${reason}`)) {
    return { category: 'no understandable next goal', confidence: 'low', note: 'runner marker only; recorded state does not explain why the policy found no action' }
  }
  if (/menu|tab|window|navigation|equip/i.test(choice)) return { category: 'UI not visible or reachable', confidence: 'low' }
  if (/wait|rest|sleep|simulate/i.test(choice)) {
    const tod = Number.isFinite(action.at) ? action.at % 1440 : null
    const shopWait = /shop|store|station/i.test(choice) && tod !== null && (tod < 8 * 60 || tod >= 18 * 60)
    return { category: shopWait ? 'legitimate world wait' : 'excessive wait-repeat cost or cause unclear', confidence: shopWait ? 'medium' : 'low' }
  }
  if (/stamina|疲勞|體力/i.test(reason) || nearbyState.stamina !== undefined && nearbyState.stamina < 4) return { category: 'lacking resources', confidence: 'medium' }
  if (/gold|金幣|材料|素材|resource|inventory|cooldown|冷卻/i.test(reason)) return { category: 'lacking resources', confidence: 'medium' }
  if (/goal|recipe|rank|boss|unlock/i.test(choice)) return { category: 'no understandable next goal', confidence: 'low' }
  return { category: 'unclassified; insufficient state evidence', confidence: 'low' }
}
