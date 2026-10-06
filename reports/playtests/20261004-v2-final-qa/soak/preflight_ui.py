#!/usr/bin/env python3
"""Short real-Chromium UI preflight; disposable normal world, no state injection."""
import hashlib, json, re, shutil, tempfile, time, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[3]
sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded
MANIFEST=json.loads((OUT.parent/'build-manifest.json').read_text())
URL=MANIFEST['url'].rstrip('/')+'/'
RESULT={"sourceCommit":MANIFEST['sourceCommit'],"sourceSha256":MANIFEST['sourceSha256'],"assetsSha256":MANIFEST['assetsSha256'],
        "startedAtUtc":datetime.now(timezone.utc).isoformat(timespec='milliseconds'),"status":"running","checks":[],"errors":[],
        "method":"Fresh persistent Chromium profile, normal new-world UI, visible buttons/map clicks only; no storage/state/world-time edits."}
profile=tempfile.mkdtemp(prefix='oakvale-v2-soak-preflight-')
def check(name,fn):
    entry={"name":name,"status":"attempted"}; RESULT['checks'].append(entry)
    close(page)
    try:
      entry.update(fn())
      if entry.get('status')=='attempted': entry['status']='passed'
    except Exception as e: entry.update(status='failed',error=f'{type(e).__name__}: {e}'); RESULT['errors'].append(entry)
    finally:
      try: close(page)
      except Exception: pass
def close(page):
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape'); page.locator('dialog[open]').wait_for(state='detached',timeout=3000)
def menu(page,label):
    close(page)
    page.locator('.menu-trigger').click(timeout=3000)
    page.locator('.pixel-menu').get_by_role('button',name=label,exact=True).click(timeout=3000)
    page.locator('dialog[open]').wait_for(state='visible',timeout=3000)
def travel(page,x,y):
    menu(page,'地圖與世界')
    tile=page.locator(f'.world-map.overview-map .tile[data-position="{x},{y}"]')
    if not tile.count(): raise RuntimeError(f'map tile {x},{y} missing')
    tile.click(timeout=5000)
    page.locator('dialog[open]').wait_for(state='detached',timeout=12000)
    page.wait_for_timeout(200)
def place(page,x,y):
    travel(page,x,y)
    page.locator('.context-action').click(timeout=5000)
    page.locator('dialog[open]').wait_for(state='visible',timeout=5000)
def save_state(page):
    return page.evaluate("() => { const s=JSON.parse(localStorage.getItem('oakvale-v1')); return {worldTime:s.worldTime,worldId:s.playJournal.worldId,actor:s.activeCharacterId, gold:s.characters.find(c=>c.id===s.activeCharacterId).gold, position:s.characters.find(c=>c.id===s.activeCharacterId).position, settlement:s.settlement.stage, buildings:s.settlement.buildings, dungeon:s.dungeon}; }")
def farm_check(page):
  place(page,16,10); outcomes=[]
  for label in ['整地 · 體力 6／20 分','播種 · 體力 4／10 分']:
    b=page.get_by_role('button',name=label,exact=True)
    if b.is_enabled(): b.click(); outcomes.append(label)
  close(page)
  if '整地 · 體力 6／20 分' not in outcomes: raise RuntimeError('prepare control not enabled')
  if '播種 · 體力 4／10 分' not in outcomes: raise RuntimeError('plant control did not enable after prepare')
  return {"actions":outcomes}
def rest_check(page):
  place(page,7,9); b=page.get_by_role('button',name='休息 · 1 小時',exact=True)
  if not b.is_enabled(): raise RuntimeError('rest disabled')
  b.click(); close(page); return {"actions":["rest"]}
def mine_check(page):
  place(page,19,5); b=page.get_by_role('button',name=re.compile('採石|採鐵礦'))
  if not b.count() or not b.first.is_enabled(): raise RuntimeError('gather button missing/disabled')
  label=b.first.inner_text(); b.first.click(); close(page); return {"actions":[label]}
def shop_check(page):
  place(page,10,8); rows=page.locator('.shop-item'); chosen=None
  for i in range(rows.count()):
    row=rows.nth(i); b=row.get_by_role('button',name=re.compile('買 '))
    if b.count() and b.first.is_enabled(): chosen=b.first; break
  if chosen is None:
    for i in range(rows.count()):
      b=rows.nth(i).get_by_role('button',name=re.compile('賣 '))
      if b.count() and b.first.is_enabled(): chosen=b.first; break
  if chosen is None: raise RuntimeError('no enabled buy/sell control')
  name=chosen.inner_text(); chosen.click(); close(page); return {"actions":[name]}
def npc_check(page):
  menu(page,'地圖與世界'); page.get_by_role('button',name='居民',exact=True).click()
  residents=page.locator('.people-list button')
  if not residents.count(): raise RuntimeError('resident list empty')
  n=page.evaluate("""() => { const s=JSON.parse(localStorage.getItem('oakvale-v1')); const x=s.npcs.find(n=>n.isAlive); return {id:x.id,name:x.name,x:x.position.x,y:x.position.y}; }""")
  residents.first.click(); close(page); travel(page,n['x'],n['y'])
  # Select the named person from nearby interactions through the regular interaction list.
  if page.locator('.nearby-trigger').count():
    page.locator('.nearby-trigger').click()
    target=page.locator('.interaction-list').get_by_role('button',name=re.compile(r'(?<!\w)'+re.escape(n['name'])+r'(?!\d)'))
    if target.count(): target.first.click()
  else: page.keyboard.press('Enter')
  talk=page.get_by_role('button',name='交談',exact=True)
  if not talk.count() or not talk.is_enabled(): raise RuntimeError('NPC not adjacent for conversation after travel')
  talk.click(); close(page); return {"actions":["inspect","travel","talk"],"npc":n['name']}
def forest_check(page):
  place(page,5,4); logs=[]
  gather=page.get_by_role('button',name=re.compile('伐木'))
  if gather.count() and gather.first.is_enabled(): gather.first.click(); logs.append('woodcutting')
  encounter=page.get_by_role('button',name=re.compile('尋找怪物'))
  if encounter.count() and encounter.is_enabled():
    encounter.click(); logs.append('encounter')
    attack=page.get_by_role('button',name='攻擊',exact=True)
    for _ in range(15):
      if not attack.count() or not attack.first.is_visible(): break
      attack.first.click(timeout=2000)
    logs.append('combat resolved/terminated through attack UI')
  close(page)
  if not logs: raise RuntimeError('neither gathering nor encounter enabled')
  return {"actions":logs}
def dungeon_check(page):
  place(page,20,3); entered=page.get_by_role('button',name=re.compile('進入廢棄礦坑'))
  if not entered.count() or not entered.is_enabled():
    close(page); return {"status":"gated","reason":"entrance not yet discovered or insufficient stamina"}
  entered.click(); actions=['enter']
  for _ in range(1):
    explore=page.get_by_role('button',name=re.compile('探索下一段'))
    if not explore.count() or not explore.is_enabled(): break
    explore.click(); actions.append('explore')
    attack=page.get_by_role('button',name='攻擊',exact=True)
    for _ in range(15):
      if not attack.count() or not attack.first.is_visible(): break
      attack.first.click(timeout=2000)
  leave=page.get_by_role('button',name='離開礦坑',exact=True)
  if leave.count(): leave.click(); actions.append('leave')
  else: raise RuntimeError('dungeon not leaveable through UI')
  close(page); return {"actions":actions}
def gear_check(page):
  state=save_state(page); page.keyboard.press('i'); page.locator('dialog[open]').wait_for(state='visible')
  sword=page.locator('.item-list button').filter(has_text='鐵劍')
  if sword.count():
    sword.first.click(); equip=page.get_by_role('button',name='裝備',exact=True)
    if equip.count() and equip.is_enabled(): equip.click(); close(page); return {"actions":["equip"]}
  close(page)
  if 'blacksmith' not in state['buildings']: return {"status":"gated","reason":"blacksmith not yet unlocked in initial Hamlet"}
  raise RuntimeError('inventory opened but no equipment action available')
def windows_check(page):
  opened=[]
  for label in ['這一生','住所與產業','地方消息與委託','世界歷史','旅人筆記']:
    menu(page,label); opened.append(label); close(page)
  return {"actions":opened}
def reload_check(page):
  close(page); page.locator('.speed-controls').get_by_role('button',name='暫停',exact=True).click(); page.locator('.save-button').click(); page.wait_for_timeout(200)
  before=save_state(page)
  page.add_init_script("window.__qaLoadedSave = (() => { const s=JSON.parse(localStorage.getItem('oakvale-v1')); return {worldTime:s.worldTime,worldId:s.playJournal.worldId,actor:s.activeCharacterId}; })();")
  page.reload(wait_until='domcontentloaded'); page.locator('.world-clock').wait_for(state='visible')
  loaded=page.evaluate('() => window.__qaLoadedSave')
  page.locator('.speed-controls').get_by_role('button',name='暫停',exact=True).click()
  after=save_state(page)
  if before['worldTime']!=loaded['worldTime'] or before['worldId']!=loaded['worldId'] or before['actor']!=loaded['actor']:
    raise RuntimeError(f'persisted load continuity mismatch {before} vs {loaded}')
  if after['worldTime']-loaded['worldTime'] not in (0,1):
    raise RuntimeError(f'unexpected foreground progress before pause {loaded} vs {after}')
  page.get_by_role('button',name='×20',exact=True).click()
  return {"actions":["pause","save","reload","immediate-pause","continue"],"persistedWorldTime":loaded['worldTime'],"postPauseWorldTime":after['worldTime'],"foregroundCatchUpMinutes":after['worldTime']-loaded['worldTime']}

try:
  with sync_playwright() as p:
    c=p.chromium.launch_persistent_context(profile,executable_path='/usr/bin/chromium',headless=True,viewport={"width":1440,"height":1000},args=['--no-sandbox','--disable-dev-shm-usage'])
    page=c.pages[0]; page.set_default_timeout(4000)
    page.goto(URL,wait_until='networkidle',timeout=20000); page.locator('.world-clock').wait_for(state='visible',timeout=10000)
    if page.get_by_role('button',name='起身',exact=True).count(): page.get_by_role('button',name='起身',exact=True).click()
    page.get_by_role('button',name='×20',exact=True).click()
    RESULT['browserVersion']=c.browser.version if c.browser else 'Chromium system'
    RESULT['initialState']=save_state(page)
    check('farm_prepare_plant',lambda: farm_check(page))
    check('home_rest',lambda: rest_check(page))
    check('mine_gather_selector',lambda: mine_check(page))
    check('shop_trade_selector',lambda: shop_check(page))
    check('npc_inspect_travel_talk',lambda: npc_check(page))
    check('forest_gather_encounter_combat',lambda: forest_check(page))
    check('dungeon_discovery_entry_combat_exit',lambda: dungeon_check(page))
    check('inventory_equipment_gate',lambda: gear_check(page))
    check('identity_ownership_news_windows',lambda: windows_check(page))
    check('normal_pause_save_reload_no_offline',lambda: reload_check(page))
    RESULT['finalState']=save_state(page)
    RESULT['fingerprint']={"index":hashlib.sha256(urlopen(URL).read()).hexdigest(),"assets":{k:hashlib.sha256(urlopen(URL.rstrip('/')+'/'+k).read()).hexdigest() for k in MANIFEST['assetsSha256'] if k!='index.html'}}
    RESULT['status']='passed' if all(x['status'] in ('passed','gated') for x in RESULT['checks']) else 'failed'
    c.close()
except Exception as e:
  RESULT.update(status='failed',fatal=f'{type(e).__name__}: {e}')
finally:
  RESULT['endedAtUtc']=datetime.now(timezone.utc).isoformat(timespec='milliseconds')
  shutil.rmtree(profile,ignore_errors=True)
  write_recorded(OUT/'preflight-ui.json',json.dumps(RESULT,ensure_ascii=False,indent=2)+'\n',producer='soak-preflight')
  print(json.dumps({"status":RESULT['status'],"checks":RESULT['checks'],"errors":RESULT['errors'],"fatal":RESULT.get('fatal')},ensure_ascii=False),flush=True)
