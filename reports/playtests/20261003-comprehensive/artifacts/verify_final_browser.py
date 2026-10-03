"""Final build: protect corrupt originals and render a naturally evolved 500-year save."""
import json
import os
from pathlib import Path
import sys
import time
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).resolve().parent
os.environ.setdefault('PLW_UI_URL', 'http://127.0.0.1:5182/')
sys.path.insert(0, str(OUT.parent))
from ui_helpers import new_page, state, close, RESULTS

start = time.time()
result = {'url': os.environ['PLW_UI_URL'], 'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'protected_inputs': [], 'long_world': []}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    inputs = [(name, json.loads((OUT / name).read_text())) for name in ['id-npc-input.json', 'id-crop-input.json', 'id-sequence-input.json']]
    null_crop = json.loads((OUT / 'rest-wages-before.json').read_text())
    null_crop['crops'] = [None]
    inputs.append(('null crop shape', null_crop))
    for name, fixture in inputs:
        fixture['lastSavedAt'] = int(time.time() * 1000)
        raw = json.dumps(fixture, ensure_ascii=False)
        context, page = new_page(browser, viewport=(390, 844), raw=raw)
        expect(page.locator('.save-warning')).to_contain_text('原始存檔已保留')
        page.locator('.save-button').click()
        assert page.evaluate('localStorage.getItem("oakvale-v1")') == raw
        page.reload(wait_until='networkidle')
        expect(page.locator('.save-warning')).to_contain_text('原始存檔已保留')
        assert page.evaluate('localStorage.getItem("oakvale-v1")') == raw
        result['protected_inputs'].append({'name': name, 'rejected_on_first_load': True, 'manual_save_and_pagehide_preserve_raw': True})
        context.close()

    saved = json.loads((OUT / 'long-world-final-save.json').read_text())
    for viewport in [(1440, 1000), (390, 844)]:
        context, page = new_page(browser, viewport=viewport, saved=saved)
        expect(page.locator('.save-warning')).to_have_count(0)
        loaded = state(page)
        assert loaded['activeCharacterId'] == saved['activeCharacterId']
        for field in ['characters', 'history', 'settlement', 'nextNpcId', 'eventSequence']:
            assert loaded[field] == saved[field], field
        page.keyboard.press('m')
        page.get_by_role('button', name='居民', exact=True).click()
        assert page.locator('.people-list button').count() == 79
        close(page)
        page.keyboard.press('Escape')
        page.locator('.pixel-menu').get_by_role('button', name='世界歷史', exact=True).click()
        assert page.locator('.event-list li').count() == min(100, len(saved['history']))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / f'long-world-{viewport[0]}.png'), full_page=True)
        result['long_world'].append({'viewport': viewport, 'year': 501, 'characters': len(loaded['characters']), 'npc_buttons': 79, 'saved_history': len(loaded['history']), 'displayed_history': page.locator('.event-list li').count(), 'save_consistent': True, 'no_document_overflow': True})
        context.close()
    browser.close()
result.update({'elapsed_seconds': round(time.time() - start, 3), 'page_errors': RESULTS['page_errors'], 'status': 'passed'})
assert not result['page_errors']
(OUT / 'final-browser-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
