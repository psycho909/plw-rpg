#!/usr/bin/env python3
"""UI-only two-tab stale writer regression; no injected state or engine calls."""
import hashlib,json,os,sys,tempfile,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded
OUT=Path(__file__).resolve().parent
URL=os.environ.get('PLW_CONFLICT_URL','http://127.0.0.1:5195')
NAME=os.environ.get('PLW_CONFLICT_NAME','save-conflict-red')
def utc():return datetime.now(timezone.utc).isoformat()
def raw(p):return p.evaluate("() => localStorage.getItem('oakvale-v1')")
def pause(p):
 b=p.get_by_role('button',name='暫停',exact=True)
 if b.get_attribute('aria-pressed')!='true':b.click()
def snap(p,label):
 s=json.loads(raw(p));c=next(x for x in s['characters'] if x['id']==s['activeCharacterId'])
 return {'label':label,'atUtc':utc(),'clock':p.locator('.world-clock').inner_text(),'rawWorldTime':s['worldTime'],'position':c['position'],'rawSha256':hashlib.sha256(raw(p).encode()).hexdigest(),'body':p.locator('body').inner_text()}
report={'startedAtUtc':utc(),'url':URL,'method':'Fresh independent Chromium profile; all mutations through ordinary rendered UI controls. Read-only localStorage observations. No state/clock/resource injection.','steps':[]}
with urlopen(URL) as r: report['servedIndexSha256']=hashlib.sha256(r.read()).hexdigest()
with sync_playwright() as pw:
 profile=tempfile.mkdtemp(prefix='plw-astra-conflict-');report['profile']=profile
 ctx=pw.chromium.launch_persistent_context(profile,headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'],viewport={'width':1440,'height':1000})
 a=ctx.pages[0];a.goto(URL);a.get_by_role('button',name='起身',exact=True).click();pause(a)
 b=ctx.new_page();b.goto(URL);pause(b)
 report['steps'].append(snap(a,'both-paused-before-action'))
 a.bring_to_front();a.keyboard.press('ArrowDown');a.locator('.save-button').click();a.wait_for_timeout(100)
 newer=snap(a,'A-action-saved');report['steps'].append(newer)
 write_recorded(OUT/(NAME+'-newer-checkpoint.json'),raw(a)+'\n',producer='astra-save-conflict')
 a.screenshot(path=str(OUT/(NAME+'-A-newer.png')),full_page=True)
 b.bring_to_front();b.locator('.save-button').click();b.wait_for_timeout(100)
 stale=snap(b,'B-stale-save');report['steps'].append(stale)
 write_recorded(OUT/(NAME+'-stale-checkpoint.json'),raw(b)+'\n',producer='astra-save-conflict')
 b.screenshot(path=str(OUT/(NAME+'-B-stale.png')),full_page=True)
 report['progressPreserved']=stale['position']==newer['position'] and stale['rawWorldTime']>=newer['rawWorldTime']
 # Reload A without pagehide giving A a chance to overwrite B: reading a fresh third tab witnesses persisted load.
 c=ctx.new_page();c.goto(URL);pause(c);report['steps'].append(snap(c,'fresh-C-loaded-persisted-result'))
 c.screenshot(path=str(OUT/(NAME+'-C-reload.png')),full_page=True)
 report['endedAtUtc']=utc();write_recorded(OUT/(NAME+'.json'),json.dumps(report,ensure_ascii=False,indent=2)+'\n',producer='astra-save-conflict')
 print(json.dumps({'report':NAME+'.json','progressPreserved':report['progressPreserved'],'steps':[{k:s[k] for k in ['label','rawWorldTime','position','clock']} for s in report['steps']]},ensure_ascii=False))
 ctx.close()
assert report['progressPreserved'], 'A newer UI movement/save was overwritten by stale tab B; a fresh tab loaded lost progress'
