"""UI 429 regression on compiled loopback preview; synthetic world and mocked writes."""
import datetime,json,os,subprocess
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','')
assert urlparse(base).hostname in ('127.0.0.1','localhost'),'QA_BASE must be loopback'
out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/chat-admission')));out.mkdir(parents=True,exist_ok=True)
report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,width,height in [('desktop',1365,900),('mobile',390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=name=='mobile',has_touch=name=='mobile')
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--motion'],cwd=root,text=True))
   state={'posts':0,'mode':'limited','errors':[]}
   page.on('pageerror',lambda error:state['errors'].append(str(error)))
   page.route('**/api/**',lambda route:route.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
   def world(route):
    assert route.request.method=='GET','No world mutations in this harness'
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   def chat(route):
    state['posts']+=1
    body=route.request.post_data_json
    assert body['message']=='Lời nhắn được giữ lại khi cần chờ'
    if state['mode']=='limited':route.fulfill(status=429,content_type='application/json',headers={'Retry-After':'60'},body=json.dumps({'error':'Bạn gửi lời nhắn hơi nhanh. Hãy chờ một chút rồi thử lại.','retryAfter':60}))
    else:route.fulfill(status=200,content_type='application/json',body=json.dumps({'reply':'Mình vẫn ở đây, cảm ơn bạn đã đợi nhé.'}))
   page.route('**/api/world*',world);page.route('**/api/living/interact',chat)
   try:
    page.goto(base,wait_until='domcontentloaded',timeout=60000)
    page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
    page.get_by_role('button',name='Cư dân',exact=True).click()
    field=page.locator('#visitor-message');field.fill('Lời nhắn được giữ lại khi cần chờ');field.press('Enter')
    page.get_by_role('alert').filter(has_text='Bạn gửi lời nhắn hơi nhanh.').wait_for(timeout=15000)
    assert field.input_value()=='Lời nhắn được giữ lại khi cần chờ'
    assert field.evaluate('(e)=>e===document.activeElement&&!e.readOnly&&!e.disabled')
    assert page.locator('.conversation form').get_attribute('aria-busy')=='false'
    page.wait_for_timeout(2500);assert state['posts']==1,'429 must not trigger automatic writes'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/f'{name}-429-preview.png'))
    state['mode']='success';field.press('Enter');page.get_by_text('Mình vẫn ở đây, cảm ơn bạn đã đợi nhé.',exact=True).wait_for()
    assert state['posts']==2;assert field.input_value()=='';assert field.evaluate('(e)=>e===document.activeElement')
    assert page.get_by_role('alert').count()==0
    assert not state['errors'],state['errors']
    report.append({'viewport':name,'fixture':'synthetic local, mocked HTTP writes','renderer':'Chromium SwiftShader','http429DraftAndFocus':True,'noAutomaticRetryMs':2500,'manualRetryAndClearDraft':True,'overflow':False,'pageErrors':state['errors']})
    print(name,'PASS 429 keeps draft/focus, no automatic retry, manual recovery',flush=True)
   except Exception:
    page.screenshot(path=str(out/f'{name}-failure-preview.png'))
    (out/f'{name}-failure.json').write_text(json.dumps(state,ensure_ascii=False,indent=2))
    raise
   finally:page.close()
 finally:browser.close()
(out/'metrics.json').write_text(json.dumps({'productionAccess':False,'uiWritesMocked':True,'results':report},ensure_ascii=False,indent=2)+'\n')
