import json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT = Path(__file__).resolve().parent / 'artifacts'
OUT.mkdir(exist_ok=True)
out=[]
def geometry(page):
    boxes=page.locator('.world-notices > *').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}})')
    assert len(boxes)==2, boxes
    assert boxes[0]['bottom'] <= boxes[1]['top'], boxes
    frame=page.locator('.world-frame').bounding_box()
    assert boxes[1]['bottom'] <= frame['y'], (boxes,frame)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    for b in boxes: assert b['left']>=0 and b['right']<=page.viewport_size['width']
    return boxes
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [390,320]:
      for mode in ['corrupt','throwing','long-read-error']:
        context=browser.new_context(viewport={'width':width,'height':844})
        if mode=='corrupt': context.add_init_script("localStorage.setItem('oakvale-v1', '{broken');")
        elif mode=='throwing': context.add_init_script("window.failSave=true; const original=Storage.prototype.setItem; Storage.prototype.setItem=function(...args){if(window.failSave)throw new Error('quota'); return original.apply(this,args)};")
        else: context.add_init_script("const original=Storage.prototype.getItem; Storage.prototype.getItem=function(key){if(key!=='oakvale-v1')return original.call(this,key);throw new Error('無法讀取儲存資料，請保留此頁並檢查瀏覽器設定。'.repeat(12)+'StorageFailureWithoutWhitespace'.repeat(8))};")
        page=context.new_page(); page.set_default_timeout(5000); page.goto('http://127.0.0.1:5174'); page.get_by_role('button',name='暫停',exact=True).click()
        if mode=='corrupt':
          page.keyboard.press('Escape');page.wait_for_timeout(150);page.locator('.reset-trigger').click();page.keyboard.press('Escape')
        if mode!='long-read-error': page.locator('.save-button').click()
        boxes=geometry(page)
        page.screenshot(path=str(OUT / f'notices-{mode}-{width}.png'),full_page=True)
        if mode=='throwing':
          page.locator('.save-warning button').click()
          assert '存檔失敗' in page.locator('.save-warning').inner_text()
          page.evaluate('window.failSave=false')
          page.locator('.save-warning button').click()
          assert page.locator('.save-warning').count()==0
          assert page.evaluate("localStorage.getItem('oakvale-v1')")
        else:
          page.locator('.save-warning button').click(); assert page.locator('dialog[open]').count()==1
          page.keyboard.press('Escape')
          if mode=='corrupt': assert page.evaluate("localStorage.getItem('oakvale-v1')")=='{broken'
        page.get_by_role('button',name='關閉訊息',exact=True).click()
        assert page.locator('.world-notices > .status-notice').count()==0
        page.get_by_role('button',name='往右',exact=True).click()
        out.append({'width':width,'mode':mode,'passed':True,'notice_boxes':boxes})
        context.close()
    browser.close()
(OUT / 'notices-results.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps(out,ensure_ascii=False))
