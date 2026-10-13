import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const out = resolve(root, 'reports/v2/20261008-content-expansion/phase-07/k-ui-selector-20261013/fixtures')
await mkdir(out, { recursive: true })
const server = await createServer({ configFile: resolve(root, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'custom' })

try {
  const { CONFIG, BUILDINGS } = await server.ssrLoadModule('/src/data/config.ts')
  const { createGame, player, gainExp, walkTo } = await server.ssrLoadModule('/src/engine/simulation.ts')
  const { farm } = await server.ssrLoadModule('/src/engine/actions.ts')
  const { combatTurn } = await server.ssrLoadModule('/src/engine/actions.ts')
  const { generateItem } = await server.ssrLoadModule('/src/engine/itemGeneration.ts')
  const { contentEncounterOptions, encounterContentMonster, contentCombatPresentation } = await server.ssrLoadModule('/src/engine/contentFamilies.ts')
  const { CONTENT_MONSTERS } = await server.ssrLoadModule('/src/data/contentRegistry.ts')
  const { WOLF_MONSTERS, MATERIALS } = await server.ssrLoadModule('/src/data/rewards.ts')
  const { serialize, deserialize } = await server.ssrLoadModule('/src/services/saveService.ts')
  const { emptyJournal, packCheckpoint } = await server.ssrLoadModule('/src/services/playJournal.ts')
  const { planCraft } = await server.ssrLoadModule('/src/engine/crafting.ts')

  const fixtures = {}
  function prepare(state) {
    state.life.openingSeen = true
    state.settlement.stage = 'village'
    if (!state.settlement.buildings.includes('blacksmith')) state.settlement.buildings.push('blacksmith')
    const character = player(state)
    character.gold = Math.max(character.gold, 1000)
    character.stamina = character.maxStamina
    character.hp = character.maxHp
    return character
  }
  function setPosition(state, x, y) {
    if (!walkTo(state, { x, y })) throw new Error(`canonical walkTo failed at ${x},${y}`)
  }
  function publish(name, state, notes) {
    state.life.openingSeen = true
    const rawState = serialize(state, 1_797_000_000_000)
    const loaded = deserialize(rawState)
    if (loaded.state.worldSeed !== state.worldSeed || loaded.state.rngState !== state.rngState
      || loaded.state.worldTime !== state.worldTime || loaded.state.reward.instances.length !== state.reward.instances.length) {
      throw new Error(`${name}: current serialize/deserialize round trip differs`)
    }
    const raw = packCheckpoint(state, emptyJournal(), 1_797_000_000_000)
    fixtures[name] = { raw, notes, worldSeed: state.worldSeed, worldTime: state.worldTime,
      saveVersion: state.saveVersion, stateRoundTrip: 'serialize -> deserialize PASS', checkpoint: 'packCheckpoint current source' }
  }

  // 21 genuine generated owned instances exercise the real filter-before-page projection.
  {
    const state = createGame(781301), character = prepare(state)
    setPosition(state, BUILDINGS.blacksmith.position.x, BUILDINGS.blacksmith.position.y)
    for (let index = 0; index < 21; index++) {
      const item = generateItem(state, { baseId: index === 20 ? 'hideArmor' : 'shortSword', level: 4 })
      state.reward.instances.push(item)
      if (!state.reward.collection.bases.includes(item.baseId)) state.reward.collection.bases.push(item.baseId)
    }
    if (state.reward.materials[character.id] === undefined) state.reward.materials[character.id] = Object.fromEntries(Object.keys(MATERIALS).map(id => [id, 0]))
    publish('inventory-gear', state, 'Controlled inventory fixture: 21 current-source generateItem instances (20 short swords, one hide armor), public save serializer round-trip, player moved to the public blacksmith location by walkTo. Isolated browser context only; not natural acquisition evidence.')
  }

  // The source panel exposes multiple known monster sources, condition-blocked sources and a generic hidden-region row.
  {
    const state = createGame(781302), character = prepare(state)
    setPosition(state, 5, 4)
    state.reward.collection.seen = [...new Set([...Object.keys(WOLF_MONSTERS), ...Object.keys(CONTENT_MONSTERS)])]
    state.reward.collection.materials.push('wolfFang', 'fog_undead_bone')
    state.reward.materials[character.id] = Object.fromEntries(Object.keys(MATERIALS).map(id => [id, id === 'wolfFang' ? 1 : 0]))
    character.stamina = 0
    publish('inventory-material-sources', state, 'Controlled state-aware material knowledge fixture: canonical public monster IDs are marked seen, inventory knowledge contains wolfFang and fog_undead_bone, and stamina is exhausted to expose canonical ineligible reasons. Unknown-region identities remain undiscovered and are represented by the generic projection. Isolated browser context only.')
  }

  // Workbench fixtures compare a genuine missing-input plan with the same legal recipe after its public inputs are supplied.
  for (const [name, wood, stone] of [['recipe-missing', 0, 0], ['recipe-satisfied', 3, 2]]) {
    const state = createGame(name === 'recipe-missing' ? 781303 : 781304), character = prepare(state)
    setPosition(state, BUILDINGS.store.position.x, BUILDINGS.store.position.y)
    character.skills.smithing = { level: 1, exp: 0 }
    character.inventory.wood = wood
    character.inventory.stone = stone
    const plan = planCraft(state, { recipeId: 'starterSpear' })
    if (name === 'recipe-missing' ? plan.ok : !plan.ok) throw new Error(`${name}: unexpected canonical planCraft result ${JSON.stringify(plan)}`)
    fixtures[`${name}-expectation`] = { ok: plan.ok, message: plan.message, reasonCode: plan.reasonCode, recipeId: 'starterSpear' }
    publish(name, state, `Controlled public planCraft fixture for starterSpear; expected plan ${plan.ok ? 'accepted' : 'rejected'} (${plan.reasonCode ?? 'none'}). ${name === 'recipe-missing' ? 'Inputs omitted.' : 'Exact required wood/stone supplied.'} Isolated browser context only.`)
  }

  // Spring/farmland UI: one public prepared plot, then the browser performs visible sowing and waits via x20.
  {
    const state = createGame(781305)
    prepare(state)
    setPosition(state, BUILDINGS.farm.position.x, BUILDINGS.farm.position.y)
    const result = farm(state, 'prepare')
    if (result) throw new Error(`canonical farm prepare failed: ${result}`)
    publish('farm-spring-ready', state, 'Canonical public walkTo + farm(prepare) fixture at the real farmland tile. Spring valid crops and season-ineligible reasons are projected by the running game; browser performs plant action and x20 maturation through visible controls.')
  }
  {
    const state = createGame(781306)
    prepare(state)
    setPosition(state, BUILDINGS.farm.position.x, BUILDINGS.farm.position.y)
    for (let plot = 0; plot < CONFIG.maxPlots; plot++) {
      const prepared = farm(state, 'prepare')
      if (prepared) throw new Error(`canonical prepare ${plot} failed: ${prepared}`)
      const planted = farm(state, 'plant', 'wheat')
      if (planted) throw new Error(`canonical plant ${plot} failed: ${planted}`)
    }
    publish('farm-capacity', state, 'Canonical public farm prepare/plant transactions fill all four plots; used only to verify the capacity guidance copy in an isolated browser context.')
  }
  {
    const state = createGame(781307)
    prepare(state)
    setPosition(state, BUILDINGS.farm.position.x, BUILDINGS.farm.position.y)
    // This controlled projection edge is the only way to render a farm window with a non-farmland current region.
    player(state).currentRegion = 'village'
    publish('farm-region-guidance', state, 'Controlled projection-edge fixture: the canonical farm building is selected at its valid map tile while currentRegion is set to village so the canonical farmCropChoices API can expose region-unavailable reasons. Save schema round trip passes; excluded from natural-play claims.')
  }

  // Current-region candidate list and rank labels from canonical forest encounter options.
  {
    const state = createGame(781308), character = prepare(state)
    setPosition(state, 5, 4)
    state.threat.monsterPopulation = 90
    state.threat.threatLevel = 3
    state.threat.campLevel = 3
    gainExp(state, character, 2_500)
    const options = contentEncounterOptions(state)
    if (!options.some(option => option.rank === 'boss') || !options.some(option => option.rank === 'normal')) {
      throw new Error(`forest rank fixture lacks normal/boss candidate: ${JSON.stringify(options.map(option => [option.definitionId, option.rank]))}`)
    }
    publish('forest-content-list', state, `Controlled current-region discovery fixture; current-source contentEncounterOptions returned ${options.length} forest rows including normal and boss ranks. UI is restricted to this canonical forest projection. Isolated browser context only.`)
  }

  // The battle cue is reached through canonical encounter and combat-turn APIs, not by injecting a combat snapshot.
  {
    const state = createGame(781309), character = prepare(state)
    setPosition(state, 5, 4)
    state.threat.monsterPopulation = 90
    state.threat.threatLevel = 3
    state.threat.campLevel = 3
    gainExp(state, character, 2_500)
    character.maxHp = 500
    character.hp = 500
    const target = 'frontier_goblin_warlord'
    const startError = encounterContentMonster(state, target)
    if (startError) throw new Error(`canonical boss encounter rejected ${target}: ${startError}`)
    const turns = []
    for (let index = 0; index < 8; index++) {
      const presentation = contentCombatPresentation(state)
      if (presentation?.cue) break
      if (!state.combat || !character.isAlive) throw new Error(`boss battle ended before a telegraph after ${index} turns`)
      const result = combatTurn(state, 'defend')
      turns.push({ action: 'defend', result, playerHp: character.hp, enemyHp: state.combat?.hp ?? null,
        turn: state.combat?.contentEncounter?.turn ?? null, cue: contentCombatPresentation(state)?.cue ?? null })
    }
    const presentation = contentCombatPresentation(state)
    if (!presentation?.cue || presentation.rankLabel !== '首領') {
      throw new Error(`canonical boss cue not reached: ${JSON.stringify({ presentation, turns })}`)
    }
    fixtures['boss-cue-expectation'] = { target, rankLabel: presentation.rankLabel, variant: presentation.variant?.name?.['zh-TW'] ?? null,
      cue: presentation.cue, turns }
    publish('boss-cue', state, `Controlled battle reached through encounterContentMonster(${target}) then ${turns.length} canonical combatTurn(defend) actions; contentCombatPresentation emitted the visible Boss rank/cue. Isolated browser context only.`)
  }

  for (const [name, fixture] of Object.entries(fixtures)) {
    await writeFile(resolve(out, `${name}.json`), JSON.stringify(fixture, null, 2) + '\n')
  }
  console.log(JSON.stringify({ status: 'PASS', saveVersion: CONFIG.saveVersion, fixtures: Object.fromEntries(Object.entries(fixtures).map(([name, fixture]) => [name, { bytes: Buffer.byteLength(fixture.raw ?? JSON.stringify(fixture)), seed: fixture.worldSeed, notes: fixture.notes }])) }, null, 2))
} finally {
  await server.close()
}
