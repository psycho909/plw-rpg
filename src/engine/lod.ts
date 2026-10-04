import type { GameState, NPC } from '../domain/types'

export type SimulationLod = 'active' | 'simulated' | 'abstract'
export function npcLod(state: GameState, npc: NPC): SimulationLod {
  const c = state.characters.find(actor => actor.id === state.activeCharacterId)!
  const distance = Math.abs(c.position.x - npc.position.x) + Math.abs(c.position.y - npc.position.y)
  if (distance <= 6 || state.party.some(p => p.npcId === npc.id)) return 'active'
  if (npc.currentRegion === c.currentRegion || state.life.npcs[npc.id]?.featured) return 'simulated'
  return 'abstract'
}
