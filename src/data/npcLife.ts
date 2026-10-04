import type { CareerStage, IdentityId, ImportantMemory, Trait } from '../domain/life'
import type { JobId, SkillId } from '../domain/types'

export const NPC_LIFE_LIMITS = { memories: 32, milestones: 32 } as const

export const NPC_CAREER_LABELS = {
  resident: '居民', apprentice: '學徒', worker: '工作者', experienced: '熟練工作者',
  senior: '資深工作者', owner: '經營者', retired: '退休居民',
} as const

export const NPC_JOB_PROFILES: Record<JobId, {
  skill: SkillId
  share: number
  traits: Partial<Record<Trait, number>>
  building?: 'blacksmith' | 'tavern'
}> = {
  farmer: { skill: 'farming', share: .24, traits: { hardworking: 1.35, content: 1.15, ambitious: .8 } },
  miner: { skill: 'mining', share: .15, traits: { hardworking: 1.3, solitary: 1.2, cautious: .8 } },
  woodcutter: { skill: 'woodcutting', share: .14, traits: { hardworking: 1.25, wanderer: 1.2, solitary: 1.1 } },
  blacksmith: { skill: 'mining', share: .1, traits: { hardworking: 1.2, ambitious: 1.1 }, building: 'blacksmith' },
  shopkeeper: { skill: 'farming', share: .1, traits: { social: 1.35, cautious: 1.1, solitary: .75 } },
  guard: { skill: 'combat', share: .14, traits: { brave: 1.4, cautious: 1.2, hardworking: 1.1 } },
  mercenary: { skill: 'combat', share: .13, traits: { brave: 1.35, wanderer: 1.3, social: 1.1 }, building: 'tavern' },
}

export interface NpcDialogueLine { id: string; weight: number; text: string }

export const NPC_CAREER_DIALOGUE: Record<CareerStage, NpcDialogueLine[]> = {
  resident: [{ id: 'resident', weight: 1, text: '橡谷的每一天都很新鮮，我還在找自己擅長的事。' }],
  apprentice: [{ id: 'apprentice', weight: 1, text: '我還在學著做好{job}，不懂的地方就問前輩。' }],
  worker: [{ id: 'worker', weight: 1, text: '今天得先去做{job}，生活總得一步步來。' }],
  experienced: [{ id: 'experienced', weight: 1, text: '做了這麼多年{job}，我大概摸清了門道。' }],
  senior: [{ id: 'senior', weight: 1, text: '年輕時做{job}比現在輕鬆，不過經驗還派得上用場。' }],
  owner: [{ id: 'owner', weight: 1, text: '我現在會照看橡谷的{job}事務，年輕人常來問我。' }],
  retired: [{ id: 'retired', weight: 1, text: '我做了很多年{job}，現在想把時間留給自己。' }],
}

export const NPC_TRAIT_DIALOGUE: Record<Trait, NpcDialogueLine[]> = {
  brave: [{ id: 'brave', weight: 1, text: '遇到麻煩時，總得有人先站出來。' }],
  cautious: [{ id: 'cautious', weight: 1, text: '我習慣先看看情況，再決定下一步。' }],
  ambitious: [{ id: 'ambitious', weight: 1, text: '橡谷還有很多可以變好的地方。' }],
  content: [{ id: 'content', weight: 1, text: '日子安穩，身邊的人平安，我就知足了。' }],
  hardworking: [{ id: 'hardworking', weight: 1, text: '手邊還有活，我想先把它做好。' }],
  wanderer: [{ id: 'wanderer', weight: 1, text: '走過幾段路後，我才知道自己想回到哪裡。' }],
  social: [{ id: 'social', weight: 1, text: '和鄰居聊上幾句，日子就沒那麼長了。' }],
  solitary: [{ id: 'solitary', weight: 1, text: '忙完工作後，我喜歡找個安靜的地方待一會兒。' }],
}

export const NPC_JOB_DIALOGUE: Record<JobId, NpcDialogueLine[]> = {
  farmer: [{ id: 'farmer', weight: 1, text: '田裡的作物每天都有變化，得常去看看。' }],
  miner: [{ id: 'miner', weight: 1, text: '礦坑裡的回音很熟悉，最近鐵脈還算穩定。' }],
  woodcutter: [{ id: 'woodcutter', weight: 1, text: '林子每天都不太一樣，走熟了也不能大意。' }],
  blacksmith: [{ id: 'blacksmith', weight: 1, text: '好工具能讓大家少吃點苦，最近工坊挺忙。' }],
  shopkeeper: [{ id: 'shopkeeper', weight: 1, text: '店裡的貨不算多，但熟客想要什麼我大多記得。' }],
  guard: [{ id: 'guard', weight: 1, text: '巡一圈橡谷，確認大家都平安。' }],
  mercenary: [{ id: 'mercenary', weight: 1, text: '我接過不少護衛工作，這裡的人讓我願意多留一陣子。' }],
}

export const NPC_MEMORY_DIALOGUE: Record<ImportantMemory['kind'], NpcDialogueLine[]> = {
  PLAYER_HELPED_ME: [{ id: 'helped', weight: 1, text: '你上次幫了我一把，這份人情我還記得。' }],
  PLAYER_HIRED_ME: [{ id: 'hired', weight: 1, text: '那次你邀我同行，讓我看見了不一樣的路。' }],
  PLAYER_SAVED_ME: [{ id: 'saved', weight: 1, text: '我還記得你把我從危險裡救出來。' }],
  PLAYER_FAILED_ME: [{ id: 'failed', weight: 1, text: '那次約定沒有成真，我到現在還有些失望。' }],
  PLAYER_DEFENDED_OAKVALE: [{ id: 'defended', weight: 1, text: '有人替橡谷擋下了危險，大家都鬆了一口氣。' }],
  PLAYER_OWNS_FARM: [{ id: 'farm', weight: 1, text: '聽說你有了自己的農場，往後收成值得期待。' }],
  PLAYER_SUPPORTED_FOOD: [{ id: 'food', weight: 1, text: '你送來的糧食讓不少人度過了難關。' }],
  GOBLIN_CHIEF_DEFEATED: [{ id: 'chief', weight: 1, text: '北方那個哥布林首領倒下後，商路終於安靜了一些。' }],
  DUNGEON_DISCOVERED: [{ id: 'dungeon', weight: 1, text: '廢棄礦坑的入口已經找到了，裡面還有多少東西沒人說得準。' }],
  MAJOR_DISASTER: [{ id: 'disaster', weight: 1, text: '那場災難讓大家都記住了，聚落能互相扶持很重要。' }],
}

export const NPC_CONTEXT_DIALOGUE = {
  concern: [{ id: 'concern', weight: 1, text: '最近我最掛心的是：{concern}。' }],
  reputation: {
    familiar: [{ id: 'familiar', weight: 1, text: '這陣子常聽見鄰居提起你。' }],
    known: [{ id: 'known', weight: 1, text: '你在橡谷做過的事，大家都還記得。' }],
  },
  identity: {
    farmer: [{ id: 'farmer', weight: 1, text: '你最近常照料田地，難怪大家說你是個可靠的農夫。' }],
    skilledFarmer: [{ id: 'skilledFarmer', weight: 1, text: '你的耕作本事在橡谷很有名。' }],
    miner: [{ id: 'miner', weight: 1, text: '礦場的人提過你的名字，說你很懂礦脈。' }],
    skilledMiner: [{ id: 'skilledMiner', weight: 1, text: '大家知道你是個有經驗的礦工。' }],
    adventurer: [{ id: 'adventurer', weight: 1, text: '旅店裡有人聊起你的冒險。' }],
    veteran: [{ id: 'veteran', weight: 1, text: '橡谷都知道你是身經百戰的冒險者。' }],
    farmOwner: [{ id: 'farmOwner', weight: 1, text: '聽說你有了自己的農場，往後收成值得期待。' }],
    resident: [{ id: 'resident', weight: 1, text: '你已經是橡谷熟悉的一份子了。' }],
  } satisfies Partial<Record<IdentityId, NpcDialogueLine[]>>,
}
