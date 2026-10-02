"""Main agent keyboard/time controls check using a disposable browser save."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).parent
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:5173/', wait_until='networkidle')
    page.get_by_role('button', name='暫停', exact=True).click()
    def save():
        page.get_by_role('button', name='儲存世界').click()
        return page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
    initial = save()
    start_position = page.locator('.map-coordinates').inner_text()
    page.keyboard.press('ArrowRight')
    expect(page.locator('.map-coordinates')).not_to_have_text(start_position)
    page.keyboard.press('a')
    expect(page.locator('.map-coordinates')).to_have_text(start_position)
    key_state = save()
    checks = [{'action': 'ArrowRight then a', 'worldTime': key_state['worldTime'], 'position': start_position}]
    for label, multiplier in [('暫停', 0), ('×1', 1), ('×5', 5), ('×20', 20)]:
        page.get_by_role('button', name=label, exact=True).click()
        before = save()['worldTime']
        page.wait_for_timeout(1600)
        page.get_by_role('button', name='暫停', exact=True).click()
        after = save()['worldTime']
        delta = after - before
        assert delta == 0 if multiplier == 0 else 2 * multiplier <= delta <= 5 * multiplier, (label, delta)
        checks.append({'action': label, 'observedGameMinutes': delta, 'measurementMs': 1600})
    before_autosave = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1')).lastSavedAt")
    page.wait_for_function("old => JSON.parse(localStorage.getItem('oakvale-v1')).lastSavedAt > old", arg=before_autosave, timeout=12000)
    auto_saved = page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")
    checks.append({'action': 'automatic save while paused', 'lastSavedAtAdvanced': auto_saved['lastSavedAt'] > before_autosave})
    assert not errors, errors
    result = {'result': 'passed', 'seed': initial['worldSeed'], 'initialWorldTime': initial['worldTime'], 'checks': checks, 'pageErrors': errors}
    (OUT / 'verification-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
