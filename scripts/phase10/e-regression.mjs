import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, readdir, mkdir, writeFile, appendFile, stat, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = process.cwd()
// CHROME_PATH / QA_OUT let later gates (e.g. RC smoke) reuse this runner; defaults are the Phase10-E setup.
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = process.env.QA_OUT ? path.resolve(ROOT, process.env.QA_OUT) : path.join(ROOT, 'reports/v2/20261016-final-qa-rc/phase-10/e-runner')
const DIST = path.join(ROOT, 'dist')
const widths = [320, 375, 768, 1280, 1920]
const heights = [768, 900, 1000]
const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '')
const attempt = path.join(OUT, `attempt-${stamp}-regression`)
const iso = () => new Date().toISOString()
const sha = value => createHash('sha256').update(value).digest('hex')
const safeName = value => value.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 56) || 'shot'

async function hashTree(dir) {
  const rows = []
  async function visit(base) {
    for (const ent of (await readdir(base, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(base, ent.name)
      if (ent.isDirectory()) await visit(full)
      else rows.push(`${path.relative(ROOT, full).replaceAll('\\', '/')}:${sha(await readFile(full))}`)
    }
  }
  await visit(dir)
  return sha(rows.join('\n'))
}
async function gitHead() {
  const r = spawn('git', ['rev-parse', 'HEAD'], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  let out = ''
  for await (const chunk of r.stdout) out += chunk
  return out.trim()
}
async function json(file, value) { await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' }) }
async function waitFor(fn, timeout = 30000, every = 120) {
  const start = Date.now()
  while (Date.now() - start < timeout) { const value = await fn().catch(() => false); if (value) return value; await delay(every) }
  throw new Error(`Timed out after ${timeout}ms`)
}

class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map() }
  async open() {
    await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }) })
    this.ws.addEventListener('message', e => {
      const packet = JSON.parse(e.data); const p = this.pending.get(packet.id)
      if (!p) return
      this.pending.delete(packet.id); packet.error ? p.reject(new Error(packet.error.message)) : p.resolve(packet.result)
    })
    return this
  }
  call(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout ${method}`)) }, 30000)
      this.pending.set(id, { resolve: x => { clearTimeout(timer); resolve(x) }, reject: x => { clearTimeout(timer); reject(x) } })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expression) {
    const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, userGesture: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result?.value
  }
  close() { try { this.ws.close() } catch {} }
}

async function staticServer() {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return }
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
      const full = path.resolve(DIST, relative)
      if (!full.startsWith(`${DIST}${path.sep}`)) throw new Error('path escape')
      let body
      try { body = await readFile(full) } catch { body = await readFile(path.join(DIST, 'index.html')) }
      res.writeHead(200, { 'content-type': mime[path.extname(full)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body)
    } catch { res.writeHead(400); res.end('bad request') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return { server, url: `http://127.0.0.1:${server.address().port}/` }
}

async function createCrisisCheckpoint() {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  try {
    const [sim, crisisModule, journalModule] = await Promise.all([
      vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/regionalCrisis.ts'),
      vite.ssrLoadModule('/src/services/playJournal.ts'),
    ])
    const state = sim.createGame(83041)
    const character = sim.player(state)
    character.position = { x: 8, y: 10 }; character.currentRegion = 'village'; character.status = 'idle'
    character.inventory.food = 25; character.gold = 10000
    state.life.openingSeen = true
    Object.assign(state.settlement, { food: 0, safety: 25 })
    Object.assign(state.threat, { threatLevel: 3, monsterPopulation: 100, campLevel: 3, bossAlive: true })
    const adults = state.npcs.filter(npc => npc.isAlive)
    adults.forEach((npc, index) => {
      npc.age = 30; npc.injuredUntil = state.worldTime
      const life = state.life.npcs[npc.id]
      if (index < 4) { npc.job = 'guard'; npc.equipment.weapon = null; npc.equipment.armor = null; life.career = 'worker'; life.careerJob = 'guard' }
      else if (index < 9) { npc.job = 'farmer'; life.career = 'worker'; life.careerJob = 'farmer' }
      else { life.career = 'retired' }
    })
    if (!crisisModule.tryStartRegionalCrisis(state, () => 0)) throw new Error('controlled crisis fixture did not enter warning phase')
    const raw = journalModule.packCheckpoint(state, journalModule.emptyJournal(), Date.now())
    return { raw, manifest: { kind: 'controlled crisis UI fixture', seed: 83041, startingPhase: state.regionalCrisis.phase, severity: state.regionalCrisis.severity, threatLevel: state.threat.threatLevel, monsterPopulation: state.threat.monsterPopulation, campLevel: state.threat.campLevel, bossAlive: state.threat.bossAlive, settlementFood: state.settlement.food, settlementSafety: state.settlement.safety, playerFood: character.inventory.food, playerGold: character.gold, guards: adults.filter(npc => npc.job === 'guard').length, farmers: adults.filter(npc => npc.job === 'farmer').length, openingSeen: state.life.openingSeen, injectedThrough: 'Oakvale v8 localStorage checkpoint, on controlled-fixture navigation only' } }
  } finally { await vite.close() }
}

async function controlledCrisisAudit(audit, serverUrl, attemptDir) {
  try {
    const { raw, manifest } = await createCrisisCheckpoint()
    const fixturePath = path.join(attemptDir, 'controlled-crisis-checkpoint.json')
    await writeFile(fixturePath, `${raw}\n`, { flag: 'wx' })
    const fixture = { manifest, checkpointBytes: Buffer.byteLength(raw), checkpointSha256: sha(raw), warning: null, preparation: null, contributions: [], outcome: null, waitedDays: 0 }
    const script = `if(location.search.includes('phase10-controlled-crisis=1')){localStorage.setItem('oakvale-v1',${JSON.stringify(raw)})}`
    await audit.cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: script })
    await audit.cdp.call('Page.navigate', { url: `${serverUrl}?phase10-controlled-crisis=1` })
    await waitFor(() => audit.cdp.eval("location.search.includes('phase10-controlled-crisis=1') && document.readyState==='complete'"))
    await waitFor(() => audit.cdp.eval('document.querySelector(".recent-event")?.innerText.includes("危機警訊")'))
    fixture.warning = { main: await audit.cdp.eval('document.querySelector(".recent-event")?.innerText ?? null'), screenshot: await audit.screenshot('crisis-fixture-warning-main') }
    await audit.openMenu(); await audit.safeClick('地方消息與委託', 'crisis-fixture-open-news-warning', 'text')
    fixture.warning.report = await audit.cdp.eval('document.querySelector("[data-crisis-report]")?.innerText ?? null')
    fixture.warning.screenshotReport = await audit.screenshot('crisis-fixture-warning-report')
    const waitDay = async (phaseLabel) => {
      await audit.escape(); await audit.openMenu(); await audit.safeClick('旅人筆記', `crisis-fixture-notes:${phaseLabel}`, 'text')
      const click = await audit.safeClick('等待 1 日', `crisis-fixture-wait-day:${phaseLabel}`, 'text')
      fixture.waitedDays += click.detail.ok ? 1 : 0
      await audit.escape(); return click.detail
    }
    await waitDay('warning-1'); await waitDay('warning-2'); await waitDay('warning-3')
    await audit.openMenu(); await audit.safeClick('地方消息與委託', 'crisis-fixture-open-news-preparation', 'text')
    fixture.preparation = { report: await audit.cdp.eval('document.querySelector("[data-crisis-report]")?.innerText ?? null'), screenshot: await audit.screenshot('crisis-fixture-preparation') }
    for (const label of ['支援食物', '支援後勤']) {
      const action = await audit.safeClick(label, `crisis-fixture-contribution:${label}`, 'text')
      fixture.contributions.push({ label, detail: action.detail, reportAfter: await audit.cdp.eval('document.querySelector("[data-crisis-report]")?.innerText ?? null') })
    }
    await audit.screenshot('crisis-fixture-after-contribution')
    for (let i = 0; i < 8; i++) await waitDay(`resolution-${i + 1}`)
    await audit.openMenu(); await audit.safeClick('地方消息與委託', 'crisis-fixture-open-news-outcome', 'text')
    fixture.outcome = { report: await audit.cdp.eval('document.querySelector("[data-crisis-report]")?.innerText ?? null'), screenshot: await audit.screenshot('crisis-fixture-outcome') }
    fixture.status = 'observed'
    await audit.flush('controlled-crisis-ui-fixture-closeout', { waitedDays: fixture.waitedDays, phaseText: fixture.outcome.report?.slice(0, 500), label: 'controlled fixture; separate from normal fresh-save lane' })
    return fixture
  } catch (error) {
    return { status: 'fixture-failed', error: String(error), stack: error.stack, label: 'controlled fixture attempted separately; normal fresh-save evidence remains authoritative' }
  }
}

async function createCraftCapCheckpoint() {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  try {
    const [sim, crafting, recipes, journal] = await Promise.all([
      vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/crafting.ts'),
      vite.ssrLoadModule('/src/data/crafting.ts'), vite.ssrLoadModule('/src/services/playJournal.ts'),
    ])
    const state = sim.createGame(94103)
    const character = sim.player(state)
    state.life.openingSeen = true
    character.position = { x: 9, y: 8 }; character.currentRegion = 'village'; character.status = 'idle'
    character.inventory.wood = 18; character.inventory.stone = 12; character.gold = 1000; character.stamina = character.maxStamina
    const craftLedger = []
    let plan = crafting.planCraft(state, { recipeId: 'starterSpear' })
    while (!plan.practice.graduated && craftLedger.length < 12) {
      const before = { level: character.skills.smithing.level, exp: character.skills.smithing.exp, xpAward: plan.practice.xpAward }
      const crafted = crafting.craft(state, { recipeId: 'starterSpear' })
      if (!crafted.ok) throw new Error(`cap fixture could not craft starterSpear: ${crafted.reasonCode}`)
      craftLedger.push({ ...before, instanceId: crafted.instanceId })
      plan = crafting.planCraft(state, { recipeId: 'starterSpear' })
    }
    if (!plan.practice.graduated || craftLedger.length === 0) throw new Error('cap fixture did not reach starterSpear practice cap')
    const advancedPlans = ['fieldSpear', 'fieldArmor', 'ironShortSword'].map(recipeId => {
      const result = crafting.planCraft(state, { recipeId })
      return { recipeId, ok: result.ok, reasonCode: result.reasonCode, message: result.message, skill: result.skill, inputs: result.inputs, station: result.station }
    })
    const raw = journal.packCheckpoint(state, journal.emptyJournal(), Date.now())
    return { raw, manifest: { kind: 'controlled crafting practice-cap UI fixture', seed: 94103, generatedBy: 'createGame + engine craft() until planCraft.practice.graduated', selectedRecipe: 'starterSpear', craftLedger, finalSmithing: { level: character.skills.smithing.level, exp: character.skills.smithing.exp }, capPlan: plan, advancedPlans, postCraftInventory: { wood: character.inventory.wood, stone: character.inventory.stone, iron: character.inventory.iron, gold: character.gold, stamina: character.stamina }, stationPosition: character.position, worldTime: state.worldTime } }
  } finally { await vite.close() }
}

async function controlledCraftCapAudit(audit, serverUrl, attemptDir) {
  const { raw, manifest } = await createCraftCapCheckpoint()
  const fixturePath = path.join(attemptDir, 'controlled-crafting-cap-checkpoint.json')
  await writeFile(fixturePath, `${raw}\n`, { flag: 'wx' })
  const fixture = { manifest, checkpointBytes: Buffer.byteLength(raw), checkpointSha256: sha(raw), capView: null, advancedView: null, status: 'started', label: 'engine-generated checkpoint loaded only as a controlled starting save; separate from normal fresh-save route' }
  const script = `if(location.search.includes('phase10-controlled-crafting=1')){localStorage.setItem('oakvale-v1',${JSON.stringify(raw)})}`
  await audit.cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: script })
  await audit.cdp.call('Page.navigate', { url: `${serverUrl}?phase10-controlled-crafting=1` })
  await waitFor(() => audit.cdp.eval('location.search.includes("phase10-controlled-crafting=1") && !!document.querySelector(".game-shell")'))
  await audit.openPlace('10,8', '雜貨店')
  const search = await audit.safeClick('#recipe-content-search', 'craft-cap-search-starter-spear')
  if (search.detail.ok) { await audit.cdp.call('Input.insertText', { text: '木石長矛' }); await audit.flush('craft-cap-type-starter-spear', { text: '木石長矛' }) }
  const selected = await audit.safeClick('button[data-craft-recipe="starterSpear"]', 'craft-cap-select-starter-spear', 'selector')
  const capScroll = await audit.cdp.eval('(()=>{const b=document.querySelector("dialog[open] .window-body");if(!b)return null;b.scrollTop=b.scrollHeight;return{scrollTop:b.scrollTop,scrollHeight:b.scrollHeight,clientHeight:b.clientHeight}})()')
  await delay(150)
  fixture.capView = {
    selected: selected.detail,
    screenshot: await audit.screenshot('craft-cap-workbench'),
    scroll: capScroll,
    visibleText: await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText ?? null'),
    practiceText: await audit.cdp.eval('document.querySelector(".crafting-preview")?.innerText ?? null'),
    helpTexts: await audit.cdp.eval('[...document.querySelectorAll("dialog[open] .help-text")].map(e=>e.innerText.trim())'),
    submit: await audit.cdp.eval('(()=>{const b=document.querySelector("[data-craft-submit]");return b?{text:b.innerText,disabled:b.disabled,warning:document.querySelector(".inline-warning")?.innerText??null}:null})()'),
    controls: await audit.dialogControls(),
  }
  const clearSearch = await audit.safeClick('[data-content-search-clear]', 'craft-cap-clear-recipe-search', 'selector')
  const advancedSearch = await audit.safeClick('#recipe-content-search', 'craft-cap-search-advanced-recipe')
  if (advancedSearch.detail.ok) { await audit.cdp.call('Input.insertText', { text: '鎖甲' }); await audit.flush('craft-cap-type-advanced-recipe', { text: '鎖甲' }) }
  const fieldArmor = await audit.safeClick('button[data-craft-recipe="fieldArmor"]', 'craft-cap-select-field-armor', 'selector')
  const advancedScroll = await audit.cdp.eval('(()=>{const b=document.querySelector("dialog[open] .window-body");if(!b)return null;b.scrollTop=b.scrollHeight;return{scrollTop:b.scrollTop,scrollHeight:b.scrollHeight,clientHeight:b.clientHeight}})()')
  await delay(150)
  fixture.advancedView = {
    clearSearch: clearSearch.detail,
    selected: fieldArmor.detail,
    screenshot: await audit.screenshot('craft-cap-advanced-recipe-blockers'),
    scroll: advancedScroll,
    visibleText: await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText ?? null'),
    preview: await audit.cdp.eval('document.querySelector(".crafting-preview")?.innerText ?? null'),
    warning: await audit.cdp.eval('document.querySelector(".inline-warning")?.innerText ?? null'),
    submit: await audit.cdp.eval('(()=>{const b=document.querySelector("[data-craft-submit]");return b?{text:b.innerText,disabled:b.disabled}:null})()'),
    recipeOptions: await audit.cdp.eval('([...document.querySelectorAll("dialog[open] button[data-craft-recipe]")].filter(e=>e.getClientRects().length).map(e=>({id:e.dataset.craftRecipe,text:e.innerText.trim(),disabled:e.disabled})))'),
  }
  fixture.status = 'observed'
  await audit.flush('controlled-crafting-cap-ui-fixture-closeout', { craftsToCap: manifest.craftLedger.length, capPracticeText: fixture.capView.practiceText, capGuidance: fixture.capView.helpTexts, advancedWarning: fixture.advancedView.warning, label: fixture.label })
  return fixture
}

async function createSuccessionCheckpoint() {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  try {
    const [sim, journal] = await Promise.all([
      vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/services/playJournal.ts'),
    ])
    const state = sim.createGame(94104)
    state.life.openingSeen = true
    const character = sim.player(state)
    sim.die(state, character, '受控接班流程驗證')
    const eligibleSuccessors = state.npcs.filter(npc => npc.isAlive && npc.age >= 15).map(npc => ({ id: npc.id, name: npc.name, age: npc.age, job: npc.job, level: npc.level }))
    if (!eligibleSuccessors.length) throw new Error('succession fixture has no eligible adult successor')
    const raw = journal.packCheckpoint(state, journal.emptyJournal(), Date.now())
    return { raw, manifest: { kind: 'controlled succession UI fixture', seed: 94104, generatedBy: 'createGame + engine die() before checkpoint packing', playerDeath: { id: character.id, name: character.name, age: character.age, isAlive: character.isAlive, deathCause: character.deathCause }, eligibleSuccessors } }
  } finally { await vite.close() }
}

async function controlledSuccessionAudit(audit, serverUrl, attemptDir) {
  const { raw, manifest } = await createSuccessionCheckpoint()
  const fixturePath = path.join(attemptDir, 'controlled-succession-checkpoint.json')
  await writeFile(fixturePath, `${raw}\n`, { flag: 'wx' })
  const fixture = { manifest, checkpointBytes: Buffer.byteLength(raw), checkpointSha256: sha(raw), opening: null, afterEscape: null, focusSequence: [], selection: null, postSuccession: null, status: 'started', label: 'death was produced by engine die() in a packed starting save; UI was used only to inspect and choose succession' }
  const script = `if(location.search.includes('phase10-controlled-succession=1')){localStorage.setItem('oakvale-v1',${JSON.stringify(raw)})}`
  await audit.cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: script })
  await audit.cdp.call('Page.navigate', { url: `${serverUrl}?phase10-controlled-succession=1` })
  await waitFor(() => audit.cdp.eval('location.search.includes("phase10-controlled-succession=1") && !!document.querySelector(".successor-list")'))
  fixture.opening = {
    screenshot: await audit.screenshot('succession-dialog-open'),
    dialog: await audit.cdp.eval('(()=>{const d=document.querySelector("dialog[open]"),b=d?.querySelector(".window-body button:not(:disabled)");return{open:!!d,modal:d?.matches(":modal")??false,dismissible:d?.getAttribute("aria-label"),closeButtons:d?.querySelectorAll(".window-close").length??0,initialFocus:{tag:document.activeElement?.tagName,text:document.activeElement?.innerText?.trim()??"",insideDialog:!!d?.contains(document.activeElement)},firstChoice:b?.innerText.trim()??null,choiceButtons:[...(d?.querySelectorAll(".successor-list button")??[])].map(x=>({text:x.innerText.trim(),disabled:x.disabled}))}})()'),
    visibleText: await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText ?? null'),
  }
  await audit.key('Escape', 'Escape', 27)
  fixture.afterEscape = await audit.cdp.eval('(()=>({dialogStillOpen:!!document.querySelector("dialog[open]"),title:document.querySelector("dialog[open] .window-heading")?.innerText??null,closeButtons:document.querySelectorAll("dialog[open] .window-close").length}))()')
  for (let i = 0; i < 2; i++) { await audit.key('Tab', 'Tab', 9); fixture.focusSequence.push(await audit.activeFocus()) }
  const choice = await audit.safeClick('.successor-list button:first-child', 'succession-choose-first-adult', 'selector')
  await waitFor(() => audit.cdp.eval('!document.querySelector(".successor-list") && !!document.querySelector(".player-hud")'))
  fixture.selection = choice.detail
  fixture.postSuccession = {
    screenshot: await audit.screenshot('succession-post-choice-hud'),
    hud: await audit.cdp.eval('document.querySelector(".player-hud")?.innerText ?? null'),
    dialogOpen: await audit.cdp.eval('!!document.querySelector("dialog[open]")'),
    visibleText: await audit.visible(),
  }
  fixture.status = 'observed'
  await audit.flush('controlled-succession-ui-fixture-closeout', { dialogStayedOpenAfterEscape: fixture.afterEscape.dialogStillOpen, choiceCount: fixture.opening.dialog.choiceButtons.length, selected: choice.detail.target?.text, postHud: fixture.postSuccession.hud, label: fixture.label })
  return fixture
}

async function createHybridCheckpoint() {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  try {
    const [sim, journal, saveService, rewards, config] = await Promise.all([
      vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/services/playJournal.ts'),
      vite.ssrLoadModule('/src/services/saveService.ts'), vite.ssrLoadModule('/src/data/rewards.ts'),
      vite.ssrLoadModule('/src/data/config.ts'),
    ])
    const state = sim.createGame(94201)
    const character = sim.player(state)
    state.life.openingSeen = true
    // Stand one tile from the blacksmith. The selected recipe is a blacksmith
    // recipe even though its materials are obtained through Adventure.
    character.position = { x: 11, y: 8 }; character.currentRegion = 'village'; character.status = 'idle'
    character.skills.smithing = { level: 2, exp: 0 }
    character.inventory.wood = 2; character.inventory.gold = 1000; character.stamina = character.maxStamina
    state.settlement.stage = 'village'; state.settlement.capacity = 60
    state.settlement.growth = config.CONFIG.stageGrowth.village
    state.settlement.buildings = [...new Set([...state.settlement.buildings, 'tavern', 'blacksmith'])]
    state.reward.collection.seen = [...new Set([...state.reward.collection.seen, 'slime_slick'])]
    state.reward.collection.materials = [...new Set([...state.reward.collection.materials, 'slime_resin'])]
    state.reward.materials[character.id] = Object.fromEntries(Object.keys(rewards.MATERIALS).map(id => [id, id === 'slime_resin' ? 3 : 0]))
    const raw = journal.packCheckpoint(state, journal.emptyJournal(), Date.now())
    saveService.deserialize(raw)
    return { raw, manifest: { kind: 'controlled hybrid UI starting-save fixture', seed: 94201, generatedBy: 'createGame plus explicit registered adventure material, required crafting skill, wood, gold, village stage and blacksmith station; saveService.deserialize validated the packed checkpoint', selectedRecipe: 'slime_resin_guard_recipe', material: { id: 'slime_resin', amount: 3, sourceMetadata: 'registered content material; visible origin behavior also covered by Phase9-C evidence' }, smithing: character.skills.smithing, position: character.position, settlement: { stage: state.settlement.stage, buildings: state.settlement.buildings } } }
  } finally { await vite.close() }
}

async function controlledHybridAudit(audit, serverUrl, attemptDir) {
  const { raw, manifest } = await createHybridCheckpoint()
  const fixturePath = path.join(attemptDir, 'controlled-hybrid-checkpoint.json')
  await writeFile(fixturePath, `${raw}\n`, { flag: 'wx' })
  const fixture = { manifest, checkpointBytes: Buffer.byteLength(raw), checkpointSha256: sha(raw), status: 'started', label: 'controlled starting save; all crafting, equipment and return-to-adventure interactions use visible production UI' }
  const script = `if(location.search.includes('phase10-controlled-hybrid=1')){localStorage.setItem('oakvale-v1',${JSON.stringify(raw)})}`
  await audit.cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: script })
  await audit.cdp.call('Page.navigate', { url: `${serverUrl}?phase10-controlled-hybrid=1` })
  await waitFor(() => audit.cdp.eval('location.search.includes("phase10-controlled-hybrid=1") && !!document.querySelector(".game-shell")'))
  await audit.openPlace('12,8', '鐵匠鋪')
  const search = await audit.safeClick('#recipe-content-search', 'controlled-hybrid-search-recipe', 'selector')
  if (search.detail.ok) { await audit.cdp.call('Input.insertText', { text: '樹脂護衣' }); await audit.flush('controlled-hybrid-type-recipe', { query: '樹脂護衣' }) }
  const select = await audit.safeClick('button[data-craft-recipe="slime_resin_guard_recipe"]', 'controlled-hybrid-select-recipe', 'selector')
  fixture.plan = await audit.cdp.eval('document.querySelector(".crafting-preview")?.innerText??null')
  fixture.craftScreenshot = await audit.screenshot('controlled-hybrid-craft-plan')
  fixture.craft = await audit.safeClick('[data-craft-submit]', 'controlled-hybrid-craft', 'selector')
  fixture.immediate = await audit.cdp.eval('({notice:document.querySelector(".world-notices")?.innerText??null,dialog:document.querySelector("dialog[open]")?.innerText.slice(-700)??null})')
  await audit.escape(); await audit.openMenu(); await audit.safeClick('物品', 'controlled-hybrid-open-inventory', 'text')
  await audit.safeClick('獵獲裝備', 'controlled-hybrid-open-equipment', 'text')
  fixture.inventoryScreenshot = await audit.screenshot('controlled-hybrid-inventory-compare')
  fixture.gearComparison = await audit.cdp.eval('document.querySelector("[data-gear-comparison]")?.innerText??null')
  fixture.equip = await audit.safeClick('穿戴獵獲裝備', 'controlled-hybrid-equip', 'text')
  fixture.equipped = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.includes("卸下獵獲裝備")??false')
  fixture.equippedScreenshot = await audit.screenshot('controlled-hybrid-equipped')
  await audit.escape(); await audit.openPlace('5,4', '森林')
  fixture.returnToAdventure = { place: await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,650)??null'), screenshot: await audit.screenshot('controlled-hybrid-return-adventure') }
  fixture.status = 'observed'
  await audit.flush('controlled-hybrid-closeout', { recipe: manifest.selectedRecipe, craft: fixture.craft.detail, equipped: fixture.equipped, returnedToAdventure: !!fixture.returnToAdventure.place, label: fixture.label })
  return fixture
}

class Audit {
  constructor(dir, url) { this.dir = dir; this.url = url; this.trace = []; this.errors = []; this.clickCount = 0; this.refusals = 0 }
  async start() {
    this.profile = path.join(this.dir, 'chrome-profile'); await mkdir(this.profile, { recursive: false })
    this.chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${this.profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
    const portFile = path.join(this.profile, 'DevToolsActivePort')
    const port = await waitFor(async () => Number((await readFile(portFile, 'utf8')).split(/\r?\n/)[0]))
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
    this.browser = await new Cdp(version.webSocketDebuggerUrl).open()
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(this.url)}`, { method: 'PUT' })).json()
    this.cdp = await new Cdp(target.webSocketDebuggerUrl).open()
    for (const d of ['Page', 'Runtime', 'Log', 'Network']) await this.cdp.call(`${d}.enable`).catch(() => {})
    this.cdp.ws.addEventListener('message', e => {
      try { const p = JSON.parse(e.data); if (p.method === 'Runtime.exceptionThrown') this.errors.push({ type: 'page', text: p.params.exceptionDetails?.exception?.description ?? p.params.exceptionDetails?.text, at: iso() }); if (p.method === 'Log.entryAdded' && p.params.entry.level === 'error') this.errors.push({ type: 'console', text: p.params.entry.text, at: iso() }); if (p.method === 'Network.loadingFailed') this.errors.push({ type: 'request', text: p.params.errorText, at: iso() }) } catch {}
    })
    await this.cdp.call('Page.navigate', { url: this.url })
    await waitFor(() => this.cdp.eval('!!document.querySelector(".game-shell")'))
    this.browserVersion = await this.browser.call('Browser.getVersion')
    await this.flush('loaded', { viewport: await this.cdp.eval('({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})'), visible: await this.visible() })
  }
  async visible() { return this.cdp.eval(`(()=>[...document.querySelectorAll('header,main,footer,dialog[open]')].filter(x=>x.getClientRects().length).map(x=>x.innerText).join(' ').replace(/\\s+/g,' ').trim())()`) }
  async buttons() { return this.cdp.eval(`([...document.querySelectorAll('button')].filter(x=>x.getClientRects().length).map(x=>({text:x.innerText.trim().replace(/\\s+/g,' '),aria:x.getAttribute('aria-label'),disabled:x.disabled,selector:x.className})))`) }
  async dialogControls() { return this.cdp.eval(`(()=>{const d=document.querySelector('dialog[open]');return d?[...d.querySelectorAll('button')].filter(x=>x.getClientRects().length).map(x=>({text:x.innerText.trim().replace(/\\s+/g,' ').slice(0,90),disabled:x.disabled,aria:x.getAttribute('aria-label'),title:x.title})).slice(0,60):[]})()`) }
  async flush(action, detail) {
    const row = { at: iso(), action, detail, visible: (await this.visible()).slice(0, 1500), openDialog: await this.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1000) ?? null'), clickCount: this.clickCount }
    this.trace.push(row)
    if (this.actionPath) await appendFile(this.actionPath, `${JSON.stringify(row)}\n`)
    return row
  }
  async safeClick(query, label, mode = 'selector') {
    const q = JSON.stringify(query)
    const info = await this.cdp.eval(`(()=>{const q=${q};const root=document.querySelector('dialog[open]')||document;const all=[...root.querySelectorAll('button')].filter(e=>e.getClientRects().length&&!e.disabled);let e=${mode === 'selector' ? `root.querySelector(q)` : `all.find(e=>(e.innerText||e.getAttribute('aria-label')||'').trim()===q)||all.find(e=>(e.innerText||e.getAttribute('aria-label')||'').includes(q))`};if(!e||!e.getClientRects().length||e.disabled)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);const desc=n=>n?{tag:n.tagName,cls:typeof n.className==='string'?n.className:'',id:n.id,text:(n.innerText||n.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,100)}:null;return {x,y,target:desc(e),top:desc(top),topWithinTarget:!!top&&(top===e||e.contains(top)),rect:{x:r.x,y:r.y,width:r.width,height:r.height},scope:root.tagName==='DIALOG'?'topmost-dialog':'document'}})()`)
    if (!info) return this.flush(label, { ok: false, reason: 'locator-no-visible-enabled-button', requested: query })
    if (!info.topWithinTarget) { this.refusals++; return this.flush(label, { ok: false, classification: 'runner-locator-refused-obscured-target', requested: query, ...info, clickSent: false }) }
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: info.x, y: info.y })
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: info.x, y: info.y, button: 'left', clickCount: 1 })
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: info.x, y: info.y, button: 'left', clickCount: 1 })
    this.clickCount++; await delay(220)
    return this.flush(label, { ok: true, requested: query, ...info, clickSent: true })
  }
  async key(key, code = key, vk = key === 'Escape' ? 27 : key === 'Enter' ? 13 : key === ' ' ? 32 : 9) {
    await this.cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk }); await this.cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk }); await delay(180)
    return this.flush(`key:${key}`, { active: await this.activeFocus() })
  }
  async activeFocus() { return this.cdp.eval(`(()=>{const e=document.activeElement;return e?{tag:e.tagName,text:(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,120),aria:e.getAttribute('aria-label'),cls:typeof e.className==='string'?e.className:'',outline:getComputedStyle(e).outlineStyle,outlineWidth:getComputedStyle(e).outlineWidth,rect:(()=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()}:null})()`) }
  async screenshot(name) { const data = await this.cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); const file = `${name}.png`; await writeFile(path.join(this.dir, file), Buffer.from(data.data, 'base64'), { flag: 'wx' }); return { file, bytes: (await stat(path.join(this.dir, file))).size } }
  async escape() { if (await this.cdp.eval('!!document.querySelector("dialog[open]")')) await this.key('Escape') }
  async openMenu() { if (!(await this.cdp.eval('!!document.querySelector(".pixel-menu")'))) await this.safeClick('button.menu-trigger', 'open-menu') }
  async openPlace(position, label) {
    await this.escape()
    const nav = await this.safeClick(`button[data-position="${position}"]`, `map-to-${position}`)
    if (nav.detail?.ok) { await this.safeClick('button.context-action', 'context-interact'); await this.safeClick(label, `open-place:${label}`, 'text') }
  }
  async measureResponsive() {
    const out = []
    for (const width of widths) {
      for (const height of heights) {
        await this.cdp.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
        await delay(150)
        const measure = await this.cdp.eval(`(()=>{const d=document.documentElement,b=document.body,dlg=document.querySelector('dialog[open]'),els=[...document.querySelectorAll('header button,.context-prompt button,.direction-pad button,.player-hud button,.world-bottom button,.mobile-nav button,dialog[open] button')].filter(e=>e.getClientRects().length);const box=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)}};return {innerWidth,innerHeight,clientWidth:d.clientWidth,scrollWidth:d.scrollWidth,bodyScrollWidth:b.scrollWidth,horizontalOverflow:d.scrollWidth>d.clientWidth,dialog:dlg?{box:box(dlg),viewport:{w:innerWidth,h:innerHeight},outside:dlg.getBoundingClientRect().left<0||dlg.getBoundingClientRect().right>innerWidth||dlg.getBoundingClientRect().top<0||dlg.getBoundingClientRect().bottom>innerHeight,body:{scrollHeight:dlg.querySelector('.window-body')?.scrollHeight,clientHeight:dlg.querySelector('.window-body')?.clientHeight,scrollable:(dlg.querySelector('.window-body')?.scrollHeight||0)>(dlg.querySelector('.window-body')?.clientHeight||0)}}:null,smallTargets:els.filter(e=>{const r=e.getBoundingClientRect();return r.width<24||r.height<24}).map(e=>({text:e.innerText.trim().slice(0,70),box:box(e)})),clippedButtons:els.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)}).map(e=>({text:e.innerText.trim().slice(0,70),box:box(e)})),visibleButtons:els.length}})()`)
        const shot = await this.screenshot(`responsive-${width}${height === 1000 ? '' : `-h${height}`}-main`)
        out.push({ width, height, measure, shot })
      }
    }
    await this.cdp.call('Emulation.clearDeviceMetricsOverride')
    return out
  }
  async compactTrace() {
    const file = path.join(this.dir, 'actions.ndjson'); const bytes = await readFile(file)
    if (bytes.length > 256 * 1024) {
      const compressed = gzipSync(bytes, { level: 9 }); await writeFile(`${file}.gz`, compressed, { flag: 'wx' }); await rm(file)
      return { path: 'actions.ndjson.gz', originalBytes: bytes.length, compressedBytes: compressed.length, sha256Original: sha(bytes), sha256Gzip: sha(compressed) }
    }
    return { path: 'actions.ndjson', bytes: bytes.length, sha256: sha(bytes) }
  }
  async close() {
    this.cdp?.close(); this.browser?.close(); if (this.chrome && this.chrome.exitCode === null) this.chrome.kill()
    await delay(350)
    let profileBytes = 0
    if (existsSync(this.profile)) {
      async function sizeTree(d) { let n = 0; for (const e of await readdir(d, { withFileTypes: true })) { const f = path.join(d, e.name); n += e.isDirectory() ? await sizeTree(f) : (await stat(f)).size } return n }
      profileBytes = await sizeTree(this.profile)
      const root = path.resolve(this.dir), profile = path.resolve(this.profile)
      if (!profile.startsWith(`${root}${path.sep}`) || path.basename(profile) !== 'chrome-profile') throw new Error('Refusing profile cleanup outside this attempt')
      await rm(profile, { recursive: true, force: false })
    }
    return { chromeProfileBytesBeforeCleanup: profileBytes, chromeProfileRemoved: !existsSync(this.profile) }
  }
}

if (!existsSync(CHROME) || !existsSync(path.join(DIST, 'index.html'))) throw new Error('System Chrome or production dist is missing; do not substitute a dev server.')
await mkdir(OUT, { recursive: true }); await mkdir(attempt, { recursive: false })
const server = await staticServer(); const audit = new Audit(attempt, server.url)
const meta = { startedAt: iso(), head: await gitHead(), sourceFingerprint: await hashTree(path.join(ROOT, 'src')), distFingerprint: await hashTree(DIST), node: process.version, chromePath: CHROME, server: 'Node static server serving production dist', fixture: 'fresh-save visible UI lane plus separately labeled controlled crisis, craft-cap, and engine-death succession starting-save fixtures', attempt: path.relative(ROOT, attempt).replaceAll('\\', '/') }
await json(path.join(attempt, 'manifest.json'), meta)
audit.actionPath = path.join(attempt, 'actions.ndjson')
await writeFile(audit.actionPath, '', { flag: 'wx' })
let result = {}
try {
  await audit.start()
  // 起身 stays disabled until the Web Lock writer is acquired; clicking earlier is refused.
  await waitFor(() => audit.cdp.eval('!!document.querySelector(".life-opening button.primary:not(:disabled)")'))
  await audit.safeClick('起身', 'start-fresh-save', 'text'); await delay(650)
  await audit.safeClick('.speed-controls button:first-child', 'pause-world')
  const winShots = []
  let windowIndex = 0
  for (const label of ['物品', '角色', '世界歷史', '旅人筆記', '地方消息與委託']) {
    await audit.openMenu(); const opened = await audit.safeClick(label, `inspect-window:${label}`, 'text')
    const windowShot = await audit.screenshot(`window-${++windowIndex}-${safeName(label)}`)
    const content = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1400) ?? null')
    winShots.push({ label, opened: opened.detail, content, controls: await audit.dialogControls(), screenshot: windowShot }); await audit.escape()
  }
  await audit.openPlace('5,4', '森林')
  const forestControls = await audit.dialogControls(); const forestShot = await audit.screenshot('forest-before-actions')
  const gather = await audit.safeClick('伐木', 'life-gather-wood', 'text')
  const afterGather = await audit.cdp.eval(`({player:document.querySelector('.player-hud')?.innerText,notice:document.querySelector('.world-notices')?.innerText,dialog:document.querySelector('dialog[open]')?.innerText})`)
  await audit.escape(); await audit.openPlace('5,4', '森林')
  const gatherSecond = await audit.safeClick('伐木', 'life-gather-wood-second', 'text')
  await audit.escape(); await audit.openPlace('18,4', '礦場')
  const mineControls = await audit.dialogControls()
  const mineOne = await audit.safeClick('採石', 'life-gather-stone-1', 'text')
  const mineTwo = await audit.safeClick('採石', 'life-gather-stone-2', 'text')
  const afterMaterials = await audit.cdp.eval('({player:document.querySelector(".player-hud")?.innerText,dialog:document.querySelector("dialog[open]")?.innerText.slice(0,600)})')
  await audit.escape()
  const home = await audit.openPlace('10,8', '雜貨店')
  const homeContent = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1800) ?? null')
  const homeShot = await audit.screenshot('store-workbench')
  const recipeSearch = await audit.safeClick('#recipe-content-search', 'crafting-search-focus')
  if (recipeSearch.detail.ok) { await audit.cdp.call('Input.insertText', { text: '木石長矛' }); await delay(180); await audit.flush('type-recipe-search', { text: '木石長矛' }) }
  const selectedRecipe = await audit.safeClick('button[data-craft-recipe="starterSpear"]', 'select-starter-spear', 'selector')
  const craftControls = await audit.dialogControls(); const craftPlan = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(-1200) ?? null')
  const craft = await audit.safeClick('[data-craft-submit]', 'life-craft-attempt', 'selector')
  const craftAfter = await audit.cdp.eval(`({player:document.querySelector('.player-hud')?.innerText,notice:document.querySelector('.world-notices')?.innerText,dialog:document.querySelector('dialog[open]')?.innerText})`)
  await audit.escape()
  await audit.openMenu(); await audit.safeClick('物品', 'compare-and-use-inventory', 'text')
  const inventoryText = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,2400) ?? null')
  const inventoryShot = await audit.screenshot('inventory-after-craft')
  await audit.safeClick('獵獲裝備', 'inventory-crafted-gear-tab', 'text')
  const gearSearch = await audit.safeClick('#gear-content-search', 'inventory-gear-search-focus', 'selector')
  if (gearSearch.detail.ok) { await audit.cdp.call('Input.insertText', { text: '獵矛' }); await delay(120); await audit.flush('inventory-gear-search', { query: '獵矛', resultCount: await audit.cdp.eval('document.querySelector("[data-content-result-count=gear]")?.innerText??null') }) }
  const gearListSearch = { focus: gearSearch.detail, query: '獵矛', resultCount: await audit.cdp.eval('document.querySelector("[data-content-result-count=gear]")?.innerText??null'), matchingItems: await audit.cdp.eval('[...document.querySelectorAll("#gear-content-results [data-instance-id]")].filter(e=>e.getClientRects().length).length'), screenshot: await audit.screenshot('inventory-gear-search') }
  if (await audit.cdp.eval('!!document.querySelector("[data-content-search-clear]")')) await audit.safeClick('[data-content-search-clear]', 'inventory-gear-search-clear', 'selector')
  const craftedGearText = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1800) ?? null')
  const equip = await audit.safeClick('穿戴獵獲裝備', 'equip-crafted-gear', 'text')
  const equippedAfter = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.includes("卸下獵獲裝備") ?? false')
  await audit.escape()
  await audit.openMenu(); await audit.safeClick('角色', 'crafting-skill-feedback-character', 'text')
  const smithingFeedback = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1500) ?? null')
  const smithingFeedbackScreenshot = await audit.screenshot('smithing-feedback-after-craft')
  await audit.escape()
  const life = { windows: winShots, forestControls, forestShot, gather: gather.detail, gatherSecond: gatherSecond.detail, mineControls, mining: [mineOne.detail, mineTwo.detail], afterGather, afterMaterials, home: homeContent, homeShot, recipeSearch: recipeSearch.detail, selectedRecipe: selectedRecipe.detail, craftControls, craftPlan, craft: craft.detail, craftAfter, inventory: inventoryText, inventoryShot, gearListSearch, craftedGearText, equip: equip.detail, equippedAfter, smithingFeedback, smithingFeedbackScreenshot }

  const saveBefore = await audit.cdp.eval(`(()=>({hud:document.querySelector('.player-hud')?.innerText,clock:document.querySelector('.world-clock')?.innerText,place:document.querySelector('.world-caption')?.querySelector('span:first-child')?.innerText,playerTile:document.querySelector('.tile.is-player')?.dataset.position}))()`)
  const saveAction = await audit.safeClick('button.save-button', 'manual-save')
  await waitFor(() => audit.cdp.eval('document.querySelector(".world-notices")?.innerText.includes("世界已儲存")'))
  await audit.cdp.call('Page.reload', { ignoreCache: true })
  await waitFor(() => audit.cdp.eval('!!document.querySelector(".game-shell")'))
  await audit.safeClick('.speed-controls button:first-child', 'pause-after-reload')
  const saveAfter = await audit.cdp.eval(`(()=>({hud:document.querySelector('.player-hud')?.innerText,clock:document.querySelector('.world-clock')?.innerText,place:document.querySelector('.world-caption')?.querySelector('span:first-child')?.innerText,playerTile:document.querySelector('.tile.is-player')?.dataset.position}))()`)
  const saveReload = { saveAction: saveAction.detail, before: saveBefore, after: saveAfter, playerPositionAndHudEqual: saveBefore.hud === saveAfter.hud && saveBefore.place === saveAfter.place && saveBefore.playerTile === saveAfter.playerTile, clockBefore: saveBefore.clock, clockAfter: saveAfter.clock, note: 'world clock can advance by one simulated minute while the page reloads before the runner can pause; compare persistent player/location fields separately' }
  await audit.flush('save-reload-proof', saveReload)

  await audit.openPlace('5,4', '森林')
  const monsterSearch = await audit.safeClick('#monster-content-search', 'monster-list-search-focus', 'selector')
  if (monsterSearch.detail.ok) { await audit.cdp.call('Input.insertText', { text: '黏怪' }); await delay(120); await audit.flush('monster-list-search', { query: '黏怪', visibleCount: await audit.cdp.eval('document.querySelectorAll("#content-monster-results [data-content-monster]").length'), resultCount: await audit.cdp.eval('document.querySelector("[data-content-result-count=monster]")?.innerText??null') }) }
  const monsterListSearch = { focus: monsterSearch.detail, screenshot: await audit.screenshot('monster-list-search'), query: '黏怪', resultCount: await audit.cdp.eval('document.querySelector("[data-content-result-count=monster]")?.innerText??null'), visibleOptions: await audit.cdp.eval('[...document.querySelectorAll("#content-monster-results [data-content-monster]")].filter(e=>e.getClientRects().length).length') }
  if (await audit.cdp.eval('!!document.querySelector("[data-content-search-clear]")')) await audit.safeClick('[data-content-search-clear]', 'monster-list-search-clear', 'selector')
  const bossInfo = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,2600) ?? null')
  const adventureShot = await audit.screenshot('forest-adventure-boss-preparation')
  const encounter = await audit.safeClick('尋找怪物', 'adventure-start-encounter', 'text')
  const combatInitial = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1800) ?? null')
  const combatShot = await audit.screenshot('combat-entry')
  let attacks = 0
  while (attacks < 12 && await audit.cdp.eval('[...document.querySelectorAll("dialog[open] button")].some(b=>b.getClientRects().length&&!b.disabled&&(b.innerText||"").includes("攻擊"))')) {
    const action = await audit.safeClick('攻擊', `adventure-attack-${attacks + 1}`, 'text'); if (!action.detail.ok) break; attacks++
  }
  const combatAfter = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1800) ?? null')
  const combatOutcomeShot = await audit.screenshot('combat-outcome')
  await audit.escape()
  await audit.openMenu(); await audit.safeClick('物品', 'adventure-loot-compare', 'text')
  const postLootInventory = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,2200) ?? null')
  const postLootShot = await audit.screenshot('adventure-loot-comparison')
  const postLootMaterialsTab = await audit.safeClick('素材與收成', 'hybrid-inspect-adventure-material', 'text')
  const postLootMaterialText = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1800) ?? null')
  await audit.escape()
  await audit.openPlace('10,8', '雜貨店')
  const hybridSearch = await audit.safeClick('#recipe-content-search', 'hybrid-search-drop-recipe')
  if (hybridSearch.detail.ok) { await audit.cdp.call('Input.insertText', { text: '樹脂護衣' }); await delay(160); await audit.flush('hybrid-type-recipe-search', { text: '樹脂護衣' }) }
  const hybridRecipeId = await audit.cdp.eval(`(()=>{const b=[...document.querySelectorAll('dialog[open] button[data-craft-recipe]')].find(e=>e.getClientRects().length&&(e.innerText||'').includes('樹脂護衣'));return b?.getAttribute('data-craft-recipe')??null})()`)
  const hybridRecipe = hybridRecipeId ? await audit.safeClick(`button[data-craft-recipe="${hybridRecipeId}"]`, 'hybrid-select-recipe-from-drop', 'selector') : { detail: { ok: false, reason: 'no-recipe-matched-drop-search' } }
  const hybridCraftPlan = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(-1100) ?? null')
  const hybridCraft = await audit.safeClick('[data-craft-submit]', 'hybrid-craft-from-adventure-material', 'selector')
  const hybrid = { postLootMaterialsTab: postLootMaterialsTab.detail, postLootMaterialText, storeSearch: hybridSearch.detail, selectedRecipeId: hybridRecipeId, recipe: hybridRecipe.detail, craftPlan: hybridCraftPlan, craftAttempt: hybridCraft.detail }
  await audit.escape(); await audit.openPlace('5,4', '森林')
  const nextAdventureGoal = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1100) ?? null')
  const nextAdventureScreenshot = await audit.screenshot('adventure-next-goal-after-victory')
  const adventure = { monsterListSearch, bossInfo, screenshot: adventureShot, encounter: encounter.detail, combatInitial, combatScreenshot: combatShot, attacks, combatAfter, combatOutcomeScreenshot: combatOutcomeShot, postLootInventory, postLootScreenshot: postLootShot, hybrid, nextAdventureGoal, nextAdventureScreenshot }
  await audit.openMenu(); await audit.safeClick('地圖與世界', 'regional-crisis-map-information', 'text')
  const worldText = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1800) ?? null'); await audit.screenshot('world-info-window'); await audit.escape()
  await audit.openMenu(); await audit.safeClick('日誌', 'inspect-event-history', 'text')
  const historyText = await audit.cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,1800) ?? null'); await audit.screenshot('event-history-window'); await audit.escape()
  const world = { map: worldText, history: historyText, regionalCrisisNormalFlow: 'not naturally triggered in fresh-save audit window; no state fixture or injection used' }

  await audit.cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await audit.openMenu(); const dialogOpen = await audit.cdp.eval('!!document.querySelector("dialog[open]")')
  const focusOnOpen = await audit.activeFocus(); const topDialog = await audit.cdp.eval('(()=>{const d=document.querySelector("dialog[open]");return{tag:d?.tagName,modal:d?.matches(":modal")??false,bodyInert:document.querySelector(".game-shell")?.inert,topLayer:d?getComputedStyle(d).zIndex:null}})()')
  const tabFocus = []
  for (let i = 0; i < 10; i++) { await audit.key('Tab', 'Tab', 9); tabFocus.push(await audit.activeFocus()) }
  const keyboardScreenshot = await audit.screenshot('keyboard-tab-focus')
  const enter = await audit.key('Enter', 'Enter', 13); await audit.escape()
  const restoredFocus = await audit.activeFocus()
  await audit.key('Escape'); const escOpensMenu = await audit.cdp.eval('!!document.querySelector(".pixel-menu")')
  const space = await audit.safeClick('物品', 'open-inventory-for-space-test', 'text')
  const spaceFocusable = await audit.cdp.eval(`(()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(e=>e.getClientRects().length&&!e.disabled);if(!b)return null;b.focus();return{label:b.innerText.trim(),tag:b.tagName}})()`)
  const spaceResult = await audit.key(' ', 'Space', 32); await audit.escape()
  const keyboard = { dialogOpen, focusOnOpen, topDialog, tabFocus, screenshot: keyboardScreenshot, enter, restoredFocus, escOpensMenu, spaceOpen: space.detail, spaceFocusable, spaceResult, note: 'Space test explicitly focused first visible enabled button inside inventory dialog, then dispatched Space; see trace for active target.' }

  const responsive = await audit.measureResponsive()
  const requiredViewports = {}
  await audit.cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 768, deviceScaleFactor: 1, mobile: false })
  await audit.openMenu(); requiredViewports.desktopInventory = await audit.safeClick('物品', 'required-1280x768-open-inventory', 'text')
  requiredViewports.desktopScreenshot = await audit.screenshot('required-1280x768-inventory')
  requiredViewports.desktopDialog = await audit.cdp.eval('({open:!!document.querySelector("dialog[open]"),outside:(()=>{const r=document.querySelector("dialog[open]")?.getBoundingClientRect();return !!r&&(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)})()})')
  await audit.escape()
  await audit.cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 1, mobile: true })
  requiredViewports.mobileInventory = await audit.safeClick('.mobile-nav button:nth-child(3)', 'required-375x667-open-inventory', 'selector')
  requiredViewports.mobileScreenshot = await audit.screenshot('required-375x667-inventory')
  requiredViewports.mobileDialog = await audit.cdp.eval('({open:!!document.querySelector("dialog[open]"),outside:(()=>{const r=document.querySelector("dialog[open]")?.getBoundingClientRect();return !!r&&(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)})(),horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})')
  await audit.escape()
  await audit.cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true })
  await audit.openMenu(); await audit.safeClick('物品', 'responsive-inventory-window', 'text')
  const mobileWindow = { screenshot: await audit.screenshot('responsive-375-inventory'), measure: await audit.cdp.eval(`(()=>{const d=document.documentElement,w=document.querySelector('dialog[open]'),r=w?.getBoundingClientRect();return{innerWidth,scrollWidth:d.scrollWidth,horizontalOverflow:d.scrollWidth>d.clientWidth,dialog:r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,outside:r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight}:null,body:{scrollHeight:w?.querySelector('.window-body')?.scrollHeight,clientHeight:w?.querySelector('.window-body')?.clientHeight}}})()`) }
  await audit.escape()
  await audit.cdp.call('Emulation.setDeviceMetricsOverride', { width: 320, height: 667, deviceScaleFactor: 1, mobile: true })
  const mobileNavigation = await audit.safeClick('.mobile-nav button:nth-child(3)', 'required-320x667-mobile-nav-open-inventory', 'selector')
  const mobileNavigationScreenshot = await audit.screenshot('responsive-320x667-mobile-nav-open-inventory')
  await audit.escape(); await audit.cdp.call('Emulation.clearDeviceMetricsOverride')
  const menuAtEnd = await audit.cdp.eval('!!document.querySelector("dialog[open]")')
  const crisisFixture = await controlledCrisisAudit(audit, server.url, attempt)
  const craftingCapFixture = await controlledCraftCapAudit(audit, server.url, attempt)
  const successionFixture = await controlledSuccessionAudit(audit, server.url, attempt)
  const hybridFixture = await controlledHybridAudit(audit, server.url, attempt)
  result = { life, adventure, world, keyboard, responsive, requiredViewports, mobileWindow, mobileNavigation: { action: mobileNavigation.detail, screenshot: mobileNavigationScreenshot }, saveReload, crisisFixture, craftingCapFixture, successionFixture, hybridFixture, succession: 'not reachable in fresh save within bounded normal-flow audit; separately inspected through controlled engine-death fixture', craftingPracticeCap: 'not reached in fresh-save audit; separately inspected through controlled engine-generated starterSpear-to-cap checkpoint. See craftingCapFixture.', final: { openDialog: await audit.cdp.eval('!!document.querySelector("dialog[open]")'), visible: (await audit.visible()).slice(0, 1600), clickCount: audit.clickCount, refusedObscuredClicks: audit.refusals } }
  await json(path.join(attempt, 'results.json'), result)
} catch (error) {
  await json(path.join(attempt, 'failure.json'), { at: iso(), error: String(error), stack: error.stack, traceCount: audit.trace.length, note: 'Attempt retained; no attempt directory cleanup is performed.' }).catch(() => {})
  throw error
} finally {
  const profile = await audit.close().catch(error => ({ cleanupError: String(error) }))
  await json(path.join(attempt, 'runtime-closeout.json'), profile).catch(() => {})
  server.server.close()
}
const traceManifest = await audit.compactTrace()
await json(path.join(attempt, 'closeout.json'), { finishedAt: iso(), meta, browserVersion: audit.browserVersion, actionCount: audit.trace.length, errors: audit.errors, traceManifest, outcome: { refusedObscuredClicks: audit.refusals, clicks: audit.clickCount, screenshotCount: (await readdir(attempt)).filter(x => x.endsWith('.png')).length }, runtime: await readFile(path.join(attempt, 'runtime-closeout.json'), 'utf8').then(JSON.parse) })
console.log(JSON.stringify({ attempt: path.relative(ROOT, attempt).replaceAll('\\', '/'), actionCount: audit.trace.length, clicks: audit.clickCount, refusedObscuredClicks: audit.refusals, screenshots: (await readdir(attempt)).filter(x => x.endsWith('.png')).length, errors: audit.errors.length }))

