"""V2 Firefox smoke using the already installed local QA WebDriver harness."""
import importlib.util
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from scripts.recorded_reports import write_recorded
spec = importlib.util.spec_from_file_location('qa08_driver', ROOT/'reports/playtests/20261004-deep-qa/platforms/qa08_smoke.py')
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)
driver.BASE_URL = 'http://127.0.0.1:5194/'
result = {'checks': [], 'physicalDevice': False, 'engine': 'Firefox ESR'}
def check(name):
    result['checks'].append(name)
    write_recorded(Path(__file__).with_name('firefox.json'), json.dumps(result,ensure_ascii=False,indent=2), producer='v2-firefox')
    print('PASS', name, flush=True)

ui = process = None
try:
    ui, process, log, base = driver.w3c_session()
    result['browserVersion'] = ui._capabilities['browserVersion']
    start = ui.eval("return JSON.parse(localStorage.getItem('oakvale-v1')).worldTime")
    time.sleep(.6)
    assert ui.eval("return JSON.parse(localStorage.getItem('oakvale-v1')).worldTime") == start
    ui.click_text('dialog button', '起身', exact=True)
    ui.click_text('.speed-controls button', '暫停', exact=True)
    check('opening/start/pause')
    for label in ['這一生', '住所與產業', '地方消息與委託']:
        ui.click_text('.menu-trigger', '選單')
        ui.click_text('.pixel-menu button', label, exact=True)
        assert ui.eval("return document.querySelectorAll('dialog[open]').length") == 1
        ui.key('Tab')
        assert ui.eval("return document.querySelector('dialog').contains(document.activeElement)")
        ui.key('Escape')
        check('single modal/keyboard: '+label)
    before = ui.eval("return JSON.parse(localStorage.getItem('oakvale-v1')).worldTime")
    ui.click_text('.speed-controls button', '×20', exact=True)
    time.sleep(1.3)
    ui.click_text('.speed-controls button', '暫停', exact=True)
    after = ui.eval("return JSON.parse(localStorage.getItem('oakvale-v1')).worldTime")
    assert after >= before+40
    check('actual x20 clock and autosave')
    ui.eval("const save=JSON.parse(localStorage.getItem('oakvale-v1')); save.lastSavedAt=Date.now()-30*86400000;localStorage.setItem('oakvale-v1',JSON.stringify(save));return true")
    initial_errors = ui.eval('return window.__qa08Monitor.pageErrors')
    ui.reload()
    ui.eval(driver.monitor_script())
    ui.click_text('.speed-controls button', '暫停', exact=True)
    assert ui.eval("return JSON.parse(localStorage.getItem('oakvale-v1')).worldTime") == after
    check('reload freezes closed-session time')
    records = ui.eval_async("const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('oakvale-play-journal',1); req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)}); const rows=await new Promise((resolve,reject)=>{const tx=db.transaction('records'); const req=tx.objectStore('records').getAll();tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error)});db.close();return rows;")
    assert records and len({record['id'] for record in records}) == len(records)
    result['journalRecords'] = len(records)
    check('IndexedDB records persist with unique IDs')
    errors = ui.eval('return window.__qa08Monitor.pageErrors')
    assert not initial_errors and not errors, [initial_errors, errors]
    check('no uncaught page exceptions')
finally:
    if ui:
        try: ui._request('DELETE',f'/session/{ui.session}')
        except Exception: pass
        ui._log_handle.close()
    if process:
        process.terminate()
        process.wait(timeout=10)
