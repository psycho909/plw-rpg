import { CONFIG } from '../data/config'

export type StopLoop = (() => void) & { flush: () => void }

const TICK_MS = 100
const SAVE_MS = 10000

export function startLoop(advance: (minutes: number) => void, getSpeed: () => number, save: () => void,
  monotonicNow: () => number = () => performance.now()): StopLoop {
  let last = monotonicNow(), savedAt = last, remainder = 0, stopped = false

  function consume(forceSave = false) {
    if (stopped) return
    const now = Math.max(last, monotonicNow())
    const elapsed = now - last
    last = now
    const speed = getSpeed()
    if (elapsed > 0 && Number.isFinite(speed) && speed > 0) {
      remainder += elapsed / 1000 * CONFIG.realSecondMinutes * speed
      const minutes = Math.floor(remainder)
      if (minutes > 0) {
        advance(minutes)
        remainder -= minutes
      }
    }
    if (forceSave || now - savedAt >= SAVE_MS) {
      save()
      savedAt = now
    }
  }

  const timer = setInterval(() => consume(), TICK_MS)
  const stop = (() => {
    if (stopped) return
    consume(true)
    clearInterval(timer)
    stopped = true
  }) as StopLoop
  stop.flush = () => consume(true)
  return stop
}
