import type { GameState, Tile, BuildingId, JobId } from '../domain/types'
import type { MapMark } from './worldUI'
import { worldMarks } from './worldUI'
import { BUILDINGS, DUNGEON, REGIONS } from '../data/config'
import { buildingIcons, jobIcons, terrainIcons } from './icons'
export interface WorldCell {
  key: string; tile: Tile; isPlayer: boolean; building: BuildingId | null
  people: { id: string; name: string; job: JobId }[]; mark?: MapMark
  icon: string; label: string
}
export function projectWorld(state: GameState): WorldCell[] {
  const c = state.characters.find(actor => actor.id === state.activeCharacterId)!
  const marks = worldMarks(state)
  const npcs = new Map<string, WorldCell['people']>()
  for (const npc of state.npcs) {
    if (!npc.isAlive) continue
    const key = `${npc.position.x},${npc.position.y}`
    const people = npcs.get(key) ?? []
    people.push({ id: npc.id, name: npc.name, job: npc.job }); npcs.set(key, people)
  }
  return state.tiles.map(source => {
    const tile = { ...source }, key = `${tile.x},${tile.y}`
    const isPlayer = c.isAlive && c.position.x === tile.x && c.position.y === tile.y
    const building = tile.discovered && tile.building && state.settlement.buildings.includes(tile.building) ? tile.building : null
    const people = tile.discovered ? npcs.get(key) ?? [] : []
    const mark = tile.discovered ? marks.get(key) : undefined
    const dungeon = tile.x === DUNGEON.position.x && tile.y === DUNGEON.position.y && state.dungeon.discovered
    const terrain = tile.terrain === 'road' ? tile.x === 13 ? tile.y === 7 || tile.y === 10 ? '┼' : '│' : '─' : tile.terrain === 'forest' && (tile.x * 3 + tile.y) % 7 === 0 ? '🌲' : terrainIcons[tile.terrain]
    const icon = !tile.discovered ? '░' : isPlayer ? '🙂' : dungeon ? '🕳️' : mark?.kind === 'crop' ? mark.icon : building ? buildingIcons[building] : people[0] ? jobIcons[people[0].job] : mark?.icon ?? terrain
    const object = !tile.discovered ? '未探索' : dungeon ? DUNGEON.name : mark?.kind === 'crop' ? mark.label : building ? BUILDINGS[building].name : mark?.label
    const label = `${tile.x}, ${tile.y}：${tile.discovered ? REGIONS[tile.regionId].name : '未知區域'}${object ? `，${object}` : ''}${isPlayer ? '，你在這裡' : ''}${people.length ? `，${people.map(n => n.name).join('、')}` : ''}`
    return { tile, key, isPlayer, building, people, mark, icon, label }
  })
}
