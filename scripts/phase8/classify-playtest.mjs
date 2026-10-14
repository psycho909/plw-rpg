export function classifyNoProgress(action) {
  const choice = String(action.choice ?? '').toLowerCase()
  const cue = `${action.visibleCue ?? ''}\n${action.visibleCueAfter ?? ''}`
  if (/advance|wait/.test(choice)) {
    return { category: 'world-wait', confidence: 'medium', reason: 'time-advance action had no action-state fingerprint change' }
  }
  if (/farm|gather|trade|craft/.test(choice) && /不足|缺少|需要|材料|金幣|庫存/.test(cue)) {
    return { category: 'resource', confidence: 'low', reason: 'visible cue contains a resource or affordability constraint' }
  }
  if (/menu|tab|window|equipment|close-dialog|navigation/.test(choice)) {
    return { category: 'ui', confidence: 'low', reason: 'interface navigation/control action had no action-state fingerprint change' }
  }
  if (action.policyExecution?.includes('heuristic') && action.stalledControlExcludedNextTurn) {
    return { category: 'runner', confidence: 'medium', reason: 'heuristic runner marked its next-turn control as excluded' }
  }
  return { category: 'goal', confidence: 'low', reason: 'no explicit visible resource/UI/wait cause; heuristic goal selection remains ambiguous' }
}

export function summarizeActions(actions) {
  const categories = Object.fromEntries(['runner', 'ui', 'resource', 'world-wait', 'goal'].map(key => [key, { count: 0, confidence: {} }]))
  for (const action of actions) {
    if (!action.noProgress) continue
    const result = classifyNoProgress(action)
    categories[result.category].count += 1
    categories[result.category].confidence[result.confidence] = (categories[result.category].confidence[result.confidence] ?? 0) + 1
  }
  return { actionCount: actions.length, noProgressCount: Object.values(categories).reduce((sum, row) => sum + row.count, 0), categories }
}
