import { afterEach, describe, expect, it, vi } from 'vitest'
import { startLoop } from './gameLoop'

afterEach(() => vi.useRealTimers())

describe('single real-time loop', () => {
  it('flushes elapsed time at the speed in effect before pause and resume changes', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let now = 100, minutes = 0, speed = 1
    const save = vi.fn(), stop = startLoop(n => { minutes += n }, () => speed, save, () => now)

    now = 1350
    stop.flush()
    expect(minutes).toBe(2)
    speed = 0
    now = 11350
    stop.flush()
    expect(minutes).toBe(2)
    speed = 5
    now = 11850
    stop.flush()
    expect(minutes).toBe(7)

    stop()
    const callsAtStop = save.mock.calls.length
    now += 10000
    vi.advanceTimersByTime(10000)
    stop.flush()
    expect(minutes).toBe(7)
    expect(save).toHaveBeenCalledTimes(callsAtStop)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('catches up a delayed background callback from monotonic elapsed time', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let now = 0, minutes = 0
    const advance = vi.fn((n: number) => { minutes += n })
    const stop = startLoop(advance, () => 1, vi.fn(), () => now)

    // The scheduled callback did not run while the tab was throttled.
    now = 4_333
    stop.flush()
    expect(advance).toHaveBeenCalledTimes(1)
    expect(minutes).toBe(8)
    stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
