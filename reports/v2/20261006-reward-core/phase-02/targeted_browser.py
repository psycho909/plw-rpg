"""Phase2 production Chromium targeted run: normal UI, no injected game state or fake clock."""
import hashlib, json, os, sys, time
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT))
from scripts.recorded_reports import write_recorded
OUT=Path(__file__).resolve().parent
URL=os.environ.get('PLW_V2_URL','http://127.0.0.1:5202')
DURATION=float(os.environ.get('PLW_TARGET_SECONDS','600'))
assert DURATION>=600
source={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').rglob('*')) if p.is_file()}
build_status=json.loads((OUT/'build-status.json').read_text())
assert build_status['exitCode']==0 and build_status['sourceStableDuringRun'] and build_status['sourceSha256']==source, 'Production build fingerprint mismatch'
import subprocess
result={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'sourceSha256':source,'workingTreeSource':True,
'startUTC':datetime.now(timezone.utc).isoformat(),'checks':[],'checkpoints':[],'pageErrors':[],'consoleErrors':[],'rejections':[],'reloads':0,'operations':0,'limitations':['Agent/runtime QA, not human playtest.','Chromium only; native Safari and physical devices excluded.','Heap trend is a 10-minute observation, not a long-term leak clearance.']}
def publish():
    write_recorded(OUT/'targeted-browser.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n',producer='v2x-targeted-browser')
def check(name,**detail):
    result['checks'].append({'name':name,**detail});publish();print('PASS',name,flush=True)
def raw(page):return page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
def actor(s):return next(c for c in s['characters'] if c['id']==s['activeCharacterId'])
def close(page):
    if page.locator('dialog[open]').count():page.keyboard.press('Escape')
def pause(page):
    close(page);page.get_by_role('button',name='暫停',exact=True).click()
def inventory(page):
    close(page);page.keyboard.press('i');expect(page.locator('dialog[open]')).to_have_count(1)
def gear_view(page):
    inventory(page);page.get_by_role('button',name='獵獲裝備',exact=True).click()
def walk(page,x,y):
    close(page)
    for _ in range(80):
        c=actor(raw(page));p=c['position']
        if p=={'x':x,'y':y}:return
        if p['x']!=x:key='ArrowRight' if p['x']<x else 'ArrowLeft'
        else:key='ArrowDown' if p['y']<y else 'ArrowUp'
        page.keyboard.press(key)
    raise AssertionError('UI walk did not reach target')
def place(page):
    close(page);page.locator('.context-action').click();expect(page.locator('dialog[open]')).to_have_count(1)
def checkpoint(page,cdp,started):
    s=raw(page);c=actor(s)
    metrics=cdp.send('Runtime.getHeapUsage');dom=cdp.send('Memory.getDOMCounters')
    storage=page.evaluate("async()=>({estimate:await navigator.storage.estimate(),saveBytes:new TextEncoder().encode(localStorage.getItem('oakvale-v1')).length,saveLatency:window.__qaSaveLatency.slice(-20),rejections:window.__qaRejections.slice()})")
    result['checkpoints'].append({'elapsed':time.monotonic()-started,'atUTC':datetime.now(timezone.utc).isoformat(),'worldTime':s['worldTime'],'population':sum(n['isAlive'] for n in s['npcs'])+sum(n['isAlive'] for n in s['characters']),'livingNPC':sum(n['isAlive'] for n in s['npcs']),'deadNPC':sum(not n['isAlive'] for n in s['npcs']),'gold':c['gold'],'settlement':s['settlement'],'threat':s['threat'],'events':len(s['events']),'history':len(s['history']),'instances':len(s['reward']['instances']),'journalPending':len(s['playJournal']['pending']),'dom':dom,'heap':metrics,'storage':storage})
    publish()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page();result['browser']=browser.version
    page.on('pageerror',lambda e:result['pageErrors'].append(str(e)))
    page.on('console',lambda m:result['consoleErrors'].append({'text':m.text,'location':m.location}) if m.type=='error' else None)
    page.expose_function('__qaRejected',lambda message:result['rejections'].append(message))
    page.add_init_script("""(() => {window.__qaSaveLatency=[];window.__qaRejections=[];window.addEventListener('unhandledrejection',e=>{window.__qaRejections.push(String(e.reason));void window.__qaRejected(String(e.reason));});const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){const t=performance.now();const result=native.call(this,k,v);if(k==='oakvale-v1'){window.__qaSaveLatency.push(performance.now()-t);if(window.__qaSaveLatency.length>120)window.__qaSaveLatency.shift();if(!window.__qaFirstCheckpoint)window.__qaFirstCheckpoint=JSON.parse(v);}return result;};})();""")
    started=time.monotonic()
    try:
        page.goto(URL);page.get_by_role('button',name='起身',exact=True).click();pause(page)
        result['initial']=raw(page)
        inventory(page);page.get_by_role('button',name='獵獲裝備',exact=True).click()
        expect(page.locator('.empty-state')).to_contain_text('北方森林')
        check('new normal save exposes an actionable empty gear state')
        # Follow normal play until a real wolf reward arrives. No gold/level/inventory injection.
        for hunt in range(16):
            if raw(page)['reward']['instances']:break
            s=raw(page);c=actor(s)
            if c['hp']<55 or c['stamina']<24 or s['threat']['monsterPopulation']<1:
                walk(page,7,9);place(page)
                for _ in range(3):page.get_by_role('button',name='休息 · 1 小時',exact=True).click()
                for _ in range(120):
                    if raw(page)['threat']['monsterPopulation']>=1:break
                    page.get_by_role('button',name='休息 · 1 小時',exact=True).click()
            walk(page,7,6);place(page)
            ready=raw(page);result['checks'].append({'name':'hunt eligibility checkpoint','hunt':hunt,'worldTime':ready['worldTime'],'threat':ready['threat'],'actor':actor(ready)});publish()
            assert ready['threat']['monsterPopulation']>=1 and actor(ready)['stamina']>=8, 'normal hunt prerequisites unavailable after UI rest'
            page.get_by_role('button',name='尋找怪物 · 體力 8',exact=True).click()
            encounter_state=raw(page);was_wolf=encounter_state['combat']['monsterId']=='wolf';generic_before=actor(encounter_state)['inventory']['material']
            for _ in range(80):
                s=raw(page)
                if not s['combat']:break
                c=actor(s)
                command='使用藥水' if c['hp']<35 and c['inventory']['potion'] else '攻擊'
                page.get_by_role('button',name=command,exact=True).click()
            assert actor(raw(page))['isAlive'],'normal loot route died'
            if was_wolf:assert actor(raw(page))['inventory']['material']==generic_before, 'wolf duplicated legacy generic payout'
        state=raw(page);assert state['reward']['instances'],'normal UI did not produce gear after wolf kills'
        assert any(e['type']=='combat.won' for e in state['events'])
        loot=state['reward']['instances'][0]
        check('normal kill produces a persisted wolf equipment instance',item=loot)
        gear_view(page);expect(page.locator('.gear-detail')).to_contain_text('目前同部位')
        page.get_by_role('button',name='穿戴獵獲裝備',exact=True).click()
        expect(page.locator('dialog .status-notice')).to_contain_text('穿戴')
        state=raw(page);equipped=state['reward']['equipped'][state['activeCharacterId']]
        assert loot['instanceId'] in equipped.values()
        page.screenshot(path=str(OUT/'gear-desktop.png'))
        check('inspect comparison and equip through real UI')
        page.get_by_role('button',name='狼族素材',exact=True).click();expect(page.locator('.reward-material')).to_have_count(3)
        page.get_by_role('button',name='見聞收藏',exact=True).click();expect(page.locator('.reward-discovery')).to_contain_text('灰狼')
        check('material and discovery panels read awarded state')
        close(page)
        for _ in range(26):
            hour=raw(page)['worldTime']%1440//60
            if 8<=hour<19:break
            walk(page,7,9);place(page);page.get_by_role('button',name='休息 · 1 小時',exact=True).click();close(page)
        walk(page,10,8);inventory(page);page.get_by_role('button',name='狼族素材',exact=True).click()
        before_sale=raw(page);owner=before_sale['activeCharacterId'];fangs=before_sale['reward']['materials'][owner]['wolfFang'];gold=actor(before_sale)['gold']
        page.get_by_role('button',name='出售一份狼牙 · 5 金',exact=True).click()
        after_sale=raw(page)
        assert after_sale['reward']['materials'][owner]['wolfFang']==fangs-1 and actor(after_sale)['gold']==gold+5
        check('normal awarded material has real trade utility at the existing store')
        pause(page);page.get_by_role('button',name='存檔',exact=True).click();saved=raw(page)
        page.reload();page.wait_for_selector('.world-map')
        loaded=page.evaluate('window.__qaFirstCheckpoint')
        assert loaded['reward']==saved['reward'] and loaded['worldTime']==saved['worldTime'] and loaded['rngState']==saved['rngState']
        result['reloads']+=1;check('normal save reload preserves exact rolled loot and equipped references without offline progress')
        gear_view(page);page.set_viewport_size({'width':390,'height':844})
        expect(page.locator('.gear-detail')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(OUT/'gear-390.png'))
        page.keyboard.press('Tab');assert page.evaluate("!!document.activeElement.closest('dialog')")
        page.keyboard.press('Escape');expect(page.locator('dialog[open]')).to_have_count(0)
        check('390px reduced-motion gear view and keyboard modal containment')
        page.set_viewport_size({'width':1440,'height':1000})
        page.get_by_role('button',name='×1',exact=True).click()
        cdp=context.new_cdp_session(page)
        checkpoint(page,cdp,started)
        cycle=0;next_checkpoint=time.monotonic()+10;next_reload=time.monotonic()+150
        while time.monotonic()-started<DURATION:
            gear_view(page)
            button=page.get_by_role('button',name='卸下獵獲裝備',exact=True)
            if button.count():button.click()
            else:page.get_by_role('button',name='穿戴獵獲裝備',exact=True).click()
            page.get_by_role('button',name='狼族素材',exact=True).click()
            page.get_by_role('button',name='見聞收藏',exact=True).click()
            page.get_by_role('button',name='日常物品',exact=True).click()
            close(page);cycle+=1;result['operations']+=5
            if time.monotonic()>=next_checkpoint:
                checkpoint(page,cdp,started);next_checkpoint=time.monotonic()+10
            if time.monotonic()>=next_reload:
                pause(page);page.get_by_role('button',name='存檔',exact=True).click();saved=raw(page)
                page.reload();page.wait_for_selector('.world-map');loaded=page.evaluate('window.__qaFirstCheckpoint')
                assert loaded['reward']==saved['reward'] and loaded['worldTime']==saved['worldTime']
                result['reloads']+=1;next_reload=time.monotonic()+150
            page.wait_for_timeout(2500)
        checkpoint(page,cdp,started)
        result['final']=raw(page);result['cycles']=cycle
        assert cycle>=100,cycle
        assert not result['pageErrors'] and not result['rejections']
        unexpected=[e for e in result['consoleErrors'] if 'favicon.ico' not in e['location'].get('url','')]
        assert not unexpected,unexpected
        assert result['final']['worldTime']>result['initial']['worldTime']
        assert source=={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').rglob('*')) if p.is_file()}
        result['status']='PASS';check('targeted runtime completes with 100+ repeated gear/modal cycles and stable tested source')
    except BaseException as e:
        result['status']='FAIL';result['failure']=repr(e)
        try:result['failureState']=raw(page);page.screenshot(path=str(OUT/'failure-screen.png'))
        except Exception as diagnostic:result['diagnosticFailure']=repr(diagnostic)
        publish();raise
    finally:
        result['durationSeconds']=time.monotonic()-started;result['endUTC']=datetime.now(timezone.utc).isoformat();publish()
        context.close();browser.close()
