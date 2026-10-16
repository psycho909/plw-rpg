// Post-RC hardening: bounded production-Chromium measurements for
//   B2 — IndexedDB journal growth, quota estimate, readAll()/export memory at large archive sizes;
//   E  — S-03 save cost at x1 / x20 in a fresh and a high-history world.
// Controlled data only: each scenario runs on a fresh origin (own server port) and a
// disposable profile. Archives are seeded through the app's own IndexedDB schema.
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, readdir, mkdir, writeFile, stat, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = process.cwd()
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(ROOT, 'reports/v2/20261016-final-qa-rc/post-rc/runner')
const DIST = path.join(ROOT, 'dist')
const SAVE_KEY = 'oakvale-v1'
const SECONDS = Number(process.env.PERF_SECONDS ?? 60)
const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '')
const attempt = path.join(OUT, `attempt-${stamp}-storage-perf`)
const sha = value => createHash('sha256').update(value).digest('hex')
const iso = () => new Date().toISOString()

async function git(...args) {
  const r = spawn('git', args, { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  let out = ''
  for await (const chunk of r.stdout) out += chunk
  return out.trim()
}
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
      const p = this.pending.get(packet.id); if (!p) return
      this.pending.delete(packet.id); packet.error ? p.reject(new Error(packet.error.message)) : p.resolve(packet.result)
    })
    return this
  }
  call(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout ${method}`)) }, 180000)
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

// Instrumentation injected before page scripts: timing of every game-loop interval
// callback (advance + save), of checkpoint setItem calls, rAF frame gaps and long tasks.
const HOOKS = `(() => {
  const m = window.__perf = { ticks: [], saves: [], frames: [], longTasks: [] }
  const setItem = Storage.prototype.setItem
  Storage.prototype.setItem = function (key, value) {
    if (key !== '${SAVE_KEY}') return setItem.call(this, key, value)
    const t = performance.now(); try { return setItem.call(this, key, value) } finally { m.saves.push([performance.now() - t, String(value).length]) }
  }
  const si = window.setInterval
  window.setInterval = function (fn, ms, ...rest) {
    if (typeof fn !== 'function' || ms !== 100) return si.call(this, fn, ms, ...rest)
    return si.call(this, function (...a) { const t = performance.now(); try { return fn.apply(this, a) } finally { m.ticks.push(performance.now() - t) } }, ms, ...rest)
  }
  let last = 0
  const frame = t => { if (last) m.frames.push(t - last); last = t; requestAnimationFrame(frame) }
  requestAnimationFrame(frame)
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) m.longTasks.push(e.duration) }).observe({ type: 'longtask', buffered: true }) } catch {}
})()`
const STORE = `(()=>{const g=document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('game');return g?{writerReady:g.writerReady,saveError:g.saveError,journalError:g.journalError,pendingRecords:g.pendingRecords,speed:g.speed,worldTime:g.state.worldTime}:null})()`

class Browser {
  async start(dir) {
    this.profile = path.join(dir, 'chrome-profile'); await mkdir(this.profile, { recursive: false })
    this.chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--enable-precise-memory-info', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${this.profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
    this.port = await waitFor(async () => Number((await readFile(path.join(this.profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]))
    this.version = await (await fetch(`http://127.0.0.1:${this.port}/json/version`)).json()
  }
  async page() {
    const target = await (await fetch(`http://127.0.0.1:${this.port}/json/new?about:blank`, { method: 'PUT' })).json()
    const cdp = await new Cdp(target.webSocketDebuggerUrl).open()
    cdp.targetId = target.id
    for (const d of ['Page', 'Runtime', 'Log', 'Performance']) await cdp.call(`${d}.enable`)
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
const pageErrors = cdp => cdp.events.filter(p => p.method === 'Runtime.exceptionThrown' || (p.method === 'Log.entryAdded' && p.params.entry.level === 'error'))
  .map(p => p.method === 'Runtime.exceptionThrown' ? p.params.exceptionDetails?.exception?.description ?? p.params.exceptionDetails?.text : p.params.entry.text)
async function navigate(cdp, url, ready = '!!document.querySelector(".game-shell")') {
  await cdp.call('Page.navigate', { url })
  await waitFor(() => cdp.eval(`document.readyState==='complete' && location.href===${JSON.stringify(url)} && (${ready})`), 60000)
}
const heap = async cdp => Object.fromEntries((await cdp.call('Performance.getMetrics')).metrics.filter(m => ['JSHeapUsedSize', 'JSHeapTotalSize'].includes(m.name)).map(m => [m.name, m.value]))
const estimate = cdp => cdp.eval('navigator.storage.estimate().then(e=>({usage:e.usage,quota:e.quota,idb:e.usageDetails?.indexedDB??null}))')
function pct(values, p) { if (!values.length) return null; const s = [...values].sort((a, b) => a - b); return +s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))].toFixed(3) }
const summary = v => ({ n: v.length, p50: pct(v, 50), p95: pct(v, 95), p99: pct(v, 99), max: v.length ? +Math.max(...v).toFixed(3) : null })

// Seed archive records through the app schema (object store 'records', keyPath ordinal, unique index 'id').
const SEED_ARCHIVE = (count, chars) => `new Promise((res,rej)=>{const q=indexedDB.open('oakvale-play-journal',1);
  q.onupgradeneeded=()=>{const s=q.result.createObjectStore('records',{keyPath:'ordinal',autoIncrement:true});s.createIndex('id','id',{unique:true})};
  q.onsuccess=()=>{const db=q.result;let i=0;const pad='時'.repeat(${chars});
    const batch=()=>{if(i>=${count}){db.close();res(i);return}const t=db.transaction('records','readwrite'),s=t.objectStore('records');
      for(let k=0;k<500&&i<${count};k++,i++)s.add({id:'seed-'+i,worldId:'seed-world',at:1700000000000+i,kind:'time',from:i*60,to:i*60+60,characterId:'c',message:pad,events:[]});
      t.oncomplete=batch;t.onerror=()=>rej(t.error)};batch()};q.onerror=()=>rej(q.error)})`

await mkdir(attempt, { recursive: true })
const { createServer: createViteServer } = await import('vite')
const vite = await createViteServer({ configFile: false, root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } })
const [sim, J, CFG] = await Promise.all([vite.ssrLoadModule('/src/engine/simulation.ts'), vite.ssrLoadModule('/src/services/playJournal.ts'), vite.ssrLoadModule('/src/data/config.ts')])
const browser = new Browser(); const servers = []
const results = { meta: { startedAt: iso(), head: await git('rev-parse', 'HEAD'), srcTree: await git('rev-parse', 'HEAD:src'), srcClean: (await git('status', '--porcelain', '--', 'src')) === '', distFingerprint: await hashTree(DIST), node: process.version, secondsPerRun: SECONDS, platform: 'desktop Windows headless Chrome; CPU throttle lanes are desktop emulation, NOT a physical device' }, B2: {}, E: {} }
async function origin() { const s = await staticServer(); servers.push(s.server); return s.url }

// High-history world: a legal world simulated for 10 game years by the engine (controlled fixture).
const high = sim.createGame(100019); high.life.openingSeen = true
sim.simulate(high, 10 * CFG.CONFIG.seasons.length * 30 * 1440)
const highRaw = J.packCheckpoint(high, J.emptyJournal(), Date.now())
results.highHistoryFixture = { seed: 100019, simulatedGameYears: 10, checkpointChars: highRaw.length, events: high.events.length, sha256: sha(highRaw) }

try {
  await browser.start(attempt)
  results.meta.browser = browser.version.Browser

  // ---------- B2: archive growth / readAll / export ----------
  for (const [label, count, chars] of [['1h-x1', 400, 3700], ['10h-x1', 4000, 3700], ['50h-x1', 20000, 3700]]) {
    const o = await origin(), cdp = await browser.page()
    await navigate(cdp, `${o}__seed`, 'true')
    const before = await estimate(cdp)
    const t0 = Date.now(); await cdp.eval(SEED_ARCHIVE(count, chars)); const seedMs = Date.now() - t0
    const after = await estimate(cdp)
    await navigate(cdp, o)
    await waitFor(() => cdp.eval(`(${STORE})?.writerReady === true`), 60000)
    await cdp.call('HeapProfiler.collectGarbage').catch(() => {})
    const heapBefore = await heap(cdp)
    // Export through the visible menu button; capture the produced Blob size instead of downloading.
    await cdp.eval(`(()=>{window.__blob=null;const c=URL.createObjectURL;URL.createObjectURL=b=>{window.__blob={size:b.size,at:performance.now()};return c.call(URL,b)};HTMLAnchorElement.prototype.click=function(){}})()`)
    // A fresh origin opens on the non-dismissible opening dialog; start life first, then open the menu.
    await waitFor(() => cdp.eval('!!document.querySelector(".life-opening button.primary:not(:disabled)")'))
    await cdp.eval('document.querySelector(".life-opening button.primary").click()'); await delay(500)
    await cdp.eval('document.querySelector(".menu-trigger").click()'); await delay(300)
    const t1 = await cdp.eval('performance.now()')
    await cdp.eval(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim().startsWith('匯出遊玩紀錄')).click()`)
    const blob = await waitFor(() => cdp.eval('window.__blob'), 120000, 100)
    const heapAfter = await heap(cdp)
    results.B2[label] = { records: count, recordChars: chars, approxArchiveChars: count * (chars + 160), seedMs, estimateBefore: before, estimateAfterSeed: after, exportMs: +(blob.at - t1).toFixed(1), exportBlobBytes: blob.size, heapBefore, heapAfterExport: heapAfter, longTasksMs: (await cdp.eval('window.__perf.longTasks')).map(x => +x.toFixed(1)), store: await cdp.eval(STORE), pageErrors: pageErrors(cdp) }
    await browser.closePage(cdp)
  }

  // ---------- E: S-03 save cost ----------
  const lanes = [['fresh', null, 1, 1], ['fresh', null, 20, 1], ['high-history', highRaw, 1, 1], ['high-history', highRaw, 20, 1], ['high-history', highRaw, 20, 4]]
  for (const [world, raw, speed, throttle] of lanes) {
    const label = `${world}-x${speed}${throttle > 1 ? `-cpu${throttle}x` : ''}`
    const o = await origin(), cdp = await browser.page()
    if (raw) { await navigate(cdp, `${o}__seed`, 'true'); await cdp.eval(`localStorage.setItem('${SAVE_KEY}', ${JSON.stringify(raw)})`) }
    await navigate(cdp, o)
    await waitFor(() => cdp.eval(`(${STORE})?.writerReady === true`), 60000)
    if (!raw) { await waitFor(() => cdp.eval('!!document.querySelector(".life-opening button.primary:not(:disabled)")')); await cdp.eval('document.querySelector(".life-opening button.primary").click()'); await delay(500) }
    if (throttle > 1) await cdp.call('Emulation.setCPUThrottlingRate', { rate: throttle })
    await cdp.eval(`[...document.querySelectorAll('.speed-controls button')].find(b=>b.innerText.trim()==='×${speed}').click()`)
    await cdp.eval('(()=>{const m=window.__perf;m.ticks.length=0;m.saves.length=0;m.frames.length=0;m.longTasks.length=0})()')
    const t0 = await cdp.eval(`(${STORE}).worldTime`), est0 = await estimate(cdp), heap0 = await heap(cdp)
    await delay(SECONDS * 1000)
    const m = await cdp.eval('window.__perf'), st = await cdp.eval(STORE), est1 = await estimate(cdp), heap1 = await heap(cdp)
    if (throttle > 1) await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 })
    // Reload continuation: the saved world must load and keep moving.
    await cdp.call('Page.reload', {}); await waitFor(() => cdp.eval(`(${STORE})?.writerReady === true`), 60000); await delay(1500)
    const reload = await cdp.eval(STORE)
    results.E[label] = { world, speed, cpuThrottle: throttle, worldMinutesAdvanced: st.worldTime - t0, tickMs: summary(m.ticks), setItemMs: summary(m.saves.map(s => s[0])), checkpointChars: { min: Math.min(...m.saves.map(s => s[1])), max: Math.max(...m.saves.map(s => s[1])) }, savesPerSecond: +(m.saves.length / SECONDS).toFixed(2), frameGapMs: summary(m.frames), framesOver50ms: m.frames.filter(f => f > 50).length, longTasks: { count: m.longTasks.length, maxMs: m.longTasks.length ? +Math.max(...m.longTasks).toFixed(1) : 0 }, heapBefore: heap0, heapAfter: heap1, storageUsageDelta: est1.usage - est0.usage, idbUsage: [est0.idb, est1.idb], store: st, reloadContinues: !!reload && reload.worldTime >= st.worldTime && !reload.saveError, reloadStore: reload, pageErrors: pageErrors(cdp) }
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
await writeFile(path.join(attempt, 'results.json'), `${JSON.stringify(results, null, 2)}\n`, { flag: 'wx' })
const files = []
for (const f of (await readdir(attempt)).sort()) files.push({ file: f, bytes: (await stat(path.join(attempt, f))).size, sha256: sha(await readFile(path.join(attempt, f))) })
await writeFile(path.join(attempt, 'manifest.json'), `${JSON.stringify({ attempt: path.relative(ROOT, attempt).replaceAll('\\', '/'), files }, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ attempt: path.relative(ROOT, attempt).replaceAll('\\', '/'), failure: results.failure?.error ?? null }))
