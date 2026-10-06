#!/usr/bin/env python3
"""Separate disposable forced-GC diagnostic, never attaches to formal soak."""
import hashlib,json,re,sys,tempfile,time,traceback
from datetime import datetime,timezone
from pathlib import Path
from urllib.request import urlopen
import psutil
from playwright.sync_api import sync_playwright
ROOT=Path('/workspace/plw-rpg');sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded
OUT=ROOT/'reports/playtests/20261004-v2-final-qa/astra'
MANIFEST=json.loads((OUT.parent/'build-manifest.json').read_text())
URL='http://127.0.0.1:5195'
def utc():return datetime.now(timezone.utc).isoformat(timespec='milliseconds')
def fingerprint():
    html=urlopen(URL,timeout=10).read();out={'index.html':hashlib.sha256(html).hexdigest()}
    for path in sorted(set(re.findall(rb'(?:src|href)="([^"]+\.(?:js|css))"',html))):
        name=path.decode();out[name.lstrip('/')]=hashlib.sha256(urlopen(URL+name,timeout=10).read()).hexdigest()
    return out
def rss(profile):
    roots=[]
    for p in psutil.process_iter(['pid','cmdline']):
        try:
            if '--user-data-dir='+profile in (p.info['cmdline'] or []):roots.append(p)
        except psutil.Error:pass
    if not roots:return {'available':False}
    root=roots[0];children=[root,*root.children(recursive=True)];values=[]
    for p in children:
        try:values.append({'pid':p.pid,'rssBytes':p.memory_info().rss})
        except psutil.Error:pass
    return {'available':True,'rootPid':root.pid,'processes':values,'totalBytes':sum(p['rssBytes'] for p in values),'note':'Process tree sum can double-count shared pages; GC need not return reserved memory to OS.'}
profile=tempfile.mkdtemp(prefix='plw-astra-forced-gc-diagnostic-')
t0=time.monotonic()
data={'sourceCommit':MANIFEST['sourceCommit'],'expectedAssets':MANIFEST['assetsSha256'],'diagnostic':'SEPARATE forcedGC context; NOT formal natural-GC soak','profile':profile,'startedAtUtc':utc(),'status':'running','steps':[],'samples':[],'pageErrors':[],'consoleErrors':[],'requestFailures':[],'limitations':['Only 210 seconds; cannot establish two-hour stability, eventual leaks, or prove formal-soak retention source.','No heap snapshot/retainer analysis; post-GC recovery only establishes reclaimability in this profile.']}
def step(action,**kw):data['steps'].append({'atUtc':utc(),'elapsedSeconds':round(time.monotonic()-t0,3),'action':action,**kw})
def publish():write_recorded(OUT/'forced-gc-diagnostic.json',json.dumps(data,ensure_ascii=False,indent=2),producer='astra-separate-forced-gc')
try:
    data['servedAssetsStart']=fingerprint()
    assert data['servedAssetsStart']==data['expectedAssets'],'served asset fingerprint mismatch'
    with sync_playwright() as p:
        context=p.chromium.launch_persistent_context(profile,executable_path='/usr/bin/chromium',headless=True,viewport={'width':1440,'height':1000},args=['--no-sandbox','--disable-dev-shm-usage','--enable-precise-memory-info'])
        try:
            page=context.pages[0];page.set_default_timeout(5000)
            page.on('pageerror',lambda e:data['pageErrors'].append({'atUtc':utc(),'text':str(e)}))
            page.on('console',lambda e:data['consoleErrors'].append({'atUtc':utc(),'text':e.text}) if e.type=='error' else None)
            page.on('requestfailed',lambda r:data['requestFailures'].append({'atUtc':utc(),'url':r.url,'failure':r.failure}))
            page.goto(URL,wait_until='networkidle');step('open fresh isolated profile',url=URL)
            page.get_by_role('button',name='起身',exact=True).click();step('click 起身')
            page.get_by_role('button',name='×20',exact=True).click();step('click ×20')
            cdp=context.new_cdp_session(page)
            def sample(label):
                s={'label':label,'atUtc':utc(),'elapsedSeconds':round(time.monotonic()-t0,3)}
                s['browser']=page.evaluate("""() => {const s=JSON.parse(localStorage.getItem('oakvale-v1'));return {liveElements:document.getElementsByTagName('*').length,worldTime:s?.worldTime,worldId:s?.playJournal?.worldId,pending:s?.playJournal?.pending?.length,activeDialog:document.querySelector('dialog[open] h2')?.textContent??null,speed:[...document.querySelectorAll('.speed-controls button')].find(b=>b.getAttribute('aria-pressed')==='true')?.textContent};}""")
                s['cdpHeap']=cdp.send('Runtime.getHeapUsage');s['cdpDom']=cdp.send('Memory.getDOMCounters');s['rss']=rss(profile);data['samples'].append(s);publish();print(json.dumps({'label':label,'elapsed':s['elapsedSeconds'],'dom':s['cdpDom'],'heap':s['cdpHeap'],'rss':s['rss'].get('totalBytes')},ensure_ascii=False),flush=True)
            sample('natural-initial')
            loopStart=time.monotonic()
            for n in range(1,7):
                delay=max(0,loopStart+30*n-time.monotonic());page.wait_for_timeout(delay*1000)
                key=['c','i','l','m','c','i'][n-1];page.keyboard.press(key);page.locator('dialog[open]').wait_for(state='visible');title=page.locator('dialog[open] h2').inner_text();step('open UI',key=key,title=title)
                page.wait_for_timeout(500);page.keyboard.press('Escape');page.locator('dialog[open]').wait_for(state='detached');step('close UI',key='Escape')
                sample('natural-'+str(n*30)+'s')
            for cycle in [1,2]:
                if cycle==2:
                    page.wait_for_timeout(30000);sample('after-GC-recovery-30s-before-GC2')
                step('HeapProfiler.collectGarbage requested',cycle=cycle,scope='only this isolated diagnostic context')
                try:
                    cdp.send('HeapProfiler.collectGarbage');step('HeapProfiler.collectGarbage completed',cycle=cycle)
                except Exception as e:
                    data['forcedGCUnavailable']=str(e);step('HeapProfiler.collectGarbage failed',cycle=cycle,error=str(e));break
                sample('forced-GC-'+str(cycle)+'-immediate')
            data['servedAssetsEnd']=fingerprint();assert data['servedAssetsEnd']==data['expectedAssets']
            data['status']='completed diagnostic' if not data.get('forcedGCUnavailable') else 'completed with forcedGC unavailable'
        finally:context.close();step('closed only diagnostic context')
except Exception as e:
    data['status']='failed diagnostic';data['failure']={'atUtc':utc(),'type':type(e).__name__,'message':str(e),'traceback':traceback.format_exc()};print(data['failure'],flush=True)
finally:
    data['endedAtUtc']=utc();data['elapsedSeconds']=round(time.monotonic()-t0,3);publish()
