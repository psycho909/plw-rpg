"""Focused UI regression on the fixed local build; disposable contexts only.

Case 1 resumes the unchanged public-action state from the baseline reproduction.
Other cases explicitly adjust gold/time/position to exercise payment boundaries.
"""
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import time
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
os.environ.setdefault('PLW_UI_URL', 'http://127.0.0.1:5181/')
sys.path.insert(0, str(OUT.parent))
from ui_helpers import new_page, interact, state, player, RESULTS

start = time.time()
original = json.loads((OUT / 'rest-wages-before.json').read_text())
results = {'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'url': os.environ['PLW_UI_URL'], 'source_sha256': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT / 'src/engine/actions.ts', ROOT / 'src/engine/actions.test.ts']}, 'cases': []}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for kind, gold, expected_gold, expected_party in [('inn', 8, 0, 0), ('inn', 12, 0, 1), ('tavern', 6, 3, 0), ('tavern', 7, 0, 1)]:
        fixture = copy.deepcopy(original)
        natural = kind == 'inn' and gold == 8
        if not natural:
            player(fixture)['gold'] = gold
            fixture['worldTime'] = fixture['worldTime'] // 1440 * 1440 + 23 * 60 + 30
            if kind == 'tavern':
                player(fixture)['position'] = {'x': 11, 'y': 11}
        context, page = new_page(browser, saved=fixture)
        loaded = state(page)
        assert player(loaded)['gold'] == gold
        interact(page)
        page.get_by_role('button', name='住宿 · 8 金／8 小時' if kind == 'inn' else '喝一杯、歇歇腳 · 3 金／1 小時', exact=True).click()
        after = state(page)
        assert player(after)['gold'] == expected_gold
        assert len(after['party']) == expected_party
        assert after['worldTime'] == loaded['worldTime'] + (480 if kind == 'inn' else 60)
        reload_start = time.monotonic()
        page.reload(wait_until='networkidle')
        page.get_by_role('button', name='暫停', exact=True).click()
        expect(page.locator('.save-warning')).to_have_count(0)
        reloaded = state(page)
        for key in ('characters', 'party', 'crops', 'preparedPlots', 'settlement', 'threat', 'dungeon', 'history'):
            assert reloaded[key] == after[key], key
        # A reload intentionally resumes at x1 until the Pause click completes.
        delta = reloaded['worldTime'] - after['worldTime']
        assert 0 <= delta <= math.ceil((time.monotonic() - reload_start) * 2) + 2
        results['cases'].append({'kind': kind, 'gold_before': gold, 'gold_after': expected_gold, 'party_after': expected_party, 'mode': 'public-engine-generated save without field injection' if natural else 'controlled payment-boundary fixture', 'reload_consistent': True, 'reload_time_delta_minutes': delta})
        if natural:
            page.screenshot(path=str(OUT / 'rest-wages-fixed.png'), full_page=True)
        context.close()
    browser.close()
results.update({'elapsed_seconds': round(time.time() - start, 3), 'page_errors': RESULTS['page_errors'], 'status': 'passed'})
assert not results['page_errors']
(OUT / 'rest-wages-ui-fixed.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(results, ensure_ascii=False))
