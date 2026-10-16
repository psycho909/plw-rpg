// RC O-01 browser verification: production dist in headless Chrome over CDP.
// Scenarios are labeled REAL BROWSER OBSERVATION (real quota, real IndexedDB) or
// CONTROLLED FAILURE INJECTION (setItem quota / IndexedDB readwrite outage hooks).
// Each scenario uses its own static-server port, i.e. a fresh origin and storage.
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, readdir, mkdir, writeFile, stat, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = process.cwd()
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(ROOT, 'reports/v2/20261016-final-qa-rc/phase-10/rc-runner')
const DIST = path.join(ROOT, 'dist')
const SAVE_KEY = 'oakvale-v1'
const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '')
const attempt = path.join(OUT, `attempt-${stamp}-o01`)
const iso = () => new Date().toISOString()
const sha = value => createHash('sha256').update(value).digest('hex')
const MAX_PENDING_RECORDS = 256, MAX_PENDING_CHARS = 256_000
const SUMMARY = '待補寫紀錄摘要：', GAP = '紀錄缺口：'

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
async function git(...args) {
  const r = spawn('git', args, { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  let out = ''
  for await (const chunk of r.stdout) out += chunk
  return out.trim()
}
async function waitFor(fn, timeout = 30000, every = 150) {
  const start = Date.now()
  while (Date.now() - start < timeout) { const value = await fn().catch(() => false); if (value) return value; await delay(every) }
  throw new Error(`Timed out after ${timeout}ms`)
}

class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.events = [] }
  async open() {
    await new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }) })
    this.ws.addEventListener('message', e => {
      const packet = JSON.parse(e.data)
      if (packet.method) { this.events.push(packet); return }
      const p = this.pending.get(packet.id)
      if (!p) return
      this.pending.delete(packet.id); packet.error ? p.reject(new Error(packet.error.message)) : p.resolve(packet.result)
    })
    return this
  }
  call(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout ${method}`)) }, 60000)
      this.pending.set(id, { resolve: x => { clearTimeout(timer); resolve(x) }, reject: x => { clearTimeout(timer); reject(x) } })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expression) {
    const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })
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
      // Seed page: same origin, no app, so a fixture can be written before the game boots.
      if (url.pathname === '/__seed') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end('<!doctype html><title>seed</title>'); return }
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

// Injected before any page script. Control flags live in sessionStorage so they survive reloads.
const HOOKS = `(() => {
  const ctl = () => { try { return JSON.parse(sessionStorage.getItem('o01-ctl') || '{}') } catch { return {} } }
  const o = window.__o01 = { setItemLog: [], firstSave: null, initial: null, idbWriteAttempts: 0, idbInjectedFailures: 0 }
  try { o.initial = localStorage.getItem('${SAVE_KEY}') } catch {}
  const setItem = Storage.prototype.setItem
  Storage.prototype.setItem = function (key, value) {
    if (this === window.localStorage && key === '${SAVE_KEY}' && location.pathname !== '/__seed') {
      const text = String(value), c = ctl(), entry = { at: Date.now(), length: text.length, threw: false }
      o.setItemLog.push(entry)
      if (c.quota != null && text.length > c.quota) { entry.threw = true; throw new DOMException('injected quota', 'QuotaExceededError') }
      try { setItem.call(this, key, value) } catch (error) { entry.threw = true; entry.real = String(error); throw error }
      if (o.firstSave === null) o.firstSave = text
      return
    }
    return setItem.call(this, key, value)
  }
  const transaction = IDBDatabase.prototype.transaction
  IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
    if (mode === 'readwrite') {
      o.idbWriteAttempts++
      if (ctl().idbFail) { o.idbInjectedFailures++; throw new DOMException('injected archive outage', 'UnknownError') }
    }
    return transaction.call(this, names, mode, ...rest)
  }
})()`

const STORE = `(()=>{const g=document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('game');return g?{writerReady:g.writerReady,saveError:g.saveError,journalError:g.journalError,pendingRecords:g.pendingRecords,speed:g.speed,message:g.message,worldTime:g.state.worldTime,saveBlocked:g.saveBlocked}:null})()`

class Browser {
  async start(dir) {
    this.profile = path.join(dir, 'chrome-profile'); await mkdir(this.profile, { recursive: false })
    this.chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${this.profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
    this.port = await waitFor(async () => Number((await readFile(path.join(this.profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]))
    this.version = await (await fetch(`http://127.0.0.1:${this.port}/json/version`)).json()
  }
  async page() {
    const target = await (await fetch(`http://127.0.0.1:${this.port}/json/new?about:blank`, { method: 'PUT' })).json()
    const cdp = await new Cdp(target.webSocketDebuggerUrl).open()
    cdp.targetId = target.id
    for (const d of ['Page', 'Runtime', 'Log']) await cdp.call(`${d}.enable`)
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: HOOKS })
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
    return cdp
  }
  async closePage(cdp) { cdp.close(); await fetch(`http://127.0.0.1:${this.port}/json/close/${cdp.targetId}`).catch(() => {}) }
  async close() {
    if (this.chrome && this.chrome.exitCode === null) { this.chrome.kill(); await delay(1500) }
    let bytes = 0
    async function size(d) { let n = 0; for (const e of await readdir(d, { withFileTypes: true })) { const f = path.join(d, e.name); n += e.isDirectory() ? await size(f) : (await stat(f)).size } return n }
    if (existsSync(this.profile)) {
      bytes = await size(this.profile)
      if (path.basename(this.profile) !== 'chrome-profile' || !path.resolve(this.profile).startsWith(path.resolve(attempt))) throw new Error('refusing cleanup')
      await waitFor(async () => { await rm(this.profile, { recursive: true, force: false }); return true }, 15000, 1000)
    }
    return { chromeProfileBytesBeforeCleanup: bytes, chromeProfileRemoved: !existsSync(this.profile) }
  }
}

function pageErrors(cdp) {
  return cdp.events.filter(p => p.method === 'Runtime.exceptionThrown' || (p.method === 'Log.entryAdded' && p.params.entry.level === 'error'))
    .map(p => p.method === 'Runtime.exceptionThrown' ? p.params.exceptionDetails?.exception?.description ?? p.params.exceptionDetails?.text : p.params.entry.text)
}
async function navigate(cdp, url, ready = '!!document.querySelector(".game-shell")') {
  await cdp.call('Page.navigate', { url })
  await waitFor(() => cdp.eval(`document.readyState==='complete' && location.href===${JSON.stringify(url)} && (${ready})`))
}
async function writerReady(cdp) { return waitFor(() => cdp.eval(`(${STORE})?.writerReady === true`), 30000) }
async function seed(cdp, origin, raw) {
  await navigate(cdp, `${origin}__seed`, 'true')
  await cdp.eval(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(raw)}); localStorage.getItem(${JSON.stringify(SAVE_KEY)}).length`)
}
async function setCtl(cdp, ctl) { await cdp.eval(`sessionStorage.setItem('o01-ctl', ${JSON.stringify(JSON.stringify(ctl))})`) }
async function saved(cdp) { return cdp.eval(`localStorage.getItem(${JSON.stringify(SAVE_KEY)})`) }
async function key(cdp, name, code, vk) {
  for (const type of ['keyDown', 'keyUp']) await cdp.call('Input.dispatchKeyEvent', { type, key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
}
// Hit-tested mouse click on a visible button by exact selector or visible text.
async function click(cdp, selectorOrText) {
  const point = await cdp.eval(`(()=>{const q=${JSON.stringify(selectorOrText)};let el=null;try{el=document.querySelector(q)}catch{}
    if(!el)el=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.innerText.trim().startsWith(q));
    if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);
    return{x,y,ok:!!hit&&(hit===el||el.contains(hit)),text:el.innerText.trim().slice(0,60),disabled:el.disabled}})()`)
  if (!point?.ok || point.disabled) throw new Error(`click refused: ${selectorOrText} ${JSON.stringify(point)}`)
  for (const type of ['mousePressed', 'mouseReleased']) await cdp.call('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 })
  await delay(250)
  return point.text
}
async function shot(cdp, name) {
  const { data } = await cdp.call('Page.captureScreenshot', { format: 'png' })
  await writeFile(path.join(attempt, `${name}.png`), Buffer.from(data, 'base64'), { flag: 'wx' })
  return `${name}.png`
}

async function readArchive(cdp) {
  return cdp.eval(`new Promise((res,rej)=>{const q=indexedDB.open('oakvale-play-journal');q.onsuccess=()=>{const t=q.result.transaction('records','readonly').objectStore('records').getAll();t.onsuccess=()=>res(t.result.map(({ordinal,...r})=>r));t.onerror=()=>rej(t.error)};q.onerror=()=>rej(q.error)})`)
}
function journalStats(raw, J) {
  const pending = J.unpackCheckpoint(raw).journal.pending
  const chars = pending.reduce((n, r) => n + JSON.stringify(r).length + 1, 0)
  const markers = pending.filter(r => r.message.startsWith(SUMMARY) || r.message.startsWith(GAP))
  return { checkpointChars: raw.length, worldId: J.unpackCheckpoint(raw).journal.worldId, pendingCount: pending.length, pendingChars: chars,
    withinCap: pending.length <= MAX_PENDING_RECORDS && chars + 1 <= MAX_PENDING_CHARS,
    markers: markers.map(r => ({ id: r.id, worldId: r.worldId, kind: r.kind, from: r.from, to: r.to, prefix: r.message.startsWith(SUMMARY) ? 'summary' : 'gap', message: r.message.slice(0, 80) })),
    pendingIds: pending.map(r => r.id) }
}

const check = (list, id, pass, detail, lane) => { list.push({ id, pass: !!pass, lane, detail }); return !!pass }

// ---------- run ----------
await mkdir(OUT, { recursive: true }); await mkdir(attempt, { recursive: false })
const { createServer: createViteServer } = await import('vite')
const vite = await createViteServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
const [sim, J, S] = await Promise.all([vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/services/playJournal.ts'), vite.ssrLoadModule('/src/services/saveService.ts')])
const gameJson = raw => S.serialize(J.unpackCheckpoint(raw).state, 0)

function legacyFixture(seedValue, pending) {
  const state = sim.createGame(seedValue)
  state.life.openingSeen = true
  const records = pending(state)
  const raw = J.packCheckpoint(state, { version: 1, worldId: 'legacy-world', pending: records }, 1_700_000_000_000)
  J.unpackCheckpoint(raw) // must be a loadable legacy checkpoint
  return { raw, seed: seedValue, records: records.length, worldTime: state.worldTime, worldSeed: state.worldSeed }
}
const bigRecord = (state, id, chars) => ({ id, worldId: 'legacy-world', at: 1_700_000_000_000, kind: 'action', from: state.worldTime, to: state.worldTime, characterId: state.activeCharacterId, message: 'x'.repeat(chars), events: [] })

const browser = new Browser(); const servers = []
const meta = { startedAt: iso(), head: await git('rev-parse', 'HEAD'), srcTree: await git('rev-parse', 'HEAD:src'), workingTreeClean: (await git('status', '--porcelain', '--', 'src')) === '', distFingerprint: await hashTree(DIST), node: process.version, chromePath: CHROME }
const results = { meta, scenarios: {}, checks: [] }
const C = results.checks
async function origin() { const s = await staticServer(); servers.push(s.server); return s.url }

try {
  await browser.start(attempt)
  meta.browser = browser.version.Browser

  // S0 quota probe (REAL BROWSER OBSERVATION)
  {
    const o = await origin(), cdp = await browser.page()
    await navigate(cdp, `${o}__seed`, 'true')
    const quota = await cdp.eval(`(()=>{let lo=0,hi=20_000_000;while(lo<hi){const mid=Math.ceil((lo+hi)/2);try{localStorage.setItem(${JSON.stringify(SAVE_KEY)},'x'.repeat(mid));lo=mid}catch{hi=mid-1}}localStorage.clear();return lo})()`)
    results.scenarios.quotaProbe = { lane: 'REAL BROWSER OBSERVATION', maxValueChars: quota, key: SAVE_KEY }
    await browser.closePage(cdp)
  }
  const realQuota = results.scenarios.quotaProbe.maxValueChars

  // S1 A — Legacy recovery at the real localStorage quota (REAL BROWSER OBSERVATION; fixture is controlled)
  {
    const lane = 'REAL BROWSER OBSERVATION'
    const base = legacyFixture(100016, s => [bigRecord(s, 'legacy-large', 10)])
    const pad = realQuota - 64 - base.raw.length
    const fx = legacyFixture(100016, s => [bigRecord(s, 'legacy-large', 10 + pad)])
    const sc = results.scenarios.A_realQuota = { lane, fixture: { kind: 'controlled legacy checkpoint: one oversized pending record sized to the real quota minus 64 chars', seed: fx.seed, checkpointChars: fx.raw.length, headroomChars: realQuota - fx.raw.length, sha256: sha(fx.raw) } }
    const o = await origin(), cdp = await browser.page()
    await seed(cdp, o, fx.raw)
    await navigate(cdp, o); await writerReady(cdp)
    const first = await cdp.eval('window.__o01.firstSave')
    const store0 = await cdp.eval(STORE)
    sc.afterLoad = { store: store0, setItemLog: await cdp.eval('window.__o01.setItemLog'), firstSave: first && journalStats(first, J), openingDialog: await cdp.eval('!!document.querySelector(".life-opening")') }
    check(C, 'A1 legacy checkpoint loads', store0?.writerReady && !store0.saveBlocked, store0, lane)
    check(C, 'A2 no reset required (no opening/rebuild, same seed)', !sc.afterLoad.openingDialog && first && J.unpackCheckpoint(first).state.worldSeed === fx.worldSeed, { openingDialog: sc.afterLoad.openingDialog }, lane)
    check(C, 'A3 pending compacted on first save', first && sc.afterLoad.firstSave.checkpointChars < fx.raw.length / 10 && !sc.afterLoad.firstSave.pendingIds.includes('legacy-large'), sc.afterLoad.firstSave && { chars: sc.afterLoad.firstSave.checkpointChars, ids: sc.afterLoad.firstSave.pendingIds }, lane)
    check(C, 'A4 compacted pending within 256 records / 256,000 chars', sc.afterLoad.firstSave?.withinCap, sc.afterLoad.firstSave && { count: sc.afterLoad.firstSave.pendingCount, chars: sc.afterLoad.firstSave.pendingChars }, lane)
    check(C, 'A5 summary + gap markers saved for legacy-world', ['summary', 'gap'].every(p => sc.afterLoad.firstSave?.markers.some(m => m.prefix === p && m.worldId === 'legacy-world')), sc.afterLoad.firstSave?.markers, lane)
    check(C, 'A-state compaction did not alter game state/RNG (first save == fixture)', first && gameJson(first) === gameJson(fx.raw), { equal: first && gameJson(first) === gameJson(fx.raw) }, lane)
    sc.screenshotLoad = await shot(cdp, 'a-legacy-loaded')
    // A6 normal action through the keyboard (move), A7 time flows, A8 manual save.
    const t0 = J.unpackCheckpoint(await saved(cdp)).state.worldTime
    const pos0 = await cdp.eval(`JSON.stringify(JSON.parse(localStorage.getItem('${SAVE_KEY}')).state?.characters?.[0]?.position ?? null)`)
    const moves = []
    for (const [k, c, vk] of [['ArrowRight', 'ArrowRight', 39], ['ArrowDown', 'ArrowDown', 40], ['ArrowLeft', 'ArrowLeft', 37], ['ArrowUp', 'ArrowUp', 38]]) {
      const before = await cdp.eval('window.__o01.setItemLog.length'); await key(cdp, k, c, vk); await delay(300)
      moves.push({ key: k, message: (await cdp.eval(STORE))?.message, saves: (await cdp.eval('window.__o01.setItemLog.length')) - before })
    }
    await delay(2500)
    const manual = await click(cdp, '.save-button')
    const afterAct = await cdp.eval(STORE), rawAct = await saved(cdp), tAct = J.unpackCheckpoint(rawAct).state.worldTime
    sc.afterActions = { moves, manualSaveButton: manual, store: afterAct, worldTimeBefore: t0, worldTimeAfter: tAct, positionBefore: pos0, journal: journalStats(rawAct, J), failedWrites: (await cdp.eval('window.__o01.setItemLog')).filter(e => e.threw).length }
    check(C, 'A6 normal game action succeeds (keyboard move recorded and saved)', moves.some(m => m.saves > 0) && !afterAct.saveError, moves, lane)
    check(C, 'A7 world time keeps advancing', tAct > t0, { t0, tAct }, lane)
    check(C, 'A8 save succeeds (manual save, no failed writes)', afterAct.message === '世界已儲存。' && sc.afterActions.failedWrites === 0 && afterAct.saveError === '', { message: afterAct.message, failedWrites: sc.afterActions.failedWrites }, lane)
    // A9 reload keeps the same world; A10 continue playing after reload.
    const preReloadSeed = J.unpackCheckpoint(rawAct).state.worldSeed
    await cdp.call('Page.reload', {}); await waitFor(() => cdp.eval('!!document.querySelector(".game-shell")')); await writerReady(cdp)
    const initial = await cdp.eval('window.__o01.initial'), firstAfter = await cdp.eval('window.__o01.firstSave')
    await delay(2000)
    const segmentEnd = await saved(cdp)
    const tReload = J.unpackCheckpoint(firstAfter).state.worldTime
    await key(cdp, 'ArrowRight', 'ArrowRight', 39); await delay(1500)
    const afterReload = await cdp.eval(STORE), rawEnd = await saved(cdp)
    sc.afterReload = { store: afterReload, initialWorldTime: J.unpackCheckpoint(initial).state.worldTime, firstSaveWorldTime: tReload, endWorldTime: J.unpackCheckpoint(rawEnd).state.worldTime, journalWorldId: J.unpackCheckpoint(rawEnd).journal.worldId, journal: journalStats(rawEnd, J) }
    check(C, 'A9 reload restores the same world (seed, journal worldId, exact state)', J.unpackCheckpoint(rawEnd).state.worldSeed === preReloadSeed && sc.afterReload.journalWorldId === 'legacy-world' && gameJson(initial) === gameJson(firstAfter), { seed: preReloadSeed, journalWorldId: sc.afterReload.journalWorldId, initialEqualsFirstSave: gameJson(initial) === gameJson(firstAfter) }, lane)
    check(C, 'A10 play continues after reload', sc.afterReload.endWorldTime > sc.afterReload.initialWorldTime && !afterReload.saveError, { from: sc.afterReload.initialWorldTime, to: sc.afterReload.endWorldTime }, lane)
    // Determinism: replay the time-only segment after reload in Node and compare the game state.
    const a = J.unpackCheckpoint(firstAfter).state, b = J.unpackCheckpoint(segmentEnd).state, minutes = b.worldTime - a.worldTime
    sim.simulate(a, minutes)
    sc.determinism = { minutes, equal: S.serialize(a, 0) === S.serialize(b, 0), note: 'browser time-only segment (100 ms ticks) vs one Node simulate() call' }
    check(C, 'A-determinism browser segment equals Node replay', minutes > 0 && sc.determinism.equal, sc.determinism, lane)
    sc.screenshotEnd = await shot(cdp, 'a-after-reload')
    sc.pageErrors = pageErrors(cdp)
    await browser.closePage(cdp)
  }

  // S2 A/C — many small legacy records from two worlds under an injected 1,000,000-char quota (CONTROLLED FAILURE INJECTION)
  {
    const lane = 'CONTROLLED FAILURE INJECTION'
    const fx = legacyFixture(100017, s => Array.from({ length: 3000 }, (_, i) => ({ id: `small-${i}`, worldId: i < 1000 ? 'older-world' : 'legacy-world', at: 1_700_000_000_000 + i, kind: 'action', from: i, to: i + 1, characterId: s.activeCharacterId, message: `舊紀錄 ${i} `.padEnd(220, '·'), events: [] })))
    const sc = results.scenarios.C_manySmall = { lane, injectedQuotaChars: 1_000_000, fixture: { kind: 'controlled legacy checkpoint: 3,000 small records (1,000 older-world + 2,000 legacy-world)', checkpointChars: fx.raw.length, sha256: sha(fx.raw) } }
    const o = await origin(), cdp = await browser.page()
    await seed(cdp, o, fx.raw); await setCtl(cdp, { quota: 1_000_000 })
    await navigate(cdp, o); await writerReady(cdp)
    const first = await cdp.eval('window.__o01.firstSave')
    sc.afterLoad = { store: await cdp.eval(STORE), firstSave: first && journalStats(first, J) }
    check(C, 'C1 many small records compacted to cap on load', first && sc.afterLoad.firstSave.withinCap && sc.afterLoad.firstSave.pendingCount < 3000, first && { count: sc.afterLoad.firstSave.pendingCount, chars: sc.afterLoad.firstSave.pendingChars }, lane)
    check(C, 'C2 markers attributed per source world', ['older-world', 'legacy-world'].every(w => sc.afterLoad.firstSave?.markers.some(m => m.worldId === w)), sc.afterLoad.firstSave?.markers, lane)
    await key(cdp, 'ArrowRight', 'ArrowRight', 39); await delay(1500)
    const st = await cdp.eval(STORE)
    check(C, 'C3 world continues under injected quota', !st.saveError && J.unpackCheckpoint(await saved(cdp)).state.worldTime > fx.worldTime, st, lane)
    // C4 Reset under storage pressure: quota still 1,000,000; rebuild through the visible UI.
    await key(cdp, 'Escape', 'Escape', 27); await delay(300)
    await click(cdp, '.reset-trigger'); await click(cdp, '覆蓋存檔並重建世界')
    await waitFor(() => cdp.eval('!!document.querySelector(".life-opening")'))
    const rawReset = await saved(cdp), reset = J.unpackCheckpoint(rawReset), stReset = await cdp.eval(STORE)
    // The archive is healthy here, so markers and the reset record may already be flushed:
    // look for them in the checkpoint pending and the IndexedDB archive together.
    await delay(1500)
    const archived = await readArchive(cdp)
    const kept = [...J.unpackCheckpoint(await saved(cdp)).journal.pending, ...archived]
    sc.reset = { store: stReset, journal: journalStats(rawReset, J), newWorldId: reset.journal.worldId, archiveCount: archived.length,
      resetRecord: kept.some(r => r.kind === 'reset' && r.worldId === reset.journal.worldId), legacyMarkers: kept.filter(r => r.worldId === 'legacy-world' && (r.message.startsWith(SUMMARY) || r.message.startsWith(GAP))).length }
    check(C, 'C4 reset persists under storage pressure and keeps legacy markers', stReset.saveError === '' && reset.journal.worldId !== 'legacy-world' && sc.reset.journal.withinCap && sc.reset.resetRecord && sc.reset.legacyMarkers >= 2, sc.reset, lane)
    sc.screenshot = await shot(cdp, 'c-reset-under-quota')
    sc.pageErrors = pageErrors(cdp)
    await browser.closePage(cdp)
  }

  // S3 B — IndexedDB append failure, retry, save/reload, recovery (CONTROLLED FAILURE INJECTION) + read-only preview (REAL BROWSER)
  {
    const lane = 'CONTROLLED FAILURE INJECTION'
    const fx = legacyFixture(100018, s => [bigRecord(s, 'legacy-dropped', 400_000), { ...bigRecord(s, 'legacy-kept', 100), message: '最新的一筆舊紀錄' }])
    const sc = results.scenarios.B_indexedDb = { lane, fixture: { kind: 'controlled legacy checkpoint: 400,000-char record + one small record', checkpointChars: fx.raw.length, sha256: sha(fx.raw) } }
    const o = await origin(), cdp = await browser.page()
    await seed(cdp, o, fx.raw); await setCtl(cdp, { idbFail: true })
    await navigate(cdp, o); await writerReady(cdp)
    const snapshots = new Map()
    const remember = raw => { for (const r of J.unpackCheckpoint(raw).journal.pending) { const v = JSON.stringify(r); const prev = snapshots.get(r.id); if (prev && prev !== v) snapshots.set(r.id, 'CONFLICT'); else snapshots.set(r.id, v) } }
    remember(await cdp.eval('window.__o01.firstSave'))
    const attemptsAt = []
    for (let s = 0; s < 6; s++) { await delay(5000); attemptsAt.push({ second: (s + 1) * 5, attempts: await cdp.eval('window.__o01.idbWriteAttempts') }); remember(await saved(cdp)) }
    const stFail = await cdp.eval(STORE)
    sc.outage = { attemptsAt, store: stFail, journal: journalStats(await saved(cdp), J) }
    check(C, 'B1 archive outage does not block the world (saves ok, time advances)', stFail.saveError === '' && stFail.speed > 0 && J.unpackCheckpoint(await saved(cdp)).state.worldTime > fx.worldTime, stFail, lane)
    check(C, 'B2 retry is bounded by backoff (<= 8 write attempts in 30 s)', attemptsAt.at(-1).attempts >= 2 && attemptsAt.at(-1).attempts <= 8, attemptsAt, lane)
    check(C, 'B3 journal error shown while archive is down', /遊玩紀錄|待補寫/.test(stFail.journalError), stFail.journalError, lane)
    sc.screenshotOutage = await shot(cdp, 'b-archive-outage')
    // Save / reload during the outage.
    const preReload = journalStats(await saved(cdp), J)
    await cdp.call('Page.reload', {}); await waitFor(() => cdp.eval('!!document.querySelector(".game-shell")')); await writerReady(cdp)
    const reloaded = journalStats(await cdp.eval('window.__o01.initial'), J)
    remember(await saved(cdp))
    check(C, 'B4 pending markers survive save/reload during outage', preReload.markers.every(m => reloaded.pendingIds.includes(m.id)) && reloaded.worldId === 'legacy-world', { before: preReload.markers.map(m => m.id), after: reloaded.pendingIds.length }, lane)
    // Read-only preview: a second tab cannot acquire the writer lock and must not write anything.
    const preview = await browser.page()
    const beforePreview = sha(await saved(cdp))
    await navigate(preview, o); await delay(3000)
    sc.readOnlyPreview = { lane: 'REAL BROWSER OBSERVATION', previewSaveWrites: await preview.eval('window.__o01.setItemLog.length'), previewIdbWrites: await preview.eval('window.__o01.idbWriteAttempts'), previewStore: await preview.eval(STORE) }
    check(C, 'B5 read-only preview tab never writes checkpoint or archive', sc.readOnlyPreview.previewSaveWrites === 0 && sc.readOnlyPreview.previewIdbWrites === 0 && sc.readOnlyPreview.previewStore?.writerReady === false, sc.readOnlyPreview, 'REAL BROWSER OBSERVATION')
    sc.readOnlyPreview.screenshot = await shot(preview, 'b-read-only-preview')
    sc.readOnlyPreview.pageErrors = pageErrors(preview)
    await browser.closePage(preview)
    sc.readOnlyPreview.writerTabCheckpointChangedMeanwhile = beforePreview !== sha(await saved(cdp))
    // Recovery: archive returns; manual save clears the backoff timer and flushes now.
    await setCtl(cdp, { idbFail: false })
    await click(cdp, '.save-button')
    await waitFor(async () => J.unpackCheckpoint(await saved(cdp)).journal.pending.length === 0, 30000)
    const archive = await readArchive(cdp)
    const stOk = await cdp.eval(STORE)
    const ids = archive.map(r => r.id)
    // Once a record is in a saved checkpoint it is persisted and may only be replaced under a new id,
    // so every saved snapshot of an id, and its archived copy, must be byte-identical.
    const conflicts = archive.filter(r => snapshots.get(r.id) === 'CONFLICT' || (snapshots.has(r.id) && snapshots.get(r.id) !== JSON.stringify(r)))
    sc.recovery = { store: stOk, archiveCount: archive.length, uniqueIds: new Set(ids).size, markerIds: archive.filter(r => r.message.startsWith(SUMMARY) || r.message.startsWith(GAP)).map(r => ({ id: r.id, worldId: r.worldId })), droppedPresent: ids.includes('legacy-dropped'), conflictIds: conflicts.map(r => r.id) }
    check(C, 'B6 pending drains after archive recovery; journal error cleared', stOk.pendingRecords === 0 && stOk.journalError === '', stOk, lane)
    check(C, 'B7 summary/gap markers appended to the archive after recovery', sc.recovery.markerIds.some(m => m.worldId === 'legacy-world'), sc.recovery.markerIds, lane)
    check(C, 'B8 dropped (compacted) record never sent', !sc.recovery.droppedPresent, { droppedPresent: sc.recovery.droppedPresent }, lane)
    check(C, 'B9 no same-id/different-content in archive (ids unique, match pending snapshots)', sc.recovery.uniqueIds === archive.length && conflicts.length === 0, { archive: archive.length, unique: sc.recovery.uniqueIds, conflicts: sc.recovery.conflictIds }, lane)
    sc.idbInjectedFailures = await cdp.eval('window.__o01.idbInjectedFailures')
    sc.pageErrors = pageErrors(cdp)
    await browser.closePage(cdp)
  }

  // S4 C — normal pending not compacted; failed write keeps the previous valid save (fresh game)
  {
    const sc = results.scenarios.C_negative = {}
    const o = await origin(), cdp = await browser.page()
    await navigate(cdp, o); await writerReady(cdp)
    await waitFor(() => cdp.eval('!!document.querySelector(".life-opening button.primary:not(:disabled)")'))
    await click(cdp, '.life-opening button.primary')
    await setCtl(cdp, { idbFail: true }) // let pending accumulate so compaction would be visible
    for (const [k, c, vk] of [['ArrowRight', 'ArrowRight', 39], ['ArrowDown', 'ArrowDown', 40], ['ArrowLeft', 'ArrowLeft', 37], ['ArrowUp', 'ArrowUp', 38], ['ArrowRight', 'ArrowRight', 39]]) { await key(cdp, k, c, vk); await delay(300) }
    await delay(2000)
    const normal = journalStats(await saved(cdp), J)
    sc.normal = { lane: 'REAL BROWSER OBSERVATION (archive held by injected outage so pending stays visible)', journal: { count: normal.pendingCount, chars: normal.pendingChars, markers: normal.markers.length }, store: await cdp.eval(STORE) }
    check(C, 'C5 normal-size pending is not compacted (no markers, no compaction message)', normal.pendingCount > 1 && normal.markers.length === 0 && !/超過上限/.test(sc.normal.store.journalError), sc.normal, 'CONTROLLED FAILURE INJECTION')
    await setCtl(cdp, { idbFail: false }); await click(cdp, '.save-button'); await delay(1500)
    // Failed write: every checkpoint write throws; the previous valid save must remain byte-identical.
    const before = await saved(cdp)
    await setCtl(cdp, { quota: 0 })
    await key(cdp, 'ArrowDown', 'ArrowDown', 40); await delay(800)
    const stFail = await cdp.eval(STORE), during = await saved(cdp)
    sc.failedWrite = { lane: 'CONTROLLED FAILURE INJECTION', store: stFail, unchanged: during === before, loadable: (() => { try { J.unpackCheckpoint(during); return true } catch { return false } })() }
    check(C, 'C6 failed write keeps previous valid save and pauses time', sc.failedWrite.unchanged && sc.failedWrite.loadable && /存檔失敗/.test(stFail.saveError) && stFail.speed === 0, sc.failedWrite, 'CONTROLLED FAILURE INJECTION')
    sc.failedWrite.screenshot = await shot(cdp, 'c-save-failure')
    await setCtl(cdp, {}); await click(cdp, '.save-button'); await delay(500)
    const stBack = await cdp.eval(STORE)
    check(C, 'C7 save recovers after storage returns', stBack.saveError === '' && (await saved(cdp)) !== before, stBack, 'CONTROLLED FAILURE INJECTION')
    sc.pageErrors = pageErrors(cdp)
    await browser.closePage(cdp)
  }
} catch (error) {
  results.failure = { at: iso(), error: String(error), stack: error.stack }
} finally {
  results.runtime = await browser.close().catch(error => ({ cleanupError: String(error) }))
  for (const s of servers) s.close()
  await vite.close()
}
results.finishedAt = iso()
results.summary = { checks: C.length, passed: C.filter(c => c.pass).length, failed: C.filter(c => !c.pass).map(c => c.id), runnerFailure: results.failure?.error ?? null }
await writeFile(path.join(attempt, 'results.json'), `${JSON.stringify(results, null, 2)}\n`, { flag: 'wx' })
const files = []
for (const f of (await readdir(attempt)).sort()) files.push({ file: f, bytes: (await stat(path.join(attempt, f))).size, sha256: sha(await readFile(path.join(attempt, f))) })
await writeFile(path.join(attempt, 'manifest.json'), `${JSON.stringify({ attempt: path.relative(ROOT, attempt).replaceAll('\\', '/'), files }, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ attempt: path.relative(ROOT, attempt).replaceAll('\\', '/'), ...results.summary }))
