import { describe, expect, it } from 'vitest'
import { CONFIG } from '../data/config'
import { farmCropChoices, farmCropPlantingGuidance } from './crops'
import { createGame, player } from './simulation'

describe('farm crop choice projection', () => {
  it('projects only the current season and region as available, with the actual harvest path', () => {
    const state = createGame(701)
    player(state).currentRegion = 'farmland'

    const spring = farmCropChoices(state)
    expect(spring.find(choice => choice.id === 'spring_pea')).toMatchObject({
      status: 'available', growthMinutes: 720, harvestAmount: 4, foodValue: 1, sell: 2,
    })
    expect(spring.find(choice => choice.id === 'summer_barley')).toMatchObject({
      status: 'season', reason: '目前季節無法種植夏大麥。',
    })

    state.worldTime = CONFIG.daysPerSeason * CONFIG.minutesPerDay
    const summer = farmCropChoices(state)
    expect(summer.find(choice => choice.id === 'summer_barley')?.status).toBe('available')
    expect(summer.find(choice => choice.id === 'spring_pea')?.status).toBe('season')
  })

  it('caps the Farming yield bonus at +2, gaining +1 per two levels (Phase8 C-F1, Owner-approved V4)', () => {
    const state = createGame(703)
    player(state).currentRegion = 'farmland'
    const yieldAt = (level: number, cropId: string) => {
      player(state).skills.farming.level = level
      return farmCropChoices(state).find(choice => choice.id === cropId)?.harvestAmount
    }
    expect([1, 2, 3, 4, 5, 6, 33].map(level => yieldAt(level, 'spring_pea'))).toEqual([4, 4, 5, 5, 6, 6, 6])
    expect([1, 3, 5, 33].map(level => yieldAt(level, 'wheat'))).toEqual([5, 6, 7, 7])
  })

  it('keeps region and plot-capacity guidance explicit without making unavailable crops selectable', () => {
    const state = createGame(702)
    expect(farmCropChoices(state).every(choice => choice.status === 'region')).toBe(true)
    expect(farmCropPlantingGuidance(state)).toMatchObject({
      status: 'region', reason: '請先前往東方農田。',
    })

    player(state).currentRegion = 'farmland'
    state.crops = Array.from({ length: CONFIG.maxPlots }, (_, index) => ({
      id: index + 1, cropId: 'wheat', plantedAt: 0, growthDuration: 1, matureAt: 1, status: 'growing' as const,
    }))
    expect(farmCropPlantingGuidance(state)).toMatchObject({
      status: 'capacity', reason: '四塊田都已使用，請先收割。',
    })
    state.crops.pop()
    expect(farmCropPlantingGuidance(state)).toMatchObject({
      status: 'capacity', reason: '請先整地，再播種。',
    })
  })
})
