import type { Category, GameState } from '../domain/types'

export function emit(state: GameState, type: string, category: Category, message: string, historic = false) {
  const event = { id: ++state.eventSequence, at: state.worldTime, type, category, message }
  state.events.push(event)
  if (state.events.length > 150) state.events.shift()
  if (historic) state.history.push(event)
}
