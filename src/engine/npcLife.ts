import { JOBS, CONFIG } from '../data/config'
import {
  NPC_CAREER_DIALOGUE, NPC_CAREER_LABELS, NPC_CONTEXT_DIALOGUE, NPC_JOB_DIALOGUE, NPC_JOB_PROFILES,
  NPC_LIFE_LIMITS, NPC_MEMORY_DIALOGUE, NPC_TRAIT_DIALOGUE,
} from '../data/npcLife'
import type { CareerStage, IdentityId, ImportantMemory, NpcLife } from '../domain/life'
import type { GameState, JobId, NPC } from '../domain/types'
import { calendar } from './calendar'
import { emit } from './events'
import { newNpcLife } from './lifeState'
import { random } from './random'

const CAREER_RANK: Record<CareerStage, number> = {
  resident: 0, apprentice: 1, worker: 2, experienced: 3, senior: 4, owner: 5, retired: 6,
}
const DAY = CONFIG.minutesPerDay
const YEAR_DAYS = CONFIG.daysPerSeason * 4

function seededStream(seed: number, key: string) {
  let rngState = (seed ^ 0x811c9dc5) >>> 0
  for (const char of key) rngState = Math.imul(rngState ^ char.charCodeAt(0), 0x01000193) >>> 0
  return { rngState }
}

function lifeFor(state: GameState, npc: NPC): NpcLife {
  const existing = state.life.npcs[npc.id]
  if (existing) {
    if (existing.careerJob !== npc.job) existing.careerJob = npc.job
    return existing
  }
  const index = Math.max(0, state.npcs.indexOf(npc))
  const created = newNpcLife(state, npc.id, npc.job, index)
  state.life.npcs[npc.id] = created
  return created
}

function bestSkill(npc: NPC) {
  return Math.max(...Object.values(npc.skills).map(skill => skill.level))
}

function retirementAge(life: NpcLife) {
  const later = life.traits.includes('hardworking') || life.traits.includes('ambitious')
  const earlier = life.traits.includes('content') || life.traits.includes('solitary')
  return 68 + (later ? 2 : 0) - (earlier ? 2 : 0)
}

function desiredCareer(state: GameState, npc: NPC, life: NpcLife): CareerStage {
  if (npc.age >= retirementAge(life)) return 'retired'
  if (npc.age < 15) return 'resident'
  if (npc.age < 18) return 'apprentice'
  const skill = bestSkill(npc)
  const ownsFarmBusiness = state.life.properties.some(property => property.kind === 'farmBusiness' && property.ownerId === npc.id)
  const hasOwnerExperience = npc.age >= 48 && skill >= 8
    && (ownsFarmBusiness || (state.settlement.stage !== 'hamlet'
      && (npc.job === 'farmer' || npc.job === 'blacksmith' || npc.job === 'shopkeeper')
      && life.traits.includes('ambitious')))
  if (hasOwnerExperience) return 'owner'
  if (npc.age >= 48 && skill >= 5) return 'senior'
  if (npc.age >= 32 || (npc.age >= 25 && skill >= 4)) return 'experienced'
  return 'worker'
}

function rememberMilestone(state: GameState, npc: NPC, life: NpcLife, career: CareerStage) {
  if (life.milestones.some(milestone => milestone.id === `career:${career}`)) return
  life.milestones.push({ id: `career:${career}`, at: state.worldTime, text: `${npc.name}成為${NPC_CAREER_LABELS[career]}。` })
  if (life.milestones.length > NPC_LIFE_LIMITS.milestones) {
    life.milestones.splice(0, life.milestones.length - NPC_LIFE_LIMITS.milestones)
  }
  if (life.featured) emit(state, 'npc.life.milestone', 'npc', life.milestones[life.milestones.length - 1]!.text)
}

function concernFor(state: GameState, npc: NPC, life: NpcLife) {
  if (life.career === 'retired') return '享受安穩的退休生活'
  if (state.settlement.food < 28) return '擔心橡谷的糧食供應'
  if (state.settlement.safety < 42 || state.threat.bossAlive) return '留意北方的安全'
  if ((npc.job === 'miner' || npc.job === 'blacksmith') && state.life.director.ironReserve < 14) return '擔心鐵礦供應不足'
  if (npc.job === 'farmer' && state.settlement.food < 55) return '想讓今年的收成更好'
  if (npc.job === 'guard' || npc.job === 'mercenary') return '留意聚落周遭的動靜'
  return `專心做好${JOBS[npc.job].name}的工作`
}

function roleNeed(state: GameState, job: JobId) {
  if (job === 'farmer') return 1 + Math.max(0, 52 - state.settlement.food) / 18
  if (job === 'miner' || job === 'blacksmith') return 1 + Math.max(0, 32 - state.life.director.ironReserve) / 12
  if (job === 'guard' || job === 'mercenary') {
    return 1 + Math.max(0, 62 - state.settlement.safety) / 16 + Math.max(0, state.threat.threatLevel - 1) * .35
  }
  if (job === 'woodcutter') return 1 + Math.max(0, 45 - state.settlement.infrastructure) / 45
  if (job === 'shopkeeper') return 1 + Math.max(0, state.settlement.prosperity - 60) / 60
  return 1
}

function weightedCareerJob(state: GameState, npc: NPC, life: NpcLife, year: number): JobId | null {
  const eligible = state.npcs.filter(resident => resident.isAlive && resident.age >= 15
    && state.life.npcs[resident.id]?.career !== 'retired')
  const total = Math.max(1, eligible.length)
  const counts = new Map<JobId, number>()
  for (const resident of eligible) counts.set(resident.job, (counts.get(resident.job) ?? 0) + 1)
  const candidates = (Object.keys(NPC_JOB_PROFILES) as JobId[]).flatMap(job => {
    const profile = NPC_JOB_PROFILES[job]
    if (job !== npc.job && profile.building && !state.settlement.buildings.includes(profile.building)) return []
    const target = Math.max(1, Math.ceil(total * profile.share))
    if ((counts.get(job) ?? 0) >= target) return []
    const skill = npc.skills[profile.skill].level
    const affinity = Object.entries(profile.traits).reduce((weight, [trait, value]) =>
      weight + (life.traits.includes(trait as NpcLife['traits'][number]) ? value - 1 : 0), 0)
    const retention = job === npc.job ? 2.2 : 1
    const weight = retention * (1 + Math.min(skill, 10) * .045 + affinity * .32) * roleNeed(state, job)
    return [{ job, weight: Math.max(.1, weight) }]
  })
  if (!candidates.length) return null
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0)
  let roll = random(seededStream(state.worldSeed, `${npc.id}|${year}|${life.career}|${npc.job}`)) * totalWeight
  for (const candidate of candidates) {
    roll -= candidate.weight
    if (roll < 0) return candidate.job
  }
  return candidates[candidates.length - 1]!.job
}

function changeJob(npc: NPC, life: NpcLife, job: JobId) {
  npc.job = job
  npc.workplace = { ...JOBS[job].workplace }
  life.careerJob = job
}

function retireNpc(npc: NPC) {
  npc.schedule = [
    { start: 0, activity: 'sleep', destination: 'home' },
    { start: 420, activity: 'leisure', destination: 'home' },
    { start: 1320, activity: 'sleep', destination: 'home' },
  ]
  npc.currentActivity = 'leisure'
  npc.position = { ...npc.home }
}

export function npcCanWork(state: GameState, npcId: string) {
  const npc = state.npcs.find(resident => resident.id === npcId)
  return Boolean(npc?.isAlive && npc.age >= 15 && state.life.npcs[npcId]?.career !== 'retired')
}

const PERSONAL_MEMORIES = new Set<ImportantMemory['kind']>([
  'PLAYER_HELPED_ME', 'PLAYER_HIRED_ME', 'PLAYER_SAVED_ME', 'PLAYER_FAILED_ME',
])

function distance(a: NPC['position'], b: NPC['position']) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function canLearnLocalMemory(npc: NPC, life: NpcLife, state: GameState, kind: ImportantMemory['kind']) {
  const closeToPlayer = distance(npc.position, state.characters.find(character => character.id === state.activeCharacterId)!.position) <= 4
  const sociallyConnected = life.traits.includes('social')
  switch (kind) {
    case 'PLAYER_DEFENDED_OAKVALE':
      return closeToPlayer || npc.job === 'guard' || npc.job === 'mercenary' || sociallyConnected
    case 'PLAYER_OWNS_FARM':
      return closeToPlayer || npc.job === 'farmer' || npc.job === 'shopkeeper' || sociallyConnected
    case 'PLAYER_SUPPORTED_FOOD':
      return closeToPlayer || npc.job === 'farmer' || npc.job === 'shopkeeper' || npc.job === 'guard' || sociallyConnected
    case 'GOBLIN_CHIEF_DEFEATED':
      return closeToPlayer || npc.job === 'guard' || npc.job === 'mercenary' || npc.job === 'woodcutter'
        || life.traits.includes('brave') || life.traits.includes('wanderer')
    case 'DUNGEON_DISCOVERED':
      return closeToPlayer || npc.job === 'miner' || npc.job === 'guard' || npc.job === 'mercenary'
        || life.traits.includes('brave') || life.traits.includes('wanderer')
    case 'MAJOR_DISASTER':
      return closeToPlayer || npc.job === 'guard' || sociallyConnected
    default:
      return false
  }
}

export function rememberNpc(state: GameState, npcId: string, memory: ImportantMemory) {
  const npc = state.npcs.find(resident => resident.id === npcId && resident.isAlive)
  if (!npc) return false
  const life = lifeFor(state, npc)
  if (!PERSONAL_MEMORIES.has(memory.kind) && !canLearnLocalMemory(npc, life, state, memory.kind)) return false
  if (life.memories.some(known => known.kind === memory.kind && known.actorId === memory.actorId)) return false
  life.memories.push({ ...memory })
  if (life.memories.length > NPC_LIFE_LIMITS.memories) {
    life.memories.splice(0, life.memories.length - NPC_LIFE_LIMITS.memories)
  }
  return true
}

export function dailyNpcLife(state: GameState) {
  const yearDay = Math.floor(state.worldTime / DAY) % YEAR_DAYS
  // Simulation's first daily boundary is day two; include it so new worlds receive an opening review.
  const annualReview = yearDay <= 1
  const year = calendar(state.worldTime).year
  for (const npc of state.npcs) {
    if (!npc.isAlive) continue
    const life = lifeFor(state, npc)
    const prior = life.career
    if (prior !== 'retired') {
      if (npc.age >= retirementAge(life)) {
        life.career = 'retired'
        changeJob(npc, life, npc.job)
        retireNpc(npc)
        rememberMilestone(state, npc, life, 'retired')
      } else if (annualReview) {
        const desired = desiredCareer(state, npc, life)
        if (CAREER_RANK[desired] > CAREER_RANK[prior]) {
          life.career = desired
          rememberMilestone(state, npc, life, desired)
          if (['worker', 'experienced', 'senior', 'owner'].includes(desired) && bestSkill(npc) >= 2) {
            const job = weightedCareerJob(state, npc, life, year)
            if (job && job !== npc.job) changeJob(npc, life, job)
          }
        }
      }
    }
    if (life.career === 'retired') retireNpc(npc)
    life.concern = concernFor(state, npc, life)
  }
}

type DialogueChoice = { id: string; weight: number; text: string }

function projectedLife(state: GameState, npc: NPC) {
  return state.life.npcs[npc.id] ?? newNpcLife(state, npc.id, npc.job, Math.max(0, state.npcs.indexOf(npc)))
}

function dialogueChoices(state: GameState, life: NpcLife): DialogueChoice[] {
  const choices: DialogueChoice[] = []
  const add = (prefix: string, lines: DialogueChoice[], multiplier = 1) => {
    for (const line of lines) choices.push({ id: `${prefix}:${line.id}`, weight: line.weight * multiplier, text: line.text })
  }
  const job = life.careerJob
  add('career', NPC_CAREER_DIALOGUE[life.career], 4)
  add('job', NPC_JOB_DIALOGUE[job], 2)
  add('concern', NPC_CONTEXT_DIALOGUE.concern, 3)
  for (const trait of life.traits) add(`trait:${trait}`, NPC_TRAIT_DIALOGUE[trait], 1)

  const playerId = state.activeCharacterId
  const knownMemories = life.memories.filter(memory =>
    !memory.kind.startsWith('PLAYER_') || memory.actorId === playerId,
  ).slice(-4)
  for (const memory of knownMemories) {
    const recency = Math.max(0, state.worldTime - memory.at)
    const multiplier = PERSONAL_MEMORIES.has(memory.kind) ? 8 : 5
    add(`memory:${memory.kind}:${memory.actorId}`, NPC_MEMORY_DIALOGUE[memory.kind], multiplier / (1 + recency / (YEAR_DAYS * DAY)))
  }

  const playerLife = state.life.characters[playerId]
  const reputation = playerLife?.reputation ?? 0
  if (reputation >= 30) add('reputation', NPC_CONTEXT_DIALOGUE.reputation.known, 3)
  else if (reputation >= 10) add('reputation', NPC_CONTEXT_DIALOGUE.reputation.familiar, 2)
  const identities = playerLife?.identities ?? []
  const identity = (['farmOwner', 'veteran', 'skilledFarmer', 'skilledMiner', 'adventurer', 'farmer', 'miner'] as IdentityId[])
    .find(candidate => identities.includes(candidate))
  if (identity) add(`identity:${identity}`, NPC_CONTEXT_DIALOGUE.identity[identity] ?? [], 2.5)
  return choices
}

function chooseDialogue(state: GameState, npc: NPC, life: NpcLife, roll: number) {
  const choices = dialogueChoices(state, life)
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0)
  let choiceRoll = roll * totalWeight
  let chosen = choices[choices.length - 1]!
  for (const choice of choices) {
    choiceRoll -= choice.weight
    if (choiceRoll < 0) { chosen = choice; break }
  }
  return chosen.text
    .replaceAll('{job}', JOBS[life.careerJob].name)
    .replaceAll('{age}', String(npc.age))
    .replaceAll('{concern}', life.concern || concernFor(state, npc, life))
}

export function npcDialogue(state: GameState, npcId: string) {
  const npc = state.npcs.find(resident => resident.id === npcId && resident.isAlive)
  if (!npc) return ''
  const life = projectedLife(state, npc)
  const key = `${npc.id}|${Math.floor(state.worldTime / DAY)}|${state.activeCharacterId}|${life.memories.length}`
  const roll = random(seededStream(state.worldSeed, `dialogue|${key}`))
  return chooseDialogue(state, npc, life, roll)
}

export function talkNpc(state: GameState, npcId: string) {
  const npc = state.npcs.find(resident => resident.id === npcId && resident.isAlive)
  const character = state.characters.find(resident => resident.id === state.activeCharacterId)
  if (!npc || !character?.isAlive || state.combat || state.dungeon.inDungeon) return '目前無法與這名居民交談。'
  if (distance(npc.position, character.position) > 1) return '請走近這名居民再交談。'
  const life = projectedLife(state, npc)
  const dialogue = chooseDialogue(state, npc, life, random(state))
  state.life.director.lastPlayerActivity = state.worldTime
  emit(state, 'npc.dialogue', 'npc', `${npc.name}：「${dialogue}」`)
  return ''
}
