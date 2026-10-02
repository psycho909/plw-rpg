import type { GameState } from '../domain/types'

export function random(state: Pick<GameState, 'rngState'>) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0
  return state.rngState / 4294967296
}
