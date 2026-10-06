"""Longer real lifecycle freeze and real close/reopen; no injected state or clock."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import time
import traceback
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded

URL = 'http://127.0.0.1:5195'
manifest = json.loads((OUT.parent / 'build-manifest.json').read_text())
result = {'sourceCommit': manifest['sourceCommit'], 'startedAtUtc': datetime.now(timezone.utc).isoformat(),
          'evidenceClass': 'Supplemental real browser Active Idle; independent from the formal 2h soak',
          'checks': [], 'pageErrors': [], 'consoleErrors': [], 'status': 'RUNNING'}
profile = tempfile.mkdtemp(prefix='oakvale-v2-extended-idle-', dir='/tmp')
result['profile'] = profile

def publish():
    write_recorded(OUT / 'extended-idle.json', json.dumps(result, ensure_ascii=False, indent=2), producer='root-extended-idle')

def attach(page):
    page.on('pageerror', lambda error: result['pageErrors'].append(str(error)))
    page.on('console', lambda message: result['consoleErrors'].append(message.text) if message.type == 'error' else None)

def read(page):
    return page.evaluate("JSON.parse(localStorage.getItem('oakvale-v1'))")

try:
    publish()
    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium',
                       headless=True, args=['--no-sandbox'], viewport={'width': 1440, 'height': 1000})
        page = context.pages[0]
        attach(page)
        result['browser'] = context.browser.version
        actual = {}
        for name, expected in manifest['assetsSha256'].items():
            response = context.request.get(URL + '/' + name)
            assert response.status == 200
            actual[name] = hashlib.sha256(response.body()).hexdigest()
            assert actual[name] == expected, name
        result['servedAssetsSha256'] = actual
        page.goto(URL, wait_until='domcontentloaded')
        page.get_by_role('button', name='起身', exact=True).click()
        page.get_by_role('button', name='×20', exact=True).click()
        page.wait_for_timeout(800)
        before = read(page)
        cdp = context.new_cdp_session(page)
        frozen_start = time.monotonic()
        cdp.send('Page.setWebLifecycleState', {'state': 'frozen'})
        print('FROZEN real lifecycle: waiting 55 real seconds', flush=True)
        time.sleep(55)
        cdp.send('Page.setWebLifecycleState', {'state': 'active'})
        page.get_by_role('button', name='暫停', exact=True).click()
        elapsed = time.monotonic() - frozen_start
        resumed = read(page)
        caught = resumed['worldTime'] - before['worldTime']
        assert caught >= 2100 and abs(caught - elapsed * 40) <= 20, (caught, elapsed)
        result['checks'].append({'name': '55s actual page lifecycle freeze catches in-session x20 elapsed time',
                                'realElapsedSeconds': elapsed, 'gameMinutesCaughtUp': caught,
                                'expectedGameMinutesPerRealSecond': 40, 'noFakeClock': True})
        page.locator('.save-button').click()
        page.wait_for_timeout(250)
        saved = read(page)
        publish()
        context.close()
        close_start = time.monotonic()
        print('CLOSED actual Chromium: waiting 55 real seconds', flush=True)
        time.sleep(55)
        context = playwright.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium',
                       headless=True, args=['--no-sandbox'], viewport={'width': 1440, 'height': 1000})
        page = context.pages[0]
        attach(page)
        # This only observes the stored save before app boot; it does not modify it.
        page.add_init_script("window.__qaPreAppSave = JSON.parse(localStorage.getItem('oakvale-v1'));")
        page.goto(URL, wait_until='domcontentloaded')
        page.get_by_role('button', name='暫停', exact=True).click()
        loaded = page.evaluate('window.__qaPreAppSave')
        fields = ['worldTime', 'worldSeed', 'rngState', 'activeCharacterId', 'characters', 'npcs',
                  'history', 'threat', 'regions', 'settlement', 'life', 'dungeon', 'party']
        for field in fields:
            assert loaded[field] == saved[field], field
        result['checks'].append({'name': 'actual Chromium closed 55s then same profile reopens without offline progress',
                                'realClosedSeconds': time.monotonic() - close_start,
                                'savedWorldTime': saved['worldTime'], 'loadedWorldTime': loaded['worldTime'],
                                'fieldsCompared': fields,
                                'foregroundProgressBeforePause': read(page)['worldTime'] - loaded['worldTime']})
        assert not result['pageErrors'], result['pageErrors']
        context.close()
        result['status'] = 'PASS'
except BaseException as error:
    result.update({'status': 'FAIL', 'originalFailure': str(error), 'traceback': traceback.format_exc()})
    raise
finally:
    result['endedAtUtc'] = datetime.now(timezone.utc).isoformat()
    publish()
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
