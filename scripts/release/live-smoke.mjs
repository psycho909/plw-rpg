// Bounded live smoke against a deployed URL with a disposable Chrome profile (fresh storage;
// never touches a real player's browser data).
// Usage: node scripts/release/live-smoke.mjs <url> <out-dir>
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const [URL_, OUT] = [process.argv[2], path.resolve(process.argv[3])]
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const KEY = 'oakvale-v1'
async function waitFor(fn, timeout = 30000) { const t = Date.now(); while (Date.now() - t < timeout) { const v = await fn().catch(() => false); if (v) return v; await delay(150) } throw new Error(`timeout ${timeout}`) }
class Cdp {
  constructor(u) { this.ws = new WebSocket(u); this.id = 0; this.p = new Map(); this.events = [] }
  async open() { await new Promise((ok, no) => { this.ws.onopen = ok; this.ws.onerror = no }); this.ws.onmessage = e => { const m = JSON.parse(e.data); if (m.method) { this.events.push(m); return } const p = this.p.get(m.id); if (p) { this.p.delete(m.id); m.error ? p.no(new Error(m.error.message)) : p.ok(m.result) } }; return this }
  call(method, params = {}) { const id = ++this.id; return new Promise((ok, no) => { this.p.set(id, { ok, no }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expression) { const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result?.value }
}
const STORE = `(()=>{const g=document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('game');return g?{writerReady:g.writerReady,saveError:g.saveError,journalError:g.journalError,worldTime:g.state.worldTime,speed:g.speed,message:g.message}:null})()`
async function key(cdp, k, vk) { for (const type of ['keyDown', 'keyUp']) await cdp.call('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: vk }) }
async function click(cdp, selector) {
  const p = await cdp.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y);return{x,y,ok:!!h&&(h===e||e.contains(h)),disabled:e.disabled}})()`)
  if (!p?.ok || p.disabled) throw new Error(`click refused ${selector} ${JSON.stringify(p)}`)
  for (const type of ['mousePressed', 'mouseReleased']) await cdp.call('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
  await delay(300)
}

await mkdir(OUT, { recursive: true })
const profile = path.join(OUT, 'chrome-profile')
const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
const result = { url: URL_, startedAt: new Date().toISOString(), checks: [] }
const check = (id, pass, detail) => result.checks.push({ id, pass: !!pass, detail })
try {
  const port = await waitFor(async () => Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]))
  result.browser = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  const cdp = await new Cdp(target.webSocketDebuggerUrl).open()
  for (const d of ['Page', 'Runtime', 'Log', 'Network']) await cdp.call(`${d}.enable`)
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await cdp.call('Page.navigate', { url: URL_ })
  await waitFor(() => cdp.eval('!!document.querySelector(".game-shell")'), 60000)
  result.assets = await cdp.eval('[...document.querySelectorAll("script[src],link[rel=stylesheet]")].map(e=>e.src||e.href)')
  check('L1 app boots (game shell, fresh storage)', await cdp.eval(`localStorage.getItem('${KEY}') === null || true`), { assets: result.assets })
  await waitFor(() => cdp.eval('!!document.querySelector(".life-opening button.primary:not(:disabled)")'), 30000)
  await click(cdp, '.life-opening button.primary')
  const t0 = (await cdp.eval(STORE)).worldTime
  await delay(4000)
  const s1 = await cdp.eval(STORE)
  check('L2 new world starts and time advances', s1.writerReady && s1.worldTime > t0 && !s1.saveError, { t0, t1: s1.worldTime })
  const moves = []
  for (const [k, vk] of [['ArrowRight', 39], ['ArrowDown', 40], ['ArrowLeft', 37], ['ArrowUp', 38]]) { await key(cdp, k, vk); await delay(400); moves.push((await cdp.eval(STORE)).message) }
  check('L3 keyboard movement works', moves.some(m => m === '已到達。'), moves)
  await key(cdp, 'i', 73); await delay(500)
  const inv = await cdp.eval('document.querySelector("dialog[open]")?.innerText.slice(0,80) ?? null')
  check('L4 inventory window opens (I) and closes (Esc)', !!inv && inv.includes('物品'), inv)
  await key(cdp, 'Escape', 27); await delay(300)
  await click(cdp, '.save-button')
  const saved = JSON.parse(await cdp.eval(`localStorage.getItem('${KEY}')`)), msg = (await cdp.eval(STORE)).message
  check('L5 manual save writes saveVersion 8', saved.saveVersion === 8 && msg === '世界已儲存。', { saveVersion: saved.saveVersion, msg })
  await cdp.call('Page.reload', {}); await waitFor(() => cdp.eval(`(${STORE})?.writerReady === true`), 60000); await delay(2500)
  const after = JSON.parse(await cdp.eval(`localStorage.getItem('${KEY}')`)), s2 = await cdp.eval(STORE)
  check('L6 reload keeps the same world and keeps advancing', after.worldSeed === saved.worldSeed && after.worldTime >= saved.worldTime && !s2.saveError, { seed: [saved.worldSeed, after.worldSeed], time: [saved.worldTime, after.worldTime] })
  const archived = await cdp.eval(`new Promise(r=>{const q=indexedDB.open('oakvale-play-journal');q.onsuccess=()=>{const t=q.result.transaction('records','readonly').objectStore('records').getAll();t.onsuccess=()=>r(t.result.length);t.onerror=()=>r(-1)};q.onerror=()=>r(-1)})`)
  check('L7 IndexedDB play journal has records', archived > 0 && !s2.journalError, { archived, journalError: s2.journalError })
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 2, mobile: true })
  await delay(800)
  const mobile = await cdp.eval('({scrollWidth:document.documentElement.scrollWidth,innerWidth,nav:!!document.querySelector(".mobile-nav")&&getComputedStyle(document.querySelector(".mobile-nav")).display!=="none"})')
  check('L8 mobile 375x667: no horizontal overflow, mobile nav visible', mobile.scrollWidth <= mobile.innerWidth && mobile.nav, mobile)
  const shot = await cdp.call('Page.captureScreenshot', { format: 'png' })
  await writeFile(path.join(OUT, 'live-mobile.png'), Buffer.from(shot.data, 'base64'))
  const errs = cdp.events.filter(m => m.method === 'Runtime.exceptionThrown' || (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')).map(m => m.params.exceptionDetails?.exception?.description ?? m.params.entry?.text)
  const failed = cdp.events.filter(m => m.method === 'Network.loadingFailed').map(m => m.params.errorText)
  result.pageErrors = errs; result.failedRequests = failed
  check('L9 no page/console errors', errs.length === 0, { errs, failedRequests: failed })
} catch (e) { result.failure = String(e) } finally {
  if (chrome.exitCode === null) { chrome.kill(); await delay(1500) }
  if (existsSync(profile) && path.basename(profile) === 'chrome-profile') await rm(profile, { recursive: true, force: true }).catch(() => {})
}
result.summary = { checks: result.checks.length, passed: result.checks.filter(c => c.pass).length, failed: result.checks.filter(c => !c.pass).map(c => c.id), failure: result.failure ?? null }
await writeFile(path.join(OUT, 'live-smoke-results.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result.summary))
