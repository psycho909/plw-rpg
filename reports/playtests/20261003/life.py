"""Oakvale life/economy route: real Playwright UI actions in a fresh browser context."""
import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).parent
URL = 'http://127.0.0.1:5173/'
steps = []
action_log = []
errors = []

def text(locator):
    return locator.inner_text().strip()

def clock(page):
    return text(page.locator('.world-clock'))

def status(page):
    loc = page.get_by_role('status')
    return text(loc) if loc.count() else ''

def observe_save(page):
    raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    return json.loads(raw) if raw else None

def observe(page, label, extra=None):
    saved = observe_save(page)
    c = None
    if saved:
        c = next(ch for ch in saved['characters'] if ch['id'] == saved['activeCharacterId'])
    rec = {'label': label, 'clock_ui': clock(page), 'journey_ui': text(page.locator('.view-heading')), 'location_ui': text(page.locator('.location-tag')), 'status_ui': status(page)}
    if c:
        rec['read_only_saved_state'] = {'worldTime': saved['worldTime'], 'worldSeed': saved['worldSeed'], 'position': c['position'], 'stamina': c['stamina'], 'gold': c['gold'], 'inventory': c['inventory'], 'equipment': c['equipment'], 'crop_count': len(saved['crops']), 'preparedPlots': saved['preparedPlots'], 'settlement_stage': saved['settlement']['stage'], 'settlement_growth': saved['settlement']['growth'], 'threatLevel': saved['threat']['threatLevel']}
    if extra:
        rec.update(extra)
    steps.append(rec)
    (ROOT / 'life-run.json').write_text(json.dumps({'result': 'in_progress', 'steps': steps}, ensure_ascii=False, indent=2) + '\n')
    return rec

def click(page, name, exact=True):
    page.get_by_role('button', name=name, exact=exact).click()
    time.sleep(.06)
    result = status(page)
    action_log.append({'operation': name, 'clock_ui': clock(page), 'result_ui': result})
    return result

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' and 'favicon.ico' not in message.location.get('url', '') else None)
        response = page.goto(URL, wait_until='networkidle')
        assert response and response.status == 200
        expect(page.get_by_role('heading', name='一個正在生活的世界', exact=True)).to_be_visible()
        click(page, '暫停')
        click(page, '儲存世界')
        initial = observe(page, 'fresh_context_start', {'seed_source': 'read-only oakvale-v1 save created by clicking the normal Save button', 'browser_context': 'new non-persistent Playwright context'})
        page.screenshot(path=str(ROOT / 'life-start.png'), full_page=True)
        init_state = initial['read_only_saved_state']
        assert init_state['worldSeed'] == 909 and 480 <= init_state['worldTime'] <= 484, init_state
        nav = page.get_by_role('navigation', name='遊戲頁面').locator('.nav-items')
        # Observe the settlement residents through the regular inspector control.
        page.locator('.people-toggle').click()
        action_log.append({'operation': '看看居民在做什麼', 'clock_ui': clock(page), 'result_ui': '居民清單顯示'})
        steps.append({'label': 'npc_observation_daytime', 'clock_ui': clock(page), 'resident_rows_ui': page.locator('.people-list').inner_text()[:1200]})
        # Farm: invalid actions, all four plots, fifth plot rejected, maturity and harvest via UI.
        page.locator('.travel-row').get_by_role('button', name='農田').click()
        time.sleep(.06)
        action_log.append({'operation': '步行前往農田', 'clock_ui': clock(page), 'result_ui': status(page)})
        immature = click(page, '收割')
        plant_empty = click(page, '播種 · 10 分')
        assert '還沒成熟' in immature and '先整地' in plant_empty, (immature, plant_empty)
        for i in range(4):
            click(page, '整地 · 20 分')
            click(page, '播種 · 10 分')
        full_plot = click(page, '整地 · 20 分')
        assert '四塊田都已使用' in full_plot, full_plot
        before_mature = text(page.locator('.plot-row'))
        click(page, '等待 1 日')
        click(page, '等待 1 日')
        mature_ui = text(page.locator('.plot-row'))
        assert '可收割' in mature_ui, mature_ui
        page.screenshot(path=str(ROOT / 'life-farm-mature.png'), full_page=True)
        harvest_results = []
        for i in range(4):
            harvest_results.append(click(page, '收割'))
        yields = [int(re.search(r'收穫 (\d+) 份食物', value).group(1)) for value in harvest_results]
        harvest_ui = text(page.locator('.plot-row'))
        assert '可收割' not in harvest_ui, harvest_ui
        click(page, '儲存世界')
        rec = observe(page, 'farm_harvested', {'before_mature_ui': before_mature, 'mature_ui': mature_ui, 'after_harvest_ui': harvest_ui})
        assert rec['read_only_saved_state']['inventory']['food'] == init_state['inventory']['food'] + sum(yields), rec
        assert yields == [6, 6, 6, 7], yields
        rec['harvest_result_ui'] = harvest_results
        rec['harvest_yields'] = yields
        page.screenshot(path=str(ROOT / 'life-farm-harvested.png'), full_page=True)
        # Gather until stamina boundary; all operations are ordinary buttons.
        page.locator('.travel-row').get_by_role('button', name='森林').click()
        time.sleep(.06)
        action_log.append({'operation': '步行前往森林', 'clock_ui': clock(page), 'result_ui': status(page)})
        click(page, '🪓 伐木')
        click(page, '🪓 伐木')
        low_stamina = click(page, '🪓 伐木')
        assert '體力不足' in low_stamina, low_stamina
        click(page, '儲存世界')
        rec = observe(page, 'gathering_stamina_boundary', {'third_gather_failure': low_stamina})
        assert rec['read_only_saved_state']['stamina'] < 10, rec
        # Return to the village shop during service hours, sell gathered wood and buy a potion.
        nav.get_by_role('button', name='背包').click()
        action_log.append({'operation': '開啟背包', 'clock_ui': clock(page), 'result_ui': '背包頁顯示'})
        page.get_by_role('button', name='步行前往雜貨店').click()
        time.sleep(.06)
        action_log.append({'operation': '步行前往雜貨店', 'clock_ui': clock(page), 'result_ui': status(page)})
        expect(page.locator('.shop-panel')).to_be_visible()
        wood_row = page.locator('.shop-item').filter(has_text='木材')
        assert wood_row.count() == 1, text(page.locator('.shop-panel'))
        wood_row.get_by_role('button', name='賣 4 金', exact=True).click()
        action_log.append({'operation': '出售木材 1 份', 'clock_ui': clock(page), 'result_ui': status(page)})
        potion_row = page.locator('.shop-item').filter(has_text='治療藥水')
        potion_row.get_by_role('button', name='買 20 金', exact=True).click()
        action_log.append({'operation': '購買治療藥水 1 瓶', 'clock_ui': clock(page), 'result_ui': status(page)})
        shop_after = text(page.locator('.shop-panel'))
        click(page, '儲存世界')
        rec = observe(page, 'shop_sell_wood_buy_potion', {'shop_ui': shop_after})
        assert rec['read_only_saved_state']['inventory']['wood'] == 3, rec
        assert rec['read_only_saved_state']['inventory']['potion'] == 3, rec
        page.screenshot(path=str(ROOT / 'life-shop-open.png'), full_page=True)
        # Advance the visible UI clock at x20 to 20:00+, then pause and observe closed shop.
        click(page, '×20')
        page.wait_for_function("(() => { const m=document.querySelector('.world-clock strong')?.textContent||''; return Number(m.split(':')[0]) >= 20; })()", timeout=15000)
        click(page, '暫停')
        shop_present_after_close = page.locator('.shop-panel').count() > 0
        steps.append({'label': 'shop_after_closing_time', 'clock_ui': clock(page), 'shop_panel_visible': shop_present_after_close, 'hint_ui': text(page.locator('.service-hint')) if page.locator('.service-hint').count() else ''})
        assert not shop_present_after_close, 'store panel remained available after 20:00'
        page.screenshot(path=str(ROOT / 'life-shop-closed.png'), full_page=True)
        # Rest in the village, then advance enough ordinary 1-day buttons to exceed ten elapsed game days.
        page.locator('.travel-row').get_by_role('button', name='回家').click()
        time.sleep(.06)
        action_log.append({'operation': '步行回聚落', 'clock_ui': clock(page), 'result_ui': status(page)})
        expect(page.locator('.activity-panel')).to_contain_text('休息 · 1 小時')
        click(page, '休息 · 1 小時')
        for _ in range(8):
            click(page, '等待 1 日')
        click(page, '儲存世界')
        final_before = observe(page, 'day_10_plus_before_reload', {'resident_rows_ui': page.locator('.people-list').inner_text()[:1200]})
        final_state = final_before['read_only_saved_state']
        elapsed = final_state['worldTime'] - init_state['worldTime']
        assert elapsed >= 10 * 1440, {'elapsed_game_minutes': elapsed, 'expected_minimum': 14400, 'final': final_state}
        assert final_state['inventory']['food'] == 28 and final_state['inventory']['wood'] == 3 and final_state['inventory']['potion'] == 3
        page.screenshot(path=str(ROOT / 'life-day-10.png'), full_page=True)
        # Reload with the same context to verify the UI resumes its own persisted save.
        page.reload(wait_until='networkidle')
        action_log.append({'operation': '重新載入存檔', 'clock_ui': clock(page), 'result_ui': '頁面重新載入'})
        click(page, '暫停')
        expect(page.get_by_role('heading', name='一個正在生活的世界', exact=True)).to_be_visible()
        click(page, '儲存世界')
        after_reload = observe(page, 'save_reload_check')
        assert after_reload['read_only_saved_state']['worldTime'] >= final_state['worldTime'], after_reload
        assert after_reload['read_only_saved_state']['position'] == final_state['position'], after_reload
        assert after_reload['read_only_saved_state']['inventory'] == final_state['inventory'], after_reload
        assert '世界已存於此瀏覽器' in text(page.locator('.save-status'))
        page.screenshot(path=str(ROOT / 'life-reloaded.png'), full_page=True)
        assert not errors, errors
        result = {'result': 'passed', 'route': 'normal Playwright UI clicks only; no game state injection', 'initial': initial, 'steps': steps, 'actions': action_log, 'final_saved_state': after_reload['read_only_saved_state'], 'elapsed_game_minutes': after_reload['read_only_saved_state']['worldTime'] - init_state['worldTime'], 'elapsed_game_days': round((after_reload['read_only_saved_state']['worldTime'] - init_state['worldTime']) / 1440, 2), 'browser_errors': errors, 'screenshots': sorted(str(p.name) for p in ROOT.glob('life-*.png'))}
        (ROOT / 'life-run.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({'result': result['result'], 'elapsed_game_days': result['elapsed_game_days'], 'steps': [s['label'] for s in steps], 'action_count': len(action_log), 'final_saved_state': result['final_saved_state'], 'screenshots': result['screenshots'], 'browser_errors': errors}, ensure_ascii=False))
        context.close()
        browser.close()

if __name__ == '__main__':
    main()
