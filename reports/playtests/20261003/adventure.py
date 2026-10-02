#!/usr/bin/env python3
"""UI-only adventure playtest for Oakvale; state reads are observational only."""
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).parent
BASE_URL = 'http://127.0.0.1:5173/'
SAVE_KEY = 'oakvale-v1'
observations = []
console_errors = []
used_potions = 0

async def state(page):
    raw = await page.evaluate('(key) => localStorage.getItem(key)', SAVE_KEY)
    return json.loads(raw) if raw else None

async def checkpoint(page, name, note=''):
    await page.get_by_role('button', name=re.compile('儲存世界')).click()
    await page.wait_for_timeout(80)
    saved = await state(page)
    c = next((c for c in saved['characters'] if c['id'] == saved['activeCharacterId']), {}) if saved else {}
    row = {
        'checkpoint': name, 'note': note,
        'ui_location': (await page.locator('.location-tag').inner_text()).strip(),
        'ui_clock': (await page.locator('.world-clock').inner_text()).strip(),
        'worldTime': saved.get('worldTime') if saved else None,
        'worldSeed': saved.get('worldSeed') if saved else None,
        'position': c.get('position'), 'currentRegion': c.get('currentRegion'),
        'level': c.get('level'), 'exp': c.get('exp'), 'hp': c.get('hp'), 'maxHp': c.get('maxHp'),
        'stamina': c.get('stamina'), 'gold': c.get('gold'), 'inventory': c.get('inventory'),
        'equipment': c.get('equipment'), 'party': len(saved.get('party', [])) if saved else None,
        'settlementStage': saved.get('settlement', {}).get('stage') if saved else None,
        'settlementGrowth': saved.get('settlement', {}).get('growth') if saved else None,
        'regionDiscovered': saved.get('regions', {}).get('unknown', {}).get('discovered') if saved else None,
        'combatActive': bool(saved.get('combat')) if saved else None,
        'dungeon': saved.get('dungeon') if saved else None,
        'recentEvents': [e['message'] for e in saved.get('events', [])[-8:]] if saved else [],
    }
    observations.append(row)
    print(json.dumps(row, ensure_ascii=False))
    await page.screenshot(path=str(ROOT / f'adventure-{name}.png'), full_page=True)
    (ROOT / 'adventure-observations.json').write_text(json.dumps({
        'startedAtUtc': STARTED, 'environment': {'url': BASE_URL, 'browser': 'Chromium via Playwright', 'headless': True, 'isolatedContext': True},
        'observations': observations, 'consoleErrors': console_errors,
    }, ensure_ascii=False, indent=2))
    return row

async def travel(page, label):
    await page.locator('.travel-row').get_by_role('button', name=re.compile(label)).click()
    await page.wait_for_timeout(50)

async def nav(page, label):
    await page.locator('.nav-items').get_by_role('button', name=re.compile(re.escape(label) + r'$')).click()

async def finish_fight(page, first=False):
    """All commands are clicked through the rendered combat controls."""
    global used_potions
    assert await page.locator('.combat-panel').count() > 0, 'combat panel did not appear'
    enemy = (await page.locator('.combat-panel .enemy strong').inner_text()).strip()
    if first:
        await page.get_by_role('button', name='防禦', exact=True).click()
        await page.wait_for_timeout(30)
        if await page.get_by_role('button', name='喝藥水', exact=True).count():
            await page.get_by_role('button', name='喝藥水', exact=True).click()
            used_potions += 1
            await page.wait_for_timeout(30)
    attacks = 0
    while await page.locator('.combat-panel').count() and attacks < 24:
        hp = int(await page.locator('progress[aria-label="主角生命"]').get_attribute('value'))
        if hp < 32 and used_potions < 2:
            await page.get_by_role('button', name='喝藥水', exact=True).click()
            used_potions += 1
        else:
            await page.get_by_role('button', name='攻擊', exact=True).click()
            attacks += 1
        await page.wait_for_timeout(25)
    assert await page.locator('.combat-panel').count() == 0, f'combat did not finish: {enemy}'
    return {'enemy': enemy, 'attacks': attacks}

STARTED = datetime.now(timezone.utc).isoformat()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        context = await browser.new_context(viewport={'width': 1440, 'height': 1100})
        page = await context.new_page()
        page.on('pageerror', lambda error: console_errors.append(str(error)))
        await page.goto(BASE_URL, wait_until='networkidle')
        assert await page.title()
        # Start with a fresh, non-persistent context; pause via the ordinary speed control.
        await page.get_by_role('button', name='暫停', exact=True).click()
        initial = await checkpoint(page, 'start', 'Fresh isolated context; paused via UI; no state injection.')
        # The live loop can tick once before the Pause click lands.
        assert initial['worldSeed'] == 909 and 480 <= initial['worldTime'] <= 485

        await travel(page, '森林')
        await page.get_by_role('button', name=re.compile('尋找怪物')).click()
        first = await finish_fight(page, first=True)
        after_first = await checkpoint(page, 'forest-first-win', 'UI: forest encounter; defended, used potion, attacked to victory.')
        assert '戰鬥勝利' in ' '.join(after_first['recentEvents']) and after_first['inventory']['material'] >= 1

        await page.get_by_role('button', name=re.compile('尋找怪物')).click()
        second = await finish_fight(page)
        after_second = await checkpoint(page, 'forest-second-win', 'UI: second forest encounter completed with attacks; checked level/loot.')
        assert after_second['level'] >= 2 and after_second['inventory']['material'] >= 2

        await page.get_by_role('button', name=re.compile('尋找怪物')).click()
        assert await page.locator('.combat-panel').count() == 1
        await page.get_by_role('button', name='逃跑', exact=True).click()
        await page.wait_for_timeout(30)
        after_run = await checkpoint(page, 'forest-run', 'UI: started a third forest encounter, chose Run, verified combat closed.')
        assert not after_run['combatActive'] and '你撤離了戰鬥' in ' '.join(after_run['recentEvents'])

        await travel(page, '探索迷霧')
        revealed = await checkpoint(page, 'mist-revealed', 'UI: walked along map route into unknown region; read-only save confirms discovery.')
        assert revealed['regionDiscovered'] and revealed['dungeon']['discovered']
        await page.get_by_role('button', name=re.compile('進入廢棄礦坑')).click()
        assert '廢棄礦坑' in await page.locator('.activity-panel').inner_text()
        await page.get_by_role('button', name='探索下一層', exact=True).click()
        dungeon_fight = await finish_fight(page)
        dungeon_state = await checkpoint(page, 'dungeon-floor-one', 'UI: entered abandoned mine, explored floor one, and won its slime encounter.')
        assert dungeon_state['dungeon']['stage'] == 1 and dungeon_state['dungeon']['inDungeon']
        assert '戰鬥勝利' in ' '.join(dungeon_state['recentEvents']) and dungeon_state['inventory']['material'] >= 3
        await page.get_by_role('button', name='離開礦坑', exact=True).click()
        await page.wait_for_timeout(30)
        after_leave = await checkpoint(page, 'dungeon-left', 'UI: used Leave Mine after first floor; no state injection.')
        assert not after_leave['dungeon']['inDungeon']

        # Keep moving through ordinary UI to try the village unlock path.
        await travel(page, '回家')
        await page.locator('.activity-panel').get_by_role('button', name=re.compile('休息')).click()
        await nav(page, '旅人筆記')
        for i in range(1, 4):
            await page.get_by_role('button', name='度過一季', exact=True).click()
            seasonal = await checkpoint(page, f'world-season-{i}', f'UI journal action: advanced one season ({i}/3) toward village unlock.')
            if seasonal['settlementStage'] != 'hamlet':
                break
        stage_state = await state(page)
        if stage_state['settlement']['stage'] == 'hamlet':
            # One more ordinary season if the settlement has not met its documented growth threshold.
            await page.get_by_role('button', name='度過一季', exact=True).click()
            seasonal = await checkpoint(page, 'world-season-extra', 'UI journal action: one additional season while seeking village unlock.')
            stage_state = await state(page)

        # Earned resources and market interaction are normal gameplay. Do not inject gold.
        await nav(page, '世界')
        await travel(page, '森林')
        for _ in range(3):
            if await page.get_by_role('button', name=re.compile('伐木')).count():
                await page.get_by_role('button', name=re.compile('伐木')).click()
                await page.wait_for_timeout(20)
        await checkpoint(page, 'woodcutting', 'UI: worked in forest for wage/materials; no balance edits.')
        await travel(page, '回家')
        # Store and smith buttons are in the village activity panel; try only when unlocked.
        store_button = page.locator('.activity-panel').get_by_role('button', name=re.compile('雜貨店'))
        if await store_button.count() and not await store_button.is_disabled():
            await store_button.click()
            for item_name in ['木材', '怪物素材']:
                item_row = page.locator('.shop-item').filter(has_text=item_name)
                if await item_row.count():
                    while await item_row.get_by_role('button', name=re.compile('賣')).count() and not await item_row.get_by_role('button', name=re.compile('賣')).is_disabled():
                        await item_row.get_by_role('button', name=re.compile('賣')).click()
                        await page.wait_for_timeout(20)
            await checkpoint(page, 'sold-materials', 'UI: sold gathered wood and monster loot at the open store.')
        else:
            await checkpoint(page, 'store-unavailable', 'Store was not reachable/open from current UI route.')

        smith_button = page.locator('.activity-panel').get_by_role('button', name=re.compile('鐵匠鋪'))
        if await smith_button.count() and not await smith_button.is_disabled():
            await smith_button.click()
            for item_name in ['鐵劍', '皮甲']:
                item_row = page.locator('.shop-item').filter(has_text=item_name)
                if await item_row.count():
                    buy = item_row.get_by_role('button', name=re.compile('買'))
                    await page.get_by_role('button', name=re.compile('儲存世界')).click()
                    current = await state(page)
                    reserve = 25 if current['settlement']['stage'] == 'village' else 20
                    price = int(re.search(r'買 (\d+) 金', await buy.inner_text()).group(1)) if await buy.count() else 10**9
                    if await buy.count() and not await buy.is_disabled() and current['characters'][0]['gold'] - price >= reserve:
                        await buy.click(); await page.wait_for_timeout(20)
            smith_purchase = await checkpoint(page, 'smith-purchase', 'UI: attempted affordable smith purchases; saved state read-only.')
            assert smith_purchase['inventory']['sword'] >= 1, 'UI sword purchase did not complete'
            await nav(page, '背包')
            for item_name in ['鐵劍', '皮甲']:
                item_row = page.locator('.inventory-item').filter(has_text=item_name)
                equip_button = item_row.get_by_role('button', name='裝備', exact=True)
                if await equip_button.count() and not await equip_button.is_disabled():
                    await equip_button.click(); await page.wait_for_timeout(20)
            equipment = await checkpoint(page, 'equipment-equipped', 'UI: equipped purchased sword from inventory; armor purchase was not affordable after reserving tavern hire cost.')
            assert equipment['equipment']['weapon'] == 'sword', 'UI sword equip did not complete'
        else:
            await checkpoint(page, 'smith-unavailable', 'Smith remained locked or unreachable through UI.')

        # Tavern/mercenary trial. Reach its building through the regular settlement control.
        await nav(page, '世界')
        await travel(page, '回家')
        tavern_button = page.locator('.activity-panel').get_by_role('button', name=re.compile('酒館'))
        if await tavern_button.count() and not await tavern_button.is_disabled():
            await tavern_button.click()
            # Let normal 20x world speed reach the published opening time, then pause via UI.
            clock_text = (await page.locator('.world-clock').inner_text())
            if not re.search(r'17:|18:|19:|20:|21:|22:|23:', clock_text):
                await page.get_by_role('button', name='×20', exact=True).click()
                for _ in range(100):
                    await page.wait_for_timeout(250)
                    clock_text = await page.locator('.world-clock').inner_text()
                    if re.search(r'17:|18:|19:|20:|21:|22:|23:', clock_text):
                        break
                await page.get_by_role('button', name='暫停', exact=True).click()
            tavern_text = await page.locator('.activity-panel').inner_text()
            await checkpoint(page, 'tavern-open', 'UI: moved to tavern and advanced normal clock to operating hours.')
            mercenary_buttons = page.locator('.tavern-panel .mercenary button')
            hired = False
            for i in range(await mercenary_buttons.count()):
                candidate = mercenary_buttons.nth(i)
                if not await candidate.is_disabled():
                    await candidate.click(); hired = True; break
            hired_state = await checkpoint(page, 'tavern-hire-attempt', 'UI: attempted to hire first available listed mercenary; no balance edits.')
            observations[-1]['hireClicked'] = hired
            assert hired and hired_state['party'] > 0, 'no mercenary could be hired through the tavern UI'
        else:
            await checkpoint(page, 'tavern-unavailable', 'Village/tavern button remained locked or unreachable via UI.')

        final = await checkpoint(page, 'final', 'End-of-route UI save and read-only localStorage inspection.')
        assert final['party'] > 0
        (ROOT / 'adventure-observations.json').write_text(json.dumps({
            'startedAtUtc': STARTED, 'environment': {'url': BASE_URL, 'browser': 'Chromium via Playwright', 'headless': True, 'isolatedContext': True},
            'observations': observations, 'consoleErrors': console_errors,
            'route': {'forestBattles': [first, second], 'dungeonBattle': dungeon_fight},
        }, ensure_ascii=False, indent=2))
        print(json.dumps({'route': {'forestBattles': [first, second], 'dungeonBattle': dungeon_fight}, 'final': final,
                          'pageErrors': console_errors}, ensure_ascii=False, indent=2))
        await context.close()
        await browser.close()

asyncio.run(main())
