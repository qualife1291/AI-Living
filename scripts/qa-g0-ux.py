"""G0 browser checks against a fresh compiled loopback Worker. All API mutations are mocked."""
import datetime,json,os,subprocess,time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5320')
assert urlparse(base).hostname in ('127.0.0.1','localhost')
out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/g0')));out.mkdir(parents=True,exist_ok=True)
report=[]
flags=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
def setup(browser,width=1440,height=900,dpr=2,motion='no-preference',fallback=None):
 fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--motion'],cwd=root,text=True))
 page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=dpr,is_mobile=width<700,has_touch=width<700,reduced_motion=motion)
 state={'posts':0,'gets':0,'chatPosts':0,'mode':'success','pending':None,'chatPending':None,'errors':[],'modelRequests':[]}
 page.on('pageerror',lambda e:state['errors'].append(str(e)))
 page.on('request',lambda r:state['modelRequests'].append(r.url) if '/models/' in r.url else None)
 page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
 def world(route):
  if route.request.method=='GET':
   state['gets']+=1;fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
   route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture));return
  state['posts']+=1;mode=state['mode'];value=route.request.post_data_json
  assert value['revision']==fixture['revision'],(value,fixture['revision'])
  if mode=='network':route.abort('failed');return
  if mode in (403,409,503):
   if mode==409:fixture['revision']+=1
   route.fulfill(status=mode,content_type='text/html',body='<html>error</html>');return
  if mode=='invalid':route.fulfill(status=200,content_type='text/html',body='<html>sign in</html>');return
  real=int(time.time()*1000);clock=fixture['world']['clock'];anchor=clock['anchors'][0]
  sim=anchor['simMs']+((clock.get('pausedAt') or real)-anchor['realMs'])*anchor['scale']
  fixture['world']['paused']=value['paused'];clock['pausedAt']=real if value['paused'] else None;clock['anchors']=[{'realMs':real,'simMs':sim,'scale':1}];fixture['revision']+=1
  if mode=='held':state['pending']=route
  else:route.fulfill(status=200,content_type='application/json',body='{"ok":true}')
 def chat(route):state['chatPosts']+=1;state['chatPending']=route
 page.route('**/api/world*',world);page.route('**/api/living/interact',chat)
 if fallback=='unsupported':page.add_init_script('window.DecompressionStream=undefined;')
 if fallback in ('corrupt','core-failure'):
  manifest=json.loads((root/'data/assets/city-transfer-manifest.json').read_text());asset=next(a for a in manifest['assets'] if a['id']=='gobkit-human002/it-engineer')
  page.route('**'+asset['url'],lambda r:r.fulfill(status=200,body=b'bad gzip'))
  if fallback=='core-failure':page.route('**/models/resources/gobkit-human002/ItEngineer.glb*',lambda r:r.fulfill(status=503,body='unavailable'))
 page.add_init_script('''new MutationObserver(()=>{const h=document.querySelector('.three-canvas[data-ready="true"]');if(h&&!window.__firstReady)window.__firstReady=performance.now()}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ready']});''')
 page.goto(base,wait_until='domcontentloaded',timeout=60000)
 host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
 assert page.locator('.three-canvas canvas').evaluate('(c)=>c.getContext("webgl2") instanceof WebGL2RenderingContext')
 return page,host,state,fixture

def pixels(page):
 return page.locator('.three-canvas').evaluate('''h=>{const c=h.querySelector('canvas');return{canvas:[c.width,c.height],css:[h.clientWidth,h.clientHeight],quality:h.dataset.effectiveQuality,pixelRatio:+h.dataset.pixelRatio}}''')
def check_pixels(page):
 s=pixels(page);budget={'eco':1e6,'balanced':2e6,'sharp':6e6}[s['quality']]
 assert s['canvas'][0]*s['canvas'][1]<=budget,s
 return s
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=flags)
 try:
  for name,w,h,dpr in [('desktop',1440,900,2),('mobile',390,844,3)]:
   page,host,state,fixture=setup(browser,w,h,dpr);initial=check_pixels(page)
   assert page.title()=='Xóm AI · Thành phố nhỏ, nhiều cuộc đời'
   assert 'thành phố 3D' in page.locator('meta[name="description"]').get_attribute('content')
   assert len([x for x in state['modelRequests'] if '/derivatives/' in x])==26
   assert not any('/characters/character-' in x for x in state['modelRequests'])
   page.screenshot(path=str(out/f'{name}-preview.png'))
   # Error classes keep the authoritative state and never automatically retry writes.
   for mode,text in [(403,'Bạn chưa có quyền'),(409,'Trạng thái vừa thay đổi'),(503,'Máy chủ chưa xác nhận'),('network','Mất kết nối, chưa xác nhận'),('invalid','Chưa xác nhận được thay đổi')]:
    state['mode']=mode;before=state['posts'];reads=state['gets']
    page.get_by_role('button',name='Tạm nghỉ',exact=True).click();page.locator('.live-alert').filter(has_text=text).wait_for()
    assert state['posts']==before+1;assert page.get_by_role('button',name='Tạm nghỉ',exact=True).is_enabled()
    assert fixture['world']['paused'] is False
    if mode==409:assert state['gets']>reads
   page.screenshot(path=str(out/f'{name}-pause-error-preview.png'))
   # A delayed acknowledgement cannot cause duplicate writes or an optimistic pause.
   state['mode']='held';before=state['posts']
   page.get_by_role('button',name='Tạm nghỉ',exact=True).evaluate('(b)=>{b.click();b.click()}')
   page.wait_for_function('document.querySelector(".live-top button:disabled")!==null')
   assert page.get_by_role('button',name='Tạm nghỉ',exact=True).is_disabled()
   assert state['posts']==before+1;assert state['pending'] is not None
   state['pending'].fulfill(status=200,content_type='application/json',body='{"ok":true}');state['pending']=None
   page.get_by_role('button',name='Tiếp tục',exact=True).wait_for();page.wait_for_timeout(300)
   position=host.get_attribute('data-position');page.wait_for_timeout(600);assert host.get_attribute('data-position')==position
   page.get_by_role('button',name='Cư dân',exact=True).click()
   assert page.locator('#visitor-message').is_disabled();before=state['chatPosts'];page.locator('.conversation form').evaluate('(f)=>f.requestSubmit()');page.wait_for_timeout(50);assert state['chatPosts']==before
   page.keyboard.press('Escape');state['mode']='success';page.get_by_role('button',name='Tiếp tục',exact=True).click();page.get_by_role('button',name='Tạm nghỉ',exact=True).wait_for()
   # Focus remains in the input while sending, and draft survives malformed/error replies.
   page.get_by_role('button',name='Cư dân',exact=True).click();input=page.locator('#visitor-message')
   input.fill('Chào An, hôm nay thế nào?');input.press('Enter')
   page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="true"')
   assert input.evaluate('(e)=>e===document.activeElement&&e.readOnly&&!e.disabled')
   state['chatPending'].fulfill(status=200,content_type='application/json',body='{"reply":"Mình đang dạo quanh thành phố."}');state['chatPending']=None
   page.locator('.conversation blockquote').wait_for();assert input.input_value()=='';assert input.evaluate('(e)=>e===document.activeElement')
   input.fill('Giữ lại lời nhắn này');input.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="true"')
   state['chatPending'].fulfill(status=503,content_type='application/json',body='{"error":"Chưa gửi được, hãy thử lại."}');state['chatPending']=None
   page.get_by_role('alert').filter(has_text='Chưa gửi được, hãy thử lại.').wait_for();assert input.input_value()=='Giữ lại lời nhắn này';assert input.evaluate('(e)=>e===document.activeElement')
   input.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="true"')
   state['chatPending'].fulfill(status=200,content_type='text/html',body='<html>not a reply</html>');state['chatPending']=None
   page.get_by_role('alert').filter(has_text='Chưa xác nhận được câu trả lời').wait_for();assert input.input_value()=='Giữ lại lời nhắn này'
   input.press('h');assert 'hud-hidden' not in page.locator('main').get_attribute('class')
   page.screenshot(path=str(out/f'{name}-chat-preview.png'))
   input.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="true"')
   close=page.get_by_role('button',name='Đóng bảng thông tin',exact=True);close.focus()
   state['chatPending'].fulfill(status=200,content_type='application/json',body='{"reply":"Hẹn gặp lại nhé."}');state['chatPending']=None
   page.get_by_text('Hẹn gặp lại nhé.',exact=True).wait_for();assert close.evaluate('(e)=>e===document.activeElement')
   page.keyboard.press('Escape');assert page.get_by_role('button',name='Cư dân',exact=True).evaluate('(e)=>e===document.activeElement')
   canvas=host.locator('canvas');canvas.focus();before=host.get_attribute('data-camera');page.keyboard.press('ArrowRight');page.keyboard.press('ArrowRight');page.keyboard.press('ArrowRight')
   page.wait_for_function('document.querySelector(".three-canvas").dataset.view==="orbit"');page.wait_for_function('(before)=>document.querySelector(".three-canvas").dataset.camera!==before',arg=before)
   # Explicit presets, resize, hidden rendering and context-loss cleanup.
   quality=page.get_by_role('button',name='Chất lượng đồ họa',exact=True)
   quality.click();page.wait_for_function('document.querySelector(".three-canvas").dataset.effectiveQuality==="sharp"');check_pixels(page)
   cdp=page.context.new_cdp_session(page)
   for dpi in [1,4,dpr]:
    cdp.send('Emulation.setDeviceMetricsOverride',{'width':w,'height':h,'deviceScaleFactor':dpi,'mobile':name=='mobile'})
    page.wait_for_function('(d)=>devicePixelRatio===d',arg=dpi);page.wait_for_timeout(150);check_pixels(page)
    if dpi==1:page.wait_for_function('Number(document.querySelector(".three-canvas").dataset.pixelRatio)===1')
   quality.click();page.wait_for_function('document.querySelector(".three-canvas").dataset.effectiveQuality==="eco"');check_pixels(page)
   quality.click();page.wait_for_timeout(100);check_pixels(page)
   page.set_viewport_size({'width':320,'height':720});page.wait_for_timeout(300);check_pixels(page)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(300)
   page.evaluate('''()=>{window.__qaHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__qaHidden});document.dispatchEvent(new Event('visibilitychange'))}''')
   page.wait_for_timeout(100);frame=host.get_attribute('data-frame');page.wait_for_timeout(400);assert host.get_attribute('data-frame')==frame
   page.evaluate('window.__qaHidden=false;document.dispatchEvent(new Event("visibilitychange"))');page.wait_for_function('(n)=>document.querySelector(".three-canvas").dataset.frame!==n',arg=frame)
   page.evaluate('window.__g0Canvas=document.querySelector(".three-canvas canvas")');reads=state['gets'];fixture['revision']+=1
   page.wait_for_event('response',predicate=lambda r:'/api/world' in r.url and r.request.method=='GET',timeout=20000)
   page.wait_for_timeout(100);assert state['gets']>reads
   assert page.evaluate('window.__g0Canvas===document.querySelector(".three-canvas canvas")')
   page.get_by_role('button',name='Địa điểm',exact=True).click();page.get_by_role('button',name='Tái dựng từ OpenStreetMap',exact=True).click()
   page.wait_for_function('Number(document.querySelector(".osm-three")?.dataset.buildings)>500',timeout=60000)
   page.get_by_role('button',name='Địa điểm',exact=True).click();page.get_by_role('button',name='Thành phố sống',exact=True).click();host.wait_for(timeout=90000)
   page.get_by_role('button',name='Theo nhân vật',exact=True).click()
   canvas.evaluate('(c)=>c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
   page.get_by_text('Chưa mở được không gian 3D',exact=True).wait_for();assert page.locator('.three-canvas canvas').count()==0
   page.get_by_role('button',name='Thử lại 3D',exact=True).click();host.wait_for(timeout=90000);assert page.locator('.three-canvas canvas').count()==1
   assert not state['errors'],state['errors']
   result={'viewport':name,'initial':initial,'pauseErrors':[403,409,503,'network','invalid-ack'],'noDuplicateWrite':True,'pausedMotionFrozen':True,'chatFocusDraftAndNoSteal':True,'keyboard':True,'metadata':True,'responsive320':True,'presetsAndResize':True,'dynamicDPR':True,'pollKeepsCanvas':True,'OSMRemount':True,'hiddenResume':True,'contextLossRetry':True,'pageErrors':state['errors']}
   report.append(result);print('PASS',json.dumps(result),flush=True);page.close()
  # Reduced motion suppresses autonomous camera movement without pausing the world's clock.
  page,host,state,fixture=setup(browser,390,844,3,motion='reduce')
  page.wait_for_function('document.querySelector(".three-canvas").dataset.reducedMotion==="true"')
  assert page.get_by_role('button',name='Theo nhân vật',exact=True).get_attribute('aria-pressed')=='false'
  camera=host.get_attribute('data-camera');frame=host.get_attribute('data-frame');page.wait_for_timeout(800)
  assert camera==host.get_attribute('data-camera');assert frame!=host.get_attribute('data-frame');assert fixture['world']['paused'] is False
  page.get_by_role('button',name='Theo nhân vật',exact=True).click();frame=int(host.get_attribute('data-frame'));page.wait_for_function('(f)=>Number(document.querySelector(".three-canvas").dataset.frame)>f+1',arg=frame);camera=host.get_attribute('data-camera');page.wait_for_timeout(600);assert camera==host.get_attribute('data-camera')
  page.emulate_media(reduced_motion='no-preference');page.wait_for_function('document.querySelector(".three-canvas").dataset.reducedMotion==="false"');page.get_by_role('button',name='Theo nhân vật',exact=True).click();page.wait_for_function('document.querySelector(".urban-camera button[title]").getAttribute("aria-pressed")==="true"')
  page.emulate_media(reduced_motion='reduce');page.wait_for_function('document.querySelector(".urban-camera button[title]").getAttribute("aria-pressed")==="false"');page.wait_for_timeout(200);camera=host.get_attribute('data-camera');page.wait_for_timeout(500);assert camera==host.get_attribute('data-camera')
  page.screenshot(path=str(out/'mobile-reduced-motion-preview.png'));assert not state['errors'];report.append({'reducedMotion':True,'preferenceChange':True,'worldNotPaused':True,'pageErrors':[]});page.close()
  for mode in ['unsupported','corrupt','core-failure']:
   page,host,state,fixture=setup(browser,390,844,1,fallback=mode)
   models=json.loads(host.get_attribute('data-model-actors'));assert len(models)==3
   if mode=='unsupported':assert not any('/derivatives/' in x for x in state['modelRequests'])
   if mode=='corrupt':assert models['an']['modelId']=='gobkit-human002/it-engineer';assert any('/ItEngineer.glb?' in x for x in state['modelRequests'])
   if mode=='core-failure':assert models['an']['modelId']=='characters/character-a';assert any('/characters/character-a.glb?' in x for x in state['modelRequests'])
   assert not state['errors'],state['errors'];report.append({'transportFallback':mode,'pageErrors':[]});print('PASS fallback',mode,flush=True);page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','fixture':'Synthetic world; all APIs mocked. Compiled local D1 persistence tested separately.','cases':report},ensure_ascii=False,indent=2)+'\n')
 finally:browser.close()
