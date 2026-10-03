"""Resume a save produced only by public engine actions, then use normal UI.

This is a controlled resume, not a claim that the preceding route ran in a browser.
The untouched fixed baseline build is required. Each run uses a disposable context.
"""
import json
from pathlib import Path
import sys
import time
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(OUT.parent))
from ui_helpers import new_page, interact, state, player, RESULTS

started = time.time()
before = json.loads((OUT / 'rest-wages-before.json').read_text())
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context, page = new_page(browser, saved=before)
    loaded = state(page)
    assert player(loaded)['gold'] == 8 and loaded['party']
    interact(page)
    expect(page.locator('#window-title')).to_contain_text('旅店')
    page.get_by_role('button', name='住宿 · 8 金／8 小時', exact=True).click()
    after = state(page)
    assert player(after)['gold'] == -4
    page.screenshot(path=str(OUT / 'rest-wages-negative.png'), full_page=True)
    raw = page.evaluate('localStorage.getItem("oakvale-v1")')
    page.reload(wait_until='networkidle')
    expect(page.locator('.save-warning')).to_contain_text('原始存檔已保留')
    # pagehide saves once more immediately before navigation, changing the timestamp.
    protected = json.loads(page.evaluate('localStorage.getItem("oakvale-v1")'))
    original = json.loads(raw)
    assert protected.pop('lastSavedAt') >= original.pop('lastSavedAt')
    assert protected == original
    page.screenshot(path=str(OUT / 'rest-wages-reload-blocked.png'), full_page=True)
    result = {'mode': 'normal UI from unmodified public-engine-generated saved state', 'utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'elapsed_seconds': round(time.time() - started, 3), 'gold_before': player(loaded)['gold'], 'gold_after': player(after)['gold'], 'world_time_before': loaded['worldTime'], 'world_time_after': after['worldTime'], 'reload_rejected': True, 'original_raw_preserved': True, 'page_errors': RESULTS['page_errors']}
    (OUT / 'rest-wages-ui-baseline.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))
    context.close()
    browser.close()
