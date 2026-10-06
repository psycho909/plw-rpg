"""Disposable production Chromium checks; no fake clock or server/player data.
Run from repo root after build: PLW_V2_URL=http://127.0.0.1:5194 python3 reports/v2/20261004-life-emergence/verify_browser.py
"""
import copy
import hashlib
import json
import os
from pathlib import Path
import sys
import time
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded
OUT = Path(__file__).resolve().parent
URL = os.environ.get('PLW_V2_URL', 'http://127.0.0.1:5195')
assert urlsplit(URL).hostname in {'127.0.0.1', 'localhost'}
result = {'sourceCommit': 'c02b600c6f5f1533374d671b707d333c86d852d7', 'evidenceClass': 'browser regression; controlled fixtures explicitly listed; not natural exploratory/soak', 'checks': [], 'errors': [], 'fixtures': [], 'profiles': [], 'source_sha256': {}}
for source in sorted((ROOT / 'src').rglob('*')):
    if source.is_file():
        result['source_sha256'][str(source.relative_to(ROOT))] = hashlib.sha256(source.read_bytes()).hexdigest()

def record(name, **details):
    result['checks'].append({'name': name, **details})
    write_recorded(OUT / 'browser.json', json.dumps(result, ensure_ascii=False, indent=2), producer='v2-browser')
    print('PASS', name, flush=True)

def raw(page):
    return page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")

def close(page):
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')

def pause(page):
    close(page)
    page.get_by_role('button', name='暫停', exact=True).click()

def window(page, label):
    close(page)
    page.locator('.menu-trigger').click()
    page.locator('.pixel-menu').get_by_role('button', name=label, exact=True).click()
    expect(page.locator('dialog[open]')).to_have_count(1)

def new_page(browser, fixture=None, viewport=None):
    context = browser.new_context(viewport=viewport or {'width': 1440, 'height': 1000})
    page = context.new_page()
    page.on('pageerror', lambda e: result['errors'].append(str(e)))
    if fixture is not None:
        page.add_init_script('localStorage.setItem("oakvale-v1",' + json.dumps(json.dumps(fixture, ensure_ascii=False)) + ')')
    page.goto(URL)
    page.wait_for_selector('.world-map')
    return context, page

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    result['browser'] = browser.version
    context, page = new_page(browser)
    start = raw(page)['worldTime']
    page.wait_for_timeout(1100)
    page.get_by_role('button', name='繼續時間', exact=True).click()
    page.keyboard.press('Escape')
    page.wait_for_timeout(600)
    assert raw(page)['worldTime'] == start
    expect(page.get_by_role('button', name='起身', exact=True)).to_be_visible()
    record('opening freezes time and resists Escape/resume', worldTime=start)
    page.get_by_role('button', name='起身', exact=True).click()
    pause(page)
    base = raw(page)
    assert base['life']['openingSeen'] and base['saveVersion'] == 2
    window(page, '這一生')
    expect(page.locator('.identity-roles')).to_contain_text('居民')
    page.get_by_role('button', name='繼續時間', exact=True).click()
    before = raw(page)['worldTime']
    page.wait_for_timeout(1300)
    page.get_by_role('button', name='暫停時間', exact=True).click()
    after = raw(page)['worldTime']
    assert after > before
    record('modal retains Active Idle and pause flushes elapsed time', before=before, after=after)
    close(page)
    page.get_by_role('button', name='×5', exact=True).click()
    page.wait_for_timeout(1000)
    pause(page)
    x5 = raw(page)['worldTime']
    assert x5 >= after + 5
    record('real x5 clock advances without fake timers', minutes=x5-after)
    page.get_by_role('button', name='×20', exact=True).click()
    page.wait_for_timeout(1400)
    pause(page)
    end = raw(page)['worldTime']
    assert end >= x5 + 40
    record('real x20 clock advances without fake timers', minutes=end-x5)
    for label in ['這一生', '住所與產業', '地方消息與委託']:
        window(page, label)
        assert page.locator('dialog').count() == 1
        record('single modal: ' + label)
    close(page)
    saved = raw(page)
    saved['lastSavedAt'] = int(time.time()*1000) - 30*86400000
    result['fixtures'].append('lastSavedAt 30 real days ago, same valid V2 checkpoint')
    reload_context, reloaded = new_page(browser, saved)
    pause(reloaded)
    assert raw(reloaded)['worldTime'] == saved['worldTime']
    assert not reloaded.get_by_text('離線期間').count()
    record('reload never awards offline advancement', worldTime=saved['worldTime'])
    reload_context.close()
    native_path = os.environ.get('PLW_NATIVE_V1', str(ROOT/'reports/v2/20261004-life-emergence/fixtures/native-v1.json'))
    if native_path:
        native = json.loads(Path(native_path).read_text())
        native_context, np = new_page(browser, native)
        pause(np)
        migrated = raw(np)
        for key, value in native.items():
            if key not in {'saveVersion','lastSavedAt'}:
                assert migrated[key] == value, key
        assert migrated['saveVersion'] == 2 and migrated['life']['openingSeen']
        record('native committed V1 world migrates with every legacy field/RNG/time preserved', nativeSource='2e8ad94')
        native_context.close()

    fixture = copy.deepcopy(base)
    actor = fixture['characters'][0]
    actor['gold'] = 1000
    actor['hp'] = 10
    actor['inventory']['sword'] = 1
    fixture['life']['characters'][actor['id']]['reputation'] = 80
    fixture['settlement']['stage'] = 'village'
    fixture['settlement']['buildings'] += ['tavern', 'blacksmith']
    result['fixtures'].append('village, gold1000, reputation80, hp10, carried sword for reachable property/equipment UI')
    property_context, pp = new_page(browser, fixture)
    pause(pp)
    window(pp, '物品')
    pp.get_by_role('button', name='使用藥水', exact=True).click()
    expect(pp.locator('.window-world-status')).to_contain_text('生命 55')
    pp.locator('.item-list').get_by_role('button', name='劍').click()
    pp.get_by_role('button', name='裝備', exact=True).click()
    expect(pp.get_by_role('button', name='卸下裝備', exact=True)).to_be_visible()
    record('detached character projection updates potion/equipment in an open modal')
    window(pp, '住所與產業')
    pp.locator('.property-offer').filter(has=pp.get_by_role('heading', name='自宅', exact=True)).get_by_role('button', name='取得自宅', exact=True).click()
    expect(pp.locator('.property-owned')).to_have_count(1)
    food = pp.locator('.storage-list li').filter(has_text='食物')
    food.get_by_role('button', name='存入', exact=True).click()
    expect(food).to_contain_text('家中 1')
    food.get_by_role('button', name='取出', exact=True).click()
    expect(food).to_contain_text('家中 0')
    record('home purchase/storage update live and conserve real items')
    pp.screenshot(path=str(OUT/'property-desktop.png'), full_page=True)
    window(pp, '地圖與世界')
    pp.get_by_role('button', name='居民', exact=True).click()
    pp.locator('.people-list button').first.click()
    expect(pp.locator('.npc-sheet')).to_contain_text('眼前掛心的事')
    record('NPC life details render from actual resident projections')
    for width, height in [(768, 1024), (390, 844)]:
        pp.set_viewport_size({'width':width,'height':height})
        window(pp, '住所與產業')
        assert pp.evaluate('document.documentElement.scrollWidth <= innerWidth')
        pp.screenshot(path=str(OUT/f'property-{width}.png'), full_page=True)
        record('responsive browser viewport', width=width, height=height, physicalDevice=False)
    close(pp)
    session = pp.context.new_cdp_session(pp)
    session.send('HeapProfiler.collectGarbage')
    result['profiles'].append({'label':'after-window-actions', **session.send('Runtime.getHeapUsage'),
       'dom': session.send('Memory.getDOMCounters'), 'saveBytes': len(json.dumps(raw(pp)).encode())})
    property_context.close()

    retired = copy.deepcopy(base)
    retired['worldTime'] = 1430
    elder = retired['npcs'][0]
    elder.update(age=68, birthYear=-67, lifespan=100)
    retired['life']['npcs'][elder['id']]['traits'] = ['content', 'solitary']
    result['fixtures'].append('68-year-old content/solitary NPC, ten minutes before midnight retirement review')
    retirement_context, rp = new_page(browser, retired)
    pause(rp)
    window(rp, '地圖與世界')
    rp.get_by_role('button', name='居民', exact=True).click()
    rp.locator('.people-list button').first.click()
    expect(rp.locator('.npc-life-facts')).to_contain_text('居民')
    close(rp)
    rp.get_by_role('button', name='×20', exact=True).click()
    window(rp, '地圖與世界')
    rp.get_by_role('button', name='居民', exact=True).click()
    rp.locator('.people-list button').first.click()
    expect(rp.locator('.npc-life-facts')).to_contain_text('退休')
    record('NPC career refreshes in a live modal across midnight')
    retirement_context.close()

    quota_context, qp = new_page(browser, base)
    pause(qp)
    disk = qp.evaluate("localStorage.getItem('oakvale-v1')")
    qp.evaluate("""() => { window.__quota = true; const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key,value) { if(window.__quota && key==='oakvale-v1') throw new DOMException('controlled quota','QuotaExceededError'); return original.call(this,key,value) }; }""")
    qp.get_by_role('button', name='往右', exact=True).click()
    expect(qp.locator('[role=alert]').first).to_contain_text('存檔失敗')
    assert qp.evaluate("localStorage.getItem('oakvale-v1')") == disk
    qp.get_by_role('button', name='×20', exact=True).click()
    expect(qp.get_by_role('button', name='暫停', exact=True)).to_have_attribute('aria-pressed','true')
    qp.evaluate('window.__quota = false')
    qp.get_by_role('button', name='往左', exact=True).click()
    qp.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length===0")
    assert raw(qp)['worldTime'] == json.loads(disk)['worldTime'] + 10
    expect(qp.locator('[role=alert]')).to_have_count(0)
    record('quota preserves disk/pending, blocks x20, and recovers before the next action')
    before_freeze = raw(qp)['worldTime']
    qp.get_by_role('button', name='×20', exact=True).click()
    lifecycle = qp.context.new_cdp_session(qp)
    lifecycle.send('Page.setWebLifecycleState', {'state':'frozen'})
    time.sleep(1.1)
    lifecycle.send('Page.setWebLifecycleState', {'state':'active'})
    pause(qp)
    caught_up = raw(qp)['worldTime'] - before_freeze
    assert caught_up >= 35, caught_up
    record('controlled real Chromium page freeze/resume catches in-session elapsed time', minutes=caught_up, fakeClock=False)
    quota_context.close()

    corrupt_context, cp = new_page(browser, 'malformed-save-fixture')
    original = cp.evaluate("localStorage.getItem('oakvale-v1')")
    expect(cp.locator('[role=alert]').first).to_contain_text('原始存檔已保留')
    cp.get_by_role('button', name='×20', exact=True).click()
    cp.get_by_role('button', name='往右', exact=True).click()
    assert cp.evaluate("localStorage.getItem('oakvale-v1')") == original
    record('invalid save remains protected from movement and speed controls')
    corrupt_context.close()
    close(page)
    save_profile = page.evaluate("""() => {
      const original = Storage.prototype.setItem; window.__saveLatency=[];
      Storage.prototype.setItem = function(key,value) {
        const started=performance.now();const output=original.call(this,key,value);
        if(key==='oakvale-v1') window.__saveLatency.push(performance.now()-started);
        return output;
      };return true;
    }""")
    page.get_by_role('button', name='往右', exact=True).click()
    page.get_by_role('button', name='往左', exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('oakvale-v1')).playJournal.pending.length===0")
    frames = page.evaluate("""() => new Promise(resolve => {
      let last=performance.now();const intervals=[];
      function frame(now){intervals.push(now-last);last=now;
        if(intervals.length===60) resolve(intervals);else requestAnimationFrame(frame)};
      requestAnimationFrame(frame);
    })""")
    storage = page.evaluate("""async () => {
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('oakvale-play-journal',1);
        r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
      const rows=await new Promise((resolve,reject)=>{const tx=db.transaction('records');
        const r=tx.objectStore('records').getAll();tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error)});
      db.close();return {estimate:await navigator.storage.estimate(),records:rows.length,
        journalJsonBytes:new TextEncoder().encode(JSON.stringify(rows)).length,
        checkpointWriteMs:window.__saveLatency};
    }""")
    page.locator('.menu-trigger').click()
    export_started = time.perf_counter()
    with page.expect_download() as exported:
        page.locator('.pixel-menu').get_by_role('button', name='匯出遊玩紀錄').click()
    export_path = Path('/tmp/plw-v2-journal-export.json')
    exported.value.save_as(str(export_path))
    result['profiles'].append({'label':'short-session-storage-and-latency', **storage,
       'exportDownloadMs': (time.perf_counter()-export_started)*1000,
       'exportBytes': export_path.stat().st_size,
       'frameIntervalP95Ms': sorted(frames)[int(len(frames)*.95)-1],
       'measurementLimit':'short session; checkpointWriteMs measures setItem only; export includes browser automation/download overhead; JSON bytes are logical journal size, storage estimate is origin-wide'})
    archive = json.loads(export_path.read_text())
    assert archive['archiveAvailable'] and archive['records']
    assert archive['checkpoint']['saveVersion'] == 2
    assert len({row['id'] for row in archive['records']}) == len(archive['records'])
    record('full journal export includes V2 checkpoint and unique append-only records', records=len(archive['records']))
    assert not result['errors'], result['errors']
    record('no uncaught browser exceptions')
    close(page)
    page.get_by_role('button', name='×20', exact=True).click()
    for label in ['角色', '物品', '地圖與世界', '這一生', '住所與產業', '世界歷史']:
        window(page, label)
        before = raw(page)['worldTime']
        page.wait_for_timeout(700)
        after = raw(page)['worldTime']
        assert after >= before + 15, (label, before, after)
        record('Active Idle continues in window: '+label, minutes=after-before)
    window(page, '地圖與世界')
    page.get_by_role('button', name='居民', exact=True).click()
    page.locator('.people-list button').first.click()
    before = raw(page)['worldTime']
    page.wait_for_timeout(700)
    after = raw(page)['worldTime']
    assert after >= before + 15
    record('Active Idle continues in NPC window', minutes=after-before)
    pause(page)
    closed_state = raw(page)
    context.close()
    closed_at = time.monotonic()
    time.sleep(2.1)
    reopened_context, reopened = new_page(browser, closed_state)
    pause(reopened)
    assert raw(reopened)['worldTime'] == closed_state['worldTime']
    record('full close then real wait then load retains checkpoint worldTime', realWaitSeconds=time.monotonic()-closed_at, savedWorldTime=closed_state['worldTime'], loadedWorldTime=raw(reopened)['worldTime'])
    reopened_context.close()
    browser.close()
