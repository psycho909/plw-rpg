#!/usr/bin/env python3
"""Normal UI ownership, frozen owner, reload recovery, and persistent profile coverage."""
import hashlib,json,sys,tempfile
from pathlib import Path
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded
OUT=Path(__file__).resolve().parent;URL='http://127.0.0.1:5196'
report={'startedAtUtc':datetime.now(timezone.utc).isoformat(),'buildManifest':'save-writer-build.json','url':URL,'method':'UI-only mutations. CDP freezes/resumes owner document solely to test retained lease. Read-only localStorage observations.','checks':[]}
def raw(p):return p.evaluate("() => localStorage.getItem('oakvale-v1')")
def pause(p):
 b=p.get_by_role('button',name='暫停',exact=True)
 if b.get_attribute('aria-pressed')!='true': b.click()
def stable(p):
 s=json.loads(raw(p));s.pop('lastSavedAt',None);s.pop('playJournal',None);return s
def check(name,result):
 report['checks'].append({'name':name,'pass':bool(result)});assert result,name
def launch(pw,profile):return pw.chromium.launch_persistent_context(profile,headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'],viewport={'width':1440,'height':1000})
with sync_playwright() as pw:
 profile=tempfile.mkdtemp(prefix='plw-astra-writer-lifecycle-');report['profile']=profile
 ctx=launch(pw,profile);a=ctx.pages[0];a.goto(URL);a.get_by_role('button',name='起身',exact=True).click();pause(a)
 a.keyboard.press('ArrowDown');a.locator('.save-button').click();a.wait_for_timeout(100);expected=stable(a)
 b=ctx.new_page();b.goto(URL);b.get_by_role('alert').filter(has_text='另一個').wait_for()
 check('second tab has explicit persistent conflict warning', '重新整理' in b.locator('body').inner_text())
 check('second tab paused',b.get_by_role('button',name='暫停',exact=True).get_attribute('aria-pressed')=='true')
 cdp=ctx.new_cdp_session(a);cdp.send('Page.setWebLifecycleState',{'state':'frozen'})
 b.keyboard.press('ArrowDown');b.get_by_role('button',name='×20',exact=True).click();b.locator('.save-button').click();b.wait_for_timeout(1200)
 check('frozen owner retains exclusive lease and blocked tab cannot move/run/save',stable(b)==expected)
 b.set_viewport_size({'width':390,'height':844});b.screenshot(path=str(OUT/'save-writer-conflict-mobile.png'),full_page=True)
 check('narrow viewport no document horizontal overflow',b.evaluate('document.documentElement.scrollWidth <= innerWidth'))
 cdp.send('Page.setWebLifecycleState',{'state':'active'});a.close();b.wait_for_timeout(100)
 b.keyboard.press('ArrowDown');b.locator('.save-button').click()
 check('closing owner does not silently activate stale blocked page',stable(b)==expected)
 b.get_by_role('button',name='重新整理',exact=True).click();b.wait_for_function("!document.body.innerText.includes('正在確認存檔使用狀態')");pause(b)
 check('reload reads latest complete state without offline progression',stable(b)==expected)
 b.keyboard.press('ArrowDown');b.locator('.save-button').click();b.wait_for_timeout(100)
 expected2=stable(b);check('new owner may move and save',expected2['worldTime']==expected['worldTime']+5)
 b.screenshot(path=str(OUT/'save-writer-owner-recovered.png'),full_page=True)
 write_recorded(OUT/'save-writer-pre-close-checkpoint.json',raw(b)+'\n',producer='astra-save-conflict')
 ctx.close()
 ctx=launch(pw,profile)
 report['restoredPages']=[p.url for p in ctx.pages]
 games=[p for p in ctx.pages if p.url.rstrip('/')==URL]
 check('persistent relaunch restores exactly one existing game page',len(games)==1)
 page=games[0]
 for p in ctx.pages:
  if p!=page:p.close()
 page.wait_for_selector('.world-map');pause(page)
 check('normal persistent close/reopen retains complete state',stable(page)==expected2)
 check('driver reuses restored app page rather than navigating blank into duplicate',len(ctx.pages)==1)
 page.keyboard.press('ArrowUp');page.locator('.save-button').click()
 check('reopened single app page remains playable',stable(page)['worldTime']==expected2['worldTime']+5)
 ctx.close()
 # Unsupported browser API must visibly fail closed; no injected save data.
 ctx=launch(pw,tempfile.mkdtemp(prefix='plw-astra-writer-unsupported-'))
 ctx.add_init_script("Object.defineProperty(navigator,'locks',{value:undefined})")
 p=ctx.pages[0];p.goto(URL);p.get_by_role('button',name='起身',exact=True).wait_for()
 check('unsupported browser visibly blocks and does not create a save',raw(p) is None and '無法安全協調' in p.locator('body').inner_text())
 p.screenshot(path=str(OUT/'save-writer-unsupported.png'),full_page=True);ctx.close()
report['endedAtUtc']=datetime.now(timezone.utc).isoformat();write_recorded(OUT/'save-writer-browser.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n',producer='astra-save-conflict')
print(json.dumps(report,ensure_ascii=False))
