import { CONFIG, CROP, ITEMS, REGIONS } from '../data/config'
import { CONTENT_CROP_GOODS, CONTENT_CROPS } from '../data/contentRegistry'
import type { ContentSeason } from '../domain/content'
import type { GameState, RegionId } from '../domain/types'
import { calendar } from './calendar'

export interface FarmCropChoice {
  id: string
  name: string
  description: string
  regions: readonly RegionId[]
  seasons: readonly ContentSeason[]
  growthMinutes: number
  harvestAmount: number
  harvestGoodId: string | null
  foodValue: number | null
  sell: number
  status: 'available' | 'season' | 'region'
  reason: string | null
}

interface CropDefinition {
  id: string
  name: string
  description: string
  regions: readonly RegionId[]
  seasons: readonly ContentSeason[]
  growthMinutes: number
  harvestBase: number
  harvestGoodId: string | null
  foodValue: number | null
  sell: number
}

function cropDefinitions(): CropDefinition[] {
  const allSeasons = CONFIG.seasons as readonly ContentSeason[]
  return [
    {
      id: 'wheat', name: '小麥', description: '熟悉的全年作物。', regions: ['farmland'],
      seasons: allSeasons, growthMinutes: CROP.duration, harvestBase: CROP.yield, harvestGoodId: null,
      foodValue: null, sell: ITEMS.food.sell,
    },
    ...Object.values(CONTENT_CROPS).map(crop => {
      const good = CONTENT_CROP_GOODS[crop.harvestGoodId]
      return {
        id: crop.id, name: crop.name['zh-TW'], description: crop.description['zh-TW'],
        regions: crop.regions, seasons: crop.seasons, growthMinutes: crop.growthMinutes,
        harvestBase: crop.harvestAmount, harvestGoodId: crop.harvestGoodId,
        foodValue: good?.foodValue ?? null, sell: good?.sell ?? 0,
      }
    }),
  ]
}

/** Canonical crop-season and region projection shared by the farm UI and planting action. */
export function farmCropChoices(state: GameState): FarmCropChoice[] {
  const character = state.characters.find(candidate => candidate.id === state.activeCharacterId)
  const season = CONFIG.seasons[calendar(state.worldTime).season] as ContentSeason
  return cropDefinitions().map(crop => {
    const region = character?.currentRegion
    const regionAllowed = !!region && crop.regions.includes(region)
    const seasonAllowed = crop.seasons.includes(season)
    const status: FarmCropChoice['status'] = !regionAllowed ? 'region' : !seasonAllowed ? 'season' : 'available'
    const targetRegion = crop.regions[0]
    const reason = status === 'region'
      ? `請先前往${targetRegion ? REGIONS[targetRegion].name : '適合的農田'}。`
      : status === 'season' ? `目前季節無法種植${crop.name}。` : null
    return {
      id: crop.id, name: crop.name, description: crop.description, regions: crop.regions, seasons: crop.seasons,
      growthMinutes: crop.growthMinutes,
      harvestAmount: crop.harvestBase + (character?.skills.farming.level ?? 1) - 1,
      harvestGoodId: crop.harvestGoodId, foodValue: crop.foodValue, sell: crop.sell, status, reason,
    }
  })
}

/** Guidance for the existing plant action; it does not reserve a plot or mutate the world. */
export function farmCropPlantingGuidance(state: GameState): { status: 'region' | 'capacity'; reason: string } | null {
  const character = state.characters.find(candidate => candidate.id === state.activeCharacterId)
  if (!character || character.currentRegion !== 'farmland') return { status: 'region', reason: '請先前往東方農田。' }
  if (state.preparedPlots > 0) return null
  const allPlotsInUse = state.preparedPlots + state.crops.length >= CONFIG.maxPlots
  return {
    status: 'capacity',
    reason: allPlotsInUse ? '四塊田都已使用，請先收割。' : '請先整地，再播種。',
  }
}
