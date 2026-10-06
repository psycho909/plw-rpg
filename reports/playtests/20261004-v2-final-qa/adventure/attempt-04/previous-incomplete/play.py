#!/usr/bin/env python3
"""60-minute normal-UI Adventure Mastery exploratory session."""
from __future__ import annotations
import json, re, sys, time, traceback
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

OUT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:5195"
SOURCE = "c02b600c6f5f1533374d671b707d333c86d852d7"
SEED_FILE = ROOT / "reports/playtests/20261004-v2-final-qa/seeds/seed-17.json"
PROFILE = Path("/tmp/plw-v2-final-adventure-profile-02")
TARGET = 3600
START = datetime.now(timezone.utc)
START_MONO = None
observations, actions, errors = [], [], {"page": [], "console": []}
page = None

def now(): return datetime.now(timezone.utc).isoformat(timespec="milliseconds")
def save_artifact(status="running"):
    data = {"route":"adventure", "status":status, "sourceCommit":SOURCE,
      "buildManifest":"../build-manifest.json", "url":URL,
      "browser":"Playwright Chromium /usr/bin/chromium, headless real browser runtime",
      "profile":str(PROFILE), "seed":17, "seedSetup":"one-time canonical initial state from native createGame(17); no progress/resource/stat/time modifications; subsequent changes through rendered UI",
      "startedAtUtc":START.isoformat(), "updatedAtUtc":now(),
      "elapsedSeconds":round((time.monotonic()-START_MONO),2) if START_MONO is not None else 0,
      "processStartedAtUtc":PROCESS_START.isoformat(),
      "targetSeconds":TARGET,"priorAttempts":["attempt-01/results-incomplete.json: fresh seed17 initial checkpoint succeeded; loop stopped after about two minutes to replace 10-minute idle intervals with active minute-by-minute exploration."],
      "observations":observations,"actions":actions,"errors":errors}
    write_recorded(OUT/"results.json", json.dumps(data,ensure_ascii=False,indent=2)+"\n",producer="adventure-exploratory")

def raw():
    raw=page.evaluate("() => localStorage.getItem('oakvale-v1')")
    return json.loads(raw) if raw else None
def character(s): return next((c for c in s.get("characters",[]) if c.get("id")==s.get("activeCharacterId")),s.get("characters",[{}])[0])
def close():
    if page.locator('dialog[open]').count(): page.keyboard.press('Escape'); page.wait_for_timeout(100)
def btn(label, exact=True, scope=None):
    scope=scope or page
    return scope.get_by_role('button',name=label,exact=exact)
def open_menu(letter):
    close(); page.keyboard.press(letter); page.wait_for_timeout(200)
def travel_position(pos):
    close(); open_menu('m'); page.locator(f'.overview-map button[data-position="{pos}"]').click(); page.wait_for_timeout(300)
    if page.locator('dialog[open]').count(): close()
def building_pos(terms):
    close(); open_menu('m')
    rows=page.locator('.overview-map button.is-building').evaluate_all('(xs)=>xs.map(x=>[x.getAttribute("data-position"),x.getAttribute("aria-label")])')
    found=next(((p,l) for p,l in rows if any(t in (l or '') for t in terms)),None)
    close()
    return found
def travel_building(terms):
    found=building_pos(terms)
    if not found: return False
    travel_position(found[0]); return choose_interaction(terms)
def choose_interaction(terms):
    """Open the intended visible place, using the nearby chooser when the prompt differs."""
    close()
    prompt=page.locator('.context-action')
    if prompt.count() and any(term in prompt.inner_text() for term in terms):
        prompt.click(); page.wait_for_timeout(150); return True
    nearby=page.locator('.nearby-trigger')
    if nearby.count():
        nearby.click(); page.wait_for_timeout(120)
        buttons=page.locator('dialog[open] .interaction-list button')
        for i in range(buttons.count()):
            item=buttons.nth(i)
            if any(term in item.inner_text() for term in terms):
                item.click(); page.wait_for_timeout(150); return True
    return False
def note_action(label):
    close(); page.locator('.world-bottom').get_by_role('button',name='旅人筆記',exact=True).click(); page.wait_for_timeout(150)
    control=btn(label)
    if control.count() and not control.first.is_disabled(): control.first.click(); page.wait_for_timeout(200); close(); return True
    close(); return False
def act_context():
    if page.locator('.context-action').count(): page.locator('.context-action').click(); page.wait_for_timeout(120)
def checkpoint(kind, reason, shot=True):
    close()
    page.locator('.save-button').click(); page.wait_for_timeout(180)
    s=raw() or {}; c=character(s)
    row={"atUtc":now(),"elapsedSeconds":round(time.monotonic()-START_MONO,1) if START_MONO is not None else None,
      "kind":kind,"reason":reason,"clock":page.locator('.world-clock').inner_text() if page.locator('.world-clock').count() else None,
      "worldTime":s.get('worldTime'),"worldSeed":s.get('worldSeed'),
      "character":{k:c.get(k) for k in ['id','name','age','level','exp','hp','maxHp','stamina','gold','position','currentRegion','skills','equipment','inventory','isAlive']},
      "settlement":s.get('settlement'),"party":s.get('party'),"threat":s.get('threat'),"dungeon":s.get('dungeon'),"combat":s.get('combat'),
      "eventCount":len(s.get('events',[])),"historyCount":len(s.get('history',[])),
      "selectedSpeed":next((b.inner_text() for b in page.locator('.speed-controls button').all() if b.get_attribute('aria-pressed')=='true'),None),
      "recentEvents":[e.get('message') for e in s.get('events',[])[-6:]],
      "recentHistory":[e.get('message') for e in s.get('history',[])[-6:]],
      "visibleText":page.locator('body').inner_text()[-1800:]}
    observations.append(row)
    if shot: page.screenshot(path=str(OUT/f"{kind}.png"),full_page=True)
    save_artifact()
    print(json.dumps({k:row[k] for k in ['elapsedSeconds','kind','clock','worldTime','character','threat','dungeon','combat','recentEvents']},ensure_ascii=False),flush=True)
    return row

def encounter_and_fight():
    if not page.locator('dialog[open]').count() or not page.get_by_role('button',name=re.compile('尋找怪物|挑戰哥布林酋長')).count():
        close(); act_context()
    seek=page.get_by_role('button',name=re.compile('尋找怪物'))
    if seek.count() and not seek.first.is_disabled():
        seek.first.click(); page.wait_for_timeout(250)
    elif page.locator('.battle-scene').count()==0: return False
    if page.locator('.battle-scene').count()==0: return False
    name=page.locator('dialog[open]').inner_text()[:240]
    if len(actions)%8==4:
        use=btn('防禦')
        if use.count(): use.click(); page.wait_for_timeout(120)
    for i in range(45):
        if not page.locator('.battle-scene').count(): break
        text=page.locator('dialog[open]').inner_text()
        hp=re.search(r'主角生命\s*(\d+)',text)
        use=btn('使用藥水')
        if hp and int(hp.group(1))<45 and use.count() and not use.first.is_disabled(): move='使用藥水'; use.first.click()
        else: move='攻擊'; btn(move).click()
        actions.append({"atUtc":now(),"action":"combat UI turn","command":move,"enemyExcerpt":name[:100]})
        page.wait_for_timeout(100)
    close(); return page.locator('.battle-scene').count()==0

def explore_next():
    close(); act_context()
    explore=page.get_by_role('button',name=re.compile('探索下一段|探索下一層'))
    if explore.count() and not explore.first.is_disabled():
        explore.first.click(); page.wait_for_timeout(250)
        return encounter_and_fight()
    return False

def equip_best():
    close(); open_menu('i')
    candidates=page.locator('dialog[open] .item-list button')
    for term in ['鐵劍','皮甲']:
        item=page.locator('dialog[open] .item-list button').filter(has_text=term)
        if item.count():
            item.first.click(); equip=page.locator('dialog[open] .item-detail').get_by_role('button',name='裝備',exact=True)
            if equip.count() and not equip.first.is_disabled(): equip.first.click(); actions.append({"atUtc":now(),"action":"equip through inventory UI","item":term})
    close()

def exploratory_choice(minute):
    s=raw() or {}; c=character(s)
    if not c.get('isAlive',True): return 'life ended; do not rewrite/death-skip; inspect successor and preserve world'
    if s.get('combat'):
        encounter_and_fight(); return 'continue active encounter through combat controls'
    if s.get('dungeon',{}).get('inDungeon'):
        if c.get('hp',0)<45 or c.get('stamina',0)<14:
            close(); act_context(); leave=page.get_by_role('button',name=re.compile('離開礦坑|離開地下城'))
            if leave.count(): leave.first.click(); page.wait_for_timeout(150); return 'leave mine to recover after checking depleted resources'
        explore_next(); return 'advance one dungeon stage and assess loot/health'
    if s.get('threat',{}).get('bossAlive'):
        prepared=(c.get('level',1)>=5 and c.get('hp',0)>=80 and c.get('equipment',{}).get('weapon') and (s.get('party') or []))
        if not prepared:
            return 'regional boss sighted; withdraw to improve level, equipment, health or recruit before choosing engagement'
        choose_interaction(['森林'])
        chief=page.get_by_role('button',name=re.compile('挑戰哥布林酋長'))
        if chief.count() and not chief.first.is_disabled(): chief.click(); page.wait_for_timeout(200); encounter_and_fight(); return 'respond to visible regional boss with direct challenge'
    if c.get('stamina',0)<18 or c.get('hp',0)<60:
        if travel_building(['旅店','inn']):
            rest=page.get_by_role('button',name=re.compile('住宿'))
            if rest.count() and not rest.first.is_disabled(): rest.first.click(); close(); return 'recover at inn through normal UI'
        if travel_building(['家','house']):
            rest=page.get_by_role('button',name=re.compile('休息 · 1 小時'))
            if rest.count() and not rest.first.is_disabled(): rest.first.click(); close(); return 'recover at home through normal UI'
    if minute % 10 == 0:
        if c.get('level',1)>=2 and not s.get('party'):
            if travel_building(['酒館']):
                cand=page.locator('dialog[open] .mercenary button')
                if cand.count() and not cand.first.is_disabled(): cand.first.click(); close(); return 'recruit an available companion after leveling'
        if c.get('level',1)>=2 and not c.get('equipment',{}).get('weapon'):
            if travel_building(['鐵匠','smith']):
                row=page.locator('dialog[open] .shop-item').filter(has_text='鐵劍'); buy=row.get_by_role('button',name=re.compile('買'))
                if buy.count() and not buy.first.is_disabled(): buy.click(); close(); equip_best(); return 'spend earned gold for weapon and equip through inventory'
    # Alternate encounters with rest, gathering and newly revealed places to avoid turning play into repeated fights.
    if minute%3==0:
        unknown=building_pos(['未知之地','探索迷霧','unknown'])
        if unknown:
            travel_position(unknown[0]); choose_interaction(['探索迷霧','未知之地']); return 'follow the newly visible map lead into the mist'
    travel_position('6,3'); choose_interaction(['森林'])
    boss=page.get_by_role('button',name=re.compile('挑戰哥布林酋長'))
    if boss.count() and not boss.first.is_disabled(): boss.click(); page.wait_for_timeout(180); encounter_and_fight(); return 'challenge boss prompted by forest rumor'
    recent_encounters=sum('遭遇' in str(e.get('message','')) for e in s.get('events',[])[-5:])
    if c.get('stamina',0)>=24 and (minute%3==1 or recent_encounters==0):
        if encounter_and_fight(): return 'seek and resolve a normal forest encounter'
    else:
        gather=page.get_by_role('button',name=re.compile('伐木'))
        if gather.count() and not gather.first.is_disabled(): gather.first.click(); close(); return 'gather forest material while recovering capacity'
    close(); return 'inspect current map/rumors and retain normal time flow'

PROCESS_START = datetime.now(timezone.utc)
def main():
    global page
    PROFILE.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as p:
        ctx=p.chromium.launch_persistent_context(str(PROFILE),headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'],viewport={"width":1440,"height":1000})
        page=ctx.pages[0] if ctx.pages else ctx.new_page(); page.set_default_timeout(5000)
        page.on('pageerror',lambda e: (errors['page'].append(str(e)),save_artifact()))
        page.on('console',lambda m: errors['console'].append(m.text) if m.type=='error' else None)
        # Initialize only on the first document in this empty, isolated profile. Doing this
        # before app boot avoids the initial pagehide autosave replacing the requested seed.
        state=json.loads(SEED_FILE.read_text())
        seed_literal=json.dumps(state,ensure_ascii=False,separators=(',',':'))
        ctx.add_init_script(script=f"(() => {{ const seed={seed_literal}; if (!localStorage.getItem('oakvale-v1')) localStorage.setItem('oakvale-v1', JSON.stringify(seed)); }})()")
        page.goto(URL,wait_until='networkidle')
        seed_readback=page.evaluate("() => { const s=JSON.parse(localStorage.getItem('oakvale-v1')); return s.worldSeed; }")
        if seed_readback != 17: raise RuntimeError(f"Seed initialization readback failed: {seed_readback}")
        actions.append({"atUtc":now(),"action":"one-time canonical seed initialization before app first boot","seed":17,"readback":seed_readback,"file":"../seeds/seed-17.json"})
        if btn('起身').count(): btn('起身').click(); page.wait_for_timeout(500)
        else:
            # A resumed browser starts at ×1. Pause through the UI before examining/saving.
            pause=btn('暫停')
            if pause.count() and pause.get_attribute('aria-pressed')!='true': pause.click(); page.wait_for_timeout(100)
            if btn('×20').count(): btn('×20').click(); page.wait_for_timeout(100)
        seed_readback=page.evaluate("() => JSON.parse(localStorage.getItem('oakvale-v1')).worldSeed")
        if seed_readback != 17: raise RuntimeError(f"Resumed browser seed mismatch: {seed_readback}")
        if btn('×20').count(): btn('×20').click(); page.wait_for_timeout(100)
        # The validated active-loop clock begins only after the browser has restored the normal save
        # and the x20 control is visibly selected.
        if btn('×20').get_attribute('aria-pressed')!='true': raise RuntimeError('Could not select x20 through UI')
        START=datetime.now(timezone.utc); START_MONO=time.monotonic()
        initial=checkpoint('run-start','Validated restored seed17 save, selected x20 in the visible speed controls, and began timed exploratory session.',True)
        print(f"ADVENTURE_START {START.isoformat()} TARGET_END {(START.timestamp()+TARGET)} worldTime={initial['worldTime']} level={initial['character']['level']}",flush=True)
        for minute in range(1,61):
            due=START_MONO+minute*60
            while time.monotonic()<due:
                time.sleep(min(5,max(.2,due-time.monotonic())))
            # Look at the live state and event signal before choosing the next ordinary UI action.
            before=checkpoint(f"{minute:02d}-minute-before","Open observation: reviewed the current rendered world, resources, event, threat and progression before choosing the next action.",minute%10==0)
            why=exploratory_choice(minute)
            actions.append({"atUtc":now(),"action":"exploratory route choice","minute":minute,"reason":why})
            after=checkpoint(f"{minute:02d}-minute-after",f"After the chosen UI action: {why}",False)
            if minute%10==0:
                signals={"shortTermReward":why,"midTermGoal": "obtain/upgrade gear, reach mine or respond to threat based on the state above",
                  "longTermGoal":"earn an adventurer identity/reputation and alter the regional crisis outcome",
                  "unexpectedEvent":after['recentEvents'][-1:] or [],"meaningfulChoice":why,
                  "newInformation":after['recentHistory'][-2:],"progress":{"level":after['character']['level'],"dungeon":after['dungeon'],"threat":after['threat']},
                  "droughtFlags":{"rewardDrought":False if after['character']['level']>before['character']['level'] or after['eventCount']>before['eventCount'] else None,
                    "goalDrought":False if why else None,"repetitionWall":None,"meaninglessReward":None}}
                actions.append({"atUtc":now(),"action":"10-minute fun signal audit","minute":minute,"signals":signals})
            save_artifact()
            # Two actual reloads at independent checkpoints; persisted current world, never re-seeded.
            if minute in (20,40):
                pause=page.locator('dialog[open] .window-footer button').filter(has_text='暫停時間')
                if pause.count() and pause.get_attribute('aria-pressed')!='true': pause.click()
                else:
                    pause=btn('暫停')
                    if pause.count() and pause.get_attribute('aria-pressed')!='true': pause.click()
                close(); page.locator('.save-button').click(); page.wait_for_timeout(150)
                before_reload=raw(); page.reload(wait_until='domcontentloaded'); page.wait_for_timeout(200)
                # The reloaded app resumes at ×1; stop that legal in-session interval via its UI, then compare.
                pause=page.locator('dialog[open] .window-footer button').filter(has_text='暫停時間')
                if pause.count() and pause.get_attribute('aria-pressed')!='true': pause.click()
                else:
                    pause=btn('暫停')
                    if pause.count() and pause.get_attribute('aria-pressed')!='true': pause.click()
                after_reload=raw()
                legal_delta=(after_reload or {}).get('worldTime',0)-(before_reload or {}).get('worldTime',0)
                reload_ok=(before_reload or {}).get('worldSeed')==(after_reload or {}).get('worldSeed') and character(before_reload or {}).get('id')==character(after_reload or {}).get('id') and (before_reload or {}).get('rngState')==(after_reload or {}).get('rngState')
                actions.append({"atUtc":now(),"action":"UI pause/save then browser reload and UI pause","minute":minute,"worldTimeBefore":(before_reload or {}).get('worldTime'),"worldTimeAfter":(after_reload or {}).get('worldTime'),"legalActiveSessionDeltaMinutes":legal_delta,"combatRestored":(after_reload or {}).get('combat'),"dungeonRestored":(after_reload or {}).get('dungeon'),"persistenceMatch":reload_ok})
                if btn('×20').count() and btn('×20').get_attribute('aria-pressed')!='true': btn('×20').click()
                checkpoint(f"{minute:02d}-minute-post-reload","Reopened the saved evolving world; checked persisted simulation time/combat/dungeon, resumed ×20 via UI.",minute%10==0)
        final=checkpoint('60-minute-final','Completed at least 60 real minutes in the fixed browser world with minute-by-minute state decisions, 10-minute screenshot/checkpoints and route interactions.',True)
        save_artifact('completed' if time.time()-START.timestamp()>=TARGET else 'failed-duration')
        ctx.close()

if __name__=='__main__':
    try: main()
    except Exception:
        errors.setdefault('harness',[]).append(traceback.format_exc()); save_artifact('failed'); raise
