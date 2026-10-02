import { CONFIG } from '../data/config'

export function calendar(minutes: number, daysPerSeason = CONFIG.daysPerSeason) {
  const dayIndex = Math.floor(minutes / CONFIG.minutesPerDay)
  return {
    year: Math.floor(dayIndex / (daysPerSeason * 4)) + 1,
    season: Math.floor(dayIndex / daysPerSeason) % 4,
    day: dayIndex % daysPerSeason + 1,
    hour: Math.floor(minutes % CONFIG.minutesPerDay / 60), minute: Math.floor(minutes % 60),
  }
}
export function lifeStage(age: number) {
  return age < CONFIG.ages.young ? 'child' : age < CONFIG.ages.adult ? 'young' : age < CONFIG.ages.middleAge ? 'adult' : age < CONFIG.ages.elder ? 'middleAge' : 'elder'
}
export function clockLabel(minutes: number) {
  const c = calendar(minutes)
  return `第 ${c.year} 年 ${CONFIG.seasons[c.season]} ${c.day} 日 ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`
}
