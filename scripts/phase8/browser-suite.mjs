import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, readdir, mkdir, writeFile, appendFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { classifyNoProgress, summarizeNoProgress } from './browser-helpers.mjs'

const ROOT = process.cwd()
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUTPUT = path.join(ROOT, 'reports/v2/20261014-balance-tuning/phase-08/f-browser')
const DIST = path.join(ROOT, 'dist')
const MODES = { smoke: 0, stress: 20 * 60, life: 30 * 60, adventure: 30 * 60, hybrid: 30 * 60, all: null }
const mode = process.argv[2] ?? 'all'
if (!(mode in MODES)) throw new Error(`Unknown mode: ${mode}`)

function iso() { return new Date().toISOString() }
function sha(value) { return createHash('sha256').update(value).digest('hex') }
async function hashTree(dir) {
  const parts = []
  async function visit(current) {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) await visit(absolute)
      else parts.push(`${path.relative(ROOT, absolute).replaceAll('\\', '/')}:${sha(await readFile(absolute))}`)
    }
  }
  await visit(dir)
  return sha(parts.join('\n'))
}
async function sourceHead() {
  const gitDirEntry = (await readFile(path.join(ROOT, '.git'), 'utf8').catch(() => '')).trim()
  const gitDir = gitDirEntry.startsWith('gitdir:') ? path.resolve(ROOT, gitDirEntry.slice(7).trim()) : path.join(ROOT, '.git')
  const head = (await readFile(path.join(gitDir, 'HEAD'), 'utf8')).trim()
  if (!head.startsWith('ref: ')) return head
  const ref = head.slice(5)
  const loose = await readFile(path.join(gitDir, ref), 'utf8').catch(() => '')
  if (loose) return loose.trim()
  const packed = await readFile(path.join(gitDir, 'packed-refs'), 'utf8').catch(() => '')
  const entry = packed.split(/\r?\n/).find(line => line.endsWith(` ${ref}`) && !line.startsWith('#') && !line.startsWith('^'))
  if (!entry) throw new Error(`Cannot resolve Git HEAD ref ${ref}`)
  return entry.split(' ')[0]
}
function uniqueAttempt(name) {
  const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '')
  return path.join(OUTPUT, `attempt-${stamp}-${name}`)
}
async function jsonFile(file, value) { await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' }) }

class CDP {
  constructor(ws) { this.ws = new WebSocket(ws); this.id = 0; this.pending = new Map(); this.listeners = new Map() }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', event => {
      const packet = JSON.parse(event.data)
      if (packet.id && this.pending.has(packet.id)) {
        const { resolve, reject } = this.pending.get(packet.id); this.pending.delete(packet.id)
        packet.error ? reject(new Error(packet.error.message)) : resolve(packet.result)
      } else if (packet.method) for (const listener of this.listeners.get(packet.method) ?? []) listener(packet.params)
    })
    return this
  }
  on(method, listener) { this.listeners.set(method, [...(this.listeners.get(method) ?? []), listener]) }
  call(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 30000)
      this.pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value) }, reject: error => { clearTimeout(timeout); reject(error) } })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  close() { try { this.ws.close() } catch {} }
  async evaluate(expression, awaitPromise = false) {
    const result = await this.call('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result?.value
  }
}

async function staticServer() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return }
      const decoded = decodeURIComponent(url.pathname)
      const target = path.resolve(DIST, decoded === '/' ? 'index.html' : `.${decoded}`)
      if (!target.startsWith(`${DIST}${path.sep}`)) throw new Error('path escape')
      let file = target
      try { if (!(await readFile(file))) throw new Error('missing') }
      catch { file = path.join(DIST, 'index.html') }
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
      res.end(await readFile(file))
    } catch { res.writeHead(400); res.end('bad request') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return { server, url: `http://127.0.0.1:${server.address().port}/` }
}

async function waitFor(predicate, timeout = 20000, every = 100) {
  const start = Date.now()
  while (Date.now() - start < timeout) { const value = await predicate(); if (value) return value; await delay(every) }
  throw new Error(`Timed out after ${timeout}ms`)
}

class BrowserRun {
  constructor(name, dir, serverUrl) {
    this.name = name; this.dir = dir; this.serverUrl = serverUrl; this.actions = []; this.errors = []; this.checkpoints = []; this.last = ''
  }
  async start() {
    this.profile = path.join(this.dir, 'chrome-profile')
    await mkdir(this.profile, { recursive: false })
    this.chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--disable-translate', '--disable-features=MediaRouter', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${this.profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
    const portFile = path.join(this.profile, 'DevToolsActivePort')
    const port = await waitFor(async () => { try { return Number((await readFile(portFile, 'utf8')).split(/\r?\n/)[0]) } catch { return null } })
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
    this.browser = await new CDP(version.webSocketDebuggerUrl).open()
    await mkdir(path.join(this.dir, 'downloads'), { recursive: false })
    this.downloads = []
    await this.browser.call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: path.join(this.dir, 'downloads'), eventsEnabled: true }).catch(() => {})
    this.browser.on('Browser.downloadWillBegin', x => this.downloads.push({ type: 'begin', ...x, at: iso() }))
    this.browser.on('Browser.downloadProgress', x => this.downloads.push({ type: 'progress', ...x, at: iso() }))
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(this.serverUrl)}`, { method: 'PUT' })).json()
    this.port = port; this.cdp = await new CDP(target.webSocketDebuggerUrl).open()
    for (const domain of ['Page', 'Runtime', 'Network', 'Log', 'Memory', 'Storage']) await this.cdp.call(`${domain}.enable`).catch(() => {})
    this.cdp.on('Runtime.exceptionThrown', x => this.errors.push({ type: 'page', text: x.exceptionDetails?.exception?.description ?? x.exceptionDetails?.text, at: iso() }))
    this.cdp.on('Log.entryAdded', x => { if (x.entry.level === 'error') this.errors.push({ type: 'console', text: x.entry.text, at: iso() }) })
    this.cdp.on('Network.loadingFailed', x => this.errors.push({ type: 'request', text: `${x.errorText} ${x.requestId}`, at: iso() }))
    this.cdp.on('Network.responseReceived', x => { if (x.response.status >= 400) this.errors.push({ type: 'http', text: `${x.response.status} ${x.response.url}`, at: iso() }) })
    await this.cdp.call('Page.navigate', { url: this.serverUrl })
    await waitFor(() => this.cdp.evaluate('document.querySelector(".game-shell") !== null').catch(() => false), 60000)
    this.browserVersion = await this.cdp.call('Browser.getVersion')
    this.viewport = await this.cdp.evaluate('({width:innerWidth,height:innerHeight,devicePixelRatio})')
    await this.record('opened', { url: this.serverUrl, browser: this.browserVersion })
  }
  async visibleText() { return (await this.cdp.evaluate(`(() => [...document.querySelectorAll('header,main,footer,dialog[open],[role=dialog]')].filter(e => e.getClientRects().length).map(e => e.innerText).join('\\n').replace(/\\s+/g,' ').trim())()`)) ?? '' }
  async buttonLabels() { return this.cdp.evaluate(`([...document.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>({text:e.innerText.trim().replace(/\\s+/g,' '),aria:e.getAttribute('aria-label'),disabled:e.disabled})))`) }
  async click(selector, label = selector) {
    const rect = await this.cdp.evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e||!e.getClientRects().length||e.disabled)return null; e.scrollIntoView({block:'center',inline:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,text:(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ')} })()`)
    if (!rect) return this.record(label, { ok: false, reason: 'ui-control-unavailable' })
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y })
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
    await delay(180)
    return this.record(label, { ok: true, control: rect.text })
  }
  async clickText(text, label = text) {
    const rect = await this.cdp.evaluate(`(() => { const q=${JSON.stringify(text)}; const all=[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length&&!e.disabled); const e=all.find(e=>(e.innerText||e.getAttribute('aria-label')||'').trim()===q)||all.find(e=>(e.innerText||e.getAttribute('aria-label')||'').includes(q)); if(!e)return null; e.scrollIntoView({block:'center',inline:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,text:(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ')} })()`)
    if (!rect) {
      const disabled = await this.cdp.evaluate(`(()=>[...document.querySelectorAll('button')].find(e=>e.getClientRects().length&&e.disabled&&(e.innerText||'').includes(${JSON.stringify(text)}))?.innerText.trim()||null)()`)
      return this.record(label, { ok: false, reason: disabled ? 'resource-blocked' : 'ui-control-unavailable', blockedControl: disabled, nearby: (await this.buttonLabels()).slice(0, 40) })
    }
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y })
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
    await delay(220)
    return this.record(label, { ok: true, control: rect.text })
  }
  async clickTextRaw(text) {
    const rect = await this.cdp.evaluate(`(()=>{const q=${JSON.stringify(text)};const e=[...document.querySelectorAll('button')].find(e=>e.getClientRects().length&&!e.disabled&&((e.innerText||'').trim()===q||(e.innerText||'').includes(q)));if(!e)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)
    if (!rect) return false
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 }); await this.cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
    return true
  }
  async key(key) {
    const keys = { Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 } }
    const spec = keys[key] ?? { key, code: key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) }
    await this.cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', ...spec }); await this.cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...spec }); await delay(120)
    return this.record(`key:${key}`, { ok: true })
  }
  async record(action, detail) { const row = { at: iso(), action, detail, visible: (await this.visibleText()).slice(0, 1400) }; this.actions.push(row); if (this.actionPath) await appendFile(this.actionPath, `${JSON.stringify(row)}\n`); return row }
  async pressText(text) { return this.clickText(text) }
  async openMenu() { if (await this.cdp.evaluate('!!document.querySelector(".pixel-menu")')) return; await this.click('button.menu-trigger', '開啟選單') }
  async escape() { await this.key('Escape') }
  async navigateTo(position) {
    await this.escapeIfDialog()
    return this.click(`button[data-position="${position}"]`, `地圖移動至 ${position}`)
  }
  async escapeIfDialog() { if (await this.cdp.evaluate('!!document.querySelector("dialog[open]")')) await this.escape() }
  async interact() { await this.click('button.context-action', '互動目前地點') }
  async openPlaceAt(position, placeLabel) { await this.navigateTo(position); await this.interact(); return this.clickText(placeLabel, `開啟${placeLabel}`) }
  async waitDay() {
    await this.escapeIfDialog(); await this.openMenu(); await this.clickText('旅人筆記', '開啟旅人筆記')
    const outcome = await this.clickText('等待 1 日', '等待 1 日')
    await this.escapeIfDialog()
    return outcome
  }
  async pause() {
    const selected = await this.cdp.evaluate('document.querySelector(".speed-controls button[aria-pressed=\\\"true\\\"]")?.innerText.trim()')
    if (selected !== '暫停') await this.click('.speed-controls button:first-child', '暫停世界時間')
  }
  async snapshot(label) {
    const start = Date.now()
    const dom = await this.cdp.call('Memory.getDOMCounters').catch(() => null)
    const heap = await this.cdp.call('Runtime.getHeapUsage').catch(() => null)
    const measurements = await this.cdp.evaluate(`(async()=>{let usage=null;try{usage=await navigator.storage.estimate()}catch{};let local=[];let localBytes=0;for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i),v=localStorage.getItem(k)||'';local.push(k);localBytes+=new TextEncoder().encode(k+v).length};let databases=[];let rows=0;let encoded=0;try{for(const info of await indexedDB.databases()){if(!info.name)continue;const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(info.name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const names=[...db.objectStoreNames];let counts={};for(const name of names){const tx=db.transaction(name,'readonly'),store=tx.objectStore(name);counts[name]=await new Promise((resolve,reject)=>{const r=store.count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});rows+=counts[name];const vals=await new Promise((resolve,reject)=>{const r=store.getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});encoded+=new TextEncoder().encode(JSON.stringify(vals)).length};databases.push({name:info.name,version:info.version,stores:names,counts});db.close()}}catch(e){databases.push({error:String(e)})};return {storageEstimate:usage,localStorageKeys:local,localStorageUtf8Bytes:localBytes,indexedDb:databases,indexedDbRows:rows,indexedDbJsonProjectionBytes:encoded,inventoryUiMs:null,collectionUiMs:null}})()` , true).catch(error => ({ instrumentationError: String(error) }))
    const cdpUsage = await this.cdp.call('Storage.getUsageAndQuota', { origin: this.serverUrl.replace(/\/$/, '') }).catch(error => ({ error: String(error) }))
    const inventoryUiTimingMs = await this.measureInventoryUi().catch(error => ({ error: String(error) }))
    const snap = { at: iso(), label, domCounters: dom, heap, nativeNavigatorStorage: measurements?.storageEstimate ?? null, cdpUsageAndQuota: cdpUsage, localStorage: { keys: measurements?.localStorageKeys, utf8Bytes: measurements?.localStorageUtf8Bytes }, indexedDb: { databases: measurements?.indexedDb, rows: measurements?.indexedDbRows, jsonProjectionBytes: measurements?.indexedDbJsonProjectionBytes }, inventoryUiTimingMs, downloads: [...this.downloads], visible: await this.visibleText(), sampleDurationMs: Date.now() - start }
    this.checkpoints.push(snap); if (this.checkpointPath) await appendFile(this.checkpointPath, `${JSON.stringify(snap)}\n`); return snap
  }
  async saveLatency() {
    const start = Date.now()
    const rect = await this.cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.getClientRects().length&&e.innerText.trim()==='存檔');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)
    if (!rect) return (await this.record('手動存檔', { ok: false, reason: 'ui-control-unavailable' }))
    await this.cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 }); await this.cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
    await waitFor(() => this.visibleText().then(text => text.includes('世界已儲存')), 5000, 20).catch(() => null)
    const elapsed = Date.now() - start
    await this.record('手動存檔', { ok: true, saveLatencyMs: elapsed, acknowledged: (await this.visibleText()).includes('世界已儲存') })
    return elapsed
  }
  async visibleIndicators() {
    return this.cdp.evaluate(`(()=>{const text=s=>document.querySelector(s)?.innerText?.trim().replace(/\\s+/g,' ')??'';const clock=text('.world-clock').replace(/\\b\\d{2}:\\d{2}\\b/,'HH:MM');return{clock,caption:text('.world-caption'),player:text('.player-hud'),prompt:text('.context-prompt'),recent:text('.recent-event'),playerTile:document.querySelector('.tile.is-player')?.dataset.position??null,dialog:text('dialog[open]')}})()`)
  }
  async reloadProof() {
    await this.escapeIfDialog(); await this.pause()
    const before = await this.visibleIndicators()
    await this.cdp.call('Page.reload', { ignoreCache: true })
    await waitFor(() => this.cdp.evaluate('document.querySelector(".game-shell")!==null').catch(() => false))
    await delay(300); await this.pause(); await delay(150)
    const after = await this.visibleIndicators()
    const proof = { before, after, equal: JSON.stringify(before) === JSON.stringify(after) }
    await this.record('reload-proof', proof)
    return proof
  }
  async observeWindow(label) {
    await this.openMenu(); const opened = await this.clickText(label, `視窗:${label}`); const text = await this.cdp.evaluate('document.querySelector("dialog[open]")?.innerText ?? document.querySelector("[role=dialog]")?.innerText ?? ""'); await this.escapeIfDialog()
    return { opened: opened.detail.ok, hasContent: !!text, excerpt: text.slice(0, 450) }
  }
  async measureInventoryUi() {
    await this.escapeIfDialog(); await this.openMenu()
    const started = Date.now(); const inventoryClick = await this.clickTextRaw('物品')
    await waitFor(() => this.cdp.evaluate('!!document.querySelector("dialog[open]")&&document.querySelector("dialog[open]").innerText.includes("日常物品")'), 3000, 10)
    const inventoryOpenMs = inventoryClick ? Date.now() - started : null
    let collectionOpenMs = null
    const hasCollection = await this.cdp.evaluate(`[...document.querySelectorAll('dialog[open] button')].some(e=>e.innerText.includes('見聞收藏'))`)
    if (hasCollection) { const t = Date.now(); const clicked = await this.clickTextRaw('見聞收藏'); await waitFor(() => this.cdp.evaluate(`[...document.querySelectorAll('dialog[open] button')].some(e=>e.innerText.includes('見聞收藏')&&e.getAttribute('aria-pressed')==='true')`), 2000, 10); collectionOpenMs = clicked ? Date.now() - t : null }
    await this.escapeIfDialog()
    await this.record('效能測量：物品/見聞視窗', { inventoryOpenMs, collectionOpenMs, timingBoundary: 'Visible menu opened to inventory dialog content; category click to aria-pressed selected' })
    return { inventoryOpenMs, collectionOpenMs }
  }
  async screenshot(name) {
    const shot = await this.cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }).catch(() => null)
    if (shot?.data) await writeFile(path.join(this.dir, `${name}.png`), Buffer.from(shot.data, 'base64'), { flag: 'wx' })
  }
  async close() {
    this.cdp?.close(); this.browser?.close()
    if (this.chrome && this.chrome.exitCode === null) this.chrome.kill()
    await delay(250)
  }
}

async function visibleMainSmoke(run) {
  await waitFor(() => run.cdp.evaluate('!!document.querySelector("button.primary")').catch(() => false))
  await run.clickText('起身', '開始新世界')
  await delay(600); await run.pause()
  const windows = []
  for (const label of ['這一生', '住所與產業', '地方消息與委託', '角色', '物品', '日誌', '地圖與世界', '世界歷史', '旅人筆記']) windows.push({ label, ...await run.observeWindow(label) })
  const farm = await run.openPlaceAt('16,10', '農田')
  let crop = await run.cdp.evaluate(`(()=>{const b=document.querySelector('button[data-crop-choice]:not([data-crop-choice="wheat"])')||document.querySelector('button[data-crop-choice]');return b?{id:b.dataset.cropChoice,text:b.innerText}:null})()`)
  await run.click(`button[data-crop-choice="${crop?.id ?? 'wheat'}"]`, '選擇目前季節合法作物')
  crop = { ...crop, guidance: await run.cdp.evaluate('document.querySelector("[data-crop-guidance][data-crop-state=available]")?.innerText') }
  const prepare = await run.clickText('整地', '整地')
  const plant = await run.clickText('播種', '播種季節作物')
  await run.waitDay()
  await run.openPlaceAt('16,10', '農田')
  const harvest = await run.clickText('收割', '收割季節作物')
  await run.escapeIfDialog()
  await run.navigateTo('5,4'); await run.interact(); const forest = await run.clickText('森林', '開啟森林')
  const gather = await run.clickText('伐木', '森林採集')
  const encounter = await run.clickText('尋找怪物', '尋找怪物')
  await run.escapeIfDialog()
  if ((await run.visibleText()).includes('返回戰鬥')) await run.interact()
  const battleVisible = (await run.visibleText()).includes('怪物生命')
  let retreat = { detail: { ok: false, reason: 'encounter-not-opened' } }
  if (battleVisible) retreat = await run.clickText('逃跑', '戰鬥撤退')
  await run.escapeIfDialog()
  await run.openPlaceAt('7,9', '家'); const blacksmith = { detail: { ok: false, reason: 'fresh-save-blacksmith-not-opened' } }
  const craft = await run.clickText('製作', '嘗試製作可用配方')
  await run.escapeIfDialog()
  await run.navigateTo('10,8'); await run.interact(); const shop = await run.clickText('雜貨店', '開啟雜貨店')
  const trade = await run.clickText('賣', '交易售出一項物品')
  await run.escapeIfDialog()
  await run.navigateTo('7,9'); await run.interact(); const home = await run.clickText('家', '開啟自宅')
  const rest = await run.clickText('休息', '自宅休息')
  await run.escapeIfDialog()
  const saveMs = await run.saveLatency()
  const reload = await run.reloadProof()
  const successionReachable = (await run.visibleText()).includes('選一位居民，接續旅程')
  await run.screenshot('checkpoint-regression')
  return { windows, farm: { opened: farm.detail.ok, crop, prepare: prepare.detail, plant: plant.detail, harvest: harvest.detail }, gather: { forest: forest.detail, result: gather.detail }, encounter: { result: encounter.detail, retreat: retreat.detail, battleVisible }, craft: { blacksmith: blacksmith.detail, result: craft.detail }, trade: { shop: shop.detail, result: trade.detail }, rest: { home: home.detail, result: rest.detail }, saveLatencyMs: saveMs, reload, successionReachable, errors: run.errors }
}

async function routeAction(run, role, index) {
  const before = await run.visibleText()
  const beforeClock = before.match(/第 \d+ 年[^\s]+ \d+ 日[^\n]*/)?.[0] ?? ''
  let outcome
  const modeIndex = index % (role === 'hybrid' ? 10 : 8)
  try {
    if (modeIndex === 0) outcome = await run.waitDay()
    else if (role === 'life' || (role === 'hybrid' && modeIndex % 2 === 0)) {
      const cycle = Math.floor(index / 2) % 4
      if (cycle === 0) {
        await run.openPlaceAt('16,10', '農田')
        await run.clickText('整地', '生活路線整地')
        outcome = await run.clickText('播種', '生活路線播種')
        if (!outcome.detail.ok) outcome = await run.clickText('收割', '生活路線收割')
      } else if (cycle === 1) { await run.navigateTo('5,4'); await run.interact(); await run.clickText('森林', '生活路線開啟森林'); outcome = await run.clickText('伐木', '生活路線採集') }
      else if (cycle === 2) { await run.navigateTo('10,8'); await run.interact(); await run.clickText('雜貨店', '生活路線開啟雜貨店'); outcome = await run.clickText('賣', '生活路線交易') }
      else if (Math.floor(index / 8) % 2 === 0) { await run.navigateTo('7,9'); await run.interact(); await run.clickText('家', '生活路線開啟自宅'); outcome = await run.clickText('休息', '生活路線休息') }
      else { await run.openMenu(); outcome = await run.clickText('地方消息與委託', '生活路線檢視地方消息'); await run.escapeIfDialog() }
    } else {
      const cycle = Math.floor(index / 2) % 3
      if (cycle === 0) {
        if (!(await run.visibleText()).includes('返回戰鬥')) { await run.navigateTo('5,4'); await run.interact(); await run.clickText('森林', '冒險路線開啟森林'); outcome = await run.clickText('尋找怪物', '冒險路線尋找怪物') }
        await run.escapeIfDialog()
        if ((await run.visibleText()).includes('返回戰鬥')) await run.interact()
        for (let turns=0; turns<4; turns++) {
          const labels = await run.buttonLabels()
          if (!labels.some(x => x.text.includes('攻擊'))) break
          outcome = await run.clickText('攻擊', '戰鬥攻擊')
        }
        if ((await run.buttonLabels()).some(x => x.text.includes('逃跑'))) outcome = await run.clickText('逃跑', '冒險路線撤退')
      } else if (cycle === 1) { await run.navigateTo('7,9'); await run.interact(); await run.clickText('家', '冒險路線開啟自宅'); outcome = await run.clickText('休息', '冒險路線休息') }
      else { await run.openMenu(); outcome = await run.clickText('物品', '冒險路線檢視物品'); await run.escapeIfDialog() }
    }
    await run.escapeIfDialog()
  } catch (error) { outcome = { action: 'route-action', detail: { ok: false, reason: 'runner-error', error: String(error) } }; run.actions.push({ at: iso(), ...outcome, visible: (await run.visibleText()).slice(0, 1000) }) }
  const after = await run.visibleText()
  const changed = before !== after || beforeClock !== (after.match(/第 \d+ 年[^\s]+ \d+ 日[^\n]*/)?.[0] ?? '')
  const summaryAction = { action: outcome?.action ?? `route-step-${role}`, detail: { reason: outcome?.detail?.reason } }
  await run.record(`route-step:${role}`, { outcome: summaryAction.action, noProgress: !changed, noProgressClass: !changed ? classifyNoProgress(summaryAction) : null, failureReason: outcome?.detail?.reason ?? null, visibleAfter: after.slice(0, 1200) })
}

async function longLane(run, seconds, role = null) {
  await waitFor(() => run.cdp.evaluate('!!document.querySelector(".game-shell")').catch(() => false))
  const opening = await run.cdp.evaluate('!!document.querySelector(".life-opening")')
  if (opening) await run.clickText('起身', '開始 fresh save')
  await run.pause()
  const started = Date.now(), until = started + seconds * 1000
  let i = 0, nextCheckpoint = started, nextReload = started + 5 * 60_000
  while (Date.now() < until) {
    if (role) await routeAction(run, role, i)
    else {
      const actions = ['wait', 'inventory', 'identity', 'log', 'map', 'wait', 'property', 'news', 'character', 'save']
      const selected = i > 0 && i % 300 === 0 ? 'export' : actions[i % actions.length]
      if (selected === 'wait') await run.waitDay()
      else if (selected === 'save') await run.saveLatency()
      else if (selected === 'export') { await run.openMenu(); await run.clickText('匯出遊玩紀錄', 'C01 匯出與 interleaving'); await run.escapeIfDialog() }
      else { const labels = { inventory: '物品', identity: '這一生', log: '日誌', map: '地圖與世界', property: '住所與產業', news: '地方消息與委託', character: '角色' }; await run.observeWindow(labels[selected]) }
    }
    i++
    const now = Date.now()
    if (i % 10 === 0) await writeFile(path.join(run.dir, 'heartbeat.json'), `${JSON.stringify({ at: iso(), actionIndex: i, elapsedSeconds: Math.round((now-started)/1000), currentTitle: await run.cdp.evaluate('document.title').catch(() => null) }, null, 2)}\n`)
    if (now >= nextCheckpoint) { await run.snapshot(`elapsed-${Math.round((now-started)/1000)}s`); nextCheckpoint = now + 60_000 }
    if (now >= nextReload && now < until - 60_000) { await run.reloadProof(); nextReload = now + 5 * 60_000 }
    await delay(350)
  }
  await run.snapshot('final')
  await run.screenshot(`checkpoint-${role ?? 'stress'}-final`)
  return { requestedSeconds: seconds, elapsedSeconds: (Date.now() - started) / 1000, actionCount: run.actions.length, checkpoints: run.checkpoints.length }
}

async function executeLane(name, serverUrl, seconds = 0, role = null, smoke = false) {
  const dir = uniqueAttempt(name); await mkdir(dir, { recursive: false })
  const run = new BrowserRun(name, dir, serverUrl)
  run.actionPath = path.join(dir, 'action-trace.ndjson'); run.checkpointPath = path.join(dir, 'checkpoint-trace.ndjson')
  await writeFile(run.actionPath, '', { flag: 'wx' }); await writeFile(run.checkpointPath, '', { flag: 'wx' })
  const meta = { lane: name, startedAt: iso(), sourceHead: await sourceHead(), srcFingerprint: await hashTree(path.join(ROOT, 'src')), node: process.version, platform: process.platform, chromePath: CHROME, server: 'in-process Node static server serving production dist/', productionDistFingerprint: await hashTree(DIST), url: serverUrl }
  await jsonFile(path.join(dir, 'manifest.json'), meta)
  try {
    await run.start()
    let result
    if (smoke) result = await visibleMainSmoke(run)
    else result = await longLane(run, seconds, role)
    const classCounts = summarizeNoProgress(run.actions)
    const closeout = { ...meta, finishedAt: iso(), browserVersion: run.browserVersion, viewport: run.viewport, result, errors: run.errors, actionCount: run.actions.length, noProgressClassCounts: classCounts, checkpointCount: run.checkpoints.length, raw: { actions: 'actions.ndjson', actionTrace: 'action-trace.ndjson', checkpoints: 'checkpoints.json', checkpointTrace: 'checkpoint-trace.ndjson', downloads: 'downloads/' } }
    await writeFile(path.join(dir, 'actions.ndjson'), run.actions.map(x => JSON.stringify(x)).join('\n') + '\n', { flag: 'wx' })
    await jsonFile(path.join(dir, 'checkpoints.json'), run.checkpoints)
    await jsonFile(path.join(dir, 'closeout.json'), closeout)
    console.log(JSON.stringify({ lane: name, dir: path.relative(ROOT, dir), result: smoke ? { windows: result.windows.length, errors: result.errors.length, reloadEqual: result.reload.equal } : result }))
    return closeout
  } catch (error) {
    await jsonFile(path.join(dir, 'failure.json'), { lane: name, at: iso(), error: String(error), stack: error.stack, actionsInMemory: run.actions.length, checkpointsInMemory: run.checkpoints.length, browserVersion: run.browserVersion, note: 'Attempt retained; partial action/checkpoint traces are authoritative for actions already flushed.' }).catch(() => {})
    throw error
  } finally { await run.close().catch(() => {}) }
}

if (!existsSync(CHROME) || !existsSync(path.join(DIST, 'index.html'))) throw new Error('System Chrome or production dist is missing; do not substitute a dev server.')
await mkdir(OUTPUT, { recursive: true })
const server = await staticServer()
const results = []
try {
  if (mode === 'smoke' || mode === 'all') results.push(await executeLane('regression', server.url, 0, null, true))
  if (mode === 'stress' || mode === 'all') results.push(await executeLane('stress', server.url, MODES.stress))
  for (const role of ['life', 'adventure', 'hybrid']) if (mode === role || mode === 'all') results.push(await executeLane(`role-${role}`, server.url, MODES[role], role))
} finally { server.server.close() }
await jsonFile(path.join(OUTPUT, `suite-${new Date().toISOString().replaceAll(':','').replaceAll('.','')}.json`), { finishedAt: iso(), results })
