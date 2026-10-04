import type { Character, GameState } from '../domain/types'
import { player } from '../engine/simulation'

export function projectNpc(state: GameState, id: string) {
  const npc = state.npcs.find(candidate => candidate.id === id && candidate.isAlive)
  if (!npc) return undefined
  return { id: npc.id, name: npc.name, job: npc.job, age: npc.age, currentActivity: npc.currentActivity,
    currentRegion: npc.currentRegion, isAlive: npc.isAlive, position: { ...npc.position } }
}
export function projectCharacterLife(state: GameState, id: string) {
  const life = state.life.characters[id]
  return life ? structuredClone(life) : undefined
}
export function projectNpcLife(state: GameState, id: string) {
  const life = state.life.npcs[id]
  return life ? structuredClone(life) : undefined
}
export function projectProperties(state: GameState, ownerId: string) {
  return state.life.properties.filter(property => property.ownerId === ownerId).map(property => structuredClone(property))
}

/** A detached snapshot refreshes computed UI consumers without making the world reactive. */
export function projectCharacter(state: GameState): Character {
  const c = player(state)
  return {
    id: c.id, name: c.name, birthYear: c.birthYear, age: c.age, lifeStage: c.lifeStage,
    level: c.level, exp: c.exp, hp: c.hp, maxHp: c.maxHp, stamina: c.stamina, maxStamina: c.maxStamina,
    stats: { ...c.stats }, skills: structuredClone(c.skills), gold: c.gold,
    inventory: { ...c.inventory }, equipment: { ...c.equipment }, position: { ...c.position },
    currentRegion: c.currentRegion, status: c.status, isAlive: c.isAlive,
    deathYear: c.deathYear, deathCause: c.deathCause, lifespan: c.lifespan,
  }
}
