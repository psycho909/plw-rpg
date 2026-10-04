import type { Property } from '../domain/life'
import type { Position } from '../domain/types'

export type PropertyKind = Property['kind']

type SettlementStage = 'hamlet' | 'village' | 'town'
type PropertyDefinition = {
  label: string
  cost: { gold: number; reputation: number }
  minimumStage: SettlementStage
  location: 'house' | 'farm'
  position: Position
  acquisitionMinutes: number
  requiresLand?: boolean
}

export const PROPERTY_DEFINITIONS: Record<PropertyKind, PropertyDefinition> = {
  home: {
    label: '自宅', cost: { gold: 80, reputation: 0 }, minimumStage: 'hamlet', location: 'house',
    position: { x: 7, y: 10 }, acquisitionMinutes: 30,
  },
  land: {
    label: '農地', cost: { gold: 140, reputation: 10 }, minimumStage: 'village', location: 'farm',
    position: { x: 16, y: 9 }, acquisitionMinutes: 30,
  },
  farmBusiness: {
    label: '農場事業', cost: { gold: 220, reputation: 25 }, minimumStage: 'village', location: 'farm',
    position: { x: 17, y: 10 }, acquisitionMinutes: 60, requiresLand: true,
  },
}

export const HOME_REST_MINUTES = 480
export const STORAGE_PER_ITEM_LIMIT = 99
export const MAX_FOOD_PER_SUPPLY = 10
export const FARM_BUSINESS_DAILY_FOOD_LIMIT = 60
export const OWNERSHIP_MEMORY_LIMIT = 100
