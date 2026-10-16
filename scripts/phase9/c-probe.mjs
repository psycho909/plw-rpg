import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = process.cwd()
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const DIST = path.join(ROOT, 'dist')
const BASE = path.join(ROOT, 'reports/v2/20261015-ui-ux-polish/phase-09/c-runner')
const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace('.', '')
const DIR = path.join(BASE, `attempt-${stamp}`)
const iso = () => new Date().toISOString()
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const waitFor = async (fn, ms = 30000) => {
  const until = Date.now() + ms
  while (Date.now() < until) { const value = await fn().catch(() => false); if (value) return value; await delay(120) }
  throw new Error('Timed out waiting for browser state')
}
class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.next = 0; this.pending = new Map() }
  async open() {
    await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }) })
    this.ws.addEventListener('message', event => { const packet = JSON.parse(event.data); const pending = this.pending.get(packet.id); if (!pending) return; this.pending.delete(packet.id); packet.error ? pending.reject(Error(packet.error.message)) : pending.resolve(packet.result) })
    return this
  }
  call(method, params = {}) { const id = ++this.next; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`CDP timeout: ${method}`)) }, 20000); this.pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expression) { const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, userGesture: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result?.value }
  close() { this.ws.close() }
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
const server = createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html'
    const file = path.resolve(DIST, relative)
    if (!file.startsWith(`${DIST}${path.sep}`)) throw Error('path escape')
    let body
    try { body = await readFile(file) } catch { body = await readFile(path.join(DIST, 'index.html')) }
    response.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); response.end(body)
  } catch { response.writeHead(400); response.end('bad request') }
})

await mkdir(BASE, { recursive: true }); await mkdir(DIR, { recursive: false })
assert(existsSync(CHROME) && existsSync(path.join(DIST, 'index.html')), 'System Chrome and built production dist are required')
const bundles = (await readdir(path.join(DIST, 'assets'))).filter(name => name.endsWith('.js')).map(name => path.join('assets', name))
const bundleText = (await Promise.all(bundles.map(name => readFile(path.join(DIST, name), 'utf8')))).join('\n')
assert(bundleText.includes('區域登錄素材') && bundleText.includes('data-material-origin'), 'Rebuild production dist after Phase9-C source changes before running this probe')

const { createServer: createViteServer } = await import('vite')
const vite = await createViteServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
let rawSave, fixtureManifest
try {
  const [simulation, journal, saveService, rewards] = await Promise.all([
    vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/services/playJournal.ts'),
    vite.ssrLoadModule('/src/services/saveService.ts'), vite.ssrLoadModule('/src/data/rewards.ts'),
  ])
  const state = simulation.createGame(92341)
  const character = simulation.player(state)
  state.life.openingSeen = true
  character.position = { x: 10, y: 8 }; character.currentRegion = 'village'; character.status = 'idle'
  character.inventory.wood = 3; character.inventory.stone = 2; character.inventory.material = 1
  character.gold = 1000; character.stamina = character.maxStamina
  state.regions.forest.discovered = true; state.regions.farmland.discovered = true
  state.reward.collection.seen = [...new Set([...state.reward.collection.seen, 'grayWolf', 'slime_slick'])]
  state.reward.collection.materials = [...new Set([...state.reward.collection.materials, 'wolfFang', 'slime_resin', 'spring_pea_good'])]
  state.reward.materials[character.id] = Object.fromEntries(Object.keys(rewards.MATERIALS).map(id => [id,
    ['wolfFang', 'slime_resin', 'spring_pea_good'].includes(id) ? 1 : 0]))
  rawSave = journal.packCheckpoint(state, journal.emptyJournal(), Date.now())
  saveService.deserialize(rawSave)
  fixtureManifest = { kind: 'controlled Phase9-C display fixture, separate from fresh-save route', seed: 92341, generatedBy: 'createGame + explicit inventory, discovery, and store-position setup', position: character.position, discoveredRegions: ['forest', 'farmland'], seenSources: ['grayWolf', 'slime_slick'], materials: { wolfFang: 1, slime_resin: 1, spring_pea_good: 1 }, genericMonsterDrops: { material: 1 } }
} finally { await vite.close() }

await mkdir(path.join(DIR, 'chrome-profile'))
await writeFile(path.join(DIR, 'controlled-save.json'), `${rawSave}\n`, { flag: 'wx' })
await writeFile(path.join(DIR, 'fixture-manifest.json'), `${JSON.stringify(fixtureManifest, null, 2)}\n`, { flag: 'wx' })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${server.address().port}/?phase9-controlled-c=1`
const profile = path.join(DIR, 'chrome-profile')
let chrome, cdp, stderr = ''
const result = { startedAt: iso(), attempt: path.relative(ROOT, DIR).replaceAll('\\', '/'), lane: 'controlled starting save; UI actions only; rebuilt production dist', fixture: fixtureManifest, evidence: {}, errors: [] }
const record = async (event, data) => writeFile(path.join(DIR, `${event}.json`), `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' })
const screenshot = async name => { const shot = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); const file = `${name}.png`; await writeFile(path.join(DIR, file), Buffer.from(shot.data, 'base64'), { flag: 'wx' }); return { file, bytes: (await stat(path.join(DIR, file))).size } }
async function click(selector, label) {
  const info = await waitFor(() => cdp.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||!e.getClientRects().length||e.disabled)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);return{x,y,text:(e.innerText||'').trim().slice(0,100),topTag:top?.tagName,verified:!!top&&(top===e||e.contains(top))}})()`), 7000)
  assert(info?.verified, `${label}: click target not verified via elementFromPoint: ${JSON.stringify(info)}`)
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp.call('Input.dispatchMouseEvent', { type, x: info.x, y: info.y, button: 'left', clickCount: 1 })
  await delay(250); return info
}
async function clickText(needle, label) {
  const selector = `button:not(:disabled)`
  const info = await waitFor(() => cdp.eval(`(()=>{const root=document.querySelector('dialog[open]')||document,b=[...root.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length&&(e.innerText||'').trim().includes(${JSON.stringify(needle)}));if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);return{x,y,text:b.innerText.trim(),verified:!!top&&(top===b||b.contains(top))}})()`), 7000)
  assert(info?.verified, `${label}: text button not verified: ${needle}`)
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp.call('Input.dispatchMouseEvent', { type, x: info.x, y: info.y, button: 'left', clickCount: 1 })
  await delay(300); return info
}
async function openStore(label) {
  await click('button[data-position="10,8"]', `${label}-store-tile`)
  const hasNearbyList = await cdp.eval('!!document.querySelector("button.nearby-trigger")')
  await click(hasNearbyList ? 'button.nearby-trigger' : 'button.context-action', `${label}-${hasNearbyList ? 'open-nearby-list' : 'interact'}`)
  await waitFor(() => cdp.eval('!!document.querySelector("dialog[open]")'))
  const currentTitle = await cdp.eval('document.querySelector("dialog[open] #window-title")?.innerText ?? ""')
  if (!currentTitle.includes('雜貨店')) {
    const state = await cdp.eval('(()=>({title:document.querySelector("dialog[open] #window-title")?.innerText??null,text:document.querySelector("dialog[open]")?.innerText?.slice(0,1800)??null,buttons:[...document.querySelectorAll("dialog[open] button")].filter(button=>button.getClientRects().length).map(button=>button.innerText.trim())}))()')
    await writeFile(path.join(DIR, `${label}-selection-state.json`), `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' })
    await screenshot(`${label}-selection-state`)
    await clickText('雜貨店', `${label}-select-store`)
  }
  await waitFor(() => cdp.eval('!!document.querySelector("dialog[open] #recipe-content-search")'))
}
async function openStoreCorrect(label) {
  await click('button[data-position="10,8"]', `${label}-store-tile`)
  await waitFor(() => cdp.eval('!!document.querySelector(".context-prompt button.context-action")'))
  await click('.context-prompt button.context-action', `${label}-interact`)
  const selectionState = await cdp.eval('(()=>({title:document.querySelector("dialog[open] #window-title")?.innerText??null,text:document.querySelector("dialog[open]")?.innerText?.slice(0,1600)??null,buttons:[...document.querySelectorAll("button")].filter(button=>button.getClientRects().length).map(button=>button.innerText.trim())}))()')
  await writeFile(path.join(DIR, `${label}-selection-state.json`), `${JSON.stringify(selectionState, null, 2)}\n`, { flag: 'wx' })
  await screenshot(`${label}-selection-state`)
  await waitFor(() => cdp.eval('!!document.querySelector("dialog[open] #recipe-content-search")'))
}

try {
  chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--disable-breakpad', '--disable-crash-reporter', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  chrome.stderr.on('data', chunk => { stderr += chunk.toString() })
  const targetList = await waitFor(async () => { const port = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(stderr)?.[1]; if (!port) return false; const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); return targets.find(target => target.type === 'page') }, 25000)
  const port = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(stderr)?.[1]
  cdp = await new Cdp(targetList.webSocketDebuggerUrl).open()
  await cdp.call('Page.enable'); await cdp.call('Runtime.enable')
  const install = `if(location.search.includes('phase9-controlled-c=1'))localStorage.setItem('oakvale-v1',${JSON.stringify(rawSave)})`
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: install })
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/?phase9-controlled-c=1` })
  await waitFor(() => cdp.eval('!!document.querySelector(".game-shell")'))
  await openStoreCorrect('open-grocery-store')
  await click('#recipe-content-search', 'focus-recipe-search')
  await cdp.call('Input.insertText', { text: '樹脂護衣' })
  await click('[data-craft-recipe="slime_resin_guard_recipe"]', 'select-registered-material-recipe')
  const workbenchText = await cdp.eval('document.querySelector("dialog[open]")?.innerText ?? ""')
  const workbenchSources = await cdp.eval('[...document.querySelectorAll("dialog[open] [data-content-source]")].map(element=>({id:element.dataset.contentSource,label:element.innerText.trim(),state:element.dataset.contentSourceState}))')
  assert(workbenchText.includes('擊敗滑液黏怪') && workbenchSources.some(source => source.id === 'slime_resin'), 'Selected recipe is missing the known registered-material source context')
  result.evidence.missingMaterialWorkbench = { text: workbenchText, sources: workbenchSources, screenshot: await screenshot('workbench-missing-registered-material') }
  await record('workbench-evidence', result.evidence.missingMaterialWorkbench)
  await click('button.window-close', 'close-workbench')

  await click('.desktop-shortcuts button', 'open-inventory')
  await clickText('素材與收成', 'open-materials-category')
  const materialText = await cdp.eval('document.querySelector("dialog[open]")?.innerText ?? ""')
  const materialOrigins = await cdp.eval('[...document.querySelectorAll("dialog[open] [data-material-origin]")].map(e=>({origin:e.dataset.materialOrigin,name:e.parentElement.innerText}))')
  assert(materialOrigins.some(entry => entry.origin === 'wolf') && materialOrigins.some(entry => entry.origin === 'registered') && materialOrigins.some(entry => entry.origin === 'harvest'), 'Material inventory did not distinguish wolf, registered content, and crop harvest rows')
  assert(materialText.includes('擊敗滑液黏怪') && materialText.includes('製作樹脂護衣') && materialText.includes('影響配方：木石長矛'), 'Material rows did not connect known source and recipe use')
  result.evidence.materialRows = { text: materialText, origins: materialOrigins, screenshot: await screenshot('inventory-discovered-material-linkage') }
  await record('inventory-evidence', result.evidence.materialRows)
  await clickText('日常物品', 'open-supplies-category')
  await clickText('怪物素材', 'select-generic-monster-drop')
  result.evidence.genericDrop = { detail: await cdp.eval('document.querySelector("dialog[open] .item-detail")?.innerText ?? null'), screenshot: await screenshot('inventory-generic-monster-drop') }
  await click('button.window-close', 'close-inventory')

  await openStoreCorrect('reopen-grocery-store')
  await click('#recipe-content-search', 'focus-starter-recipe-search')
  await cdp.call('Input.insertText', { text: '木石長矛' })
  await click('[data-craft-recipe="starterSpear"]', 'select-craftable-starter-recipe')
  await click('[data-craft-submit]', 'craft-starter-spear')
  const craftResult = await cdp.eval('document.querySelector("[data-craft-result]")?.innerText ?? null')
  assert(craftResult?.includes('檢視裝備'), 'Successful craft did not present its in-place inspect action')
  await clickText('檢視裝備', 'inspect-crafted-gear')
  const gearFocus = await cdp.eval('({title:document.querySelector("dialog[open] #window-title")?.innerText, selected:document.querySelector("dialog[open] [data-instance-id][aria-pressed=true]")?.dataset.instanceId, comparison:document.querySelector("dialog[open] [data-gear-comparison]")?.innerText?.slice(0,700)})')
  assert(gearFocus.title?.includes('物品') && gearFocus.selected && gearFocus.comparison, 'Inspect action did not open inventory compare focused on the new item')
  result.evidence.postCraftCompare = { ...gearFocus, screenshot: await screenshot('post-craft-focused-compare') }
  await record('post-craft-evidence', result.evidence.postCraftCompare)
  result.status = 'PASS'
} catch (error) {
  result.status = 'FAIL'; result.error = String(error); result.stack = error.stack; result.chromeStderr = stderr
} finally {
  if (cdp) {
    await cdp.call('Browser.close').catch(() => {})
    cdp.close()
  }
  if (chrome && chrome.exitCode === null) {
    await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), delay(3000)])
    if (chrome.exitCode === null) chrome.kill()
    await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), delay(2000)])
  }
  if (existsSync(profile)) {
    const sizeTree = async dir => { let bytes = 0; for (const entry of await readdir(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); bytes += entry.isDirectory() ? await sizeTree(file) : (await stat(file)).size } return bytes }
    result.chromeProfileBytesBeforeCleanup = await sizeTree(profile)
    assert(path.resolve(profile).startsWith(`${path.resolve(DIR)}${path.sep}`) && path.basename(profile) === 'chrome-profile', 'Refusing profile cleanup outside the attempt directory')
    let cleanupError
    for (let retry = 0; retry < 8 && existsSync(profile); retry++) {
      try { await rm(profile, { recursive: true, force: false }); cleanupError = undefined }
      catch (error) { cleanupError = error; await delay(300) }
    }
    if (cleanupError) { result.status = 'FAIL'; result.cleanupError = String(cleanupError) }
    result.chromeProfileRemoved = !existsSync(profile)
  }
  await new Promise(resolve => server.close(resolve))
  result.finishedAt = iso()
  await writeFile(path.join(DIR, 'probe-results.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(`${JSON.stringify({ status: result.status, attempt: result.attempt, evidence: Object.keys(result.evidence), profileBytes: result.chromeProfileBytesBeforeCleanup, profileRemoved: result.chromeProfileRemoved })}\n`)
}
if (result.status !== 'PASS') process.exitCode = 1
