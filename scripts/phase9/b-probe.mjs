import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = process.cwd()
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const DIST = path.join(ROOT, 'dist')
const BASE = path.join(ROOT, 'reports/v2/20261015-ui-ux-polish/phase-09/b-runner')
const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace('.', '')
const DIR = path.join(BASE, `probe-${stamp}`)
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
    this.ws.addEventListener('message', e => { const p = JSON.parse(e.data); const w = this.pending.get(p.id); if (w) { this.pending.delete(p.id); p.error ? w.reject(Error(p.error.message)) : w.resolve(p.result) } })
    return this
  }
  call(method, params = {}) { const id = ++this.next; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`CDP timeout ${method}`)) }, 20000); this.pending.set(id, { resolve: x => { clearTimeout(timer); resolve(x) }, reject: e => { clearTimeout(timer); reject(e) } }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expression) { const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, userGesture: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result?.value }
  close() { this.ws.close() }
}
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url ?? '/', 'http://127.0.0.1')
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html'
    const full = path.resolve(DIST, rel)
    if (!full.startsWith(`${DIST}${path.sep}`)) throw Error('path escape')
    let body
    try { body = await readFile(full) } catch { body = await readFile(path.join(DIST, 'index.html')) }
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
    res.writeHead(200, { 'content-type': mime[path.extname(full)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body)
  } catch { res.writeHead(400); res.end('bad request') }
})
await mkdir(BASE, { recursive: true }); await mkdir(DIR, { recursive: false })
assert(existsSync(CHROME) && existsSync(path.join(DIST, 'index.html')), 'System Chrome and rebuilt production dist are required')
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${server.address().port}/`
const profile = path.join(DIR, 'chrome-profile')
let chrome, browser, cdp, chromeStderr = ''
const result = { startedAt: iso(), attempt: path.relative(ROOT, DIR).replaceAll('\\', '/'), lane: 'fresh save; visible UI only; production dist', url, forestDetails: [], notes: null, hintDestination: null, errors: [] }
const record = async (event, detail) => appendFile(path.join(DIR, 'actions.ndjson'), `${JSON.stringify({ at: iso(), event, detail })}\n`)
const screenshot = async name => { const raw = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); const file = `${name}.png`; await writeFile(path.join(DIR, file), Buffer.from(raw.data, 'base64'), { flag: 'wx' }); return { file, bytes: (await stat(path.join(DIR, file))).size } }
const text = async selector => cdp.eval(`document.querySelector(${JSON.stringify(selector)})?.innerText?.trim() ?? null`)
async function clickSelector(selector, label) {
  const info = await waitFor(() => cdp.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||!e.getClientRects().length||e.disabled)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);return{x,y,tag:e.tagName,text:(e.innerText||'').trim().slice(0,100),topTag:top?.tagName,topText:(top?.innerText||'').trim().slice(0,100),verified:!!top&&(top===e||e.contains(top))}})()`), 5000)
  assert(info?.verified, `${label}: elementFromPoint did not verify target: ${JSON.stringify(info)}`)
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp.call('Input.dispatchMouseEvent', { type, x: info.x, y: info.y, button: 'left', clickCount: 1 })
  await delay(250); await record(label, { ...info, clickSent: true }); return info
}
async function clickButtonText(needle, label) {
  const info = await cdp.eval(`(()=>{const q=${JSON.stringify(needle)},root=document.querySelector('dialog[open]')||document,b=[...root.querySelectorAll('button')].find(e=>e.getClientRects().length&&!e.disabled&&(e.innerText||'').trim().includes(q));if(!b)return{missing:true,buttons:[...root.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim().slice(0,90))};b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);return{x,y,text:b.innerText.trim(),topTag:top?.tagName,topText:(top?.innerText||'').trim().slice(0,100),verified:!!top&&(top===b||b.contains(top)),buttons:[...root.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim().slice(0,90))}})()`)
  assert(info?.verified, `${label}: elementFromPoint did not verify button text ${needle}; UI buttons: ${JSON.stringify(info?.buttons)}`)
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp.call('Input.dispatchMouseEvent', { type, x: info.x, y: info.y, button: 'left', clickCount: 1 })
  await delay(250); await record(label, { ...info, clickSent: true }); return info
}
async function keyboardActivateDetails(selector) {
  await cdp.eval(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center'})`)
  let focused = null; const focusTrail = []
  for (let i = 0; i < 300; i++) {
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    focused = await cdp.eval(`(()=>{const e=document.activeElement,t=document.querySelector(${JSON.stringify(selector)})?.querySelector('summary'),d=document.querySelector('dialog[open]');return{match:e===t,insideModal:!!d&&d.contains(e),tag:e?.tagName,text:(e?.innerText||'').trim().replace(/\\s+/g,' ').slice(0,100)}})()`)
    assert(focused.insideModal, `Tab escaped the open modal while finding ${selector}: ${JSON.stringify(focused)}`)
    if (i < 40 || focused.match || i % 25 === 0) focusTrail.push(focused)
    if (focused.match) break
  }
  if (!focused?.match) throw Error(`Tab could not focus ${selector}; final=${JSON.stringify(focused)}; trail=${JSON.stringify(focusTrail.slice(-18))}`)
  const readOpen = () => cdp.eval(`document.querySelector(${JSON.stringify(selector)})?.open ?? false`)
  const dispatchEnter = async (variant) => {
    const event = { key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 }
    await cdp.call('Input.dispatchKeyEvent', { type: variant === 'raw-plus-char' ? 'rawKeyDown' : 'keyDown', ...event })
    const afterDown = await readOpen()
    let afterChar = null
    if (variant === 'raw-plus-char') {
      await cdp.call('Input.dispatchKeyEvent', { type: 'char', ...event })
      afterChar = await readOpen()
    }
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
    await delay(80)
    return { variant, afterDown, afterChar, afterKeyUp: await readOpen() }
  }
  let enter = await dispatchEnter('keydown-text')
  if (!enter.afterKeyUp) enter = { ...enter, alternate: await dispatchEnter('raw-plus-char') }
  const enterOpened = enter.afterKeyUp || enter.alternate?.afterKeyUp || false
  let enterClosed = null
  if (enterOpened) enterClosed = !(await dispatchEnter(enter.alternate?.afterKeyUp ? 'raw-plus-char' : 'keydown-text')).afterKeyUp
  const spaceOpened = await pressSpace(selector, true)
  const spaceClosed = spaceOpened ? await pressSpace(selector, false) : false
  assert(spaceOpened && spaceClosed, `Space did not open and close ${selector}`)
  const spaceReopened = await pressSpace(selector, true)
  assert(spaceReopened, `Space did not reopen ${selector}`)
  const detailsText = await text(selector)
  const shot = await screenshot(`${selector.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-keyboard-expanded`)
  await record('details-keyboard-expanded', { selector, focus: focused, enter, enterOpened, enterClosed, spaceOpened, spaceClosed, spaceReopened, text: detailsText, screenshot: shot })
  return { selector, keyboardFocus: focused, keyboardEnter: enter, keyboardEnterOpened: enterOpened, keyboardEnterClosed: enterClosed, keyboardSpaceOpened: spaceOpened, keyboardSpaceClosed: spaceClosed, keyboardSpaceReopened: spaceReopened, keyboardText: detailsText, keyboardScreenshot: shot }
}
async function pressSpace(selector, expectedOpen) {
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  await delay(80)
  return (await cdp.eval(`document.querySelector(${JSON.stringify(selector)})?.open ?? false`)) === expectedOpen
}
async function verifyModalFocusCycle() {
  const controls = await cdp.eval(`(()=>{const d=document.querySelector('dialog[open]');const a=[...d.querySelectorAll('button:not(:disabled), details > summary, a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex], [contenteditable]:not([contenteditable="false"])')].filter(e=>{const s=getComputedStyle(e);return e.tabIndex>=0&&e.getClientRects().length&&s.visibility!=='hidden'&&s.visibility!=='collapse'});return{first:{tag:a[0]?.tagName,text:(a[0]?.innerText||a[0]?.getAttribute('aria-label')||'').trim()},last:{tag:a.at(-1)?.tagName,text:(a.at(-1)?.innerText||a.at(-1)?.getAttribute('aria-label')||'').trim()},count:a.length}})()`)
  assert(controls.count > 1, 'Open modal has too few focusable controls')
  const activeSelector = `(()=>{const d=document.querySelector('dialog[open]');const a=[...d.querySelectorAll('button:not(:disabled), details > summary, a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex], [contenteditable]:not([contenteditable="false"])')].filter(e=>{const s=getComputedStyle(e);return e.tabIndex>=0&&e.getClientRects().length&&s.visibility!=='hidden'&&s.visibility!=='collapse'});return{first:document.activeElement===a[0],last:document.activeElement===a.at(-1),inside:d.contains(document.activeElement),tag:document.activeElement?.tagName,text:(document.activeElement?.innerText||document.activeElement?.getAttribute('aria-label')||'').trim()}})()`
  let state = await cdp.eval(activeSelector)
  for (let i = 0; i < controls.count + 3 && !state.first; i++) {
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    state = await cdp.eval(activeSelector)
  }
  assert(state.first, `Could not reach first modal control by Tab: ${JSON.stringify(state)}`)
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', modifiers: 8, windowsVirtualKeyCode: 9 })
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', modifiers: 8, windowsVirtualKeyCode: 9 })
  const shifted = await cdp.eval(activeSelector)
  assert(shifted.last && shifted.inside, `Shift+Tab did not wrap to last modal control: ${JSON.stringify(shifted)}`)
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  const forward = await cdp.eval(activeSelector)
  assert(forward.first && forward.inside, `Tab did not wrap back to first modal control: ${JSON.stringify(forward)}`)
  return { focusableCount: controls.count, first: controls.first, last: controls.last, shiftTabWrapsToLast: shifted, tabWrapsToFirst: forward }
}
try {
  await mkdir(profile, { recursive: false })
  chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
  chrome.stderr.setEncoding('utf8'); chrome.stderr.on('data', chunk => { chromeStderr += chunk })
  chrome.on('error', error => { chromeStderr += String(error) })
  const port = await waitFor(async () => Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]))
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  browser = await new Cdp(version.webSocketDebuggerUrl).open()
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json()
  cdp = await new Cdp(target.webSocketDebuggerUrl).open()
  for (const domain of ['Page', 'Runtime']) await cdp.call(`${domain}.enable`)
  await cdp.call('Page.navigate', { url })
  await writeFile(path.join(DIR, 'actions.ndjson'), '', { flag: 'wx' })
  await waitFor(() => cdp.eval('!!document.querySelector(".life-opening button.primary")'))
  result.chrome = await browser.call('Browser.getVersion')
  await waitFor(() => cdp.eval('!!document.querySelector(".life-opening button.primary")'))
  await clickSelector('.life-opening button.primary', 'start-fresh-save')
  await waitFor(() => cdp.eval('!!document.querySelector(".player-hud")'))
  await delay(400)
  const menu = async () => { if (!(await cdp.eval('!!document.querySelector(".pixel-menu")'))) await clickSelector('button.menu-trigger', 'open-menu') }
  await menu(); await clickButtonText('旅人筆記', 'open-traveler-notes')
  await waitFor(() => cdp.eval('!!document.querySelector("dialog[open] section[aria-labelledby=goal-hints-title]")'))
  result.notes = { sectionText: await text('dialog[open] section[aria-labelledby="goal-hints-title"]'), screenshot: await screenshot('traveler-notes-currently-noteworthy'), hints: await cdp.eval('[...document.querySelectorAll("dialog[open] .goal-hints li")].map(x=>({text:x.innerText.trim(),button:x.querySelector("button")?.innerText.trim()}))'), emptyState: await cdp.eval('document.querySelector("dialog[open] section[aria-labelledby=goal-hints-title] .empty-state")?.innerText ?? null') }
  await record('notes-section', result.notes)
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await delay(180)
  await clickSelector('button[data-position="5,4"]', 'map-to-forest')
  await waitFor(() => cdp.eval('document.querySelector(".context-prompt button.context-action")?.innerText.includes("北方森林")'))
  await clickSelector('button.context-action', 'interact-forest')
  await waitFor(() => cdp.eval('!!document.querySelector("dialog[open]")'))
  if (!(await cdp.eval('!!document.querySelector("dialog[open] .wolf-track-list")'))) await clickButtonText('森林', 'select-forest-place')
  await waitFor(() => cdp.eval('!!document.querySelector("dialog[open] .wolf-track-list")'))
  result.forestTextBefore = await text('dialog[open]')
  const rowSelectors = await cdp.eval(`(()=>{const rows=[...document.querySelectorAll('dialog[open] .wolf-track-row[data-rank="elite"] details,dialog[open] .wolf-track-row[data-rank="miniBoss"] details,dialog[open] .wolf-track-row[data-rank="boss"] details,dialog[open] .content-monster-row[data-content-rank="elite"] details,dialog[open] .content-monster-row[data-content-rank="miniBoss"] details,dialog[open] .content-monster-row[data-content-rank="boss"] details,dialog[open] .boss-preparation-details:not(.wolf-track-row .boss-preparation-details):not(.content-monster-row .boss-preparation-details)')];return rows.map((e,i)=>{e.dataset.bProbeIndex=String(i);return{selector:'[data-b-probe-index="'+i+'"]',summary:e.querySelector('summary')?.innerText.trim(),wolf:e.closest('[data-wolf-track]')?.dataset.wolfTrack??null,wolfRank:e.closest('[data-wolf-track]')?.dataset.rank??null,content:e.closest('[data-content-monster]')?.dataset.contentMonster??null,contentRank:e.closest('[data-content-monster]')?.dataset.contentRank??null,chief:!e.closest('[data-wolf-track]')&&!e.closest('[data-content-monster]')}})})()`)
  result.displayedDetails = rowSelectors
  result.keyboardFocusCycle = await verifyModalFocusCycle()
  for (const { selector } of rowSelectors) {
    const item = await keyboardActivateDetails(selector)
    await clickSelector(`${selector} summary`, `click-detail:${selector}`)
    assert(!(await cdp.eval(`document.querySelector(${JSON.stringify(selector)})?.open`)), `click should close ${selector}`)
    await clickSelector(`${selector} summary`, `reopen-detail:${selector}`)
    await waitFor(() => cdp.eval(`document.querySelector(${JSON.stringify(selector)})?.open`))
    item.clickVerifiedText = await text(selector)
    item.clickScreenshot = await screenshot(`${selector.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-click-expanded`)
    result.forestDetails.push(item)
  }
  result.goblinChiefPresent = result.displayedDetails.some(x=>x.chief)
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await delay(180)
  if (!result.notes.hints.length) {
    await clickSelector('button[data-position="16,10"]', 'map-to-farmland-for-seasonal-hint')
    await waitFor(() => cdp.eval('document.querySelector(".context-prompt button.context-action")?.innerText.includes("農田")'))
    await clickSelector('button.context-action', 'interact-farmland')
    await waitFor(() => cdp.eval('!!document.querySelector("dialog[open]")'))
    if (!(await cdp.eval('!!document.querySelector("dialog[open] .plot-row")'))) await clickButtonText('農田', 'select-farmland-place')
    await waitFor(() => cdp.eval('!!document.querySelector("dialog[open] .plot-row")'))
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await delay(160)
    await menu(); await clickButtonText('旅人筆記', 'open-traveler-notes-at-farmland')
    await waitFor(() => cdp.eval('!!document.querySelector("dialog[open] section[aria-labelledby=goal-hints-title]")'))
    result.notes.atFarmland = { sectionText: await text('dialog[open] section[aria-labelledby="goal-hints-title"]'), screenshot: await screenshot('traveler-notes-farmland-hints'), hints: await cdp.eval('[...document.querySelectorAll("dialog[open] .goal-hints li")].map(x=>({text:x.innerText.trim(),button:x.querySelector("button")?.innerText.trim()}))'), emptyState: await cdp.eval('document.querySelector("dialog[open] section[aria-labelledby=goal-hints-title] .empty-state")?.innerText ?? null') }
    await record('notes-at-farmland', result.notes.atFarmland)
  }
  const actionableHints = result.notes.hints.length ? result.notes.hints : (result.notes.atFarmland?.hints ?? [])
  if (actionableHints.length) {
    if (await cdp.eval('!document.querySelector("dialog[open] section[aria-labelledby=goal-hints-title]")')) { await menu(); await clickButtonText('旅人筆記', 'reopen-traveler-notes') }
    const target = await cdp.eval('(()=>{const b=document.querySelector("dialog[open] .goal-hints button");if(!b)return null;const r=b.getBoundingClientRect();return{selector:"dialog[open] .goal-hints button",text:b.innerText.trim(),hint:b.closest("li")?.innerText.trim(),position:b.closest("li")?.innerText.trim()}})()')
    assert(target, 'hint was listed but no destination button exists')
    const clicked = await clickSelector(target.selector, 'activate-hint-destination')
    await delay(350)
    result.hintDestination = { ...target, click: clicked, after: await cdp.eval('({dialogOpen:!!document.querySelector("dialog[open]"),context:document.querySelector(".context-prompt")?.innerText??null,visible:document.querySelector("main")?.innerText.slice(0,500)??null})') }
    result.hintDestination.screenshot = await screenshot('hint-destination-activated')
  } else {
    result.hintDestination = { status: 'no qualifying hint on fresh save; empty-state recorded', reason: 'Cannot activate a destination button when the fresh-save projection has no qualifying hints.' }
  }
  result.status = 'PASS'
} catch (error) {
  result.status = 'FAIL'; result.error = String(error); result.stack = error.stack; result.chromeStderr = chromeStderr; result.chromeExitCode = chrome?.exitCode ?? null
} finally {
  if (cdp) cdp.close()
  if (browser) browser.close()
  if (chrome && chrome.exitCode === null) chrome.kill()
  await delay(500)
  if (existsSync(profile)) {
    const sizeTree = async dir => { let bytes = 0; for (const ent of await readdir(dir, { withFileTypes: true })) { const f = path.join(dir, ent.name); bytes += ent.isDirectory() ? await sizeTree(f) : (await stat(f)).size } return bytes }
    result.chromeProfileBytesBeforeCleanup = await sizeTree(profile)
    assert(path.resolve(profile).startsWith(`${path.resolve(DIR)}${path.sep}`) && path.basename(profile) === 'chrome-profile', 'Refusing profile cleanup outside this probe attempt')
    await rm(profile, { recursive: true, force: false })
    result.chromeProfileRemoved = !existsSync(profile)
  }
  await new Promise(resolve => server.close(resolve))
  result.finishedAt = iso()
  await writeFile(path.join(DIR, 'probe-results.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(`${JSON.stringify({ status: result.status, attempt: result.attempt, details: result.forestDetails.length, notesHints: result.notes?.hints?.length, emptyState: Boolean(result.notes?.emptyState), hintDestination: result.hintDestination?.status ?? result.hintDestination?.text, profileBytes: result.chromeProfileBytesBeforeCleanup, profileRemoved: result.chromeProfileRemoved })}\n`)
}
if (result.status !== 'PASS') process.exitCode = 1
