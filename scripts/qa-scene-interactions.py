"""Real picking, wheel/pinch/orbit, focus and reset. Synthetic city, loopback only."""
import os,json,subprocess,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5340');assert urlparse(base).hostname in ('127.0.0.1','localhost')
out=Path(os.environ.get('QA_OUT','work/graphics-interactions'));out.mkdir(parents=True,exist_ok=True);report=[]
flags=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
def data(h,key):return json.loads(h.get_attribute('data-'+key))
def pick(page,host,id):
 point=next(p for p in data(host,'pick-targets') if p['id']==id);assert 0<point['x']<page.viewport_size['width'] and 0<point['y']<page.viewport_size['height'],point
 page.mouse.click(point['x'],point['y']);page.wait_for_function('(a)=>document.querySelector(a.host).dataset.lastPick===a.id',arg={'host':'.'+host.get_attribute('class').split()[0],'id':id},timeout=10000)
def assert_frame(host,ids):
 for item in data(host,'framing'):
  if item['id'] in ids:assert all(abs(v)<.95 for p in ['head','feet'] for v in item[p][:2]),item
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=flags)
 try:
  for viewport,w,h in [('desktop',1440,900),('mobile',390,844)]:
   page=b.new_page(viewport={'width':w,'height':h},is_mobile=w<700,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'THREE.WebGL' in m.text else None)
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--motion'],text=True))
   page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1,"duplicate":true}'))
   def world(r):fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',world);page.goto(base,wait_until='domcontentloaded');host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   page.get_by_role('button',name='Cư dân',exact=True).click();name=next(x['name'] for x in fixture['world']['people'] if x['id']=='binh');page.locator('.people-grid button').filter(has=page.get_by_text(name,exact=True)).click();page.wait_for_function('document.querySelector(".three-canvas").dataset.selected==="binh"')
   for _ in range(4):page.get_by_role('button',name='Phóng to',exact=True).click()
   for _ in range(4):page.get_by_role('button',name='Thu nhỏ',exact=True).click()
   page.get_by_role('button',name='Theo nhân vật',exact=True).click();page.wait_for_timeout(300);assert host.get_attribute('data-selected')=='binh'
   pick(page,host,'binh');assert host.get_attribute('data-selected')=='binh'
   before=host.get_attribute('data-last-pick');page.mouse.move(w*.55,h*.55);page.mouse.down();page.mouse.move(w*.55+55,h*.55,steps=5);page.mouse.move(w*.55,h*.55,steps=5);page.mouse.up();assert host.get_attribute('data-last-pick')==before
   cdp=page.context.new_cdp_session(page);x,y=w*.5,h*.55;cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x-20,'y':y,'id':1},{'x':x+20,'y':y,'id':2}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-65,'y':y,'id':1},{'x':x+65,'y':y,'id':2}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(250);assert host.get_attribute('data-selected')=='binh';assert host.get_attribute('data-last-pick')==before
   page.get_by_role('button',name='Theo nhân vật',exact=True).click();page.screenshot(path=str(out/f'city-{viewport}.png'));report.append({'viewport':viewport,'scene':'city','followKeepsSelection':True,'nativeBodyPicking':True,'dragAndPinchDoNotSelect':True,'errors':errors.copy()});assert not errors,errors;page.close()
   page=b.new_page(viewport={'width':w,'height':h},is_mobile=w<700,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'THREE.WebGL' in m.text else None);page.goto(base+'/studio',wait_until='domcontentloaded');host=page.locator('.studio-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   for scenario in ['wallet-return','sanitation-gratitude','kitten-care','bakery-courtesy']:
    page.get_by_label('Chọn kịch bản',exact=True).select_option(scenario);page.wait_for_function('(id)=>document.querySelector(".studio-canvas").dataset.scenario===id',arg=scenario)
    focus=page.locator('.studio-person').first;focus.click();page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.camera).mode==="actor"');id=data(host,'camera')['focused'];assert_frame(host,[id]);pick(page,host,id)
    before=host.get_attribute('data-last-pick');page.mouse.move(w*.6,h*.5);page.mouse.down();page.mouse.move(w*.6+50,h*.5,steps=5);page.mouse.move(w*.6,h*.5,steps=5);page.mouse.up();assert host.get_attribute('data-last-pick')==before
    page.mouse.move(w*.5,h*.5);page.mouse.wheel(0,-850);page.wait_for_timeout(350);assert data(host,'camera')['focused']==id
    page.get_by_role('button',name='Phân cảnh 5',exact=True).click();page.wait_for_function('document.querySelector(".studio-canvas").dataset.beat==="4"&&JSON.parse(document.querySelector(".studio-canvas").dataset.camera).mode==="script"');assert_frame(host,data(host,'camera-subjects'))
    page.mouse.move(w*.5,h*.5);page.mouse.wheel(0,-650);page.wait_for_timeout(200);page.get_by_role('button',name='Xem lại từ đầu',exact=True).click();page.wait_for_function('document.querySelector(".studio-canvas").dataset.time==="0.000"&&JSON.parse(document.querySelector(".studio-canvas").dataset.camera).mode==="script"');assert_frame(host,data(host,'camera-subjects'))
    page.mouse.wheel(0,300);page.wait_for_timeout(150);page.get_by_role('button',name='Góc quay theo kịch bản',exact=True).click();page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.camera).mode==="script"');assert_frame(host,data(host,'camera-subjects'))
    if scenario=='kitten-care':
     page.get_by_role('button',name='Theo dõi Bé Miu',exact=True).click();page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.camera).focused==="miu"');assert_frame(host,['miu']);pick(page,host,'miu')
     slider=page.get_by_label('Thời gian kịch bản',exact=True)
     slider.evaluate("(e)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'95');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}")
     page.wait_for_function('document.querySelector(".studio-canvas").dataset.time==="95.000"');assert set(data(host,'camera-subjects'))=={'miu','thanh'};assert_frame(host,data(host,'camera-subjects'));page.get_by_role('button',name='Theo dõi Bé Miu',exact=True).click();page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.camera).focused==="miu"');assert_frame(host,data(host,'camera-subjects'));assert set(data(host,'camera-subjects'))=={'miu','thanh'}
     size=next(p['size'] for p in data(host,'rendered-props') if p['id']=='warm-cloth');assert abs(size[1]-1.05)<.001 and abs(size[0]-1.65)<.001,size
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'{scenario}-{viewport}.png'));report.append({'viewport':viewport,'scene':scenario,'clickFocusAndWheel':True,'nativeBodyPicking':True,'shotAfterManualZoom':True,'restartAndResetCamera':True,'framing':data(host,'framing'),'errors':errors.copy()});print('PASS',viewport,scenario,flush=True)
   assert not errors,errors;page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','fixture':'City APIs synthetic; actual compiled renderer and native input','cases':report},indent=2,ensure_ascii=False))
 except Exception:
  try:page.screenshot(path=str(out/'failure.png'));(out/'failure.json').write_text(json.dumps({'errors':errors,'stats':host.evaluate('(e)=>({...e.dataset})')},indent=2,ensure_ascii=False))
  except Exception:pass
  raise
 finally:b.close()
