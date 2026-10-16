import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(ROOT, 'reports/v2/20261015-ui-ux-polish/phase-09/d-runner')
const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '')
const attempt = path.join(OUT, `probe-${stamp}`)
const widths = [320, 375, 768, 1280, 1920]
const heights = [667, 768, 900, 1000]
const iso = () => new Date().toISOString()
const sha = data => createHash('sha256').update(data).digest('hex')

async function waitFor(fn, timeout = 30000, every = 120) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const value = await fn().catch(() => false)
    if (value) return value
    await delay(every)
  }
  throw new Error(`Timed out after ${timeout}ms`)
}

class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map() }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', event => {
      const packet = JSON.parse(event.data)
      const pending = this.pending.get(packet.id)
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
      this.pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value) },
        reject: error => { clearTimeout(timer); reject(error) },
      })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, userGesture: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result?.value
  }
  close() { try { this.ws.close() } catch {} }
}

async function serveDist() {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
      const file = path.resolve(DIST, rel)
      if (!file.startsWith(`${DIST}${path.sep}`)) throw new Error('path escape')
      let body
      try { body = await readFile(file) } catch { body = await readFile(path.join(DIST, 'index.html')) }
      response.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
      response.end(body)
    } catch { response.writeHead(400); response.end('bad request') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return { server, url: `http://127.0.0.1:${server.address().port}/` }
}

let profile
let chrome
let browser
let page
let server
let profileBytes = 0
let cleanupError
let result

async function sizeTree(directory) {
  let bytes = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    bytes += entry.isDirectory() ? await sizeTree(file) : (await stat(file)).size
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
    profileBytes = await sizeTree(profile)
    const root = path.resolve(attempt), target = path.resolve(profile)
    if (!target.startsWith(`${root}${path.sep}`) || path.basename(target) !== 'chrome-profile') throw new Error('Refusing profile cleanup outside this probe attempt')
    await rm(target, { recursive: true, force: false })
  }
}

async function writeJson(name, data) {
  await writeFile(path.join(attempt, name), `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' })
}

async function screenshot(name) {
  const data = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const file = path.join(attempt, `${name}.png`)
  const bytes = Buffer.from(data.data, 'base64')
  await writeFile(file, bytes, { flag: 'wx' })
  return { file: path.basename(file), bytes: bytes.length, sha256: sha(bytes) }
}

async function click(selector, label) {
  const hit = await locate(`document.querySelector(${JSON.stringify(selector)})`, label)
  return dispatchHit(hit)
}

async function clickText(text, label) {
  const hit = await locate(`(()=>{const root=document.querySelector('dialog[open]')||document;const e=[...root.querySelectorAll('button')].find(x=>x.getClientRects().length&&!x.disabled&&(x.innerText||x.getAttribute('aria-label')||'').trim().includes(${JSON.stringify(text)}));return e||null})()`, label)
  return dispatchHit(hit)
}

async function touch(selector, label) {
  const hit = await locate(`document.querySelector(${JSON.stringify(selector)})`, label)
  if (!hit.ok || !hit.topWithinTarget) return { ...hit, clickSent: false, input: 'touch' }
  const point = { x: hit.x, y: hit.y, id: 1, radiusX: 1, radiusY: 1, force: 1 }
  await page.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await page.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await delay(250)
  return { ...hit, clickSent: true, input: 'touch' }
}

async function locate(expression, label) {
  return page.eval(`(()=>{const e=${expression};if(!e)return {label:${JSON.stringify(label)},ok:false,reason:'missing'};if(e.disabled)return {label:${JSON.stringify(label)},ok:false,reason:'disabled'};e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect();if(!e.getClientRects().length||r.width<=0||r.height<=0)return {label:${JSON.stringify(label)},ok:false,reason:'not-visible'};const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);const desc=n=>n?{tag:n.tagName,cls:typeof n.className==='string'?n.className:'',text:(n.innerText||n.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,90)}:null;return{label:${JSON.stringify(label)},ok:true,x,y,target:desc(e),top:desc(top),topWithinTarget:!!top&&(top===e||e.contains(top)),rect:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`)
}

async function dispatchHit(hit) {
  if (!hit.ok || !hit.topWithinTarget) return { ...hit, clickSent: false }
  await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hit.x, y: hit.y })
  await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: hit.x, y: hit.y, button: 'left', clickCount: 1 })
  await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hit.x, y: hit.y, button: 'left', clickCount: 1 })
  await delay(250)
  return { ...hit, clickSent: true }
}

async function key(key, code = key, vk = key === 'Escape' ? 27 : 9) {
  const text = key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined
  const down = { type: 'keyDown', key, code, windowsVirtualKeyCode: vk }
  if (text !== undefined) { down.text = text; down.unmodifiedText = text }
  await page.call('Input.dispatchKeyEvent', down)
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk })
  await delay(120)
  return page.eval(`(()=>{const e=document.activeElement;return {tag:e?.tagName,text:(e?.innerText||'').trim().replace(/\\s+/g,' ').slice(0,100),className:typeof e?.className==='string'?e.className:'',outline:getComputedStyle(e).outlineStyle,outlineWidth:getComputedStyle(e).outlineWidth,insideDialog:!!e?.closest('dialog[open]')}})()`)
}

async function main() {
  if (!existsSync(CHROME) || !existsSync(path.join(DIST, 'index.html'))) throw new Error('Production dist or system Chrome missing; build approval is required before browser probing.')
  await mkdir(OUT, { recursive: true })
  await mkdir(attempt, { recursive: false })
  profile = path.join(attempt, 'chrome-profile')
  await mkdir(profile, { recursive: false })
  chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-sync', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
  const portFile = path.join(profile, 'DevToolsActivePort')
  const port = await waitFor(async () => Number((await readFile(portFile, 'utf8')).split(/\r?\n/)[0]))
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  browser = await new Cdp(version.webSocketDebuggerUrl).open()
  server = await serveDist()
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(server.url)}`, { method: 'PUT' })).json()
  page = await new Cdp(target.webSocketDebuggerUrl).open()
  for (const domain of ['Page', 'Runtime']) await page.call(`${domain}.enable`)
  await page.call('Page.navigate', { url: server.url })
  await waitFor(() => page.eval('!!document.querySelector(".game-shell")'))
  await waitFor(() => page.eval('!!document.querySelector(".life-opening button.primary")'))
  const start = await click('.life-opening button.primary', 'start-visible-fresh-save')
  if (!start.clickSent) throw new Error(`Could not hit the fresh-save start control: ${JSON.stringify(start)}`)
  await waitFor(() => page.eval('!!document.querySelector(".world-frame")'))

  const responsive = []
  for (const width of widths) for (const height of heights) {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
    await delay(100)
    const measure = await page.eval(`(()=>{const d=document.documentElement,selectors=['.time-hud button','.world-frame','.exploration-hint button','.player-hud button','.world-bottom button','.mobile-nav button','.direction-pad button'];const box=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)}};const required=selectors.flatMap(s=>[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length).map(e=>({selector:s,text:(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,80),disabled:e.disabled,box:box(e)})));const map=document.querySelector('.world-frame'),nav=document.querySelector('.mobile-nav'),hud=document.querySelector('.player-hud'),bottom=document.querySelector('.world-bottom');return {innerWidth,innerHeight,clientWidth:d.clientWidth,scrollWidth:d.scrollWidth,horizontalOverflow:d.scrollWidth>d.clientWidth,required,mainRegions:{map:map?box(map):null,hud:hud?box(hud):null,desktopBottom:bottom?box(bottom):null,mobileNav:nav&&getComputedStyle(nav).display!=='none'?box(nav):null},outsideViewport:required.filter(x=>x.box.y<0||x.box.bottom>innerHeight||x.box.x<0||x.box.right>innerWidth).map(x=>x.text),smallTargets:required.filter(x=>x.box.w<24||x.box.h<24)}})()`)
    const shot = await screenshot(`responsive-${width}x${height}`)
    responsive.push({ width, height, measure, shot })
  }
  await page.call('Emulation.clearDeviceMetricsOverride')

  const interaction = { hitTests: [start], modal: {}, touch: {} }
  const menuOpen = await click('button.menu-trigger', 'open-menu')
  interaction.hitTests.push(menuOpen)
  interaction.modal.opened = await page.eval('(()=>{const d=document.querySelector("dialog[open]");return {open:!!d,isModal:d?.matches(":modal")??false,focusedInside:!!d?.contains(document.activeElement),initialFocus:document.activeElement?.innerText?.trim()??document.activeElement?.getAttribute("aria-label")??document.activeElement?.tagName}})()')
  interaction.modal.firstTab = await key('Tab', 'Tab', 9)
  interaction.modal.enterActivation = {
    focusedItem: await page.eval('document.activeElement?.innerText?.trim()??null'),
    focusAfterEnter: await key('Enter', 'Enter', 13),
    windowAfterEnter: await page.eval('document.querySelector("dialog[open] .window-heading")?.innerText?.trim()??null'),
    dialogStillOpen: await page.eval('!!document.querySelector("dialog[open]")'),
  }
  const esc = await key('Escape')
  interaction.modal.escape = { focus: esc, stillOpen: await page.eval('!!document.querySelector("dialog[open]")'), triggerFocused: await page.eval('document.activeElement?.matches("button.menu-trigger") ?? false') }
  const reopen = await click('button.menu-trigger', 'reopen-menu')
  interaction.hitTests.push(reopen)
  interaction.modal.spaceActivation = {
    focusedItem: await page.eval('document.activeElement?.innerText?.trim()??null'),
    focusAfterSpace: await key(' ', 'Space', 32),
    windowAfterSpace: await page.eval('document.querySelector("dialog[open] .window-heading")?.innerText?.trim()??null'),
    dialogStillOpen: await page.eval('!!document.querySelector("dialog[open]")'),
  }
  await key('Escape')
  const menuForInventory = await click('button.menu-trigger', 'menu-before-inventory')
  interaction.hitTests.push(menuForInventory)
  const inventoryClick = await clickText('物品', 'menu-inventory')
  interaction.hitTests.push(inventoryClick)
  interaction.modal.inventory = await page.eval('(()=>{const d=document.querySelector("dialog[open]"),b=d?.querySelector(".window-body");return {open:!!d,bodyClientHeight:b?.clientHeight??0,bodyScrollHeight:b?.scrollHeight??0,bodyScrollable:!!b&&b.scrollHeight>b.clientHeight,footerBottom:d?.querySelector(".window-footer")?.getBoundingClientRect().bottom??null,dialogBottom:d?.getBoundingClientRect().bottom??null}})()')
  interaction.modal.inventoryScreenshot = await screenshot('inventory-dialog')

  if (await page.eval('!!document.querySelector("dialog[open]")')) await key('Escape')
  await page.call('Emulation.setDeviceMetricsOverride', { width: 320, height: 667, deviceScaleFactor: 1, mobile: true })
  const navInventory = await touch('.mobile-nav button:nth-child(3)', 'touch-sized-mobile-inventory-control')
  interaction.touch.mobileNav = navInventory
  interaction.touch.mobileNavDialogOpen = await page.eval('!!document.querySelector("dialog[open]")')
  interaction.touch.buttonRects = await page.eval('(()=>[...document.querySelectorAll(".mobile-nav button,.direction-pad button")].filter(e=>getComputedStyle(e).display!=="none"&&e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{text:e.innerText.trim(),w:Math.round(r.width),h:Math.round(r.height)}}))()')
  interaction.touch.mobileNavScreenshot = await screenshot('mobile-320x667-nav')
  await page.call('Emulation.clearDeviceMetricsOverride')

  result = { status: 'complete', startedAt: iso(), browser: await browser.call('Browser.getVersion'), sourceOfLayout: 'production dist; UI state entered through visible controls; no application-state injection', viewportMatrix: responsive, interaction, failures: [] }
  await writeJson('probe-results.json', result)
}

try {
  await main()
} catch (error) {
  result = { status: 'failed', at: iso(), error: String(error?.stack ?? error), attempt: path.relative(ROOT, attempt).replaceAll('\\', '/') }
  if (existsSync(attempt)) await writeJson('failure.json', result).catch(() => {})
  process.exitCode = 1
} finally {
  try { await closeChrome() } catch (error) { cleanupError = String(error?.stack ?? error) }
  if (server?.server) await new Promise(resolve => server.server.close(resolve))
  if (existsSync(attempt)) await writeJson('runtime-closeout.json', { endedAt: iso(), chromeProfileBytesBeforeCleanup: profileBytes, chromeProfileRemoved: profile ? !existsSync(profile) : true, cleanupError }).catch(() => {})
}

if (cleanupError) { console.error(cleanupError); process.exitCode = 1 }
if (result?.status === 'complete') console.log(path.relative(ROOT, attempt).replaceAll('\\', '/'))
else if (result?.status === 'failed') console.error(result.error)
