import { expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { CONTENT_FAMILIES, CONTENT_MONSTERS } from '../data/contentRegistry'
import type { ContentSeason, ContentSettlementStage, ContentSpawnPredicate } from '../domain/content'
import type { GameState } from '../domain/types'
import { contentEncounterOptions } from './contentFamilies'
import { createGame, player } from './simulation'

const seasons: readonly ContentSeason[] = ['春', '夏', '秋', '冬']
const stages: readonly ContentSettlementStage[] = ['hamlet', 'village', 'town']

function allowedHour(hour: number, range?: ContentSpawnPredicate['hours']) {
  if (!range) return true
  return range.start <= range.end
    ? hour >= range.start && hour < range.end
    : hour >= range.start || hour < range.end
}

/** Builds a bounded test witness, then asks the production projection to prove it is eligible. */
function runtimeWitness(state: GameState, definitionId: string) {
  const definition = CONTENT_MONSTERS[definitionId]!
  const family = CONTENT_FAMILIES[definition.familyId]!
  const character = player(state)
  const definitionProfiles = definition.spawnProfiles ?? family.spawnProfiles

  for (const familyProfile of family.spawnProfiles) {
    for (const definitionProfile of definitionProfiles) {
      if (familyProfile.region !== definitionProfile.region || !family.regions.includes(familyProfile.region)) continue

      const level = Math.max(1, familyProfile.minPlayerLevel ?? 1, definitionProfile.minPlayerLevel ?? 1)
      const maxLevel = Math.min(100, familyProfile.maxPlayerLevel ?? 100, definitionProfile.maxPlayerLevel ?? 100)
      const threat = Math.max(1, familyProfile.minThreatLevel ?? 1, definitionProfile.minThreatLevel ?? 1)
      const maxThreat = Math.min(3, familyProfile.maxThreatLevel ?? 3, definitionProfile.maxThreatLevel ?? 3)
      const safety = Math.max(0, familyProfile.minSafety ?? 0, definitionProfile.minSafety ?? 0)
      const maxSafety = Math.min(100, familyProfile.maxSafety ?? 100, definitionProfile.maxSafety ?? 100)
      if (level > maxLevel || threat > maxThreat || safety > maxSafety) continue

      const candidateSeasons = seasons.filter(season =>
        (!familyProfile.seasons || familyProfile.seasons.includes(season))
        && (!definitionProfile.seasons || definitionProfile.seasons.includes(season)))
      const candidateHours = Array.from({ length: 24 }, (_, hour) => hour)
        .filter(hour => allowedHour(hour, familyProfile.hours) && allowedHour(hour, definitionProfile.hours))
      const candidateStages = stages.filter(stage =>
        (!familyProfile.settlementStages || familyProfile.settlementStages.includes(stage))
        && (!definitionProfile.settlementStages || definitionProfile.settlementStages.includes(stage)))
      if (!candidateSeasons.length || !candidateHours.length || !candidateStages.length) continue

      character.currentRegion = familyProfile.region
      character.level = level
      character.stamina = 100
      character.hp = character.maxHp
      character.status = 'idle'
      state.dungeon.inDungeon = false
      state.combat = null
      state.settlement.stage = candidateStages[0]!
      state.settlement.safety = safety
      state.threat.threatLevel = threat
      state.regions[familyProfile.region]!.discovered = true

      for (const season of candidateSeasons) for (const hour of candidateHours) {
        const seasonIndex = seasons.indexOf(season)
        const dayIndex = seasonIndex * CONFIG.daysPerSeason
        state.worldTime = dayIndex * CONFIG.minutesPerDay + hour * 60
        const option = contentEncounterOptions(state, definition.familyId)
          .find(candidate => candidate.definitionId === definitionId)
        if (option?.eligible) return { region: familyProfile.region, level, threat, safety, season, hour, option }
      }
    }
  }

  return null
}

it('proves every registered authored monster is legally reachable through the current-region runtime projection', () => {
  const monsters = Object.values(CONTENT_MONSTERS)
  const reachedRanks = new Set<string>()

  for (const [index, definition] of monsters.entries()) {
    const state = createGame(0x70000 + index)
    const witness = runtimeWitness(state, definition.id)
    expect(witness, `no runtime witness for ${definition.id}`).not.toBeNull()
    expect(witness!.option).toMatchObject({
      definitionId: definition.id,
      familyId: definition.familyId,
      rank: definition.rank,
      region: witness!.region,
      eligible: true,
      reason: null,
    })
    reachedRanks.add(definition.rank)
  }

  expect(monsters.length).toBeGreaterThan(60)
  expect(reachedRanks).toEqual(new Set(['normal', 'elite', 'miniBoss', 'boss']))
})
