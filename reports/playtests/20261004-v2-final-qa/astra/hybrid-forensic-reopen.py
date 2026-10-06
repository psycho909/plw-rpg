#!/usr/bin/env python3
"""Open a preserved COPY of the failed QA profile and observe restored documents."""
from pathlib import Path
import sys,shutil,json,tempfile,hashlib
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded
OUT=Path(__file__).resolve().parent/'forensic-20261005-0846'
profile=Path(tempfile.mkdtemp(prefix='plw-hybrid-restoration-forensic-'))
shutil.copytree('/tmp/plw-hybrid-forensic-profile-20261005-0846',profile,dirs_exist_ok=True,symlinks=True)
report={'atUtc':datetime.now(timezone.utc).isoformat(),'profile':str(profile),'sourceProfile':'/tmp/plw-hybrid-forensic-profile-20261005-0846','method':'Normal Chromium relaunch of preserved COPY; no navigation, no seeded data, no game action, read-only evaluations. Original test profile never launched or changed. This is restoration evidence, not proof of original live page count at 04:31.','pages':[]}
with sync_playwright() as pw:
 ctx=pw.chromium.launch_persistent_context(str(profile),headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'],viewport={'width':1440,'height':1000})
 ctx.pages[0].wait_for_timeout(500)
 for i,p in enumerate(ctx.pages):
  row={'url':p.url}
  if p.url.startswith('http://127.0.0.1:5195'):
   p.wait_for_selector('.world-clock')
   data=p.evaluate("() => ({raw:localStorage.getItem('oakvale-v1'),clock:document.querySelector('.world-clock')?.innerText, speed:document.querySelector('.speed-controls [aria-pressed=true]')?.innerText,body:document.body.innerText})")
   raw=data.pop('raw');s=json.loads(raw);c=next(x for x in s['characters'] if x['id']==s['activeCharacterId'])
   row.update(data);row.update({'worldTime':s['worldTime'],'position':c['position'],'hp':c['hp'],'gold':c['gold'],'sha256':hashlib.sha256(raw.encode()).hexdigest()})
   write_recorded(OUT/f'restored-copy-page-{i}-checkpoint.json',raw+'\n',producer='astra-save-conflict')
   p.screenshot(path=str(OUT/f'restored-copy-page-{i}.png'),full_page=True)
  report['pages'].append(row)
 write_recorded(OUT/'reopened-copy-pages.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n',producer='astra-save-conflict')
 ctx.close()
print(json.dumps({'pages':[{k:v for k,v in row.items() if k!='body'} for row in report['pages']]},ensure_ascii=False))
