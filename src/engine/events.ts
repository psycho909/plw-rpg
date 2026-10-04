import type { Category, GameState, WorldEvent } from '../domain/types'

const captures = new WeakMap<GameState, WorldEvent[]>()
export function captureEvents<T>(state: GameState, action: () => T): { result: T; events: WorldEvent[] } {
  if (captures.has(state)) throw new Error('不能重疊擷取同一世界的事件。')
  const events: WorldEvent[] = []; captures.set(state, events)
  try { return { result: action(), events } }
  finally { captures.delete(state) }
}

export function emit(state: GameState, type: string, category: Category, message: string, historic = false) {
  const tier: WorldEvent['tier'] = historic ? 'major' : type.startsWith('npc.schedule') ? 'transient' : type.startsWith('debug.') ? 'debug' : 'gameplay'
  const event: WorldEvent = { id: ++state.eventSequence, at: state.worldTime, type, category, message, tier }
  captures.get(state)?.push({ ...event })
  state.events.push(event)
  if (state.events.length > 150) state.events.shift()
  if (historic) {
    state.history.push(event)
    // Complete records remain in the append journal; the world carries a bounded major-history view.
    if (state.history.length > 20000) state.history.shift()
  }
}
