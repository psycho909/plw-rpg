// Real-service Cloud Save E2E helper. Drives already-open, VISIBLE Chrome windows (one fresh
// profile per "device") over CDP. The human performs the GitHub login inside those windows;
// this script never sees GitHub credentials, OAuth secrets or Supabase secret keys.
// Usage:
//   node scripts/cloud-e2e/e2e.mjs launch <port> <profileDir> <appUrl>
//   node scripts/cloud-e2e/e2e.mjs state  <port>
//   node scripts/cloud-e2e/e2e.mjs run    <port> <step> [downloadDir]
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const [cmd, port, a3, a4] = process.argv.slice(2)

class Cdp {
  constructor(u) { this.ws = new WebSocket(u); this.id = 0; this.p = new Map(); this.events = []; this.dialogs = [] }
  async open() {
    await new Promise((ok, no) => { this.ws.onopen = ok; this.ws.onerror = no })
    this.ws.onmessage = e => {
      const m = JSON.parse(e.data)
      if (m.method === 'Page.javascriptDialogOpening') {
        this.dialogs.push(m.params.message)
        void this.call('Page.handleJavaScriptDialog', { accept: this.acceptDialogs !== false })
      }
      if (m.method) { this.events.push(m); return }
      const p = this.p.get(m.id); if (p) { this.p.delete(m.id); m.error ? p.no(new Error(m.error.message)) : p.ok(m.result) }
    }
    return this
  }
  call(method, params = {}) { const id = ++this.id; return new Promise((ok, no) => { this.p.set(id, { ok, no }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expression) {
    const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result?.value
  }
}
async function page(p) {
  const list = await (await fetch(`http://127.0.0.1:${p}/json/list`)).json()
  const target = list.find(t => t.type === 'page' && t.url.startsWith('http://127.0.0.1:5173'))
  if (!target) throw new Error('no app page in that window')
  const cdp = await new Cdp(target.webSocketDebuggerUrl).open()
  for (const d of ['Page', 'Runtime', 'Network']) await cdp.call(`${d}.enable`)
  return cdp
}
const STATE = `(()=>{const p=document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia;const g=p?._s.get('game'),c=p?._s.get('cloud');
  const raw=localStorage.getItem('oakvale-v1');let j=null;try{j=JSON.parse(raw)}catch{}
  return {url:location.href,game:g&&{writerReady:g.writerReady,saveError:g.saveError,worldTime:g.state.worldTime,openingSeen:g.state.life.openingSeen,speed:g.speed},
   local:j&&{saveVersion:j.saveVersion,worldSeed:j.worldSeed,worldTime:j.worldTime,worldId:j.playJournal?.worldId},
   cloud:c&&{enabled:c.enabled,signedIn:!!c.session,account:c.account,status:c.status,conflict:c.conflict,busy:c.busy,online:c.online,errorMessage:c.errorMessage,lastSyncedAt:c.lastSyncedAt,
     row:c.cloud&&{revision:c.cloud.revision,world_id:c.cloud.world_id,world_time:c.cloud.world_time,checksum:c.cloud.checksum.slice(0,12)},metadata:c.metadata&&{revision:c.metadata.revision,worldId:c.metadata.worldId}}}})()`
async function openCloud(cdp) {
  await cdp.eval(`(()=>{if(document.querySelector('[aria-label="雲端存檔"] [role=status]'))return;document.querySelector('.menu-trigger').click()})()`)
  await delay(300)
  await cdp.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='雲端存檔');b&&b.click()})()`)
  await delay(500)
}
async function clickText(cdp, text) {
  const ok = await cdp.eval(`(()=>{const b=[...document.querySelectorAll('[aria-label="雲端存檔"] button')].find(x=>x.innerText.trim()===${JSON.stringify(text)});if(!b||b.disabled)return b?'disabled':'missing';b.click();return 'clicked'})()`)
  if (ok !== 'clicked') throw new Error(`button ${text}: ${ok}`)
}
async function settle(cdp, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { const s = await cdp.eval(STATE).catch(() => null); if (s?.cloud && !s.cloud.busy) return s; await delay(300) } return cdp.eval(STATE) }

if (cmd === 'launch') {
  await mkdir(a3, { recursive: true })
  spawn(CHROME, [`--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${a3}`, '--no-first-run', '--no-default-browser-check', '--new-window', a4], { detached: true, stdio: 'ignore' }).unref()
  console.log(JSON.stringify({ launched: port }))
} else if (cmd === 'state') {
  const cdp = await page(port); console.log(JSON.stringify(await cdp.eval(STATE), null, 1)); process.exit(0)
} else if (cmd === 'run') {
  const step = a3, cdp = await page(port), out = { step, before: await cdp.eval(STATE) }
  if (a4) await cdp.call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: a4, eventsEnabled: true }).catch(e => { out.downloadSetup = String(e) })
  if (step === 'start-life') {
    await cdp.eval(`(()=>{const b=document.querySelector('.life-opening button.primary:not(:disabled)');b&&b.click()})()`); await delay(2000)
  } else if (step === 'upload') {
    await openCloud(cdp); await clickText(cdp, '上傳本機存檔'); await delay(500)
  } else if (step === 'load') {
    await openCloud(cdp); await clickText(cdp, '備份本機並載入雲端'); await delay(6000)
  } else if (step === 'load-conflict') {
    await openCloud(cdp); await clickText(cdp, '備份本機，改用雲端'); await delay(6000)
  } else if (step === 'overwrite') {
    await openCloud(cdp); await clickText(cdp, '確認以本機取代雲端'); await delay(500)
  } else if (step === 'refresh') {
    await openCloud(cdp); await clickText(cdp, '重新讀取雲端狀態'); await delay(500)
  } else if (step === 'play') {
    for (const [k, vk] of [['Escape', 27], ['ArrowRight', 39], ['ArrowLeft', 37]]) { for (const type of ['keyDown', 'keyUp']) await cdp.call('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: vk }); await delay(400) }
    await delay(3000)
  } else if (step === 'offline') {
    await cdp.call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await cdp.eval('window.dispatchEvent(new Event("offline"))'); await delay(500)
  } else if (step === 'online') {
    await cdp.call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await cdp.eval('window.dispatchEvent(new Event("online"))'); await delay(500)
  } else if (step === 'upload-offline-attempt') {
    // Force the network layer offline without the browser 'offline' event so the request really fails.
    await cdp.call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await openCloud(cdp); await clickText(cdp, '上傳本機存檔'); await delay(3000)
    await cdp.call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  } else if (step === 'upload-blocked') {
    // The browser still believes it is online, but every request to Supabase fails at the network layer.
    await cdp.call('Network.setBlockedURLs', { urls: ['*supabase.co*'] })
    await openCloud(cdp); await clickText(cdp, '上傳本機存檔'); await delay(4000)
    out.during = await cdp.eval(STATE)
    await delay(4000)
    out.duringAfterPlay = await cdp.eval(STATE)
    await cdp.call('Network.setBlockedURLs', { urls: [] })
  } else if (step === 'expire-token') {
    // Keep a copy of the real session, then make the access token invalid and the refresh token unusable.
    out.saved = await cdp.eval(`(()=>{const k=Object.keys(localStorage).find(x=>/^sb-.*-auth-token$/.test(x));const v=localStorage.getItem(k);sessionStorage.setItem('e2e-session-backup',JSON.stringify([k,v]));const s=JSON.parse(v);s.access_token='invalid.'+s.access_token.split('.')[1]+'.invalid';s.refresh_token='invalid-refresh';s.expires_at=Math.floor(Date.now()/1000)+3600;localStorage.setItem(k,JSON.stringify(s));return k.replace(/auth-token$/,'…')})()`)
    await cdp.call('Page.reload', {}); await delay(5000)
    await openCloud(cdp); await clickText(cdp, '重新讀取雲端狀態').catch(e => { out.refreshClick = String(e) }); await delay(2000)
  } else if (step === 'restore-token') {
    out.restored = await cdp.eval(`(()=>{const b=sessionStorage.getItem('e2e-session-backup');if(!b)return false;const [k,v]=JSON.parse(b);localStorage.setItem(k,v);return true})()`)
    await cdp.call('Page.reload', {}); await delay(5000)
  } else throw new Error(`unknown step ${step}`)
  out.dialogs = cdp.dialogs
  out.downloads = cdp.events.filter(e => e.method === 'Browser.downloadWillBegin' || e.method === 'Page.downloadWillBegin').map(e => e.params.suggestedFilename)
  out.errors = cdp.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails?.exception?.description?.slice(0, 200))
  try { out.after = await settle(cdp) } catch { await delay(4000); out.after = await (await page(port)).eval(STATE) }
  console.log(JSON.stringify(out, null, 1)); process.exit(0)
}
