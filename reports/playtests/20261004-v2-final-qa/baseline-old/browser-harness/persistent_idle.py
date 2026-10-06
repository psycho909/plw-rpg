"""Real Chromium persistent-profile close/reopen and in-session frozen-page QA.

No injected save, clock, resources, game state, or debug time advancement.
"""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

OUT = Path(__file__).parent
URL = 'http://127.0.0.1:5195'
manifest = json.loads((OUT.parent / 'build-manifest.json').read_text())
result = {'sourceCommit': manifest['sourceCommit'], 'evidenceClass': 'real browser UI regression; normal newly created save',
          'startedAt': datetime.now(timezone.utc).isoformat(), 'checks': [], 'pageErrors': [], 'consoleErrors': []}
profile = tempfile.mkdtemp(prefix='oakvale-v2-persistent-idle-', dir='/tmp')
result['profile'] = profile

def connect(p):
    ctx = p.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium', headless=True,
                                              args=['--no-sandbox'], viewport={'width': 1440, 'height': 1000})
    page = ctx.pages[0]
    page.on('pageerror', lambda err: result['pageErrors'].append(str(err)))
    page.on('console', lambda msg: result['consoleErrors'].append(msg.text) if msg.type == 'error' else None)
    page.goto(URL)
    page.wait_for_selector('.world-map')
    return ctx, page

def snapshot(page):
    return page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")

def publish():
    write_recorded(OUT / 'persistent-idle.json', json.dumps(result, ensure_ascii=False, indent=2), producer='root-browser-idle')

with sync_playwright() as p:
    ctx, page = connect(p)
    result['browser'] = ctx.browser.version
    actual = {}
    for name, expected in manifest['assetsSha256'].items():
        response = ctx.request.get(URL + '/' + name)
        actual[name] = hashlib.sha256(response.body()).hexdigest()
        assert actual[name] == expected, name
    result['servedAssetsSha256'] = actual
    page.get_by_role('button', name='起身', exact=True).click()
    page.get_by_role('button', name='×20', exact=True).click()
    page.wait_for_timeout(1200)
    page.get_by_role('button', name='暫停', exact=True).click()
    before = snapshot(page)
    assert before['worldTime'] > 480
    page.wait_for_timeout(1000)
    assert snapshot(page)['worldTime'] == before['worldTime']
    result['checks'].append({'name': 'pause stops normal foreground runtime', 'worldTime': before['worldTime']})
    ctx.close()
    closed = time.monotonic()
    time.sleep(3)
    ctx, page = connect(p)
    page.get_by_role('button', name='暫停', exact=True).click()
    reloaded = snapshot(page)
    assert reloaded['worldTime'] == before['worldTime'], (before['worldTime'], reloaded['worldTime'])
    for field in ['worldSeed', 'rngState', 'npcs', 'characters', 'history', 'regions', 'settlement', 'life']:
        assert reloaded[field] == before[field], field
    result['checks'].append({'name': 'actual persistent Chromium close, real wait, same-profile reopen retains saved state',
                             'realClosedSeconds': time.monotonic() - closed, 'savedWorldTime': before['worldTime'],
                             'loadedWorldTime': reloaded['worldTime'], 'fieldsCompared': ['worldSeed', 'rngState', 'npcs', 'characters', 'history', 'regions', 'settlement', 'life']})
    page.get_by_role('button', name='×20', exact=True).click()
    cdp = ctx.new_cdp_session(page)
    frozen = time.monotonic()
    cdp.send('Page.setWebLifecycleState', {'state': 'frozen'})
    time.sleep(3)
    cdp.send('Page.setWebLifecycleState', {'state': 'active'})
    page.get_by_role('button', name='暫停', exact=True).click()
    elapsed = time.monotonic() - frozen
    caught = snapshot(page)['worldTime'] - reloaded['worldTime']
    assert caught >= 110 and caught <= elapsed * 40 + 8, (caught, elapsed)
    result['checks'].append({'name': 'real page lifecycle freeze/resume retains in-session x20 elapsed time',
                             'realElapsedSeconds': elapsed, 'gameMinutesCaughtUp': caught, 'expectedMinutesPerSecond': 40,
                             'method': 'CDP frozen/active lifecycle; no fake time'})
    ctx.close()
result['endedAt'] = datetime.now(timezone.utc).isoformat()
result['status'] = 'PASS'
publish()
print(json.dumps(result, ensure_ascii=False, indent=2))
