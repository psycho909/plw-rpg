#!/usr/bin/env python3
"""Persistent Chromium UI driver; the agent chooses every exploratory objective interactively."""
from __future__ import annotations
import hashlib, json, re, sys, time, traceback
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded

OUT=Path(__file__).resolve().parent
URL='http://127.0.0.1:5195'
SOURCE='c02b600c6f5f1533374d671b707d333c86d852d7'
SEED_FILE=ROOT/'reports/playtests/20261004-v2-final-qa/seeds/seed-17.json'
PROFILE=Path('/tmp/plw-v2-final-adventure-profile-04')
SEGMENT=2
CUMULATIVE_OFFSET=1572.45
RUN_STARTED_UTC='2026-10-05T03:49:32.782+00:00'
TARGET_SECONDS=3900
ARTIFACTS=OUT/'attempt-04'/'segment-02'
page=None
started_utc=None
started_mono=None
observations=[]
actions=[]
errors={'page':[],'console':[],'harness':[]}

def utc(): return datetime.now(timezone.utc).isoformat(timespec='milliseconds')
def served_fingerprint():
    manifest=json.loads((OUT.parent/'build-manifest.json').read_text())
    with urlopen(URL,timeout=10) as response:
        html=response.read(); status=response.status
    paths=sorted(set(re.findall(rb'(?:src|href)="([^"]+\.(?:js|css))"',html)))
    served={'/':{'httpStatus':status,'bytes':len(html),'sha256':hashlib.sha256(html).hexdigest()}}
    for item in paths:
        path=item.decode('ascii')
        with urlopen(URL.rstrip('/')+path,timeout=10) as response:
            body=response.read(); served[path]={'httpStatus':response.status,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
    expected=manifest.get('assetsSha256',{})
    for path,row in served.items():
        key=path.lstrip('/')
        if key in expected and expected[key]!=row['sha256']:
            raise RuntimeError(f'Production asset fingerprint mismatch for {key}')
    return {'sourceCommit':manifest.get('sourceCommit'),'manifestPath':'../build-manifest.json','served':served,
      'assetHashesMatchManifest':all(expected.get(k.lstrip('/'))==v['sha256'] for k,v in served.items() if k!='/')}
def raw():
    value=page.evaluate("() => localStorage.getItem('oakvale-v1')")
    return json.loads(value) if value else None
def active(s):
    return next((c for c in s.get('characters',[]) if c.get('id')==s.get('activeCharacterId')),s.get('characters',[{}])[0])
def button(label,exact=True,scope=None):
    return (scope or page).get_by_role('button',name=label,exact=exact)
def open_map():
    close_dialog()
    page.keyboard.press('m'); page.wait_for_timeout(120)
def close_dialog():
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape'); page.wait_for_timeout(80)
def save_current():
    close_dialog()
    control=page.locator('.save-button')
    if control.count(): control.click(); page.wait_for_timeout(120)
    return raw() or {}
def pause_ui():
    footer=page.locator('dialog[open] .window-footer button').filter(has_text='暫停時間')
    if footer.count() and footer.get_attribute('aria-pressed')!='true': footer.click(); page.wait_for_timeout(80); return True
    pause=button('暫停')
    if pause.count() and pause.get_attribute('aria-pressed')!='true': pause.click(); page.wait_for_timeout(80); return True
    return False
def resume_speed(speed='×20'):
    close_dialog()
    control=button(speed)
    if control.count() and control.get_attribute('aria-pressed')!='true': control.click(); page.wait_for_timeout(80)
    return bool(control.count() and control.get_attribute('aria-pressed')=='true')
def write(status='running'):
    segment_elapsed=round(time.monotonic()-started_mono,2) if started_mono is not None else None
    cumulative_elapsed=round(CUMULATIVE_OFFSET+segment_elapsed,2) if segment_elapsed is not None else CUMULATIVE_OFFSET
    data={'route':'adventure','status':status,'segment':SEGMENT,'sourceCommit':SOURCE,'buildManifest':'../build-manifest.json',
      'url':URL,'browser':'Playwright Chromium 151 /usr/bin/chromium (real browser runtime)',
      'profile':str(PROFILE),'worldSeed':17,'seedSetup':'canonical public createGame(17) initial state loaded once before app boot; all later simulation changes are via the rendered UI',
      'runStartedAtUtc':RUN_STARTED_UTC,'segmentStartedAtUtc':started_utc,'updatedAtUtc':utc(),
      'segmentElapsedSeconds':segment_elapsed,'elapsedSeconds':cumulative_elapsed,'targetSeconds':TARGET_SECONDS,
      'cumulativeTiming':'segment 1 active duration plus segment 2 monotonic duration; restart gap excluded',
      'humanPlaytest':False,'observations':observations,'actions':actions,'errors':errors}
    ARTIFACTS.mkdir(parents=True,exist_ok=True)
    write_recorded(ARTIFACTS/'results.json',json.dumps(data,ensure_ascii=False,indent=2)+'\n',producer='adventure-interactive-segment-02')
def observe(label='observation',screenshot=True):
    s=raw() or {}; c=active(s)
    segment_elapsed=round(time.monotonic()-started_mono,1) if started_mono is not None else None
    row={'atUtc':utc(),'segment':SEGMENT,'segmentElapsedSeconds':segment_elapsed,
      'elapsedSeconds':round(CUMULATIVE_OFFSET+segment_elapsed,1) if segment_elapsed is not None else CUMULATIVE_OFFSET,
      'label':label,'clock':page.locator('.world-clock').inner_text() if page.locator('.world-clock').count() else None,
      'worldTime':s.get('worldTime'),'worldSeed':s.get('worldSeed'),'rngState':s.get('rngState'),
      'character':{k:c.get(k) for k in ['id','name','age','level','exp','hp','maxHp','stamina','maxStamina','gold','position','currentRegion','skills','equipment','inventory','isAlive']},
      'settlement':s.get('settlement'),'party':s.get('party'),'threat':s.get('threat'),'dungeon':s.get('dungeon'),'combat':s.get('combat'),
      'eventCount':len(s.get('events',[])),'historyCount':len(s.get('history',[])),
      'recentEvents':[e.get('message') for e in s.get('events',[])[-8:]],'recentHistory':[e.get('message') for e in s.get('history',[])[-8:]],
      'selectedSpeed':next((b.inner_text() for b in page.locator('.speed-controls button').all() if b.get_attribute('aria-pressed')=='true'),None),
      'visibleText':page.locator('body').inner_text()[-1400:]}
    observations.append(row)
    if screenshot: page.screenshot(path=str(ARTIFACTS/f"checkpoint-{len(observations):02d}.png"),full_page=True)
    write()
    brief={k:row[k] for k in ['atUtc','elapsedSeconds','label','clock','worldTime','character','settlement','party','threat','dungeon','combat','recentEvents','recentHistory','selectedSpeed']}
    print('SNAPSHOT '+json.dumps(brief,ensure_ascii=False),flush=True)
    return row
def note_decision(text):
    segment_elapsed=round(time.monotonic()-started_mono,1)
    actions.append({'atUtc':utc(),'segment':SEGMENT,'segmentElapsedSeconds':segment_elapsed,'elapsedSeconds':round(CUMULATIVE_OFFSET+segment_elapsed,1),'kind':'agent decision','reason':text})
    write(); print('RECORDED decision',flush=True)
def remember(kind,detail):
    segment_elapsed=round(time.monotonic()-started_mono,1)
    actions.append({'atUtc':utc(),'segment':SEGMENT,'segmentElapsedSeconds':segment_elapsed,'elapsedSeconds':round(CUMULATIVE_OFFSET+segment_elapsed,1),'kind':kind,'detail':detail})
    write(); print('RECORDED '+kind,flush=True)
def choose_interaction(term):
    close_dialog()
    prompt=page.locator('.context-action')
    if prompt.count() and term in prompt.inner_text():
        prompt.click(); page.wait_for_timeout(120); return True
    nearby=page.locator('.nearby-trigger')
    if nearby.count():
        nearby.click(); page.wait_for_timeout(100)
        choices=page.locator('dialog[open] .interaction-list button')
        for i in range(choices.count()):
            if term in choices.nth(i).inner_text(): choices.nth(i).click(); page.wait_for_timeout(120); return True
    return False
def travel(label):
    open_map()
    option=button('前往'+label)
    if not option.count():
        close_dialog(); raise RuntimeError(f'No visible map route named 前往{label}')
    option.click(); page.wait_for_timeout(300)
    return {'destination':label,'worldTime':(raw() or {}).get('worldTime'),'position':active(raw() or {}).get('position')}
def list_map():
    open_map()
    rows=page.locator('.overview-map button').evaluate_all('(xs)=>xs.map(x=>({position:x.getAttribute("data-position"),label:x.getAttribute("aria-label"),disabled:x.disabled}))')
    routes=[x.inner_text() for x in page.locator('dialog[open] .action-buttons button').all()]
    print('MAP '+json.dumps({'tiles':rows,'routes':routes},ensure_ascii=False),flush=True)
def open_panel(key):
    close_dialog(); page.keyboard.press(key); page.wait_for_timeout(150)
    dialog=page.locator('dialog[open]')
    print('PANEL '+(dialog.inner_text(timeout=1000)[:2500] if dialog.count() else 'no dialog opened'),flush=True)

def visible_button_labels(scope='dialog'):
    root=page.locator('dialog[open]') if scope=='dialog' else page
    if scope=='dialog' and not root.count(): return []
    return root.get_by_role('button').evaluate_all("xs=>xs.filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(x).visibility!=='hidden'}).map(x=>({label:(x.getAttribute('aria-label')||x.innerText||'').replace(/\\s+/g,' ').trim(),disabled:x.disabled}))")

def click_visible(label,scope='dialog'):
    rows=visible_button_labels(scope)
    matches=[r for r in rows if r['label']==label]
    if len(matches)!=1:
        print(('BUTTONS ' if not label or not matches else 'AMBIGUOUS_BUTTONS ')+json.dumps(rows,ensure_ascii=False),flush=True)
        return False
    if matches[0]['disabled']:
        print('BUTTON_DISABLED '+json.dumps(matches[0],ensure_ascii=False),flush=True)
        return False
    root=page.locator('dialog[open]') if scope=='dialog' else page
    target=root.get_by_role('button',name=label,exact=True)
    if target.count()!=1 or not target.is_visible():
        print('BUTTON_NOT_VISIBLE '+label,flush=True); return False
    before={'worldTime':(raw() or {}).get('worldTime'),'label':label,'scope':scope}
    target.click(timeout=2000); page.wait_for_timeout(120)
    remember('visible UI button click',{'before':before,'afterWorldTime':(raw() or {}).get('worldTime'),'visibleButtonsBefore':rows})
    return True

def close_ui():
    opened=page.locator('dialog[open]')
    if not opened.count(): print('CLOSE no dialog open',flush=True); return False
    title=opened.locator('.window-title').inner_text(timeout=1000) if opened.locator('.window-title').count() else opened.inner_text(timeout=1000)[:80]
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    remember('close UI dialog',{'title':title,'closed':not page.locator('dialog[open]').count()})
    print('CLOSE '+title,flush=True); return not page.locator('dialog[open]').count()

def open_menu():
    close_dialog()
    control=page.get_by_role('button',name=re.compile('選單'))
    if control.count()!=1 or not control.is_visible(): print('MENU unavailable',flush=True); return False
    control.click(timeout=2000); page.wait_for_timeout(120)
    panel=page.locator('dialog[open]')
    print('MENU '+(panel.inner_text(timeout=1000)[:1800] if panel.count() else 'no dialog'),flush=True)
    return bool(panel.count())
def gather(kind='伐木'):
    close_dialog(); act=page.get_by_role('button',name=re.compile(kind))
    if not act.count():
        choose_interaction('森林' if kind=='伐木' else '礦場')
        act=page.get_by_role('button',name=re.compile(kind))
    if act.count() and not act.first.is_disabled(): act.first.click(); page.wait_for_timeout(150); return True
    return False
def one_turn(command):
    cmd={'attack':'攻擊','defend':'防禦','potion':'使用藥水','run':'逃跑'}[command]
    control=button(cmd)
    if not control.count() or control.first.is_disabled(): raise RuntimeError(f'Combat control unavailable: {cmd}')
    before=page.locator('dialog[open]').inner_text() if page.locator('dialog[open]').count() else ''
    control.first.click(); page.wait_for_timeout(130)
    remember('combat UI turn',{'command':command,'before':before[:240],'after':page.locator('dialog[open]').inner_text()[:300] if page.locator('dialog[open]').count() else 'battle scene closed'})
def save_reload():
    pause_ui(); before=save_current()
    before_time=before.get('worldTime'); before_char=active(before); before_combat=before.get('combat'); before_dungeon=before.get('dungeon')
    page.reload(wait_until='domcontentloaded'); page.wait_for_timeout(220)
    pause_ui(); after=save_current(); after_char=active(after)
    delta=(after.get('worldTime') or 0)-(before_time or 0)
    check={'worldSeedPreserved':before.get('worldSeed')==after.get('worldSeed')==17,
      'activeCharacterPreserved':before.get('activeCharacterId')==after.get('activeCharacterId'),
      'characterIdentityPreserved':before_char.get('id')==after_char.get('id') and before_char.get('name')==after_char.get('name'),
      'savedCombatRestored':before_combat==after.get('combat'),'savedDungeonRestored':before_dungeon==after.get('dungeon'),
      'legalActiveSessionWorldMinuteDelta':delta,'rngBefore':before.get('rngState'),'rngAfter':after.get('rngState'),
      'rngPlausible':isinstance(after.get('rngState'),int) and after.get('rngState')>=0}
    remember('paused UI save/reload',check)
    resume_speed(); observe('after-save-reload',True)
    return check

def main():
    global page,started_utc,started_mono
    PROFILE.mkdir(parents=True,exist_ok=True)
    (OUT/'attempt-04').mkdir(parents=True,exist_ok=True)
    with sync_playwright() as p:
        ctx=p.chromium.launch_persistent_context(str(PROFILE),headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--remote-debugging-port=9241'],viewport={'width':1440,'height':1000})
        page=ctx.pages[0] if ctx.pages else ctx.new_page(); page.set_default_timeout(2000)
        page.on('pageerror',lambda e:(errors['page'].append(str(e)),write()))
        page.on('console',lambda m:errors['console'].append(m.text) if m.type=='error' else None)
        seed=json.loads(SEED_FILE.read_text())
        literal=json.dumps(seed,ensure_ascii=False,separators=(',',':'))
        ctx.add_init_script(script=f"(()=>{{const s={literal};if(!localStorage.getItem('oakvale-v1'))localStorage.setItem('oakvale-v1',JSON.stringify(s));}})()")
        page.goto(URL,wait_until='networkidle')
        production_fingerprint=served_fingerprint()
        if production_fingerprint['sourceCommit']!=SOURCE: raise RuntimeError('Served build source commit does not match QA baseline')
        if button('起身').count(): button('起身').click(); page.wait_for_timeout(350)
        # Any loaded life is immediately paused while the short read-only preflight runs.
        pause_ui()
        state=raw() or {}
        if state.get('worldSeed')!=17: raise RuntimeError(f"Expected restored seed17, got {state.get('worldSeed')}")
        if not page.locator('.world-map').count() or not page.locator('.save-button').count(): raise RuntimeError('World map/save UI failed to mount')
        open_map()
        routes=[x.inner_text() for x in page.locator('dialog[open] .action-buttons button').all()]
        close_dialog()
        pause=button('暫停')
        if pause.count() and pause.get_attribute('aria-pressed')!='true': pause.click(); page.wait_for_timeout(80)
        if not routes or not button('×20').count(): raise RuntimeError('Map route/speed control preflight failed')
        if not resume_speed(): raise RuntimeError('Could not select x20 via visible UI control')
        started_utc=utc(); started_mono=time.monotonic()
        actions.append({'atUtc':started_utc,'segment':SEGMENT,'segmentElapsedSeconds':0,'elapsedSeconds':CUMULATIVE_OFFSET,'kind':'active browser play resumed','productionFingerprint':production_fingerprint,'readOnlyPreflight':{'seed':state['worldSeed'],'routes':routes,'pauseResumeUI':'pass','existingSavePreserved':True},'statusBefore':{'worldTime':state.get('worldTime'),'level':active(state).get('level'),'position':active(state).get('position')}})
        observe('active-session-start',True)
        print(f"READY commands=status,map,travel <家|農田|森林|礦場|探索迷霧>,building <name>,interact <term>,gather [伐木|採鐵礦],seek,turn <attack|defend|potion|run>,enter-mine,explore-mine,leave-mine,hire,rest [旅店|家],open <c|i|l|m>,buttons [dialog|page],click <visible exact dialog button>,click-page <visible exact button>,close,menu,note <label>,save-reload,pause,resume,screenshot,decision <text>,quit\nADVENTURE_SEGMENT {SEGMENT} {started_utc} cumulativeTargetSeconds={TARGET_SECONDS}",flush=True)
        for line in sys.stdin:
            text=line.strip()
            if not text: continue
            op,*rest=text.split(' ',1); arg=rest[0] if rest else ''
            try:
                if op=='quit': break
                if op in ('status','checkpoint'): observe(arg or 'agent open-world checkpoint',True)
                elif op=='map': list_map()
                elif op=='travel': remember('map travel',travel(arg))
                elif op=='building':
                    open_map(); matches=page.locator('.overview-map button.is-building').evaluate_all('(xs)=>xs.map(x=>({position:x.getAttribute("data-position"),label:x.getAttribute("aria-label")}))')
                    match=next((x for x in matches if arg in (x.get('label') or '')),None)
                    if match:
                        page.locator(f'.overview-map button[data-position="{match["position"]}"]').click(); page.wait_for_timeout(250); close_dialog()
                        remember('map travel to building',{'requested':arg,**match,'positionAfter':active(raw()).get('position')})
                    else:
                        close_dialog(); print('BUILDINGS '+json.dumps(matches,ensure_ascii=False),flush=True)
                elif op=='interact': print('INTERACTION '+str(choose_interaction(arg)),flush=True)
                elif op=='gather': print('GATHER '+str(gather(arg or '伐木')),flush=True)
                elif op=='seek':
                    if not page.locator('dialog[open]').count(): choose_interaction('森林')
                    control=page.get_by_role('button',name=re.compile('尋找怪物'))
                    if control.count() and not control.first.is_disabled(): control.first.click(); page.wait_for_timeout(160); remember('start forest encounter',page.locator('dialog[open]').inner_text()[:300])
                    else: print('SEEK unavailable/disabled',flush=True)
                elif op=='turn': one_turn(arg or 'attack')
                elif op=='enter-mine':
                    if not page.locator('dialog[open]').count(): choose_interaction('廢棄礦坑')
                    control=page.get_by_role('button',name=re.compile('進入.*礦坑|進入廢棄礦坑|重返'))
                    if control.count() and not control.first.is_disabled(): control.first.click(); page.wait_for_timeout(160); remember('enter mine',raw().get('dungeon'))
                    else: print('MINE entry unavailable',flush=True)
                elif op=='explore-mine':
                    if not page.locator('dialog[open]').count(): page.locator('.context-action').click()
                    control=page.get_by_role('button',name=re.compile('探索下一段|探索下一層'))
                    if control.count() and not control.first.is_disabled(): control.first.click(); page.wait_for_timeout(160); remember('explore mine UI action',raw().get('combat'))
                    else: print('MINE exploration unavailable',flush=True)
                elif op=='leave-mine':
                    if not page.locator('dialog[open]').count(): page.locator('.context-action').click()
                    control=page.get_by_role('button',name=re.compile('離開礦坑|離開地下城'))
                    if control.count(): control.first.click(); page.wait_for_timeout(160); remember('leave mine UI action',raw().get('dungeon'))
                elif op=='hire':
                    if not page.locator('dialog[open]').count(): choose_interaction('酒館')
                    candidates=page.locator('dialog[open] .mercenary')
                    result=[]
                    for i in range(candidates.count()):
                        card=candidates.nth(i); hire=card.get_by_role('button',name='聘請',exact=True)
                        result.append({'candidate':card.inner_text(),'disabled':hire.is_disabled() if hire.count() else True})
                    enabled=next((candidates.nth(i).get_by_role('button',name='聘請',exact=True) for i in range(candidates.count()) if candidates.nth(i).get_by_role('button',name='聘請',exact=True).count() and not candidates.nth(i).get_by_role('button',name='聘請',exact=True).is_disabled()),None)
                    if enabled: enabled.click(); remember('hire companion UI action',result)
                    else: print('CANDIDATES '+json.dumps(result,ensure_ascii=False),flush=True)
                elif op=='rest':
                    choose_interaction('旅店' if arg=='旅店' else '家')
                    choices=page.get_by_role('button',name=re.compile('住宿|休息'))
                    if choices.count() and not choices.first.is_disabled(): choices.first.click(); page.wait_for_timeout(150); remember('rest UI action',choices.first.inner_text())
                    else: print('REST unavailable/closed/disabled',flush=True)
                elif op=='open': open_panel(arg or 'i')
                elif op=='buttons': print('BUTTONS '+json.dumps(visible_button_labels(arg or 'dialog'),ensure_ascii=False),flush=True)
                elif op=='click': print('CLICK '+str(click_visible(arg,'dialog')),flush=True)
                elif op=='click-page': print('CLICK '+str(click_visible(arg,'page')),flush=True)
                elif op=='close': print('CLOSE_RESULT '+str(close_ui()),flush=True)
                elif op=='menu': print('MENU_RESULT '+str(open_menu()),flush=True)
                elif op=='note':
                    close_dialog(); page.locator('.world-bottom').get_by_role('button',name='旅人筆記',exact=True).click(); page.wait_for_timeout(120)
                    control=button(arg)
                    if control.count() and not control.first.is_disabled(): control.first.click(); page.wait_for_timeout(150); remember('traveler notes time/action UI',arg)
                    else: print('NOTE action unavailable: '+arg,flush=True)
                elif op=='save-reload': print('RELOAD '+json.dumps(save_reload(),ensure_ascii=False),flush=True)
                elif op=='pause': print('PAUSE '+str(pause_ui()),flush=True)
                elif op=='resume': print('RESUME '+str(resume_speed()),flush=True)
                elif op=='screenshot': page.screenshot(path=str(ARTIFACTS/f"manual-{len(observations)+1:02d}.png"),full_page=True); print('SCREENSHOT saved',flush=True)
                elif op=='decision': note_decision(arg)
                else: print('Unknown command: '+op,flush=True)
            except Exception as e:
                errors['harness'].append({'atUtc':utc(),'command':text,'error':str(e),'trace':traceback.format_exc()})
                write(); print('HARNESS_ERROR '+json.dumps(errors['harness'][-1],ensure_ascii=False),flush=True)
        write('completed' if CUMULATIVE_OFFSET+time.monotonic()-started_mono>=TARGET_SECONDS else 'stopped-short')
        ctx.close()

if __name__=='__main__': main()
