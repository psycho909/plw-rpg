import { afterEach, describe, expect, it, vi } from 'vitest'
import { startLoop } from './gameLoop'

afterEach(() => vi.useRealTimers())
describe('single real-time loop', () => {
  it('pauses and changes speed without coupling game time to render frames', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
    let minutes = 0, speed = 1
    const save = vi.fn(), stop = startLoop(n => { minutes += n }, () => speed, save)
    vi.advanceTimersByTime(1000); expect(minutes).toBe(2)
    speed = 0; vi.advanceTimersByTime(1000); expect(minutes).toBe(2)
    speed = 5; vi.advanceTimersByTime(1000); expect(minutes).toBe(12)
    speed = 20; vi.advanceTimersByTime(1000); expect(minutes).toBe(52)
    speed = 0; vi.advanceTimersByTime(6000); expect(save).toHaveBeenCalledTimes(1)
    stop(); vi.advanceTimersByTime(10000); expect(save).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
