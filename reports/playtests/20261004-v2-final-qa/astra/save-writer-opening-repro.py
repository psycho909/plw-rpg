#!/usr/bin/env python3
"""UI recovery controls must remain reachable inside a blocked opening modal."""
import json,os,sys,tempfile
from pathlib import Path
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded
OUT=Path(__file__).resolve().parent;URL='http://127.0.0.1:5196';NAME=os.environ.get('PLW_OPENING_NAME','save-writer-opening-red')
report={'atUtc':datetime.now(timezone.utc).isoformat(),'url':URL,'method':'Fresh profiles, UI only; unsupported and delayed Web Locks API capability probes; no injected game state.','checks':[]}
def check(name,result):report['checks'].append({'name':name,'pass':bool(result)})
def context(pw):return pw.chromium.launch_persistent_context(tempfile.mkdtemp(prefix='plw-astra-opening-'),headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'],viewport={'width':390,'height':844})
with sync_playwright() as pw:
 ctx=context(pw);a=ctx.pages[0];a.goto(URL);a.get_by_role('button',name='起身',exact=True).wait_for()
 b=ctx.new_page();b.goto(URL);b.get_by_role('alert').filter(has_text='另一個').wait_for()
 check('fresh loser opening start is disabled',b.get_by_role('button',name='起身',exact=True).is_disabled())
 reload=b.locator('dialog[open]').get_by_role('button',name='重新整理',exact=True)
 reachable=reload.count()>0 and reload.is_visible() and reload.is_enabled()
 check('fresh loser opening has reachable reload recovery',reachable)
 b.screenshot(path=str(OUT/(NAME+'-fresh-loser.png')),full_page=True)
 a.close()
 if reachable:
  reload.click();b.wait_for_function("!document.body.innerText.includes('正在確認存檔使用狀態')")
  b.get_by_role('button',name='起身',exact=True).click()
  check('footer reload after owner closes permits starting unchanged fresh world',not b.locator('dialog[open]').count() and b.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).life.openingSeen"))
 else:check('footer reload after owner closes permits starting unchanged fresh world',False)
 ctx.close()
 ctx=context(pw);ctx.add_init_script("Object.defineProperty(navigator,'locks',{value:undefined})")
 p=ctx.pages[0];p.goto(URL);p.get_by_role('alert').filter(has_text='無法安全協調').wait_for()
 check('unsupported fresh opening start is disabled',p.get_by_role('button',name='起身',exact=True).is_disabled())
 reload=p.locator('dialog[open]').get_by_role('button',name='重新整理',exact=True)
 check('unsupported fresh opening exposes reload',reload.count()>0 and reload.is_visible())
 check('unsupported does not create a save',p.evaluate("localStorage.getItem('oakvale-v1')") is None)
 p.screenshot(path=str(OUT/(NAME+'-unsupported.png')),full_page=True);ctx.close()
 ctx=context(pw)
 ctx.add_init_script("const request = navigator.locks.request.bind(navigator.locks); navigator.locks.request = (...args) => new Promise((resolve,reject) => setTimeout(() => request(...args).then(resolve,reject), 1800));")
 p=ctx.pages[0];p.goto(URL);p.get_by_role('alert').filter(has_text='正在確認').wait_for()
 check('pending acquisition disables opening start',p.get_by_role('button',name='起身',exact=True).is_disabled())
 pending=p.locator('dialog[open]').get_by_role('button',name='確認中',exact=True)
 check('pending acquisition recovery cannot reload-loop',pending.count()>0 and pending.is_disabled())
 p.screenshot(path=str(OUT/(NAME+'-pending.png')),full_page=True)
 p.wait_for_function("!document.body.innerText.includes('正在確認存檔使用狀態')")
 check('start becomes enabled once lease is acquired',p.get_by_role('button',name='起身',exact=True).is_enabled());ctx.close()
write_recorded(OUT/(NAME+'.json'),json.dumps(report,ensure_ascii=False,indent=2)+'\n',producer='astra-save-conflict')
print(json.dumps(report,ensure_ascii=False))
assert all(c['pass'] for c in report['checks']), 'Opening modal lacks reachable recovery or disabled unavailable actions'
