import type { CharacterLife, NpcLife, WorldLife } from '../domain/life'
import type { GameState } from '../domain/types'
import { random } from './random'

export function emptyLife(worldTime: number, openingSeen = false): WorldLife {
  return { canon: 'OAKVALE_LIFE_EMERGENCE', openingSeen, characters: {}, npcs: {}, properties: [],
    settlementMemories: [], worldMemories: [], arcs: [], requests: [], news: [],
    director: { lastEventAt: worldTime, quietUntil: worldTime + 3 * 1440, cooldowns: {}, recentMajor: [], recentCrises: [],
      lastPlayerActivity: worldTime, stability: 80, tradePenalty: 0, ironReserve: 40, sequence: 0 } }
}
export function newCharacterLife(generation = 1, origin: CharacterLife['origin'] = 'OTHER_WORLD'): CharacterLife {
  return { origin, generation, identities: ['resident'], actions: { combat: 0, farming: 0, mining: 0, woodcutting: 0, smithing: 0 }, reputation: 0, reputationHistory: [], milestones: [] }
}
export function newNpcLife(state: Pick<GameState, 'worldSeed'>, id: string, job: NpcLife['careerJob'], index: number): NpcLife {
  // A dedicated seeded stream assigns stable traits without consuming a V1 world's RNG during migration.
  let seed = state.worldSeed
  for (const ch of id) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0
  const stream = { rngState: seed }
  const pairs: NpcLife['traits'][] = [['brave', 'cautious'], ['ambitious', 'content'], ['hardworking', 'wanderer'], ['social', 'solitary']]
  return { traits: pairs.map(pair => pair[Math.floor(random(stream) * pair.length)]!), career: 'resident', careerJob: job,
    featured: index < 6, concern: '在橡谷安穩生活', memories: [], milestones: [] }
}
export function initializeLife(state: GameState, migrated = false) {
  state.life = emptyLife(state.worldTime, migrated)
  state.characters.forEach((c, i) => { state.life.characters[c.id] = newCharacterLife(i + 1, i === 0 ? 'OTHER_WORLD' : 'LOCAL_WORLD') })
  state.npcs.forEach((n, i) => { state.life.npcs[n.id] = newNpcLife(state, n.id, n.job, i) })
}
