export function classifyNoProgress(action = {}) {
  const detail = action.detail ?? {}
  if (detail.reason === 'ui-control-unavailable') return 'ui'
  if (detail.reason === 'runner-error') return 'runner'
  if (detail.reason === 'resource-blocked') return 'resource'
  if (/wait|等待/i.test(action.action ?? '')) return 'wait'
  return 'goal'
}

export function summarizeNoProgress(actions = []) {
  return actions.reduce((summary, action) => {
    if (!action.detail?.noProgress) return summary
    const category = action.detail.noProgressClass ?? classifyNoProgress(action)
    summary[category] = (summary[category] ?? 0) + 1
    return summary
  }, {})
}
