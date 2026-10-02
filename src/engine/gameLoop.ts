import { CONFIG } from '../data/config'

export function startLoop(advance: (minutes: number) => void, getSpeed: () => number, save: () => void) {
  let last = performance.now(), remainder = 0, savedAt = last
  const interval = setInterval(() => {
    const now = performance.now(), elapsed = Math.max(0, now - last); last = now
    remainder += elapsed / 1000 * CONFIG.realSecondMinutes * getSpeed()
    const minutes = Math.floor(remainder); remainder -= minutes
    if (minutes > 0) advance(minutes)
    if (now - savedAt >= 10000) { save(); savedAt = now }
  }, 100)
  return () => clearInterval(interval)
}
