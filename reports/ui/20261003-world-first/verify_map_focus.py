import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT = Path(__file__).resolve().parent / 'artifacts'
OUT.mkdir(exist_ok=True)
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [1280,320]:
  c=b.new_context(viewport={'width':width,'height':900});page=c.new_page();page.goto('http://127.0.0.1:5174');page.get_by_role('button',name='暫停',exact=True).click();page.keyboard.press('m');page.locator('dialog[open]').wait_for()
  for key,start in [('Tab','dialog .filter-buttons button:last-child'),('Shift+Tab','dialog .action-buttons button:first-child')]:
   page.locator(start).focus();page.keyboard.press(key)
   state=page.evaluate('({tile:document.activeElement.matches(".tile"),tabIndex:document.activeElement.tabIndex,inDialog:!!document.activeElement.closest("dialog"),label:document.activeElement.textContent})')
   results.append({'width':width,'key':key,**state,'passed':not state['tile'] and state['tabIndex']>=0 and state['inDialog']})
  page.locator('dialog .window-close').focus();page.keyboard.press('Shift+Tab');assert page.evaluate('!!document.activeElement.closest(".window-footer")')
  page.keyboard.press('Tab');assert page.locator('dialog .window-close').evaluate('(e)=>e===document.activeElement')
  page.keyboard.press('Escape');assert page.locator('dialog[open]').count()==0
  assert page.get_by_role('button',name='暫停',exact=True).evaluate('(e)=>e===document.activeElement')
  c.close()
 b.close()
(OUT / ('map-focus-'+sys.argv[1]+'.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False))
assert all(r['passed'] for r in results), 'Tab/Shift+Tab must skip overview tiles with tabindex=-1'
