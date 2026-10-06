from playwright.sync_api import sync_playwright
from pathlib import Path
import json, time
URL = 'http://127.0.0.1:5195'
profile = str(Path('/tmp/oakvale-life-profile-909'))
pw = sync_playwright().start()
ctx = pw.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'], viewport={'width':1440,'height':1000})
page = ctx.pages[0] if ctx.pages else ctx.new_page()
page_errors=[]
page.on('pageerror', lambda e: page_errors.append(str(e)))
page.goto(URL)
page.wait_for_selector('.world-map')
def state():
    return page.evaluate("""() => { const s=JSON.parse(localStorage.getItem('oakvale-v1')); return {worldTime:s.worldTime, worldSeed:s.worldSeed, rngState:s.rngState, saveVersion:s.saveVersion, activeCharacterId:s.activeCharacterId, character:s.characters.find(c=>c.id===s.activeCharacterId), npcCount:s.npcs.length, npcs:s.npcs.slice(0,10).map(n=>({id:n.id,name:n.name,age:n.age,job:n.job,position:n.position,life:s.life.npcs[n.id]})), settlement:s.settlement, regions:s.regions, properties:s.life.properties, events:s.events.length, history:s.history.length, journal:s.playJournal.pending.length, playerPosition:s.characters.find(c=>c.id===s.activeCharacterId).position, crops:s.crops, pageTitle:document.title, buttons:[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean)} }""")
def click(name): page.get_by_role('button', name=name, exact=True).click()
def menu(name):
    if page.locator('dialog[open]').count(): page.keyboard.press('Escape')
    page.locator('.menu-trigger').click(); page.locator('.pixel-menu').get_by_role('button',name=name,exact=True).click()
def screenshot(name): page.screenshot(path=f'reports/playtests/20261004-v2-final-qa/life/{name}.png',full_page=True)
print(json.dumps({'browser':ctx.browser.version,'url':URL,'profile':profile,'initial':state(),'pageErrors':page_errors},ensure_ascii=False,default=str),flush=True)
