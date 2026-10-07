import { EQUIPMENT } from '../data/config'
import type { GearStats } from '../domain/reward'
import type { GameState } from '../domain/types'
import { equippedInstance } from './rewardActions'
import { player } from './simulation'
import { random } from './random'

const empty: GearStats = { attack: 0, defense: 0, critical: 0, penetration: 0, bleed: 0, block: 0, reduction: 0 }

const statKeys: (keyof GearStats)[] = ['attack', 'defense', 'critical', 'penetration', 'bleed', 'block', 'reduction']

export interface PlayerAttackContext {
  wolfArmoredPhase?: boolean
}

export function equipmentStats(state: GameState, ownerId = state.activeCharacterId): GearStats {
  const character = state.characters.find(candidate => candidate.id === ownerId)
  if (!character) return { ...empty }
  const result = { ...empty }
  for (const slot of ['weapon', 'armor'] as const) {
    const instance = equippedInstance(state, slot, ownerId)
    if (instance) {
      for (const key of statKeys) result[key] += instance.rolledStats[key]
    } else if (slot === 'weapon' && character.equipment.weapon) {
      result.attack += EQUIPMENT.sword.attack
    } else if (slot === 'armor' && character.equipment.armor) {
      result.defense += EQUIPMENT.armor.defense
    }
  }
  return result
}

export function playerAttackDamage(state: GameState, monsterDefense: number, againstWolf = false, context: PlayerAttackContext = {}): number {
  const character = player(state), gear = equipmentStats(state)
  const weapon = equippedInstance(state, 'weapon')
  const penetration = gear.penetration * (context.wolfArmoredPhase ? 2 : 1)
  const effectiveDefense = penetration > 0 ? Math.max(0, monsterDefense - penetration) : monsterDefense
  const hunterBonus = againstWolf && weapon?.specialTrait === 'moonHunter' ? 3 : 0
  let damage = Math.max(1, character.stats.strength + character.skills.combat.level + gear.attack - effectiveDefense)
  damage += gear.bleed + hunterBonus
  if (gear.critical > 0 && random(state) < gear.critical / 100) damage *= 2
  return damage
}

export function incomingDamage(state: GameState, attack: number, defending: boolean, companionGuard = 0): number {
  const character = player(state), gear = equipmentStats(state)
  let damage = Math.max(1, attack - Math.floor(character.stats.vitality / 3) - gear.defense - companionGuard)
  if (gear.block > 0 && random(state) < gear.block / 100) damage *= .5
  damage *= 1 - gear.reduction / 100
  if (defending) damage *= .3
  return Math.max(1, Math.floor(damage))
}
