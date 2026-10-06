import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const repo = '/workspace/plw-rpg'
const legacyRoot = '/tmp/plw-rpg-v1-75662ae'
const out = resolve(repo, 'reports/playtests/20261004-v2-final-qa/engine/fixtures')
mkdirSync(out, { recursive: true })

function publish(path, body) {
  execFileSync('python3', ['scripts/recorded_reports.py', 'publish', path], {
    cwd: repo, input: body, stdio: ['pipe', 'inherit', 'inherit'],
  })
}

const server = await createServer({
  configFile: false,
  root: legacyRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { createGame, player, simulate, walkTo, chooseSuccessor } = await server.ssrLoadModule('/src/engine/simulation.ts')
  const { farm, gather, trade, encounter, enterDungeon, hire } = await server.ssrLoadModule('/src/engine/actions.ts')
  const { serialize } = await server.ssrLoadModule('/src/services/saveService.ts')
  const { CONFIG, BUILDINGS } = await server.ssrLoadModule('/src/data/config.ts')
  const created = []
  const year = CONFIG.daysPerSeason * 4 * CONFIG.minutesPerDay
  const now = 1791158520000

  function save(name, state, purpose, actions) {
    const raw = serialize(state, now)
    const parsed = JSON.parse(raw)
    assert.equal(parsed.saveVersion, 1)
    assert.equal(Object.hasOwn(parsed, 'life'), false)
    assert([...parsed.events, ...parsed.history].every(event => !Object.hasOwn(event, 'tier')))
    const path = resolve(out, `${name}.json`)
    writeFileSync(path, `${JSON.stringify(parsed)}\n`)
    created.push({
      file: `engine/fixtures/${name}.json`,
      sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
      purpose,
      worldSeed: state.worldSeed,
      worldTime: state.worldTime,
      activeCharacterId: state.activeCharacterId,
      characters: state.characters.length,
      npcs: state.npcs.length,
      events: state.events.length,
      history: state.history.length,
      actionTrace: [...actions],
    })
  }

  {
    const state = createGame(17)
    const actions = []
    assert.equal(walkTo(state, BUILDINGS.farm.position), true); actions.push('walkTo(farm)')
    assert.equal(farm(state, 'prepare'), ''); actions.push('farm(prepare)')
    assert.equal(farm(state, 'plant'), ''); actions.push('farm(plant)')
    simulate(state, CONFIG.cropMinutes); actions.push('simulate(crop duration)')
    assert.equal(farm(state, 'harvest'), ''); actions.push('farm(harvest)')
    assert.equal(walkTo(state, { x: 19, y: 5 }), true); actions.push('walkTo(mine)')
    assert.equal(gather(state, 'iron'), ''); actions.push('gather(iron)')
    assert.equal(walkTo(state, { x: 10, y: 9 }), true); actions.push('walkTo(store)')
    assert.equal(trade(state, 'iron', false), ''); actions.push('trade(sell iron)')
    save('v1-life-economy', state, 'V1 canonical farming, harvest, mining, sale, crops and world history', actions)
  }

  {
    const state = createGame(909)
    const actions = []
    assert.equal(walkTo(state, { x: 5, y: 4 }), true); actions.push('walkTo(forest)')
    assert.equal(encounter(state), ''); actions.push('encounter(outdoor)')
    assert(state.combat)
    save('v1-active-combat', state, 'V1 normal outdoor encounter saved during combat', actions)
  }

  {
    const state = createGame(2026)
    const actions = []
    assert.equal(walkTo(state, { x: 20, y: 3 }), true); actions.push('walkTo(discovered mine entrance)')
    assert.equal(state.dungeon.discovered, true)
    assert.equal(enterDungeon(state), ''); actions.push('enterDungeon')
    save('v1-dungeon-entry', state, 'V1 explored mine and entered the first dungeon room', actions)
    assert.equal(encounter(state), ''); actions.push('encounter(dungeon stage 0)')
    save('v1-dungeon-combat', state, 'V1 dungeon encounter saved during combat', actions)
  }

  {
    const state = createGame(321)
    const actions = []
    simulate(state, 3 * year); actions.push('simulate(3 natural years)')
    assert(['village', 'town'].includes(state.settlement.stage))
    assert(state.settlement.buildings.includes('tavern'))
    assert.equal(walkTo(state, { x: BUILDINGS.tavern.position.x, y: BUILDINGS.tavern.position.y - 1 }), true)
    actions.push('walkTo(tavern)')
    const minute = state.worldTime % CONFIG.minutesPerDay
    if (minute < 17 * 60) { simulate(state, 17 * 60 - minute); actions.push('simulate(wait for tavern opening)') }
    const mercenary = state.npcs.find(npc => npc.job === 'mercenary' && npc.isAlive && npc.age >= 15)
    assert(mercenary)
    assert.equal(hire(state, mercenary.id), ''); actions.push('hire(existing mercenary)')
    assert.equal(state.party.length, 1)
    save('v1-settlement-party-threat', state, 'V1 natural settlement growth, unlocked tavern, recruited party and evolved threat', actions)
  }

  {
    const state = createGame(909)
    const actions = []
    simulate(state, 3 * year); actions.push('simulate(3 natural years)')
    assert(state.threat.bossAlive)
    const before = state.history.filter(event => event.type === 'boss.warning').length
    assert(before >= 1)
    save('v1-regional-boss', state, 'V1 organically evolved threat, warning history and active boss', actions)
  }

  {
    const state = createGame(42)
    const actions = []
    let elapsedYears = 0
    while (player(state).isAlive && elapsedYears < 100) {
      simulate(state, year)
      elapsedYears++
      actions.push(`simulate(year ${elapsedYears})`)
    }
    assert.equal(player(state).isAlive, false)
    const successor = state.npcs.filter(npc => npc.isAlive && npc.age >= 15).sort((a, b) => a.age - b.age || a.id.localeCompare(b.id))[0]
    assert(successor)
    assert.equal(chooseSuccessor(state, successor.id), true); actions.push(`chooseSuccessor(${successor.id})`)
    simulate(state, CONFIG.minutesPerDay); actions.push('simulate(after succession)')
    assert.equal(player(state).id, successor.id)
    save('v1-death-succession', state, 'V1 natural aging, player death, public successor selection and continued world time', actions)
  }

  const metadata = {
    sourceCommit: execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    fixtureEngineCommit: '75662ae',
    fixtureEngineCommitFull: execFileSync('git', ['-C', repo, 'rev-parse', '75662ae'], { encoding: 'utf8' }).trim(),
    fixtureEngineFiles: Object.fromEntries(['src/engine/actions.ts', 'src/engine/simulation.ts', 'src/services/saveService.ts', 'src/data/config.ts'].map(file => [
      file, createHash('sha256').update(readFileSync(resolve(legacyRoot, file))).digest('hex'),
    ])),
    generatedAt: new Date().toISOString(),
    method: 'V1 engine was extracted from the committed V1 source with git archive; each file was emitted by V1 public APIs through V1 serialize(). Fixtures were not edited after serialization.',
    fixtures: created,
  }
  publish(resolve(out, 'manifest.json'), `${JSON.stringify(metadata, null, 2)}\n`)
  console.log(JSON.stringify(metadata, null, 2))
} finally {
  await server.close()
}
