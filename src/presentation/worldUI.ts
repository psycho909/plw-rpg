import type { BuildingId, GameState, Position } from '../domain/types'
import { BUILDINGS, DUNGEON, REGIONS } from '../data/config'
import { distance, player, stageIndex } from '../engine/simulation'
import { buildingIcons, jobIcons, regionIcons } from './icons'

export type PlaceId = BuildingId | 'forest' | 'mine' | 'unknown' | 'village'
export type Interaction = { id: string; label: string; icon: string; place?: PlaceId; npcId?: string }
export type MapMark = { icon: string; label: string; kind: 'home' | 'crop' | 'threat' }

export function interactions(state: GameState): Interaction[] {
  const c = player(state)
  if (!c.isAlive || state.combat || state.dungeon.inDungeon) return []
  const result: Interaction[] = []
  for (const id of state.settlement.buildings) {
    if (distance(c.position, BUILDINGS[id].position) <= 1) result.push({ id, label: BUILDINGS[id].name, icon: buildingIcons[id], place: id })
  }
  if (state.dungeon.discovered && distance(c.position, DUNGEON.position) <= 1) result.push({ id: 'dungeon', label: DUNGEON.name, icon: '🕳️', place: 'unknown' })
  const region = c.currentRegion
  const place: PlaceId = region === 'farmland' ? 'farm' : region
  if (!result.some(i => i.place === place)) result.push({ id: `region-${region}`, label: REGIONS[region].name, icon: regionIcons[region], place })
  for (const npc of state.npcs.filter(n => n.isAlive && distance(c.position, n.position) <= 1)) {
    result.push({ id: npc.id, label: npc.name, icon: jobIcons[npc.job], npcId: npc.id })
  }
  return result
}
export function worldMarks(state: GameState): Map<string, MapMark> {
  const marks = new Map<string, MapMark>()
  const put = (x: number, y: number, mark: MapMark) => {
    if (state.tiles.some(t => t.x === x && t.y === y && t.discovered && t.walkable)) marks.set(`${x},${y}`, mark)
  }
  // Visual projections of aggregate systems; these do not create simulation entities.
  const houses = [[4, 9], [5, 12], [9, 12], [3, 11], [10, 13], [4, 13], [11, 9], [2, 9], [8, 13], [12, 13]]
  houses.slice(0, 2 + stageIndex(state) * 4).forEach(([x, y]) => put(x!, y!, { icon: '🏠', label: '橡谷民居', kind: 'home' }))
  for (let i = 0; i < 4; i++) {
    const crop = state.crops[i]
    const prepared = i < state.crops.length + state.preparedPlots
    put(16 + i % 2, 10 + Math.floor(i / 2), {
      icon: crop ? crop.status === 'mature' ? '🌾' : '🌱' : prepared ? '▤' : '≋',
      label: crop ? crop.status === 'mature' ? '成熟小麥，可收割' : '生長中的小麥' : prepared ? '已整地的田' : '未整地的田', kind: 'crop',
    })
  }
  if (state.threat.monsterPopulation >= 1) {
    const traces = [[8, 3], [10, 4], [12, 2], [7, 5], [11, 5], [4, 2]]
    traces.slice(0, Math.min(traces.length, 1 + Math.floor(state.threat.monsterPopulation / 15))).forEach(([x, y]) => put(x!, y!, {
      icon: state.threat.threatLevel >= 3 ? '👺' : '🐺', label: state.threat.threatLevel >= 3 ? '哥布林蹤跡' : '灰狼蹤跡', kind: 'threat',
    }))
    if (state.threat.campLevel >= 2) put(11, 3, { icon: state.threat.campLevel >= 3 ? '♜' : '🏕️', label: '哥布林營地', kind: 'threat' })
    if (state.threat.bossAlive) put(12, 4, { icon: '👹', label: '哥布林酋長出沒', kind: 'threat' })
  }
  return marks
}
export function directionFor(key: string): Position | null {
  const directions: Record<string, Position> = {
    w: { x: 0, y: -1 }, arrowup: { x: 0, y: -1 }, s: { x: 0, y: 1 }, arrowdown: { x: 0, y: 1 },
    a: { x: -1, y: 0 }, arrowleft: { x: -1, y: 0 }, d: { x: 1, y: 0 }, arrowright: { x: 1, y: 0 },
  }
  return directions[key.toLowerCase()] ?? null
}
