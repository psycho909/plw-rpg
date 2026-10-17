// Release check: in-place browser upgrade from the current production build (V1) to the
// release build on the SAME origin, using a disposable Chrome profile and a fresh V1 save
// created by playing the V1 build (no real player data).
// Usage: node scripts/release/v1-upgrade.mjs <old-dist-dir> <new-dist-dir> <out-dir>
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, readdir, mkdir, writeFile, stat, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const [OLD, NEW, OUT] = process.argv.slice(2).map(p => path.resolve(p))
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const KEY = 'oakvale-v1'
const sha = v => createHash('sha256').update(v).digest('hex')
async function waitFor(fn, timeout = 30000) { const t = Date.now(); while (Date.now() - t < timeout) { const v = await fn().catch(() => false); if (v) return v; await delay(150) } throw new Error(`timeout ${timeout}`) }
async function treeHash(dir) { const rows = []; for (const f of (await readdir(dir, { recursive: true, withFileTypes: true })).filter(e => e.isFile())) { const full = path.join(f.parentPath ?? f.path, f.name); rows.push(`${path.relative(dir, full).replaceAll('\\', '/')}:${sha(await readFile(full))}`) } return sha(rows.sort().join('\n')) }

let root = OLD
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html'
  const full = path.resolve(root, rel)
  if (!full.startsWith(root)) { res.writeHead(400); res.end(); return }
  let body; try { body = await readFile(full) } catch { body = await readFile(path.join(root, 'index.html')) }
  res.writeHead(200, { 'content-type': mime[path.extname(full)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body)
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/`

class Cdp {
  constructor(u) { this.ws = new WebSocket(u); this.id = 0; this.p = new Map(); this.events = [] }
  async open() { await new Promise((ok, no) => { this.ws.onopen = ok; this.ws.onerror = no }); this.ws.onmessage = e => { const m = JSON.parse(e.data); if (m.method) { this.events.push(m); return } const p = this.p.get(m.id); if (p) { this.p.delete(m.id); m.error ? p.no(new Error(m.error.message)) : p.ok(m.result) } }; return this }
  call(method, params = {}) { const id = ++this.id; return new Promise((ok, no) => { this.p.set(id, { ok, no }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expression) { const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result?.value }
}
const errors = cdp => cdp.events.filter(m => m.method === 'Runtime.exceptionThrown' || (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')).map(m => m.params.exceptionDetails?.exception?.description ?? m.params.entry?.text)
async function key(cdp, k, vk) { for (const type of ['keyDown', 'keyUp']) await cdp.call('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: vk }) }
const STORE = `(()=>{const g=document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('game');return g?{writerReady:g.writerReady,saveError:g.saveError,journalError:g.journalError,worldTime:g.state.worldTime,openingSeen:g.state.life?.openingSeen}:null})()`

await mkdir(OUT, { recursive: true })
const profile = path.join(OUT, 'chrome-profile')
const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
const result = { startedAt: new Date().toISOString(), origin: url, oldDist: await treeHash(OLD), newDist: await treeHash(NEW), checks: [] }
const check = (id, pass, detail) => result.checks.push({ id, pass: !!pass, detail })
try {
  const port = await waitFor(async () => Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]))
  result.browser = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  const cdp = await new Cdp(target.webSocketDebuggerUrl).open()
  for (const d of ['Page', 'Runtime', 'Log']) await cdp.call(`${d}.enable`)
  // 1. Play the production V1 build and let it save.
  await cdp.call('Page.navigate', { url })
  await waitFor(() => cdp.eval('document.readyState==="complete" && !!document.querySelector("#app")?.children.length'))
  for (const [k, vk] of [['ArrowRight', 39], ['ArrowDown', 40], ['ArrowLeft', 37]]) { await key(cdp, k, vk); await delay(400) }
  await delay(11000) // V1 game loop saves at least every 10 s
  const v1 = await cdp.eval(`localStorage.getItem('${KEY}')`)
  const v1json = v1 && JSON.parse(v1)
  result.v1 = v1json && { saveVersion: v1json.saveVersion, worldSeed: v1json.worldSeed, worldTime: v1json.worldTime, chars: v1.length, sha256: sha(v1) }
  check('U1 production V1 build created a V1 save', v1json?.saveVersion === 1, result.v1)
  const v1Errors = errors(cdp)
  // 2. Same origin now serves the release build; reload = in-place upgrade.
  root = NEW
  cdp.events.length = 0
  await cdp.call('Page.reload', { ignoreCache: true })
  await waitFor(() => cdp.eval(`(${STORE})?.writerReady === true`), 60000)
  if (await cdp.eval('!!document.querySelector(".life-opening button.primary:not(:disabled)")')) { await cdp.eval('document.querySelector(".life-opening button.primary").click()'); await delay(500) }
  await delay(1500)
  const up = await cdp.eval(`localStorage.getItem('${KEY}')`), upj = JSON.parse(up), st = await cdp.eval(STORE)
  result.upgraded = { saveVersion: upj.saveVersion, worldSeed: upj.worldSeed, worldTime: upj.worldTime, journalPending: upj.playJournal?.pending?.map(r => r.kind), store: st }
  check('U2 release build loads the V1 save in place and writes saveVersion 8', upj.saveVersion === 8 && !st.saveError, result.upgraded)
  check('U3 same world after upgrade (seed kept, time not rolled back)', upj.worldSeed === v1json.worldSeed && upj.worldTime >= v1json.worldTime, { v1: [v1json.worldSeed, v1json.worldTime], v8: [upj.worldSeed, upj.worldTime] })
  check('U4 journal starts with an imported record', upj.playJournal?.pending?.[0]?.kind === 'imported' || upj.playJournal?.pending?.length === 0, upj.playJournal?.pending?.slice(0, 2).map(r => ({ kind: r.kind, message: r.message })))
  // 3. Play, reload, continue.
  await key(cdp, 'ArrowUp', 38); await delay(2500)
  const before = JSON.parse(await cdp.eval(`localStorage.getItem('${KEY}')`))
  await cdp.call('Page.reload', {}); await waitFor(() => cdp.eval(`(${STORE})?.writerReady === true`), 60000); await delay(2000)
  const after = JSON.parse(await cdp.eval(`localStorage.getItem('${KEY}')`)), st2 = await cdp.eval(STORE)
  check('U5 upgraded world saves, reloads and keeps advancing', after.worldSeed === v1json.worldSeed && after.worldTime >= before.worldTime && !st2.saveError, { before: before.worldTime, after: after.worldTime, store: st2 })
  const archived = await cdp.eval(`new Promise(r=>{const q=indexedDB.open('oakvale-play-journal');q.onsuccess=()=>{const t=q.result.transaction('records','readonly').objectStore('records').getAll();t.onsuccess=()=>r(t.result.length);t.onerror=()=>r(-1)};q.onerror=()=>r(-1)})`)
  check('U6 IndexedDB journal receives records after upgrade', archived > 0, { archived })
  result.v1PageErrors = v1Errors; result.releasePageErrors = errors(cdp)
  check('U7 no page/console errors on the release build', result.releasePageErrors.length === 0, result.releasePageErrors)
} catch (e) { result.failure = String(e) } finally {
  if (chrome.exitCode === null) { chrome.kill(); await delay(1500) }
  if (existsSync(profile) && path.basename(profile) === 'chrome-profile') await rm(profile, { recursive: true, force: true }).catch(() => {})
  server.close()
}
result.summary = { checks: result.checks.length, passed: result.checks.filter(c => c.pass).length, failed: result.checks.filter(c => !c.pass).map(c => c.id), failure: result.failure ?? null }
await writeFile(path.join(OUT, 'v1-upgrade-results.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result.summary))
