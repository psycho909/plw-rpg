"""Local-only UI verification. Requires Playwright Python, Chromium, and a running Vite server.

Run: python reports/ui/20261003-world-first/verify.py
Optional: PLW_UI_URL=http://127.0.0.1:5173 PLW_CHROMIUM=/usr/bin/chromium
Uses disposable browser contexts. Fixtures are explicitly identified in results.json.
"""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import time
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(os.environ.get('PLW_UI_OUT', str(Path(__file__).resolve().parent / 'artifacts')))
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('PLW_UI_URL', 'http://127.0.0.1:5173/')
assert urlsplit(URL).hostname in {'localhost', '127.0.0.1'}, 'Only local disposable testing is allowed.'
ORIGIN = f'{urlsplit(URL).scheme}://{urlsplit(URL).netloc}'
RESULTS = {'checks': [], 'fixtures': ['town equipment and dungeon', 'dead player', 'offline timestamp', 'corrupt save', 'storage failure', 'fractional preparedPlots', 'hidden building'], 'page_errors': [], 'viewports': [], 'source_sha256': {}}
RESULTS['url'] = URL
for f in [ROOT / 'index.html', *sorted((ROOT / 'src').rglob('*'))]:
    if f.is_file() and f.suffix in {'.vue', '.ts', '.scss', '.html'}:
        RESULTS['source_sha256'][str(f.relative_to(ROOT))] = hashlib.sha256(f.read_bytes()).hexdigest()


def check(name, condition=True):
    assert condition, name
    RESULTS['checks'].append(name)
    print('PASS', name, flush=True)


def shot(page, name):
    page.screenshot(path=str(OUT / f'{name}.png'), full_page=True)


def close(page):
    if page.locator('dialog').count():
        page.keyboard.press('Escape')


def state(page):
    close(page)
    page.locator('.save-button').click()
    return page.evaluate('JSON.parse(localStorage.getItem("oakvale-v1"))')


def player(saved):
    return next(c for c in saved['characters'] if c['id'] == saved['activeCharacterId'])


def open_notes(page):
    close(page)
    page.keyboard.press('Escape')
    page.locator('.pixel-menu').get_by_role('button', name='旅人筆記', exact=True).click()


def travel(page, label=None, position=None):
    close(page)
    page.keyboard.press('m')
    if label:
        page.get_by_role('button', name='前往' + label, exact=True).click()
    else:
        page.locator(f'.overview-map button[data-position="{position}"]').click()
    expect(page.locator('dialog')).to_have_count(0)


def interact(page):
    page.locator('.context-action').click()
    expect(page.locator('dialog[open]')).to_have_count(1)


def new_page(browser, viewport=(1440, 1000), saved=None, raw=None, **options):
    config = {'viewport': {'width': viewport[0], 'height': viewport[1]}, **options}
    if saved is not None or raw is not None:
        fixture = copy.deepcopy(saved)
        if fixture is not None:
            fixture['lastSavedAt'] = int(time.time() * 1000)
        config['storage_state'] = {'cookies': [], 'origins': [{'origin': ORIGIN, 'localStorage': [{'name': 'oakvale-v1', 'value': raw if raw is not None else json.dumps(fixture)}]}]}
    context = browser.new_context(**config)
    page = context.new_page()
    page.on('pageerror', lambda error: RESULTS['page_errors'].append(str(error)))
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='暫停', exact=True).click()
    return context, page


def keyboard_and_layout(browser):
    for w, h in [(1440, 1000), (1280, 800), (1024, 768), (768, 1024), (390, 844), (320, 640)]:
        context, page = new_page(browser, (w, h))
        check(f'{w}px no document overflow', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        map_box = page.locator('.world-frame').bounding_box()
        RESULTS['viewports'].append({'width': w, 'height': h, 'map_height': map_box['height'], 'map_height_ratio': round(map_box['height'] / h, 3)})
        shot(page, f'exploration-{w}')
        before = player(state(page))['position']
        page.locator('.direction-pad .right').click()
        after = player(state(page))['position']
        check(f'{w}px pointer movement', after == {'x': before['x'] + 1, 'y': before['y']})
        page.locator('.world-map').focus()
        page.keyboard.press('ArrowLeft')
        check(f'{w}px keyboard movement', player(state(page))['position'] == before)
        page.locator('.world-map:not(.overview-map)').focus()
        page.keyboard.press('d')
        wasd_out = player(state(page))['position']
        page.keyboard.press('a')
        check(f'{w}px WASD movement', wasd_out == {'x': before['x'] + 1, 'y': before['y']} and player(state(page))['position'] == before)
        page.evaluate('window.dispatchEvent(new KeyboardEvent("keydown", {key:"d", isComposing:true}))')
        check(f'{w}px IME ignored', player(state(page))['position'] == before)
        page.locator('.world-map:not(.overview-map)').focus()
        page.keyboard.press('Enter')
        expect(page.locator('#window-title')).to_contain_text('家')
        check(f'{w}px Enter opens nearby interaction', page.locator('dialog[open]').count() == 1)
        close(page)
        page.keyboard.press('c')
        expect(page.get_by_role('heading', name='角色', exact=False)).to_be_visible()
        for i in range(14):
            page.keyboard.press('Shift+Tab' if i % 3 == 0 else 'Tab')
            assert page.evaluate('!!document.activeElement.closest("dialog")'), f'{w}px focus escaped'
        page.evaluate('document.querySelector(".save-button").focus()')
        check(f'{w}px modal focus and inert background', page.evaluate('!!document.activeElement.closest("dialog")'))
        box = page.locator('dialog').bounding_box()
        check(f'{w}px dialog bounded', box['x'] >= 0 and box['y'] >= 0 and box['x'] + box['width'] <= w + 1 and box['y'] + box['height'] <= h + 1)
        page.locator('.window-body').focus()
        page.keyboard.press('End')
        shot(page, f'character-{w}')
        close(page)
        check(f'{w}px restores focus', page.evaluate('!document.activeElement.closest("dialog") && document.activeElement.tagName !== "BODY"'))
        for key, name in [('i', '物品'), ('l', '世界日誌'), ('m', '地圖與世界')]:
            page.keyboard.press(key)
            expect(page.locator('#window-title')).to_contain_text(name)
            shot(page, f'{key}-{w}') if w in (1440, 390) else None
            if key == 'm':
                threat = page.get_by_role('button', name='威脅', exact=True)
                home = page.get_by_role('button', name='前往家', exact=True)
                threat.focus()
                page.keyboard.press('Tab')
                expect(home).to_be_focused()
                page.keyboard.press('Shift+Tab')
                expect(threat).to_be_focused()
                for _ in range(16):
                    page.keyboard.press('Tab')
                    assert page.evaluate('!!document.activeElement.closest("dialog") && document.activeElement.tabIndex >= 0 && !document.activeElement.matches(".tile")')
                check(f'{w}px map Tab skips programmatic tiles')
            close(page)
        page.keyboard.press('Escape')
        page.locator('.reset-trigger').click()
        check(f'{w}px reset safe initial focus', page.evaluate('document.activeElement.textContent.includes("保留目前世界")'))
        page.get_by_role('button', name='保留目前世界', exact=True).click()
        check(f'{w}px reset cancelled', player(state(page))['position'] == before)
        scroll = page.evaluate('getComputedStyle(document.documentElement).scrollbarColor')
        check(f'{w}px global scrollbar tokens', scroll != 'auto')
        context.close()


def gameplay(browser):
    context, page = new_page(browser)
    baseline = state(page)
    travel(page, '農田')
    interact(page)
    page.get_by_role('button', name=re.compile('^整地')).click()
    page.get_by_role('button', name=re.compile('^播種')).click()
    planted = state(page)
    check('farm prepare and plant', len(planted['crops']) == 1 and planted['preparedPlots'] == 0)
    open_notes(page)
    page.get_by_role('button', name='等待 1 日', exact=True).click()
    page.get_by_role('button', name='等待 1 日', exact=True).click()
    close(page)
    interact(page)
    shot(page, 'farm-mature')
    page.get_by_role('button', name=re.compile('^收割')).click()
    harvested = state(page)
    check('farm maturation and harvest', not harvested['crops'] and player(harvested)['inventory']['food'] == 8)
    travel(page, '森林')
    interact(page)
    page.get_by_role('button', name=re.compile('伐木')).click()
    gathered = state(page)
    check('forest gathering', player(gathered)['inventory']['wood'] == 2)
    page.locator('.nearby-trigger').click()
    npc = next(n for n in gathered['npcs'] if n['isAlive'] and abs(n['position']['x'] - 5) + abs(n['position']['y'] - 4) <= 1)
    page.locator('.interaction-list').get_by_role('button', name=re.compile(re.escape(npc['name']))).click()
    page.get_by_role('button', name='交談', exact=True).click()
    expect(page.locator('.dialogue')).to_be_visible()
    shot(page, 'npc-conversation')
    check('nearby NPC conversation')
    close(page)
    interact(page)
    page.get_by_role('button', name=re.compile('尋找怪物')).click()
    expect(page.locator('#window-title')).to_contain_text('戰鬥')
    shot(page, 'battle')
    page.get_by_role('button', name='防禦', exact=True).click()
    page.get_by_role('button', name='使用藥水', exact=True).click()
    for _ in range(20):
        if not page.get_by_role('button', name='攻擊', exact=True).count():
            break
        page.get_by_role('button', name='攻擊', exact=True).click()
    won = state(page)
    check('combat defend potion and victory', won['combat'] is None and any(e['type'] == 'combat.won' for e in won['events']))
    travel(page, '礦場')
    interact(page)
    page.get_by_role('button', name=re.compile('採石')).click()
    page.get_by_role('button', name=re.compile('採鐵礦')).click()
    mined = state(page)
    check('stone and iron gathering', player(mined)['inventory']['stone'] == 2 and player(mined)['inventory']['iron'] == 2)
    travel(page, position='10,8')
    interact(page)
    expect(page.locator('#window-title')).to_contain_text('雜貨店')
    page.locator('.shop-item').filter(has_text='木材').get_by_role('button', name='賣 4 金', exact=True).click()
    page.locator('.shop-item').filter(has_text='治療藥水').get_by_role('button', name='買 20 金', exact=True).click()
    shot(page, 'shop')
    traded = state(page)
    check('shop buying and selling', player(traded)['inventory']['wood'] == 1 and player(traded)['inventory']['potion'] == 2)
    for _ in range(12):
        if traded['settlement']['stage'] != 'hamlet':
            break
        open_notes(page)
        page.get_by_role('button', name='度過一季', exact=True).click()
        traded = state(page)
    check('natural settlement unlock', 'tavern' in traded['settlement']['buildings'])
    travel(page, '家')
    interact(page)
    for _ in range(24):
        page.get_by_role('button', name='休息 · 1 小時', exact=True).click()
        clock = page.locator('.window-world-status small').inner_text()
        hour = int(re.search(r'(\d{2}):\d{2}', clock).group(1))
        if 17 <= hour < 23:
            break
    close(page)
    travel(page, position='11,11')
    interact(page)
    page.locator('.mercenary button:not(:disabled)').first.click()
    shot(page, 'tavern')
    hired = state(page)
    check('tavern mercenary hired', len(hired['party']) == 1)
    travel(page, '森林')
    interact(page)
    page.get_by_role('button', name=re.compile('尋找怪物')).click()
    page.get_by_role('button', name='逃跑', exact=True).click()
    escaped = state(page)
    check('combat escape', escaped['combat'] is None and not escaped['dungeon']['inDungeon'])
    page.reload(wait_until='networkidle')
    reloaded = state(page)
    check('save reload retains world and inventory', reloaded['worldSeed'] == escaped['worldSeed'] and player(reloaded)['inventory'] == player(escaped)['inventory'] and player(reloaded)['position'] == player(escaped)['position'])
    context.close()
    return baseline


def fixture_flows(browser, baseline):
    town = copy.deepcopy(baseline)
    town['settlement']['stage'] = 'town'
    town['settlement']['buildings'] = ['house', 'farm', 'store', 'inn', 'tavern', 'blacksmith']
    town['threat'].update(monsterPopulation=90, threatLevel=3, campLevel=3, bossAlive=True, bossProgress=100)
    hero = player(town)
    hero.update(gold=250, hp=100, maxHp=100)
    hero['stats'].update(strength=50, vitality=40)
    context, page = new_page(browser, saved=town)
    shot(page, 'town-and-threat-fixture')
    travel(page, position='12,8')
    interact(page)
    page.locator('.shop-item').filter(has_text='鐵劍').get_by_role('button', name='買 56 金', exact=True).click()
    close(page)
    page.keyboard.press('i')
    page.locator('.item-list').get_by_role('button', name=re.compile('鐵劍')).click()
    page.get_by_role('button', name='裝備', exact=True).click()
    check('equipment from blacksmith with town discount', player(state(page))['equipment']['weapon'] == 'sword')
    travel(page, '探索迷霧')
    interact(page)
    shot(page, 'dungeon-entrance')
    page.locator('.window-body').get_by_role('button', name=re.compile('^進入廢棄礦坑')).click()
    shot(page, 'dungeon-progress')
    page.get_by_role('button', name='離開礦坑', exact=True).click()
    check('dungeon exit', not state(page)['dungeon']['inDungeon'])
    interact(page)
    page.locator('.window-body').get_by_role('button', name=re.compile('^進入廢棄礦坑')).click()
    for _ in range(3):
        page.get_by_role('button', name=re.compile('探索下一段')).click()
        for _ in range(12):
            if not page.get_by_role('button', name='攻擊', exact=True).count():
                break
            page.get_by_role('button', name='攻擊', exact=True).click()
    cleared = state(page)
    check('three dungeon stages with strong character fixture', cleared['dungeon']['runs'] == 1 and cleared['combat'] is None and not cleared['dungeon']['inDungeon'])
    page.keyboard.press('l')
    page.get_by_role('button', name='聚落', exact=True).click()
    shot(page, 'filtered-log')
    close(page)
    page.keyboard.press('Escape')
    page.locator('.pixel-menu').get_by_role('button', name='世界歷史', exact=True).click()
    shot(page, 'history')
    context.close()

    hidden = copy.deepcopy(baseline)
    next(t for t in hidden['tiles'] if t['x'] == 10 and t['y'] == 8)['discovered'] = False
    context, page = new_page(browser, saved=hidden)
    hidden_tile = page.locator('.world-map:not(.overview-map) button[data-position="10,8"]')
    check('hidden building does not leak name', hidden_tile.inner_text() == '░' and '雜貨店' not in hidden_tile.get_attribute('aria-label'))
    context.close()

    closed = copy.deepcopy(baseline)
    closed['worldTime'] = 21 * 60
    player(closed).update(position={'x': 10, 'y': 8}, currentRegion='village')
    context, page = new_page(browser, saved=closed)
    interact(page)
    expect(page.locator('.inline-warning')).to_contain_text('現在無法交易')
    check('closed shop cannot trade', page.locator('.shop-item button:not(:disabled)').count() == 0)
    shot(page, 'shop-closed')
    context.close()

    dead = copy.deepcopy(baseline)
    player(dead).update(isAlive=False, status='dead', hp=0, deathYear=1, deathCause='UI fixture')
    context = browser.new_context(viewport={'width': 390, 'height': 844}, storage_state={'cookies': [], 'origins': [{'origin': ORIGIN, 'localStorage': [{'name': 'oakvale-v1', 'value': json.dumps({**dead, 'lastSavedAt': int(time.time() * 1000)})}]}]})
    page = context.new_page()
    page.on('pageerror', lambda error: RESULTS['page_errors'].append(str(error)))
    page.goto(URL, wait_until='networkidle')
    expect(page.locator('dialog[open]')).to_have_count(1)
    page.keyboard.press('Escape')
    expect(page.locator('dialog[open]')).to_have_count(1)
    check('successor cannot be dismissed', page.locator('dialog[open]').count() == 1)
    shot(page, 'successor-mobile')
    page.locator('.successor-list button').first.click()
    check('successor keeps history', state(page)['activeCharacterId'] != baseline['activeCharacterId'])
    context.close()

    context, page = new_page(browser, raw='{broken')
    check('corrupt original preserved', page.evaluate('localStorage.getItem("oakvale-v1")') == '{broken')
    page.keyboard.press('Escape'); page.locator('.reset-trigger').click(); page.keyboard.press('Escape')
    page.locator('.save-button').click()
    check('reset Escape preserves corrupt save', page.evaluate('localStorage.getItem("oakvale-v1")') == '{broken')
    page.locator('.save-warning button').click(); page.get_by_role('button', name='覆蓋存檔並重建世界', exact=True).click()
    check('explicit rebuild replaces corrupt save', state(page)['saveVersion'] == 1)
    context.close()

    fractional = copy.deepcopy(baseline)
    fractional['preparedPlots'] = .5
    context, page = new_page(browser, saved=fractional)
    expect(page.locator('.save-warning')).to_contain_text('原始存檔已保留')
    original = page.evaluate('localStorage.getItem("oakvale-v1")')
    page.locator('.save-button').click()
    page.locator('.direction-pad .right').click()
    check('PT-001 fractional plots rejected and original protected', page.evaluate('localStorage.getItem("oakvale-v1")') == original)
    shot(page, 'fractional-save-protected')
    context.close()

    context, page = new_page(browser)
    page.evaluate('() => { window.plwSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new DOMException("fixture", "QuotaExceededError") }; }')
    page.locator('.save-button').click()
    page.locator('.direction-pad .right').click()
    expect(page.locator('.save-warning')).to_contain_text('存檔失敗')
    shot(page, 'storage-failure')
    check('save error persists after movement')
    page.evaluate('() => { Storage.prototype.setItem = window.plwSetItem; }')
    page.locator('.save-warning button').click()
    check('save error retry recovers', page.locator('.save-warning').count() == 0)
    context.close()

    context, page = new_page(browser)
    page.evaluate('() => { window.plwSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new DOMException("fixture", "QuotaExceededError") }; }')
    page.locator('.save-button').click()
    expect(page.locator('.status-notice')).to_contain_text('存檔失敗')
    page.evaluate('() => { Storage.prototype.setItem = window.plwSetItem; }')
    expect(page.locator('.save-warning')).to_have_count(0, timeout=12000)
    expect(page.locator('.status-notice')).to_contain_text('世界已儲存')
    check('automatic save recovery replaces stale failure notice', page.evaluate('!!localStorage.getItem("oakvale-v1")'))
    context.close()

    raw_offline = json.dumps({**baseline, 'lastSavedAt': int(time.time() * 1000) - 60_000})
    context, page = new_page(browser, raw=raw_offline)
    page.locator('.offline-prompt').click()
    expect(page.locator('#window-title')).to_contain_text('離開之後')
    shot(page, 'offline-summary')
    check('offline summary uses actual simulation')
    context.close()

    context, page = new_page(browser, (390, 844), reduced_motion='reduce')
    page.keyboard.press('i')
    check('reduced motion has no transitions', page.evaluate('getComputedStyle(document.querySelector("dialog")).transitionDuration') == '0s')
    context.set_offline(True)
    close(page)
    page.locator('.direction-pad .right').click()
    check('offline local play and save', player(state(page))['position']['x'] == 8)
    context.close()


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get('PLW_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    try:
        keyboard_and_layout(browser)
        fixture_flows(browser, gameplay(browser))
        check('no JavaScript page errors', not RESULTS['page_errors'])
        RESULTS['status'] = 'passed'
    except Exception as error:
        RESULTS['status'] = 'failed'
        RESULTS['failure'] = str(error)
        for i, context in enumerate(browser.contexts):
            for j, page in enumerate(context.pages):
                shot(page, f'failure-{i}-{j}')
        raise
    finally:
        (OUT / 'results.json').write_text(json.dumps(RESULTS, ensure_ascii=False, indent=2) + '\n')
        browser.close()
