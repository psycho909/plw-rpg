import { expect, it } from 'vitest'
import { BUILDINGS, CONFIG } from '../data/config'
import { CRAFTING_RECIPES } from '../data/crafting'
import { craft, planCraft } from './crafting'
import { combatTurn, gather, rest } from './actions'
import { contentEncounterOptions, encounterContentMonster } from './contentFamilies'
import { equipInstance } from './rewardActions'
import { deserialize, serialize } from '../services/saveService'
import { createGame, player, walkTo } from './simulation'
import { encounterWolf, wolfEncounterOptions } from './wolfFamily'

const day = CONFIG.minutesPerDay

function resolveAvailableCombat(state: ReturnType<typeof createGame>) {
  let turns = 0
  while (state.combat && player(state).isAlive && turns++ < 30) {
    const result = combatTurn(state, player(state).hp < player(state).maxHp * .4 ? 'defend' : 'attack')
    if (result) return result
  }
  return state.combat ? 'combat turn bound reached' : ''
}

function recoverAtVillage(state: ReturnType<typeof createGame>) {
  if (!walkTo(state, { x: 10, y: 9 })) return false
  let attempts = 0
  while (player(state).stamina < player(state).maxStamina && attempts++ < 20) {
    if (rest(state, 'rest')) return false
  }
  return player(state).stamina === player(state).maxStamina
}

it('records a bounded normal fresh-save adventure-to-life route attempt without fixture edits', () => {
  const state = createGame(20261016)
  const startedAt = state.worldTime
  const startingMaterial = state.reward.materials[state.activeCharacterId]?.wolfFang ?? 0
  const route: string[] = [`fresh save seed=${state.worldSeed}`, `start time=${startedAt}`, `starting wolfFang=${startingMaterial}`]
  expect(startingMaterial).toBe(0)
  let outcome = 'NOT ESTABLISHED — NORMAL PROGRESSION'
  let blocker = '30 in-game days elapsed'

  if (!walkTo(state, { x: 5, y: 4 })) blocker = 'forest route unavailable'
  else {
    const source = wolfEncounterOptions(state).find(option => option.definitionId === 'grayWolf')
    route.push(`visible source: ${source?.label ?? 'grayWolf'}; eligible=${source?.eligible}; reason=${source?.reason ?? 'none'}`)

    for (let action = 0; action < 120 && state.worldTime - startedAt < 30 * day && player(state).isAlive; action++) {
      if ((state.reward.materials[state.activeCharacterId]?.wolfFang ?? 0) > 0) break
      if (player(state).stamina < 8) {
        if (!recoverAtVillage(state)) { blocker = 'could not recover stamina at village'; break }
        if (!walkTo(state, { x: 5, y: 4 })) { blocker = 'could not return to forest'; break }
      }
      const option = wolfEncounterOptions(state).find(candidate => candidate.definitionId === 'grayWolf')
      if (!option?.eligible) { blocker = option?.reason ?? 'no visible eligible adventure source'; break }
      if (encounterWolf(state, 'grayWolf')) { blocker = 'canonical encounter action rejected the visible source'; break }
      const combatError = resolveAvailableCombat(state)
      if (combatError) { blocker = combatError; break }
    }
    if (!player(state).isAlive) blocker = 'fresh character died before obtaining the adventure material'
  }

  if ((state.reward.materials[state.activeCharacterId]?.wolfFang ?? 0) > 0 && player(state).isAlive) {
    route.push(`adventure material acquired at world time=${state.worldTime}; wolfFang=${state.reward.materials[state.activeCharacterId]?.wolfFang ?? 0}`)
    if (!recoverAtVillage(state)) blocker = 'could not recover before life-route actions'
    else {
      if (!walkTo(state, { x: 5, y: 4 })) blocker = 'could not reach wood source'
      else while (player(state).inventory.wood < 3 && player(state).isAlive && state.worldTime - startedAt < 30 * day) {
        if (player(state).stamina < 10 && !recoverAtVillage(state)) break
        if (player(state).currentRegion !== 'forest' && !walkTo(state, { x: 5, y: 4 })) break
        if (gather(state, 'wood')) break
      }
      if (player(state).inventory.wood >= 3 && walkTo(state, { x: 19, y: 5 })) {
        while (player(state).inventory.stone < 2 && player(state).isAlive && state.worldTime - startedAt < 30 * day) {
          if (player(state).stamina < 10 && !recoverAtVillage(state)) break
          if (player(state).currentRegion !== 'mine' && !walkTo(state, { x: 19, y: 5 })) break
          if (gather(state, 'stone')) break
        }
      }
      if (player(state).inventory.wood >= 3 && player(state).inventory.stone >= 2 && walkTo(state, BUILDINGS.store.position)) {
        let craftResult = craft(state, { recipeId: 'starterSpear', influenceMaterial: 'wolfFang' })
        let waits = 0
        while (!craftResult.ok && waits++ < 24 && state.worldTime - startedAt < 30 * day) {
          const message = craftResult.message
          if (!message.includes('營業') && !message.includes('時間')) break
          if (rest(state, 'rest')) break
          craftResult = craft(state, { recipeId: 'starterSpear', influenceMaterial: 'wolfFang' })
        }
        if (craftResult.ok && craftResult.instanceId && equipInstance(state, craftResult.instanceId) === '') {
          route.push(`crafted and equipped at world time=${state.worldTime}; wolfFang after craft=${state.reward.materials[state.activeCharacterId]?.wolfFang ?? 0}`)
          if (walkTo(state, { x: 5, y: 4 }) && player(state).stamina >= 8
            && encounterWolf(state, 'grayWolf') === '' && resolveAvailableCombat(state) === '') {
            outcome = 'COMPLETED — NORMAL PROGRESSION (optional influence-material path)'
            blocker = 'none'
          } else blocker = 'equipped item did not reach a second legal adventure action'
        } else blocker = `craft/equip unavailable: ${craftResult.ok ? 'equip rejected' : craftResult.message}`
      } else blocker = 'normal gather route did not provide recipe inputs within the window'
    }
  }

  route.push(`end time=${state.worldTime}; elapsed days=${((state.worldTime - startedAt) / day).toFixed(2)}`)
  route.push(`material=${state.reward.materials[state.activeCharacterId]?.wolfFang ?? 0}; wood=${player(state).inventory.wood}; stone=${player(state).inventory.stone}; gold=${player(state).gold}`)
  route.push(`smithing=${player(state).skills.smithing.level}; alive=${player(state).isAlive}`)
  console.log(`[phase10-b-normal] ${outcome}; blocker=${blocker}; ${route.join(' | ')}`)
  expect(state.worldTime - startedAt).toBeLessThanOrEqual(30 * day)
  expect(outcome).toBe('COMPLETED — NORMAL PROGRESSION (optional influence-material path)')
})

it('attempts a required adventure-input recipe from a fresh save using public actions only', () => {
  const state = createGame(20261017)
  const startedAt = state.worldTime
  const maxMinutes = 2 * 120 * day
  const maxActions = 7000
  const recipeId = 'slime_resin_guard_recipe'
  const recipe = CRAFTING_RECIPES[recipeId]
  const required = recipe.inputs.find(input => input.source === 'material')
  if (!required || required.source !== 'material') throw new Error('target recipe has no required adventure material')
  const actions: string[] = []
  const route = [`fresh save seed=${state.worldSeed}`, `start time=${startedAt}`, `window=2 game years (240 days) / ${maxActions} public action calls`,
    `target=${recipeId}; required input=${required.materialId} x${required.amount}; station=${recipe.station}; Smithing=${recipe.requiredSmithing}`]
  let outcome = 'NOT ESTABLISHED — NORMAL PROGRESSION (required adventure-input path)'
  let blocker = 'bounded window expired'
  const settlementTrace: string[] = [`day 0.00: stage=${state.settlement.stage}; growth=${state.settlement.growth.toFixed(2)}; blacksmith=${state.settlement.buildings.includes('blacksmith')}`]
  let lastRecordedDay = 0
  let lastRecordedStage = state.settlement.stage
  let blacksmithBuiltAt: number | null = null
  let blacksmithAvailableAt: number | null = null
  let sampledAvailable = false
  const atLimit = () => actions.length >= maxActions || state.worldTime - startedAt >= maxMinutes
  const act = <T>(name: string, fn: () => T): T | null => {
    if (atLimit()) return null
    actions.push(name)
    return fn()
  }
  const travel = (x: number, y: number) => act(`walkTo ${x},${y}`, () => walkTo(state, { x, y })) === true
  const sampleSettlement = () => {
    const elapsedDays = Math.floor((state.worldTime - startedAt) / day)
    const stage = state.settlement.stage
    const built = state.settlement.buildings.includes('blacksmith')
    if (elapsedDays > lastRecordedDay && (elapsedDays % 30 === 0 || stage !== lastRecordedStage)) {
      settlementTrace.push(`day ${((state.worldTime - startedAt) / day).toFixed(2)}: stage=${stage}; growth=${state.settlement.growth.toFixed(2)}; blacksmith=${built}`)
      lastRecordedDay = elapsedDays
      lastRecordedStage = stage
    }
    if (built && !sampledAvailable) {
      const projection = planCraft(state, { recipeId })
      if (projection.station.built) {
        sampledAvailable = true
        blacksmithBuiltAt = state.worldTime
        route.push(`engine projection first showed blacksmith built at world time=${state.worldTime}; elapsed days=${((state.worldTime - startedAt) / day).toFixed(2)}; built=${projection.station.built}; nearby=${projection.station.nearby}; available=${projection.station.available}; reason=${projection.reasonCode ?? 'none'}`)
      }
    }
  }
  const recoverAtVillage = () => {
    if (!travel(10, 9)) return false
    let count = 0
    while (player(state).stamina < 12 && !atLimit() && count++ < 8) {
      const rested = act('rest at village', () => rest(state, 'rest'))
      if (rested === null || rested !== '') return false
    }
    return player(state).stamina >= 12
  }
  const gatherUntil = (kind: 'wood' | 'stone', amount: number, region: 'forest' | 'mine', destination: { x: number; y: number }) => {
    if (!travel(destination.x, destination.y)) return false
    let count = 0
    while (player(state).inventory[kind] < amount && !atLimit() && player(state).isAlive && count++ < 40) {
      if (player(state).stamina < 10 && (!recoverAtVillage() || !travel(destination.x, destination.y))) return false
      if (player(state).currentRegion !== region || act(`gather ${kind}`, () => gather(state, kind)) !== '') return false
    }
    return player(state).inventory[kind] >= amount
  }

  const startingMaterial = state.reward.materials[state.activeCharacterId]?.[required.materialId] ?? 0
  const startingSmithing = player(state).skills.smithing.level
  expect(startingMaterial).toBe(0)
  const woodReady = gatherUntil('wood', 6, 'forest', { x: 5, y: 4 })
  const stoneReady = woodReady && gatherUntil('stone', 4, 'mine', { x: 19, y: 5 })
  if (!woodReady || !stoneReady) blocker = 'could not gather legal starter recipe inputs within the bound'
  else if (!travel(BUILDINGS.store.position.x, BUILDINGS.store.position.y)) blocker = 'could not reach the configured store workstation'
  else {
    let starterCrafts = 0
    while (player(state).skills.smithing.level < recipe.requiredSmithing && !atLimit() && player(state).isAlive) {
      const preview = planCraft(state, { recipeId: 'starterSpear' })
      if (!preview.ok && ['station_closed', 'stamina_required'].includes(preview.reasonCode ?? '')) {
        if (!recoverAtVillage() || !travel(BUILDINGS.store.position.x, BUILDINGS.store.position.y)) break
      }
      const crafted = act('craft starterSpear for Smithing XP', () => craft(state, { recipeId: 'starterSpear' }))
      if (!crafted || !crafted.ok) { blocker = `legal Smithing progression blocked: ${crafted?.ok === false ? crafted.message : 'action/time bound'}`; break }
      starterCrafts++
    }
    route.push(`legal Smithing progression: ${startingSmithing} -> ${player(state).skills.smithing.level} via ${starterCrafts} starterSpear crafts`)

    if (player(state).skills.smithing.level >= recipe.requiredSmithing && !atLimit()) {
      if (!travel(16, 10)) blocker = 'could not reach the farmland encounter source'
      else {
        let source = contentEncounterOptions(state, 'slime').find(option => option.definitionId === 'slime_slick')
        route.push(`visible source slime_slick: region=${player(state).currentRegion}; eligible=${source?.eligible}; reason=${source?.reason ?? 'none'}`)
        let count = 0
        while ((state.reward.materials[state.activeCharacterId]?.[required.materialId] ?? 0) < required.amount
          && !atLimit() && player(state).isAlive && count++ < 12) {
          if (player(state).stamina < 8 && (!recoverAtVillage() || !travel(16, 10))) { blocker = 'could not recover and return to slime source'; break }
          source = contentEncounterOptions(state, 'slime').find(option => option.definitionId === 'slime_slick')
          if (!source?.eligible) { blocker = `required adventure source blocked: ${source?.reason ?? 'no visible eligible slime_slick'}`; break }
          if (act('encounterContentMonster slime_slick', () => encounterContentMonster(state, 'slime_slick')) !== '') {
            blocker = 'canonical encounter rejected the projected eligible source'; break
          }
          let turns = 0
          while (state.combat && player(state).isAlive && !atLimit() && turns++ < 30) {
            const command = player(state).hp < player(state).maxHp * .55 && player(state).inventory.potion > 0 ? 'potion'
              : player(state).hp < player(state).maxHp * .4 ? 'defend' : 'attack'
            if (act(`combatTurn ${command}`, () => combatTurn(state, command)) !== '') break
          }
          if (state.combat) { blocker = 'combat turn or route bound reached'; break }
          if (!player(state).isAlive) { blocker = 'character died before obtaining the required material'; break }
        }
        route.push(`required material=${state.reward.materials[state.activeCharacterId]?.[required.materialId] ?? 0}; time=${state.worldTime}`)
        if ((state.reward.materials[state.activeCharacterId]?.[required.materialId] ?? 0) >= required.amount && !atLimit()) {
          if (!travel(BUILDINGS.blacksmith.position.x, BUILDINGS.blacksmith.position.y)) blocker = 'could not reach blacksmith location'
          else {
            const preview = planCraft(state, { recipeId })
            route.push(`required recipe preview: ok=${preview.ok}; reasonCode=${preview.reasonCode}; message=${preview.message ?? 'none'}; stage=${state.settlement.stage}; blacksmithBuilt=${state.settlement.buildings.includes('blacksmith')}`)
            if (preview.ok) {
              const crafted = act(`craft ${recipeId}`, () => craft(state, { recipeId }))
              if (crafted?.ok && crafted.instanceId && act('equip required-input item', () => equipInstance(state, crafted.instanceId!)) === '') {
                if (travel(16, 10) && contentEncounterOptions(state, 'slime').some(option => option.definitionId === 'slime_slick' && option.eligible)
                  && act('encounter after equip', () => encounterContentMonster(state, 'slime_slick')) === '') {
                  outcome = 'COMPLETED — NORMAL PROGRESSION (required adventure-input path)'
                  blocker = 'none'
                } else blocker = 'equipped item could not reach another eligible adventure action'
              } else blocker = `required recipe craft/equip failed: ${crafted?.ok === false ? crafted.message : 'action/time bound'}`
            } else blocker = `${preview.reasonCode}: ${preview.message ?? 'required recipe unavailable'}`
          }
        } else if (blocker === 'bounded window expired') {
          blocker = atLimit() ? '2-game-year or 7000-action bound reached before completion' : 'required material count was not reached'
        }
      }
    } else if (blocker === 'bounded window expired') blocker = `Smithing ${player(state).skills.smithing.level} did not reach required level ${recipe.requiredSmithing}`
  }

  if ((state.reward.materials[state.activeCharacterId]?.[required.materialId] ?? 0) >= required.amount
    && !sampledAvailable && player(state).isAlive && !atLimit()) {
    const craftWoodReady = gatherUntil('wood', 2, 'forest', { x: 5, y: 4 })
    if (!craftWoodReady) blocker = 'could not gather required recipe wood after starter crafts'
    else if (!travel(10, 9)) blocker = 'could not reach village to legally wait for settlement growth'
    else {
      let rests = 0
      while (!sampledAvailable && !atLimit() && player(state).isAlive && rests++ < maxActions) {
        const rested = act('legal village rest (60 minutes)', () => rest(state, 'rest'))
        if (rested === null || rested !== '') { blocker = `legal waiting blocked: ${rested ?? 'action bound reached'}`; break }
        sampleSettlement()
      }
      if (!sampledAvailable && blocker === 'bounded window expired') {
        blocker = atLimit() ? '2-game-year or 7000-action bound reached before blacksmith appeared' : 'blacksmith did not appear while character remained alive'
      }
      if (sampledAvailable && !atLimit()) {
        let restsForOpening = 0
        while (!atLimit() && restsForOpening++ < 30) {
          const minuteOfDay = state.worldTime % day
          if (minuteOfDay >= 8 * 60 && minuteOfDay < 16 * 60) break
          const rested = act('legal village rest for blacksmith opening', () => rest(state, 'rest'))
          if (rested === null || rested !== '') { blocker = `waiting for station hours blocked: ${rested ?? 'action bound reached'}`; break }
          sampleSettlement()
        }
        if (!travel(BUILDINGS.blacksmith.position.x, BUILDINGS.blacksmith.position.y)) blocker = 'could not reach newly built blacksmith'
        else {
          const preview = planCraft(state, { recipeId })
          route.push(`required recipe preview after growth: ok=${preview.ok}; reasonCode=${preview.reasonCode ?? 'none'}; stage=${state.settlement.stage}; blacksmithBuilt=${state.settlement.buildings.includes('blacksmith')}; time=${state.worldTime}`)
          if (preview.station.available) {
            blacksmithAvailableAt = state.worldTime
            route.push(`engine planCraft first reported target station available at world time=${blacksmithAvailableAt}; elapsed days=${((blacksmithAvailableAt - startedAt) / day).toFixed(2)}; station=${JSON.stringify(preview.station)}`)
          }
          if (preview.ok) {
            const crafted = act(`craft ${recipeId}`, () => craft(state, { recipeId }))
            if (crafted?.ok && crafted.instanceId) {
              route.push(`crafted ${recipeId} at world time=${state.worldTime}; remaining ${required.materialId}=${state.reward.materials[state.activeCharacterId]?.[required.materialId] ?? 0}`)
              const equipped = act('equip required-input item', () => equipInstance(state, crafted.instanceId!))
              if (equipped === '') route.push(`equipped ${recipeId} at world time=${state.worldTime}`)
              if (equipped === '') {
              if (travel(5, 4)) {
                const followup = wolfEncounterOptions(state).find(option => option.definitionId === 'grayWolf')
                route.push(`post-equip visible adventure source grayWolf: eligible=${followup?.eligible}; reason=${followup?.reason ?? 'none'}`)
                if (followup?.eligible && act('encounter after equip', () => encounterWolf(state, 'grayWolf')) === '') {
                  outcome = 'COMPLETED — NORMAL PROGRESSION (required adventure-input path)'
                  blocker = 'none'
                  route.push(`post-craft adventure encounter started at world time=${state.worldTime}`)
                } else blocker = 'equipped item could not start a visible eligible post-craft adventure encounter'
              } else blocker = 'could not return to forest after equip'
              } else blocker = `required recipe equip failed: ${equipped ?? 'action/time bound'}`
            } else blocker = `required recipe craft failed: ${crafted?.ok === false ? crafted.message : 'action/time bound'}`
          } else blocker = `${preview.reasonCode}: ${preview.message ?? 'required recipe unavailable after settlement growth'}`
        }
      }
    }
  }

  if (lastRecordedDay < Math.floor((state.worldTime - startedAt) / day)) sampleSettlement()
  route.push(`settlement stages over time: ${settlementTrace.join(' -> ')}`)
  route.push(`blacksmith built via planCraft projection: ${blacksmithBuiltAt === null ? 'not observed' : `world time ${blacksmithBuiltAt} (${((blacksmithBuiltAt - startedAt) / day).toFixed(2)} days after start)`}; target station available via planCraft: ${blacksmithAvailableAt === null ? 'not observed' : `world time ${blacksmithAvailableAt} (${((blacksmithAvailableAt - startedAt) / day).toFixed(2)} days after start)`}`)
  route.push(`end time=${state.worldTime}; elapsed days=${((state.worldTime - startedAt) / day).toFixed(2)}; public action calls=${actions.length}`)
  route.push(`start/end ${required.materialId}=${startingMaterial}/${state.reward.materials[state.activeCharacterId]?.[required.materialId] ?? 0}; Smithing=${startingSmithing}/${player(state).skills.smithing.level}; stage=${state.settlement.stage}; blacksmith=${state.settlement.buildings.includes('blacksmith')}; alive=${player(state).isAlive}`)
  console.log(`[phase10-b-required] ${outcome}; blocker=${blocker}; ${route.join(' | ')}`)
  expect(state.worldTime - startedAt).toBeLessThanOrEqual(maxMinutes)
  expect(actions.length).toBeLessThanOrEqual(maxActions)
  // Established by Phase10-B (seed 20261017, blacksmith at ~day 69); a regression to NOT ESTABLISHED must fail.
  expect(outcome).toBe('COMPLETED — NORMAL PROGRESSION (required adventure-input path)')
})

it('preserves adventure-sourced material through craft, equip, save/reload, and another adventure action', () => {
  const state = createGame(62732)
  expect(walkTo(state, { x: 5, y: 4 })).toBe(true)
  expect(encounterWolf(state, 'grayWolf')).toBe('')
  // Controlled combat fixture: keep the test focused on the cross-system handoff, not fight balance.
  state.combat!.hp = 1
  player(state).stats.strength = 1000
  expect(combatTurn(state, 'attack')).toBe('')
  expect(state.reward.materials[state.activeCharacterId]?.wolfFang).toBeGreaterThan(0)
  expect(state.reward.materials[state.activeCharacterId]?.wolfFang).toBe(1)

  const character = player(state)
  character.inventory.wood = 3
  character.inventory.stone = 2
  character.gold = Math.max(character.gold, 100)
  character.stamina = character.maxStamina
  character.currentRegion = 'village'
  character.position = { ...BUILDINGS.store.position }
  state.worldTime = Math.floor(state.worldTime / day) * day + 10 * 60
  const crafted = craft(state, { recipeId: 'starterSpear', influenceMaterial: 'wolfFang' })
  if (!crafted.ok) throw new Error(`${crafted.reasonCode}: ${crafted.message}`)
  expect(crafted.ok).toBe(true)
  const created = state.reward.instances.find(item => item.instanceId === crafted.instanceId)!
  expect(created.craftProvenance).toMatchObject({ recipeId: 'starterSpear', influenceMaterial: 'wolfFang' })
  expect(state.reward.materials[state.activeCharacterId]?.wolfFang).toBe(0)
  expect(equipInstance(state, crafted.instanceId)).toBe('')
  const equippedBefore = structuredClone(state.reward.equipped)
  const touchedBefore = {
    worldTime: state.worldTime,
    rngState: state.rngState,
    character: structuredClone(character),
    inventory: structuredClone(character.inventory),
    materials: structuredClone(state.reward.materials),
    instances: structuredClone(state.reward.instances),
    equipped: equippedBefore,
    history: structuredClone(state.history),
    events: structuredClone(state.events),
  }
  const loaded = deserialize(serialize(state, 101016)).state
  expect({
    worldTime: loaded.worldTime,
    rngState: loaded.rngState,
    character: player(loaded),
    inventory: player(loaded).inventory,
    materials: loaded.reward.materials,
    instances: loaded.reward.instances,
    equipped: loaded.reward.equipped,
    history: loaded.history,
    events: loaded.events,
  }).toEqual(touchedBefore)
  expect(walkTo(loaded, { x: 5, y: 4 })).toBe(true)
  expect(encounterWolf(loaded, 'grayWolf')).toBe('')
})
