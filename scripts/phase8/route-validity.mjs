const LIFE_ACTIVITY = /^(gather|prepare|plant|harvest|craft|sell-material|sell-gathered|sell-crafted)$/
const FARM_ACTIVITY = /^(prepare|plant|harvest)$/

export function classifyActionOutcome({ engineSuccess, stateChanged, failureReason = '' }) {
  if (engineSuccess && stateChanged) return { outcome: 'success', noProgress: false, reason: null }
  const reason = !engineSuccess
    ? (failureReason || 'engine-rejected-action')
    : 'engine-reported-success-without-relevant-state-change'
  return { outcome: 'no-progress', noProgress: true, reason }
}

/** Confirms that distinct input seeds reach distinct, engine-derived RNG states. */
export function evaluateSeedVariance(samples = []) {
  const distinct = key => new Set(samples.map(sample => sample?.[key]).filter(value => value !== undefined && value !== null)).size
  const checks = {
    sampleCount: samples.length,
    distinctSeeds: distinct('seed'),
    distinctWorldSeeds: distinct('worldSeed'),
    distinctRngStates: distinct('rngState'),
    distinctRngProbes: distinct('rngProbe'),
  }
  const failures = []
  if (checks.sampleCount < 2 || checks.distinctSeeds < 2 || checks.distinctWorldSeeds < 2
    || checks.distinctRngStates < 2 || checks.distinctRngProbes < 2) {
    failures.push('seed-input-did-not-produce-distinct-engine-rng-state')
  }
  return { status: failures.length ? 'INVALID_POLICY' : 'VALID_POLICY', failures, checks }
}

export function evaluateRouteValidity({
  route,
  actions = [],
  encounters = [],
  skillXpGained = 0,
  smithingXpGained = 0,
  craftingEvidence = null,
  rankEvidence = null,
  seedVariance = null,
  allWinsExplanation = null,
}) {
  const successful = actions.filter(action => action.outcome === 'success')
  const noProgress = actions.filter(action => action.noProgress)
  const lifeActions = successful.filter(action => LIFE_ACTIVITY.test(action.choice))
  const gatherActions = successful.filter(action => action.choice === 'gather')
  const farmActions = successful.filter(action => FARM_ACTIVITY.test(action.choice))
  const craftActions = successful.filter(action => action.choice === 'craft')
  const sellActions = successful.filter(action => /^sell-/.test(action.choice))
  const adventureActions = successful.filter(action => action.policyHalf === 'adventure')
  const failures = []

  if (!seedVariance || seedVariance.status !== 'VALID_POLICY') failures.push('seed-rng-variance-not-verified')
  if (noProgress.some(action => !action.category || !action.reason)) failures.push('unclassified-no-progress-action')

  if (route === 'life') {
    if (!gatherActions.length) failures.push('life-route-had-no-gather-success')
    if (!farmActions.length) failures.push('life-route-had-no-farming-success')
    if (!lifeActions.length) failures.push('life-route-had-no-life-activity')
    if (!skillXpGained) failures.push('life-route-gained-no-skill-xp')
    if (!craftActions.length && !(craftingEvidence?.impossibilityReason && !craftingEvidence.legalPlanSeen)) {
      failures.push('life-route-had-no-craft-or-verified-impossibility')
    }
    if (craftActions.length && !smithingXpGained && !craftingEvidence?.noSmithingXpReason) {
      failures.push('life-route-craft-produced-no-smithing-xp-or-explanation')
    }
    if (encounters.length) failures.push('life-route-started-voluntary-combat')
  }

  if (route === 'adventure') {
    if (!adventureActions.length || !encounters.length) failures.push('adventure-route-did-not-execute-combat-policy')
    const higherRankEncounters = encounters.filter(row => row.rank && row.rank !== 'normal').length
    const higherRankOpportunities = rankEvidence?.higherRankEligibleCount ?? 0
    if (higherRankOpportunities > 0 && !higherRankEncounters) failures.push('adventure-route-ignored-eligible-higher-rank')
    for (const rank of ['elite', 'miniBoss', 'boss']) {
      const hadOpportunity = Object.values(rankEvidence?.eligibleByRank?.[rank] ?? {}).some(count => count > 0)
      if (hadOpportunity && !encounters.some(row => row.rank === rank)) failures.push(`adventure-route-ignored-eligible-rank:${rank}`)
    }
    if (!higherRankOpportunities && !rankEvidence?.noHigherRankReason) failures.push('adventure-route-did-not-record-why-no-higher-rank-was-available')
    const allWins = encounters.length > 0 && encounters.every(row => row.outcome === 'win')
    if (allWins && !(allWinsExplanation?.text && allWinsExplanation.hpBeforeAfterChecked
      && allWinsExplanation.rankCatalogChecked && allWinsExplanation.bossDefinitionIdsChecked)) {
      failures.push('all-wins-lack-verified-explanation')
    }
  }

  if (route === 'hybrid') {
    if (!successful.some(action => action.policyHalf === 'life' && LIFE_ACTIVITY.test(action.choice))) {
      failures.push('hybrid-route-did-not-complete-life-half')
    }
    if (!adventureActions.length || !encounters.length) failures.push('hybrid-route-did-not-complete-adventure-half')
  }

  return {
    route,
    status: failures.length ? 'INVALID_POLICY' : 'VALID_POLICY',
    failures,
    checks: {
      successfulLifeActions: lifeActions.length,
      successfulGatherActions: gatherActions.length,
      successfulFarmActions: farmActions.length,
      successfulCraftActions: craftActions.length,
      successfulSellActions: sellActions.length,
      skillXpGained,
      smithingXpGained,
      successfulAdventureActions: adventureActions.length,
      encounterCount: encounters.length,
      higherRankEncounterCount: encounters.filter(row => row.rank && row.rank !== 'normal').length,
      higherRankEligibleCount: rankEvidence?.higherRankEligibleCount ?? 0,
      noProgressActions: noProgress.length,
      unclassifiedNoProgressActions: noProgress.filter(action => !action.category || !action.reason).length,
      seedVarianceVerified: seedVariance?.status === 'VALID_POLICY',
      allWinsExplanationVerified: Boolean(allWinsExplanation?.text && allWinsExplanation.hpBeforeAfterChecked
        && allWinsExplanation.rankCatalogChecked && allWinsExplanation.bossDefinitionIdsChecked),
    },
  }
}
