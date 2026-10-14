export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const parseLine = (line) => {
    const values = []
    let value = ''
    let quoted = false
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      if (char === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i += 1 }
        else quoted = !quoted
      } else if (char === ',' && !quoted) {
        values.push(value); value = ''
      } else value += char
    }
    values.push(value)
    return values
  }
  const headers = parseLine(lines[0])
  return lines.slice(1).map((line) => Object.fromEntries(parseLine(line).map((value, index) => [headers[index], value])))
}

const number = (row, key) => {
  const value = Number(row[key])
  if (!Number.isFinite(value)) throw new Error(`Expected numeric ${key}; got ${row[key]}`)
  return value
}

export function computeCounterfactual({ cropRows, dailyRows, route = 'seasonal-farm-sell', sourceAttempt = null }) {
  const harvests = cropRows.filter((row) => row.variant === route && row.event !== 'plant' && row.yield !== '')
  if (!harvests.length) throw new Error(`No harvest rows for route ${route}`)
  const seeds = [...new Set(harvests.map((row) => row.seed))].sort()
  const yearOneLevels = new Map()
  for (const seed of seeds) {
    const yearEnd = dailyRows
      .filter((row) => row.variant === route && row.seed === seed && number(row, 'day') === 359)
      .at(-1)
    if (!yearEnd) throw new Error(`Missing day 359 Farming level for seed ${seed}`)
    yearOneLevels.set(seed, number(yearEnd, 'farming'))
  }

  const variantDefs = [
    { id: 'V0-current', label: 'Current: level - 1', bonus: (level) => level - 1 },
    { id: 'V1-gather-style', label: 'Gather-style: floor((level - 1) / 2)', bonus: (level) => Math.floor((level - 1) / 2) },
    { id: 'V2-base-only', label: 'Base yield only', bonus: () => 0 },
    { id: 'V3-year1-frozen', label: 'Freeze bonus at year 1 end', bonus: (_level, year1Level) => year1Level - 1 },
    { id: 'V4-capped', label: 'Owner V4: min(2, floor((level - 1) / 2))', bonus: (level) => Math.min(2, Math.floor((level - 1) / 2)) },
  ]
  const aggregates = new Map()
  for (const variant of variantDefs) {
    const bySeed = new Map(seeds.map((seed) => [seed, { gold: 0, harvests: 0, foodEquivalent: 0, stamina: 0, byCrop: {} }]))
    for (const row of harvests) {
      const seed = row.seed
      const reportedFarmingLevel = number(row, 'farmingLevel')
      const actualYield = number(row, 'yield')
      const baseYield = BASE_YIELDS[row.cropId]
      if (!baseYield) throw new Error(`No source base-yield mapping for ${row.cropId}`)
      // The runner logs Farming level after farm() mutates the character; if that
      // harvest itself crosses a level threshold, this is one level above the
      // level used to calculate its yield. Infer the effective level from yield.
      const effectiveFarmingLevel = actualYield - baseYield + 1
      if (effectiveFarmingLevel < 1) throw new Error(`Inconsistent current yield for ${row.cropId} seed ${seed}`)
      const yieldAmount = variant.id === 'V0-current'
        ? actualYield
        : baseYield + variant.bonus(effectiveFarmingLevel, yearOneLevels.get(seed))
      const gold = yieldAmount * number(row, 'unitSell')
      const food = yieldAmount * number(row, 'foodValueEach')
      const stamina = number(row, 'fieldStamina')
      const bucket = bySeed.get(seed)
      bucket.gold += gold
      bucket.harvests += 1
      bucket.foodEquivalent += food
      bucket.stamina += stamina
      const crop = bucket.byCrop[row.cropId] ??= {
        season: row.plantedSeason,
        maturityDays: number(row, 'maturityDays'),
        unitSell: number(row, 'unitSell'),
        foodValueEach: number(row, 'foodValueEach'),
        harvests: 0,
        yield: 0,
        gold: 0,
        foodEquivalent: 0,
        stamina: 0,
      }
      crop.harvests += 1
      crop.yield += yieldAmount
      crop.gold += gold
      crop.foodEquivalent += food
      crop.stamina += stamina
    }
    for (const bucket of bySeed.values()) {
      for (const crop of Object.values(bucket.byCrop)) {
        crop.goldPerStamina = crop.gold / crop.stamina
        crop.goldPerMatureDay = crop.gold / (crop.harvests * crop.maturityDays)
      }
    }
    aggregates.set(variant.id, { ...variant, bySeed })
  }

  const variants = variantDefs.map(({ id, label }) => {
    const aggregate = aggregates.get(id)
    return {
      id,
      label,
      seeds: seeds.map((seed) => ({ seed: Number(seed), year1FarmingLevel: yearOneLevels.get(seed), ...aggregate.bySeed.get(seed) })),
      meanGoldPerSeed: [...aggregate.bySeed.values()].reduce((sum, entry) => sum + entry.gold, 0) / seeds.length,
    }
  })
  const currentGold = variants[0].meanGoldPerSeed
  return {
    evidence: {
      route,
      sourceAttempt,
      seeds: seeds.map(Number),
      harvestRows: harvests.length,
      calculation: 'fixed-policy counterfactual: same recorded harvests, crop IDs, seasons, maturity, stamina and sale prices; only Farming yield bonus changes',
      baseYield: 'seasonal crop harvestAmount values from src/data/content/farmCrops.ts; V0 preserves observed yield, while V1 infers effective Farming level from yield because the runner logs level after the harvest action can award XP',
      yearOneEndDay: 359,
      yearOneFarmingLevels: Object.fromEntries([...yearOneLevels].map(([seed, level]) => [seed, level])),
      excluded: ['re-running or adapting route policy', 'market capacity/demand', 'crop sale action-time opportunity cost'],
    },
    variants: variants.map((variant) => ({
      ...variant,
      deltaVsCurrentPerSeed: variant.meanGoldPerSeed - currentGold,
      percentOfCurrent: variant.meanGoldPerSeed / currentGold * 100,
    })),
  }
}

const BASE_YIELDS = {
  spring_pea: 4,
  field_turnip: 6,
  marsh_rice: 8,
  sun_pepper: 4,
  orchard_apple: 5,
  cave_mushroom: 4,
}
