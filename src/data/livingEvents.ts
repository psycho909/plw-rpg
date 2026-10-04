import type { ArcKind, WorldRequest } from '../domain/life'

export interface LivingArcDefinition {
  kind: ArcKind
  title: string
  cooldownDays: number
  stageDays: { signal: number; development: number; request: number; outcome: number }
  requestKind: Extract<WorldRequest['kind'], 'food' | 'hunt' | 'iron'>
  requestAmount: number
  signal: string
  development: string
  reaction: string
  helped: string
  ignored: string
  consequence: { helped: string; ignored: string }
}

export const LIVING_ARCS = {
  road: {
    kind: 'road', title: '北方商路危機', cooldownDays: 42,
    stageDays: { signal: 2, development: 2, request: 5, outcome: 2 },
    requestKind: 'hunt', requestAmount: 2,
    signal: '北方道路附近的獸群活動增加，往來的人開始繞路。',
    development: '商人回報貨車遭到襲擊，橡谷的北路供應變得不穩。',
    reaction: '守衛與樵夫希望有人清理道路周圍的獸群。',
    helped: '幾次成功的狩獵讓北方道路重新安全一些。',
    ignored: '沒有人處理北方道路的威脅，商隊開始避開橡谷。',
    consequence: {
      helped: '北方商路逐漸恢復往來，聚落安全與交易供應改善。',
      ignored: '北方商路長期受阻，橡谷的安全與交易供應下滑。',
    },
  },
  food: {
    kind: 'food', title: '橡谷缺糧', cooldownDays: 48,
    stageDays: { signal: 2, development: 2, request: 5, outcome: 2 },
    requestKind: 'food', requestAmount: 3,
    signal: '橡谷的食物存量偏低，幾戶人家開始減少餐食。',
    development: '食物短缺持續，聚落的日常工作也受到影響。',
    reaction: '農夫與居民正在尋找能補上聚落糧食的人。',
    helped: '有人把可用的食物送進橡谷，居民暫時有了餘裕。',
    ignored: '糧食短缺沒有得到緩解，居民只能繼續節省口糧。',
    consequence: {
      helped: '橡谷恢復了一些糧食餘裕，聚落生活也穩定下來。',
      ignored: '長期缺糧拖累了橡谷的生活與繁榮。',
    },
  },
  iron: {
    kind: 'iron', title: '鐵料短缺', cooldownDays: 54,
    stageDays: { signal: 2, development: 2, request: 5, outcome: 2 },
    requestKind: 'iron', requestAmount: 3,
    signal: '鐵匠鋪的鐵料存量下降，常用工具與修理都得排隊。',
    development: '鐵料不足開始拖慢橡谷的維修與日常工事。',
    reaction: '鐵匠正在尋找能補上存料的人。',
    helped: '送來的鐵料讓鐵匠鋪能繼續修理工具。',
    ignored: '鐵料一直沒有補上，工事與修理只好繼續延後。',
    consequence: {
      helped: '鐵匠鋪恢復工作，橡谷的基礎設施獲得改善。',
      ignored: '鐵料短缺留下長期維修欠帳，交易供應也更緊張。',
    },
  },
} as const satisfies Record<ArcKind, LivingArcDefinition>

export type TravelerKind = 'elf' | 'mage' | 'knight' | 'adventurer' | 'merchant'
export interface TravelerDefinition {
  kind: TravelerKind
  durationDays: number
  weight: number
  cooldownDays: number
  text: string
}

export const RARE_TRAVELERS: readonly TravelerDefinition[] = [
  { kind: 'elf', durationDays: 7, weight: 0.3, cooldownDays: 360, text: '一位精靈旅人沿著南方道路來到橡谷，提起南方商隊的消息。' },
  { kind: 'mage', durationDays: 5, weight: 0.3, cooldownDays: 420, text: '一位旅行中的法師在橡谷停留幾日，談起遠方學院的異常。' },
  { kind: 'knight', durationDays: 7, weight: 0.3, cooldownDays: 480, text: '一位騎士途經橡谷，帶來邊境巡守與王都徵召的消息。' },
] as const

export interface MinorLivingEventDefinition {
  id: 'market_bustle' | 'watch_patrol'
  weight: number
  cooldownDays: number
  text: string
}

export const MINOR_LIVING_EVENTS: readonly MinorLivingEventDefinition[] = [
  { id: 'market_bustle', weight: 3, cooldownDays: 24, text: '市集比平常熱鬧，居民交換了農產與日常消息。' },
  { id: 'watch_patrol', weight: 4, cooldownDays: 18, text: '守衛沿著北方道路巡查，暫時壓低了附近獸群的活動。' },
] as const

export const MEDIUM_LIVING_EVENTS = {
  independent_boss_attempt: {
    weight: 8, cooldownDays: 240, successChance: 0.42,
    success: '一名橡谷守衛帶領巡守隊擊退了哥布林酋長，北方的威脅暫時減弱。',
    failure: '一名橡谷守衛嘗試阻止哥布林酋長，受傷後被同伴帶回聚落。',
  },
} as const

export const LIVING_EVENT_LIMITS = {
  news: 60, arcs: 12, requests: 12, memories: 40, recentEvents: 12,
  maxOpenRequests: 4, maxActiveVisitors: 2,
  deliverySquare: { x: 10, y: 10 }, deliveryDistance: 2,
  activeArcQuietDays: 2, consequenceQuietDays: 5, travelerQuietDays: 180,
} as const
