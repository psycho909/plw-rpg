"""Independent verification of controlled save-corruption boundary; not normal play."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).parent
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.goto('http://127.0.0.1:5173/', wait_until='networkidle')
    page.get_by_role('button', name='暫停', exact=True).click()
    page.get_by_role('button', name='儲存世界').click()
    baseline = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
    # Seed a separate context before any app runs; pagehide cannot overwrite it.
    baseline['preparedPlots'] = 0.5
    baseline['lastSavedAt'] = int(time.time() * 1000)
    context.close()
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, storage_state={
        'cookies': [], 'origins': [{'origin': 'http://127.0.0.1:5173', 'localStorage': [
            {'name': 'oakvale-v1', 'value': json.dumps(baseline)}
        ]}]
    })
    page = context.new_page()
    page.goto('http://127.0.0.1:5173/', wait_until='networkidle')
    page.get_by_role('button', name='暫停', exact=True).click()
    page.get_by_role('button', name='儲存世界').click()
    accepted = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
    assert accepted['preparedPlots'] == 0.5, accepted['preparedPlots']
    expect(page.get_by_role('status')).to_contain_text('世界已儲存')
    page.locator('.travel-row').get_by_role('button', name='農田').click()
    for _ in range(4):
        page.get_by_role('button', name='整地 · 20 分', exact=True).click()
    page.get_by_role('button', name='儲存世界').click()
    exceeded_raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    exceeded = json.loads(exceeded_raw)
    assert exceeded['preparedPlots'] == 4.5
    assert not exceeded['crops']
    page.screenshot(path=str(OUT / 'verify-fractional-plots-before-reload.png'), full_page=True)
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('status')).to_contain_text('存檔資料不完整')
    rejected_raw = page.evaluate("localStorage.getItem('oakvale-v1')")
    assert json.loads(rejected_raw)['preparedPlots'] == 4.5
    page.get_by_role('button', name='儲存世界').click()
    expect(page.get_by_role('status')).to_contain_text('原始存檔已保留')
    assert page.evaluate("localStorage.getItem('oakvale-v1')") == rejected_raw
    page.screenshot(path=str(OUT / 'verify-fractional-plots-rejected.png'), full_page=True)
    result = {'status': 'confirmed', 'method': 'controlled fault injection; not normal gameplay', 'seed': baseline['worldSeed'], 'injectedPreparedPlots': 0.5, 'acceptedPreparedPlots': accepted['preparedPlots'], 'afterFourPrepareActions': exceeded['preparedPlots'], 'reloadRejectedSave': True, 'rawSavePreservedAfterRejection': True}
    (OUT / 'verify-bugs-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
