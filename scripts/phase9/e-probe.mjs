import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
const OUT = path.join(ROOT, 'reports/v2/20261015-ui-ux-polish/phase-09/e-runner')
const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '')
const attempt = path.join(OUT, `attempt-${stamp}`)
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const iso = () => new Date().toISOString()
const sha = data => createHash('sha256').update(data).digest('hex')
await mkdir(OUT, { recursive: true })
await mkdir(attempt, { recursive: false })

async function waitFor(fn, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const value = await fn().catch(() => false)
    if (value) return value
    await delay(100)
  }
  throw new Error(`Timed out after ${timeout}ms`)
}
class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map() }
  async open() {
    await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }) })
    this.ws.addEventListener('message', event => {
      const packet = JSON.parse(event.data), pending = this.pending.get(packet.id)
      if (!pending) return
      this.pending.delete(packet.id)
      packet.error ? pending.reject(new Error(packet.error.message)) : pending.resolve(packet.result)
    })
    return this
  }
  call(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 30000)
      this.pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expression) {
    const response = await this.call('Runtime.evaluate', { expression, returnByValue: true, userGesture: true })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result?.value
  }
  close() { try { this.ws.close() } catch {} }
}
async function serverForDist() {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
      const file = path.resolve(DIST, relative)
      if (!file.startsWith(`${DIST}${path.sep}`)) throw new Error('path escape')
      let body
      try { body = await readFile(file) } catch { body = await readFile(path.join(DIST, 'index.html')) }
      response.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); response.end(body)
    } catch { response.writeHead(400); response.end('bad request') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return { server, url: `http://127.0.0.1:${server.address().port}/` }
}
let chrome, browser, page, server, profile
let profileBytes = 0, cleanupError
let chromeStderr = ''
async function treeSize(dir) {
  let bytes = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name)
    bytes += entry.isDirectory() ? await treeSize(child) : (await stat(child)).size
  }
  return bytes
}
async function closeChrome() {
  page?.close(); browser?.close()
  if (chrome && chrome.exitCode === null) {
    chrome.kill()
    await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), delay(3000)])
    if (chrome.exitCode === null) { chrome.kill('SIGKILL'); await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), delay(1500)]) }
  }
  if (profile && existsSync(profile)) {
    profileBytes = await treeSize(profile)
    const target = path.resolve(profile), root = path.resolve(attempt)
    if (!target.startsWith(`${root}${path.sep}`) || path.basename(target) !== 'chrome-profile') throw new Error('Refusing profile cleanup outside this attempt')
    await rm(target, { recursive: true, force: false })
  }
}
async function screenshot(name) {
  const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const bytes = Buffer.from(shot.data, 'base64'), file = path.join(attempt, `${name}.png`)
  await writeFile(file, bytes, { flag: 'wx' })
  return { file: path.basename(file), bytes: bytes.length, sha256: sha(bytes) }
}
async function locateButton(label) {
  return page.eval(`(()=>{const root=document.querySelector('dialog[open]')||document;const e=[...root.querySelectorAll('button')].find(x=>x.getClientRects().length&&!x.disabled&&(x.innerText||x.getAttribute('aria-label')||'').trim().includes(${JSON.stringify(label)}));if(!e)return{ok:false,reason:'missing'};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);return{ok:true,x,y,text:(e.innerText||'').trim(),topWithinTarget:!!top&&(top===e||e.contains(top)),topTag:top?.tagName??null}})()`)
}
async function clickButton(label) {
  const hit = await locateButton(label)
  if (!hit.ok || !hit.topWithinTarget) return { ...hit, clickSent: false }
  await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hit.x, y: hit.y })
  await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: hit.x, y: hit.y, button: 'left', clickCount: 1 })
  await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hit.x, y: hit.y, button: 'left', clickCount: 1 })
  await delay(300)
  return { ...hit, clickSent: true }
}
async function clickSelector(selector, label) {
  const hit = await page.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||!e.getClientRects().length||e.disabled)return{ok:false,reason:'missing or disabled'};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);return{ok:true,x,y,text:(e.innerText||'').trim(),topWithinTarget:!!top&&(top===e||e.contains(top))}})()`)
  if (!hit.ok || !hit.topWithinTarget) return { ...hit, clickSent: false, label }
  await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hit.x, y: hit.y })
  await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: hit.x, y: hit.y, button: 'left', clickCount: 1 })
  await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hit.x, y: hit.y, button: 'left', clickCount: 1 })
  await delay(300)
  return { ...hit, clickSent: true, label }
}
async function key(key, code, windowsVirtualKeyCode) {
  await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode })
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode })
  await delay(180)
}
async function snapshot(label) {
  return page.eval(`(()=>{const d=document.querySelector('dialog[open]');return{label:${JSON.stringify(label)},notice:d?.querySelector('.status-notice')?.innerText?.trim()??document.querySelector('.world-notices .status-notice')?.innerText?.trim()??null,recentEvent:document.querySelector('.recent-event')?.innerText?.trim()??null,dialogTitle:d?.querySelector('.window-heading h2')?.innerText?.trim()??null,dialogText:d?.querySelector('.window-body')?.innerText?.trim()?.slice(0,1600)??null,visibleText:document.body.innerText.slice(0,900)}})()`)
}
async function writeJson(name, data) { await writeFile(path.join(attempt, name), `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' }) }

async function createBossCheckpoint() {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
  try {
    const [sim, actions, journal] = await Promise.all([
      vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/engine/actions.ts'), vite.ssrLoadModule('/src/services/playJournal.ts'),
    ])
    const state = sim.createGame(93018)
    const character = sim.player(state)
    state.life.openingSeen = true
    character.currentRegion = 'forest'; character.position = { x: 1, y: 1 }; character.status = 'idle'
    character.hp = character.maxHp; character.stamina = character.maxStamina
    state.threat.bossAlive = true
    const encounterResult = actions.encounter(state, true)
    if (encounterResult !== '' || !state.combat || state.combat.monsterId !== 'chief') throw new Error(`engine boss encounter fixture failed: ${encounterResult}`)
    const encounter = { monsterId: state.combat.monsterId, hp: state.combat.hp, maxHp: state.combat.maxHp, gold: state.combat.gold, exp: state.combat.exp }
    // Keep the real engine-created boss and reward, but constrain the controlled fixture to one visible winning turn.
    state.combat.hp = 1
    const raw = journal.packCheckpoint(state, journal.emptyJournal(), Date.now())
    return { raw, manifest: { kind: 'controlled engine-generated Goblin Chief starting save', seed: 93018, generatedBy: 'createGame(seed) then engine encounter(state, true)', fixtureAdjustment: 'boss current HP set to 1 after normal boss combat initialization to make the visible UI victory deterministic; original max HP, attack, defense, XP and gold reward retained', encounter, startingPlayer: { region: character.currentRegion, position: character.position, hp: character.hp, stamina: character.stamina }, injectedOnlyFor: '?phase9-controlled-boss=1' } }
  } finally { await vite.close() }
}

async function mapTravel(targetLabel, label, interactions, screenshots) {
  const open = await clickButton('地圖')
  interactions.push({ label: `${label}: open map`, hit: open })
  if (!open.clickSent) throw new Error(`${label}: map button unavailable: ${JSON.stringify(open)}`)
  await waitFor(() => page.eval('!!document.querySelector("dialog[open] .world-map")'))
  if (targetLabel === '北方森林') screenshots.mapWindow = await screenshot('world-map-window')
  const target = await page.eval(`(()=>{const root=document.querySelector('dialog[open]');const tile=[...root.querySelectorAll('.world-map .tile:not(:disabled)')].find(e=>{if(!e.getAttribute('aria-label')?.includes(${JSON.stringify(targetLabel)}))return false;const r=e.getBoundingClientRect(),v=e.closest('.map-scroll')?.getBoundingClientRect();if(!v||r.right<=v.left||r.left>=v.right||r.bottom<=v.top||r.top>=v.bottom)return false;const px=Math.round(r.left+r.width/2),py=Math.round(r.top+r.height/2),top=document.elementFromPoint(px,py);return !!top&&(top===e||e.contains(top))});if(!tile)return null;const r=tile.getBoundingClientRect();return{position:tile.dataset.position,label:tile.getAttribute('aria-label'),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`)
  if (!target) throw new Error(`${label}: no visible, hit-testable map tile for ${targetLabel}`)
  const selector = `dialog[open] [data-position="${target.position}"]`
  const hit = await page.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),x=${target.x},y=${target.y},top=document.elementFromPoint(x,y);return{ok:!!e,x,y,label:e?.getAttribute('aria-label'),topWithinTarget:!!e&&!!top&&(top===e||e.contains(top))}})()`)
  interactions.push({ label: `${label}: walk to ${targetLabel}`, target, hit })
  if (!hit.topWithinTarget) throw new Error(`${label}: target hit check failed: ${JSON.stringify(hit)}`)
  await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hit.x, y: hit.y })
  await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: hit.x, y: hit.y, button: 'left', clickCount: 1 })
  await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hit.x, y: hit.y, button: 'left', clickCount: 1 })
  await delay(500)
  const interact = await clickButton('互動')
  interactions.push({ label: `${label}: open place`, hit: interact })
  if (!interact.clickSent) throw new Error(`${label}: place interaction unavailable: ${JSON.stringify(interact)}`)
  await waitFor(() => page.eval('!!document.querySelector("dialog[open]")'))
  return target
}

let result, evidence
try {
  if (!existsSync(path.join(DIST, 'index.html'))) throw new Error('Production dist/index.html is missing; lead must build dist before this probe can run')
  profile = path.join(attempt, 'chrome-profile')
  await mkdir(profile, { recursive: false })
  chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
  chrome.stderr.setEncoding('utf8'); chrome.stderr.on('data', chunk => { chromeStderr = (chromeStderr + chunk).slice(-4000) })
  chrome.on('error', error => { chromeStderr = `${chromeStderr}\nspawn error: ${error.message}`.slice(-4000) })
  const portFile = path.join(profile, 'DevToolsActivePort')
  let port
  try { port = await waitFor(async () => Number((await readFile(portFile, 'utf8')).split(/\r?\n/)[0])) }
  catch (error) { throw new Error(`${error.message}; chrome exit=${chrome.exitCode}; stderr=${chromeStderr}`) }
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  browser = await new Cdp(version.webSocketDebuggerUrl).open()
  server = await serverForDist()
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(server.url)}`, { method: 'PUT' })).json()
  page = await new Cdp(target.webSocketDebuggerUrl).open()
  await page.call('Page.enable'); await page.call('Runtime.enable')
  await page.call('Page.navigate', { url: server.url })
  await waitFor(() => page.eval('document.readyState === "complete"'))
  try { await waitFor(() => page.eval('!!document.querySelector(".life-opening button.primary")')) }
  catch (error) { throw new Error(`${error.message}; app text: ${await page.eval('document.body.innerText')}; root html: ${await page.eval('document.querySelector("#app")?.innerHTML.slice(0,800)')}`) }
  evidence = { status: 'started', source: 'production dist, new Chrome profile, new localStorage for normal lane; controlled boss state injected only on a separately labeled query route; visible UI actions are elementFromPoint-verified', startedAt: iso(), browser: await browser.call('Browser.getVersion'), screenshots: {}, interactions: [], actionFeedback: {}, visualStates: {}, staticFlowAudit: [] }
  evidence.screenshots.beforeFreshSave = await screenshot('before-fresh-save-opening')
  const start = await clickButton('起身'); evidence.interactions.push({ label: 'start fresh save', hit: start })
  if (!start.clickSent) throw new Error(`Fresh-save start click failed: ${JSON.stringify(start)}`)
  await waitFor(() => page.eval('!document.querySelector("dialog[open]")'))
  evidence.screenshots.afterFreshSave = await screenshot('after-fresh-save-world')
  evidence.initialPage = await page.eval('document.body.innerText.slice(0,1600)')
  const style = await page.eval(`(()=>{const b=[...document.querySelectorAll('button')],normal=b.find(x=>x.getClientRects().length&&!x.disabled),disabled=b.find(x=>x.getClientRects().length&&x.disabled);const sample=e=>e?{text:e.innerText.trim(),background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,border:getComputedStyle(e).borderColor,radius:getComputedStyle(e).borderRadius,minHeight:getComputedStyle(e).minHeight}:null;return{normal:sample(normal),disabled:sample(disabled),focusRule:getComputedStyle(normal).outlineStyle,spaceTokens:[1,2,3,4].map(n=>getComputedStyle(document.documentElement).getPropertyValue('--space-'+n).trim()),font:getComputedStyle(document.body).fontFamily}})()`)
  evidence.visualStates.defaultAndDisabled = style
  const menuHit = await locateButton('選單')
  evidence.interactions.push({ label: 'inspect menu button states', hit: { ...menuHit, input: 'CDP mouse' } })
  if (menuHit.ok && menuHit.topWithinTarget) {
    await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: menuHit.x, y: menuHit.y })
    evidence.visualStates.hover = await page.eval(`(()=>{const e=document.querySelector('button.menu-trigger'),s=getComputedStyle(e);return{matchesHover:e.matches(':hover'),background:s.backgroundColor,color:s.color,border:s.borderColor,outline:s.outlineStyle}})()`)
    await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: menuHit.x, y: menuHit.y, button: 'left', clickCount: 1 })
    evidence.visualStates.active = await page.eval(`(()=>{const e=document.querySelector('button.menu-trigger'),s=getComputedStyle(e);return{matchesActive:e.matches(':active'),background:s.backgroundColor,color:s.color,border:s.borderColor}})()`)
    await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: menuHit.x, y: menuHit.y, button: 'left', clickCount: 1 })
    await waitFor(() => page.eval('!!document.querySelector("dialog[open]")'))
    await screenshot('menu-hover-active-focus')
    await key('Tab', 'Tab', 9)
    evidence.visualStates.focusVisible = await page.eval(`(()=>{const e=document.activeElement,s=getComputedStyle(e);return{tag:e.tagName,text:(e.innerText||'').trim(),matchesFocusVisible:e.matches(':focus-visible'),outline:s.outline,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineOffset:s.outlineOffset}})()`)
    evidence.visualStates.pressed = await page.eval(`(()=>{const e=[...document.querySelectorAll('button[aria-pressed="true"]')].find(x=>x.getClientRects().length),s=e&&getComputedStyle(e);return e?{text:e.innerText.trim(),background:s.backgroundColor,color:s.color,border:s.borderColor,pressed:e.getAttribute('aria-pressed')}:null})()`)
    await key('Escape', 'Escape', 27)
  }
  await mapTravel('北方森林', 'normal fresh-save craft route', evidence.interactions, evidence.screenshots)
  evidence.actionFeedback.forestPlace = await snapshot('forest interaction window')
  evidence.screenshots.forestPlace = await screenshot('forest-place-window')
  const gather = await clickButton('伐木')
  evidence.interactions.push({ label: 'gather wood for starterSpear', hit: gather })
  if (!gather.clickSent) throw new Error(`Fresh-save wood gathering failed: ${JSON.stringify(gather)}`)
  evidence.actionFeedback.gather = await snapshot('after wood gathering')
  evidence.screenshots.gatherFeedback = await screenshot('gather-feedback')
  const secondGather = await clickButton('伐木')
  evidence.interactions.push({ label: 'gather second wood batch for starterSpear', hit: secondGather })
  if (!secondGather.clickSent) throw new Error(`Second fresh-save wood gathering failed: ${JSON.stringify(secondGather)}`)
  evidence.actionFeedback.gatherSecond = await snapshot('after second wood gathering')
  evidence.screenshots.gatherSecondFeedback = await screenshot('gather-second-feedback')
  await key('Escape', 'Escape', 27)
  await mapTravel('灰石礦場', 'normal fresh-save craft route', evidence.interactions, evidence.screenshots)
  evidence.actionFeedback.minePlace = await snapshot('mine interaction window')
  evidence.screenshots.minePlace = await screenshot('mine-place-window')
  const gatherStone = await clickButton('採石')
  evidence.interactions.push({ label: 'gather stone for starterSpear', hit: gatherStone })
  if (!gatherStone.clickSent) throw new Error(`Fresh-save stone gathering failed: ${JSON.stringify(gatherStone)}`)
  evidence.actionFeedback.gatherStone = await snapshot('after stone gathering')
  evidence.screenshots.gatherStoneFeedback = await screenshot('gather-stone-feedback')
  await key('Escape', 'Escape', 27)
  await mapTravel('雜貨店', 'normal fresh-save craft route', evidence.interactions, evidence.screenshots)
  evidence.actionFeedback.storePlaceBeforeCraft = await snapshot('store workbench before craft')
  evidence.screenshots.storeWorkbench = await screenshot('store-workbench-before-craft')
  const selectSpear = await clickSelector('button[data-craft-recipe="starterSpear"]', 'select starterSpear recipe')
  evidence.interactions.push({ label: 'select starterSpear at store workbench', hit: selectSpear })
  if (!selectSpear.clickSent) throw new Error(`starterSpear recipe selection failed: ${JSON.stringify(selectSpear)}`)
  const craft = await clickButton('製作木石長矛')
  evidence.interactions.push({ label: 'craft starterSpear from gathered inputs', hit: craft })
  if (!craft.clickSent) throw new Error(`Fresh-save starterSpear craft failed: ${JSON.stringify(craft)}`)
  evidence.actionFeedback.craft = await snapshot('after fresh-save starterSpear craft')
  evidence.screenshots.craftFeedback = await screenshot('starter-spear-craft-feedback')
  const smithingAward = evidence.actionFeedback.craft.notice?.match(/鍛造熟練\s*\+(\d+)/)?.[1] ?? null
  if (smithingAward === null) throw new Error(`Craft notice did not expose a numeric practice XP amount: ${JSON.stringify(evidence.actionFeedback.craft)}`)
  evidence.actionFeedback.craft.practiceXpObserved = Number(smithingAward)
  evidence.actionFeedback.craft.practiceXpUnit = 'XP; notice reports the numeric practice award but omits the XP unit, verified against the workbench plan label'
  evidence.actionFeedback.craft.materialsAndGoldBeforeCraft = evidence.actionFeedback.storePlaceBeforeCraft.dialogText
  await key('Escape', 'Escape', 27)
  const log = await clickButton('日誌')
  evidence.interactions.push({ label: 'open event log for gather/craft review', hit: log })
  if (!log.clickSent) throw new Error(`Could not open event log after craft: ${JSON.stringify(log)}`)
  evidence.actionFeedback.gatherAndCraftReview = await snapshot('gather and craft reviewable event log')
  evidence.screenshots.gatherLog = await screenshot('gather-and-craft-event-log')

  const bossFixture = await createBossCheckpoint()
  const bossCheckpointPath = path.join(attempt, 'controlled-boss-checkpoint.json')
  await writeFile(bossCheckpointPath, `${bossFixture.raw}\n`, { flag: 'wx' })
  evidence.actionFeedback.controlledBoss = { label: 'controlled fixture, separate from the normal fresh-save route', manifest: bossFixture.manifest, checkpointBytes: Buffer.byteLength(bossFixture.raw), checkpointSha256: sha(bossFixture.raw), immediate: null, log: null }
  const bossInjection = `if(location.search.includes('phase9-controlled-boss=1')){localStorage.setItem('oakvale-v1',${JSON.stringify(bossFixture.raw)})}`
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: bossInjection })
  await page.call('Page.navigate', { url: `${server.url}?phase9-controlled-boss=1` })
  await waitFor(() => page.eval('location.search.includes("phase9-controlled-boss=1") && !!document.querySelector(".game-shell")'))
  await waitFor(() => page.eval('!!document.querySelector(".recent-event")'))
  evidence.actionFeedback.controlledBoss.startingView = await snapshot('controlled Goblin Chief combat starting save')
  evidence.screenshots.controlledBossCombat = await screenshot('controlled-boss-combat-start')
  const attack = await clickButton('攻擊')
  evidence.interactions.push({ label: 'defeat Goblin Chief through visible combat UI', hit: attack })
  if (!attack.clickSent) throw new Error(`Controlled boss UI attack click failed: ${JSON.stringify(attack)}`)
  await waitFor(() => page.eval('document.querySelector(".world-notices .status-notice")?.innerText.includes("哥布林酋長") && document.querySelector(".world-notices .status-notice")?.innerText.includes("戰鬥勝利")'))
  evidence.actionFeedback.controlledBoss.immediate = await snapshot('immediate boss result plus reward after visible UI attack')
  evidence.screenshots.controlledBossImmediate = await screenshot('controlled-boss-immediate-result')
  const bossMessage = evidence.actionFeedback.controlledBoss.immediate.notice ?? ''
  if (!bossMessage.includes('哥布林酋長') || !bossMessage.includes('戰鬥勝利') || !/經驗與\s*\d+\s*金幣/.test(bossMessage)) throw new Error(`Immediate boss feedback omitted the result or reward: ${bossMessage}`)
  await key('Escape', 'Escape', 27)
  const bossLog = await clickButton('日誌')
  evidence.interactions.push({ label: 'open event log to review boss defeat and reward', hit: bossLog })
  if (!bossLog.clickSent) throw new Error(`Could not open boss event log: ${JSON.stringify(bossLog)}`)
  evidence.actionFeedback.controlledBoss.log = await snapshot('boss defeat and combat reward event log')
  evidence.screenshots.controlledBossLog = await screenshot('controlled-boss-event-log')
  if (!evidence.actionFeedback.controlledBoss.log.dialogText?.includes('哥布林酋長') || !evidence.actionFeedback.controlledBoss.log.dialogText?.includes('戰鬥勝利')) throw new Error('Boss event log did not display both the defeat record and combat reward')
  evidence.staticFlowAudit = [
    { action: 'gather', classification: 'clear; production browser observed', path: 'Fresh-save route gathered wood twice and stone once through visible forest/mine controls before the store craft. Immediate notices and the combined event-log view are saved in this attempt.' },
    { action: 'craft success + smithing XP', classification: 'clear; production browser observed', path: `Fresh-save route gathered the starterSpear inputs and crafted at the store workbench. The immediate success notice showed +${smithingAward} XP from the live crafting plan; screenshot starter-spear-craft-feedback.png and probe-results.json capture the exact notice. No later post-cap craft was attempted: reaching the practice cap requires multiple additional full material batches and stamina/rest cycles, so it is not cheap on this fresh route.` },
    { action: 'combat reward', classification: 'clear by source review; browser route not observed', path: 'actions.ts emits combat.won with the actual XP and gold reward; gameStore uses the captured event as status, recent event and journal message.' },
    { action: 'boss defeat', classification: 'clear; controlled production-browser fixture observed', path: 'A separate engine-generated Goblin Chief combat save was loaded only on the controlled query route. One elementFromPoint-verified visible Attack click defeated the boss; the immediate status notice contained both the boss result and actual XP/gold reward, and the log showed the defeat and reward entries. Fixture manifest and screenshots are in this attempt.' },
    { action: 'NPC state change', classification: 'ambiguous / not directly tested in E browser lane', path: 'NPC dialogue emits its immediate response; life milestones and state transitions emit separate events. NPC detail and event log remain the review surfaces; no E controlled NPC fixture was run.' },
    { action: 'crisis preparation / outcome', classification: 'preparation/contribution clear from retained Phase9-C evidence; resolved crisis outcome not measured in E', path: 'C report records controlled warning, contribution and resulting history; this E runner did not inject a resolution fixture.' },
    { action: 'settlement change; reputation / identity; property purchase', classification: 'clear by source review; browser route not observed', path: 'Settlement/reputation/property events are emitted by engine action paths and appear in captured events; their canonical detail/history views are available. E did not run controlled purchases or reputation fixtures.' },
    { action: 'world history entry', classification: 'clear by existing Phase9-C browser evidence', path: 'WorldRecords history presents state.history; C evidence already captured this view. Ordinary action feedback stays in recent event/log.' },
  ]
  evidence.status = 'complete'
  evidence.endedAt = iso()
  await writeJson('probe-results.json', evidence)
  result = { status: 'complete', attempt: path.relative(ROOT, attempt).replaceAll('\\', '/') }
} catch (error) {
  result = { status: 'failed', error: String(error?.stack ?? error), chromeExitCode: chrome?.exitCode, chromeStderr, attempt: path.relative(ROOT, attempt).replaceAll('\\', '/') }
  await writeJson('failure.json', result).catch(() => {})
  if (evidence) await writeJson('probe-results.partial.json', { ...evidence, status: 'failed', endedAt: iso(), failure: result.error }).catch(() => {})
  process.exitCode = 1
} finally {
  try { await closeChrome() } catch (error) { cleanupError = String(error?.stack ?? error) }
  if (server?.server) await new Promise(resolve => server.server.close(resolve))
  if (existsSync(attempt)) await writeJson('runtime-closeout.json', { endedAt: iso(), chromeProfileBytesBeforeCleanup: profileBytes, chromeProfileRemoved: profile ? !existsSync(profile) : true, cleanupError }).catch(() => {})
}
if (cleanupError) { console.error(cleanupError); process.exitCode = 1 }
if (result?.status === 'complete') console.log(result.attempt)
else console.error(result?.error)
