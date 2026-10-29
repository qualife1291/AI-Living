"""Real UI, controlled lost-ACK server simulation. Loopback only; no live writes."""
import datetime,json,os,subprocess
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;base=os.environ.get('QA_BASE','')
assert urlparse(base).hostname in ('localhost','127.0.0.1')
out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/phase-verification')));out.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,w,h in [('desktop',1365,900),('mobile',390,844),('narrow',320,740)]:
   page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=w<700,has_touch=w<700)
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--motion'],cwd=root,text=True));state={'mode':'lost-ack','requests':[],'stored':{},'errors':[],'pending':None}
   page.on('pageerror',lambda e:state['errors'].append(str(e)))
   page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
   def world(route):
    assert route.request.method=='GET';fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   def chat(route):
    body=route.request.post_data_json;state['requests'].append(body)
    saved=state['stored'].setdefault(body['id'],{**body,'reply':'Đã nhận lời nhắn của bạn.','source':'rules'})
    if state['mode']=='lost-ack':route.abort('failed')
    elif state['mode']=='invalid-ack':route.fulfill(status=200,content_type='application/json',body=json.dumps({**saved,'id':'00000000-0000-4000-8000-000000000000'}))
    elif state['mode']=='held':state['pending']=route
    else:route.fulfill(status=200,content_type='application/json',body=json.dumps(saved))
   page.route('**/api/world*',world);page.route('**/api/living/interact',chat)
   try:
    page.goto(base,wait_until='domcontentloaded',timeout=60000);page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
    page.get_by_role('button',name='Cư dân',exact=True).click();field=page.locator('#visitor-message')
    text='Lời nhắn giữ nguyên sau khi mất xác nhận';field.fill(text);field.press('Enter');page.get_by_role('alert').filter(has_text='Mất kết nối').wait_for(timeout=15000)
    first=state['requests'][-1]['id'];assert len(state['stored'])==1;assert field.input_value()==text
    page.wait_for_timeout(1000);assert len(state['requests'])==1,'No automatic write retry'
    page.screenshot(path=str(out/f'{name}-lost-ack-preview.png'))
    state['mode']='success';field.press('Enter');page.locator('.conversation blockquote').wait_for()
    assert state['requests'][-1]['id']==first,'Manual lost-ACK retry must reuse UUID'
    assert len(state['stored'])==1,'Lost-ACK retry must not consume a second exchange/quota slot'
    assert field.input_value()==''
    field.fill(text);field.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="false"')
    assert state['requests'][-1]['id']!=first,'An intentional new message after success needs a fresh UUID';assert len(state['stored'])==2
    state['mode']='invalid-ack';field.fill('Chưa được xác nhận đúng UUID');field.press('Enter');page.get_by_role('alert').filter(has_text='Chưa xác nhận').wait_for()
    invalid=state['requests'][-1]['id'];assert field.input_value()=='Chưa được xác nhận đúng UUID'
    state['mode']='success';field.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="false"');assert state['requests'][-1]['id']==invalid
    state['mode']='held';field.fill('Đợi An trả lời');field.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="true"')
    before=len(state['requests']);page.locator('.conversation form').evaluate('(f)=>{f.requestSubmit();f.requestSubmit()}');page.wait_for_timeout(100);assert len(state['requests'])==before
    old=state['pending'];page.locator('.people-grid button').filter(has_text='Bình').click();field=page.locator('#visitor-message');field.fill('Chào Bình')
    try:old.fulfill(status=200,content_type='application/json',body=json.dumps({**state['stored'][state['requests'][-1]['id']],'reply':'Câu cũ của An'}))
    except Exception:pass # expected if cleanup already aborted the unmounted request
    page.wait_for_timeout(300);assert page.locator('.conversation blockquote').count()==0,'No old actor response in the new actor panel'
    state['mode']='success';field.press('Enter');page.locator('.conversation blockquote').wait_for();assert state['requests'][-1]['actorId']=='binh'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not state['errors'],state['errors']
    results.append({'viewport':name,'lostAckStableUuid':True,'noExtraStoredExchange':True,'newIntentNewUuid':True,'wrongAckRejected':True,'inflightDuplicateBlocked':True,'actorSwitchIsolated':True,'pageErrors':state['errors']})
    print(name,'PASS stable UUID, valid ACK binding, actor isolation',flush=True)
   except Exception:
    page.screenshot(path=str(out/f'{name}-failure-preview.png'));(out/f'{name}-failure.json').write_text(json.dumps(state,ensure_ascii=False,indent=2,default=str));raise
   finally:page.close()
 finally:browser.close()
(out/'metrics.json').write_text(json.dumps({'productionAccess':False,'uiWritesMocked':True,'results':results},ensure_ascii=False,indent=2)+'\n')
